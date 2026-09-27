import { type Density, type PackedCard, verseCards } from "./card-packing.js";
import type { SemanticChapter, SemanticNode } from "./semantic-chapter.js";

export interface PackingUnit {
	card: PackedCard;
	boundaryBefore: boolean;
	naturalGroup?: string;
}
export interface CandidateGeometry {
	width: number;
	height: number;
}
export function combinePackingCards(cards: PackedCard[]): PackedCard {
	return {
		key: cards.map((card) => card.key).join("/"),
		nodeIds: cards.flatMap((card) => card.nodeIds),
		verseKeys: cards.flatMap((card) => card.verseKeys),
		...(cards.length === 1 && cards[0]?.indivisible
			? { indivisible: true }
			: {}),
	};
}
/** Source boundaries are independent of estimates and typography. Unknown structures
 * remain atomic; a newly attached section heading begins a fresh page. Paragraphs
 * and stanzas retain their renderer associations but allow complete-verse breaks. */
export function packingUnits(chapter: SemanticChapter): PackingUnit[] {
	const paths = new Map<string, SemanticNode[]>();
	function walk(nodes: SemanticNode[], parents: SemanticNode[]) {
		for (const node of nodes) {
			paths.set(node.id, parents);
			if (node.kind === "group") walk(node.children, [...parents, node]);
		}
	}
	walk(chapter.nodes, []);
	const units: PackingUnit[] = [];
	const unknownKeys = new Map<PackingUnit, string>();
	for (const card of verseCards(chapter)) {
		const parents = card.nodeIds.flatMap((id) => paths.get(id) ?? []);
		const unknown = parents.find(
			(node) => node.kind === "group" && node.role === "unknown",
		);
		const natural = [...parents]
			.reverse()
			.find(
				(node) =>
					node.kind === "group" && ["paragraph", "stanza"].includes(node.role),
			);
		const heading = parents.some(
			(node) =>
				node.kind === "group" && ["heading", "title"].includes(node.role),
		);
		const prior = units.at(-1);
		if (unknown && prior && unknownKeys.get(prior) === unknown.id) {
			prior.card = {
				...combinePackingCards([prior.card, card]),
				indivisible: true,
			};
			continue;
		}
		const unit = {
			card: unknown ? { ...card, indivisible: true } : card,
			boundaryBefore: heading || !!unknown || !!prior?.card.indivisible,
			naturalGroup: natural?.id,
		};
		if (unknown) unknownKeys.set(unit, unknown.id);
		units.push(unit);
	}
	return units;
}

/** At selected type, grow ordered complete candidates up to the density target.
 * Only the first atomic unit may exceed the target. Prefer a fitting complete
 * paragraph or stanza when the current page already contains multiple units;
 * never leave an eligible singleton. Measuring composed content preserves the
 * renderer's shared paragraphs and stanza spacing. */
export function measuredPackChapter(
	units: PackingUnit[],
	density: Density,
	available: CandidateGeometry,
	measure: (card: PackedCard) => CandidateGeometry,
): PackedCard[] {
	if (!(available.width > 0 && available.height > 0))
		throw new RangeError("Invalid measured capacity.");
	if (density === "Spacious") return units.map((unit) => unit.card);
	const target = available.height * (density === "Balanced" ? 0.8 : 0.95);
	const output: PackedCard[] = [];
	let offset = 0;
	while (offset < units.length) {
		let end = offset + 1;
		let selected = units[offset]!.card;
		while (
			end < units.length &&
			!units[end]!.boundaryBefore &&
			!selected.indivisible
		) {
			const previousUnit = units[end - 1]!;
			const nextUnit = units[end]!;
			if (previousUnit.naturalGroup !== nextUnit.naturalGroup) {
				let groupEnd = end + 1;
				while (
					groupEnd < units.length &&
					!units[groupEnd]!.boundaryBefore &&
					units[groupEnd]!.naturalGroup === nextUnit.naturalGroup
				)
					groupEnd++;
				const wholeGroup = combinePackingCards(
					units.slice(end, groupEnd).map((unit) => unit.card),
				);
				const wholeAlone = measure(wholeGroup);
				const wholeWithPage = measure(
					combinePackingCards([
						...units.slice(offset, end).map((unit) => unit.card),
						wholeGroup,
					]),
				);
				const firstWithPage = measure(
					combinePackingCards([
						...units.slice(offset, end).map((unit) => unit.card),
						nextUnit.card,
					]),
				);
				// When the current page already has a group, keep a fitting paragraph or
				// stanza whole if its opening verse would fit here but the whole group would not.
				// A one-unit page always grows whenever its next compatible unit fits.
				if (
					end - offset >= 2 &&
					wholeAlone.width <= available.width &&
					wholeAlone.height <= target &&
					firstWithPage.width <= available.width &&
					firstWithPage.height <= target &&
					(wholeWithPage.width > available.width ||
						wholeWithPage.height > target)
				)
					break;
			}
			const candidate = combinePackingCards(
				units.slice(offset, end + 1).map((unit) => unit.card),
			);
			const geometry = measure(candidate);
			if (geometry.width > available.width || geometry.height > target) break;
			selected = candidate;
			end++;
		}
		output.push(selected);
		offset = end;
	}
	return output;
}
