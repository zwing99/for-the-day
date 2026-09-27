import { readFile } from "node:fs/promises";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, expect, it } from "vitest";
import {
	Attribution,
	ChapterCards,
} from "../../src/client/semantic-renderer.js";
import {
	orderedText,
	validateSemanticChapter,
} from "../../src/domain/semantic-chapter.js";
import { createApp } from "../../src/server/app.js";
import { DynamoChapterRepository } from "../../src/server/cache/dynamodb-chapters.js";
import { ChapterService } from "../../src/server/chapter-service.js";
import { localDatabase } from "../../src/server/local-db.js";
import {
	ApiBibleProvider,
	normalizeApiBibleChapter,
} from "../../src/server/providers/api-bible.js";

const database = localDatabase();
afterAll(() => {
	database.destroy();
});
it("delivers real CSB through provider, Hono, DynamoDB and React, then avoids the provider on repeat", async () => {
	const bibleId = process.env.API_BIBLE_CSB_ID;
	const apiKey = process.env.API_BIBLE_KEY;
	if (!bibleId || !apiKey)
		throw new Error("Configure direnv provider credentials first.");
	const raw = JSON.parse(
		await readFile(".local/provider-samples/CSB-PSA-23.json", "utf8"),
	);
	const expected = normalizeApiBibleChapter(
		raw,
		{ book: "PSA", chapter: 23 },
		bibleId,
	);
	const provider = new ApiBibleProvider({ apiKey, bibleId });
	let calls = 0;
	const repo = new DynamoChapterRepository({
		client: DynamoDBDocumentClient.from(database, {
			marshallOptions: { removeUndefinedValues: true },
		}),
		table: process.env.DYNAMODB_TABLE ?? "for-the-day-chapters",
	});
	const service = new ChapterService(
		{
			fetchChapter: async (passage) => {
				calls++;
				return provider.fetchChapter(passage);
			},
		},
		repo,
		expected.identity,
	);
	const app = createApp({ CSB: service });
	const first = await app.request("/api/bible/CSB/PSA/23");
	if (first.status !== 200) {
		const failure = await first.json();
		throw new Error(
			`CSB smoke API failure: ${failure.error?.code ?? "unknown"}`,
		);
	}
	expect(first.status).toBe(200);
	const { chapter } = await first.json();
	validateSemanticChapter(chapter);
	const firstCalls = calls;
	expect((await app.request("/api/bible/CSB/PSA/23")).status).toBe(200);
	expect(calls).toBe(firstCalls);
	expect(orderedText(chapter.nodes)).toEqual(orderedText(expected.nodes));
	const html = renderToStaticMarkup(
		<>
			<ChapterCards chapter={chapter} />
			<Attribution chapter={chapter} />
		</>,
	);
	const container = new JSDOM(html).window.document.body;
	expect(
		[...container.querySelectorAll("[data-semantic-text]")].map(
			(node) => node.textContent,
		),
	).toEqual(orderedText(expected.nodes));
	expect(container.querySelectorAll("article")).toHaveLength(6);
	expect(container.querySelector("footer p")?.textContent).toBe(
		expected.attribution.notice,
	);
	// Also exercise the already-running Vite proxy without logging Scripture.
	const response = await fetch("http://127.0.0.1:5173/api/bible/CSB/PSA/23");
	expect(response.status).toBe(200);
	expect(response.headers.get("Cache-Control")).toBe("no-store");
	const wire = await response.json();
	validateSemanticChapter(wire.chapter);
	expect(orderedText(wire.chapter.nodes)).toEqual(orderedText(expected.nodes));
	console.log(
		`CSB smoke passed: ${firstCalls} upstream calls in-process; repeated request used cache; 6 complete React cards conserved exact text.`,
	);
}, 30000);
