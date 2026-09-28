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

const chapterFor = (passage: Passage) => {
	const chapter = semanticFixture();
	chapter.identity.book = passage.book;
	chapter.identity.chapter = passage.chapter;
	return chapter;
};
beforeEach(() => {
	window.history.replaceState(null, "", "/7/psalm/7");
	window.localStorage.clear();
	HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});
it("keeps previews inert and transient, then flushes and pushes exactly once on commitment", async () => {
	const storage = new ReadingStorage();
	const source = { get: vi.fn(async (p: Passage) => chapterFor(p)) };
	const report = vi.fn();
	const view = render(
		<Reader source={source} storage={storage} report={report} />,
	);
	await screen.findByRole("button", { name: "Begin reading" });
	await act(async () => {
		await new Promise((resolve) =>
			requestAnimationFrame(() => requestAnimationFrame(resolve)),
		);
	});
	const save = vi.spyOn(storage, "savePosition");
	const push = vi.spyOn(window.history, "pushState");
	report.mockClear();
	const main = screen.getByRole("main");
	const touch = (clientX: number) => ({ clientX, clientY: 200 });
	fireEvent.touchStart(main, { touches: [touch(200)] });
	fireEvent.touchMove(main, { touches: [touch(100)] });
	const preview = view.container.querySelector(".passage-preview")!;
	expect(preview.hasAttribute("inert")).toBe(true);
	expect(preview.getAttribute("aria-hidden")).toBe("true");
	expect(preview.textContent).toContain("Psalm 37");
	expect(source.get).toHaveBeenCalledTimes(1);
	expect(save).not.toHaveBeenCalled();
	expect(report).not.toHaveBeenCalled();
	expect(push).not.toHaveBeenCalled();
	fireEvent.touchEnd(main, { touches: [], changedTouches: [touch(100)] });
	fireEvent.touchEnd(main, { touches: [], changedTouches: [touch(100)] });
	await screen.findByRole("heading", { name: "Psalm 37" });
	expect(push).toHaveBeenCalledTimes(1);
	expect(source.get).toHaveBeenCalledTimes(2);
	expect(save.mock.calls[0]?.[0]).toMatchObject({
		book: "PSA",
		chapter: 7,
		location: "intro",
	});
	expect(view.container.querySelector(".passage-preview")).toBeNull();
});
it("restores explicit URL before saved position, then saved before intro, and handles mounted popstate", async () => {
	const storage = new ReadingStorage();
	storage.savePosition({
		day: 7,
		book: "PSA",
		chapter: 7,
		translation: "CSB",
		location: "2",
	});
	window.history.replaceState(null, "", "/7/psalm/7/1a?translation=CSB");
	const source = { get: vi.fn(async (p: Passage) => chapterFor(p)) };
	const view = render(
		<Reader source={source} storage={storage} report={vi.fn()} />,
	);
	await waitFor(() =>
		expect(
			view.container
				.querySelector("[data-active-verse]")
				?.getAttribute("data-active-verse"),
		).toBe("a"),
	);
	act(() => {
		window.history.replaceState(null, "", "/7/psalm/7/2?translation=CSB");
		window.dispatchEvent(new PopStateEvent("popstate"));
	});
	await waitFor(() =>
		expect(
			view.container
				.querySelector("[data-active-verse]")
				?.getAttribute("data-active-verse"),
		).toBe("b"),
	);
	expect(source.get).toHaveBeenCalledTimes(1);
	act(() => {
		window.history.replaceState(null, "", "/7/psalm/37");
		window.dispatchEvent(new PopStateEvent("popstate"));
	});
	await screen.findByRole("button", { name: "Begin reading" });
});

it("starts a new local date fresh and resumes only its own progress", async () => {
	const storage = new ReadingStorage();
	storage.saveDatePosition("2026-09-07", {
		...chapterRoute(7, 37),
		location: "2",
	});
	vi.useFakeTimers({ shouldAdvanceTime: true });
	vi.setSystemTime(new Date(2026, 9, 7, 12));
	window.history.replaceState(null, "", "/");
	const source = { get: vi.fn(async (p: Passage) => chapterFor(p)) };
	try {
		const view = render(
			<Reader source={source} storage={storage} report={vi.fn()} />,
		);
		await screen.findByRole("heading", { name: "Psalm 7" });
		expect(screen.getByRole("button", { name: "Begin reading" })).toBeTruthy();
		expect(storage.lastFollowingDate()).toBe("2026-10-07");
		view.unmount();
		storage.saveDatePosition("2026-10-07", {
			...chapterRoute(7, 37),
			location: "2",
		});
		window.history.replaceState(null, "", "/");
		render(<Reader source={source} storage={storage} report={vi.fn()} />);
		await screen.findByRole("heading", { name: "Psalm 37" });
	} finally {
		vi.useRealTimers();
	}
});

