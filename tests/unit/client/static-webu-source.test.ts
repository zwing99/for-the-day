import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterEach, expect, it, vi } from "vitest";
import { sha256 } from "../../../scripts/webu-corpus.mjs";
import { browserChapterSource } from "../../../src/client/cached-chapter-source.js";
import { indexedChapterStorage } from "../../../src/client/chapter-cache.js";
import { staticWebuSource } from "../../../src/client/static-webu-source.js";

vi.mock("../../../src/client/chapter-cache.js", async (original) => ({
	...(await original()),
	indexedChapterStorage: vi.fn(() => {
		throw new Error("No database allowed");
	}),
}));
const pin = vi.hoisted(() => ({ hash: "", revision: "" }));
vi.mock("../../../src/domain/webu-revision.js", () => ({
	get webuManifestSha256() {
		return pin.hash;
	},
	get webuRevision() {
		return pin.revision;
	},
}));
afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});
async function assets() {
	const manifestText = await readFile(
		"public/scripture/webu/manifest.json",
		"utf8",
	);
	const manifest = JSON.parse(manifestText);
	pin.hash = sha256(manifestText);
	pin.revision = manifest.revision;
	const entry = manifest.chapters.find(
		(entry: { book: string; chapter: number }) =>
			entry.book === "PSA" && entry.chapter === 23,
	);
	const chapterText = await readFile(`public${entry.path}`, "utf8");
	vi.stubGlobal("crypto", webcrypto);
	const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => {
		if (String(url) === "/scripture/webu/manifest.json")
			return new Response(manifestText);
		if (String(url) === entry.path) return new Response(chapterText);
		throw new Error("Unexpected request");
	});
	return { manifestText, manifest, entry, chapterText, fetcher };
}
const context = {
	translation: "WEBU",
	readingDay: 23,
	timeZone: "UTC",
} as const;
it("reads verified assets on LAN HTTP without SubtleCrypto", async () => {
	const { fetcher } = await assets();
	vi.stubGlobal("crypto", {});
	const chapter = await staticWebuSource(fetcher).get(
		{ book: "PSA", chapter: 23 },
		new AbortController().signal,
		context,
	);
	expect(chapter.identity.translation).toBe("WEBU");
});
it("still rejects corrupted assets without SubtleCrypto", async () => {
	const { manifestText, chapterText, fetcher } = await assets();
	vi.stubGlobal("crypto", {});
	fetcher.mockImplementation(
		async (url) =>
			new Response(
				String(url).endsWith("manifest.json")
					? manifestText
					: `${chapterText} `,
			),
	);
	await expect(
		staticWebuSource(fetcher).get(
			{ book: "PSA", chapter: 23 },
			new AbortController().signal,
			context,
		),
	).rejects.toMatchObject({ code: "static-unavailable" });
});
it("reads actual static assets and reuses bounded session data without licensed initialization", async () => {
	const { fetcher } = await assets();
	vi.stubGlobal("fetch", fetcher);
	const source = browserChapterSource();
	const passage = { book: "PSA", chapter: 23 } as const;
	const chapter = await source.get(
		passage,
		new AbortController().signal,
		context,
	);
	expect(chapter.identity.translation).toBe("WEBU");
	expect(chapter.tracking).toEqual({ kind: "none" });
	expect(await source.get(passage, new AbortController().signal, context)).toBe(
		chapter,
	);
	expect(fetcher).toHaveBeenCalledTimes(2);
	expect(indexedChapterStorage).not.toHaveBeenCalled();
	expect(
		fetcher.mock.calls.every(([url]) =>
			String(url).startsWith("/scripture/webu/"),
		),
	).toBe(true);
});
it.each(["missing", "corrupt", "revision", "schema", "identity", "indexes"])(
	"rejects %s assets with safe retry",
	async (failure) => {
		const { manifest, entry, chapterText, fetcher } = await assets();
		const chapter = JSON.parse(chapterText);
		if (failure === "revision") manifest.revision = "wrong";
		if (failure === "schema") chapter.schemaVersion = 999;
		if (failure === "identity") chapter.identity.translation = "CSB";
		if (failure === "indexes") chapter.verses[0].fragmentNodeIds = [];
		const bytes = JSON.stringify(chapter);
		if (failure !== "corrupt") entry.sha256 = sha256(bytes);
		const manifestBytes = JSON.stringify(manifest);
		pin.hash = sha256(manifestBytes);
		fetcher.mockImplementation(
			async (url) =>
				new Response(
					String(url).endsWith("manifest.json") ? manifestBytes : bytes,
					{ status: failure === "missing" ? 404 : 200 },
				),
		);
		await expect(
			staticWebuSource(fetcher).get(
				{ book: "PSA", chapter: 23 },
				new AbortController().signal,
				context,
			),
		).rejects.toMatchObject({ code: "static-unavailable" });
		const recovered = await assets();
		expect(
			(
				await staticWebuSource(recovered.fetcher).get(
					{ book: "PSA", chapter: 23 },
					new AbortController().signal,
					context,
				)
			).identity.translation,
		).toBe("WEBU");
	},
);
it("rejects cancelled loads even when a transport returns after cancellation", async () => {
	const { fetcher } = await assets();
	const controller = new AbortController();
	const actual = fetcher.getMockImplementation()!;
	fetcher.mockImplementation(async (...args) => {
		const response = await actual(...args);
		controller.abort();
		return response;
	});
	await expect(
		staticWebuSource(fetcher).get(
			{ book: "PSA", chapter: 23 },
			controller.signal,
			context,
		),
	).rejects.toMatchObject({ name: "AbortError" });
});
