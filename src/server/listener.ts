import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { DynamoChapterRepository } from "./cache/dynamodb-chapters.js";
import { ChapterService } from "./chapter-service.js";
import { localDatabase } from "./local-db.js";
import { ApiBibleProvider } from "./providers/api-bible.js";

const port = Number(process.env.API_PORT ?? 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535)
	throw new Error("API_PORT must be a valid port.");
const database = localDatabase();
const repository = new DynamoChapterRepository({
	client: DynamoDBDocumentClient.from(database, {
		marshallOptions: { removeUndefinedValues: true },
	}),
	table: process.env.DYNAMODB_TABLE ?? "for-the-day-chapters",
});
const bibleId = process.env.API_BIBLE_CSB_ID ?? "unconfigured";
const identity = {
	translation: "CSB" as const,
	provider: "api-bible" as const,
	providerBibleId: bibleId,
	editionKey: `api-bible-v2:${bibleId}:normalizer-1`,
};
const service = new ChapterService(
	new ApiBibleProvider({
		apiKey: process.env.API_BIBLE_KEY,
		bibleId: process.env.API_BIBLE_CSB_ID,
	}),
	repository,
	identity,
);
const maintenance = setInterval(() => {
	repository.maintain({ ...identity, book: "PSA", chapter: 1 }).catch(() => {
		console.error("Local cache maintenance unavailable; check database setup.");
	});
}, 60000);
maintenance.unref();
const server = serve({
	fetch: createApp({ CSB: service }).fetch,
	hostname: "127.0.0.1",
	port,
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.once(signal, () => {
		clearInterval(maintenance);
		server.close(() => database.destroy());
	});
}
