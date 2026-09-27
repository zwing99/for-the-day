/// <reference lib="dom" />
import { ok } from "node:assert";
import type { Page } from "playwright";

/** Geometry only: safe to record for invented fixtures and cached provider data. */
export async function readerGeometry(page: Page) {
	return page.evaluate(() => {
		const surface = document.querySelector<HTMLElement>(".reading-scroll")!;
		const surfaceBounds = surface.getBoundingClientRect();
		const pages = [
			...surface.querySelectorAll<HTMLElement>(
				".verse-card, .intro, :scope > .attribution",
			),
		].map((element) => {
			const css = getComputedStyle(element);
			const literature = element.querySelector<HTMLElement>(
				".card-literature, .intro-literature, .end-literature",
			)!;
			const bounds = element.getBoundingClientRect();
			const content = literature.getBoundingClientRect();
			return {
				kind: element.className,
				height: bounds.height,
				width: bounds.width,
				availableHeight:
					surface.clientHeight -
					parseFloat(css.paddingTop) -
					parseFloat(css.paddingBottom) -
					1,
				availableWidth:
					element.clientWidth -
					parseFloat(css.paddingLeft) -
					parseFloat(css.paddingRight),
				contentHeight: Math.max(content.height, literature.scrollHeight),
				contentWidth: Math.max(content.width, literature.scrollWidth),
				fontSize: parseFloat(css.fontSize),
				lineHeight: css.lineHeight,
				selectedSize: css.getPropertyValue("--reader-font-size").trim(),
				scale: Number(
					css.getPropertyValue("--page-font-scale") ||
						css.getPropertyValue("--presentation-scale") ||
						1,
				),
				padding: [
					css.paddingTop,
					css.paddingRight,
					css.paddingBottom,
					css.paddingLeft,
				],
				aligned: Math.abs(bounds.top - surfaceBounds.top) <= 2,
				whitespace: [...element.querySelectorAll("[data-semantic-text]")].map(
					(node) => getComputedStyle(node).whiteSpace,
				),
				indentation: [...element.querySelectorAll(".semantic-line")].map(
					(node) => getComputedStyle(node).paddingLeft,
				),
			};
		});
		return {
			surface: {
				height: surfaceBounds.height,
				width: surfaceBounds.width,
				top: surfaceBounds.top,
			},
			pages,
			active: surface.querySelector<HTMLElement>("[data-active-verse]")?.dataset
				.activeVerse,
		};
	});
}

export async function assertReaderGeometry(page: Page) {
	const geometry = await readerGeometry(page);
	ok(geometry.surface.height > 0, "Reading surface has available space");
	for (const card of geometry.pages) {
		ok(card.fontSize > 0 && card.scale > 0, "Page fitting keeps text visible");
		ok(
			Math.abs(card.height - geometry.surface.height) <= 1,
			"Pages consume the measured surface height",
		);
		ok(
			card.contentHeight <= card.availableHeight + 1,
			"Complete page content fits vertically",
		);
		ok(
			card.contentWidth <= card.availableWidth + 1,
			"Complete page content fits horizontally",
		);
	}
	ok(
		geometry.pages.some((card) => card.aligned),
		"A page snaps within two CSS pixels",
	);
	return geometry;
}

export async function settledReader(page: Page) {
	await page.locator(".verse-card").first().waitFor();
	await page.evaluate(() => document.fonts.ready);
	await page.waitForFunction(
		() =>
			!!document
				.querySelector<HTMLElement>(".reading-scroll")
				?.style.getPropertyValue("--reading-height"),
	);
	// Resize/font measurement is debounced 120ms, scroll settling is 180ms.
	await page.waitForTimeout(350);
}
