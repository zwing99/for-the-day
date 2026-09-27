import { chapterLifetime, retentionFits } from "../domain/chapter-retention.js";
import type { Passage } from "../domain/reading-plan.js";
import {
	type SemanticChapter,
	type Translation,
	validateSemanticChapter,
} from "../domain/semantic-chapter.js";

interface Entry {
	key: string;
	revision: string;
	retrievedAt: number;
	expiresAt: number;
	usedAt: number;
	chapter: SemanticChapter;
}
export interface CacheState {
	revision?: string;
	entries: Entry[];
}
/** Updates must run atomically, including across tabs. Callback is synchronous. */
export interface ChapterStorage {
	update<T>(change: (state: CacheState) => T, signal?: AbortSignal): Promise<T>;
}
export function memoryChapterStorage(): ChapterStorage {
	const state: CacheState = { entries: [] };
	return {
		async update(change) {
			return change(state);
		},
	};
}
export function indexedChapterStorage(
	factory: IDBFactory = indexedDB,
): ChapterStorage {
	let database: Promise<IDBDatabase> | undefined;
	function open() {
		database ??= new Promise<IDBDatabase>((resolve, reject) => {
			const request = factory.open("for-the-day-chapters", 1);
			request.onupgradeneeded = () =>
				request.result.createObjectStore("repository");
			request.onerror = () => reject(request.error);
			request.onblocked = () => reject(new Error("Chapter storage blocked."));
			request.onsuccess = () => {
				request.result.onversionchange = () => {
					request.result.close();
					database = undefined;
				};
				resolve(request.result);
			};
		});
		return database;
	}
	return {
		async update<T>(
			change: (state: CacheState) => T,
			signal?: AbortSignal,
		): Promise<T> {
			const db = await open();
			if (signal?.aborted) throw new DOMException("Cancelled.", "AbortError");
			return new Promise<T>((resolve, reject) => {
				const transaction = db.transaction("repository", "readwrite");
				const store = transaction.objectStore("repository");
				const request = store.get("state");
				let result: T;
				const abort = () => {
					try {
						transaction.abort();
					} catch {
						/* A completed admission already had an active consumer. */
					}
				};
				signal?.addEventListener("abort", abort, { once: true });
				transaction.oncomplete = () => {
					signal?.removeEventListener("abort", abort);
					resolve(result);
				};
				transaction.onerror = () => reject(transaction.error);
				transaction.onabort = () => {
					signal?.removeEventListener("abort", abort);
					reject(
						signal?.aborted
							? new DOMException("Cancelled.", "AbortError")
							: (transaction.error ?? new Error("Chapter storage aborted.")),
					);
				};
				request.onsuccess = () => {
					try {
						const raw = request.result;
						const state: CacheState =
							raw && typeof raw === "object" && Array.isArray(raw.entries)
								? raw
								: { entries: [] };
						result = change(state);
						store.put(state, "state");
					} catch {
						transaction.abort();
					}
				};
			});
		},
	};
}
function key(passage: Passage, translation: Translation): string {
	return `${translation}:${passage.book}:${passage.chapter}`;
}

