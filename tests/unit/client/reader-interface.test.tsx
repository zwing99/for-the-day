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

it("reaches every passage through menu controls and direct selection with bounded ends", async () => {
	const api = source();
	render(
		<Reader source={api} storage={new ReadingStorage()} report={vi.fn()} />,
	);
	await screen.findByRole("article", { name: "Verse 2" });
	for (const chapter of [37, 67, 97, 127, 7]) {
		openMenu();
		fireEvent.click(screen.getByRole("button", { name: "Next passage" }));
		await waitFor(() =>
			expect(api.get.mock.calls.at(-1)?.[0]).toMatchObject({
				book: chapter === 7 ? "PRO" : "PSA",
				chapter,
			}),
		);
		await screen.findByRole("button", { name: "Begin reading" });
	}
	openMenu();
	expect(
		screen
			.getByRole("button", { name: "Next passage" })
			.hasAttribute("disabled"),
	).toBe(true);
	fireEvent.click(screen.getByRole("button", { name: "Previous passage" }));
	await waitFor(() => expect(api.get.mock.calls.at(-1)?.[0].chapter).toBe(127));
	await screen.findByRole("button", { name: "Begin reading" });
	openMenu();
	fireEvent.change(
		screen.getByRole("combobox", { name: "Passage", exact: true }),
		{ target: { value: "0" } },
	);
	await screen.findByRole("article", { name: "Verse 2" });
	expect(window.location.pathname).toMatch(/^\/7\/psalm\/7/);
	openMenu();
	expect(
		screen
			.getByRole("button", { name: "Previous passage" })
			.hasAttribute("disabled"),
	).toBe(true);
});

it.each([
	"ArrowLeft",
	"ArrowRight",
	"ArrowUp",
	"ArrowDown",
	"PageUp",
	"PageDown",
])("leaves %s available to settings and form controls", async (key) => {
	const api = source();
	render(
		<Reader source={api} storage={new ReadingStorage()} report={vi.fn()} />,
	);
	await screen.findByRole("article", { name: "Verse 2" });
	openMenu();
	const before = window.location.href;
	expect(
		fireEvent.keyDown(screen.getByRole("combobox", { name: "Density" }), {
			key,
		}),
	).toBe(true);
	expect(window.location.href).toBe(before);
	expect(api.get).toHaveBeenCalledTimes(1);
});

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
	).toBe(false);
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

it("copies the addressed verse with its translation and restores all presentation preferences after remount", async () => {
	const writeText = vi.fn().mockResolvedValue(undefined);
	Object.defineProperty(navigator, "clipboard", {
		configurable: true,
		value: { writeText },
	});
	const storage = new ReadingStorage(window.localStorage);
	const view = render(
		<Reader source={source()} storage={storage} report={vi.fn()} />,
	);
	await screen.findByRole("article", { name: "Verse 2" });
	openMenu();
	fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
	await screen.findByText("Link copied.");
	const copied = new URL(writeText.mock.calls[0]![0]);
	expect(copied.pathname).toBe("/7/psalm/7/2");
	expect(copied.searchParams.get("translation")).toBe("CSB");
	for (const [name, value] of [
		["Appearance", "dark"],
		["Density", "Compact"],
		["Font size", "larger"],
	])
		fireEvent.change(screen.getByRole("combobox", { name }), {
			target: { value },
		});
	fireEvent.click(
		screen.getByRole("checkbox", { name: "Passage introductions" }),
	);
	fireEvent.click(screen.getByRole("checkbox", { name: "Verse numbers" }));
	view.unmount();
	render(
		<Reader
			source={source()}
			storage={new ReadingStorage(window.localStorage)}
			report={vi.fn()}
		/>,
	);
	await waitFor(() =>
		expect(
			document
				.querySelector("[data-active-verse]")
				?.getAttribute("data-active-verse"),
		).toBe("b"),
	);
	openMenu();
	expect(
		(screen.getByRole("combobox", { name: "Appearance" }) as HTMLSelectElement)
			.value,
	).toBe("dark");
	expect(
		(screen.getByRole("combobox", { name: "Density" }) as HTMLSelectElement)
			.value,
	).toBe("Compact");
	expect(
		(screen.getByRole("combobox", { name: "Font size" }) as HTMLSelectElement)
			.value,
	).toBe("larger");
	expect(
		(
			screen.getByRole("checkbox", {
				name: "Passage introductions",
			}) as HTMLInputElement
		).checked,
	).toBe(false);
	expect(
		(
			screen.getByRole("checkbox", {
				name: "Verse numbers",
			}) as HTMLInputElement
		).checked,
	).toBe(false);
	Reflect.deleteProperty(navigator, "clipboard");
});

it("wraps menu focus at the collapsed attribution summary rather than its hidden links", async () => {
	render(<Reader source={source()} report={vi.fn()} />);
	await screen.findByRole("article", { name: "Verse 2" });
	openMenu();
	const dialog = screen.getByRole("dialog");
	// Chromium may retain client rects for links in a collapsed details element.
	for (const control of dialog.querySelectorAll<HTMLElement>(
		"button,select,input,a,summary",
	))
		Object.defineProperty(control, "getClientRects", {
			value: () => [{ width: 1, height: 1 }],
		});
	const summary = dialog.querySelector("summary")!;
	summary.focus();
	fireEvent.keyDown(summary, { key: "Tab" });
	expect(document.activeElement).toBe(
		screen.getByRole("button", { name: "Close reader menu" }),
	);
	fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true });
	expect(document.activeElement).toBe(summary);
	fireEvent.click(summary);
	const link = within(dialog).getByRole("link", { name: "Test" });
	link.focus();
	fireEvent.keyDown(link, { key: "Tab" });
	expect(document.activeElement).toBe(
		screen.getByRole("button", { name: "Close reader menu" }),
	);
});
