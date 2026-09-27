import type { Passage } from "../domain/reading-plan.js";
import {
	type SemanticChapter,
	validateSemanticChapter,
} from "../domain/semantic-chapter.js";
import { webuManifestSha256, webuRevision } from "../domain/webu-revision.js";
import { ChapterLoadError, type ChapterSource } from "./chapter-source.js";

interface ManifestEntry {
	book: "PSA" | "PRO";
	chapter: number;
	path: string;
	sha256: string;
	verseKeys: string[];
}
const cancelled = () => new DOMException("Cancelled.", "AbortError");
async function hash(bytes: ArrayBuffer) {
	// LAN HTTP used by mise host has no SubtleCrypto. Keep integrity checks there.
	let digest: ArrayBuffer | Uint8Array;
	if (globalThis.crypto?.subtle) {
		digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
	} else {
		const checksum = new Sha256Js();
		checksum.update(new Uint8Array(bytes));
		digest = await checksum.digest();
	}
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}
/** Same-origin pinned content, independent of licensed metadata, storage and tracking. */
export function staticWebuSource(
	fetcher: typeof fetch = (...args) => fetch(...args),
): ChapterSource {
	let manifest: ManifestEntry[] | undefined;
	const recent = new Map<string, SemanticChapter>();
	async function load(
		path: string,
		expectedHash: string,
		signal: AbortSignal,
	): Promise<unknown> {
		if (signal.aborted) throw cancelled();
		const response = await fetcher(path, { signal });
		if (!response.ok) throw new Error("Missing WEBU asset.");
		const bytes = await response.arrayBuffer();
		if ((await hash(bytes)) !== expectedHash)
			throw new Error("Corrupt WEBU asset.");
		if (signal.aborted) throw cancelled();
		return JSON.parse(new TextDecoder().decode(bytes));
	}
	return {
		async get(passage: Passage, signal, context) {
			try {
				if (context?.translation && context.translation !== "WEBU")
					throw new Error("Wrong edition.");
				if (signal.aborted) throw cancelled();
				if (!manifest) {
					const data = (await load(
						"/scripture/webu/manifest.json",
						webuManifestSha256,
						signal,
					)) as {
						revision: string;
						schemaVersion: number;
						chapters: ManifestEntry[];
					};
					if (
						data.revision !== webuRevision ||
						data.schemaVersion !== 1 ||
						!Array.isArray(data.chapters) ||
						data.chapters.length !== 181
					)
						throw new Error("Mixed WEBU revision.");
					const identities = new Set<string>();
					for (const entry of data.chapters) {
						const key = `${entry.book}.${entry.chapter}`;
						if (
							!["PSA", "PRO"].includes(entry.book) ||
							!Number.isInteger(entry.chapter) ||
							entry.chapter < 1 ||
							entry.chapter > (entry.book === "PSA" ? 150 : 31) ||
							identities.has(key) ||
							entry.path !==
								`/scripture/webu/${webuRevision}/${entry.book}/${entry.chapter}.json` ||
							!/^[a-f0-9]{64}$/.test(entry.sha256) ||
							!Array.isArray(entry.verseKeys) ||
							entry.verseKeys.some((key) => typeof key !== "string")
						)
							throw new Error("Invalid WEBU index.");
						identities.add(key);
					}
					manifest = data.chapters;
				}
				const key = `${passage.book}.${passage.chapter}`;
				const hit = recent.get(key);
				if (hit) return hit;
				const entry = manifest.find(
					(entry) =>
						entry.book === passage.book && entry.chapter === passage.chapter,
				);
				if (!entry) throw new Error("Missing WEBU chapter.");
				const chapter = await load(entry.path, entry.sha256, signal);
				validateSemanticChapter(chapter);
				if (
					chapter.identity.translation !== "WEBU" ||
					chapter.identity.provider !== "static" ||
					chapter.identity.providerBibleId !== "engwebu" ||
					chapter.identity.editionKey !== "engwebu" ||
					chapter.identity.book !== passage.book ||
					chapter.identity.chapter !== passage.chapter ||
					chapter.tracking.kind !== "none" ||
					JSON.stringify(chapter.verses.map((verse) => verse.key)) !==
						JSON.stringify(entry.verseKeys)
				)
					throw new Error("Wrong WEBU chapter.");
				if (signal.aborted) throw cancelled();
				recent.set(key, chapter);
				while (recent.size > 6) recent.delete(recent.keys().next().value!);
				return chapter;
			} catch {
				if (signal.aborted) throw cancelled();
				throw new ChapterLoadError(
					"static-unavailable",
					"This WEBU chapter is unavailable. Reconnect or reload, then try again.",
				);
			}
		},
	};
}

import { Sha256Js } from "@smithy/core/checksum";
