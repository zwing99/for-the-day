import { afterEach, expect, it, vi } from "vitest";
import { cachedChapterSource } from "../../../src/client/cached-chapter-source.js";
import {
	BrowserChapterRepository,
	memoryChapterStorage,
} from "../../../src/client/chapter-cache.js";
import { chapterRevisions } from "../../../src/client/chapter-source.js";
import type { SemanticChapter } from "../../../src/domain/semantic-chapter.js";
import { cacheFixture } from "../../fixtures/cache-chapter.js";

const passage = { book: "PSA" as const, chapter: 23 };
const context = {
	translation: "ESV" as const,
	readingDay: 7,
	timeZone: "America/Chicago",
};
const repositories: BrowserChapterRepository[] = [];
function repository(
	storage = memoryChapterStorage(),
	clock: () => number = Date.now,
) {
	const r = new BrowserChapterRepository(storage, clock);
	repositories.push(r);
	return r;
}
afterEach(() => {
	repositories.splice(0).forEach((r) => r.dispose());
});
function deferred() {
	let resolve!: (c: SemanticChapter) => void;
	const promise = new Promise<SemanticChapter>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}
it("shares compatible concurrent requests and independently cancels consumers", async () => {
	const d = deferred();
	const get = vi.fn(() => d.promise);
	const source = cachedChapterSource({ get }, repository(), async () => "r");
	const a = new AbortController();
	const b = new AbortController();
	const first = source.get(passage, a.signal, context);
	const rejected = expect(first).rejects.toMatchObject({ name: "AbortError" });
	const second = source.get(passage, b.signal, context);
	await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(1));
	a.abort();
	expect(get.mock.calls[0]).toBeDefined();
	d.resolve(cacheFixture("ESV"));
	await rejected;
	expect(await second).toEqual(cacheFixture("ESV"));
	expect(
		await source.get(passage, new AbortController().signal, {
			...context,
			readingDay: 31,
		}),
	).toEqual(cacheFixture("ESV"));
	expect(get).toHaveBeenCalledTimes(1);
});
it("aborts abandoned transport and does not admit a late ignored-abort result", async () => {
	const d = deferred();
	let transport!: AbortSignal;
	const r = repository();
	const get = vi.fn((_p, signal: AbortSignal) => {
		transport = signal;
		return d.promise;
	});
	const source = cachedChapterSource({ get }, r, async () => "r");
	const controller = new AbortController();
	const load = source.get(passage, controller.signal, context);
	const rejected = expect(load).rejects.toMatchObject({ name: "AbortError" });
	await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(1));
	controller.abort();
	expect(transport.aborted).toBe(true);
	d.resolve(cacheFixture("ESV"));
	await rejected;
	await Promise.resolve();
	expect(await r.get(passage, "ESV", "r")).toBeUndefined();
});
it("retries failures and reuses persisted ESV across days only until one hour", async () => {
	let now = 1000;
	const storage = memoryChapterStorage();
	const get = vi
		.fn()
		.mockRejectedValueOnce(new Error("unavailable"))
		.mockResolvedValue(cacheFixture("ESV"));
	const source = cachedChapterSource(
		{ get },
		repository(storage, () => now),
		async () => "r",
		() => now,
	);
	await expect(
		source.get(passage, new AbortController().signal, context),
	).rejects.toThrow("unavailable");
	await source.get(passage, new AbortController().signal, context);
	const reopened = cachedChapterSource(
		{ get },
		repository(storage, () => now),
		async () => undefined,
		() => now,
	);
	now += 3599999;
	await reopened.get(passage, new AbortController().signal, {
		...context,
		readingDay: 30,
	});
	expect(get).toHaveBeenCalledTimes(2);
	now++;
	await reopened.get(passage, new AbortController().signal, context);
	expect(get).toHaveBeenCalledTimes(3);
});
it("rejects old in-flight results after observing a new envelope revision", async () => {
	const old = deferred();
	const next = cacheFixture("CSB", 24);
	chapterRevisions.set(next, "new");
	const get = vi.fn((p) =>
		p.chapter === 23 ? old.promise : Promise.resolve(next),
	);
	const r = repository();
	const source = cachedChapterSource({ get }, r, async () => "old");
	const load = source.get(passage, new AbortController().signal);
	const rejected = expect(load).rejects.toMatchObject({ name: "AbortError" });
	await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(1));
	await source.get({ ...passage, chapter: 24 }, new AbortController().signal);
	old.resolve(cacheFixture());
	await rejected;
	expect(await r.revision()).toBe("new");
	expect(await r.get(passage, "CSB", "new")).toBeUndefined();
});
it("fetches startup metadata once and never refreshes a fresh visit", async () => {
	const metadata = vi.fn(async () => "r");
	const get = vi.fn(async () => cacheFixture());
	const source = cachedChapterSource({ get }, repository(), metadata);
	for (let n = 0; n < 3; n++)
		await source.get(passage, new AbortController().signal);
	expect(metadata).toHaveBeenCalledTimes(1);
	expect(get).toHaveBeenCalledTimes(1);
});

it("does not admit a result when its last consumer cancels during storage admission", async () => {
	const backing = memoryChapterStorage();
	let hold = false;
	let entering!: () => void;
	const entered = new Promise<void>((r) => {
		entering = r;
	});
	let release!: () => void;
	const gate = new Promise<void>((r) => {
		release = r;
	});
	const storage = {
		async update<T>(
			change: Parameters<typeof backing.update<T>>[0],
			signal?: AbortSignal,
		) {
			if (hold) {
				entering();
				await gate;
				if (signal?.aborted) throw new DOMException("Cancelled.", "AbortError");
			}
			return backing.update(change);
		},
	};
	const r = repository(storage);
	const get = vi.fn(async () => {
		hold = true;
		return cacheFixture();
	});
	const source = cachedChapterSource({ get }, r, async () => "r");
	const controller = new AbortController();
	const load = source.get(passage, controller.signal);
	const rejected = expect(load).rejects.toMatchObject({ name: "AbortError" });
	await entered;
	controller.abort();
	release();
	await rejected;
	expect(await backing.update((s) => s.entries.length)).toBe(0);
});
