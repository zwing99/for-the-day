import type { Passage } from "../../domain/reading-plan.js";
import {
	type SemanticChapter,
	type SemanticNode,
	type SourceInfo,
	type Translation,
	type VerseIdentity,
	validateSemanticChapter,
} from "../../domain/semantic-chapter.js";
import { type BibleProvider, ProviderError } from "./provider.js";

interface Options {
	translation?: Exclude<Translation, "ESV" | "WEBU">;
	apiKey?: string;
	bibleId?: string;
	fetch?: typeof fetch;
}
function invalid(): never {
	throw new ProviderError("normalization");
}
function object(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value))
		return invalid();
	return value as Record<string, unknown>;
}
function text(value: unknown): string {
	if (typeof value !== "string") return invalid();
	return value;
}
function ids(value: unknown): string[] {
	if (value === undefined) return [];
	if (typeof value === "string") return [value];
	if (!Array.isArray(value) || !value.every((item) => typeof item === "string"))
		return invalid();
	return value;
}

export function apiBibleChapterUrl(passage: Passage, bibleId: string): URL {
	const url = new URL(
		`https://v2.api.bible/bibles/${encodeURIComponent(bibleId)}/chapters/${passage.book}.${passage.chapter}`,
	);
	for (const [key, value] of Object.entries({
		"content-type": "json",
		"include-notes": "false",
		"include-titles": "true",
		"include-chapter-numbers": "false",
		"include-verse-numbers": "true",
		"include-verse-spans": "true",
	}))
		url.searchParams.set(key, value);
	return url;
}

/** Configured API.Bible whole chapters using API.Bible v2 and V3 view metadata. */
export class ApiBibleProvider implements BibleProvider {
	constructor(private readonly options: Options) {}
	async fetchChapter(
		passage: Passage,
		signal?: AbortSignal,
	): Promise<SemanticChapter> {
		if (!this.options.apiKey || !this.options.bibleId)
			throw new ProviderError("configuration");
		if (
			!["PSA", "PRO"].includes(passage.book) ||
			!Number.isInteger(passage.chapter) ||
			passage.chapter < 1 ||
			passage.chapter > (passage.book === "PSA" ? 150 : 31)
		)
			throw new ProviderError("not-found");
		const url = apiBibleChapterUrl(passage, this.options.bibleId);
		let response: Response;
		try {
			response = await (this.options.fetch ?? fetch)(url, {
				headers: { "api-key": this.options.apiKey },
				signal,
				redirect: "error",
			});
		} catch {
			if (signal?.aborted)
				throw new DOMException("Chapter request cancelled.", "AbortError");
			throw new ProviderError("provider-unavailable");
		}
		if (!response.ok) {
			if (response.status === 404) throw new ProviderError("not-found");
			if (response.status === 401 || response.status === 403)
				throw new ProviderError("access-denied");
			if (response.status === 429) {
				const raw = response.headers.get("Retry-After");
				const seconds = raw && /^\d+$/.test(raw) ? Number(raw) : undefined;
				throw new ProviderError(
					"rate-limit",
					seconds !== undefined && Number.isSafeInteger(seconds)
						? Math.min(seconds, 86400)
						: undefined,
				);
			}
			throw new ProviderError("provider-unavailable");
		}
		try {
			return normalizeApiBibleChapter(
				await response.json(),
				passage,
				this.options.bibleId,
				this.options.translation ?? "CSB",
			);
		} catch (error) {
			if (signal?.aborted)
				throw new DOMException("Chapter request cancelled.", "AbortError");
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("normalization");
		}
	}
}

