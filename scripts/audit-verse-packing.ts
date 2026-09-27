/// <reference lib="dom" />
import { strictEqual } from "node:assert";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import type {} from "../src/client/packing-audit-types.js";
import { type Density, verseCards } from "../src/domain/card-packing.js";
import { packingUnits } from "../src/domain/measured-packing.js";
import {
	orderedText,
	type SemanticChapter,
	validateSemanticChapter,
} from "../src/domain/semantic-chapter.js";
import { ApiBibleProvider } from "../src/server/providers/api-bible.js";
import { localResponseCache } from "../src/server/providers/local-response-cache.js";
import { semanticFixture } from "../tests/fixtures/semantic-chapter.js";
import { readerGeometry } from "./reader-geometry.js";

const origin = process.env.VERSE_FIT_ORIGIN ?? "http://127.0.0.1:5173";
const fixtureOnly = process.argv.includes("--fixtures");
const webu = process.argv.includes("--webu");
const bibleId = process.env.API_BIBLE_CSB_ID;
if (!fixtureOnly && !webu && !bibleId)
	throw new Error("Set API_BIBLE_CSB_ID, or use --fixtures for invented data.");
const offlineProvider = new ApiBibleProvider({
	apiKey: "offline-audit",
	bibleId,
	fetch: localResponseCache({ allowNetwork: false }),
});
const missing: string[] = [];
const chapters: SemanticChapter[] = [semanticFixture()];
if (webu) {
	const manifest = JSON.parse(
		await readFile("public/scripture/webu/manifest.json", "utf8"),
	) as { chapters: { path: string; sha256: string }[] };
	for (const entry of manifest.chapters) {
		const bytes = await readFile(`public${entry.path}`);
		if (createHash("sha256").update(bytes).digest("hex") !== entry.sha256)
			throw new Error(`Corrupt WEBU chapter ${entry.path}`);
		const chapter = JSON.parse(bytes.toString("utf8")) as SemanticChapter;
		validateSemanticChapter(chapter);
		chapters.push(chapter);
	}
	if (chapters.length !== 182)
		throw new Error("Incomplete pinned WEBU corpus.");
}
if (!fixtureOnly && !webu) {
	for (const book of ["PSA", "PRO"] as const) {
		for (let chapter = 1; chapter <= (book === "PSA" ? 150 : 31); chapter++) {
			try {
				chapters.push(await offlineProvider.fetchChapter({ book, chapter }));
			} catch {
				missing.push(`${book}.${chapter}`);
			}
		}
	}
}
const browser = await chromium.launch({ channel: "chrome", headless: true });
const reports = [];
try {
	const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
	let blockedRequests = 0;
	await page.route("**/*", (route) => {
		const url = new URL(route.request().url());
		if (url.origin !== origin || url.pathname.startsWith("/api/")) {
			blockedRequests++;
			return route.abort();
		}
		return route.continue();
	});
	await page.goto(`${origin}/scripts/packing-audit.html`, {
		waitUntil: "networkidle",
	});
	for (const [index, chapter] of chapters.entries()) {
		if (index % 10 === 0)
			console.log(`Auditing chapter ${index}/${chapters.length - 1}`);
		for (const density of ["Spacious", "Balanced", "Compact"] as Density[]) {
			const start = performance.now();
			await page.evaluate(
				({ chapter, density }) => window.renderPackingAudit(chapter, density),
				{ chapter, density },
			);
			const geometry = await readerGeometry(page);
			const atomic = verseCards(chapter);
			const legal = packingUnits(chapter);
			const pages = await page.evaluate(
				({ chapter, atomic, legal, density }) => {
					const articles = [
						...document.querySelectorAll<HTMLElement>(
							"#audit-reader .verse-card",
						),
					];
					return articles.map((article) => {
						const nodeIds = [
							...article.querySelectorAll<HTMLElement>("[data-semantic-text]"),
						].map((node) => node.dataset.sourceNode!);
						const units = atomic.filter((unit) =>
							unit.nodeIds.some((id) => nodeIds.includes(id)),
						);
						const lastKey = units.at(-1)?.verseKeys.at(-1);
						const legalIndex = legal.findIndex((unit) =>
							unit.card.verseKeys.includes(lastKey ?? ""),
						);
						const nextUnit = legal[legalIndex + 1];
						const next = nextUnit?.card;
						const boundary =
							!!nextUnit?.boundaryBefore ||
							!!legal[legalIndex]?.card.indivisible;
						const current = {
							key: units.map((unit) => unit.key).join("/"),
							nodeIds: units.flatMap((unit) => unit.nodeIds),
							verseKeys: units.flatMap((unit) => unit.verseKeys),
						};
						const candidate = next
							? {
									key: `${current.key}/${next.key}`,
									nodeIds: [...current.nodeIds, ...next.nodeIds],
									verseKeys: [...current.verseKeys, ...next.verseKeys],
								}
							: undefined;
						const css = getComputedStyle(article);
						const surface =
							document.querySelector<HTMLElement>(".reading-scroll")!;
						const available = {
							width:
								article.clientWidth -
								parseFloat(css.paddingLeft) -
								parseFloat(css.paddingRight),
							height:
								surface.clientHeight -
								parseFloat(css.paddingTop) -
								parseFloat(css.paddingBottom) -
								1,
						};
						const addition = candidate
							? window.measurePackingCandidate(chapter, candidate)
							: undefined;
						return {
							references: current.verseKeys,
							occupancy:
								article
									.querySelector(".card-literature")!
									.getBoundingClientRect().height / available.height,
							available,
							addition,
							boundary,
							candidateFitsTarget:
								!!addition &&
								addition.width <= available.width &&
								addition.height <=
									available.height * (density === "Compact" ? 0.95 : 0.8),
						};
					});
				},
				{ chapter, atomic, legal, density },
			);
			for (const card of pages) {
				Object.assign(card, {
					stoppingReason: card.boundary
						? "literary-boundary"
						: !card.addition
							? "chapter-end"
							: !card.candidateFitsTarget
								? "measured-target"
								: density === "Spacious"
									? "spacious"
									: "eligible-addition",
				});
			}
			const compared = await page.evaluate(
				({ chapter, atomic }) => {
					const article = document.querySelector<HTMLElement>(
						"#audit-reader .verse-card",
					);
					if (!article)
						throw new Error("Missing visible page for candidate comparison.");
					const visibleKeys = new Set(
						[
							...article.querySelectorAll<HTMLElement>("[data-location-keys]"),
						].flatMap(
							(node) =>
								JSON.parse(node.dataset.locationKeys ?? "[]") as string[],
						),
					);
					const selectedUnits = atomic.filter((unit) =>
						unit.verseKeys.some((key) => visibleKeys.has(key)),
					);
					const card = {
						key: "visible-comparison",
						nodeIds: selectedUnits.flatMap((unit) => unit.nodeIds),
						verseKeys: selectedUnits.flatMap((unit) => unit.verseKeys),
					};
					const candidate = window.measurePackingCandidate(chapter, card);
					const literature =
						article.querySelector<HTMLElement>(".card-literature")!;
					const bounds = literature.getBoundingClientRect();
					return {
						candidate,
						visible: {
							width: Math.max(bounds.width, literature.scrollWidth),
							height: Math.max(bounds.height, literature.scrollHeight),
						},
						hidden: document
							.querySelector<HTMLElement>("#audit-candidate")
							?.getAttribute("aria-hidden"),
						inert:
							document.querySelector<HTMLElement>("#audit-candidate")?.inert,
						fonts: [
							getComputedStyle(article).fontSize,
							getComputedStyle(
								document.querySelector<HTMLElement>(
									"#audit-candidate .verse-card",
								)!,
							).fontSize,
						],
					};
				},
				{ chapter, atomic },
			);
			if (
				Math.abs(compared.candidate.width - compared.visible.width) > 2 ||
				Math.abs(compared.candidate.height - compared.visible.height) > 2 ||
				compared.hidden !== "true" ||
				!compared.inert ||
				compared.fonts[0] !== compared.fonts[1]
			)
				throw new Error(
					`Candidate surface differs from visible renderer or is exposed to accessibility/focus: ${JSON.stringify(compared)}`,
				);

			const rendered = await page
				.locator("#audit-reader [data-semantic-text]")
				.allTextContents();
			strictEqual(
				JSON.stringify(rendered),
				JSON.stringify(orderedText(chapter.nodes)),
				"Source text conservation",
			);
			strictEqual(
				JSON.stringify(pages.flatMap((card) => card.references)),
				JSON.stringify(atomic.flatMap((unit) => unit.verseKeys)),
				"Ordered complete-unit conservation",
			);
			reports.push({
				reference:
					index === 0
						? "invented fixture"
						: `${chapter.identity.book}.${chapter.identity.chapter}`,
				density,
				durationMs: performance.now() - start,
				pageCount: pages.length,
				singletonFraction:
					pages.filter((card) => card.references.length === 1).length /
					pages.length,
				geometry,
				pages,
			});
		}
	}
	strictEqual(
		blockedRequests,
		0,
		"Audit must not request APIs or external resources",
	);
	await mkdir(".local/packing-audit", { recursive: true });
	const label =
		process.env.PACKING_AUDIT_LABEL ??
		(fixtureOnly ? "fixtures" : webu ? "webu-current" : "current");
	if (!/^[a-z0-9-]+$/u.test(label))
		throw new Error("Use a simple audit label.");
	await writeFile(
		`.local/packing-audit/${label}.json`,
		JSON.stringify(
			{
				viewport: { width: 390, height: 844 },
				cachedChapters: chapters.length - 1,
				missing,
				reports,
			},
			null,
			2,
		),
	);
	console.log(
		JSON.stringify({
			cachedChapters: chapters.length - 1,
			missingChapters: missing.length,
			densityReports: reports.length,
			output: `.local/packing-audit/${label}.json`,
			upstreamRequests: 0,
		}),
	);
} finally {
	await browser.close();
}
