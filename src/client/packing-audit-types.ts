import type { Density, PackedCard } from "../domain/card-packing.js";
import type { SemanticChapter } from "../domain/semantic-chapter.js";

declare global {
	interface Window {
		renderPackingAudit(
			chapter: SemanticChapter,
			density: Density,
		): Promise<void>;
		measurePackingCandidate(
			chapter: SemanticChapter,
			card: PackedCard,
		): { width: number; height: number };
	}
}
