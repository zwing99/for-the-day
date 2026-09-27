import type { SemanticChapter } from "../../domain/semantic-chapter.js";
export interface CacheContext {
	readingDay: number;
	timeZone: string;
}
export type ChapterIdentity = SemanticChapter["identity"];
export interface ChapterRepository {
	get(
		identity: ChapterIdentity,
		context?: CacheContext,
	): Promise<SemanticChapter | undefined>;
	put(chapter: SemanticChapter, context?: CacheContext): Promise<boolean>;
	maintain(identity: ChapterIdentity, context?: CacheContext): Promise<void>;
}
export class CacheError extends Error {
	constructor() {
		super(
			"Local chapter cache unavailable. Run mise run db:start and mise run db:init.",
		);
		this.name = "CacheError";
	}
}
