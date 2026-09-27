import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type {} from "./packing-audit-types.js";
import { ReadingSurface } from "./reading-surface.js";
import { ChapterCards } from "./semantic-renderer.js";
import "./style.css";

const root = createRoot(document.querySelector("#audit-reader")!);
const candidateRoot = createRoot(document.querySelector("#audit-candidate")!);
window.renderPackingAudit = async (chapter, density) => {
	flushSync(() =>
		root.render(
			<ReadingSurface
				chapter={chapter}
				density={density}
				targetKey={chapter.verses[0]?.key}
				restoreId={1}
			/>,
		),
	);
	await document.fonts.ready;
	await new Promise((resolve) => setTimeout(resolve, 400));
};
window.measurePackingCandidate = (chapter, card) => {
	const visible = document.querySelector<HTMLElement>(
		"#audit-reader .verse-card",
	)!;
	const host = document.querySelector<HTMLElement>("#audit-candidate")!;
	host.style.width = `${visible.getBoundingClientRect().width}px`;
	host.style.setProperty(
		"--reading-height",
		`${visible.getBoundingClientRect().height}px`,
	);
	flushSync(() =>
		candidateRoot.render(<ChapterCards chapter={chapter} cards={[card]} />),
	);
	const article = host.querySelector<HTMLElement>(".verse-card")!;
	article.style.fontSize = `${parseFloat(getComputedStyle(visible).fontSize) / Number(visible.dataset.pageFitScale ?? 1)}px`;
	const literature = host.querySelector<HTMLElement>(".card-literature")!;
	const bounds = literature.getBoundingClientRect();
	return {
		width: Math.max(bounds.width, literature.scrollWidth),
		height: Math.max(bounds.height, literature.scrollHeight),
	};
};
