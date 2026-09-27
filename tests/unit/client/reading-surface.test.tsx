// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
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
it("completes restoration once when layout changes before the readiness frames finish", () => {
	const frames = new Map<number, FrameRequestCallback>();
	let sequence = 0;
	vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
		frames.set(++sequence, callback);
		return sequence;
	});
	vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
		frames.delete(id);
	});
	const chapter = semanticFixture();
	const onReady = vi.fn();
	const onLocation = vi.fn();
	const content = (fontSize: "normal" | "large") => (
		<main>
			<ReadingSurface
				chapter={chapter}
				targetKey="b"
				restoreId={1}
				fontSize={fontSize}
				onReady={onReady}
				onLocation={onLocation}
			/>
		</main>
	);
	const view = render(content("normal"));
	view.rerender(content("large"));
	expect(onReady).not.toHaveBeenCalled();
	expect(onLocation).not.toHaveBeenCalled();
	act(() => {
		while (frames.size) {
			const pending = [...frames.values()];
			frames.clear();
			for (const callback of pending) callback(0);
		}
	});
	expect(onReady).toHaveBeenCalledTimes(1);
	expect(onLocation).not.toHaveBeenCalled();
	expect(
		view.container
			.querySelector("[data-active-verse]")
			?.getAttribute("data-active-verse"),
	).toBe("b");
});
it.each(["ArrowUp", "ArrowDown", "PageUp", "PageDown"])(
	"leaves %s to the browser while text is selected",
	(key) => {
		const scroll = vi.fn();
		HTMLElement.prototype.scrollIntoView = scroll;
		const { container } = render(
			<main>
				<ReadingSurface chapter={semanticFixture()} />
			</main>,
		);
		const card = container.querySelector("article")!;
		card.focus();
		const selection = document.getSelection()!;
		const range = document.createRange();
		range.selectNodeContents(card.querySelector("[data-semantic-text]")!);
		selection.removeAllRanges();
		selection.addRange(range);
		try {
			expect(selection.toString().length).toBeGreaterThan(0);
			expect(fireEvent.keyDown(card, { key })).toBe(true);
			expect(scroll).not.toHaveBeenCalled();
			expect(document.activeElement).toBe(card);
		} finally {
			selection.removeAllRanges();
		}
	},
);
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
	).toBe("var(--scripture-size-large)");
	fireEvent.keyDown(container.querySelector("article")!, { key: "ArrowDown" });
	expect(scroll).toHaveBeenCalledWith({ block: "start", behavior: "instant" });
	expect(document.activeElement).toBe(container.querySelectorAll("article")[1]);
});

it.each(["wheel", "touch"])(
	"settles rapid %s scrolling at the current page instead of pulling back to the gesture origin",
	(input) => {
		vi.useFakeTimers({
			toFake: [
				"setTimeout",
				"clearTimeout",
				"requestAnimationFrame",
				"cancelAnimationFrame",
			],
		});
		try {
			const chapter = semanticFixture();
			const onLocation = vi.fn();
			const view = render(
				<main>
					<ReadingSurface
						chapter={chapter}
						density="Spacious"
						restoreId={1}
						targetKey="a"
						onLocation={onLocation}
					/>
				</main>,
			);
			act(() => vi.advanceTimersByTime(32));
			const main = view.container.querySelector("main")!;
			const articles = [...view.container.querySelectorAll("article")];
			Object.defineProperty(main, "clientHeight", {
				configurable: true,
				value: 800,
			});
			vi.spyOn(
				HTMLElement.prototype,
				"getBoundingClientRect",
			).mockImplementation(function (this: HTMLElement) {
				const index = articles.indexOf(this.closest("article")!);
				const top = index < 0 ? 0 : index * 800 - main.scrollTop;
				return {
					top,
					bottom: top + 800,
					left: 0,
					right: 390,
					// Keep jsdom layout measurement disabled; only page positions are modeled.
					width: 0,
					height: 800,
					x: 0,
					y: top,
					toJSON: () => ({}),
				};
			});
			const scroll = vi.fn(({ top }: ScrollToOptions) => {
				main.scrollTop = top ?? 0;
			});
			main.scrollTo = scroll;
			if (input === "wheel") fireEvent.wheel(main, { deltaY: 2000 });
			else
				fireEvent.touchStart(main, {
					touches: [{ clientX: 200, clientY: 400 }],
				});
			// Momentum or repeated fast input has reached the third page before settling.
			main.scrollTop = 1580;
			fireEvent.scroll(main);
			if (input === "touch") fireEvent.touchEnd(main, { touches: [] });
			fireEvent(main, new Event("scrollend"));
			expect(scroll).toHaveBeenCalledWith({ top: 1600, behavior: "instant" });
			expect(main.scrollTop).toBe(1600);
			expect(onLocation).toHaveBeenLastCalledWith("c");
		} finally {
			vi.useRealTimers();
		}
	},
);
