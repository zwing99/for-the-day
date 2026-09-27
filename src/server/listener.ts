import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import type { ChapterIdentity } from "./cache/chapter-repository.js";
import { DynamoChapterRepository } from "./cache/dynamodb-chapters.js";
import { ChapterService } from "./chapter-service.js";
import { contentRevision } from "./content-revision.js";
import { localDatabase } from "./local-db.js";
import { ApiBibleProvider } from "./providers/api-bible.js";
import { CROSSWAY_EDITION, CrosswayProvider } from "./providers/crossway.js";
import { localResponseCache } from "./providers/local-response-cache.js";

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
const developmentFetch = localResponseCache();
const identities: Array<Omit<ChapterIdentity, "book" | "chapter">> = [];
const services: Partial<Record<"CSB" | "NIV" | "NLT" | "ESV", ChapterService>> =
	{};
for (const translation of ["CSB", "NIV", "NLT"] as const) {
	const bibleId = process.env[`API_BIBLE_${translation}_ID`];
	const identity = {
		translation,
		provider: "api-bible" as const,
		providerBibleId: bibleId ?? "unconfigured",
		editionKey: `api-bible-v2:${bibleId ?? "unconfigured"}:normalizer-2`,
	};
	identities.push(identity);
	services[translation] = new ChapterService(
		new ApiBibleProvider({
			apiKey: process.env.API_BIBLE_KEY,
			fetch: developmentFetch,
			bibleId,
			translation,
		}),
		repository,
		identity,
	);
}
const esvIdentity = {
	translation: "ESV" as const,
	provider: "crossway" as const,
	providerBibleId: "esv",
	editionKey: CROSSWAY_EDITION,
};
identities.push(esvIdentity);
services.ESV = new ChapterService(
	new CrosswayProvider({ apiKey: process.env.CROSSWAY_KEY }),
	repository,
	esvIdentity,
);
const maintenance = setInterval(() => {
	Promise.all(
		identities.map((identity) =>
			repository.maintain({ ...identity, book: "PSA", chapter: 1 }),
		),
	).catch(() => {
		console.error("Local cache maintenance unavailable; check database setup.");
	});
}, 60000);
maintenance.unref();
const server = serve({
	fetch: createApp(services, contentRevision(identities)).fetch,
	hostname: "127.0.0.1",
	port,
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.once(signal, () => {
		clearInterval(maintenance);
		server.close(() => database.destroy());
	});
}
