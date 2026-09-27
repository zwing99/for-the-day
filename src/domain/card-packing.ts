import {
	completeVerseUnits,
	type SemanticChapter,
	type SemanticNode,
} from "./semantic-chapter.js";
export type Density = "Spacious" | "Balanced" | "Compact";
export interface LayoutBudget {
	columns: number;
	lines: number;
}
export interface PackedCard {
	key: string;
	nodeIds: string[];
	verseKeys: string[];
	oversized?: boolean;
}

/** Split only at complete-verse boundaries, preserving the source node sequence. */
export function splitPackedCard(
	card: PackedCard,
	atomicCards: PackedCard[],
): PackedCard[] | undefined {
	const units = atomicCards.filter((unit) =>
		unit.verseKeys.some((key) => card.verseKeys.includes(key)),
	);
	if (units.length < 2) return undefined;
	if (
		JSON.stringify(units.flatMap((unit) => unit.nodeIds)) !==
			JSON.stringify(card.nodeIds) ||
		JSON.stringify(units.flatMap((unit) => unit.verseKeys)) !==
			JSON.stringify(card.verseKeys)
	)
		return undefined;
	const midpoint = Math.ceil(units.length / 2);
	return [units.slice(0, midpoint), units.slice(midpoint)].map((part) => ({
		key: part.map((unit) => unit.key).join("/"),
		nodeIds: part.flatMap((unit) => unit.nodeIds),
		verseKeys: part.flatMap((unit) => unit.verseKeys),
	}));
}

/** Reduce measured overflowing groups before fitting any individual verse. */
export function reduceOverflowingGroups(
	cards: PackedCard[],
	atomicCards: PackedCard[],
	overflowingKeys: Set<string>,
): PackedCard[] | undefined {
	let changed = false;
	const result = cards.flatMap((card) => {
		if (!overflowingKeys.has(card.key)) return [card];
		const split = splitPackedCard(card, atomicCards);
		if (!split) return [card];
		changed = true;
		return split;
	});
	return changed ? result : undefined;
}

export function layoutBudget(
	width: number,
	height: number,
	fontSize: number,
	lineHeight: number,
	reserved = 160,
): LayoutBudget {
	if (
		![width, height, fontSize, lineHeight, reserved].every(Number.isFinite) ||
		width <= 0 ||
		height <= 0 ||
		fontSize <= 0 ||
		lineHeight <= 0 ||
		reserved < 0
	)
		throw new RangeError("Invalid reading layout.");
	return {
		columns: Math.max(
			12,
			Math.min(65, Math.floor(width / (fontSize * 0.52) / 4) * 4),
		),
		lines: Math.max(4, Math.floor((height - reserved) / lineHeight / 4) * 4),
	};
}
export function verseCards(chapter: SemanticChapter): PackedCard[] {
	const units = completeVerseUnits(chapter);
	const cards = units.map((unit) => ({
		key: unit.verseKeys.join("|"),
		nodeIds: [] as string[],
		verseKeys: unit.verseKeys,
	}));
	const membership = new Map(
		units.flatMap((unit, i) =>
			unit.fragmentNodeIds.map((id) => [id, i] as const),
		),
	);
	const leaves: SemanticNode[] = [];
	function walk(nodes: SemanticNode[]) {
		for (const node of nodes) {
			if (node.kind === "group" && node.children.length) walk(node.children);
			else leaves.push(node);
		}
	}
	walk(chapter.nodes);
	let next = cards.length - 1;
	for (let i = leaves.length - 1; i >= 0; i--) {
		const leaf = leaves[i]!;
		next = membership.get(leaf.id) ?? next;
		cards[next]?.nodeIds.unshift(leaf.id);
	}
	return cards;
}