export class BrowserChapterRepository {
	private fallback = memoryChapterStorage();
	private failed = false;
	private knownRevision?: string;
	private timer?: ReturnType<typeof setTimeout>;
	constructor(
		private storage: ChapterStorage,
		private clock: () => number = Date.now,
	) {}
	private clean(state: CacheState) {
		const now = this.clock();
		const keys = new Set<string>();
		state.entries = state.entries.filter((entry) => {
			try {
				validateSemanticChapter(entry.chapter);
				const identity = entry.chapter.identity;
				if (
					entry.revision !== state.revision ||
					typeof state.revision !== "string" ||
					!state.revision ||
					entry.key !== key(identity, identity.translation) ||
					keys.has(entry.key) ||
					!Number.isFinite(entry.retrievedAt) ||
					entry.retrievedAt < 0 ||
					entry.retrievedAt > now ||
					entry.expiresAt !==
						entry.retrievedAt + chapterLifetime(identity.translation) ||
					entry.expiresAt <= now ||
					!Number.isFinite(entry.usedAt) ||
					entry.usedAt < entry.retrievedAt ||
					entry.usedAt > now ||
					!retentionFits([entry.chapter], identity.translation)
				)
					return false;
				keys.add(entry.key);
				return true;
			} catch {
				return false;
			}
		});
		for (const translation of ["CSB", "NIV", "NLT", "ESV"] as const) {
			while (
				!retentionFits(
					state.entries.map((e) => e.chapter),
					translation,
				)
			) {
				const oldest = state.entries
					.filter((e) => e.chapter.identity.translation === translation)
					.sort((a, b) => a.usedAt - b.usedAt)[0];
				state.entries = state.entries.filter((e) => e !== oldest);
			}
		}
	}
	private async update<T>(
		change: (state: CacheState) => T,
		signal?: AbortSignal,
	): Promise<T> {
		const action = (state: CacheState) => {
			this.clean(state);
			const result = change(state);
			this.knownRevision = state.revision;
			clearTimeout(this.timer);
			const expiry = Math.min(...state.entries.map((e) => e.expiresAt));
			if (Number.isFinite(expiry)) {
				this.timer = setTimeout(
					() => {
						void this.maintain();
					},
					Math.max(1, expiry - this.clock()),
				);
				(this.timer as unknown as { unref?: () => void }).unref?.();
			}
			return result;
		};
		if (!this.failed) {
			try {
				return await this.storage.update(action, signal);
			} catch {
				if (signal?.aborted) throw new DOMException("Cancelled.", "AbortError");
				this.failed = true;
			}
		}
		return this.fallback.update((state) => {
			state.revision ??= this.knownRevision;
			return action(state);
		});
	}
	maintain(): Promise<void> {
		return this.update(() => {});
	}
	revision(): Promise<string | undefined> {
		return this.update((s) => s.revision);
	}
	observe(revision: string): Promise<void> {
		return this.update((s) => {
			if (s.revision !== revision) {
				s.revision = revision;
				s.entries = [];
			}
		});
	}
	get(
		passage: Passage,
		translation: Translation,
		revision: string,
	): Promise<SemanticChapter | undefined> {
		return this.update((s) => {
			if (s.revision !== revision) return undefined;
			const entry = s.entries.find((e) => e.key === key(passage, translation));
			if (entry) entry.usedAt = this.clock();
			return entry ? structuredClone(entry.chapter) : undefined;
		});
	}
	put(
		chapter: SemanticChapter,
		revision: string,
		retrievedAt = this.clock(),
		allowed: () => boolean = () => true,
		signal?: AbortSignal,
	): Promise<void> {
		return this.update((s) => {
			if (!allowed() || s.revision !== revision) return;
			validateSemanticChapter(chapter);
			const translation = chapter.identity.translation;
			if (!retentionFits([chapter], translation)) return;
			const entry: Entry = {
				key: key(chapter.identity, translation),
				revision,
				retrievedAt,
				expiresAt: retrievedAt + chapterLifetime(translation),
				usedAt: this.clock(),
				chapter: structuredClone(chapter),
			};
			if (entry.expiresAt <= this.clock()) return;
			s.entries = s.entries.filter((e) => e.key !== entry.key);
			while (
				!retentionFits(
					[...s.entries.map((e) => e.chapter), chapter],
					translation,
				)
			) {
				const oldest = s.entries
					.filter((e) => e.chapter.identity.translation === translation)
					.sort((a, b) => a.usedAt - b.usedAt)[0];
				s.entries = s.entries.filter((e) => e !== oldest);
			}
			s.entries.push(entry);
		}, signal);
	}
	dispose() {
		clearTimeout(this.timer);
	}
}
