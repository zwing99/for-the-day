import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
	generate,
	indexBook,
	parseXml,
	sha256,
} from "../../../scripts/webu-corpus.mjs";
import {
	orderedText,
	validateSemanticChapter,
	type SemanticNode,
} from "../../../src/domain/semantic-chapter.js";

describe("pinned public-domain WEBU corpus", () => {
	it("independently preserves every source chapter, verse, title and poetry line except footnotes", async () => {
		const manifest = await generate({ verify: true });
		expect(manifest.chapters).toHaveLength(181);
		let notes = 0;
		for (const book of ["PSA", "PRO"]) {
			const document = parseXml(
				await readFile(`corpus/webu/${book}.xml`, "utf8"),
			);
			let number = 0;
			let text = "";
			let verseKeys: string[] = [];
			let lines: Array<{ indent: number; text: string }> = [];
			let titles: string[] = [];
			let inlines: Array<{
				tag: string;
				text: string;
				attributes: Record<string, string>;
			}> = [];
			let bookTitle = "";
			function sourceText(node: Node): string {
				if (node.nodeType === 3) return node.textContent ?? "";
				if ((node as Element).tagName === "f") return "";
				return [...node.childNodes].map(sourceText).join("");
			}
			async function compare() {
				if (!number) return;
				const entry = manifest.chapters.find(
					(entry: { book: string; chapter: number }) =>
						entry.book === book && entry.chapter === number,
				)!;
				const bytes = await readFile(`public${entry.path}`, "utf8");
				expect(sha256(bytes)).toBe(entry.sha256);
				const chapter: unknown = JSON.parse(bytes);
				validateSemanticChapter(chapter);
				expect(chapter.identity).toMatchObject({
					translation: "WEBU",
					provider: "static",
					book,
					chapter: number,
				});
				expect(orderedText(chapter.nodes).join("")).toBe(text);
				expect(chapter.verses.map((verse) => verse.key)).toEqual(verseKeys);
				expect(entry.verseKeys).toEqual(verseKeys);
				const actualLines: Array<{ indent: number; text: string }> = [];
				const actualTitles: string[] = [];
				const actualInlines: typeof inlines = [];
				function walk(nodes: SemanticNode[]) {
					for (const node of nodes)
						if (node.kind === "group") {
							if (["w", "qs"].includes(node.source.tag ?? "")) {
								expect(node.role).toBe("inline");
								actualInlines.push({
									tag: node.source.tag!,
									text: orderedText(node.children).join(""),
									attributes: node.source.attributes as Record<string, string>,
								});
								if (node.source.tag === "qs") {
									function emphasis(nodes: SemanticNode[]) {
										for (const child of nodes) {
											if (child.kind === "text")
												expect(child.marks).toContain("italic");
											else if (child.kind === "group") emphasis(child.children);
										}
									}
									emphasis(node.children);
								}
							}
							if (node.role === "line")
								actualLines.push({
									indent: node.indent ?? 0,
									text: orderedText(node.children).join(""),
								});
							if (["title", "heading"].includes(node.role))
								actualTitles.push(orderedText(node.children).join(""));
							walk(node.children);
						}
				}
				walk(chapter.nodes);
				expect(actualLines).toEqual(lines);
				expect(actualTitles).toEqual(titles);
				expect(actualInlines).toEqual(inlines);
				expect(chapter.tracking).toEqual({ kind: "none" });
			}
			for (const element of [...document.documentElement.childNodes]) {
				if (
					!number &&
					element.nodeType === 1 &&
					(element as Element).getAttribute("sfm") === "mt"
				)
					bookTitle = sourceText(element);
				if (element.nodeType === 1 && element.nodeName === "c") {
					await compare();
					number = Number((element as Element).getAttribute("id"));
					text = "";
					verseKeys = [];
					lines = [];
					titles = [];
					inlines = [];
					if (number === 1) {
						text = bookTitle;
						titles = [bookTitle];
					}
				} else if (
					number &&
					!(element.nodeType === 3 && !element.textContent?.trim())
				) {
					text += sourceText(element);
					if (element.nodeType === 1) {
						const el = element as Element;
						for (const marker of el.querySelectorAll("v"))
							verseKeys.push(marker.getAttribute("bcv")!);
						notes += el.querySelectorAll("f").length;
						for (const inline of el.querySelectorAll("w,qs"))
							if (!inline.closest("f"))
								inlines.push({
									tag: inline.tagName,
									text: sourceText(inline),
									attributes: Object.fromEntries(
										[...inline.attributes].map((attribute) => [
											attribute.name,
											attribute.value,
										]),
									),
								});
						if (el.tagName === "q")
							lines.push({
								indent: Math.max(0, Number(el.getAttribute("level") ?? 1) - 1),
								text: sourceText(el),
							});
						if (el.tagName === "d" || el.getAttribute("sfm") === "ms")
							titles.push(sourceText(el));
					}
				}
			}
			await compare();
		}
		expect(notes).toBe(121);
	}, 30000);
	it("omits annotations without losing following text or changing whitespace", () => {
		const [chapter] = indexBook(
			parseXml(
				'<book id="PSA"><c id="1"/><q><v id="1" bcv="PSA.1.1"/> Amber<f><ft>Invented annotation</ft></f> boats\n<ve/></q></book>',
			),
			"PSA",
		);
		validateSemanticChapter(chapter);
		expect(orderedText(chapter.nodes)).toEqual([" Amber", " boats\n"]);
	});
	it.each(["mystery", "wh", "x"])(
		"fails on unsupported text-bearing %s markup",
		(tag) => {
			expect(() =>
				indexBook(
					parseXml(
						`<book id="PSA"><c id="1"/><p><v id="1" bcv="PSA.1.1"/><${tag}>Invented</${tag}></p></book>`,
					),
					"PSA",
				),
			).toThrow("Unsupported WEBU markup");
		},
	);
	it("generates identical data twice without downloads", async () => {
		expect(await generate({ verify: true })).toEqual(
			await generate({ verify: true }),
		);
	}, 30000);
});

it("produces identical offline generations and detects missing, stale and corrupt output", async () => {
	const { mkdtemp, rm, writeFile, mkdir } = await import("node:fs/promises");
	const { tmpdir } = await import("node:os");
	const { join } = await import("node:path");
	const root = await mkdtemp(join(tmpdir(), "webu-test-"));
	try {
		const options = {
			assetRoot: join(root, "assets"),
			pinPath: join(root, "revision.ts"),
		};
		const first = await generate(options);
		const chapterPath = join(options.assetRoot, `${first.revision}/PSA/1.json`);
		const original = await readFile(chapterPath, "utf8");
		expect(await generate(options)).toEqual(first);
		expect(await readFile(chapterPath, "utf8")).toBe(original);
		await rm(chapterPath);
		await expect(generate({ ...options, verify: true })).rejects.toThrow();
		await writeFile(
			chapterPath,
			original.replace('"schemaVersion":1', '"schemaVersion":9'),
		);
		await expect(generate({ ...options, verify: true })).rejects.toThrow(
			"Stale or corrupt WEBU asset",
		);
		await writeFile(chapterPath, original);
		await writeFile(options.pinPath, "stale pin");
		await expect(generate({ ...options, verify: true })).rejects.toThrow(
			"Stale WEBU manifest pin",
		);
		await generate(options);
		await mkdir(join(options.assetRoot, "old"));
		await writeFile(join(options.assetRoot, "old", "extra.json"), "{}");
		await expect(generate({ ...options, verify: true })).rejects.toThrow(
			"Unexpected WEBU assets",
		);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}, 30000);
