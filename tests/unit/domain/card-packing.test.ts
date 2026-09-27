import { expect, it } from "vitest";
import {
	type Density,
	layoutBudget,
	packChapter,
	reduceOverflowingGroups,
	splitPackedCard,
} from "../../../src/domain/card-packing.js";
import {
	orderedText,
	type SemanticChapter,
	type SemanticNode,
} from "../../../src/domain/semantic-chapter.js";
import { semanticFixture } from "../../fixtures/semantic-chapter.js";

function sequence(count = 30): SemanticChapter {
	const chapter = semanticFixture();
	chapter.nodes = [];
	chapter.verses = [];
	for (let i = 0; i < count; i++) {
		const key = `v${i}`;
		chapter.nodes.push({
			id: `p${i}`,
			kind: "group",
			role: "paragraph",
			source: { path: `p${i}` },
			children: [
				{
					id: key,
					kind: "text",
					text: "Invented brief natural paragraph.",
					verseKeys: [key],
					marks: [],
					source: { path: key },
				},
			],
		});
		chapter.verses.push({
			key,
			displayLabel: String(i + 1),
			providerIds: [],
			orgIds: [],
			sourceOrdinal: i,
			fragmentNodeIds: [key],
		});
	}
	chapter.introTitleNodeIds = [];
	return chapter;
}
function leafText(chapter: SemanticChapter, ids: string[]) {
	const text = new Map<string, string>();
	function walk(nodes: SemanticNode[]) {
		for (const n of nodes) {
			if (n.kind === "text") text.set(n.id, n.text);
			if (n.kind === "group") walk(n.children);
		}
	}
	walk(chapter.nodes);
	return ids.filter((id) => text.has(id)).map((id) => text.get(id));
}
it("is deterministic and partitions exact ordered text at every density and budget", () => {
	for (const chapter of [semanticFixture(), sequence()])
		for (const density of ["Spacious", "Balanced", "Compact"] as Density[])
			for (const budget of [
				{ columns: 20, lines: 8 },
				{ columns: 60, lines: 28 },
			]) {
				const cards = packChapter(chapter, density, budget);
				expect(packChapter(chapter, density, budget)).toEqual(cards);
				expect(
					leafText(
						chapter,
						cards.flatMap((c) => c.nodeIds),
					),
				).toEqual(orderedText(chapter.nodes));
				expect(new Set(cards.flatMap((c) => c.nodeIds)).size).toBe(
					cards.flatMap((c) => c.nodeIds).length,
				);
			}
});
it("adapts natural-unit amounts to tablet space with larger Compact budgets and fixed Spacious units", () => {
	const chapter = sequence();
	const phone = layoutBudget(300, 640, 20, 34),
		tablet = layoutBudget(560, 1180, 20, 34);
	expect(packChapter(chapter, "Balanced", tablet).length).toBeLessThan(
		packChapter(chapter, "Balanced", phone).length,
	);
	expect(packChapter(chapter, "Compact", tablet).length).toBeLessThan(
		packChapter(chapter, "Balanced", tablet).length,
	);
	expect(packChapter(chapter, "Spacious", phone)).toHaveLength(30);
	expect(packChapter(chapter, "Spacious", tablet)).toHaveLength(30);
	expect(layoutBudget(300, 640, 30, 51).lines).toBeLessThan(phone.lines);
});
it("keeps headings, split fragments and atomic merged spans together; oversized verses remain intact", () => {
	const chapter = semanticFixture();
	const cards = packChapter(chapter, "Spacious", { columns: 12, lines: 4 });
	expect(cards[0]?.nodeIds).toEqual(
		expect.arrayContaining(["title-text", "heading-text", "a1", "a2"]),
	);
	expect(cards[1]?.nodeIds).toEqual(expect.arrayContaining(["b1", "b2"]));
	expect(cards[2]?.verseKeys).toEqual(["c", "d"]);
	const long = sequence(1);
	const node = long.nodes[0];
	if (node?.kind === "group" && node.children[0]?.kind === "text")
		node.children[0].text = "Invented long verse. ".repeat(1000);
	for (const density of ["Spacious", "Balanced", "Compact"] as Density[]) {
		const result = packChapter(long, density, { columns: 20, lines: 8 });
		expect(result).toHaveLength(1);
		expect(result[0]?.oversized).toBe(true);
	}
});
it("splits long paragraphs only at complete verses and keeps their parent association", () => {
	const chapter = sequence(12);
	const children = chapter.nodes.flatMap((n) =>
		n.kind === "group" ? n.children : [],
	);
	chapter.nodes = [
		{
			id: "parent",
			kind: "group",
			role: "paragraph",
			source: { path: "parent" },
			children,
		},
	];
	const cards = packChapter(chapter, "Balanced", { columns: 24, lines: 8 });
	expect(cards.length).toBeGreaterThan(1);
	expect(cards.flatMap((c) => c.verseKeys)).toEqual(
		chapter.verses.map((v) => v.key),
	);
	expect(
		leafText(
			chapter,
			cards.flatMap((c) => c.nodeIds),
		),
	).toEqual(orderedText(chapter.nodes));
});
it("reduces grouped cards at complete verse boundaries and conserves ordered identities", () => {
	const chapter = sequence(12);
	const grouped = packChapter(chapter, "Compact", { columns: 65, lines: 64 });
	const candidate = grouped.find((card) => card.verseKeys.length > 1);
	const atomic = packChapter(chapter, "Spacious", { columns: 65, lines: 64 });
	expect(candidate).toBeDefined();
	if (!candidate) return;
	const split = splitPackedCard(candidate, atomic);
	expect(split).toHaveLength(2);
	expect(split?.flatMap((card) => card.nodeIds)).toEqual(candidate.nodeIds);
	expect(split?.flatMap((card) => card.verseKeys)).toEqual(candidate.verseKeys);
	expect(
		reduceOverflowingGroups(grouped, atomic, new Set([candidate.key])),
	).toEqual(
		grouped.flatMap((card) =>
			card.key === candidate.key ? (split ?? [card]) : [card],
		),
	);
	expect(
		reduceOverflowingGroups(atomic, atomic, new Set([atomic[0]!.key])),
	).toBeUndefined();

	const mergedChapter = semanticFixture();
	const mergedAtomic = packChapter(mergedChapter, "Spacious", {
		columns: 65,
		lines: 64,
	});
	const allUnits = {
		key: mergedAtomic.map((card) => card.key).join("/"),
		nodeIds: mergedAtomic.flatMap((card) => card.nodeIds),
		verseKeys: mergedAtomic.flatMap((card) => card.verseKeys),
	};
	const splitMerged = splitPackedCard(allUnits, mergedAtomic);
	expect(splitMerged?.flatMap((card) => card.nodeIds)).toEqual(
		allUnits.nodeIds,
	);
	expect(splitMerged?.flatMap((card) => card.verseKeys)).toEqual(
		allUnits.verseKeys,
	);
	expect(
		splitMerged?.find((card) => card.verseKeys.includes("c"))?.verseKeys,
	).toEqual(["c", "d"]);
});
