import { strictEqual } from "node:assert";
import { chromium, webkit } from "playwright";
import { semanticFixture } from "../tests/fixtures/semantic-chapter.js";
import {
	assertReaderGeometry,
	assertShellGeometry,
	settledReader,
} from "./reader-geometry.js";

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
		const context = await browser.newContext({
			reducedMotion: "reduce",
			serviceWorkers: "block",
		});
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
			[402, 874],
			[430, 932],
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
				await assertShellGeometry(page);
				await page.setViewportSize({ width: width + 10, height: height + 10 });
				await page.waitForTimeout(400);
				strictEqual(
					await page
						.locator("[data-active-verse]")
						.getAttribute("data-active-verse"),
					"b",
				);
				await assertReaderGeometry(page);
				await assertShellGeometry(page);
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
		if (name === "Chromium") {
			checkpoint = "saved-page preview typography";
			await page.emulateMedia({ reducedMotion: "no-preference" });
			await page.setViewportSize({ width: 320, height: 568 });
			await page.goto(`${origin}/23/psalm/23/2?translation=WEBU`);
			await page.locator("[data-active-verse='PSA.23.2']").waitFor();
			await page.evaluate(() => {
				localStorage.setItem(
					"for-the-day:v1:position:23:PSA:53",
					JSON.stringify("/23/psalm/53/3?translation=WEBU"),
				);
				const main = document.querySelector("main.reading-scroll")!;
				const touch = (x: number) =>
					new Touch({ identifier: 1, target: main, clientX: x, clientY: 200 });
				main.dispatchEvent(
					new TouchEvent("touchstart", {
						bubbles: true,
						touches: [touch(300)],
						changedTouches: [touch(300)],
					}),
				);
				main.dispatchEvent(
					new TouchEvent("touchmove", {
						bubbles: true,
						touches: [touch(180)],
						changedTouches: [touch(180)],
					}),
				);
			});
			await page.waitForFunction(
				() =>
					document.querySelector<HTMLElement>(".passage-preview-content")?.style
						.visibility === "visible",
			);
			const preview = await page.evaluate(() => {
				const surface =
					document.querySelector<HTMLElement>(".passage-preview")!;
				const marker = [
					...surface.querySelectorAll<HTMLElement>("[data-location-key]"),
				].find((node) => node.dataset.locationKey === "PSA.53.3")!;
				const card = marker.closest<HTMLElement>(".verse-card")!;
				return {
					font: getComputedStyle(card).fontSize,
					readingHeight: surface.style.getPropertyValue("--reading-height"),
					fontStatus: document.fonts.status,
					text: [...card.querySelectorAll("[data-semantic-text]")]
						.map((node) => node.textContent)
						.join(""),
					width: card.clientWidth,
					active: surface
						.querySelector("[data-active-verse]")
						?.getAttribute("data-active-verse"),
				};
			});
			strictEqual(preview.active, "PSA.53.3");
			if (preview.width <= 0)
				throw new Error("Ready preview has no measured width.");
			const handoffFrames = await page.evaluate(async () => {
				const main = document.querySelector(
					"main.reading-scroll:not(.passage-preview)",
				)!;
				const touch = new Touch({
					identifier: 1,
					target: main,
					clientX: 180,
					clientY: 200,
				});
				main.dispatchEvent(
					new TouchEvent("touchend", {
						bubbles: true,
						touches: [],
						changedTouches: [touch],
					}),
				);
				const frames: { handoff: boolean; visibleVerse: string | null }[] = [];
				for (let index = 0; index < 90; index++) {
					await new Promise(requestAnimationFrame);
					const stage = document.querySelector<HTMLElement>(".passage-stage")!;
					const handoff = stage.dataset.handoff === "ready";
					const surface = stage.querySelector<HTMLElement>(
						handoff
							? ".passage-preview"
							: "main.reading-scroll:not(.passage-preview)",
					);
					frames.push({
						handoff,
						visibleVerse:
							surface
								?.querySelector("[data-active-verse]")
								?.getAttribute("data-active-verse") ?? null,
					});
					if (frames.some((frame) => frame.handoff) && !handoff) break;
				}
				return frames;
			});
			if (!handoffFrames.some((frame) => frame.handoff))
				throw new Error("Committed swipe skipped its prepared-page handoff.");
			if (
				handoffFrames.some(
					(frame) => frame.handoff && frame.visibleVerse !== "PSA.53.3",
				)
			)
				throw new Error(
					`Prepared page changed during handoff: ${JSON.stringify(handoffFrames)}`,
				);
			await page.waitForURL("**/23/psalm/53/**");
			await settledReader(page);
			const committed = await page.evaluate(() => {
				const surface = document.querySelector<HTMLElement>(
					"main.reading-scroll:not(.passage-preview)",
				)!;
				const marker = [
					...surface.querySelectorAll<HTMLElement>("[data-location-key]"),
				].find((node) => node.dataset.locationKey === "PSA.53.3")!;
				const card = marker.closest<HTMLElement>(".verse-card")!;
				return {
					font: getComputedStyle(card).fontSize,
					readingHeight: surface.style.getPropertyValue("--reading-height"),
					fontStatus: document.fonts.status,
					text: [...card.querySelectorAll("[data-semantic-text]")]
						.map((node) => node.textContent)
						.join(""),
					width: card.clientWidth,
				};
			});
			strictEqual(
				preview.font,
				committed.font,
				JSON.stringify({ preview, committed }),
			);
			strictEqual(preview.text, committed.text);
			strictEqual(preview.width, committed.width);
			await page.emulateMedia({ reducedMotion: "reduce" });
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
			`${name}: 28 responsive route/menu cases and failure recovery passed; no provider requests.`,
		);
	} catch (cause) {
		throw new Error(`${name} browser verification failed at ${checkpoint}.`, {
			cause,
		});
	} finally {
		await browser.close();
	}
}
