import { readingPlan, type Passage } from "../domain/reading-plan.js";
import type { ReaderRoute } from "../domain/reader-route.js";
import type { SemanticChapter } from "../domain/semantic-chapter.js";
import { ChapterLoadError, type ChapterSource } from "./chapter-source.js";

const passageKey = (passage: Passage) => `${passage.book}:${passage.chapter}`;
const scopeKey = (route: ReaderRoute) => `${route.day}:${route.translation}`;

/** Coordinates subscribers only. Chapter retention and request sharing belong to ChapterSource. */
export class AdjacentPreparation {
	private scope = "";
	private generation = 0;
	private active?: ReaderRoute;
	private background?: AbortController;
	private backgroundKey?: string;
	private foreground?: AbortController;
	private ready = new Set<string>();
	private cooldownUntil = 0;
	private stopped = false;
	private timer?: ReturnType<typeof setTimeout>;

	constructor(
		private source: ChapterSource,
		private now: () => number = Date.now,
	) {}

	setActive(route: ReaderRoute) {
		const nextScope = scopeKey(route);
		const scopeChanged = nextScope !== this.scope;
		this.generation++;
		if (scopeChanged) {
			this.scope = nextScope;
			this.ready.clear();
			this.cooldownUntil = 0;
			this.stopped = false;
			this.foreground?.abort();
		}
		if (scopeChanged || this.backgroundKey !== passageKey(route)) {
			this.background?.abort();
			this.background = undefined;
			this.backgroundKey = undefined;
		}
		clearTimeout(this.timer);
		this.active = route;
	}

	async load(
		route: ReaderRoute,
		signal: AbortSignal,
	): Promise<SemanticChapter> {
		if (this.backgroundKey !== passageKey(route)) {
			this.background?.abort();
			this.background = undefined;
			this.backgroundKey = undefined;
		}
		const controller = new AbortController();
		this.foreground?.abort();
		this.foreground = controller;
		const abort = () => controller.abort();
		signal.addEventListener("abort", abort, { once: true });
		if (signal.aborted) controller.abort();
		const generation = this.generation;
		try {
			const chapter = await this.source.get(route, controller.signal, {
				translation: route.translation,
				readingDay: route.day,
				timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			});
			if (controller.signal.aborted || generation !== this.generation)
				throw new DOMException("Cancelled.", "AbortError");
			return chapter;
		} finally {
			if (this.foreground === controller) this.foreground = undefined;
		}
	}

	startAfterUsable(route: ReaderRoute) {
		if (
			scopeKey(route) !== this.scope ||
			passageKey(route) !== passageKey(this.active ?? route)
		)
			return;
		void this.warm(this.generation, route);
	}

	private async warm(generation: number, route: ReaderRoute) {
		if (
			this.background ||
			this.foreground ||
			this.stopped ||
			generation !== this.generation
		)
			return;
		if (this.now() < this.cooldownUntil) {
			clearTimeout(this.timer);
			this.timer = setTimeout(
				() => void this.warm(generation, route),
				this.cooldownUntil - this.now(),
			);
			return;
		}
		const plan = readingPlan(route.day);
		const index = plan.findIndex((p) => passageKey(p) === passageKey(route));
		for (const neighbor of [plan[index + 1], plan[index - 1]]) {
			if (!neighbor || this.ready.has(passageKey(neighbor))) continue;
			const controller = new AbortController();
			this.background = controller;
			this.backgroundKey = passageKey(neighbor);
			try {
				const chapter = await this.source.get(neighbor, controller.signal, {
					translation: route.translation,
					readingDay: route.day,
					timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				});
				if (controller.signal.aborted || generation !== this.generation) return;
				if (
					chapter.identity.translation !== route.translation ||
					chapter.identity.book !== neighbor.book ||
					chapter.identity.chapter !== neighbor.chapter
				)
					return;
				this.ready.add(passageKey(neighbor));
			} catch (error) {
				if (controller.signal.aborted || generation !== this.generation) return;
				if (error instanceof ChapterLoadError) {
					if (error.code === "rate-limit") {
						this.cooldownUntil =
							this.now() + (error.retryAfterSeconds ?? 60) * 1000;
						this.timer = setTimeout(
							() => void this.warm(generation, route),
							Math.max(0, this.cooldownUntil - this.now()),
						);
						return;
					}
					if (
						error.code === "access-denied" ||
						error.code === "configuration"
					) {
						this.stopped = true;
						return;
					}
				}
				// A failed neighbor remains eligible for a later committed scope position.
			} finally {
				if (this.background === controller) {
					this.background = undefined;
					this.backgroundKey = undefined;
				}
			}
		}
	}

	dispose() {
		this.generation++;
		this.foreground?.abort();
		this.background?.abort();
		clearTimeout(this.timer);
	}
}
