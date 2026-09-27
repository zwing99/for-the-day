/// <reference lib="dom" />
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { ok } from "node:assert";
import { chromium } from "playwright";
import type { SemanticChapter } from "../src/domain/semantic-chapter.js";
import { validateSemanticChapter } from "../src/domain/semantic-chapter.js";
import type { Density } from "../src/domain/card-packing.js";
import type {} from "../src/client/webu-fit-types.js";
import { readerGeometry } from "./reader-geometry.js";

const origin = process.env.VERSE_FIT_ORIGIN ?? "http://127.0.0.1:5173";
const manifest = JSON.parse(
	await readFile("public/scripture/webu/manifest.json", "utf8"),
) as {
	revision: string;
	chapters: Array<{
		book: "PSA" | "PRO";
		chapter: number;
		path: string;
		sha256: string;
	}>;
};
const chapters: SemanticChapter[] = [];
for (const entry of manifest.chapters) {
	const bytes = await readFile(`public${entry.path}`);
	if (createHash("sha256").update(bytes).digest("hex") !== entry.sha256)
		throw new Error("Corrupt WEBU measurement asset.");
	const chapter: unknown = JSON.parse(bytes.toString("utf8"));
	validateSemanticChapter(chapter);
	if (
		chapter.identity.translation !== "WEBU" ||
		chapter.identity.book !== entry.book ||
		chapter.identity.chapter !== entry.chapter
	)
		throw new Error("Wrong WEBU measurement identity.");
	chapters.push(chapter);
}
if (chapters.length !== 181)
	throw new Error("Missing WEBU measurement chapters.");
const scenarios: Array<{
	width: number;
	height: number;
	density: Density;
	fontSize: "normal" | "large" | "larger";
	rootSize: number;
}> = [];
for (const [width, height] of [
	[320, 568],
	[390, 844],
	[430, 932],
	[844, 390],
	[820, 1180],
	[507, 768],
	[1440, 900],
]) {
	for (const density of ["Spacious", "Balanced", "Compact"] as const)
		for (const fontSize of ["normal", "large", "larger"] as const)
			for (const rootSize of [16, 20])
				scenarios.push({
					width: width!,
					height: height!,
					density,
					fontSize,
					rootSize,
				});
}
const report =
	process.env.VERSE_FIT_REPORT ?? ".local/verification/webu-fit.json";
await mkdir(report.slice(0, report.lastIndexOf("/")), { recursive: true });
const records: unknown[] = [];
const remaining = scenarios;
const browser = await chromium.launch();
let cursor = 0;
try {
	const worker = async () => {
		const context = await browser.newContext({
			reducedMotion: "reduce",
			serviceWorkers: "block",
		});
		await context.route("**/*", (route) =>
			new URL(route.request().url()).origin === origin &&
			!new URL(route.request().url()).pathname.startsWith("/api/")
				? route.continue()
				: route.abort(),
		);
		const page = await context.newPage();
		while (cursor < remaining.length) {
			const scenario = remaining[cursor++]!;
			await page.setViewportSize({
				width: scenario.width,
				height: scenario.height,
			});
			await page.goto(`${origin}/scripts/webu-fit-check.html`);
			await page.waitForFunction(
				() => typeof window.renderWebuFitChapter === "function",
			);
			const maxima = new Map<string, unknown>();
			const maximumValues = new Map<string, number>();
			let pages = 0,
				shrunk = 0;
			let minEffective = Infinity;
			const shrinkingReferences: unknown[] = [];
			for (const chapter of chapters) {
				await page.evaluate(
					({ chapter, scenario }) =>
						window.renderWebuFitChapter(chapter, scenario),
					{ chapter, scenario },
				);
				const geometry = await readerGeometry(page);
				ok(geometry.pages.length > 0, "Reader produced pages");
				const details = await page
					.locator(".verse-card")
					.evaluateAll((elements) =>
						elements.map((element) => {
							const article = element as HTMLElement;
							const literature =
								article.querySelector<HTMLElement>(".card-literature")!;
							const saved = article.style.getPropertyValue("--page-font-scale");
							article.style.setProperty("--page-font-scale", "1");
							const selectedSize = parseFloat(
								getComputedStyle(article).fontSize,
							);
							const rawHeight = Math.max(
								literature.getBoundingClientRect().height,
								literature.scrollHeight,
							);
							article.style.setProperty("--page-font-scale", saved);
							return {
								keys: [
									...article.querySelectorAll<HTMLElement>("[data-verse-key]"),
								].map((marker) => marker.dataset.verseKey!),
								selectedSize,
								rawHeight,
								heading: !!article.querySelector(
									".semantic-heading, .semantic-title",
								),
							};
						}),
					);
				let cardIndex = 0;
				for (const card of geometry.pages) {
					pages++;
					ok(
						card.contentHeight <= card.availableHeight + 1,
						`Complete ${chapter.identity.book}.${chapter.identity.chapter} content fits vertically`,
					);
					ok(
						card.contentWidth <= card.availableWidth + 1,
						"Complete content fits horizontally",
					);
					ok(
						Math.abs(card.height - geometry.surface.height) <= 1,
						`One-screen geometry ${chapter.identity.book}.${chapter.identity.chapter} ${JSON.stringify(scenario)}: ${card.kind} height=${card.height} surface=${geometry.surface.height}`,
					);
					if (!card.kind.includes("verse-card")) continue;
					const detail = details[cardIndex++]!;
					const reference = detail.keys.join(",");
					minEffective = Math.min(minEffective, card.fontSize);
					if (card.scale < 1) {
						shrunk++;
						shrinkingReferences.push({
							reference,
							selectedSize: detail.selectedSize,
							effectiveSize: card.fontSize,
							scale: card.scale,
						});
					}
					const record = {
						reference,
						availableHeight: card.availableHeight,
						availableWidth: card.availableWidth,
						selectedSize: detail.selectedSize,
						effectiveSize: card.fontSize,
						scale: card.scale,
						rawHeight: detail.rawHeight,
						contentHeight: card.contentHeight,
						completeFit: true,
					};
					for (const metric of [
						"height",
						...(detail.heading ? ["attachedHeadingHeight"] : []),
					])
						if (detail.rawHeight > (maximumValues.get(metric) ?? -Infinity)) {
							maximumValues.set(metric, detail.rawHeight);
							maxima.set(metric, record);
						}
				}
			}
			records.push({
				...scenario,
				chapters: chapters.length,
				pages,
				shrunk,
				minEffective,
				maxima: Object.fromEntries(maxima),
				shrinkingReferences,
			});
			await writeFile(
				report,
				JSON.stringify(
					{
						edition: "WEBU",
						revision: manifest.revision,
						method: "reader-v1",
						engine: "Chromium",
						scenarios: records,
					},
					null,
					2,
				),
			);
			console.log(
				`WEBU ${scenario.width}×${scenario.height} ${scenario.density} ${scenario.fontSize} root=${scenario.rootSize}: all 181 chapters fit; minimum effective ${minEffective.toFixed(2)}px`,
			);
		}
		await context.close();
	};
	await Promise.all([worker(), worker(), worker()]);
} finally {
	await browser.close();
}
console.log(
	`WEBU ${records.length} full-corpus scenarios saved to ${report}; zero upstream requests.`,
);
