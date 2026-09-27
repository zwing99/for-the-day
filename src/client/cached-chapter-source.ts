import type { SemanticChapter } from "../domain/semantic-chapter.js";
import {
	BrowserChapterRepository,
	indexedChapterStorage,
	memoryChapterStorage,
} from "./chapter-cache.js";
import {
	type ChapterSource,
	chapterRevisions,
	networkChapterSource,
} from "./chapter-source.js";

interface Pending {
	controller: AbortController;
	consumers: Set<symbol>;
	promise: Promise<SemanticChapter>;
}
const cancelled = () => new DOMException("Cancelled.", "AbortError");

export function cachedChapterSource(
	source: ChapterSource,
	repository: BrowserChapterRepository,
	metadata: () => Promise<string | undefined> = async () => undefined,
	clock: () => number = Date.now,
): ChapterSource {
	let revision: string | undefined;
	let generation = 0;
	const pending = new Map<string, Pending>();
	const startup = (async () => {
		revision = await repository.revision();
		try {
			const observed = await metadata();
			if (observed) {
				revision = observed;
				await repository.observe(observed);
			}
		} catch {
			/* Offline reopening uses the last observed revision. */
		}
	})();
	async function observe(next: string) {
		if (next !== revision) {
			revision = next;
			generation++;
			await repository.observe(next);
		}
	}
	return {
		async get(passage, signal, context) {
			await startup;
			if (signal.aborted) throw cancelled();
			const translation = context?.translation ?? "CSB";
			const beforeLookup = generation;
			const hit = revision
				? await repository.get(passage, translation, revision)
				: undefined;
			if (signal.aborted) throw cancelled();
			if (hit && beforeLookup === generation) return hit;
			const key = JSON.stringify([
				translation,
				passage.book,
				passage.chapter,
				translation === "ESV" ? context?.readingDay : undefined,
				translation === "ESV" ? context?.timeZone : undefined,
				revision,
			]);
			let shared = pending.get(key);
			const consumer = Symbol();
			if (!shared) {
				const controller = new AbortController();
				const consumers = new Set<symbol>();
				const loadGeneration = generation;
				const loadRevision = revision;
				const promise = (async () => {
					const chapter = await source.get(passage, controller.signal, context);
					const retrievedAt = clock();
					if (
						controller.signal.aborted ||
						!consumers.size ||
						generation !== loadGeneration
					)
						throw cancelled();
					const servingRevision = chapterRevisions.get(chapter) ?? loadRevision;
					if (servingRevision && servingRevision !== revision) {
						await observe(servingRevision);
					}
					const admittedGeneration = generation;
					if (controller.signal.aborted || !consumers.size) throw cancelled();
					if (servingRevision)
						await repository.put(
							chapter,
							servingRevision,
							retrievedAt,
							() =>
								!controller.signal.aborted &&
								consumers.size > 0 &&
								admittedGeneration === generation,
							controller.signal,
						);
					if (
						controller.signal.aborted ||
						!consumers.size ||
						admittedGeneration !== generation
					)
						throw cancelled();
					return chapter;
				})().finally(() => {
					if (pending.get(key)?.promise === promise) pending.delete(key);
				});
				shared = { controller, consumers, promise };
				pending.set(key, shared);
			}
			const request = shared;
			request.consumers.add(consumer);
			return new Promise<SemanticChapter>((resolve, reject) => {
				const release = () => {
					signal.removeEventListener("abort", abort);
					request.consumers.delete(consumer);
					if (!request.consumers.size) {
						request.controller.abort();
						if (pending.get(key) === request) pending.delete(key);
					}
				};
				const abort = () => {
					release();
					reject(cancelled());
				};
				signal.addEventListener("abort", abort, { once: true });
				request.promise.then(
					(chapter) => {
						if (signal.aborted) {
							release();
							reject(cancelled());
							return;
						}
						release();
						resolve(chapter);
					},
					(error) => {
						release();
						reject(error);
					},
				);
			});
		},
	};
}

export function browserChapterSource(): ChapterSource {
	let storage;
	try {
		storage = indexedChapterStorage();
	} catch {
		storage = memoryChapterStorage();
	}
	const repository = new BrowserChapterRepository(storage);
	return cachedChapterSource(networkChapterSource, repository, async () => {
		const response = await fetch("/api/content-configuration", {
			cache: "no-store",
		});
		if (!response.ok) return undefined;
		const body = await response.json();
		return typeof body.revision === "string" && body.revision
			? body.revision
			: undefined;
	});
}
