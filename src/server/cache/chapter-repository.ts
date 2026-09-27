import type { SemanticChapter } from "../../domain/semantic-chapter.js";
export type ChapterIdentity = SemanticChapter["identity"];
export interface ChapterRepository {
	get(identity: ChapterIdentity): Promise<SemanticChapter | undefined>;
	put(chapter: SemanticChapter): Promise<boolean>;
	maintain(identity: ChapterIdentity): Promise<void>;
}
export class CacheError extends Error {
	constructor() {
		super(
			"Local chapter cache unavailable. Run mise run db:start and mise run db:init.",
		);
		this.name = "CacheError";
	}
}
