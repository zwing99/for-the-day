// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
	ReadingSurface,
	verseAtReadingLine,
} from "../../../src/client/reading-surface.js";
import { ChapterCards } from "../../../src/client/semantic-renderer.js";
import { type Density, packChapter } from "../../../src/domain/card-packing.js";
import { orderedText } from "../../../src/domain/semantic-chapter.js";
import { semanticFixture } from "../../fixtures/semantic-chapter.js";

afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());
it.each(["b", "d"])(
	"restores addressed verse %s to its containing page and immediately enables snapping",
	(targetKey) => {
		const scroll = vi.fn();
		HTMLElement.prototype.scrollTo = scroll;
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
			function (this: HTMLElement) {
				const top = this.matches("[data-location-key]")
					? 950
					: this.closest("article")
						? 800
						: 0;
				return {
					top,
					bottom: top + 800,
					left: 0,
					right: 390,
					width: 390,
					height: 800,
					x: 0,
					y: top,
					toJSON: () => ({}),
				};
			},
		);
		const view = render(
			<main>
				<ReadingSurface
					chapter={semanticFixture()}
					targetKey={targetKey}
					restoreId={1}
					density="Balanced"
				/>
			</main>,
		);
		expect(scroll).toHaveBeenCalledWith({ top: 800, behavior: "instant" });
		expect(view.container.querySelector("main")!.style.scrollSnapType).toBe("");
		expect(
			view.container
				.querySelector("[data-active-verse]")
				?.getAttribute("data-active-verse"),
		).toBe(targetKey);
	},
);
it("renders every density without changing ordered text or literary parents", () => {
	const chapter = semanticFixture();
	for (const density of ["Spacious", "Balanced", "Compact"] as Density[]) {
		const view = render(
			<ChapterCards
				chapter={chapter}
				cards={packChapter(chapter, density, { columns: 60, lines: 32 })}
			/>,
		);
		expect(
			[...view.container.querySelectorAll("[data-semantic-text]")].map(
				(n) => n.textContent,
			),
		).toEqual(orderedText(chapter.nodes));
		expect(
			view.container
				.querySelector('[data-source-node="line2"]')
				?.getAttribute("style"),
		).toContain("2em");
		view.unmount();
	}
});
it("starts restoration with the requested semantic anchor rather than the first verse", () => {
	const view = render(
		<main>
			<ReadingSurface
				chapter={semanticFixture()}
				targetKey="b"
				restoreId={1}
				density="Balanced"
			/>
		</main>,
	);
	expect(
		view.container
			.querySelector("[data-active-verse]")
			?.getAttribute("data-active-verse"),
	).toBe("b");
});
it("tracks semantic markers in a tall card even when no card has 60% visibility", () => {
	const markers = [
		{ key: "a", top: -1600 },
		{ key: "b", top: -30 },
		{ key: "c", top: 400 },
	];
	expect(verseAtReadingLine(markers, 100)).toBe("b");
	expect(verseAtReadingLine(markers, 450)).toBe("c");
	expect(verseAtReadingLine(markers, -2000)).toBe("a");
	expect(verseAtReadingLine([], 100)).toBeUndefined();
});
it("offers keyboard card navigation and honors reduced motion", () => {
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: vi.fn(() => ({ matches: true })),
	});
	const scroll = vi.fn();
	HTMLElement.prototype.scrollIntoView = scroll;
	vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
		function (this: HTMLElement) {
			const card = this.closest("article");
			const index = card
				? [...document.querySelectorAll("article")].indexOf(card)
				: 0;
			return {
				top: index * 800,
				bottom: (index + 1) * 800,
				left: 0,
				right: 390,
				width: 390,
				height: 800,
				x: 0,
				y: index * 800,
				toJSON: () => ({}),
			};
		},
	);
	const { container } = render(
		<main>
			<ReadingSurface chapter={semanticFixture()} fontSize="large" />
		</main>,
	);
	expect(
		(
			container.querySelector("[data-active-verse]") as HTMLElement
		).style.getPropertyValue("--reader-font-size"),
	).toBe("1.5rem");
	fireEvent.keyDown(container.querySelector("article")!, { key: "ArrowDown" });
	expect(scroll).toHaveBeenCalledWith({ block: "start", behavior: "instant" });
	expect(document.activeElement).toBe(container.querySelectorAll("article")[1]);
});
