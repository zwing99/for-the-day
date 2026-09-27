import { afterEach, expect, it, vi } from "vitest";
import {
	BrowserChapterRepository,
	type ChapterStorage,
	memoryChapterStorage,
} from "../../../src/client/chapter-cache.js";
import {
	canonicalVerseCount,
	retentionFits,
} from "../../../src/domain/chapter-retention.js";
import { cacheFixture } from "../../fixtures/cache-chapter.js";
import { semanticFixture } from "../../fixtures/semantic-chapter.js";

const repositories: BrowserChapterRepository[] = [];
function repo(
	storage = memoryChapterStorage(),
	clock: () => number = Date.now,
) {
	const r = new BrowserChapterRepository(storage, clock);
	repositories.push(r);
	return r;
}
afterEach(() => {
	for (const r of repositories.splice(0)) r.dispose();
	vi.useRealTimers();
});
it.each([
	["CSB", 86400000],
	["ESV", 3600000],
] as const)(
	"preserves %s metadata across reopening until exact fixed expiry",
	async (translation, ttl) => {
		let now = 1000;
		const storage = memoryChapterStorage();
		const r = repo(storage, () => now);
		await r.observe("r1");
		const c = cacheFixture(translation);
		await r.put(c, "r1");
		now += ttl - 1;
		const reopened = repo(storage, () => now);
		expect(await reopened.get(c.identity, translation, "r1")).toEqual(c);
		now++;
		expect(await reopened.get(c.identity, translation, "r1")).toBeUndefined();
		expect(await storage.update((s) => s.entries.length)).toBe(0);
	},
);
it("accounts merged spans and partial verse duplicates canonically", () => {
	const c = semanticFixture();
	expect(canonicalVerseCount(c)).toBe(4);
	c.verses[2]!.orgIds = ["PSA.23.3-8"];
	expect(canonicalVerseCount(c)).toBe(8);
	expect(retentionFits([cacheFixture("ESV", 1, 201)], "ESV")).toBe(false);
	expect(
		retentionFits(
			[cacheFixture("ESV", 1, 180), cacheFixture("ESV", 2, 121, "PRO")],
			"ESV",
		),
	).toBe(false);
	expect(
		retentionFits(
			[cacheFixture("ESV", 1, 180), cacheFixture("ESV", 2, 120, "PRO")],
			"ESV",
		),
	).toBe(true);
});
it("evicts whole LRU chapters per translation and rejects oversized admission", async () => {
	let now = 1;
	const storage = memoryChapterStorage();
	const r = repo(storage, () => now++);
	await r.observe("r");
	for (const c of [cacheFixture("CSB", 1, 180), cacheFixture("CSB", 2, 180)])
		await r.put(c, "r");
	await r.get({ book: "PSA", chapter: 1 }, "CSB", "r");
	await r.put(cacheFixture("CSB", 3, 100), "r");
	expect(await r.get({ book: "PSA", chapter: 2 }, "CSB", "r")).toBeUndefined();
	expect(await r.get({ book: "PSA", chapter: 1 }, "CSB", "r")).toBeDefined();
	await r.put(cacheFixture("NIV", 4, 401), "r");
	expect(await r.get({ book: "PSA", chapter: 4 }, "NIV", "r")).toBeUndefined();
});
it("reconciles another tab's eviction without serving a memory copy", async () => {
	const storage = memoryChapterStorage();
	const a = repo(storage);
	const b = repo(storage);
	await a.observe("r");
	await a.put(cacheFixture("ESV", 1, 150), "r");
	await b.put(cacheFixture("ESV", 2, 150), "r");
	expect(await a.get({ book: "PSA", chapter: 1 }, "ESV", "r")).toBeUndefined();
});
it("discards corruption, future timestamps, and incompatible revisions", async () => {
	const storage = memoryChapterStorage();
	const r = repo(storage, () => 100);
	await r.observe("r");
	await r.put(cacheFixture(), "r");
	await storage.update((s) => {
		s.entries[0]!.retrievedAt = 101;
	});
	expect(await r.get({ book: "PSA", chapter: 23 }, "CSB", "r")).toBeUndefined();
	await r.put(cacheFixture(), "r");
	await storage.update((s) => {
		s.entries[0]!.chapter.schemaVersion = 2 as 1;
	});
	expect(await r.get({ book: "PSA", chapter: 23 }, "CSB", "r")).toBeUndefined();
	await r.put(cacheFixture(), "r");
	await r.observe("next");
	expect(
		await r.get({ book: "PSA", chapter: 23 }, "CSB", "next"),
	).toBeUndefined();
});
it("falls back to bounded memory on initial storage denial or later quota errors", async () => {
	const backing = memoryChapterStorage();
	let fail = false;
	const storage: ChapterStorage = {
		update(change) {
			if (fail) return Promise.reject(new Error("quota"));
			return backing.update(change);
		},
	};
	const r = repo(storage);
	await r.observe("r");
	fail = true;
	await r.put(cacheFixture("ESV", 1, 180), "r");
	await r.put(cacheFixture("ESV", 2, 180), "r");
	expect(await r.get({ book: "PSA", chapter: 1 }, "ESV", "r")).toBeUndefined();
	expect(await r.get({ book: "PSA", chapter: 2 }, "ESV", "r")).toBeDefined();
	const unavailable = repo({
		update: async () => {
			throw new Error("denied");
		},
	});
	await unavailable.observe("r");
	await unavailable.put(cacheFixture(), "r");
	expect(
		await unavailable.get({ book: "PSA", chapter: 23 }, "CSB", "r"),
	).toBeDefined();
});
it("removes expired content on the active timer without a read", async () => {
	vi.useFakeTimers();
	vi.setSystemTime(1000);
	const storage = memoryChapterStorage();
	const r = repo(storage);
	await r.observe("r");
	await r.put(cacheFixture("ESV"), "r");
	await vi.advanceTimersByTimeAsync(3600000);
	expect(await storage.update((s) => s.entries.length)).toBe(0);
});
