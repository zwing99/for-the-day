import { expect, it } from "vitest";
import { ReadingStorage } from "../../../src/client/reading-storage.js";
import { parseReaderRoute } from "../../../src/domain/reader-route.js";

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
