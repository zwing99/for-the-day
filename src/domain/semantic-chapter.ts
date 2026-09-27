import type { Book } from "./reading-plan.js";

export type Translation = "CSB" | "NIV" | "NLT" | "ESV" | "WEBU";
export interface SourceInfo {
	path: string;
	tag?: string;
	style?: string;
	ids?: string[];
	attributes?: Record<string, string | string[]>;
}
export interface VerseIdentity {
	key: string;
	displayLabel: string;
	providerIds: string[];
	orgIds: string[];
	sourceOrdinal: number;
	fragmentNodeIds: string[];
}
export type SemanticNode =
	| {
			id: string;
			kind: "text";
			text: string;
			verseKeys: string[];
			marks: string[];
			source: SourceInfo;
	  }
	| {
			id: string;
			kind: "verse-marker";
			verseKeys: string[];
			label: string;
			source: SourceInfo;
	  }
	| { id: string; kind: "break"; role: "line" | "stanza"; source: SourceInfo }
	| {
			id: string;
			kind: "group";
			role:
				| "section"
				| "heading"
				| "title"
				| "paragraph"
				| "poetry"
				| "stanza"
				| "line"
				| "inline"
				| "unknown";
			level?: number;
			indent?: number;
			children: SemanticNode[];
			source: SourceInfo;
	  };
export interface SemanticChapter {
	schemaVersion: 1;
	identity: {
		translation: Translation;
		book: Book;
		chapter: number;
		provider: "api-bible" | "crossway" | "static";
		providerBibleId: string;
		editionKey: string;
	};
	reference: string;
	nodes: SemanticNode[];
	verses: VerseIdentity[];
	introTitleNodeIds: string[];
	attribution: {
		notice: string;
		translationLabel: string;
		requiredLinks: Array<{ label: string; href: string }>;
	};
	tracking:
		| { kind: "none" }
		| {
				kind: "api-bible-fums";
				version: 3;
				token: string;
				suppliedMetadata: Record<string, unknown>;
		  };
}
export interface LogicalLocation {
	kind: "intro" | "verse";
	translation: Translation;
	verseKey?: string;
	displayLabel?: string;
	orgIds: string[];
	sourceOrdinal?: number;
}
export interface CompleteVerseUnit {
	verseKeys: string[];
	fragmentNodeIds: string[];
	literaryPaths: Array<{ nodeId: string; ancestors: string[] }>;
}

function fail(): never {
	throw new Error("Invalid semantic chapter.");
}
function record(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value))
		return fail();
	return value as Record<string, unknown>;
}
function string(value: unknown): asserts value is string {
	if (typeof value !== "string") fail();
}
function strings(value: unknown): asserts value is string[] {
	if (!Array.isArray(value) || !value.every((item) => typeof item === "string"))
		fail();
}
function oneOf(value: unknown, values: string[]) {
	if (!values.includes(value as string)) fail();
}
function integer(
	value: unknown,
	minimum: number,
	maximum = Number.MAX_SAFE_INTEGER,
) {
	if (
		typeof value !== "number" ||
		!Number.isSafeInteger(value) ||
		value < minimum ||
		value > maximum
	)
		fail();
}

