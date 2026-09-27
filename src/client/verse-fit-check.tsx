import React from "react";
import { createRoot, type Root } from "react-dom/client";
import type { SemanticChapter } from "../domain/semantic-chapter.js";
import { ChapterCards } from "./semantic-renderer.js";
import "./style.css";

const surface = document.querySelector<HTMLElement>("#fit-surface");
if (!surface) throw new Error("Verse fit measurement surface is missing.");
const root: Root = createRoot(surface);

declare global {
	interface Window {
		renderVerseFitChapter(chapter: SemanticChapter): Promise<{
			text: string[];
			cards: Array<{
				verseKeys: string[];
				height: number;
				verseHeight: number;
				characters: number;
				words: number;
				lines: number;
			}>;
		}>;
	}
}

window.renderVerseFitChapter = async (chapter) => {
	root.render(<ChapterCards chapter={chapter} />);
	await document.fonts.ready;
	await new Promise<void>((resolve) =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
	);
	const articles = [...surface.querySelectorAll<HTMLElement>(".verse-card")];
	const cards = articles.map((article) => {
		const literature = article.querySelector<HTMLElement>(".card-literature");
		if (!literature) throw new Error("Semantic card did not render.");
		const headings = [
			...literature.querySelectorAll<HTMLElement>(
				".semantic-heading, .semantic-title",
			),
		];
		const saved = headings.map((heading) => heading.style.display);
		const height = literature.getBoundingClientRect().height;
		headings.forEach((heading) => (heading.style.display = "none"));
		const verseHeight = literature.getBoundingClientRect().height;
		headings.forEach(
			(heading, index) => (heading.style.display = saved[index] ?? ""),
		);
		const verseText = [
			...literature.querySelectorAll<HTMLElement>("[data-semantic-text]"),
		]
			.filter((node) => !node.closest(".semantic-heading, .semantic-title"))
			.map((node) => node.textContent ?? "")
			.join("");
		const lines = [
			...literature.querySelectorAll<HTMLElement>(".semantic-line"),
		].filter(
			(line) => !line.closest(".semantic-heading, .semantic-title"),
		).length;
		return {
			verseKeys: [
				...article.querySelectorAll<HTMLElement>("[data-verse-key]"),
			].map((node) => node.dataset.verseKey ?? ""),
			height,
			verseHeight,
			characters: verseText.length,
			words: verseText.trim() ? verseText.trim().split(/\s+/u).length : 0,
			lines,
		};
	});
	return {
		text: [
			...surface.querySelectorAll<HTMLElement>("[data-semantic-text]"),
		].map((node) => node.textContent ?? ""),
		cards,
	};
};
