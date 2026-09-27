import { chromium } from "playwright";
import type { SemanticChapter } from "../src/domain/semantic-chapter.js";
import { orderedText } from "../src/domain/semantic-chapter.js";
import { verseCards } from "../src/domain/card-packing.js";
import { publicFailureCategory } from "./verse-fit-support.js";

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

function failureCode(body: unknown): string | undefined {
	const code =
		body &&
		typeof body === "object" &&
		"error" in body &&
		body.error &&
		typeof body.error === "object" &&
		"code" in body.error &&
		typeof body.error.code === "string"
			? body.error.code
			: undefined;
	return code;
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
	const page = await browser.newPage({ viewport: { width: 320, height: 740 } });
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
			let result: { status: number; body?: unknown };
			try {
				result = await page.evaluate(
					async ({ book, chapterNumber }) => {
						const response = await fetch(
							`/api/bible/CSB/${book}/${chapterNumber}`,
						);
						let body: unknown;
						try {
							body = await response.json();
						} catch {
							body = undefined;
						}
						return { status: response.status, body };
					},
					{ book, chapterNumber },
				);
			} catch {
				throw new Error(
					`${book}.${chapterNumber}: local API request failed; no Scripture was written.`,
				);
			}
			if (result.status < 200 || result.status >= 300) {
				throw new Error(
					`${book}.${chapterNumber}: ${publicFailureCategory(result.status, failureCode(result.body))} (HTTP ${result.status}); stopping without writing Scripture.`,
				);
			}
			const payload = result.body as { chapter?: SemanticChapter };
			const chapter = payload.chapter;
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
				font: "Georgia 20px / 1.7",
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
