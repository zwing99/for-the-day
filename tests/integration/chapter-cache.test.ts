import { randomUUID } from "node:crypto";
import {
	CreateTableCommand,
	DeleteTableCommand,
	DescribeTimeToLiveCommand,
	UpdateTimeToLiveCommand,
	waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
	ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	CHAPTER_TTL_MS,
	chapterKey,
	DynamoChapterRepository,
} from "../../src/server/cache/dynamodb-chapters.js";
import { ChapterService } from "../../src/server/chapter-service.js";
import { localDatabase } from "../../src/server/local-db.js";
import { semanticFixture } from "../fixtures/semantic-chapter.js";

const database = localDatabase();
const client = DynamoDBDocumentClient.from(database, {
	marshallOptions: { removeUndefinedValues: true },
});
const table = `ftd-test-${randomUUID()}`;
let now = 1000000;
const repository = (options = {}) =>
	new DynamoChapterRepository({ client, table, clock: () => now, ...options });
beforeAll(async () => {
	try {
		await database.send(
			new CreateTableCommand({
				TableName: table,
				BillingMode: "PAY_PER_REQUEST",
				KeySchema: [{ AttributeName: "pk", KeyType: "HASH" }],
				AttributeDefinitions: [{ AttributeName: "pk", AttributeType: "S" }],
			}),
		);
		await waitUntilTableExists(
			{ client: database, maxWaitTime: 20, minDelay: 1, maxDelay: 2 },
			{ TableName: table },
		);
		await database.send(
			new UpdateTimeToLiveCommand({
				TableName: table,
				TimeToLiveSpecification: {
					Enabled: true,
					AttributeName: "expiresEpochSeconds",
				},
			}),
		);
	} catch {
		throw new Error(
			"DynamoDB Local tests require mise run db:start. No AWS endpoint is used.",
		);
	}
}, 30000);
afterAll(async () => {
	await database.send(new DeleteTableCommand({ TableName: table }));
	database.destroy();
});
beforeEach(() => {
	now = 1000000;
});
function fixture(edition: string) {
	const chapter = semanticFixture();
	chapter.identity.editionKey = edition;
	return chapter;
}
describe("DynamoDB whole-chapter repository", () => {
	it("round trips complete text, metadata and semantic structure losslessly", async () => {
		const chapter = fixture("roundtrip");
		const repo = repository();
		expect(await repo.put(chapter)).toBe(true);
		expect(await repo.get(chapter.identity)).toEqual(chapter);
	});
	it("configures native row TTL and writes expiry as Unix seconds", async () => {
		const ttl = await database.send(
			new DescribeTimeToLiveCommand({ TableName: table }),
		);
		expect(ttl.TimeToLiveDescription).toMatchObject({
			AttributeName: "expiresEpochSeconds",
			TimeToLiveStatus: "ENABLED",
		});
		const chapter = fixture("native-ttl");
		await repository().put(chapter);
		const item = (
			await client.send(
				new GetCommand({
					TableName: table,
					Key: { pk: chapterKey(chapter.identity) },
				}),
			)
		).Item;
		expect(item?.expiresEpochSeconds).toBe(
			Math.floor((now + CHAPTER_TTL_MS) / 1000),
		);
	});

	it("isolates translation, book, chapter and edition revisions", async () => {
		const chapter = fixture("isolation");
		const repo = repository();
		await repo.put(chapter);
		for (const identity of [
			{ ...chapter.identity, translation: "NIV" as const },
			{ ...chapter.identity, book: "PRO" as const },
			{ ...chapter.identity, chapter: 24 },
			{ ...chapter.identity, editionKey: "new-revision" },
		])
			expect(await repo.get(identity)).toBeUndefined();
	});
	it("rejects application expiry even while the physical item is retained, then refreshes", async () => {
		const chapter = fixture("expiry");
		const repo = repository();
		await repo.put(chapter);
		now += CHAPTER_TTL_MS - 1;
		expect(await repo.get(chapter.identity)).toEqual(chapter);
		now += 1;
		expect(await repo.get(chapter.identity)).toBeUndefined();
		expect(
			(
				await client.send(
					new GetCommand({
						TableName: table,
						Key: { pk: chapterKey(chapter.identity) },
					}),
				)
			).Item,
		).toBeDefined();
		await repo.put(chapter);
		expect(await repo.get(chapter.identity)).toEqual(chapter);
	});
	it("treats incompatible schema as a miss", async () => {
		const chapter = fixture("schema");
		await client.send(
			new PutCommand({
				TableName: table,
				Item: {
					pk: chapterKey(chapter.identity),
					schemaVersion: 2,
					expiresAt: now + CHAPTER_TTL_MS,
					payload: new Uint8Array([1]),
				},
			}),
		);
		expect(await repository().get(chapter.identity)).toBeUndefined();
	});
	it("bypasses oversized whole chapters without truncation", async () => {
		const chapter = fixture("oversized");
		expect(await repository({ maxRecordBytes: 1 }).put(chapter)).toBe(false);
		expect(await repository().get(chapter.identity)).toBeUndefined();
		expect(chapter).toEqual(fixture("oversized"));
	});
	it("evicts the oldest whole chapter atomically within the edition budget", async () => {
		const first = fixture("eviction");
		const second = fixture("eviction");
		second.identity.chapter = 24;
		const repo = repository({ verseBudget: 4 });
		await repo.put(first);
		now += 1;
		await repo.put(second);
		expect(await repo.get(first.identity)).toBeUndefined();
		expect(await repo.get(second.identity)).toEqual(second);
	});
	it("physically removes expired chapters during maintenance", async () => {
		const chapter = fixture("maintenance");
		const repo = repository();
		await repo.put(chapter);
		now += CHAPTER_TTL_MS;
		await repo.maintain(chapter.identity);
		expect(
			(
				await client.send(
					new GetCommand({
						TableName: table,
						Key: { pk: chapterKey(chapter.identity) },
					}),
				)
			).Item,
		).toBeUndefined();
	});
	it("serves a fresh cached chapter through the service without provider access", async () => {
		const chapter = fixture("service-hit");
		const repo = repository();
		await repo.put(chapter);
		const provider = {
			fetchChapter: async () => {
				throw new Error("Provider must not be called.");
			},
		};
		const service = new ChapterService(provider, repo, chapter.identity);
		expect(await service.get({ book: "PSA", chapter: 23 })).toEqual(chapter);
	});

	it("concurrent admission cannot exceed the verse budget", async () => {
		const first = fixture("concurrent");
		const second = fixture("concurrent");
		second.identity.chapter = 24;
		const repo = repository({ verseBudget: 4 });
		await Promise.all([repo.put(first), repo.put(second)]);
		const results = await Promise.all([
			repo.get(first.identity),
			repo.get(second.identity),
		]);
		expect(results.filter(Boolean)).toHaveLength(1);
		const items =
			(
				await client.send(
					new ScanCommand({ TableName: table, ConsistentRead: true }),
				)
			).Items ?? [];
		const manifest = items.find(
			(item) => item.pk.includes("concurrent") && item.pk.endsWith(":manifest"),
		);
		expect(
			manifest?.entries.reduce(
				(sum: number, item: { verses: number }) => sum + item.verses,
				0,
			),
		).toBe(4);
	});
});