it("keeps visible reading at midnight, then follows the new day on foreground return", async () => {
	vi.useFakeTimers({ shouldAdvanceTime: true });
	vi.setSystemTime(new Date(2026, 8, 7, 23, 59));
	window.history.replaceState(null, "", "/");
	const visibility = vi.spyOn(document, "visibilityState", "get");
	visibility.mockReturnValue("visible");
	try {
		render(
			<Reader
				source={{ get: async (p: Passage) => chapterFor(p) }}
				storage={new ReadingStorage()}
				report={vi.fn()}
			/>,
		);
		await screen.findByRole("heading", { name: "Psalm 7" });
		vi.setSystemTime(new Date(2026, 8, 8, 0, 1));
		expect(screen.getByRole("heading", { name: "Psalm 7" })).toBeTruthy();
		visibility.mockReturnValue("hidden");
		act(() => document.dispatchEvent(new Event("visibilitychange")));
		visibility.mockReturnValue("visible");
		act(() => document.dispatchEvent(new Event("visibilitychange")));
		await screen.findByRole("heading", { name: "Psalm 8" });
		expect(window.location.pathname).toBe("/8/psalm/8");
	} finally {
		visibility.mockRestore();
		vi.useRealTimers();
	}
});

function chapterRoute(day: number, chapter: number) {
	return { day, book: "PSA" as const, chapter, translation: "CSB" as const };
}
it("cancels obsolete requests and refuses late responses after passage changes", async () => {
	let resolveOld:
		| ((value: ReturnType<typeof semanticFixture>) => void)
		| undefined;
	const source = {
		get: vi.fn((p: Passage, _signal: AbortSignal) =>
			p.chapter === 7
				? new Promise<ReturnType<typeof semanticFixture>>((resolve) => {
						resolveOld = resolve;
					})
				: Promise.resolve(chapterFor(p)),
		),
	};
	render(
		<Reader source={source} storage={new ReadingStorage()} report={vi.fn()} />,
	);
	fireEvent.click(screen.getByRole("button", { name: "Psalm 37" }));
	await screen.findByRole("button", { name: "Begin reading" });
	await act(async () => resolveOld?.(chapterFor({ book: "PSA", chapter: 7 })));
	expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
		"Psalm 37",
	);
	expect(source.get.mock.calls[0]?.[0].chapter).toBe(7);
	expect(source.get.mock.calls[0]?.[1].aborted).toBe(true);
});
it("ignores passage shortcuts on controls and bounds passage ends", async () => {
	const source = { get: vi.fn(async (p: Passage) => chapterFor(p)) };
	render(
		<Reader source={source} storage={new ReadingStorage()} report={vi.fn()} />,
	);
	await screen.findByRole("button", { name: "Begin reading" });
	fireEvent.keyDown(screen.getByRole("button", { name: "Open reader menu" }), {
		key: "ArrowRight",
	});
	expect(source.get).toHaveBeenCalledTimes(1);
	fireEvent.keyDown(screen.getByRole("main"), { key: "ArrowLeft" });
	expect(source.get).toHaveBeenCalledTimes(1);
	fireEvent.keyDown(screen.getByRole("main"), { key: "ArrowRight" });
	await screen.findByRole("heading", { name: "Psalm 37" });
});

it.each(["ArrowLeft", "ArrowRight"])(
	"leaves %s to the browser while text is selected",
	async (key) => {
		window.history.replaceState(null, "", "/7/psalm/37/2?translation=CSB");
		const source = { get: vi.fn(async (p: Passage) => chapterFor(p)) };
		render(
			<Reader
				source={source}
				storage={new ReadingStorage()}
				report={vi.fn()}
			/>,
		);
		const card = await screen.findByRole("article", { name: "Verse 2" });
		card.focus();
		const selection = document.getSelection()!;
		const range = document.createRange();
		range.selectNodeContents(card.querySelector("[data-semantic-text]")!);
		selection.removeAllRanges();
		selection.addRange(range);
		try {
			expect(selection.toString().length).toBeGreaterThan(0);
			expect(fireEvent.keyDown(card, { key })).toBe(true);
			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 220));
			});
			expect(window.location.pathname).toBe("/7/psalm/37/2");
			expect(source.get).toHaveBeenCalledTimes(1);
			expect(document.activeElement).toBe(card);
		} finally {
			selection.removeAllRanges();
		}
	},
);
