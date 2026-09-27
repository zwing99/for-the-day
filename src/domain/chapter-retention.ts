import type { SemanticChapter, Translation } from "./semantic-chapter.js";

export function chapterLifetime(translation: Translation): number {
	return translation === "ESV" ? 3600000 : 86400000;
}

/** Canonical coverage deduplicates partial identities and expands merged spans. */
export function canonicalVerseCount(chapter: SemanticChapter): number {
	const covered = new Set<number>();
	const prefix = `${chapter.identity.book}.${chapter.identity.chapter}.`;
	for (const verse of chapter.verses) {
		const ids = verse.orgIds.length ? verse.orgIds : verse.providerIds;
		if (!ids.length) throw new Error("Missing canonical verse identity.");
		for (const id of ids) {
			if (chapter.identity.provider === "crossway" && /^\d{8}$/.test(id)) {
				const base =
					(chapter.identity.book === "PSA" ? 19 : 20) * 1000000 +
					chapter.identity.chapter * 1000;
				const verse = Number(id) - base;
				if (verse < 1 || verse >= 1000)
					throw new Error("Invalid canonical verse identity.");
				covered.add(verse);
				continue;
			}
			if (!id.startsWith(prefix))
				throw new Error("Invalid canonical verse identity.");
			const match = /^(\d+)[a-z]?(?:-(\d+)[a-z]?)?$/.exec(
				id.slice(prefix.length),
			);
			if (!match) throw new Error("Invalid canonical verse span.");
			const first = Number(match[1]);
			const last = Number(match[2] ?? match[1]);
			if (first < 1 || last < first || last > 1000)
				throw new Error("Invalid canonical verse span.");
			for (let n = first; n <= last; n++) covered.add(n);
		}
	}
	return covered.size;
}

export function retentionFits(
	chapters: SemanticChapter[],
	translation: Translation,
): boolean {
	const counts = chapters
		.filter((c) => c.identity.translation === translation)
		.map((c) => ({ book: c.identity.book, count: canonicalVerseCount(c) }));
	return (
		counts.reduce((sum, c) => sum + c.count, 0) <=
			(translation === "ESV" ? 300 : 400) &&
		(translation !== "ESV" ||
			["PSA", "PRO"].every(
				(book) =>
					counts
						.filter((c) => c.book === book)
						.reduce((sum, c) => sum + c.count, 0) <= 200,
			))
	);
}
