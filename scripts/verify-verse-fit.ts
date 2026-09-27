import { chromium } from "playwright";
import { verseCards } from "../src/domain/card-packing.js";
import type { SemanticChapter } from "../src/domain/semantic-chapter.js";
import { orderedText } from "../src/domain/semantic-chapter.js";
import { ApiBibleProvider } from "../src/server/providers/api-bible.js";
import { localResponseCache } from "../src/server/providers/local-response-cache.js";

if (process.env.VERSE_FIT_EDITION === "WEBU") {
	await import("./verify-webu-fit.js");
	process.exit(0);
}
if (process.env.VERSE_FIT_EDITION && process.env.VERSE_FIT_EDITION !== "CSB")
	throw new Error("Use VERSE_FIT_EDITION=CSB or WEBU.");

// Benchmark mode finishes after the bounded, cached-only regression matrix.
if (process.env.VERSE_FIT_SCOPE === "benchmarks") {
	await import("./verify-verse-fit-benchmarks.js");
	process.exit(0);
}

const origin = process.env.VERSE_FIT_ORIGIN ?? "http://127.0.0.1:5173";
const expectedBibleId = process.env.API_BIBLE_CSB_ID;
if (!expectedBibleId)
	throw new Error(
		"Set API_BIBLE_CSB_ID and start the local API before scanning.",
	);

type Passage = { book: "PSA" | "PRO"; chapter: number };
type Candidate = {
	book: Passage["book"];
	reference: string;
	value: number;
	geometry?: number;
	lines?: number;
};
const names = { PSA: "Psalm", PRO: "Proverbs" } as const;
const winners = new Map<string, Candidate[]>();
let successfulChapters = 0;
let atomicUnits = 0;
let rendererCards = 0;

function record(metric: string, candidate: Candidate) {
	const current = winners.get(metric) ?? [];
	if (!current.length || candidate.value > current[0]!.value)
		winners.set(metric, [candidate]);
	else if (candidate.value === current[0]!.value) current.push(candidate);
}

const offlineProvider = new ApiBibleProvider({
	apiKey: "offline-verification",
	bibleId: expectedBibleId,
	fetch: localResponseCache({ allowNetwork: false }),
});

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
	const page = await browser.newPage({
		viewport: { width: 320, height: 740 },
	});
	await page.goto(`${origin}/scripts/verse-fit-check.html`, {
		waitUntil: "networkidle",
	});
	const health = await page.evaluate(async () => {
		try {
			return (await fetch("/api/health")).ok;
		} catch {
			return false;
		}
	});
	if (!health)
		throw new Error(
			`Local API unavailable at ${origin}; start mise run dev first.`,
		);
	for (const book of ["PSA", "PRO"] as const) {
		const count = book === "PSA" ? 150 : 31;
		for (let chapterNumber = 1; chapterNumber <= count; chapterNumber++) {
			const passage = { book, chapter: chapterNumber } satisfies Passage;
			let chapter: SemanticChapter;
			try {
				chapter = await offlineProvider.fetchChapter(passage);
			} catch {
				throw new Error(
					`${book}.${chapterNumber}: no usable cached response; stopping without an upstream request. Import saved samples with mise run cache:import-samples.`,
				);
			}
			if (
				!chapter ||
				chapter.identity.translation !== "CSB" ||
				chapter.identity.provider !== "api-bible" ||
				chapter.identity.providerBibleId !== expectedBibleId ||
				chapter.identity.book !== book ||
				chapter.identity.chapter !== chapterNumber
			)
				throw new Error(
					`${book}.${chapterNumber}: edition or passage identity check failed; no Scripture was written.`,
				);
			const units = verseCards(chapter);
			const rendered = await page.evaluate(
				(value) =>
					(
						globalThis as unknown as {
							renderVerseFitChapter: (chapter: SemanticChapter) => Promise<{
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
					).renderVerseFitChapter(value),
				chapter,
			);
			if (
				JSON.stringify(rendered.text) !==
				JSON.stringify(orderedText(chapter.nodes))
			)
				throw new Error(
					`${book}.${chapterNumber}: faithful renderer text check failed; no Scripture was written.`,
				);
			if (rendered.cards.length !== units.length)
				throw new Error(
					`${book}.${chapterNumber}: atomic card count mismatch; no Scripture was written.`,
				);
			successfulChapters++;
			atomicUnits += units.length;
			rendererCards += rendered.cards.length;
			for (const [index, unit] of units.entries()) {
				const measured = rendered.cards[index];
				if (!measured || !Number.isFinite(measured.height))
					throw new Error(`${book}.${chapterNumber}: render did not settle.`);
				if (
					JSON.stringify(measured.verseKeys) !== JSON.stringify(unit.verseKeys)
				)
					throw new Error(
						`${book}.${chapterNumber}: complete-verse identity mismatch; no Scripture was written.`,
					);
				const verseLabels = unit.verseKeys.map(
					(key) =>
						chapter.verses.find((verse) => verse.key === key)?.displayLabel ??
						"?",
				);
				const reference = `${names[book]} ${chapterNumber}:${verseLabels.join(",")}`;
				for (const [metric, value, geometry, lines] of [
					["heading-attached height", measured.height, undefined, undefined],
					["verse-only height", measured.verseHeight, undefined, undefined],
					["characters", measured.characters, measured.height, measured.lines],
					["words", measured.words, measured.height, measured.lines],
					["semantic lines", measured.lines, measured.height, measured.lines],
				] as const)
					record(`${book}: ${metric}`, {
						book,
						reference,
						value,
						...(geometry === undefined ? {} : { geometry }),
						...(lines === undefined ? {} : { lines }),
					});
			}
			console.log(
				`${book}.${chapterNumber}: rendered ${units.length} complete units`,
			);
		}
	}
	if (successfulChapters !== 181 || atomicUnits !== rendererCards)
		throw new Error("Full corpus or renderer coverage check failed.");
	console.log(
		JSON.stringify(
			{
				edition: "CSB",
				viewport: { width: 320, height: 740 },
				font: await page.evaluate(() => {
					const dom = globalThis as unknown as {
						document: { querySelector(selector: string): unknown };
						getComputedStyle(element: unknown): {
							fontFamily: string;
							fontSize: string;
							lineHeight: string;
						};
					};
					const card = dom.document.querySelector(".verse-card");
					if (!card) throw new Error("No measured Scripture card.");
					const css = dom.getComputedStyle(card);
					return {
						family: css.fontFamily,
						size: css.fontSize,
						lineHeight: css.lineHeight,
					};
				}),
				chapters: successfulChapters,
				atomicUnits,
				winners: Object.fromEntries(winners),
			},
			null,
			2,
		),
	);
} finally {
	await browser.close();
}
