import { mkdir, writeFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import { ApiBibleProvider } from "../src/server/providers/api-bible.js";
import { localResponseCache } from "../src/server/providers/local-response-cache.js";
import { assertReaderGeometry, settledReader } from "./reader-geometry.js";

const origin = process.env.VERSE_FIT_ORIGIN ?? "http://127.0.0.1:5173";
const bibleId = process.env.API_BIBLE_CSB_ID;
if (!bibleId)
	throw new Error("Configure API_BIBLE_CSB_ID for cached CSB benchmarks.");
const provider = new ApiBibleProvider({
	apiKey: "offline",
	bibleId,
	fetch: localResponseCache({ allowNetwork: false }),
});
const benchmarks = [
	{ book: "PSA", chapter: 60, verse: "1" },
	{ book: "PSA", chapter: 27, verse: "4" },
	{ book: "PSA", chapter: 17, verse: "14" },
	{ book: "PSA", chapter: 141, verse: "5" },
	{ book: "PRO", chapter: 30, verse: "4" },
] as const;
// Read every required chapter before launching: missing/expired data never downloads.
const chapters = await Promise.all(
	benchmarks.map((passage) => provider.fetchChapter(passage)),
);
const records: unknown[] = [];
const report =
	process.env.VERSE_FIT_REPORT ?? ".local/css-cleanup/benchmarks.json";
await mkdir(".local/css-cleanup", { recursive: true });
for (const [name, engine] of [
	["Chromium", chromium],
	["WebKit", webkit],
] as const) {
	const browser = await engine.launch();
	try {
		const context = await browser.newContext({
			reducedMotion: "reduce",
			serviceWorkers: "block",
		});
		await context.route("**/*", async (route) => {
			const url = new URL(route.request().url());
			if (url.origin !== origin) return route.abort();
			if (!url.pathname.startsWith("/api/")) return route.continue();
			const [, , , , book, number] = url.pathname.split("/");
			const chapter = chapters.find(
				(item) =>
					item.identity.book === book &&
					item.identity.chapter === Number(number),
			);
			if (!chapter) return route.abort();
			return route.fulfill({
				json: { chapter: { ...chapter, tracking: { kind: "none" } } },
			});
		});
		const page = await context.newPage();
		await page.goto(origin);
		for (const [width, height] of [
			[320, 568],
			[390, 844],
			[430, 932],
			[844, 390],
			[820, 1180],
			[507, 768],
			[1440, 900],
		] as const) {
			await page.setViewportSize({ width, height });
			for (const density of ["Spacious", "Balanced", "Compact"]) {
				for (const fontSize of ["normal", "large", "larger"]) {
					for (const rootSize of [16, 20]) {
						await page.evaluate(
							(preferences) =>
								localStorage.setItem(
									"for-the-day:v1:preferences",
									JSON.stringify(preferences),
								),
							{
								translation: "CSB",
								density,
								fontSize,
								appearance: "light",
								intros: true,
								verseLabels: true,
							},
						);
						for (const passage of benchmarks) {
							await page.goto(
								`${origin}/${passage.book === "PRO" ? passage.chapter : ((passage.chapter - 1) % 30) + 1}/${passage.book === "PSA" ? "psalm" : "proverbs"}/${passage.chapter}/${passage.verse}?translation=CSB`,
							);
							await page.evaluate((size) => {
								document.documentElement.style.fontSize = `${size}px`;
							}, rootSize);
							await settledReader(page);
							const geometry = await assertReaderGeometry(page);
							records.push({
								engine: name,
								width,
								height,
								density,
								fontSize,
								rootSize,
								reference: `${passage.book}.${passage.chapter}.${passage.verse}`,
								geometry,
							});
						}
					}
				}
			}
			console.log(`${name} ${width}×${height}: cached benchmark matrix passed`);
			await writeFile(report, JSON.stringify(records, null, 2));
		}
		const mobile = await browser.newContext({
			userAgent:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
			isMobile: true,
			hasTouch: true,
			reducedMotion: "reduce",
			serviceWorkers: "block",
		});
		await mobile.route("**/*", async (route) => {
			const url = new URL(route.request().url());
			if (url.origin !== origin) return route.abort();
			if (!url.pathname.startsWith("/api/")) return route.continue();
			const [, , , , book, number] = url.pathname.split("/");
			const chapter = chapters.find(
				(item) =>
					item.identity.book === book &&
					item.identity.chapter === Number(number),
			);
			if (!chapter) return route.abort();
			return route.fulfill({
				json: { chapter: { ...chapter, tracking: { kind: "none" } } },
			});
		});
		const mobilePage = await mobile.newPage();
		await mobilePage.goto(origin);
		await mobilePage.locator(".install-invitation").waitFor();
		for (const [width, height] of [
			[320, 568],
			[390, 844],
			[844, 390],
		] as const) {
			await mobilePage.setViewportSize({ width, height });
			for (const density of ["Spacious", "Balanced", "Compact"]) {
				for (const fontSize of ["normal", "large", "larger"]) {
					for (const rootSize of [16, 20]) {
						await mobilePage.evaluate(
							(preferences) =>
								localStorage.setItem(
									"for-the-day:v1:preferences",
									JSON.stringify(preferences),
								),
							{
								translation: "CSB",
								density,
								fontSize,
								appearance: "light",
								intros: true,
								verseLabels: true,
							},
						);
						for (const passage of benchmarks) {
							await mobilePage.goto(
								`${origin}/${passage.book === "PRO" ? passage.chapter : ((passage.chapter - 1) % 30) + 1}/${passage.book === "PSA" ? "psalm" : "proverbs"}/${passage.chapter}/${passage.verse}?translation=CSB`,
							);
							await mobilePage.evaluate((size) => {
								document.documentElement.style.fontSize = `${size}px`;
							}, rootSize);
							await mobilePage.locator(".install-invitation").waitFor();
							await settledReader(mobilePage);
							const geometry = await assertReaderGeometry(mobilePage);
							records.push({
								engine: name,
								platform: "iPhone invite visible",
								width,
								height,
								density,
								fontSize,
								rootSize,
								reference: `${passage.book}.${passage.chapter}.${passage.verse}`,
								geometry,
							});
						}
					}
				}
			}
			console.log(
				`${name} iPhone invitation ${width}×${height}: cached benchmark matrix passed`,
			);
			await writeFile(report, JSON.stringify(records, null, 2));
		}
		await mobile.close();
	} finally {
		await browser.close();
	}
}
await writeFile(report, JSON.stringify(records, null, 2));
console.log(
	`${records.length} cached CSB cases passed; no upstream requests. Full-corpus maxima were not remeasured.`,
);
