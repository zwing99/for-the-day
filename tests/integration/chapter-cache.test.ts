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

function esv(chapterNumber = 23, book: "PSA" | "PRO" = "PSA", count = 3) {
	const c = fixture("esv-tests");
	c.identity = {
		translation: "ESV",
		provider: "crossway",
		providerBibleId: "esv",
		editionKey: "esv-tests",
		book,
		chapter: chapterNumber,
	};
	c.tracking = { kind: "none" };
	c.introTitleNodeIds = [];
	c.verses = Array.from({ length: count }, (_, i) => ({
		key: `v${i + 1}`,
		displayLabel: String(i + 1),
		providerIds: [`invented-${i + 1}`],
		orgIds: [],
		sourceOrdinal: i,
		fragmentNodeIds: [`n${i + 1}`],
	}));
	c.nodes = c.verses.map((v) => ({
		id: v.fragmentNodeIds[0]!,
		kind: "text",
		text: `Invented verse ${v.displayLabel}.`,
		verseKeys: [v.key],
		marks: [],
		source: { path: v.fragmentNodeIds[0]! },
	}));
	return c;
}
describe("ESV context and atomic bounds", () => {
	const context = (readingDay: number, timeZone = "UTC") => ({
		readingDay,
		timeZone,
	});
	beforeEach(async () => {
		now = Date.parse("2026-09-23T12:00:00Z");
		// ESV has one shared manifest across revisions. Clear only this test namespace.
		const { Items = [] } = await client.send(
			new ScanCommand({ TableName: table, ConsistentRead: true }),
		);
		const { DeleteCommand } = await import("@aws-sdk/lib-dynamodb");
		for (const item of Items.filter((i) => i.pk.includes("crossway")))
			await client.send(
				new DeleteCommand({ TableName: table, Key: { pk: item.pk } }),
			);
	});
	it("bypasses reads/writes without complete context, outside the plan, or beyond the circular boundary", async () => {
		const c = esv();
		const repo = repository();
		await repo.put(c, context(23));
		for (const ctx of [undefined, context(17), context(24)]) {
			expect(await repo.get(c.identity, ctx)).toBeUndefined();
			expect(await repo.put(c, ctx)).toBe(false);
			let calls = 0;
			const service = new ChapterService(
				{
					fetchChapter: async () => {
						calls++;
						return c;
					},
				},
				repo,
				c.identity,
			);
			expect(await service.get(c.identity, ctx)).toEqual(c);
			expect(calls).toBe(1);
		}
		const service = new ChapterService(
			{
				fetchChapter: async () => {
					throw Error("Unexpected provider access");
				},
			},
			repo,
			c.identity,
		);
		expect(await service.get(c.identity, context(23))).toEqual(c);
	});
	it("uses the server instant in the supplied zone, including wrap and February on the 31-position cycle", async () => {
		const repo = repository();
		const c = esv(119);
		now = Date.parse("2026-02-28T23:30:00Z");
		expect(await repo.put(c, context(31))).toBe(true);
		expect(await repo.get(c.identity, context(29))).toEqual(c);
		now = Date.parse("2026-03-01T00:30:00Z");
		expect(await repo.get(c.identity, context(31, "America/Chicago"))).toEqual(
			c,
		);
		expect(await repo.get(c.identity, context(29))).toEqual(c);
		const wrap = esv(3);
		expect(await repo.put(wrap, context(3))).toBe(true);
		now = Date.parse("2026-03-30T12:00:00Z");
		expect(await repo.put(wrap, context(3))).toBe(true);
		expect(await repo.get(esv(5).identity, context(5))).toBeUndefined();
	});
	it("physically prunes newly ineligible and incompatible-edition entries", async () => {
		const repo = repository();
		const c = esv();
		await repo.put(c, context(23));
		now = Date.parse("2026-09-30T12:00:00Z");
		await repo.maintain(c.identity, context(30));
		expect(
			(
				await client.send(
					new GetCommand({
						TableName: table,
						Key: { pk: chapterKey(c.identity) },
					}),
				)
			).Item,
		).toBeUndefined();
		const changed = esv(30);
		await repo.put(changed, context(30));
		await repo.maintain(
			{ ...changed.identity, editionKey: "new-normalizer" },
			context(30),
		);
		expect(
			(
				await client.send(
					new GetCommand({
						TableName: table,
						Key: { pk: chapterKey(changed.identity) },
					}),
				)
			).Item,
		).toBeUndefined();
	});
	it("enforces per-book and total budgets with complete oldest eviction and metadata retention", async () => {
		const repo = repository();
		const a = esv(23, "PSA", 150);
		const b = esv(24, "PSA", 100);
		const c = esv(23, "PRO", 150);
		await repo.put(a, context(23));
		now++;
		await repo.put(b, context(24));
		expect(await repo.get(a.identity, context(23))).toBeUndefined();
		expect(await repo.get(b.identity, context(24))).toEqual(b);
		now++;
		await repo.put(c, context(23));
		expect(await repo.get(c.identity, context(23))).toEqual(c);
		const d = esv(25, "PSA", 150);
		now++;
		await repo.put(d, context(25));
		expect(await repo.get(b.identity, context(24))).toBeUndefined();
		expect(await repo.get(d.identity, context(25))).toEqual(d);
		expect(await repo.get(c.identity, context(23))).toEqual(c);
	});
	it("concurrent repeated day requests cannot grow beyond either budget", async () => {
		const repo = repository();
		const chapters = [
			esv(23, "PSA", 120),
			esv(24, "PSA", 120),
			esv(23, "PRO", 120),
		];
		await Promise.all(
			chapters.map((c) => repo.put(c, context(c.identity.chapter))),
		);
		const item = (
			await client.send(
				new GetCommand({
					TableName: table,
					Key: { pk: "chapter:1:crossway:manifest" },
				}),
			)
		).Item!;
		expect(
			item.entries.reduce(
				(n: number, e: { verses: number }) => n + e.verses,
				0,
			),
		).toBeLessThanOrEqual(300);
		for (const book of ["PSA", "PRO"])
			expect(
				item.entries
					.filter((e: { book: string }) => e.book === book)
					.reduce((n: number, e: { verses: number }) => n + e.verses, 0),
			).toBeLessThanOrEqual(200);
		for (let i = 0; i < 4; i++) await repo.put(chapters[0]!, context(23));
		const again = (
			await client.send(
				new GetCommand({
					TableName: table,
					Key: { pk: "chapter:1:crossway:manifest" },
				}),
			)
		).Item!;
		expect(
			again.entries.reduce(
				(n: number, e: { verses: number }) => n + e.verses,
				0,
			),
		).toBeLessThanOrEqual(300);
	});
});
