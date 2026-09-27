import { currentLocalDay, type Passage, readingPlan } from "./reading-plan.js";
import type { SemanticChapter, Translation } from "./semantic-chapter.js";

export interface ReaderRoute extends Passage {
	day: number;
	translation: Translation;
	location?: string;
	orgIds?: string[];
}
export class RouteError extends Error {}
const translations = ["CSB", "NIV", "NLT", "ESV"];
const label = /^(?:0|[1-9]\d*)(?:[a-z])?(?:-(?:0|[1-9]\d*)(?:[a-z])?)?$/;

export function parseReaderRoute(
	url: URL,
	preferred: Translation = "CSB",
	today = currentLocalDay(),
): ReaderRoute {
	const raw = url.pathname === "/" ? [] : url.pathname.slice(1).split("/");
	if (![0, 1, 3, 4].includes(raw.length))
		throw new RouteError("This reading link is invalid.");
	const day = raw.length
		? /^(?:[1-9]|[12]\d|3[01])$/.test(raw[0]!)
			? Number(raw[0])
			: NaN
		: today;
	if (!Number.isInteger(day) || day < 1 || day > 31)
		throw new RouteError("Choose a reading day from 1 through 31.");
	const translationValues = url.searchParams.getAll("translation");
	const translation = translationValues[0] ?? preferred;
	if (translationValues.length > 1 || !translations.includes(translation))
		throw new RouteError("This translation is unsupported.");
	const plan = readingPlan(day);
	let passage = plan[0]!;
	if (raw.length >= 3) {
		const book =
			raw[1] === "psalm" ? "PSA" : raw[1] === "proverbs" ? "PRO" : undefined;
		if (!book || !/^[1-9]\d*$/.test(raw[2]!))
			throw new RouteError("This passage is invalid.");
		const chapter = Number(raw[2]);
		if (!plan.some((p) => p.book === book && p.chapter === chapter))
			throw new RouteError(
				"This passage is outside the selected day's reading plan.",
			);
		passage = { book, chapter };
	}
	let location: string | undefined;
	if (raw.length === 4) {
		try {
			location = decodeURIComponent(raw[3]!);
		} catch {
			throw new RouteError("This verse link is invalid.");
		}
		if (location !== "intro" && !label.test(location))
			throw new RouteError("This verse link is invalid.");
	}
	const orgIds = url.searchParams.getAll("org");
	if (
		orgIds.some(
			(id) => !/^(PSA|PRO)\.\d+\.\d+[a-z]?(?:-\d+[a-z]?)?$/.test(id),
		) ||
		orgIds.length > 20
	)
		throw new RouteError("This verse identity is invalid.");
	return {
		...passage,
		day,
		translation: translation as Translation,
		...(location ? { location } : {}),
		...(orgIds.length ? { orgIds } : {}),
	};
}

export function readerPath(route: ReaderRoute): string {
	const path = `/${route.day}/${route.book === "PSA" ? "psalm" : "proverbs"}/${route.chapter}${route.location ? `/${encodeURIComponent(route.location)}` : ""}`;
	const query = new URLSearchParams({ translation: route.translation });
	for (const id of route.orgIds ?? []) query.append("org", id);
	const result = `${path}?${query}`;
	parseReaderRoute(new URL(result, "http://localhost"));
	return result;
}

export function routeVerse(chapter: SemanticChapter, route: ReaderRoute) {
	if (!route.location || route.location === "intro") return undefined;
	const verse = chapter.verses.find(
		(v) =>
			v.displayLabel === route.location &&
			(!route.orgIds?.length ||
				route.orgIds.every((id) => v.orgIds.includes(id))),
	);
	if (!verse)
		throw new RouteError(
			"This verse is unavailable in the selected chapter. Open the passage to continue.",
		);
	return verse;
}
