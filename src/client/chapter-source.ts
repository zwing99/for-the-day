import type { Passage } from "../domain/reading-plan.js";
import {
	type SemanticChapter,
	type Translation,
	validateSemanticChapter,
} from "../domain/semantic-chapter.js";
export const chapterRevisions = new WeakMap<SemanticChapter, string>();
export class ChapterLoadError extends Error {
	constructor(
		public readonly code: string,
		message: string,
		public readonly retryAfterSeconds?: number,
	) {
		super(message);
	}
}
export interface ChapterSource {
	get(
		passage: Passage,
		signal: AbortSignal,
		context?: {
			translation: Translation;
			readingDay: number;
			timeZone: string;
		},
	): Promise<SemanticChapter>;
}
export const networkChapterSource: ChapterSource = {
	async get(passage, signal, context) {
		const translation = context?.translation ?? "CSB";
		const query = context
			? `?${new URLSearchParams({ readingDay: String(context.readingDay), timeZone: context.timeZone })}`
			: "";
		let response: Response;
		try {
			response = await fetch(
				`/api/bible/${translation}/${passage.book}/${passage.chapter}${query}`,
				{ signal, cache: "no-store" },
			);
		} catch {
			if (signal.aborted) throw new DOMException("Cancelled.", "AbortError");
			throw new ChapterLoadError(
				navigator.onLine === false ? "offline" : "network",
				navigator.onLine === false
					? "Scripture requires a connection. Reconnect, then try again."
					: "Connect to the local server, then try again.",
			);
		}
		let body;
		try {
			body = await response.json();
		} catch {
			if (signal.aborted) throw new DOMException("Cancelled.", "AbortError");
			const limited = response.status === 429;
			const retryHeader = response.headers.get("retry-after");
			const retrySeconds =
				retryHeader && /^\d+$/.test(retryHeader)
					? Number(retryHeader)
					: undefined;
			throw new ChapterLoadError(
				limited ? "rate-limit" : "unavailable",
				limited
					? "The provider request limit was reached. Please wait before retrying."
					: "Scripture is temporarily unavailable. Please try again.",
				limited && retrySeconds !== undefined && Number.isFinite(retrySeconds)
					? retrySeconds
					: undefined,
			);
		}
		if (!response.ok) {
			const messages: Record<string, string> = {
				configuration:
					"Configure the selected translation's provider credentials on the server.",
				"cache-unavailable":
					"Start the local database with mise run db:start and mise run db:init.",
				"rate-limit":
					"The provider request limit was reached. Please wait before retrying.",
				"access-denied": "Your provider account cannot access this edition.",
				"not-found": "This chapter is unavailable.",
				normalization: "This chapter could not be displayed faithfully.",
			};
			const code =
				typeof body?.error?.code === "string" ? body.error.code : "unavailable";
			const delay = body?.error?.retryAfterSeconds;
			throw new ChapterLoadError(
				code,
				messages[code] ??
					"Scripture is temporarily unavailable. Please try again.",
				typeof delay === "number" && Number.isFinite(delay) && delay >= 0
					? delay
					: undefined,
			);
		}
		try {
			validateSemanticChapter(body.chapter);
		} catch {
			throw new ChapterLoadError(
				"normalization",
				"This chapter could not be displayed faithfully.",
			);
		}
		if (
			body.chapter.identity.translation !== translation ||
			body.chapter.identity.book !== passage.book ||
			body.chapter.identity.chapter !== passage.chapter
		)
			throw new ChapterLoadError(
				"normalization",
				"The requested chapter could not be verified.",
			);
		if (typeof body.revision === "string" && body.revision)
			chapterRevisions.set(body.chapter, body.revision);
		return body.chapter;
	},
};
