import { type DefaultTreeAdapterMap, parseFragment } from "parse5";
import type { Passage } from "../../domain/reading-plan.js";
import {
	type SemanticChapter,
	type SemanticNode,
	type VerseIdentity,
	validateSemanticChapter,
} from "../../domain/semantic-chapter.js";
import { type BibleProvider, ProviderError } from "./provider.js";

export const CROSSWAY_EDITION = "crossway-html:esv:normalizer-1";
export const CROSSWAY_OPTIONS = {
	"include-headings": "true",
	"include-subheadings": "true",
	"include-verse-numbers": "true",
	"include-first-verse-numbers": "true",
	"include-verse-anchors": "true",
	"include-chapter-numbers": "false",
	"include-passage-references": "false",
	"include-footnotes": "false",
	"include-footnote-body": "false",
	"include-crossrefs": "false",
	"include-audio-link": "false",
	"include-css-link": "false",
	"include-surrounding-chapters": "false",
	"include-surrounding-chapters-below": "false",
	"include-short-copyright": "false",
	"include-copyright": "true",
} as const;
type HtmlNode = DefaultTreeAdapterMap["childNode"];
type Element = DefaultTreeAdapterMap["element"];
function fail(): never {
	throw new ProviderError("normalization");
}
function attrs(node: Element): Record<string, string> {
	return Object.fromEntries(node.attrs.map((a) => [a.name, a.value]));
}
function htmlText(node: HtmlNode): string {
	if (node.nodeName === "#text")
		return (node as DefaultTreeAdapterMap["textNode"]).value;
	return "childNodes" in node ? node.childNodes.map(htmlText).join("") : "";
}

export class CrosswayProvider implements BibleProvider {
	constructor(
		private readonly options: { apiKey?: string; fetch?: typeof fetch },
	) {}
	async fetchChapter(
		passage: Passage,
		signal?: AbortSignal,
	): Promise<SemanticChapter> {
		if (!this.options.apiKey) throw new ProviderError("configuration");
		if (
			!Number.isInteger(passage.chapter) ||
			passage.chapter < 1 ||
			passage.chapter > (passage.book === "PSA" ? 150 : 31)
		)
			throw new ProviderError("not-found");
		const url = new URL("https://api.esv.org/v3/passage/html/");
		url.search = new URLSearchParams({
			q: `${passage.book === "PSA" ? "Psalm" : "Proverbs"} ${passage.chapter}`,
			...CROSSWAY_OPTIONS,
		}).toString();
		let response: Response;
		try {
			response = await (this.options.fetch ?? fetch)(url, {
				headers: { Authorization: `Token ${this.options.apiKey}` },
				signal,
				redirect: "error",
			});
		} catch {
			if (signal?.aborted) throw new DOMException("Cancelled.", "AbortError");
			throw new ProviderError("provider-unavailable");
		}
		if (!response.ok) {
			if (response.status === 401 || response.status === 403)
				throw new ProviderError("access-denied");
			if (response.status === 404) throw new ProviderError("not-found");
			if (response.status === 429) {
				const raw = response.headers.get("Retry-After");
				const delay = raw && /^\d+$/.test(raw) ? Number(raw) : undefined;
				throw new ProviderError(
					"rate-limit",
					delay !== undefined && Number.isSafeInteger(delay)
						? Math.min(delay, 86400)
						: undefined,
				);
			}
			throw new ProviderError("provider-unavailable");
		}
		try {
			return normalizeCrosswayChapter(await response.json(), passage);
		} catch {
			if (signal?.aborted) throw new DOMException("Cancelled.", "AbortError");
			throw new ProviderError("normalization");
		}
	}
}

