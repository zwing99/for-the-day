import { deepStrictEqual, strictEqual } from "node:assert";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { type DefaultTreeAdapterMap, parseFragment } from "parse5";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChapterCards } from "../src/client/semantic-renderer.js";
import {
	orderedText,
	type SemanticChapter,
} from "../src/domain/semantic-chapter.js";
import { normalizeApiBibleChapter } from "../src/server/providers/api-bible.js";
import { normalizeCrosswayChapter } from "../src/server/providers/crossway.js";

type Node = DefaultTreeAdapterMap["childNode"];
function text(node: Node): string {
	if (node.nodeName === "#text")
		return (node as DefaultTreeAdapterMap["textNode"]).value;
	return "childNodes" in node ? node.childNodes.map(text).join("") : "";
}
function attribute(node: Node, name: string): string | undefined {
	return "attrs" in node
		? node.attrs.find((a) => a.name === name)?.value
		: undefined;
}
const payload: SemanticChapter[] = [];
for (const translation of ["NIV", "NLT", "ESV"] as const) {
	for (const [book, chapterNumber] of [
		["PSA", 23],
		["PSA", 60],
		["PSA", 119],
		["PRO", 30],
	] as const) {
		const passage = { book, chapter: chapterNumber };
		try {
			const filename =
				translation === "ESV"
					? `${book === "PSA" ? "Psalm" : "Proverbs"}-${chapterNumber}`
					: `${translation}-${book}-${chapterNumber}`;
			const raw = JSON.parse(
				await readFile(`.local/provider-8/${filename}.json`, "utf8"),
			);
			const chapter =
				translation === "ESV"
					? normalizeCrosswayChapter(raw, passage)
					: normalizeApiBibleChapter(
							raw,
							passage,
							raw.data.bibleId,
							translation,
						);
			const expected: string[] = [];
			if (translation !== "ESV") {
				function walk(items: typeof raw.data.content) {
					for (const n of items) {
						if (n.type === "text") expected.push(n.text);
						if (n.items && n.name !== "verse") walk(n.items);
					}
				}
				walk(raw.data.content);
				strictEqual(chapter.attribution.notice, raw.data.copyright);
				strictEqual(chapter.verses.length, raw.data.verseCount);
				deepStrictEqual(
					chapter.tracking.kind === "api-bible-fums" &&
						chapter.tracking.suppliedMetadata,
					raw.meta,
				);
			} else {
				const root = parseFragment(raw.passages[0]);
				const notices: string[] = [];
				function walk(node: Node, serializationSpace = false) {
					if (node.nodeName === "#text") {
						const value = text(node);
						if (!serializationSpace || value.trim()) expected.push(value);
						return;
					}
					const classes = (attribute(node, "class") ?? "").split(/\s+/);
					if (classes.includes("copyright")) {
						notices.push(text(node));
						return;
					}
					if (classes.includes("verse-num") || classes.includes("va")) return;
					if ("childNodes" in node)
						for (const child of node.childNodes)
							walk(child, classes.includes("block-indent"));
				}
				for (const n of root.childNodes) walk(n, true);
				strictEqual(chapter.attribution.notice, notices.join("\n"));
				strictEqual(
					chapter.verses.length,
					raw.parsed[0][1] - raw.parsed[0][0] + 1,
				);
				if (chapterNumber === 119)
					strictEqual(chapter.introTitleNodeIds.length, 23);
			}
			deepStrictEqual(orderedText(chapter.nodes), expected);
			const markup = parseFragment(
				renderToStaticMarkup(createElement(ChapterCards, { chapter })),
			);
			const rendered: string[] = [];
			function collect(node: Node) {
				if (attribute(node, "data-semantic-text") === "true") {
					rendered.push(text(node));
					return;
				}
				if ("childNodes" in node) node.childNodes.forEach(collect);
			}
			markup.childNodes.forEach(collect);
			deepStrictEqual(rendered, expected);
			if (!process.argv.includes("--browser-payload"))
				console.log(
					`${translation} ${book}.${chapterNumber}: exact source/normalized/rendered text, attribution and verse count verified`,
				);
			// Browser replay suppresses real usage reporting; original tracking was checked above.
			payload.push({ ...chapter, tracking: { kind: "none" } });
		} catch {
			throw new Error(
				`${translation} ${book}.${chapterNumber}: saved-sample fidelity failed; inspect the ignored source locally.`,
			);
		}
	}
}
if (process.argv.includes("--browser-payload"))
	process.stdout.write(gzipSync(JSON.stringify(payload)).toString("base64"));
