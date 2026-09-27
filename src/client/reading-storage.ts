import type { ReaderRoute } from "../domain/reader-route.js";
import { parseReaderRoute, readerPath } from "../domain/reader-route.js";
import type { Translation } from "../domain/semantic-chapter.js";

export interface Preferences {
	translation: Translation;
	density: "Spacious" | "Balanced" | "Compact";
	appearance: "system" | "light" | "dark";
	fontSize: "normal" | "large" | "larger";
	intros: boolean;
	verseLabels: boolean;
}
export const defaultPreferences: Preferences = {
	translation: "CSB",
	density: "Balanced",
	appearance: "system",
	fontSize: "normal",
	intros: true,
	verseLabels: true,
};
type StoragePort = Pick<Storage, "getItem" | "setItem">;
const prefix = "for-the-day:v1:";
export class ReadingStorage {
	private memory = new Map<string, string>();
	constructor(private storage?: StoragePort) {}
	private read(key: string): unknown {
		try {
			const raw = this.memory.get(key) ?? this.storage?.getItem(prefix + key);
			return raw ? JSON.parse(raw) : undefined;
		} catch {
			return undefined;
		}
	}
	private write(key: string, value: unknown) {
		const raw = JSON.stringify(value);
		this.memory.set(key, raw);
		try {
			this.storage?.setItem(prefix + key, raw);
		} catch {
			/* Session memory remains available. */
		}
	}
	preferences(): Preferences {
		const value = this.read("preferences");
		const result = { ...defaultPreferences };
		if (!value || typeof value !== "object") return result;
		const raw = value as Record<string, unknown>;
		for (const key of [
			"translation",
			"density",
			"appearance",
			"fontSize",
		] as const) {
			const allowed = {
				translation: ["CSB", "NIV", "NLT", "ESV", "WEBU"],
				density: ["Spacious", "Balanced", "Compact"],
				appearance: ["system", "light", "dark"],
				fontSize: ["normal", "large", "larger"],
			}[key];
			if (typeof raw[key] === "string" && allowed.includes(raw[key]))
				Object.assign(result, { [key]: raw[key] });
		}
		for (const key of ["intros", "verseLabels"] as const)
			if (typeof raw[key] === "boolean") result[key] = raw[key];
		return result;
	}
	setPreferences(value: Preferences) {
		const { translation, density, appearance, fontSize, intros, verseLabels } =
			value;
		this.write("preferences", {
			translation,
			density,
			appearance,
			fontSize,
			intros,
			verseLabels,
		});
	}
	position(route: ReaderRoute): ReaderRoute | undefined {
		const value = this.read(
			`position:${route.day}:${route.book}:${route.chapter}`,
		);
		if (typeof value !== "string") return undefined;
		try {
			const saved = parseReaderRoute(new URL(value, "http://localhost"));
			return saved.day === route.day &&
				saved.book === route.book &&
				saved.chapter === route.chapter
				? saved
				: undefined;
		} catch {
			return undefined;
		}
	}
	savePosition(route: ReaderRoute) {
		// Persist only a generated logical URL, never provider objects or Scripture.
		this.write(
			`position:${route.day}:${route.book}:${route.chapter}`,
			readerPath(route),
		);
		this.write(
			`active:${route.day}`,
			readerPath({ ...route, location: undefined, orgIds: undefined }),
		);
	}
	resetPosition(route: ReaderRoute) {
		this.write(`position:${route.day}:${route.book}:${route.chapter}`, null);
		this.write(`active:${route.day}`, null);
	}
	activePassage(day: number): ReaderRoute | undefined {
		const value = this.read(`active:${day}`);
		if (typeof value !== "string") return undefined;
		try {
			const route = parseReaderRoute(new URL(value, "http://localhost"));
			return route.day === day ? route : undefined;
		} catch {
			return undefined;
		}
	}
}
export function browserReadingStorage() {
	try {
		return new ReadingStorage(window.localStorage);
	} catch {
		return new ReadingStorage();
	}
}
