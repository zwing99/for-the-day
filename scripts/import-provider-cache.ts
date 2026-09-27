import { createHash } from "node:crypto";
import { access, readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { apiBibleChapterUrl } from "../src/server/providers/api-bible.js";
import {
	LOCAL_RESPONSE_TTL_MS,
	localResponseCache,
} from "../src/server/providers/local-response-cache.js";

let imported = 0;
for (const directory of [".local/provider-samples", ".local/provider-8"]) {
	let names: string[];
	try {
		names = await readdir(directory);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
		throw error;
	}
	for (const name of names.filter((n) => n.endsWith(".json"))) {
		const path = join(directory, name);
		const savedAt = (await stat(path)).mtimeMs;
		if (Date.now() - savedAt >= LOCAL_RESPONSE_TTL_MS) continue;
		let raw: { data?: { bibleId?: string; bookId?: string; number?: string } };
		const body = await readFile(path, "utf8");
		try {
			raw = JSON.parse(body);
		} catch {
			continue;
		}
		const data = raw.data;
		if (
			!data ||
			typeof data.bibleId !== "string" ||
			(data.bookId !== "PSA" && data.bookId !== "PRO") ||
			!/^\d+$/.test(String(data.number))
		)
			continue;
		const chapter = Number(data.number);
		if (chapter < 1 || chapter > (data.bookId === "PSA" ? 150 : 31)) continue;
		const url = apiBibleChapterUrl(
			{ book: data.bookId, chapter },
			data.bibleId,
		);
		const key = createHash("sha256").update(url.href).digest("hex");
		try {
			await access(join(".local/provider-response-cache", `${key}.json`));
			continue;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		}
		const cache = localResponseCache({
			clock: () => savedAt,
			fetch: async () =>
				new Response(body, {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
		});
		await cache(url);
		imported++;
	}
}
console.log(
	`Imported ${imported} existing API.Bible samples without upstream requests.`,
);
