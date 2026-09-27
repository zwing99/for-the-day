// @vitest-environment jsdom

import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChapterLoadError } from "../../../src/client/chapter-source.js";
import { createDisplayReporter } from "../../../src/client/fums.js";
import { Reader } from "../../../src/client/reader.js";
import {
	ChapterCards,
	simpleVerseCards,
} from "../../../src/client/semantic-renderer.js";
import { orderedText } from "../../../src/domain/semantic-chapter.js";
import { semanticFixture } from "../../fixtures/semantic-chapter.js";

afterEach(cleanup);
beforeEach(() => {
	window.localStorage.clear();
	window.history.replaceState(null, "", "/23/psalm/23");
});
describe("faithful chapter cards", () => {
	it("renders all ordered text exactly once, retaining poetry, headings, marks and complete spans", () => {
		const chapter = semanticFixture();
		const { container } = render(<ChapterCards chapter={chapter} />);
		const rendered = [
			...container.querySelectorAll("[data-semantic-text]"),
		].map((node) => node.textContent);
		expect(rendered).toEqual(orderedText(chapter.nodes));
		expect(container.querySelectorAll("article")).toHaveLength(3);
		expect(
			container
				.querySelector('[data-source-node="line2"]')
				?.getAttribute("style"),
		).toContain("2em");
		expect(
			container.querySelector('[data-source-node="a2"]')?.className,
		).toContain("mark-small-caps");
		expect(container.querySelectorAll("h2")).toHaveLength(2);
		expect(
			simpleVerseCards(chapter)
				.flatMap((card) => card.nodeIds)
				.filter((id) => id === "merged"),
		).toHaveLength(1);
		expect(container.querySelectorAll("br")).toHaveLength(1);
	});
	it("keeps every empty stanza separator on only one card", () => {
		const chapter = semanticFixture();
		chapter.nodes.splice(2, 0, {
			id: "empty-stanza",
			kind: "group",
			role: "stanza",
			children: [],
			source: { path: "empty-stanza" },
		});
		const { container } = render(<ChapterCards chapter={chapter} />);
		expect(container.querySelectorAll(".stanza-break")).toHaveLength(1);
	});
});
describe("CSB display activation", () => {
	it("does not report loading/intros, reports a cached token once under StrictMode and on re-render", async () => {
		const chapter = semanticFixture();
		const track = vi.fn();
		const report = createDisplayReporter(track);
		const source = { get: vi.fn().mockResolvedValue(chapter) };
		const view = render(
			<StrictMode>
				<Reader source={source} report={report} />
			</StrictMode>,
		);
		await screen.findByRole("button", { name: "Begin reading" });
		expect(track).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Begin reading" }));
		await waitFor(() => expect(track).toHaveBeenCalledTimes(1));
		expect(track).toHaveBeenCalledWith("invented-token");
		view.rerender(
			<StrictMode>
				<Reader source={source} report={report} />
			</StrictMode>,
		);
		expect(track).toHaveBeenCalledTimes(1);
		expect(screen.getByText("Invented fixture notice")).toBeTruthy();
	});
	it("treats return after another passage as a new display and suppresses prefetch", () => {
		const chapter = semanticFixture();
		const track = vi.fn();
		const report = createDisplayReporter(track);
		report(chapter, "prefetch", false);
		report(chapter, "intro", false);
		expect(track).not.toHaveBeenCalled();
		report(chapter, "first", true);
		report(chapter, "first", true);
		report(chapter, "returned", true);
		expect(track).toHaveBeenCalledTimes(2);
	});
	it("contains tracker failures and permits a later retry", () => {
		const track = vi.fn().mockImplementationOnce(() => {
			throw new Error("tracking unavailable");
		});
		const report = createDisplayReporter(track);
		expect(() => report(semanticFixture(), "one", true)).not.toThrow();
		report(semanticFixture(), "one", true);
		expect(track).toHaveBeenCalledTimes(2);
	});
	it("shows loading, safe failure, and retry recovery without invented Scripture", async () => {
		const source = {
			get: vi
				.fn()
				.mockRejectedValueOnce(
					new ChapterLoadError("network", "Connect and retry."),
				)
				.mockResolvedValueOnce(semanticFixture()),
		};
		render(<Reader source={source} report={vi.fn()} />);
		expect(screen.getByRole("status").textContent).toBe("Loading Scripture…");
		await screen.findByRole("alert");
		fireEvent.click(screen.getByRole("button", { name: "Try again" }));
		await screen.findByRole("button", { name: "Begin reading" });
		expect(source.get).toHaveBeenCalledTimes(2);
	});
});
