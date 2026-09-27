import { mkdir, writeFile } from "node:fs/promises";
import { orderedText } from "../src/domain/semantic-chapter.js";
import {
	apiBibleChapterUrl,
	normalizeApiBibleChapter,
} from "../src/server/providers/api-bible.js";
import { localResponseCache } from "../src/server/providers/local-response-cache.js";

const apiKey = process.env.API_BIBLE_KEY;
const bibleId = process.env.API_BIBLE_CSB_ID;
if (!apiKey || !bibleId)
	throw new Error(
		"Configure API_BIBLE_KEY and API_BIBLE_CSB_ID before inspecting CSB.",
	);
const cachedFetch = localResponseCache();
await mkdir(".local/provider-samples", { recursive: true, mode: 0o700 });
for (const passage of [
	{ book: "PSA", chapter: 23 },
	{ book: "PSA", chapter: 3 },
	{ book: "PSA", chapter: 119 },
	{ book: "PRO", chapter: 7 },
] as const) {
	const url = apiBibleChapterUrl(passage, bibleId);
	let response: Response;
	try {
		response = await cachedFetch(url, {
			headers: { "api-key": apiKey },
			redirect: "error",
			signal: AbortSignal.timeout(15000),
		});
	} catch {
		console.log(`${passage.book}.${passage.chapter}: network request failed`);
		process.exitCode = 1;
		break;
	}
	if (!response.ok) {
		console.log(`${passage.book}.${passage.chapter}: HTTP ${response.status}`);
		process.exitCode = 1;
		break;
	}
	const raw = (await response.json()) as {
		data?: { content?: unknown };
		meta?: Record<string, unknown>;
	};
	await writeFile(
		`.local/provider-samples/CSB-${passage.book}-${passage.chapter}.json`,
		JSON.stringify(raw, null, 2),
		{ mode: 0o600 },
	);
	const shapes = new Map<string, number>();
	const texts: string[] = [];
	function walk(value: unknown) {
		if (!Array.isArray(value)) return;
		for (const node of value as Array<{
			type?: string;
			name?: string;
			text?: string;
			attrs?: Record<string, unknown>;
			items?: unknown;
		}>) {
			const shape = `${node.type}/${node.name ?? ""}/${node.attrs?.style ?? ""}:attrs=${Object.keys(node.attrs ?? {}).join(",")}`;
			shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
			if (node.type === "text" && typeof node.text === "string")
				texts.push(node.text);
			if (node.name !== "verse") walk(node.items);
		}
	}
	walk(raw.data?.content);
	console.log(
		JSON.stringify({
			passage,
			metaKeys: Object.keys(raw.meta ?? {}),
			shapes: Object.fromEntries(shapes),
		}),
	);
	try {
		const normalized = normalizeApiBibleChapter(raw, passage, bibleId);
		console.log(
			JSON.stringify({
				passage,
				normalized: true,
				exactText:
					JSON.stringify(texts) ===
					JSON.stringify(orderedText(normalized.nodes)),
				verses: normalized.verses.length,
			}),
		);
	} catch {
		console.log(
			`${passage.book}.${passage.chapter}: normalization failed; inspect ignored source locally`,
		);
		process.exitCode = 1;
	}
}
