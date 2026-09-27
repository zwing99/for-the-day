import type { Density } from "../domain/card-packing.js";
import type { SemanticChapter } from "../domain/semantic-chapter.js";

declare global {
	interface Window {
		renderWebuFitChapter(
			chapter: SemanticChapter,
			options: {
				density: Density;
				fontSize: "normal" | "large" | "larger";
				rootSize: number;
			},
		): Promise<void>;
	}
}
