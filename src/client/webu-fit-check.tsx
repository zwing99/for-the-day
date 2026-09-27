import type {} from "./webu-fit-types.js";
import { createRoot } from "react-dom/client";
import { Reader } from "./reader.js";
import { ReadingStorage } from "./reading-storage.js";
import "./style.css";

const target = document.getElementById("root");
if (!target) throw new Error("Missing WEBU measurement root.");
const root = createRoot(target);
let sequence = 0;
window.renderWebuFitChapter = async (chapter, options) => {
	const number = chapter.identity.chapter;
	const day =
		chapter.identity.book === "PRO" ? number : ((number - 1) % 30) + 1;
	history.replaceState(
		null,
		"",
		`/${day}/${chapter.identity.book === "PRO" ? "proverbs" : "psalm"}/${number}/${chapter.verses[0]!.displayLabel}?translation=WEBU`,
	);
	document.documentElement.style.fontSize = `${options.rootSize}px`;
	const storage = new ReadingStorage();
	storage.setPreferences({
		...storage.preferences(),
		translation: "WEBU",
		density: options.density,
		fontSize: options.fontSize,
	});
	root.render(
		<Reader
			key={++sequence}
			source={{ get: async () => chapter }}
			storage={storage}
			report={() => {}}
		/>,
	);
	await document.fonts.ready;
	const deadline = performance.now() + 5000;
	while (true) {
		const surface = target!.querySelector<HTMLElement>(".reading-scroll");
		if (
			surface &&
			surface
				.querySelector("[data-verse-key]")
				?.getAttribute("data-verse-key") === chapter.verses[0]?.key &&
			surface.style.getPropertyValue("--reading-height") ===
				`${surface.clientHeight}px`
		)
			break;
		if (performance.now() > deadline)
			throw new Error("WEBU reader measurement did not settle.");
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
	await new Promise<void>((resolve) =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
	);
};
