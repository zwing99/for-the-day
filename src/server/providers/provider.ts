import type { Passage } from "../../domain/reading-plan.js";
import type { SemanticChapter } from "../../domain/semantic-chapter.js";
export type ProviderErrorCode =
	| "configuration"
	| "not-found"
	| "access-denied"
	| "rate-limit"
	| "provider-unavailable"
	| "normalization";
export class ProviderError extends Error {
	constructor(
		public readonly code: ProviderErrorCode,
		public readonly retryAfterSeconds?: number,
	) {
		super(`Scripture provider failure: ${code}.`);
		this.name = "ProviderError";
	}
}
export interface BibleProvider {
	fetchChapter(
		passage: Passage,
		signal?: AbortSignal,
	): Promise<SemanticChapter>;
}
