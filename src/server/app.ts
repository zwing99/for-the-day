import { Hono } from "hono";
import type { Passage } from "../domain/reading-plan.js";
import type {
	SemanticChapter,
	Translation,
} from "../domain/semantic-chapter.js";
import type { CacheContext } from "./cache/chapter-repository.js";
import { CacheError } from "./cache/chapter-repository.js";
import { ProviderError } from "./providers/provider.js";

interface ChapterSource {
	get(passage: Passage, context?: CacheContext): Promise<SemanticChapter>;
}
export function createApp(
	services: Partial<Record<Translation, ChapterSource>> = {},
	revision = "unconfigured",
) {
	const app = new Hono();
	app.use("/api/*", async (c, next) => {
		c.header("Cache-Control", "no-store");
		await next();
	});
	app.get("/api/health", (c) => c.json({ status: "ok" }));
	app.get("/api/content-configuration", (c) => c.json({ revision }));
	app.get("/api/bible/:translation/:book/:chapter", async (c) => {
		const { translation, book, chapter } = c.req.param();
		const readingDay = c.req.query("readingDay");
		const timeZone = c.req.query("timeZone");
		let validContext = true;
		if (
			readingDay !== undefined &&
			!/^(?:[1-9]|[12]\d|3[01])$/.test(readingDay)
		)
			validContext = false;
		if (timeZone !== undefined) {
			try {
				new Intl.DateTimeFormat("en-US", { timeZone });
				if (!timeZone) validContext = false;
			} catch {
				validContext = false;
			}
		}
		if (
			!["CSB", "NIV", "NLT", "ESV"].includes(translation) ||
			!["PSA", "PRO"].includes(book) ||
			!/^[1-9]\d*$/.test(chapter) ||
			Number(chapter) > (book === "PSA" ? 150 : 31) ||
			!validContext
		)
			return c.json(
				{
					error: {
						code: "invalid-request",
						message:
							"Choose a supported translation, passage, and valid reading context.",
					},
				},
				400,
			);
		const service = services[translation as Translation];
		if (!service)
			return c.json(
				{
					error: {
						code: "configuration",
						message:
							"Configure this translation's server credentials and edition ID.",
					},
				},
				503,
			);
		return c.json({
			revision,
			chapter: await service.get(
				{
					book: book as Passage["book"],
					chapter: Number(chapter),
				},
				readingDay !== undefined && timeZone !== undefined
					? { readingDay: Number(readingDay), timeZone }
					: undefined,
			),
		});
	});
	app.onError((error, c) => {
		if (error instanceof CacheError)
			return c.json(
				{ error: { code: "cache-unavailable", message: error.message } },
				503,
			);
		if (error instanceof ProviderError) {
			const status =
				error.code === "not-found"
					? 404
					: error.code === "rate-limit"
						? 429
						: error.code === "normalization"
							? 502
							: 503;
			const messages = {
				configuration:
					"Configure this translation's server credentials and edition ID.",
				"not-found": "This chapter is unavailable.",
				"access-denied": "The provider account cannot access this edition.",
				"rate-limit":
					"The provider request limit was reached. Please wait before retrying.",
				"provider-unavailable":
					"The Scripture provider is temporarily unavailable.",
				normalization:
					"The provider response could not be displayed faithfully.",
			};
			if (error.retryAfterSeconds !== undefined)
				c.header("Retry-After", String(error.retryAfterSeconds));
			return c.json(
				{
					error: {
						code: error.code,
						message: messages[error.code],
						...(error.retryAfterSeconds === undefined
							? {}
							: { retryAfterSeconds: error.retryAfterSeconds }),
					},
				},
				status,
			);
		}
		return c.json(
			{
				error: {
					code: "internal-error",
					message: "The local API could not complete this request.",
				},
			},
			500,
		);
	});
	return app;
}