export function normalizeCrosswayChapter(
	raw: unknown,
	passage: Passage,
): SemanticChapter {
	const data = raw as {
		canonical?: unknown;
		parsed?: number[][];
		passage_meta?: { chapter_start: number[]; chapter_end: number[] }[];
		passages?: string[];
	};
	const base =
		(passage.book === "PSA" ? 19 : 20) * 1000000 + passage.chapter * 1000;
	const range = data?.parsed?.[0];
	const meta = data?.passage_meta?.[0];
	if (
		!range ||
		data.parsed?.length !== 1 ||
		range[0] !== base + 1 ||
		!Number.isInteger(range[1]) ||
		range[1]! <= base ||
		range[1]! >= base + 1000 ||
		!meta ||
		JSON.stringify(meta.chapter_start) !== JSON.stringify(range) ||
		JSON.stringify(meta.chapter_end) !== JSON.stringify(range) ||
		data.passages?.length !== 1 ||
		typeof data.passages[0] !== "string" ||
		typeof data.canonical !== "string"
	)
		fail();
	const root = parseFragment(data.passages[0]);
	const verses: VerseIdentity[] = [];
	const byId = new Map<string, VerseIdentity>();
	const titleIds: string[] = [];
	const notices: string[] = [];
	let current: VerseIdentity | undefined;
	function verse(id: string, label?: string): VerseIdentity {
		if (!/^\d{8}$/.test(id) || Number(id) <= base || Number(id) > range![1]!)
			fail();
		let value = byId.get(id);
		if (!value) {
			value = {
				key: `crossway:${id}`,
				displayLabel: label ?? String(Number(id) - base),
				providerIds: [id],
				orgIds: [],
				sourceOrdinal: verses.length,
				fragmentNodeIds: [],
			};
			verses.push(value);
			byId.set(id, value);
		}
		if (label !== undefined) value.displayLabel = label;
		return value;
	}
	function walk(
		node: HtmlNode,
		path: string,
		nonVerse = false,
		marks: string[] = [],
	): SemanticNode[] {
		const source = { path };
		if (node.nodeName === "#comment") return [];
		if (node.nodeName === "#text") {
			const value = (node as DefaultTreeAdapterMap["textNode"]).value;
			const parent = "parentNode" in node ? node.parentNode : undefined;
			const structuralParent =
				parent?.nodeName === "#document-fragment" ||
				(parent &&
					"tagName" in parent &&
					(attrs(parent as Element).class ?? "")
						.split(/\s+/)
						.includes("block-indent"));
			if (!value.trim() && (structuralParent || (!nonVerse && !current)))
				return [];
			const membership = !nonVerse && current ? [current] : [];
			for (const v of membership) v.fragmentNodeIds.push(path);
			return [
				{
					id: path,
					kind: "text",
					text: value,
					verseKeys: membership.map((v) => v.key),
					marks,
					source,
				},
			];
		}
		const element = node as Element;
		const a = attrs(element);
		const classes = (a.class ?? "").split(/\s+/);
		const tag = element.tagName;
		if (["script", "style", "iframe", "template"].includes(tag)) fail();
		if (classes.includes("copyright")) {
			notices.push(htmlText(element));
			return [];
		}
		if (tag === "a" && classes.includes("va")) {
			const match = /^v(\d{8})$/.exec(a.rel ?? "");
			if (!match) fail();
			if (!nonVerse) current = verse(match[1]!);
			if (htmlText(element)) fail();
			return [];
		}
		if (classes.includes("verse-num")) {
			const match = /^v(\d{8})-\d+$/.exec(a.id ?? "");
			if (!match || nonVerse) fail();
			const label = htmlText(element).trim();
			if (!/^\d+[a-z]?(?:-\d+[a-z]?)?$/.test(label)) fail();
			current = verse(match[1]!, label);
			return [
				{
					id: path,
					kind: "verse-marker",
					verseKeys: [current.key],
					label,
					source: { ...source, tag, attributes: a },
				},
			];
		}
		if (tag === "br")
			return [
				{
					id: path,
					kind: "break",
					role: "line",
					source: { ...source, tag, attributes: a },
				},
			];
		if (
			classes.includes("begin-line-group") ||
			classes.includes("end-line-group")
		) {
			if (htmlText(element)) fail();
			return [
				{
					id: path,
					kind: "break",
					role: "stanza",
					source: { ...source, tag, attributes: a },
				},
			];
		}
		const title = classes.includes("psalm-title");
		const heading = /^h[1-6]$/.test(tag);
		if (title || heading) titleIds.push(path);
		const extra = classes.includes("divine-name")
			? ["small-caps"]
			: ["i", "em"].includes(tag) || classes.includes("selah")
				? ["italic"]
				: ["b", "strong"].includes(tag)
					? ["bold"]
					: tag === "sup"
						? ["superscript"]
						: [];
		let role: Extract<SemanticNode, { kind: "group" }>["role"] = title
			? "title"
			: heading
				? "heading"
				: classes.includes("line")
					? "line"
					: tag === "p"
						? "paragraph"
						: ["span", "a", "b", "i", "em", "strong", "sup", "small"].includes(
									tag,
								)
							? "inline"
							: "unknown";
		if (classes.includes("block-indent")) role = "poetry";
		const children = element.childNodes.flatMap((child, i) =>
			walk(child, `${path}/${i}`, nonVerse || title || heading, [
				...marks,
				...extra,
			]),
		);
		return [
			{
				id: path,
				kind: "group",
				role,
				...(classes.includes("line")
					? { indent: classes.includes("indent") ? 1 : 0 }
					: {}),
				children,
				source: { ...source, tag, attributes: a },
			},
		];
	}
	const nodes = root.childNodes.flatMap((node, i) => walk(node, `html/${i}`));
	if (
		!notices.length ||
		verses.length !== range[1]! - base ||
		verses.some(
			(v, i) =>
				v.providerIds[0] !== String(base + i + 1) || !v.fragmentNodeIds.length,
		)
	)
		fail();
	const chapter: SemanticChapter = {
		schemaVersion: 1,
		identity: {
			translation: "ESV",
			...passage,
			provider: "crossway",
			providerBibleId: "esv",
			editionKey: CROSSWAY_EDITION,
		},
		reference: data.canonical,
		nodes,
		verses,
		introTitleNodeIds: titleIds,
		attribution: {
			notice: notices.join("\n"),
			translationLabel: "ESV",
			requiredLinks: [{ label: "ESV", href: "https://www.esv.org/" }],
		},
		tracking: { kind: "none" },
	};
	try {
		validateSemanticChapter(chapter);
	} catch {
		fail();
	}
	return chapter;
}
