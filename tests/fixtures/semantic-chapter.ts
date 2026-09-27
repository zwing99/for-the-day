import type {
	SemanticChapter,
	SemanticNode,
} from "../../src/domain/semantic-chapter.js";

const text = (
	id: string,
	value: string,
	verseKeys: string[] = [],
): Extract<SemanticNode, { kind: "text" }> => ({
	id,
	kind: "text",
	text: value,
	verseKeys,
	marks: [],
	source: { path: id },
});
const group = (
	id: string,
	role: Extract<SemanticNode, { kind: "group" }>["role"],
	children: SemanticNode[],
	indent?: number,
): SemanticNode => ({
	id,
	kind: "group",
	role,
	children,
	...(indent === undefined ? {} : { indent }),
	source: { path: id },
});
/** Invented prose only; identities deliberately include partial and merged spans. */
export function semanticFixture(): SemanticChapter {
	return {
		schemaVersion: 1,
		identity: {
			translation: "CSB",
			book: "PSA",
			chapter: 23,
			provider: "api-bible",
			providerBibleId: "test-edition",
			editionKey: "test-v1",
		},
		reference: "Test chapter",
		nodes: [
			group("title", "title", [text("title-text", "An invented title")]),
			group("heading", "heading", [text("heading-text", "First division")]),
			group("paragraph", "paragraph", [
				{
					id: "marker",
					kind: "verse-marker",
					label: "1a",
					verseKeys: ["a"],
					source: { path: "marker" },
				},
				text("a1", "  Amber boats ", ["a"]),
				group("inline", "inline", [
					{ ...text("a2", "SAIL.", ["a"]), marks: ["small-caps"] },
				]),
			]),
			group("poem", "poetry", [
				group("stanza", "stanza", [
					group(
						"line1",
						"line",
						[text("b1", "Blue kites\u00a0rise,", ["b"])],
						1,
					),
					{
						id: "break",
						kind: "break",
						role: "line",
						source: { path: "break" },
					},
					group("line2", "line", [text("b2", "\tand drift. ", ["b"])], 2),
				]),
			]),
			group("unknown", "unknown", [
				text("merged", "Copper wheels turn!", ["c", "d"]),
			]),
		],
		verses: [
			{
				key: "a",
				displayLabel: "1a",
				providerIds: ["PSA.23.1a"],
				orgIds: ["PSA.23.1a"],
				sourceOrdinal: 0,
				fragmentNodeIds: ["a1", "a2"],
			},
			{
				key: "b",
				displayLabel: "2",
				providerIds: ["PSA.23.2"],
				orgIds: ["PSA.23.2"],
				sourceOrdinal: 1,
				fragmentNodeIds: ["b1", "b2"],
			},
			{
				key: "c",
				displayLabel: "3-4",
				providerIds: ["PSA.23.3"],
				orgIds: ["PSA.23.3", "PSA.23.4"],
				sourceOrdinal: 2,
				fragmentNodeIds: ["merged"],
			},
			{
				key: "d",
				displayLabel: "4",
				providerIds: ["PSA.23.4"],
				orgIds: ["PSA.23.4"],
				sourceOrdinal: 3,
				fragmentNodeIds: ["merged"],
			},
		],
		introTitleNodeIds: ["title", "heading"],
		attribution: {
			notice: "Invented fixture notice",
			translationLabel: "Test CSB",
			requiredLinks: [{ label: "Test", href: "https://example.com/" }],
		},
		tracking: {
			kind: "api-bible-fums",
			version: 3,
			token: "invented-token",
			suppliedMetadata: { fumsToken: "invented-token", extra: [1, "retained"] },
		},
	};
}
