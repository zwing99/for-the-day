import { expect, it } from "vitest";
import { verseCards } from "../../../src/domain/card-packing.js";
import {
	measuredPackChapter,
	packingUnits,
} from "../../../src/domain/measured-packing.js";
import { semanticFixture } from "../../fixtures/semantic-chapter.js";

function shortUnits(count: number) {
	return Array.from({ length: count }, (_, i) => ({
		card: { key: `v${i}`, nodeIds: [`n${i}`], verseKeys: [`v${i}`] },
		boundaryBefore: false,
		naturalGroup: "paragraph",
	}));
}
it("grows two to four short complete units at the measured Balanced target", () => {
	for (const count of [2, 3, 4]) {
		const units = shortUnits(12);
		const cards = measuredPackChapter(
			units,
			"Balanced",
			{ width: 300, height: 100 },
			(card) => ({ width: 300, height: (card.verseKeys.length * 80) / count }),
		);
		expect(cards[0]?.verseKeys).toHaveLength(count);
		expect(cards.flatMap((card) => card.verseKeys)).toEqual(
			units.flatMap((unit) => unit.card.verseKeys),
		);
		expect(new Set(cards.flatMap((card) => card.nodeIds)).size).toBe(12);
	}
});
it("requires both axes and keeps an oversized first unit intact", () => {
	const units = shortUnits(3);
	expect(
		measuredPackChapter(
			units,
			"Balanced",
			{ width: 300, height: 100 },
			(card) => ({ width: card.verseKeys.length > 1 ? 301 : 300, height: 20 }),
		),
	).toHaveLength(3);
	expect(
		measuredPackChapter(
			units,
			"Balanced",
			{ width: 300, height: 100 },
			(card) => ({ width: 300, height: card.verseKeys.length * 110 }),
		),
	).toEqual(units.map((unit) => unit.card));
});
it("respects heading and unknown boundaries and is deterministic", () => {
	const chapter = semanticFixture();
	const units = packingUnits(chapter);
	expect(units.flatMap((unit) => unit.card.nodeIds)).toEqual(
		verseCards(chapter).flatMap((card) => card.nodeIds),
	);
	expect(units.flatMap((unit) => unit.card.verseKeys)).toEqual(
		verseCards(chapter).flatMap((card) => card.verseKeys),
	);
	const input = shortUnits(6);
	input[2]!.boundaryBefore = true;
	input[4]!.card = { ...input[4]!.card, indivisible: true };
	input[4]!.boundaryBefore = true;
	input[5]!.boundaryBefore = true;
	const measure = () => ({ width: 100, height: 10 });
	const first = measuredPackChapter(
		input,
		"Compact",
		{ width: 300, height: 100 },
		measure,
	);
	expect(first.map((card) => card.verseKeys)).toEqual([
		["v0", "v1"],
		["v2", "v3"],
		["v4"],
		["v5"],
	]);
	expect(
		measuredPackChapter(input, "Compact", { width: 300, height: 100 }, measure),
	).toEqual(first);
});
it("Compact has no more pages for the same monotone composed geometry", () => {
	const units = shortUnits(30);
	for (const height of [80, 100, 200]) {
		const measure = (card: (typeof units)[number]["card"]) => ({
			width: 300,
			height: card.verseKeys.length * 20,
		});
		expect(
			measuredPackChapter(units, "Compact", { width: 300, height }, measure)
				.length,
		).toBeLessThanOrEqual(
			measuredPackChapter(units, "Balanced", { width: 300, height }, measure)
				.length,
		);
	}
});

it("joins all complete units in an unknown structure and preserves merged fragments", () => {
	const chapter = semanticFixture();
	const unknown = chapter.nodes.find((node) => node.id === "unknown");
	if (!unknown || unknown.kind !== "group")
		throw new Error("Missing invented unknown group");
	unknown.children.push({
		id: "e-text",
		kind: "text",
		text: "Extra invented fragment.",
		verseKeys: ["e"],
		marks: [],
		source: { path: "e-text" },
	});
	chapter.verses.push({
		key: "e",
		displayLabel: "5",
		providerIds: [],
		orgIds: [],
		sourceOrdinal: 4,
		fragmentNodeIds: ["e-text"],
	});
	const units = packingUnits(chapter);
	expect(units.at(-1)?.card).toMatchObject({
		verseKeys: ["c", "d", "e"],
		nodeIds: ["merged", "e-text"],
		indivisible: true,
	});
	expect(units[0]?.card.nodeIds).toEqual(
		expect.arrayContaining(["a1", "a2", "heading-text"]),
	);
	expect(units[1]?.card.nodeIds).toEqual(expect.arrayContaining(["b1", "b2"]));
	expect(units.flatMap((unit) => unit.card.nodeIds)).toEqual(
		verseCards(chapter).flatMap((card) => card.nodeIds),
	);
});

it("starts a deliberate boundary at a newly attached heading", () => {
	const chapter = semanticFixture();
	chapter.nodes.splice(3, 0, {
		id: "second-heading",
		kind: "group",
		role: "heading",
		source: { path: "second-heading" },
		children: [
			{
				id: "second-title",
				kind: "text",
				text: "Invented second division",
				verseKeys: [],
				marks: [],
				source: { path: "second-title" },
			},
		],
	});
	const units = packingUnits(chapter);
	expect(units[1]?.boundaryBefore).toBe(true);
	expect(units[1]?.card.nodeIds).toContain("second-title");
	const cards = measuredPackChapter(
		units,
		"Compact",
		{ width: 300, height: 1000 },
		() => ({ width: 100, height: 10 }),
	);
	expect(cards[0]?.verseKeys).toEqual(["a"]);
	expect(cards.flatMap((card) => card.verseKeys)).toEqual(["a", "b", "c", "d"]);
});

it("prefers a complete fitting stanza after a populated page without leaving an avoidable singleton", () => {
	const units = [
		{
			card: { key: "a", nodeIds: ["a"], verseKeys: ["a"] },
			boundaryBefore: false,
			naturalGroup: "prose",
		},
		{
			card: { key: "b", nodeIds: ["b"], verseKeys: ["b"] },
			boundaryBefore: false,
			naturalGroup: "prose",
		},
		...["c", "d", "e"].map((key) => ({
			card: { key, nodeIds: [key], verseKeys: [key] },
			boundaryBefore: false,
			naturalGroup: "stanza",
		})),
	];
	const measure = (card: (typeof units)[number]["card"]) => ({
		width: 100,
		height: card.verseKeys.reduce(
			(sum, key) => sum + (key === "a" || key === "b" ? 20 : 15),
			0,
		),
	});
	const pages = measuredPackChapter(
		units,
		"Balanced",
		{ width: 300, height: 100 },
		measure,
	);
	expect(pages.map((page) => page.verseKeys)).toEqual([
		["a", "b"],
		["c", "d", "e"],
	]);
	const singletonUnits = units.slice(1);
	const singletonPages = measuredPackChapter(
		singletonUnits,
		"Balanced",
		{ width: 300, height: 100 },
		measure,
	);
	expect(singletonPages[0]?.verseKeys).toEqual(["b", "c", "d", "e"]);
});
