import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { localDatabase } from "./local-db.js";
import { localResponseCache } from "./providers/local-response-cache.js";
import { createChapterServices } from "./services.js";

const port = Number(process.env.API_PORT ?? 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535)
	throw new Error("API_PORT must be a valid port.");
const database = localDatabase();
const { services, identities, repository, revision } = createChapterServices({
	client: DynamoDBDocumentClient.from(database, {
		marshallOptions: { removeUndefinedValues: true },
	}),
	table: process.env.DYNAMODB_TABLE ?? "for-the-day-chapters",
	configuration: {
		apiBibleKey: process.env.API_BIBLE_KEY,
		csbId: process.env.API_BIBLE_CSB_ID,
		nivId: process.env.API_BIBLE_NIV_ID,
		nltId: process.env.API_BIBLE_NLT_ID,
		crosswayKey: process.env.CROSSWAY_KEY,
	},
	providerFetch: localResponseCache(),
});
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
	fetch: createApp(services, revision).fetch,
	hostname: "127.0.0.1",
	port,
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.once(signal, () => {
		clearInterval(maintenance);
		server.close(() => database.destroy());
	});
}
