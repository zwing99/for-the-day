import { describe, expect, it, vi } from "vitest";
import { ChapterService } from "../../src/server/chapter-service.js";
import { semanticFixture } from "../fixtures/semantic-chapter.js";

const chapter = semanticFixture();
const passage = { book: "PSA", chapter: 23 } as const;
function setup(cached = false) {
	const provider = { fetchChapter: vi.fn().mockResolvedValue(chapter) };
	const repository = {
		get: vi.fn().mockResolvedValue(cached ? chapter : undefined),
		put: vi.fn().mockResolvedValue(true),
		maintain: vi.fn(),
	};
	return {
		provider,
		repository,
		service: new ChapterService(provider, repository, chapter.identity),
	};
}
describe("chapter service", () => {
	it("avoids provider access on fresh cache hits", async () => {
		const { service, provider, repository } = setup(true);
		expect(await service.get(passage)).toEqual(chapter);
		expect(provider.fetchChapter).not.toHaveBeenCalled();
		expect(repository.put).not.toHaveBeenCalled();
	});
	it("deduplicates simultaneous misses then caches the whole chapter", async () => {
		const { service, provider, repository } = setup();
		expect(
			await Promise.all([service.get(passage), service.get(passage)]),
		).toEqual([chapter, chapter]);
		expect(provider.fetchChapter).toHaveBeenCalledTimes(1);
		expect(repository.put).toHaveBeenCalledWith(chapter);
	});
	it("does not substitute content after a cache failure", async () => {
		const { service, provider, repository } = setup();
		repository.get.mockRejectedValue(new Error("cache down"));
		await expect(service.get(passage)).rejects.toThrow();
		expect(provider.fetchChapter).not.toHaveBeenCalled();
	});
	it("clears failed in-flight requests so a retry can succeed", async () => {
		const { service, provider, repository } = setup();
		provider.fetchChapter.mockRejectedValueOnce(new Error("provider down"));
		await expect(service.get(passage)).rejects.toThrow();
		expect(repository.put).not.toHaveBeenCalled();
		expect(await service.get(passage)).toEqual(chapter);
		expect(provider.fetchChapter).toHaveBeenCalledTimes(2);
	});
});
