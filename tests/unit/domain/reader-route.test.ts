import { expect, it } from "vitest";
import {
	parseReaderRoute,
	readerPath,
	routeVerse,
} from "../../../src/domain/reader-route.js";
import { semanticFixture } from "../../fixtures/semantic-chapter.js";

const parse = (path: string) =>
	parseReaderRoute(new URL(path, "http://localhost"), "NLT", 7);
it("resolves root/day and round trips explicit partial/range/intro locations", () => {
	expect(parse("/")).toMatchObject({
		day: 7,
		book: "PSA",
		chapter: 7,
		translation: "NLT",
	});
	expect(parse("/31").chapter).toBe(119);
	for (const location of ["intro", "1a", "3-4", "0", "2b-3a"]) {
		const route = parse(`/7/psalm/67/${location}?translation=CSB`);
		expect(parse(readerPath(route))).toEqual(route);
	}
});
it("rejects malformed or outside-plan links without clamping", () => {
	for (const path of [
		"/0",
		"/32",
		"/07",
		"/7/",
		"/7/psalm",
		"/7/psalm/23/3",
		"/7/psalm/67/03",
		"/7/psalm/67/3xjunk",
		"/7/psalm/67/NaN",
		"/7/psalm/67/3?translation=KJV",
		"/7/psalm/67/3?translation=CSB&translation=ESV",
		"/7/psalm/067/3",
		"/7/psalm/67/%",
		"/7/psalm/67/3/extra",
	])
		expect(() => parse(path)).toThrow();
});
it("validates actual printed labels after fetching without equating card indices", () => {
	const chapter = semanticFixture();
	expect(
		routeVerse(chapter, parse("/23/psalm/23/1a?translation=CSB"))?.key,
	).toBe("a");
	expect(() =>
		routeVerse(chapter, parse("/23/psalm/23/1?translation=CSB")),
	).toThrow();
});