/** Validate both wire shape and the bidirectional text/verse index. Never repairs content. */
export function validateSemanticChapter(
	value: unknown,
): asserts value is SemanticChapter {
	const chapter = record(value);
	if (chapter.schemaVersion !== 1) fail();
	const identity = record(chapter.identity);
	oneOf(identity.translation, ["CSB", "NIV", "NLT", "ESV", "WEBU"]);
	oneOf(identity.book, ["PSA", "PRO"]);
	integer(identity.chapter, 1, identity.book === "PSA" ? 150 : 31);
	oneOf(identity.provider, ["api-bible", "crossway", "static"]);
	if ((identity.translation === "WEBU") !== (identity.provider === "static"))
		fail();
	if ((identity.translation === "ESV") !== (identity.provider === "crossway"))
		fail();
	for (const field of [
		identity.providerBibleId,
		identity.editionKey,
		chapter.reference,
	]) {
		string(field);
		if (!field) fail();
	}
	const attribution = record(chapter.attribution);
	string(attribution.notice);
	string(attribution.translationLabel);
	if (!Array.isArray(attribution.requiredLinks)) fail();
	for (const link of attribution.requiredLinks) {
		const item = record(link);
		string(item.label);
		string(item.href);
		try {
			if (!["https:", "http:"].includes(new URL(item.href).protocol)) fail();
		} catch {
			fail();
		}
	}
	const tracking = record(chapter.tracking);
	oneOf(tracking.kind, ["none", "api-bible-fums"]);
	if (tracking.kind === "api-bible-fums") {
		if (identity.provider !== "api-bible" || tracking.version !== 3) fail();
		string(tracking.token);
		if (!tracking.token) fail();
		record(tracking.suppliedMetadata);
	}
	const nodes = new Map<string, SemanticNode>();
	const textOrder: string[] = [];
	function walk(items: unknown) {
		if (!Array.isArray(items)) fail();
		for (const value of items) {
			const node = record(value);
			string(node.id);
			if (!node.id || nodes.has(node.id)) fail();
			const source = record(node.source);
			string(source.path);
			for (const field of ["tag", "style"])
				if (source[field] !== undefined) string(source[field]);
			if (source.ids !== undefined) strings(source.ids);
			if (source.attributes !== undefined)
				for (const value of Object.values(record(source.attributes))) {
					if (typeof value !== "string") strings(value);
				}
			oneOf(node.kind, ["text", "verse-marker", "break", "group"]);
			nodes.set(node.id, node as unknown as SemanticNode);
			if (node.kind === "text" || node.kind === "verse-marker") {
				strings(node.verseKeys);
				if (new Set(node.verseKeys).size !== node.verseKeys.length) fail();
				if (node.kind === "text") {
					string(node.text);
					strings(node.marks);
					textOrder.push(node.id);
				} else string(node.label);
			} else if (node.kind === "break") oneOf(node.role, ["line", "stanza"]);
			else {
				oneOf(node.role, [
					"section",
					"heading",
					"title",
					"paragraph",
					"poetry",
					"stanza",
					"line",
					"inline",
					"unknown",
				]);
				if (node.level !== undefined) integer(node.level, 0);
				if (node.indent !== undefined) integer(node.indent, 0);
				walk(node.children);
			}
		}
	}
	walk(chapter.nodes);
	if (!Array.isArray(chapter.verses) || chapter.verses.length === 0) fail();
	const verses = new Map<string, VerseIdentity>();
	for (const value of chapter.verses) {
		const verse = record(value);
		string(verse.key);
		string(verse.displayLabel);
		if (!verse.key || !verse.displayLabel || verses.has(verse.key)) fail();
		strings(verse.providerIds);
		strings(verse.orgIds);
		strings(verse.fragmentNodeIds);
		integer(verse.sourceOrdinal, 0);
		if (
			verse.sourceOrdinal !== verses.size ||
			verse.fragmentNodeIds.length === 0
		)
			fail();
		const expected = textOrder.filter((id) => {
			const node = nodes.get(id);
			return (
				node?.kind === "text" && node.verseKeys.includes(verse.key as string)
			);
		});
		if (JSON.stringify(expected) !== JSON.stringify(verse.fragmentNodeIds))
			fail();
		verses.set(verse.key, verse as unknown as VerseIdentity);
	}
	for (const node of nodes.values())
		if (node.kind === "text" || node.kind === "verse-marker") {
			for (const key of node.verseKeys) if (!verses.has(key)) fail();
		}
	// Complete verses cannot interleave independent units in source order.
	const units = completeVerseUnits(value as SemanticChapter);
	const ranks = new Map(
		units.flatMap((unit, index) =>
			unit.verseKeys.map((key) => [key, index] as const),
		),
	);
	let previous = -1;
	for (const id of textOrder) {
		const node = nodes.get(id);
		if (node?.kind !== "text" || !node.verseKeys.length) continue;
		const rank = ranks.get(node.verseKeys[0] ?? "") ?? fail();
		if (rank < previous) fail();
		previous = rank;
	}
	strings(chapter.introTitleNodeIds);
	if (
		new Set(chapter.introTitleNodeIds).size !== chapter.introTitleNodeIds.length
	)
		fail();
	for (const id of chapter.introTitleNodeIds) {
		const node = nodes.get(id);
		if (node?.kind !== "group" || !["title", "heading"].includes(node.role))
			fail();
	}
}

/** Shared text fragments join verse identities transitively into indivisible units. */
export function completeVerseUnits(
	chapter: SemanticChapter,
): CompleteVerseUnit[] {
	const parent = new Map(chapter.verses.map((verse) => [verse.key, verse.key]));
	function root(key: string): string {
		const next = parent.get(key);
		if (next === undefined) return fail();
		if (next === key) return key;
		const result = root(next);
		parent.set(key, result);
		return result;
	}
	const leaves: Array<{
		node: Extract<SemanticNode, { kind: "text" }>;
		ancestors: string[];
	}> = [];
	function walk(nodes: SemanticNode[], ancestors: string[]) {
		for (const node of nodes) {
			if (node.kind === "group") walk(node.children, [...ancestors, node.id]);
			else if (node.kind === "text") {
				leaves.push({ node, ancestors });
				const first = node.verseKeys[0];
				if (first)
					for (const key of node.verseKeys.slice(1))
						parent.set(root(key), root(first));
			}
		}
	}
	walk(chapter.nodes, []);
	const units = new Map<string, CompleteVerseUnit>();
	for (const verse of chapter.verses) {
		const key = root(verse.key);
		const unit = units.get(key) ?? {
			verseKeys: [],
			fragmentNodeIds: [],
			literaryPaths: [],
		};
		unit.verseKeys.push(verse.key);
		units.set(key, unit);
	}
	for (const { node, ancestors } of leaves) {
		const key = node.verseKeys[0];
		if (!key) continue;
		const unit = units.get(root(key)) ?? fail();
		unit.fragmentNodeIds.push(node.id);
		unit.literaryPaths.push({ nodeId: node.id, ancestors });
	}
	return [...units.values()];
}

export function orderedText(nodes: SemanticNode[]): string[] {
	return nodes.flatMap((node) =>
		node.kind === "text"
			? [node.text]
			: node.kind === "group"
				? orderedText(node.children)
				: [],
	);
}
