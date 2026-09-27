import type { SemanticChapter, VerseIdentity } from "./semantic-chapter.js";

type Span = { prefix: string; start: number; end: number };
function span(id: string): Span | undefined {
	const match = /^(PSA|PRO)\.(\d+)\.(\d+)([a-z])?(?:-(\d+)([a-z])?)?$/.exec(id);
	if (!match) return;
	const point = (n: string, suffix?: string) =>
		Number(n) * 100 + (suffix ? suffix.charCodeAt(0) - 96 : 0);
	return {
		prefix: `${match[1]}.${match[2]}`,
		start: point(match[3]!, match[4]),
		end:
			point(match[5] ?? match[3]!, match[6] ?? match[4]) +
			(match[6] || (!match[5] && match[4]) ? 0 : 99),
	};
}
// Only correspondences inspected in the saved configured NIV/NLT editions.
// These belong to the mapping boundary, never to Crossway's supplied orgIds.
const editions = { NIV: "78a9f6124f344018-01", NLT: "d6e14a625393b4da-01" };
const bridges = [
	["19023001", "PSA.23.1"],
	["19060001", "PSA.60.3"],
	["19119001", "PSA.119.1"],
	["20030001", "PRO.30.1"],
] as const;
function identities(
	chapter: SemanticChapter,
	verse: VerseIdentity,
	other: SemanticChapter,
): string[] {
	if (chapter.identity.provider !== "crossway") return verse.orgIds;
	const edition = editions[other.identity.translation as keyof typeof editions];
	if (!edition || other.identity.providerBibleId !== edition) return [];
	return bridges
		.filter(([anchor]) => verse.providerIds.includes(anchor))
		.map(([, id]) => id);
}
export interface TranslationLocation {
	verse: VerseIdentity;
	approximate: boolean;
}
/** Provider labels never prove equivalence. Only supplied or verified identity does. */
export function mapTranslationLocation(
	source: SemanticChapter,
	verse: VerseIdentity,
	target: SemanticChapter,
): TranslationLocation {
	if (
		source.identity.book !== target.identity.book ||
		source.identity.chapter !== target.identity.chapter
	)
		throw new Error("Translation mapping requires the same passage.");
	const from = identities(source, verse, target)
		.map(span)
		.filter((s): s is Span => !!s);
	const candidates = target.verses.map((v) => ({
		verse: v,
		spans: identities(target, v, source)
			.map(span)
			.filter((s): s is Span => !!s),
	}));
	const exact = candidates.find((c) =>
		c.spans.some((b) =>
			from.some(
				(a) => a.prefix === b.prefix && a.start <= b.end && b.start <= a.end,
			),
		),
	);
	if (exact) return { verse: exact.verse, approximate: false };
	let nearest: { verse: VerseIdentity; distance: number } | undefined;
	for (const c of candidates)
		for (const a of from)
			for (const b of c.spans) {
				if (a.prefix !== b.prefix) continue;
				const distance = Math.min(
					Math.abs(a.start - b.end),
					Math.abs(b.start - a.end),
				);
				if (!nearest || distance < nearest.distance)
					nearest = { verse: c.verse, distance };
			}
	if (nearest) return { verse: nearest.verse, approximate: true };
	const same = target.verses.find((v) => v.displayLabel === verse.displayLabel);
	if (same) return { verse: same, approximate: true };
	const numeric = Number.parseInt(verse.displayLabel, 10);
	const ordered = target.verses.reduce((best, v) => {
		const distance = (item: VerseIdentity) =>
			Number.isFinite(numeric) && /^\d/.test(item.displayLabel)
				? Math.abs(Number.parseInt(item.displayLabel, 10) - numeric)
				: Math.abs(item.sourceOrdinal - verse.sourceOrdinal);
		return distance(v) < distance(best) ? v : best;
	}, target.verses[0]!);
	return { verse: ordered, approximate: true };
}
