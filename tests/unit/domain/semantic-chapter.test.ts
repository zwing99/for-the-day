import { describe, expect, it } from "vitest";
import {
	completeVerseUnits,
	orderedText,
	validateSemanticChapter,
} from "../../../src/domain/semantic-chapter.js";
import { semanticFixture } from "../../fixtures/semantic-chapter.js";

describe("semantic chapter contract", () => {
	it("round trips exact ordered text, literary structure, identities and tracking", () => {
		const chapter = semanticFixture();
		const wire: unknown = JSON.parse(JSON.stringify(chapter));
		validateSemanticChapter(wire);
		expect(wire).toEqual(chapter);
		expect(orderedText(wire.nodes)).toEqual([
			"An invented title",
			"First division",
			"  Amber boats ",
			"SAIL.",
			"Blue kites\u00a0rise,",
			"\tand drift. ",
			"Copper wheels turn!",
		]);
	});
	it("extracts complete split verses and indivisible merged spans without copying text", () => {
		const units = completeVerseUnits(semanticFixture());
		expect(units.map((unit) => unit.verseKeys)).toEqual([
			["a"],
			["b"],
			["c", "d"],
		]);
		expect(units.flatMap((unit) => unit.fragmentNodeIds)).toEqual([
			"a1",
			"a2",
			"b1",
			"b2",
			"merged",
		]);
		expect(units[1]?.literaryPaths).toEqual([
			{ nodeId: "b1", ancestors: ["poem", "stanza", "line1"] },
			{ nodeId: "b2", ancestors: ["poem", "stanza", "line2"] },
		]);
		expect(JSON.stringify(units)).not.toContain("Amber");
	});
	const invalid: Array<
		[string, (chapter: ReturnType<typeof semanticFixture>) => void]
	> = [
		[
			"duplicate node",
			(chapter) => {
				chapter.nodes.push(chapter.nodes[0]!);
			},
		],
		[
			"missing fragment",
			(chapter) => {
				chapter.verses[0]!.fragmentNodeIds = ["a1"];
			},
		],
		[
			"reversed fragments",
			(chapter) => {
				chapter.verses[0]!.fragmentNodeIds.reverse();
			},
		],
		[
			"unknown verse",
			(chapter) => {
				chapter.verses[0]!.key = "missing";
			},
		],
		[
			"duplicate ordinal",
			(chapter) => {
				chapter.verses[1]!.sourceOrdinal = 0;
			},
		],
		[
			"invalid intro",
			(chapter) => {
				chapter.introTitleNodeIds = ["a1"];
			},
		],
		[
			"unsafe link",
			(chapter) => {
				chapter.attribution.requiredLinks[0]!.href = "javascript:alert(1)";
			},
		],
		[
			"missing token",
			(chapter) => {
				if (chapter.tracking.kind === "api-bible-fums")
					chapter.tracking.token = "";
			},
		],
		[
			"invalid chapter",
			(chapter) => {
				chapter.identity.chapter = 151;
			},
		],
		[
			"provider mismatch",
			(chapter) => {
				chapter.identity.translation = "ESV";
			},
		],
	];
	it.each(invalid)(
		"rejects %s without repairing Scripture",
		(_name, mutate) => {
			const chapter = semanticFixture();
			mutate(chapter);
			expect(() => validateSemanticChapter(chapter)).toThrow(
				"Invalid semantic chapter.",
			);
		},
	);
	it("rejects malformed wire shapes with a stable safe error", () => {
		for (const value of [
			null,
			[],
			{},
			{ ...semanticFixture(), nodes: null },
			{ ...semanticFixture(), verses: [] },
		])
			expect(() => validateSemanticChapter(value)).toThrow(
				"Invalid semantic chapter.",
			);
	});
});
