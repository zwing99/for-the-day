import { expect, it, vi } from "vitest";
import {
	localCalendarKey,
	ReadingStorage,
} from "../../../src/client/reading-storage.js";
import { parseReaderRoute } from "../../../src/domain/reader-route.js";
import { readingPlan } from "../../../src/domain/reading-plan.js";

const route = (chapter: number, location: string) =>
	parseReaderRoute(
		new URL(
			`/7/psalm/${chapter}/${location}?translation=CSB`,
			"http://localhost",
		),
	);
it("retains independent positions and active passage in memory when storage fails", () => {
	const store = new ReadingStorage({
		getItem() {
			throw Error();
		},
		setItem() {
			throw Error();
		},
	});
	for (const [chapter, location] of [
		[7, "2"],
		[37, "3"],
		[67, "4"],
	] as const)
		store.savePosition(route(chapter, location));
	expect(store.position(route(7, "intro"))?.location).toBe("2");
	expect(store.position(route(37, "intro"))?.location).toBe("3");
	expect(store.position(route(67, "intro"))?.location).toBe("4");
	expect(store.activePassage(7)?.chapter).toBe(67);
	store.setPreferences({
		...store.preferences(),
		appearance: "dark",
		fontSize: "larger",
		intros: false,
		verseLabels: false,
	});
	expect(store.preferences()).toMatchObject({
		appearance: "dark",
		fontSize: "larger",
		intros: false,
		verseLabels: false,
	});
});
it("recovers valid preferences from corrupt fields and contains malformed JSON", () => {
	const store = new ReadingStorage({
		getItem: () =>
			JSON.stringify({
				translation: "NLT",
				density: "Compact",
				appearance: "invalid",
				fontSize: 123,
				intros: false,
			}),
		setItem() {},
	});
	expect(store.preferences()).toMatchObject({
		translation: "NLT",
		density: "Compact",
		appearance: "system",
		fontSize: "normal",
		intros: false,
	});
	expect(
		new ReadingStorage({ getItem: () => "{", setItem() {} }).preferences()
			.translation,
	).toBe("CSB");
});
it("persists only whitelisted references and preferences across repository instances", () => {
	const records = new Map<string, string>();
	const port = {
		getItem: (key: string) => records.get(key) ?? null,
		setItem: (key: string, value: string) => {
			records.set(key, value);
		},
	};
	const store = new ReadingStorage(port);
	store.savePosition({
		...route(7, "2"),
		...{ chapterText: "must not persist" },
	});
	store.setPreferences({
		...store.preferences(),
		translation: "ESV",
		density: "Spacious",
	});
	const reloaded = new ReadingStorage(port);
	expect(reloaded.position(route(7, "intro"))?.location).toBe("2");
	expect(reloaded.preferences()).toMatchObject({
		translation: "ESV",
		density: "Spacious",
	});
	expect([...records.values()].join()).not.toContain("must not persist");
});

it("restores WEBU preferences and shared verse routes across reloads while keeping CSB defaults", () => {
	const records = new Map<string, string>();
	const port = {
		getItem: (key: string) => records.get(key) ?? null,
		setItem: (key: string, value: string) => {
			records.set(key, value);
		},
	};
	const store = new ReadingStorage(port);
	expect(store.preferences().translation).toBe("CSB");
	store.setPreferences({ ...store.preferences(), translation: "WEBU" });
	const shared = parseReaderRoute(
		new URL("http://localhost/23/psalm/23/4?translation=WEBU"),
	);
	store.savePosition(shared);
	const reloaded = new ReadingStorage(port);
	expect(reloaded.preferences().translation).toBe("WEBU");
	expect(reloaded.position(shared)).toEqual(shared);
});

it("uses device-local calendar keys and isolates the same plan day across months", () => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date(2026, 9, 7, 12));
	const records = new Map<string, string>();
	const port = {
		getItem: (key: string) => records.get(key) ?? null,
		setItem: (key: string, value: string) => {
			records.set(key, value);
		},
	};
	const september = new ReadingStorage(port);
	september.saveDatePosition("2026-09-07", route(37, "3"));
	expect(
		new ReadingStorage(port).datePosition("2026-09-07", route(37, "intro"))
			?.location,
	).toBe("3");
	expect(
		new ReadingStorage(port).dateActivePassage("2026-09-07")?.chapter,
	).toBe(37);
	expect(
		new ReadingStorage(port).datePosition("2026-10-07", route(37, "intro")),
	).toBeUndefined();
	expect(
		new ReadingStorage(port).dateActivePassage("2026-10-07"),
	).toBeUndefined();
	expect(september.position(route(37, "intro"))?.location).toBeUndefined();
	expect(localCalendarKey(new Date(2026, 8, 7, 23, 30))).toBe("2026-09-07");
	vi.useRealTimers();
});

it("rejects malformed dates and routes, and keeps date progress in memory when storage fails", () => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date(2026, 9, 7, 12));
	const store = new ReadingStorage({
		getItem: () => "{",
		setItem() {
			throw Error();
		},
	});
	expect(store.lastFollowingDate()).toBeUndefined();
	store.saveDatePosition("2026-02-31", route(7, "2"));
	expect(store.dateActivePassage("2026-02-31")).toBeUndefined();
	store.saveDatePosition("2026-10-07", route(7, "2"));
	expect(store.datePosition("2026-10-07", route(7, "intro"))?.location).toBe(
		"2",
	);
	expect(store.lastFollowingDate()).toBe("2026-10-07");
	vi.useRealTimers();
});

it("bounds date-scoped storage to 90 dates", () => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date(2025, 3, 4, 12));
	const records = new Map<string, string>();
	const store = new ReadingStorage({
		getItem: (key) => records.get(key) ?? null,
		setItem: (key, value) => {
			records.set(key, value);
		},
	});
	for (let offset = 0; offset < 94; offset++) {
		const date = new Date(2025, 0, 1 + offset);
		const key = localCalendarKey(date);
		const day = date.getDate();
		store.saveDatePosition(key, {
			day,
			...readingPlan(day)[0]!,
			translation: "CSB",
			location: "2",
		});
	}
	const progress = JSON.parse(records.get("for-the-day:v1:date-progress")!);
	expect(Object.keys(progress)).toHaveLength(90);
	expect(progress["2025-01-01"]).toBeUndefined();
	expect(progress["2025-04-04"]).toBeDefined();
	vi.useRealTimers();
});
