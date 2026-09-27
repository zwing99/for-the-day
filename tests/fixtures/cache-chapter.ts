import type {
	SemanticChapter,
	Translation,
} from "../../src/domain/semantic-chapter.js";
import { semanticFixture } from "./semantic-chapter.js";
export function cacheFixture(
	translation: Translation = "CSB",
	chapter = 23,
	count = 4,
	book: "PSA" | "PRO" = "PSA",
): SemanticChapter {
	const c = semanticFixture();
	Object.assign(c.identity, {
		translation,
		chapter,
		book,
		provider: translation === "ESV" ? "crossway" : "api-bible",
	});
	c.tracking = translation === "ESV" ? { kind: "none" } : c.tracking;
	c.introTitleNodeIds = [];
	c.verses = Array.from({ length: count }, (_, i) => ({
		key: `${book}.${chapter}.${i + 1}`,
		displayLabel: String(i + 1),
		providerIds: [
			translation === "ESV"
				? String((book === "PSA" ? 19 : 20) * 1000000 + chapter * 1000 + i + 1)
				: `${book}.${chapter}.${i + 1}`,
		],
		orgIds: [],
		sourceOrdinal: i,
		fragmentNodeIds: [`text-${i}`],
	}));
	c.nodes = c.verses.map((v, i) => ({
		id: `text-${i}`,
		kind: "text",
		text: `Invented sentence ${i}.`,
		verseKeys: [v.key],
		marks: [],
		source: { path: `${i}` },
	}));
	return c;
}
