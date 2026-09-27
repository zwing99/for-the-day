import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { Density } from "../domain/card-packing.js";
import {
	type CandidateGeometry,
	measuredPackChapter,
	packingUnits,
} from "../domain/measured-packing.js";
import type { SemanticChapter } from "../domain/semantic-chapter.js";
import { ChapterCards } from "./semantic-renderer.js";

/** A revision owns its finite composed-candidate cache and detached-from-paging
 * renderer. The host inherits the real shell's type, labels and page styles. */
export function measureChapterPacking(
	chapter: SemanticChapter,
	density: Density,
	surface: HTMLElement,
	content: HTMLElement,
) {
	const visible = content.querySelector<HTMLElement>(".verse-card");
	if (!visible) return undefined;
	const css = getComputedStyle(visible);
	const available = {
		width:
			visible.clientWidth -
			parseFloat(css.paddingLeft) -
			parseFloat(css.paddingRight),
		height:
			surface.clientHeight -
			parseFloat(css.paddingTop) -
			parseFloat(css.paddingBottom) -
			1,
	};
	if (!(available.width > 0 && available.height > 0)) return undefined;
	const host = document.createElement("div");
	host.inert = true;
	host.setAttribute("aria-hidden", "true");
	host.dataset.packingMeasurement = "true";
	Object.assign(host.style, {
		position: "fixed",
		left: "-10000px",
		top: "0",
		visibility: "hidden",
		width: `${surface.clientWidth}px`,
	});
	host.style.setProperty(
		"--reader-font-size",
		getComputedStyle(content).getPropertyValue("--reader-font-size"),
	);
	surface.append(host);
	const root = createRoot(host);
	const cache = new Map<string, CandidateGeometry>();
	try {
		return measuredPackChapter(
			packingUnits(chapter),
			density,
			available,
			(card) => {
				const cached = cache.get(card.key);
				if (cached) return cached;
				flushSync(() =>
					root.render(<ChapterCards chapter={chapter} cards={[card]} />),
				);
				const literature = host.querySelector<HTMLElement>(".card-literature")!;
				const bounds = literature.getBoundingClientRect();
				const geometry = {
					width: Math.max(bounds.width, literature.scrollWidth),
					height: Math.max(bounds.height, literature.scrollHeight),
				};
				cache.set(card.key, geometry);
				return geometry;
			},
		);
	} finally {
		root.unmount();
		host.remove();
	}
}
