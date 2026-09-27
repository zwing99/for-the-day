// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ChapterLoadError } from "../../../src/client/chapter-source.js";
import { Reader } from "../../../src/client/reader.js";
import { ReadingStorage } from "../../../src/client/reading-storage.js";
import type { Passage } from "../../../src/domain/reading-plan.js";
import { semanticFixture } from "../../fixtures/semantic-chapter.js";

beforeEach(() => {
	window.history.replaceState(null, "", "/7/psalm/7/2?translation=CSB");
	window.localStorage.clear();
	HTMLDialogElement.prototype.showModal = function () {
		this.setAttribute("open", "");
	};
	HTMLDialogElement.prototype.close = function () {
		this.removeAttribute("open");
	};
	HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});
const source = () => ({
	get: vi.fn(async (p: Passage) => {
		const c = semanticFixture();
		c.identity.book = p.book;
		c.identity.chapter = p.chapter;
		return c;
	}),
});
const openMenu = () =>
	fireEvent.click(screen.getByRole("button", { name: "Open reader menu" }));

it("keeps the menu usable during rate-limit recovery and respects the retry cooldown", async () => {
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
	const api = {
		get: vi
			.fn()
			.mockRejectedValueOnce(
				new ChapterLoadError("rate-limit", "Please wait.", 1),
			)
			.mockResolvedValueOnce(semanticFixture()),
	};
	await act(async () => {
		render(<Reader source={api} report={vi.fn()} />);
	});
	expect(screen.getByRole("alert").textContent).toContain("Please wait.");
	expect(
		screen
			.getByRole("button", { name: "Please wait before retrying" })
			.hasAttribute("disabled"),
	).toBe(true);
	openMenu();
	expect(screen.getByRole("dialog")).toBeTruthy();
	fireEvent.click(screen.getByRole("button", { name: "Close reader menu" }));
	await act(async () => {
		vi.advanceTimersByTime(1000);
	});
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: "Try again" }));
	});
	expect(api.get).toHaveBeenCalledTimes(2);
	expect(screen.getByRole("article", { name: "Verse 2" })).toBeTruthy();
});

it("keeps navigation rows behind the menu and supplies named ordered passage indicators", async () => {
	render(<Reader source={source()} report={vi.fn()} />);
	await screen.findByRole("article", { name: "Verse 2" });
	expect(screen.queryByRole("button", { name: "Next page" })).toBeNull();
	expect(screen.queryByRole("button", { name: "Next passage" })).toBeNull();
	expect(screen.queryByRole("combobox")).toBeNull();
	const indicators = within(
		screen.getByRole("navigation", { name: "Passages" }),
	).getAllByRole("button");
	expect(indicators.map((b) => b.getAttribute("aria-label"))).toEqual([
		"Psalm 7",
		"Psalm 37",
		"Psalm 67",
		"Psalm 97",
		"Psalm 127",
		"Proverbs 7",
	]);
	expect(indicators[0]?.getAttribute("aria-current")).toBe("page");
	openMenu();
	expect(screen.getByRole("dialog", { name: "Reader menu" })).toBeTruthy();
	expect(
		screen
			.getByRole("button", { name: "Previous passage" })
			.hasAttribute("disabled"),
	).toBe(true);
	expect(
		screen
			.getByRole("combobox", { name: "Translation" })
			.hasAttribute("disabled"),
	).toBe(true);
	fireEvent(
		screen.getByRole("dialog"),
		new Event("cancel", { bubbles: false, cancelable: true }),
	);
	expect(screen.queryByRole("dialog")).toBeNull();
	expect(document.activeElement).toBe(
		screen.getByRole("button", { name: "Open reader menu" }),
	);
});

