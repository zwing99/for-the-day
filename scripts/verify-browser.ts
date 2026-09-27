import { strictEqual } from "node:assert";
import { chromium, webkit } from "playwright";
import { semanticFixture } from "../tests/fixtures/semantic-chapter.js";
import { assertReaderGeometry, settledReader } from "./reader-geometry.js";

if (process.env.BROWSER_EDITION === "WEBU") {
	await import("./verify-webu-browser.js");
	process.exit(0);
}

const origin = `http://127.0.0.1:${process.env.WEB_PORT ?? 5173}`;
for (const [name, engine] of [
	["Chromium", chromium],
	["WebKit", webkit],
] as const) {
	const browser = await engine.launch();
	let checkpoint = "startup";
	try {
		const context = await browser.newContext({ reducedMotion: "reduce" });
		await context.addInitScript(
			"localStorage.setItem('for-the-day:v1:preferences', JSON.stringify({translation:'CSB',density:'Spacious',fontSize:'normal',appearance:'light',intros:true,verseLabels:true}))",
		);
		let failing = false;
		await context.route("**/*", async (route) => {
			const url = new URL(route.request().url());
			if (url.origin !== origin) return route.abort();
			if (!url.pathname.startsWith("/api/")) return route.continue();
			if (failing)
				return route.fulfill({
					status: 503,
					json: { error: { code: "provider-unavailable" } },
				});
			const [, , , translation, book, number] = url.pathname.split("/");
			const chapter = semanticFixture();
			Object.assign(chapter.identity, {
				translation,
				provider: translation === "ESV" ? "crossway" : "api-bible",
				book,
				chapter: Number(number),
			});
			chapter.tracking = { kind: "none" };
			return route.fulfill({
				json: { chapter },
				headers: { "Cache-Control": "no-store" },
			});
		});
		const page = await context.newPage();
		const errors: string[] = [];
		page.on("pageerror", (error) => errors.push(error.message));
		for (const [width, height] of [
			[320, 568],
			[390, 844],
			[844, 390],
			[820, 1180],
			[507, 768],
		] as const) {
			await page.setViewportSize({ width, height });
			for (const translation of ["CSB", "NIV", "NLT", "ESV"]) {
				checkpoint = `${width}×${height} ${translation}`;
				await page.goto(`${origin}/23/psalm/23/2?translation=${translation}`);
				await page
					.locator("[data-active-verse='b']")
					.waitFor({ state: "attached" });
				await settledReader(page);
				await assertReaderGeometry(page);
				await page.setViewportSize({ width: width + 10, height: height + 10 });
				await page.waitForTimeout(400);
				strictEqual(
					await page
						.locator("[data-active-verse]")
						.getAttribute("data-active-verse"),
					"b",
				);
				await assertReaderGeometry(page);
				await page.setViewportSize({ width, height });
				await page.waitForTimeout(400);
				await page.getByRole("button", { name: "Open reader menu" }).click();
				await page.getByRole("dialog").waitFor();
				strictEqual(
					await page.evaluate(() =>
						[
							...document.querySelectorAll(
								"dialog button, dialog select, dialog .check-field, .menu-trigger",
							),
						].every((element) => element.getBoundingClientRect().height >= 44),
					),
					true,
				);
				strictEqual(
					await page.evaluate(
						"document.documentElement.scrollWidth <= innerWidth",
					),
					true,
				);
				await page.keyboard.press("Escape");
				strictEqual(
					await page.evaluate(
						"document.activeElement?.getAttribute('aria-label') === 'Open reader menu'",
					),
					true,
				);
			}
		}
		failing = true;
		checkpoint = "failure recovery";
		await page.goto(`${origin}/23/psalm/23/2?translation=CSB`);
		await page.getByRole("alert").waitFor();
		failing = false;
		await page.getByRole("button", { name: "Try again" }).click();
		await page
			.locator("[data-active-verse='b']")
			.waitFor({ state: "attached" });
		strictEqual(errors.length, 0);
		console.log(
			`${name}: 20 responsive route/menu cases and failure recovery passed; no provider requests.`,
		);
	} catch (cause) {
		throw new Error(`${name} browser verification failed at ${checkpoint}.`, {
			cause,
		});
	} finally {
		await browser.close();
	}
}
