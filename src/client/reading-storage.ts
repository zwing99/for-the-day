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
export function localCalendarKey(date = new Date()): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function validCalendarKey(value: unknown): value is string {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
		return false;
	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(year!, month! - 1, day!);
	return (
		date.getFullYear() === year &&
		date.getMonth() + 1 === month &&
		date.getDate() === day
	);
}
function recentCalendarKey(value: unknown): value is string {
	if (!validCalendarKey(value)) return false;
	const earliest = new Date();
	earliest.setHours(12, 0, 0, 0);
	earliest.setDate(earliest.getDate() - 89);
	return value >= localCalendarKey(earliest) && value <= localCalendarKey();
}
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
	lastFollowingDate(): string | undefined {
		this.dateProgress();
		const value = this.read("following-date");
		return validCalendarKey(value) ? value : undefined;
	}
	setFollowingDate(date: string) {
		if (validCalendarKey(date)) {
			this.dateProgress();
			this.write("following-date", date);
		}
	}
	datePosition(date: string, route: ReaderRoute): ReaderRoute | undefined {
		if (!recentCalendarKey(date) || Number(date.slice(-2)) !== route.day)
			return undefined;
		return this.parseStoredRoute(
			this.dateProgress()[date]?.positions?.[`${route.book}:${route.chapter}`],
			route,
		);
	}
	dateActivePassage(date: string): ReaderRoute | undefined {
		if (!recentCalendarKey(date)) return undefined;
		return this.parseStoredRoute(this.dateProgress()[date]?.active, {
			day: Number(date.slice(-2)),
		});
	}
	saveDatePosition(date: string, route: ReaderRoute) {
		if (!recentCalendarKey(date) || Number(date.slice(-2)) !== route.day)
			return;
		const progress = this.dateProgress();
		const entry = progress[date] ?? { active: "", positions: {} };
		entry.positions[`${route.book}:${route.chapter}`] = readerPath(route);
		entry.active = readerPath({
			...route,
			location: undefined,
			orgIds: undefined,
		});
		progress[date] = entry;
		for (const old of Object.keys(progress).sort().slice(0, -90))
			delete progress[old];
		this.write("date-progress", progress);
		this.setFollowingDate(date);
	}
	resetDatePosition(date: string, route: ReaderRoute) {
		if (!recentCalendarKey(date)) return;
		const progress = this.dateProgress();
		const entry = progress[date];
		if (!entry) return;
		delete entry.positions[`${route.book}:${route.chapter}`];
		entry.active = "";
		this.write("date-progress", progress);
	}
	private dateProgress(): Record<
		string,
		{ active: string; positions: Record<string, string> }
	> {
		const value = this.read("date-progress");
		if (!value || typeof value !== "object" || Array.isArray(value)) return {};
		const result: Record<
			string,
			{ active: string; positions: Record<string, string> }
		> = {};
		for (const [date, raw] of Object.entries(value).sort().slice(-90)) {
			if (
				!recentCalendarKey(date) ||
				!raw ||
				typeof raw !== "object" ||
				Array.isArray(raw)
			)
				continue;
			const entry = raw as Record<string, unknown>;
			const positions: Record<string, string> = {};
			if (
				entry.positions &&
				typeof entry.positions === "object" &&
				!Array.isArray(entry.positions)
			)
				for (const [passage, path] of Object.entries(entry.positions).slice(
					0,
					6,
				))
					if (/^(PSA|PRO):\d+$/.test(passage) && typeof path === "string")
						positions[passage] = path;
			result[date] = {
				active: typeof entry.active === "string" ? entry.active : "",
				positions,
			};
		}
		if (Object.keys(result).length !== Object.keys(value).length)
			this.write("date-progress", result);
		return result;
	}
	private parseStoredRoute(
		value: unknown,
		expected: Partial<ReaderRoute>,
	): ReaderRoute | undefined {
		if (typeof value !== "string") return undefined;
		try {
			const route = parseReaderRoute(new URL(value, "http://localhost"));
			return route.day === expected.day &&
				(expected.book === undefined || route.book === expected.book) &&
				(expected.chapter === undefined || route.chapter === expected.chapter)
				? route
				: undefined;
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