it("persists presentation preferences while retaining the logical verse and excludes sheet shortcuts", async () => {
	const storage = new ReadingStorage();
	const api = source();
	const view = render(
		<Reader source={api} storage={storage} report={vi.fn()} />,
	);
	await screen.findByRole("article", { name: "Verse 2" });
	openMenu();
	fireEvent.change(screen.getByRole("combobox", { name: "Density" }), {
		target: { value: "Compact" },
	});
	fireEvent.change(screen.getByRole("combobox", { name: "Font size" }), {
		target: { value: "larger" },
	});
	fireEvent.change(screen.getByRole("combobox", { name: "Appearance" }), {
		target: { value: "dark" },
	});
	fireEvent.click(screen.getByRole("checkbox", { name: "Verse numbers" }));
	fireEvent.keyDown(screen.getByRole("combobox", { name: "Density" }), {
		key: "ArrowRight",
	});
	expect(api.get).toHaveBeenCalledTimes(1);
	expect(storage.preferences()).toMatchObject({
		density: "Compact",
		fontSize: "larger",
		appearance: "dark",
		verseLabels: false,
	});
	expect(
		view.container
			.querySelector("[data-active-verse]")
			?.getAttribute("data-active-verse"),
	).toBe("b");
	expect(
		view.container
			.querySelector(".reader-shell")
			?.getAttribute("data-verse-labels"),
	).toBe("false");
	fireEvent.click(screen.getByRole("button", { name: "Close reader menu" }));
	expect(document.activeElement).toBe(
		screen.getByRole("button", { name: "Open reader menu" }),
	);
});

it("includes intro and Scripture in one surface and reports only after Scripture becomes active", async () => {
	window.history.replaceState(null, "", "/7/psalm/7");
	const report = vi.fn();
	const view = render(
		<Reader source={source()} storage={new ReadingStorage()} report={report} />,
	);
	await screen.findByRole("button", { name: /Begin reading/ });
	const main = screen.getByRole("main");
	expect(main.querySelector(".intro")).toBeTruthy();
	expect(main.querySelectorAll(".verse-card").length).toBeGreaterThan(0);
	expect(report.mock.calls.every((call) => call[2] === false)).toBe(true);
	const historyLength = window.history.length;
	fireEvent.click(screen.getByRole("button", { name: /Begin reading/ }));
	await waitFor(() =>
		expect(report.mock.calls.some((call) => call[2] === true)).toBe(true),
	);
	expect(window.history.length).toBe(historyLength);
	expect(
		view.container
			.querySelector("[data-active-verse]")
			?.getAttribute("data-active-verse"),
	).toBe("a");
});

it("restarts only the requested scope, handles day 31, and resolves Today at action time", async () => {
	const storage = new ReadingStorage();
	const route = {
		day: 7,
		book: "PSA" as const,
		chapter: 37,
		translation: "CSB" as const,
		location: "2",
	};
	storage.savePosition(route);
	render(<Reader source={source()} storage={storage} report={vi.fn()} />);
	await screen.findByRole("article", { name: "Verse 2" });
	openMenu();
	fireEvent.click(screen.getByRole("button", { name: "Restart passage" }));
	await screen.findByRole("button", { name: /Begin reading/ });
	expect(storage.position(route)?.location).toBe("2");
	openMenu();
	fireEvent.click(screen.getByRole("button", { name: "Restart day" }));
	expect(storage.position(route)).toBeUndefined();
	openMenu();
	fireEvent.change(screen.getByRole("combobox", { name: "Day" }), {
		target: { value: "31" },
	});
	await screen.findByRole("heading", { name: "Psalm 119", level: 1 });
	expect(
		within(screen.getByRole("navigation", { name: "Passages" })).getAllByRole(
			"button",
		),
	).toHaveLength(2);
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date(2026, 8, 30, 23, 59));
	openMenu();
	vi.setSystemTime(new Date(2026, 9, 1, 0, 1));
	fireEvent.click(screen.getByRole("button", { name: "Today" }));
	await act(async () => {});
	expect(window.location.pathname).toMatch(/^\/1\/psalm\/1/);
});
