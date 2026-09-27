import { gunzipSync, gzipSync } from "node:zlib";
import {
	DynamoDBDocumentClient,
	GetCommand,
	TransactWriteCommand,
	type TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import {
	type SemanticChapter,
	validateSemanticChapter,
} from "../../domain/semantic-chapter.js";
import {
	CacheError,
	type ChapterIdentity,
	type ChapterRepository,
} from "./chapter-repository.js";

interface Entry {
	pk: string;
	verses: number;
	retrievedAt: number;
	expiresAt: number;
}
interface Manifest {
	revision: number;
	entries: Entry[];
}
interface Options {
	client: DynamoDBDocumentClient;
	table: string;
	clock?: () => number;
	verseBudget?: number;
	maxRecordBytes?: number;
}
export const CHAPTER_TTL_MS = 86400000;
export function cacheNamespace(identity: ChapterIdentity): string {
	return `chapter:1:${JSON.stringify([identity.provider, identity.translation, identity.providerBibleId, identity.editionKey])}`;
}
export function chapterKey(identity: ChapterIdentity): string {
	return `${cacheNamespace(identity)}:${identity.book}:${identity.chapter}`;
}

/** Whole API.Bible chapters and a conditional per-edition capacity manifest. */
export class DynamoChapterRepository implements ChapterRepository {
	private readonly clock: () => number;
	private readonly budget: number;
	private readonly maxBytes: number;
	constructor(private readonly options: Options) {
		this.clock = options.clock ?? Date.now;
		this.budget = options.verseBudget ?? 400;
		this.maxBytes = options.maxRecordBytes ?? 390000;
		if (
			!Number.isInteger(this.budget) ||
			this.budget < 1 ||
			this.budget > 400 ||
			!Number.isInteger(this.maxBytes) ||
			this.maxBytes < 1 ||
			this.maxBytes > 390000
		)
			throw new CacheError();
	}
	async get(identity: ChapterIdentity): Promise<SemanticChapter | undefined> {
		try {
			const { Item } = await this.options.client.send(
				new GetCommand({
					TableName: this.options.table,
					Key: { pk: chapterKey(identity) },
					ConsistentRead: true,
				}),
			);
			if (
				!Item ||
				Item.schemaVersion !== 1 ||
				typeof Item.expiresAt !== "number" ||
				Item.expiresAt <= this.clock() ||
				!(Item.payload instanceof Uint8Array)
			)
				return undefined;
			const chapter: unknown = JSON.parse(
				gunzipSync(Item.payload, {
					maxOutputLength: 16 * 1024 * 1024,
				}).toString("utf8"),
			);
			validateSemanticChapter(chapter);
			if (JSON.stringify(chapter.identity) !== JSON.stringify(identity)) {
				// Property order is not part of identity.
				for (const key of Object.keys(identity) as Array<keyof ChapterIdentity>)
					if (chapter.identity[key] !== identity[key]) return undefined;
			}
			return chapter;
		} catch {
			throw new CacheError();
		}
	}
	private async manifest(
		identity: ChapterIdentity,
	): Promise<Manifest | undefined> {
		const { Item } = await this.options.client.send(
			new GetCommand({
				TableName: this.options.table,
				Key: { pk: `${cacheNamespace(identity)}:manifest` },
				ConsistentRead: true,
			}),
		);
		if (!Item) return undefined;
		if (
			!Number.isSafeInteger(Item.revision) ||
			!Array.isArray(Item.entries) ||
			Item.entries.some(
				(entry: Entry) =>
					!entry ||
					typeof entry.pk !== "string" ||
					!Number.isInteger(entry.verses) ||
					entry.verses < 1 ||
					!Number.isFinite(entry.retrievedAt) ||
					!Number.isFinite(entry.expiresAt),
			)
		)
			throw new CacheError();
		return Item as unknown as Manifest;
	}
	private async transaction(
		identity: ChapterIdentity,
		previous: Manifest | undefined,
		entries: Entry[],
		changes: NonNullable<TransactWriteCommandInput["TransactItems"]>,
	): Promise<boolean> {
		try {
			await this.options.client.send(
				new TransactWriteCommand({
					TransactItems: [
						...changes,
						{
							Put: {
								TableName: this.options.table,
								Item: {
									pk: `${cacheNamespace(identity)}:manifest`,
									revision: (previous?.revision ?? 0) + 1,
									entries,
								},
								ConditionExpression: previous
									? "#revision = :revision"
									: "attribute_not_exists(pk)",
								...(previous
									? {
											ExpressionAttributeNames: { "#revision": "revision" },
											ExpressionAttributeValues: {
												":revision": previous.revision,
											},
										}
									: {}),
							},
						},
					],
				}),
			);
			return true;
		} catch (error) {
			const failure = error as {
				name?: string;
				CancellationReasons?: Array<{ Code?: string }>;
			};
			if (
				failure.name === "TransactionCanceledException" &&
				failure.CancellationReasons?.some(
					(reason) => reason.Code === "ConditionalCheckFailed",
				)
			)
				return false;
			throw new CacheError();
		}
	}
	async maintain(identity: ChapterIdentity): Promise<void> {
		try {
			for (let attempt = 0; attempt < 20; attempt++) {
				const previous = await this.manifest(identity);
				if (!previous) return;
				const expired = previous.entries
					.filter((entry) => entry.expiresAt <= this.clock())
					.slice(0, 98);
				if (!expired.length) return;
				const keys = new Set(expired.map((entry) => entry.pk));
				const success = await this.transaction(
					identity,
					previous,
					previous.entries.filter((entry) => !keys.has(entry.pk)),
					expired.map((entry) => ({
						Delete: { TableName: this.options.table, Key: { pk: entry.pk } },
					})),
				);
				if (success && expired.length < 98) return;
			}
			throw new CacheError();
		} catch {
			throw new CacheError();
		}
	}
	async put(chapter: SemanticChapter): Promise<boolean> {
		try {
			validateSemanticChapter(chapter);
			// ESV admission requires a separate eligibility/capacity policy in its later slice.
			if (chapter.identity.provider !== "api-bible") throw new CacheError();
			const payload = gzipSync(Buffer.from(JSON.stringify(chapter), "utf8"));
			const pk = chapterKey(chapter.identity);
			const now = this.clock();
			const count = chapter.verses.length;
			// Include conservative space for attribute names, keys, numbers and binary metadata.
			if (
				payload.byteLength + Buffer.byteLength(pk) + 1024 > this.maxBytes ||
				count > this.budget
			)
				return false;
			await this.maintain(chapter.identity);
			for (let attempt = 0; attempt < 8; attempt++) {
				const previous = await this.manifest(chapter.identity);
				const existing = (previous?.entries ?? [])
					.filter((entry) => entry.pk !== pk)
					.sort(
						(a, b) => a.retrievedAt - b.retrievedAt || a.pk.localeCompare(b.pk),
					);
				const evicted: Entry[] = [];
				let total =
					existing.reduce((sum, entry) => sum + entry.verses, 0) + count;
				while (total > this.budget) {
					const entry = existing.shift();
					if (!entry) throw new CacheError();
					total -= entry.verses;
					evicted.push(entry);
				}
				// Prune in bounded transactions before admission when there are many tiny chapters.
				if (evicted.length > 97) {
					const batch = evicted.slice(0, 98);
					const keys = new Set(batch.map((entry) => entry.pk));
					await this.transaction(
						chapter.identity,
						previous,
						(previous?.entries ?? []).filter((entry) => !keys.has(entry.pk)),
						batch.map((entry) => ({
							Delete: { TableName: this.options.table, Key: { pk: entry.pk } },
						})),
					);
					continue;
				}
				const entry = {
					pk,
					verses: count,
					retrievedAt: now,
					expiresAt: now + CHAPTER_TTL_MS,
				};
				const success = await this.transaction(
					chapter.identity,
					previous,
					[...existing, entry],
					[
						...evicted.map((entry) => ({
							Delete: { TableName: this.options.table, Key: { pk: entry.pk } },
						})),
						{
							Put: {
								TableName: this.options.table,
								Item: {
									...entry,
									schemaVersion: 1,
									expiresEpochSeconds: Math.floor(entry.expiresAt / 1000),
									provider: chapter.identity.provider,
									payload,
								},
							},
						},
					],
				);
				if (success) return true;
			}
			throw new CacheError();
		} catch {
			throw new CacheError();
		}
	}
}
