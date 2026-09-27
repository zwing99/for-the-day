import { describe, expect, it } from "vitest";
import {
	currentLocalDay,
	eligibleReadingDay,
	esvCacheEligible,
	readingPlan,
} from "../../../src/domain/reading-plan.js";

describe("reading plans", () => {
	it.each(Array.from({ length: 30 }, (_, i) => i + 1))(
		"orders every passage for day %i",
		(day) => {
			expect(readingPlan(day)).toEqual(
				[0, 30, 60, 90, 120]
					.map((offset) => ({ book: "PSA", chapter: day + offset }))
					.concat([{ book: "PRO", chapter: day }]),
			);
		},
	);
	it("provides the exact day 7 and exceptional day 31 sequences", () => {
		expect(readingPlan(7).map((p) => `${p.book}.${p.chapter}`)).toEqual([
			"PSA.7",
			"PSA.37",
			"PSA.67",
			"PSA.97",
			"PSA.127",
			"PRO.7",
		]);
		expect(readingPlan(31)).toEqual([
			{ book: "PSA", chapter: 119 },
			{ book: "PRO", chapter: 31 },
		]);
	});
	it.each([0, -1, 32, 1.5, NaN, Infinity])("rejects invalid day %s", (day) =>
		expect(() => readingPlan(day)).toThrow(RangeError),
	);
});

describe("fixed 31-position ESV window", () => {
	it("checks every pair against the eleven circular neighbors", () => {
		for (let today = 1; today <= 31; today++) {
			const neighbors = new Set(
				Array.from(
					{ length: 11 },
					(_, offset) => ((today - 1 + offset - 5 + 31) % 31) + 1,
				),
			);
			for (let selected = 1; selected <= 31; selected++)
				expect(eligibleReadingDay(selected, today)).toBe(
					neighbors.has(selected),
				);
		}
	});
	it("includes both five-position boundaries and wraps day 30", () => {
		expect(
			Array.from({ length: 31 }, (_, i) => i + 1).filter((day) =>
				eligibleReadingDay(day, 30),
			),
		).toEqual([1, 2, 3, 4, 25, 26, 27, 28, 29, 30, 31]);
		expect(eligibleReadingDay(6, 1)).toBe(true);
		expect(eligibleReadingDay(7, 1)).toBe(false);
		expect(eligibleReadingDay(5, 31)).toBe(true);
		expect(eligibleReadingDay(6, 31)).toBe(false);
	});
	it("uses injected local calendar context rather than UTC or month length", () => {
		const clock = () => new Date("2026-02-08T01:00:00Z");
		expect(currentLocalDay(clock, "America/Chicago")).toBe(7);
		expect(currentLocalDay(clock, "UTC")).toBe(8);
		expect(
			esvCacheEligible(
				{ book: "PSA", chapter: 119 },
				31,
				() => new Date("2026-02-01T12:00:00Z"),
				"UTC",
			),
		).toBe(true);
	});
	it("requires membership even inside the window and handles Psalm 119 twice", () => {
		const clock = () => new Date("2026-09-30T12:00:00Z");
		expect(
			esvCacheEligible({ book: "PSA", chapter: 23 }, 30, clock, "UTC"),
		).toBe(false);
		expect(
			esvCacheEligible({ book: "PSA", chapter: 119 }, 29, clock, "UTC"),
		).toBe(true);
		expect(
			esvCacheEligible({ book: "PSA", chapter: 119 }, 31, clock, "UTC"),
		).toBe(true);
		expect(
			esvCacheEligible(
				{ book: "PSA", chapter: 119 },
				29,
				() => new Date("2026-09-15T12:00:00Z"),
				"UTC",
			),
		).toBe(false);
	});
	it("rejects invalid days, zones and clocks", () => {
		expect(() => eligibleReadingDay(0, 1)).toThrow();
		expect(() => eligibleReadingDay(1, 32)).toThrow();
		expect(() => currentLocalDay(() => new Date(NaN))).toThrow();
		expect(() => currentLocalDay(() => new Date(), "not/a-zone")).toThrow();
	});
});
