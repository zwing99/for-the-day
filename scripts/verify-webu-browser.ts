import { ok, strictEqual } from "node:assert";
import { chromium, webkit } from "playwright";
import { semanticFixture } from "../tests/fixtures/semantic-chapter.js";
import { assertReaderGeometry, settledReader } from "./reader-geometry.js";

const origin = `http://${process.env.WEB_HOST ?? "127.0.0.1"}:${process.env.WEB_PORT ?? 5173}`;
for (const [name, engine] of [
	["Chromium", chromium],
	["WebKit", webkit],
] as const) {
	const browser = await engine.launch();
	try {
		const context = await browser.newContext({
			hasTouch: true,
			reducedMotion: "reduce",
			serviceWorkers: "block",
		});
		let fail = false;
		let delay = false;
		let licensed = false;
		let apiRequests = 0;
		let externalRequests = 0;
		await context.route("**/*", async (route) => {
			const url = new URL(route.request().url());
			if (url.origin !== origin) {
				externalRequests++;
				return route.abort();
			}
			if (url.pathname.startsWith("/api/")) {
				apiRequests++;
				if (!licensed) return route.abort();
				if (url.pathname === "/api/content-configuration")
					return route.fulfill({ json: { revision: "invented-browser-test" } });
				const chapter = semanticFixture();
				chapter.tracking = { kind: "none" };
				return route.fulfill({ json: { chapter } });
			}
			if (
				url.pathname.startsWith("/scripture/") &&
				url.pathname.endsWith("/23.json")
			) {
				if (delay) await new Promise((resolve) => setTimeout(resolve, 500));
				if (fail) return route.fulfill({ status: 404, body: "" });
			}
			return route.continue();
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
			for (const [day, book, chapter, verse] of [
				[23, "psalm", 23, 4],
				[21, "psalm", 141, 5],
				[30, "proverbs", 30, 4],
				[29, "psalm", 119, 1],
				[30, "psalm", 60, 1],
				[1, "psalm", 1, 1],
			] as const) {
				await page.goto(
					`${origin}/${day}/${book}/${chapter}/${verse}?translation=WEBU`,
				);
				await settledReader(page);
				await assertReaderGeometry(page);
				strictEqual(
					await page.evaluate(async () => {
						const manifest = await (
							await fetch("/scripture/webu/manifest.json")
						).json();
						const parts = location.pathname.split("/");
						const book = parts[2] === "psalm" ? "PSA" : "PRO";
						const entry = manifest.chapters.find(
							(entry: { book: string; chapter: number }) =>
								entry.book === book && entry.chapter === Number(parts[3]),
						);
						const chapter = await (await fetch(entry.path)).json();
						function text(
							nodes: Array<{
								kind: string;
								text?: string;
								children?: unknown[];
							}>,
						): string[] {
							return nodes.flatMap((node) =>
								node.kind === "text"
									? [node.text!]
									: node.kind === "group"
										? text(node.children as typeof nodes)
										: [],
							);
						}
						const rendered = [
							...document.querySelectorAll(".verse-card [data-semantic-text]"),
						].map((node) => node.textContent);
						return (
							JSON.stringify(rendered) === JSON.stringify(text(chapter.nodes))
						);
					}),
					true,
					"Reader preserves exact ordered WEBU text",
				);
				strictEqual(
					await page.locator(".translation-label").textContent(),
					"WEBU",
				);
				ok((await page.locator(".semantic-line").count()) > 0);
				await page.getByRole("button", { name: "Open reader menu" }).click();
				await page.getByRole("dialog").waitFor();
				strictEqual(
					await page
						.getByRole("combobox", { name: "Translation" })
						.inputValue(),
					"WEBU",
				);
				await page.keyboard.press("Escape");
				strictEqual(
					await page.evaluate(() =>
						document.activeElement?.getAttribute("aria-label"),
					),
					"Open reader menu",
				);
			}
			console.log(
				`${name} ${width}×${height}: actual WEBU routes, poetry, long/short chapters and geometry passed`,
			);
		}
		await page.goto(`${origin}/23/psalm/23/4?translation=WEBU`);
		await settledReader(page);
		const main = page.getByRole("main", { name: "Scripture reader" });
		await main.focus();
		const beforeScroll = await main.evaluate((element) => element.scrollTop);
		await page.keyboard.press("ArrowDown");
		await page.waitForTimeout(500);
		await main.hover();
		await page.mouse.wheel(0, 500);
		await page.waitForTimeout(500);
		ok(
			(await main.evaluate((element) => element.scrollTop)) > beforeScroll,
			"Native vertical scrolling advances reading",
		);
		await page.goto(`${origin}/23/psalm/23/4?translation=WEBU`);
		await settledReader(page);
		// Exercise the reader's touch-event boundary in both desktop engines.
		await main.evaluate((element) => {
			function dispatch(
				type: string,
				touches: Array<{ clientX: number; clientY: number }>,
				changedTouches = touches,
			) {
				const event = new Event(type, { bubbles: true });
				Object.defineProperties(event, {
					touches: { value: touches },
					changedTouches: { value: changedTouches },
				});
				element.dispatchEvent(event);
			}
			dispatch("touchstart", [{ clientX: 250, clientY: 250 }]);
			dispatch("touchmove", [{ clientX: 70, clientY: 253 }]);
			dispatch("touchend", [], [{ clientX: 70, clientY: 253 }]);
		});
		await page.waitForTimeout(500);
		await page.waitForURL((url) => url.pathname.startsWith("/23/psalm/53"));
		ok(page.url().includes("translation=WEBU"));
		await page.goto(`${origin}/23/psalm/23/4?translation=WEBU`);
		await settledReader(page);
		await page.reload();
		await settledReader(page);
		ok(page.url().includes("/23/psalm/23/4?translation=WEBU"));
		strictEqual(apiRequests, 0);
		strictEqual(externalRequests, 0);
		fail = true;
		delay = true;
		await page.goto(`${origin}/23/psalm/23/4?translation=WEBU`);
		await page.getByText("Loading Scripture…", { exact: true }).waitFor();
		await page.getByRole("alert").waitFor();
		fail = false;
		delay = false;
		await page.getByRole("button", { name: "Try again" }).click();
		await settledReader(page);
		licensed = true;
		await page.getByRole("button", { name: "Open reader menu" }).click();
		await page
			.getByRole("combobox", { name: "Translation" })
			.selectOption("CSB");
		await page.waitForFunction(
			() => new URL(location.href).searchParams.get("translation") === "CSB",
		);
		await page.getByRole("button", { name: "Open reader menu" }).click();
		await page
			.getByRole("combobox", { name: "Translation" })
			.selectOption("WEBU");
		await page.waitForFunction(
			() => new URL(location.href).searchParams.get("translation") === "WEBU",
		);
		await page
			.getByText("Approximate verse match.", { exact: false })
			.waitFor();
		await settledReader(page);
		strictEqual(externalRequests, 0);

		licensed = false;
		await page.goto(`${origin}/30/psalm/60/1?translation=CSB`);
		await page.getByRole("alert").waitFor();
		const beforeWebu = apiRequests;
		await page.getByRole("button", { name: "Open reader menu" }).click();
		await page
			.getByRole("combobox", { name: "Translation" })
			.selectOption("WEBU");
		await page.waitForFunction(
			() => new URL(location.href).searchParams.get("translation") === "WEBU",
		);
		await settledReader(page);
		await assertReaderGeometry(page);
		strictEqual(await page.getByRole("alert").count(), 0);
		strictEqual(apiRequests, beforeWebu, "WEBU recovery makes no API requests");

		// A settled measured page must retain the addressed verse while typography,
		// labels, font readiness, zoom-like root size and viewport geometry change.
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto(`${origin}/23/psalm/23/4?translation=WEBU`);
		await settledReader(page);
		await page.getByRole("button", { name: "Open reader menu" }).click();
		await page
			.getByRole("combobox", { name: "Density" })
			.selectOption("Balanced");
		await page
			.getByRole("combobox", { name: "Font size" })
			.selectOption("larger");
		await page.getByRole("checkbox", { name: "Verse numbers" }).uncheck();
		await page.keyboard.press("Escape");
		await page.evaluate(() => {
			document.fonts.dispatchEvent(new Event("loadingdone"));
			document.documentElement.style.fontSize = "20px";
			window.dispatchEvent(new Event("resize"));
		});
		await page.setViewportSize({ width: 400, height: 850 });
		await settledReader(page);
		await assertReaderGeometry(page);
		strictEqual(
			await page
				.locator("[data-active-verse]")
				.getAttribute("data-active-verse"),
			"PSA.23.4",
		);
		strictEqual(
			await page.evaluate(() => {
				const prefs = JSON.parse(
					localStorage.getItem("for-the-day:v1:preferences") ?? "{}",
				);
				return (
					prefs.density === "Balanced" &&
					prefs.fontSize === "larger" &&
					prefs.verseLabels === false
				);
			}),
			true,
		);
		strictEqual(errors.length, 0);
		console.log(
			`${name}: WEBU reload, keyboard/touch, loading, retry and licensed translation return passed; zero external Scripture requests`,
		);
	} finally {
		await browser.close();
	}
}
