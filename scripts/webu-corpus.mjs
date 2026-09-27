import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { JSDOM } from "jsdom";
import { validateSemanticChapter } from "../src/domain/semantic-chapter.ts";

export const sourceDirectory = "corpus/webu";
export const publicDirectory = "public/scripture/webu";
export const normalizerVersion = 2;
export const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const sourceUrl = "https://ebible.org/Scriptures/engwebu_usfx.zip";
const editionUrl = "https://ebible.org/find/show.php?id=engwebu";
export function parseXml(text) {
	const document = new JSDOM(text, { contentType: "text/xml" }).window.document;
	return document;
}
export async function refresh() {
	const response = await fetch(sourceUrl);
	if (!response.ok) throw new Error("WEBU source download failed.");
	const archive = Buffer.from(await response.arrayBuffer());
	await mkdir(".local/webu", { recursive: true });
	await writeFile(".local/webu/engwebu_usfx.zip", archive);
	return extract(archive);
}
export async function extract(archive) {
	const xml = execFileSync(
		"unzip",
		["-p", ".local/webu/engwebu_usfx.zip", "engwebu_usfx.xml"],
		{ maxBuffer: 32 * 1024 * 1024 },
	).toString("utf8");
	const license = execFileSync("unzip", [
		"-p",
		".local/webu/engwebu_usfx.zip",
		"copr.htm",
	]).toString("utf8");
	if (
		!license.toLowerCase().includes("public domain") ||
		!license.includes("World English Bible Updated")
	)
		throw new Error("Unexpected source license.");
	const extracts = {};
	const texts = {};
	await mkdir(sourceDirectory, { recursive: true });
	for (const [book, count] of [
		["PSA", 150],
		["PRO", 31],
	]) {
		const matches = [
			...xml.matchAll(new RegExp(`<book id="${book}">[\\s\\S]*?</book>`, "g")),
		];
		if (matches.length !== 1) throw new Error(`Missing or duplicate ${book}.`);
		const text = `${matches[0][0]}\n`;
		const doc = parseXml(text);
		const chapters = [...doc.querySelectorAll("c")].map((node) =>
			Number(node.getAttribute("id")),
		);
		if (
			JSON.stringify(chapters) !==
			JSON.stringify(Array.from({ length: count }, (_, index) => index + 1))
		)
			throw new Error(`Incomplete ${book}.`);
		for (const chapter of indexBook(doc, book))
			validateSemanticChapter(chapter);
		extracts[book] = sha256(text);
		texts[book] = text;
	}
	let previous;
	try {
		previous = JSON.parse(
			await readFile(`${sourceDirectory}/provenance.json`, "utf8"),
		);
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
	if (
		previous &&
		JSON.stringify(previous.extracts) === JSON.stringify(extracts) &&
		previous.licenseSha256 === sha256(license)
	)
		return false;
	for (const [book, text] of Object.entries(texts))
		await writeFile(`${sourceDirectory}/${book}.xml`, text);
	await writeFile(`${sourceDirectory}/license.html`, license);
	await writeFile(
		`${sourceDirectory}/provenance.json`,
		`${JSON.stringify({ edition: "engwebu", translation: "WEBU", label: "World English Bible Updated", publicDomain: true, sourceUrl, editionUrl, retrievedAt: new Date().toISOString(), archiveSha256: sha256(archive), extracts, licenseSha256: sha256(license) }, null, 2)}\n`,
	);
	return true;
}

export function indexBook(document, book) {
	let chapter, verse;
	const chapters = [];
	const bookTitles = [];
	let serial = 0;
	const source = (element, path) => ({
		path,
		tag: element.nodeName,
		...(element.nodeType === 1
			? {
					attributes: Object.fromEntries(
						[...element.attributes].map((a) => [a.name, a.value]),
					),
				}
			: {}),
	});
	function textNode(text, element, path, marks) {
		if (!text) return undefined;
		const id = `${book}.${chapter.identity.chapter}.n${serial++}`;
		if (verse) verse.fragmentNodeIds.push(id);
		return {
			id,
			kind: "text",
			text,
			verseKeys: verse ? [verse.key] : [],
			marks,
			source: source(element, path),
		};
	}
	function walk(element, path, marks = []) {
		if (element.nodeType === 3)
			return textNode(element.data, element, path, marks);
		if (element.nodeType !== 1)
			throw new Error(`Unsupported XML node ${path}.`);
		const tag = element.tagName;
		if (tag === "f") return undefined; // Explicitly excluded annotations; sibling tail stays in order.
		if (tag === "v") {
			const label = element.getAttribute("id");
			const key = element.getAttribute("bcv");
			if (
				!label ||
				!key ||
				key !== `${book}.${chapter.identity.chapter}.${label}` ||
				chapter.verses.some((v) => v.key === key)
			)
				throw new Error(`Invalid source verse ${path}.`);
			verse = {
				key,
				displayLabel: label,
				providerIds: [key],
				orgIds: [],
				sourceOrdinal: chapter.verses.length,
				fragmentNodeIds: [],
			};
			chapter.verses.push(verse);
			return {
				id: `${book}.${chapter.identity.chapter}.n${serial++}`,
				kind: "verse-marker",
				verseKeys: [key],
				label,
				source: source(element, path),
			};
		}
		if (tag === "ve") {
			verse = undefined;
			return undefined;
		}
		if (tag === "b")
			return {
				id: `${book}.${chapter.identity.chapter}.n${serial++}`,
				kind: "group",
				role: "stanza",
				children: [],
				source: source(element, path),
			};
		const roles = {
			q: "line",
			d: "title",
			p:
				element.getAttribute("sfm") === "ms"
					? "heading"
					: element.getAttribute("sfm") === "mt"
						? "title"
						: "paragraph",
			w: "inline",
			qs: "inline",
			ref: "inline",
		};
		const role = roles[tag];
		if (!role) throw new Error(`Unsupported WEBU markup ${tag} at ${path}.`);
		const id = `${book}.${chapter.identity.chapter}.n${serial++}`;
		const children = [...element.childNodes].flatMap((child, index) => {
			const result = walk(
				child,
				`${path}/${index}`,
				tag === "qs" ? [...marks, "italic"] : marks,
			);
			return result ? [result] : [];
		});
		return {
			id,
			kind: "group",
			role,
			...(tag === "q"
				? {
						indent: Math.max(0, Number(element.getAttribute("level") ?? 1) - 1),
					}
				: {}),
			children,
			source: source(element, path),
		};
	}
	const root = document.documentElement;
	if (root.tagName !== "book" || root.getAttribute("id") !== book)
		throw new Error("Invalid source book.");
	for (const [index, element] of [...root.childNodes].entries()) {
		if (element.nodeType === 1 && element.tagName === "c") {
			verse = undefined;
			serial = 0;
			const number = Number(element.getAttribute("id"));
			chapter = {
				schemaVersion: 1,
				identity: {
					translation: "WEBU",
					book,
					chapter: number,
					provider: "static",
					providerBibleId: "engwebu",
					editionKey: "engwebu",
				},
				reference: `${book === "PSA" ? "Psalm" : "Proverbs"} ${number}`,
				nodes: [],
				verses: [],
				introTitleNodeIds: [],
				attribution: {
					notice: "World English Bible Updated. Public domain.",
					translationLabel: "World English Bible Updated (WEBU)",
					requiredLinks: [
						{ label: "Source and public-domain information", href: editionUrl },
					],
				},
				tracking: { kind: "none" },
			};
			chapters.push(chapter);
			if (chapters.length === 1)
				for (const [title, path] of bookTitles) {
					const node = walk(title, path);
					chapter.nodes.push(node);
					chapter.introTitleNodeIds.push(node.id);
				}
		} else if (!chapter && element.nodeType === 1 && element.tagName === "p") {
			if (element.getAttribute("sfm") !== "mt")
				throw new Error("Unsupported WEBU preamble paragraph.");
			bookTitles.push([element, `/${book}/${index}`]);
		} else if (chapter) {
			// XML whitespace between block elements is serialization layout, not Scripture.
			if (element.nodeType === 3 && !element.data.trim()) continue;
			const node = walk(element, `/${book}/${index}`);
			if (node) {
				chapter.nodes.push(node);
				if (node.kind === "group" && ["title", "heading"].includes(node.role))
					chapter.introTitleNodeIds.push(node.id);
			}
		} else if (
			element.nodeType === 1 &&
			!["id", "ide", "h", "toc", "p", "cl"].includes(element.tagName)
		)
			throw new Error(`Unsupported book preamble ${element.tagName}.`);
	}
	return chapters;
}

export async function generate({
	verify = false,
	sourceRoot = sourceDirectory,
	assetRoot = publicDirectory,
	pinPath = "src/domain/webu-revision.ts",
} = {}) {
	const provenance = JSON.parse(
		await readFile(`${sourceRoot}/provenance.json`, "utf8"),
	);
	if (
		provenance.edition !== "engwebu" ||
		provenance.translation !== "WEBU" ||
		provenance.publicDomain !== true
	)
		throw new Error("Invalid WEBU provenance.");
	if (
		sha256(await readFile(`${sourceRoot}/license.html`)) !==
		provenance.licenseSha256
	)
		throw new Error("Corrupt WEBU license.");
	const sources = {};
	for (const book of ["PSA", "PRO"]) {
		sources[book] = await readFile(`${sourceRoot}/${book}.xml`, "utf8");
		if (sha256(sources[book]) !== provenance.extracts[book])
			throw new Error(`Corrupt WEBU ${book} source.`);
	}
	const revision = sha256(
		JSON.stringify({
			extracts: provenance.extracts,
			schemaVersion: 1,
			normalizerVersion,
		}),
	).slice(0, 24);
	const manifest = {
		schemaVersion: 1,
		normalizerVersion,
		revision,
		provenance,
		chapters: [],
	};
	let previousRevision;
	if (!verify) {
		try {
			previousRevision = JSON.parse(
				await readFile(`${assetRoot}/manifest.json`, "utf8"),
			).revision;
		} catch (error) {
			if (error.code !== "ENOENT") throw error;
		}
	}
	const expected = new Map();
	for (const book of ["PSA", "PRO"]) {
		const chapters = indexBook(parseXml(sources[book]), book);
		if (
			chapters.length !== (book === "PSA" ? 150 : 31) ||
			chapters.some((chapter, index) => chapter.identity.chapter !== index + 1)
		)
			throw new Error("Incomplete WEBU chapters.");
		for (const chapter of chapters) {
			validateSemanticChapter(chapter);
			const relative = `${revision}/${book}/${chapter.identity.chapter}.json`;
			const data = `${JSON.stringify(chapter)}\n`;
			expected.set(relative, data);
			manifest.chapters.push({
				book,
				chapter: chapter.identity.chapter,
				path: `/scripture/webu/${relative}`,
				sha256: sha256(data),
				verseKeys: chapter.verses.map((verse) => verse.key),
			});
		}
	}
	expected.set("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
	const pin = `// Generated by mise run webu:generate.\nexport const webuRevision = "${revision}";\nexport const webuManifestSha256 =\n\t"${sha256(expected.get("manifest.json"))}";\n`;
	if (verify) {
		if ((await readFile(pinPath, "utf8")) !== pin)
			throw new Error("Stale WEBU manifest pin.");
	} else await writeFile(pinPath, pin);

	for (const [relative, data] of expected) {
		const path = `${assetRoot}/${relative}`;
		if (verify) {
			if ((await readFile(path, "utf8")) !== data)
				throw new Error(`Stale or corrupt WEBU asset: ${path}.`);
		} else {
			await mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
			await writeFile(path, data);
		}
	}
	if (!verify && previousRevision && previousRevision !== revision) {
		if (!/^[a-f0-9]{24}$/.test(previousRevision))
			throw new Error("Invalid previous WEBU revision.");
		await rm(`${assetRoot}/${previousRevision}`, {
			recursive: true,
			force: true,
		});
	}
	if (verify) {
		const files = await readdir(assetRoot, {
			recursive: true,
			withFileTypes: true,
		});
		const actual = files
			.filter((entry) => entry.isFile())
			.map((entry) =>
				`${entry.parentPath}/${entry.name}`.replace(`${assetRoot}/`, ""),
			);
		if (
			actual.length !== expected.size ||
			actual.some((path) => !expected.has(path))
		)
			throw new Error(
				"Unexpected WEBU assets; review old revisions before removing them.",
			);
	}
	return manifest;
}
if (process.argv[1]?.endsWith("/webu-corpus.mjs")) {
	const mode = process.argv[2];
	if (mode === "update") {
		const changed = await refresh();
		const manifest = await generate();
		console.log(
			`WEBU ${changed ? "updated" : "source unchanged"}: ${manifest.chapters.length} chapters; footnotes excluded. Review the corpus and asset diff.`,
		);
	} else if (mode === "refresh") await refresh();
	else if (mode === "extract")
		await extract(await readFile(".local/webu/engwebu_usfx.zip"));
	else if (mode === "generate" || mode === "verify") {
		const manifest = await generate({ verify: mode === "verify" });
		console.log(
			`WEBU ${mode}: ${manifest.chapters.length} chapters, revision ${manifest.revision}.`,
		);
	} else throw new Error("Use update, refresh, generate, or verify.");
}