export function normalizeApiBibleChapter(
	raw: unknown,
	passage: Passage,
	bibleId: string,
	translation: Exclude<Translation, "ESV" | "WEBU"> = "CSB",
): SemanticChapter {
	const envelope = object(raw);
	const data = object(envelope.data);
	const meta = object(envelope.meta);
	if (
		data.id !== `${passage.book}.${passage.chapter}` ||
		data.bookId !== passage.book ||
		data.bibleId !== bibleId ||
		String(data.number) !== String(passage.chapter)
	)
		invalid();
	const token = text(meta.fumsToken);
	if (!token) invalid();
	const verses: VerseIdentity[] = [];
	const byId = new Map<string, VerseIdentity>();
	const titleIds: string[] = [];
	let current: VerseIdentity | undefined;
	function verse(providerId: string, label?: string): VerseIdentity {
		let value = byId.get(providerId);
		if (!value) {
			const prefix = `${passage.book}.${passage.chapter}.`;
			if (!providerId.startsWith(prefix)) invalid();
			const suffix = providerId.slice(prefix.length);
			if (!/^\d+[a-z]?(?:-\d+[a-z]?)?$/.test(suffix)) invalid();
			value = {
				key: providerId,
				displayLabel: label ?? suffix,
				providerIds: [providerId],
				orgIds: [],
				sourceOrdinal: verses.length,
				fragmentNodeIds: [],
			};
			verses.push(value);
			byId.set(providerId, value);
		} else if (label !== undefined) value.displayLabel = label;
		return value;
	}
	function walk(
		items: unknown,
		path: string,
		inherited?: VerseIdentity[],
		marks: string[] = [],
		nonVerse = false,
	): SemanticNode[] {
		if (!Array.isArray(items)) invalid();
		return items.map((raw, index) => {
			const item = object(raw);
			const nodePath = `${path}/${index}`;
			const attrs = item.attrs === undefined ? {} : object(item.attrs);
			const attributes: Record<string, string | string[]> = {};
			for (const [key, value] of Object.entries(attrs)) {
				if (typeof value === "string") attributes[key] = value;
				else if (
					Array.isArray(value) &&
					value.every((item) => typeof item === "string")
				)
					attributes[key] = value;
				else invalid();
			}
			const style = attrs.style === undefined ? undefined : text(attrs.style);
			const source: SourceInfo = {
				path: nodePath,
				attributes,
				...(style === undefined ? {} : { style }),
			};
			const explicit = ids(attrs.verseId).map((id) => verse(id));
			const membership = explicit.length
				? explicit
				: nonVerse
					? []
					: inherited
						? inherited
						: current
							? [current]
							: [];
			const orgIds = ids(attrs.verseOrgIds);
			for (const identity of membership)
				for (const orgId of orgIds)
					if (!identity.orgIds.includes(orgId)) identity.orgIds.push(orgId);
			if (explicit.length === 1) current = explicit[0];
			if (item.type === "text") {
				const value = text(item.text);
				for (const identity of membership)
					identity.fragmentNodeIds.push(nodePath);
				return {
					id: nodePath,
					kind: "text",
					text: value,
					verseKeys: membership.map((verse) => verse.key),
					marks,
					source,
				};
			}
			if (item.type !== "tag") invalid();
			const name = text(item.name);
			source.tag = name;
			if (name === "verse") {
				// A verse marker contains a printed label, not a Scripture text leaf.
				const label = text(attrs.number);
				if (
					!Array.isArray(item.items) ||
					!item.items.every(
						(child) =>
							object(child).type === "text" &&
							typeof object(child).text === "string",
					)
				)
					invalid();
				if (
					item.items.map((child) => text(object(child).text)).join("") !== label
				)
					invalid();
				const providerIds = ids(attrs.verseId);
				let markerId = providerIds[0];
				if (!markerId && typeof attrs.sid === "string") {
					const match = /^(PSA|PRO) (\d+):(\d+[a-z]?(?:-\d+[a-z]?)?)$/.exec(
						attrs.sid,
					);
					if (!match) invalid();
					markerId = `${match[1]}.${match[2]}.${match[3]}`;
				}
				if (!markerId) invalid();
				current = verse(markerId, label);
				return {
					id: nodePath,
					kind: "verse-marker",
					verseKeys: [current.key],
					label,
					source,
				};
			}
			const title = /^(d|cl|mt\d*|ms\d*)$/.test(style ?? "");
			const heading = /^(s\d*|sr|r|qa)$/.test(style ?? "");
			const poetry = /^(?:q|li)([1-4])?$/.exec(style ?? "");
			let role: Extract<SemanticNode, { kind: "group" }>["role"] = "unknown";
			if (title) role = "title";
			else if (heading) role = "heading";
			else if (poetry) role = "line";
			else if (style === "b") role = "stanza";
			else if (name === "para" && /^(p|m|pi\d*|mi|pc|pr)$/.test(style ?? ""))
				role = "paragraph";
			else if (name === "char" || name === "verse-span") role = "inline";
			const styleMarks: Record<string, string[]> = {
				nd: ["small-caps"],
				it: ["italic"],
				bd: ["bold"],
				sup: ["superscript"],
				qs: ["italic"],
				tl: ["italic"],
				qac: ["acrostic"],
			};
			const extraMarks = styleMarks[style ?? ""] ?? [];
			const children = walk(
				item.items,
				nodePath,
				explicit.length ? explicit : inherited,
				[...marks, ...extraMarks],
				nonVerse || title || heading,
			);
			if (title || heading) titleIds.push(nodePath);
			return {
				id: nodePath,
				kind: "group",
				role,
				...(poetry ? { indent: Number(poetry[1] ?? 0) } : {}),
				children,
				source,
			};
		});
	}
	const chapter: SemanticChapter = {
		schemaVersion: 1,
		identity: {
			translation,
			...passage,
			provider: "api-bible",
			providerBibleId: bibleId,
			editionKey: `api-bible-v2:${bibleId}:normalizer-2`,
		},
		reference: text(data.reference),
		nodes: walk(data.content, "content"),
		verses,
		introTitleNodeIds: titleIds,
		attribution: {
			notice: text(data.copyright),
			translationLabel: translation,
			requiredLinks: [],
		},
		tracking: {
			kind: "api-bible-fums",
			version: 3,
			token,
			suppliedMetadata: meta,
		},
	};
	try {
		validateSemanticChapter(chapter);
	} catch {
		invalid();
	}
	return chapter;
}
