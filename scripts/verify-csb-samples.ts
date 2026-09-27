import { deepStrictEqual } from "node:assert";
import { readFile } from "node:fs/promises";
import {
	orderedText,
	type SemanticNode,
} from "../src/domain/semantic-chapter.js";
import { normalizeApiBibleChapter } from "../src/server/providers/api-bible.js";

for (const passage of [
	{ book: "PSA", chapter: 23 },
	{ book: "PSA", chapter: 3 },
	{ book: "PSA", chapter: 119 },
	{ book: "PRO", chapter: 7 },
] as const) {
	const raw = JSON.parse(
		await readFile(
			`.local/provider-samples/CSB-${passage.book}-${passage.chapter}.json`,
			"utf8",
		),
	);
	const chapter = normalizeApiBibleChapter(raw, passage, raw.data.bibleId);
	const normalized = new Map<string, SemanticNode>();
	function index(nodes: SemanticNode[]) {
		for (const node of nodes) {
			normalized.set(node.id, node);
			if (node.kind === "group") index(node.children);
		}
	}
	index(chapter.nodes);
	const texts: string[] = [];
	function compare(items: Array<Record<string, any>>, path: string) {
		items.forEach((item, i) => {
			const node = normalized.get(`${path}/${i}`);
			if (!node) throw new Error("Source node missing.");
			deepStrictEqual(node.source.attributes, item.attrs ?? {});
			if (item.type === "text") {
				texts.push(item.text);
				if (node.kind !== "text") throw new Error("Text structure mismatch.");
				deepStrictEqual(node.text, item.text);
			} else if (item.name === "verse") {
				if (node.kind !== "verse-marker")
					throw new Error("Verse marker missing.");
				deepStrictEqual(node.label, item.attrs.number);
			} else {
				if (node.kind !== "group") throw new Error("Literary group missing.");
				deepStrictEqual(node.source.tag, item.name);
				compare(item.items, `${path}/${i}`);
			}
		});
	}
	compare(raw.data.content, "content");
	deepStrictEqual(orderedText(chapter.nodes), texts);
	deepStrictEqual(chapter.attribution.notice, raw.data.copyright);
	deepStrictEqual(
		chapter.tracking.kind === "api-bible-fums" &&
			chapter.tracking.suppliedMetadata,
		raw.meta,
	);
	deepStrictEqual(chapter.verses.length, raw.data.verseCount);
	console.log(
		`${passage.book}.${passage.chapter}: exact text, hierarchy, attributes, attribution, tracking, and verse count verified`,
	);
}
