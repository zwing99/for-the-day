import { describe, expect, it, vi } from "vitest";
import { orderedText } from "../../../src/domain/semantic-chapter.js";
import {
	CROSSWAY_OPTIONS,
	CrosswayProvider,
	normalizeCrosswayChapter,
} from "../../../src/server/providers/crossway.js";
import { crosswayFixture } from "../../fixtures/crossway.js";

const passage = { book: "PSA", chapter: 23 } as const;
describe("Crossway whole chapters", () => {
	it("preserves all 22 acrostic divisions in a Psalm-119-shaped complete chapter", () => {
		const raw = crosswayFixture(176);
		raw.passages[0] = raw.passages[0]!.replace(/19023/g, "19119").replace(
			/<span class="line">/g,
			'<h4 class="psalm-acrostic-title">Invented division</h4><span class="line">',
		);
		// Use one division per eight verses rather than every non-indented line.
		let index = 0;
		raw.passages[0] = raw.passages[0]!.replace(
			/<h4 class="psalm-acrostic-title">Invented division<\/h4>/g,
			() =>
				index++ % 4 === 0
					? '<h4 class="psalm-acrostic-title">Invented division</h4>'
					: "",
		);
		raw.canonical = "Psalm 119";
		raw.parsed = [[19119001, 19119176]];
		raw.passage_meta = [
			{
				chapter_start: [19119001, 19119176],
				chapter_end: [19119001, 19119176],
			},
		];
		const c = normalizeCrosswayChapter(raw, { book: "PSA", chapter: 119 });
		expect(c.verses).toHaveLength(176);
		expect(c.introTitleNodeIds).toHaveLength(24);
		expect(
			orderedText(c.nodes).filter((t) => t === "Invented division"),
		).toHaveLength(22);
	});
	it("requests semantic whole chapters with cancellation and redacted credentials", async () => {
		const mock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(Response.json(crosswayFixture()));
		const signal = new AbortController().signal;
		const chapter = await new CrosswayProvider({
			apiKey: "dummy-key",
			fetch: mock,
		}).fetchChapter(passage, signal);
		const [input, options] = mock.mock.calls[0]!;
		const url = new URL(String(input));
		expect(Object.fromEntries(url.searchParams)).toEqual({
			q: "Psalm 23",
			...CROSSWAY_OPTIONS,
		});
		expect(options).toEqual({
			headers: { Authorization: "Token dummy-key" },
			signal,
			redirect: "error",
		});
		expect(chapter.identity).toMatchObject({
			provider: "crossway",
			translation: "ESV",
		});
		expect(chapter.verses.map((v) => v.orgIds)).toEqual([[], [], []]);
		expect(chapter.attribution).toMatchObject({
			notice: "Invented copyright & notice",
			requiredLinks: [{ label: "ESV", href: "https://www.esv.org/" }],
		});
		expect(orderedText(chapter.nodes).join("")).toContain(
			"Amber & copper 1.BOATS",
		);
		expect(JSON.stringify(chapter)).not.toContain("dummy-key");
	});
	it("preserves poetry, entities decoded once, consecutive headings, fragments and inline semantics", () => {
		const raw = crosswayFixture();
		raw.passages[0] = raw.passages[0]!.replace(
			"Invented title",
			"Invented &amp;amp; title",
		)
			.replace(
				'<p class="block-indent">',
				'<h4 class="psalm-acrostic-title">Invented division</h4><p class="block-indent">',
			)
			.replace(
				"Amber &amp; copper 1.",
				'Amber &amp; copper 1.<span class="indent line"><a class="va" rel="v19023001"></a><i> continued </i></span>',
			);
		const c = normalizeCrosswayChapter(raw, passage);
		expect(orderedText(c.nodes)).toContain("Invented &amp; title");
		expect(c.introTitleNodeIds).toHaveLength(3);
		expect(c.verses[0]!.fragmentNodeIds).toHaveLength(3);
		expect(JSON.stringify(c.nodes)).toContain('"indent":1');
		expect(JSON.stringify(c.nodes)).toContain('"italic"');
		expect(JSON.stringify(c.nodes)).toContain('"small-caps"');
	});
	it("retains range/partial printed labels distinctly from numeric provider anchors", () => {
		const raw = crosswayFixture();
		raw.passages[0] = raw.passages[0]!.replace(">1 </b>", ">1a-2 </b>");
		const c = normalizeCrosswayChapter(raw, passage);
		expect(c.verses[0]).toMatchObject({
			displayLabel: "1a-2",
			providerIds: ["19023001"],
			orgIds: [],
		});
	});
	it("retains unfamiliar text-bearing structures", () => {
		const raw = crosswayFixture();
		raw.passages[0] = raw.passages[0]!.replace(
			"Amber &amp; copper 1.",
			"<future-node>Amber &amp; copper 1.</future-node>",
		);
		const c = normalizeCrosswayChapter(raw, passage);
		expect(orderedText(c.nodes)).toContain("Amber & copper 1.");
		expect(JSON.stringify(c.nodes)).toContain('"unknown"');
	});
	it.each([401, 403, 404, 429, 500])(
		"contains upstream failure %i",
		async (status) => {
			const mock = vi.fn<typeof fetch>().mockResolvedValue(
				new Response("private details", {
					status,
					headers: { "Retry-After": "30" },
				}),
			);
			await expect(
				new CrosswayProvider({ apiKey: "dummy", fetch: mock }).fetchChapter(
					passage,
				),
			).rejects.toMatchObject({
				code:
					status === 429
						? "rate-limit"
						: status === 404
							? "not-found"
							: status === 401 || status === 403
								? "access-denied"
								: "provider-unavailable",
			});
		},
	);
	it("rejects missing configuration, incomplete chapters, missing notices, unsafe markup and absent fragments", async () => {
		const mock = vi.fn<typeof fetch>();
		await expect(
			new CrosswayProvider({ fetch: mock }).fetchChapter(passage),
		).rejects.toMatchObject({ code: "configuration" });
		expect(mock).not.toHaveBeenCalled();
		for (const change of [
			(r: ReturnType<typeof crosswayFixture>) => {
				r.parsed[0]![0] = 19023002;
			},
			(r: ReturnType<typeof crosswayFixture>) => {
				r.passages[0] = r.passages[0]!.replace(
					'class="copyright"',
					'class="other"',
				);
			},
			(r: ReturnType<typeof crosswayFixture>) => {
				r.passages[0] += "<script>unsafe()</script>";
			},
			(r: ReturnType<typeof crosswayFixture>) => {
				r.parsed[0]![1] = 19023004;
				r.passage_meta[0]!.chapter_start[1] = 19023004;
				r.passage_meta[0]!.chapter_end[1] = 19023004;
			},
		]) {
			const r = crosswayFixture();
			change(r);
			expect(() => normalizeCrosswayChapter(r, passage)).toThrow();
		}
	});
});
