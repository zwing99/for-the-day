import type { Passage } from "../domain/reading-plan.js";
import type { SemanticChapter } from "../domain/semantic-chapter.js";
import type {
	CacheContext,
	ChapterIdentity,
	ChapterRepository,
} from "./cache/chapter-repository.js";
import type { BibleProvider } from "./providers/provider.js";
export class ChapterService {
	private readonly pending = new Map<string, Promise<SemanticChapter>>();
	constructor(
		private readonly provider: BibleProvider,
		private readonly repository: ChapterRepository,
		private readonly identity: Omit<ChapterIdentity, "book" | "chapter">,
	) {}
	get(passage: Passage, context?: CacheContext): Promise<SemanticChapter> {
		const identity = { ...this.identity, ...passage };
		const key = JSON.stringify([identity, context]);
		const pending = this.pending.get(key);
		if (pending) return pending;
		const request = this.load(identity, context).finally(() =>
			this.pending.delete(key),
		);
		this.pending.set(key, request);
		return request;
	}
	private async load(
		identity: ChapterIdentity,
		context?: CacheContext,
	): Promise<SemanticChapter> {
		const cached = await this.repository.get(identity, context);
		if (cached) return cached;
		const chapter = await this.provider.fetchChapter({
			book: identity.book,
			chapter: identity.chapter,
		});
		for (const key of Object.keys(identity) as Array<keyof ChapterIdentity>)
			if (identity[key] !== chapter.identity[key])
				throw new Error("Chapter identity mismatch.");
		if (context) await this.repository.put(chapter, context);
		else await this.repository.put(chapter);
		return chapter;
	}
}
