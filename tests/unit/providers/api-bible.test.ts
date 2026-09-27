import { describe, expect, it, vi } from "vitest";
import {
	completeVerseUnits,
	orderedText,
} from "../../../src/domain/semantic-chapter.js";
import { ApiBibleProvider } from "../../../src/server/providers/api-bible.js";
import {
	apiBibleFixture,
	observedCsbFixture,
	observedNivNltFixture,
} from "../../fixtures/api-bible.js";

const passage = { book: "PSA", chapter: 23 } as const;
const configured = (fetchMock: typeof fetch) =>
	new ApiBibleProvider({
		apiKey: "secret-test-key",
		bibleId: "test-csb",
		fetch: fetchMock,
	});
describe("API.Bible CSB adapter", () => {
	it("maps observed acrostic titles and indented list lines without attaching a division to the prior verse", async () => {
		const raw = observedNivNltFixture();
		raw.data.content.splice(4, 0, {
			type: "tag",
			name: "para",
			attrs: { style: "qa" },
			items: [{ type: "text", text: "Next invented division" }],
		});
		const mock = vi.fn<typeof fetch>().mockResolvedValue(Response.json(raw));
		const c = await configured(mock).fetchChapter(passage);
		expect(c.nodes[0]).toMatchObject({ role: "title" });
		expect(c.nodes[1]).toMatchObject({ role: "heading" });
		expect(c.nodes[2]).toMatchObject({ role: "line", indent: 1 });
		expect(c.nodes[3]).toMatchObject({ role: "line", indent: 2 });
		expect(c.nodes[5]).toMatchObject({ role: "line", indent: 3 });
		expect(c.verses[0]!.fragmentNodeIds).toHaveLength(2);
		expect(c.introTitleNodeIds).toHaveLength(3);
	});
	it.each(["NIV", "NLT"] as const)(
		"preserves the shared contract and actual %s edition identity",
		async (translation) => {
			const raw = observedCsbFixture();
			raw.data.bibleId = `test-${translation}`;
			const mock = vi.fn<typeof fetch>().mockResolvedValue(Response.json(raw));
			const chapter = await new ApiBibleProvider({
				translation,
				bibleId: raw.data.bibleId,
				apiKey: "dummy",
				fetch: mock,
			}).fetchChapter(passage);
			expect(new URL(String(mock.mock.calls[0]![0])).pathname).toBe(
				`/bibles/test-${translation}/chapters/PSA.23`,
			);
			expect(chapter.identity).toMatchObject({
				translation,
				providerBibleId: raw.data.bibleId,
				editionKey: `api-bible-v2:test-${translation}:normalizer-2`,
			});
			expect(chapter.attribution.translationLabel).toBe(translation);
			expect(chapter.tracking).toMatchObject({
				kind: "api-bible-fums",
				token: "invented-token",
			});
			expect(orderedText(chapter.nodes)).toContain("Invented superscription");
			await expect(
				new ApiBibleProvider({
					translation,
					apiKey: "dummy",
					fetch: mock,
				}).fetchChapter(passage),
			).rejects.toMatchObject({ code: "configuration" });
			expect(mock).toHaveBeenCalledTimes(1);
		},
	);
	it("requests whole JSON chapters with titles, identities, server-only credentials and cancellation", async () => {
		const mock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(Response.json(apiBibleFixture()));
		const signal = new AbortController().signal;
		const chapter = await configured(mock).fetchChapter(passage, signal);
		const [input, options] = mock.mock.calls[0]!;
		const url = new URL(String(input));
		expect(url.origin).toBe("https://v2.api.bible");
		expect(url.pathname).toBe("/bibles/test-csb/chapters/PSA.23");
		expect(Object.fromEntries(url.searchParams)).toEqual({
			"content-type": "json",
			"include-notes": "false",
			"include-titles": "true",
			"include-chapter-numbers": "false",
			"include-verse-numbers": "true",
			"include-verse-spans": "true",
		});
		expect(options).toEqual({
			headers: { "api-key": "secret-test-key" },
			signal,
			redirect: "error",
		});
		expect(orderedText(chapter.nodes)).toEqual([
			"Invented title",
			"First heading",
			"  Amber ",
			"BOATS",
			" sail. ",
			"Blue kites\u00a0rise,",
			"\tand drift. ",
			"Copper wheels turn!",
		]);
		expect(
			chapter.verses.map((verse) => [
				verse.displayLabel,
				verse.orgIds,
				verse.fragmentNodeIds.length,
			]),
		).toEqual([
			["1a", ["PSA.23.2a"], 3],
			["2", ["PSA.23.3"], 2],
			["3-4", ["PSA.23.4", "PSA.23.5"], 1],
		]);
		expect(completeVerseUnits(chapter)).toHaveLength(3);
		expect(chapter.tracking).toEqual({
			kind: "api-bible-fums",
			version: 3,
			token: "invented-token",
			suppliedMetadata: apiBibleFixture().meta,
		});
		expect(chapter.introTitleNodeIds).toEqual(["content/0", "content/1"]);
		expect(chapter.nodes[3]).toMatchObject({
			kind: "group",
			role: "line",
			indent: 1,
		});
		expect(chapter.nodes[4]).toMatchObject({
			kind: "group",
			role: "line",
			indent: 2,
		});
		expect(chapter.nodes[5]).toMatchObject({
			kind: "group",
			role: "unknown",
			source: { tag: "future-node", style: "future-style" },
		});
		expect(JSON.stringify(chapter)).not.toContain("secret-test-key");
	});
	it("uses new markers for unannotated text rather than leaking the previous paragraph verse", async () => {
		const fixture = apiBibleFixture();
		fixture.data.content = [
			{
				type: "tag",
				name: "para",
				attrs: { style: "p" },
				items: [
					{
						type: "tag",
						name: "verse",
						attrs: { style: "v", number: "1", sid: "PSA 23:1" },
						items: [{ type: "text", text: "1" }],
					},
					{ type: "text", text: "First invented sentence." },
				],
			},
			{
				type: "tag",
				name: "para",
				attrs: { style: "p" },
				items: [
					{
						type: "tag",
						name: "verse",
						attrs: { style: "v", number: "2", sid: "PSA 23:2" },
						items: [{ type: "text", text: "2" }],
					},
					{ type: "text", text: "Second invented sentence." },
				],
			},
		];
		const mock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(Response.json(fixture));
		const chapter = await configured(mock).fetchChapter(passage);
		expect(chapter.verses.map((verse) => verse.fragmentNodeIds)).toEqual([
			["content/0/1"],
			["content/1/1"],
		]);
	});

	it("preserves observed nested spans, continuation lines, acrostic headings, and inline marks", async () => {
		const mock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(Response.json(observedCsbFixture()));
		const chapter = await configured(mock).fetchChapter(passage);
		expect(orderedText(chapter.nodes)).toEqual([
			"Invented division",
			" ",
			"Invented title",
			"Invented superscription",
			"Amber ",
			"BOATS",
			" sail ",
			"x",
			" onward.",
		]);
		expect(chapter.nodes[3]).toMatchObject({
			kind: "group",
			role: "line",
			indent: 0,
			source: { attributes: { vid: "PSA 23:1" } },
		});
		expect(chapter.verses[0]).toMatchObject({
			orgIds: ["PSA.23.2"],
			fragmentNodeIds: [
				"content/2/0/1",
				"content/2/0/2/0/0",
				"content/3/0/0",
				"content/3/0/1/0/0",
				"content/3/0/2/0/0",
			],
		});
		const serialized = JSON.stringify(chapter.nodes);
		for (const mark of ["superscript", "italic", "acrostic", "small-caps"])
			expect(serialized).toContain(mark);
		expect(chapter.nodes[4]).toMatchObject({ role: "stanza", children: [] });
	});

	it.each([401, 403, 404, 429, 500])(
		"redacts upstream %i failures",
		async (status) => {
			const mock = vi.fn<typeof fetch>().mockResolvedValue(
				new Response("upstream secret-test-key", {
					status,
					headers: { "Retry-After": "120" },
				}),
			);
			try {
				await configured(mock).fetchChapter(passage);
				throw new Error("expected failure");
			} catch (error) {
				expect(error).toMatchObject({
					code:
						status === 404
							? "not-found"
							: status === 429
								? "rate-limit"
								: status === 401 || status === 403
									? "access-denied"
									: "provider-unavailable",
				});
				expect(String(error)).not.toContain("secret-test-key");
				if (status === 429)
					expect(error).toMatchObject({ retryAfterSeconds: 120 });
			}
		},
	);
	it("contains network diagnostics and preserves cancellation", async () => {
		const mock = vi
			.fn<typeof fetch>()
			.mockRejectedValue(new Error("private upstream URL and key"));
		await expect(configured(mock).fetchChapter(passage)).rejects.toMatchObject({
			code: "provider-unavailable",
			message: "Scripture provider failure: provider-unavailable.",
		});
		const controller = new AbortController();
		controller.abort();
		await expect(
			configured(mock).fetchChapter(passage, controller.signal),
		).rejects.toMatchObject({ name: "AbortError" });
	});
	it("does not request content without configuration", async () => {
		const mock = vi.fn<typeof fetch>();
		await expect(
			new ApiBibleProvider({ fetch: mock }).fetchChapter(passage),
		).rejects.toMatchObject({ code: "configuration" });
		expect(mock).not.toHaveBeenCalled();
	});
	it("rejects missing FUMS metadata, malformed structures and mismatched chapter identities", async () => {
		const fixture = apiBibleFixture();
		for (const raw of [
			{ ...fixture, meta: {} },
			{ ...fixture, data: { ...fixture.data, content: "flattened content" } },
			{ ...fixture, data: { ...fixture.data, id: "PSA.24" } },
			{
				...fixture,
				data: {
					...fixture.data,
					content: [{ type: "unknown", text: "Must never vanish" }],
				},
			},
		]) {
			const mock = vi.fn<typeof fetch>().mockResolvedValue(Response.json(raw));
			await expect(
				configured(mock).fetchChapter(passage),
			).rejects.toMatchObject({ code: "normalization" });
		}
	});
	it("ignores unsafe retry guidance", async () => {
		const mock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(null, {
				status: 429,
				headers: { "Retry-After": "private diagnostic" },
			}),
		);
		await expect(configured(mock).fetchChapter(passage)).rejects.toMatchObject({
			code: "rate-limit",
			retryAfterSeconds: undefined,
		});
	});
});
