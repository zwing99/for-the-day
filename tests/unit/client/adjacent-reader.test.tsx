// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Reader } from "../../../src/client/reader.js";
import { ReadingStorage } from "../../../src/client/reading-storage.js";
import type { Passage } from "../../../src/domain/reading-plan.js";
import { semanticFixture } from "../../fixtures/semantic-chapter.js";

beforeEach(() => {
	window.history.replaceState(null, "", "/7/psalm/7");
	HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

it("warms the next neighbor after the active passage and isolates a failed warm-up", async () => {
	let failNext = true;
	const get = vi.fn(async (passage: Passage) => {
		if (passage.chapter === 37 && failNext) {
			failNext = false;
			throw new Error("background failure");
		}
		const chapter = semanticFixture();
		chapter.identity.book = passage.book;
		chapter.identity.chapter = passage.chapter;
		return chapter;
	});
	const report = vi.fn();
	render(
		<Reader
			source={{ get, cacheAware: true }}
			storage={new ReadingStorage()}
			report={report}
		/>,
	);
	await screen.findByRole("button", { name: "Begin reading" });
	await waitFor(() =>
		expect(get.mock.calls.map(([p]) => p.chapter)).toEqual([7, 37]),
	);
	expect(screen.queryByRole("alert")).toBeNull();
	expect(
		report.mock.calls.every(([chapter]) => chapter.identity.chapter === 7),
	).toBe(true);
	fireEvent.click(screen.getByRole("button", { name: "Psalm 37" }));
	await screen.findByRole("button", { name: "Begin reading" });
	expect(get.mock.calls.filter(([p]) => p.chapter === 37)).toHaveLength(2);
	await act(
		async () => new Promise((resolve) => requestAnimationFrame(resolve)),
	);
});

it("reveals a saved verse in an inert ready preview without activating it", async () => {
	const storage = new ReadingStorage();
	storage.savePosition({
		day: 7,
		book: "PSA",
		chapter: 37,
		translation: "CSB",
		location: "2",
	});
	const get = vi.fn(async (passage: Passage) => {
		const chapter = semanticFixture();
		chapter.identity.book = passage.book;
		chapter.identity.chapter = passage.chapter;
		return chapter;
	});
	const push = vi.spyOn(window.history, "pushState");
	const save = vi.spyOn(storage, "savePosition");
	const report = vi.fn();
	const view = render(
		<Reader
			source={{ get, cacheAware: true }}
			storage={storage}
			report={report}
		/>,
	);
	await screen.findByRole("button", { name: "Begin reading" });
	await waitFor(() => expect(save).toHaveBeenCalled());
	save.mockClear();
	const callsBefore = report.mock.calls.length;
	const main = screen.getByRole("main");
	const touch = (clientX: number) => ({ clientX, clientY: 200 });
	fireEvent.touchStart(main, { touches: [touch(200)] });
	fireEvent.touchMove(main, { touches: [touch(100)] });
	await waitFor(() => {
		const preview = view.container.querySelector(".passage-preview")!;
		expect(
			preview
				.querySelector("[data-active-verse]")
				?.getAttribute("data-active-verse"),
		).toBe("b");
		expect(
			preview.querySelector<HTMLElement>(".passage-preview-content")?.style
				.visibility,
		).toBe("visible");
	});
	const preview = view.container.querySelector(".passage-preview")!;
	expect(preview.hasAttribute("inert")).toBe(true);
	expect(preview.getAttribute("aria-hidden")).toBe("true");
	expect(push).not.toHaveBeenCalled();
	expect(save).not.toHaveBeenCalled();
	expect(report).toHaveBeenCalledTimes(callsBefore);
	fireEvent.touchEnd(main, { touches: [], changedTouches: [touch(100)] });
	await waitFor(() => {
		expect(window.location.pathname).toBe("/7/psalm/37/2");
		expect(
			view.container
				.querySelector(".reading-scroll [data-active-verse]")
				?.getAttribute("data-active-verse"),
		).toBe("b");
	});
	expect(push).toHaveBeenCalledTimes(1);
	expect(save).toHaveBeenCalled();
});

it("keeps the horizontal offset when a delayed neighbor becomes ready", async () => {
	let finish!: (chapter: ReturnType<typeof semanticFixture>) => void;
	const delayed = new Promise<ReturnType<typeof semanticFixture>>((resolve) => {
		finish = resolve;
	});
	const get = vi.fn((passage: Passage) => {
		if (passage.chapter === 37) return delayed;
		const chapter = semanticFixture();
		chapter.identity.book = passage.book;
		chapter.identity.chapter = passage.chapter;
		return Promise.resolve(chapter);
	});
	const view = render(
		<Reader
			source={{ get, cacheAware: true }}
			storage={new ReadingStorage()}
			report={vi.fn()}
		/>,
	);
	await screen.findByRole("button", { name: "Begin reading" });
	const main = screen.getByRole("main");
	const touch = (clientX: number) => ({ clientX, clientY: 200 });
	fireEvent.touchStart(main, { touches: [touch(200)] });
	fireEvent.touchMove(main, { touches: [touch(120)] });
	const preview =
		view.container.querySelector<HTMLElement>(".passage-preview")!;
	const offset = preview.style.transform;
	expect(preview.textContent).toContain("Loading Scripture…");
	const chapter = semanticFixture();
	chapter.identity.chapter = 37;
	await act(async () => finish(chapter));
	await waitFor(() =>
		expect(
			preview.querySelector<HTMLElement>(".passage-preview-content")?.style
				.visibility,
		).toBe("visible"),
	);
	expect(preview.style.transform).toBe(offset);
});

it("commits a cold failed neighbor and retries directly at its saved page", async () => {
	const storage = new ReadingStorage();
	storage.savePosition({
		day: 7,
		book: "PSA",
		chapter: 37,
		translation: "CSB",
		location: "2",
	});
	let neighborAttempts = 0;
	const get = vi.fn(async (passage: Passage) => {
		if (passage.chapter === 37 && ++neighborAttempts <= 3)
			throw new Error("unavailable");
		const chapter = semanticFixture();
		chapter.identity.book = passage.book;
		chapter.identity.chapter = passage.chapter;
		return chapter;
	});
	const view = render(
		<Reader
			source={{ get, cacheAware: true }}
			storage={storage}
			report={vi.fn()}
		/>,
	);
	await screen.findByRole("button", { name: "Begin reading" });
	await waitFor(() => expect(neighborAttempts).toBeGreaterThanOrEqual(1));
	const main = screen.getByRole("main");
	const touch = (clientX: number) => ({ clientX, clientY: 200 });
	fireEvent.touchStart(main, { touches: [touch(200)] });
	fireEvent.touchMove(main, { touches: [touch(100)] });
	expect(
		view.container.querySelector(".passage-preview")?.textContent,
	).toContain("Loading Scripture…");
	fireEvent.touchEnd(main, { touches: [], changedTouches: [touch(100)] });
	await screen.findByRole("button", { name: "Try again" });
	fireEvent.click(screen.getByRole("button", { name: "Try again" }));
	await waitFor(() =>
		expect(
			view.container
				.querySelector(".reading-scroll [data-active-verse]")
				?.getAttribute("data-active-verse"),
		).toBe("b"),
	);
	await waitFor(() => expect(window.location.pathname).toBe("/7/psalm/37/2"));
});
