import { expect, it } from "vitest";
import { passageLocation } from "../../../src/client/passage-location.js";
import {
	defaultPreferences,
	ReadingStorage,
} from "../../../src/client/reading-storage.js";
import type { ReaderRoute } from "../../../src/domain/reader-route.js";
import { semanticFixture } from "../../fixtures/semantic-chapter.js";

const route: ReaderRoute = {
	day: 23,
	book: "PSA",
	chapter: 23,
	translation: "CSB",
};
const chapter = semanticFixture();

it("uses explicit, compatible saved, then configured default locations", () => {
	const storage = new ReadingStorage();
	expect(
		passageLocation(route, chapter, defaultPreferences, storage).location,
	).toBe("intro");
	expect(
		passageLocation(
			route,
			chapter,
			{ ...defaultPreferences, intros: false },
			storage,
		).location,
	).toBe("1a");
	storage.savePosition({ ...route, location: "3-4", orgIds: ["PSA.23.3"] });
	expect(
		passageLocation(route, chapter, defaultPreferences, storage).location,
	).toBe("3-4");
	expect(
		passageLocation(
			{ ...route, location: "2" },
			chapter,
			defaultPreferences,
			storage,
		).location,
	).toBe("2");
	expect(
		passageLocation(
			{ ...route, translation: "NIV" },
			{ ...chapter, identity: { ...chapter.identity, translation: "NIV" } },
			defaultPreferences,
			storage,
		).location,
	).toBe("intro");
});
