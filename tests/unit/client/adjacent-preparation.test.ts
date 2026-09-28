import { expect, it, vi } from "vitest";
import { AdjacentPreparation } from "../../../src/client/adjacent-preparation.js";
import { ChapterLoadError } from "../../../src/client/chapter-source.js";
import type { ReaderRoute } from "../../../src/domain/reader-route.js";
import type { SemanticChapter } from "../../../src/domain/semantic-chapter.js";
import { cacheFixture } from "../../fixtures/cache-chapter.js";

const route = (chapter: number, day = 1): ReaderRoute => ({
	day,
	book: "PSA",
	chapter,
	translation: "ESV",
});
const fixture = (chapter: number): SemanticChapter => ({
	...cacheFixture("ESV"),
	identity: { ...cacheFixture("ESV").identity, book: "PSA", chapter },
});
function deferred() {
	let resolve!: (chapter: SemanticChapter) => void;
	const promise = new Promise<SemanticChapter>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

it("prepares only both available neighbors, one after the other", async () => {
	const first = deferred();
	const calls: number[] = [];
	const source = {
		get: vi.fn((passage: { chapter: number }) => {
			calls.push(passage.chapter);
			return passage.chapter === 61
				? first.promise
				: Promise.resolve(fixture(passage.chapter));
		}),
	};
	const scheduler = new AdjacentPreparation(source);
	scheduler.setActive(route(31));
	scheduler.startAfterUsable(route(31));
	expect(calls).toEqual([61]);
	first.resolve(fixture(61));
	await vi.waitFor(() => expect(calls).toEqual([61, 1]));
	expect(calls).not.toContain(91);
	scheduler.dispose();
});

it("cancels obsolete scope and rejects an adapter's late result", async () => {
	const late = deferred();
	const source = { get: vi.fn(() => late.promise) };
	const scheduler = new AdjacentPreparation(source);
	scheduler.setActive(route(1));
	const controller = new AbortController();
	const pending = scheduler.load(route(1), controller.signal);
	scheduler.setActive(route(2, 2));
	late.resolve(fixture(1));
	await expect(pending).rejects.toMatchObject({ name: "AbortError" });
	scheduler.dispose();
});

it("checks returned identity before admitting prepared content", async () => {
	const get = vi.fn(async () => fixture(2));
	const scheduler = new AdjacentPreparation({ get });
	scheduler.setActive(route(1));
	scheduler.startAfterUsable(route(1));
	await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(1));
	scheduler.startAfterUsable(route(1));
	await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(2));
	scheduler.dispose();
});

it("stops warming on access failure without disturbing foreground reading", async () => {
	const source = {
		get: vi.fn(async (passage: { chapter: number }) => {
			if (passage.chapter === 31)
				throw new ChapterLoadError("access-denied", "Denied");
			return fixture(passage.chapter);
		}),
	};
	const scheduler = new AdjacentPreparation(source);
	scheduler.setActive(route(1));
	scheduler.startAfterUsable(route(1));
	await vi.waitFor(() => expect(source.get).toHaveBeenCalledTimes(1));
	scheduler.startAfterUsable(route(1));
	expect(source.get).toHaveBeenCalledTimes(1);
	scheduler.dispose();
});

it("promotes foreground reading over an unrelated in-flight neighbor", async () => {
	const pending = deferred();
	let backgroundSignal: AbortSignal | undefined;
	const source = {
		get: vi.fn((passage: { chapter: number }, signal: AbortSignal) => {
			if (passage.chapter === 31) {
				backgroundSignal = signal;
				return pending.promise;
			}
			return Promise.resolve(fixture(passage.chapter));
		}),
	};
	const scheduler = new AdjacentPreparation(source);
	scheduler.setActive(route(1));
	scheduler.startAfterUsable(route(1));
	expect(source.get.mock.calls.map(([p]) => p.chapter)).toEqual([31]);
	const chapter = await scheduler.load(route(61), new AbortController().signal);
	expect(chapter.identity.chapter).toBe(61);
	expect(backgroundSignal?.aborted).toBe(true);
	pending.resolve(fixture(31));
	scheduler.setActive(route(61));
	scheduler.startAfterUsable(route(61));
	await vi.waitFor(() =>
		expect(source.get.mock.calls.map(([p]) => p.chapter)).toEqual([
			31, 61, 91, 31,
		]),
	);
	scheduler.dispose();
});

it("keeps a matching background subscriber alive for foreground joining", async () => {
	const pending = deferred();
	let backgroundSignal: AbortSignal | undefined;
	const source = {
		get: vi.fn((passage: { chapter: number }, signal: AbortSignal) => {
			if (passage.chapter === 31) {
				backgroundSignal ??= signal;
				return pending.promise;
			}
			return Promise.resolve(fixture(passage.chapter));
		}),
	};
	const scheduler = new AdjacentPreparation(source);
	scheduler.setActive(route(1));
	scheduler.startAfterUsable(route(1));
	scheduler.setActive(route(31));
	const foreground = scheduler.load(route(31), new AbortController().signal);
	expect(backgroundSignal?.aborted).toBe(false);
	pending.resolve(fixture(31));
	expect((await foreground).identity.chapter).toBe(31);
	scheduler.dispose();
});

it("pauses after rate limits and resumes after the supplied delay", async () => {
	vi.useFakeTimers();
	try {
		let attempts = 0;
		const source = {
			get: vi.fn(async (passage: { chapter: number }) => {
				if (passage.chapter === 31 && attempts++ === 0)
					throw new ChapterLoadError("rate-limit", "Wait", 2);
				return fixture(passage.chapter);
			}),
		};
		const scheduler = new AdjacentPreparation(source, () => Date.now());
		scheduler.setActive(route(1));
		scheduler.startAfterUsable(route(1));
		await Promise.resolve();
		expect(source.get).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1999);
		expect(source.get).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(source.get.mock.calls.map(([p]) => p.chapter)).toEqual([31, 31]);
		scheduler.dispose();
	} finally {
		vi.useRealTimers();
	}
});
