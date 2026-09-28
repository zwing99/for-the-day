import { routeVerse, type ReaderRoute } from "../domain/reader-route.js";
import type { SemanticChapter } from "../domain/semantic-chapter.js";
import type { Preferences, ReadingStorage } from "./reading-storage.js";

/** Resolve a logical destination without recording or activating reading progress. */
export function passageLocation(
	route: ReaderRoute,
	chapter: SemanticChapter,
	preferences: Preferences,
	storage: ReadingStorage,
): ReaderRoute {
	const saved = storage.position(route);
	let location = route.location
		? route
		: saved?.translation === route.translation
			? saved
			: {
					...route,
					location: preferences.intros
						? "intro"
						: chapter.verses[0]?.displayLabel,
				};
	if (location.location === "intro" && !preferences.intros)
		location = { ...location, location: chapter.verses[0]?.displayLabel };
	routeVerse(chapter, location);
	return location;
}