export function packChapter(
	chapter: SemanticChapter,
	density: Density,
	budget: LayoutBudget,
): PackedCard[] {
	if (!["Spacious", "Balanced", "Compact"].includes(density))
		throw new RangeError("Invalid reading density.");
	if (
		!Number.isFinite(budget.columns) ||
		budget.columns < 1 ||
		!Number.isFinite(budget.lines) ||
		budget.lines < 1
	)
		throw new RangeError("Invalid reading budget.");
	const units = verseCards(chapter);
	const nodes = new Map<string, SemanticNode>();
	const ancestors = new Map<string, string[]>();
	function walk(items: SemanticNode[], path: string[]) {
		for (const node of items) {
			nodes.set(node.id, node);
			ancestors.set(node.id, path);
			if (node.kind === "group") walk(node.children, [...path, node.id]);
		}
	}
	walk(chapter.nodes, []);
	function cost(card: PackedCard) {
		const blocks = new Map<
			string,
			{ characters: number; indent: number; heading: boolean }
		>();
		let breaks = 0;
		for (const id of card.nodeIds) {
			const node = nodes.get(id)!;
			if (
				node.kind === "break" ||
				(node.kind === "group" && node.role === "stanza")
			)
				breaks++;
			if (node.kind !== "text") continue;
			const path = ancestors.get(id) ?? [];
			const blockId =
				[...path].reverse().find((parent) => {
					const n = nodes.get(parent)!;
					return (
						n.kind === "group" &&
						["line", "paragraph", "heading", "title"].includes(n.role)
					);
				}) ?? card.key;
			const blockNode = nodes.get(blockId);
			const block = blocks.get(blockId) ?? {
				characters: 0,
				indent: blockNode?.kind === "group" ? (blockNode.indent ?? 0) : 0,
				heading:
					blockNode?.kind === "group" &&
					["heading", "title"].includes(blockNode.role),
			};
			block.characters += node.text.length;
			blocks.set(blockId, block);
		}
		return (
			breaks +
			[...blocks.values()].reduce(
				(sum, block) =>
					sum +
					Math.max(
						1,
						Math.ceil(
							block.characters / Math.max(8, budget.columns - block.indent * 2),
						),
					) +
					(block.heading ? 2 : 0),
				0,
			) +
			1
		);
	}
	const limit = budget.lines * (density === "Compact" ? 0.85 : 0.55);
	if (density === "Spacious")
		return units.map((card) => ({
			...card,
			oversized: cost(card) > budget.lines,
		}));
	function naturalKey(card: PackedCard) {
		for (const id of card.nodeIds) {
			const node = nodes.get(id)!;
			if (node.kind !== "text" || !node.verseKeys.length) continue;
			return (
				[...(ancestors.get(id) ?? [])].reverse().find((parent) => {
					const n = nodes.get(parent)!;
					return (
						n.kind === "group" &&
						["paragraph", "stanza", "unknown"].includes(n.role)
					);
				}) ?? card.key
			);
		}
		return card.key;
	}
	const groups: PackedCard[][] = [];
	for (const unit of units) {
		const prior = groups.at(-1);
		if (prior && naturalKey(prior.at(-1)!) === naturalKey(unit))
			prior.push(unit);
		else groups.push([unit]);
	}
	const output: PackedCard[] = [];
	let pending: PackedCard[] = [];
	const combine = (cards: PackedCard[]): PackedCard => ({
		key: cards.map((c) => c.key).join("/"),
		nodeIds: cards.flatMap((c) => c.nodeIds),
		verseKeys: cards.flatMap((c) => c.verseKeys),
	});
	function flush() {
		if (pending.length) {
			const card = combine(pending);
			output.push({ ...card, oversized: cost(card) > budget.lines });
			pending = [];
		}
	}
	for (const group of groups) {
		const whole = combine(group);
		const parent = nodes.get(naturalKey(group[0]!));
		if (parent?.kind === "group" && parent.role === "unknown") {
			flush();
			output.push({ ...whole, oversized: cost(whole) > budget.lines });
			continue;
		}
		if (cost(whole) <= limit) {
			if (pending.length && cost(combine([...pending, ...group])) > limit)
				flush();
			pending.push(...group);
		} else {
			flush();
			for (const unit of group) {
				if (pending.length && cost(combine([...pending, unit])) > limit)
					flush();
				pending.push(unit);
				if (cost(unit) > limit) flush();
			}
			flush();
		}
	}
	flush();
	return output;
}
