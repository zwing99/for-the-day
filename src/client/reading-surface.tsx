import {
	type ReactNode,
	type Ref,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	type Density,
	layoutBudget,
	type PackedCard,
	packChapter,
	reduceOverflowingGroups,
	verseCards,
} from "../domain/card-packing.js";
import type { SemanticChapter } from "../domain/semantic-chapter.js";
import { minimumFittingScale } from "./page-fitting.js";
import { interactiveTarget } from "./passage-gesture.js";
import { ChapterCards } from "./semantic-renderer.js";

/** Pick the last semantic marker above the reading line, including inside tall cards. */
export function verseAtReadingLine(
	markers: { key: string; top: number }[],
	line: number,
) {
	let key = markers[0]?.key;
	for (const marker of markers) {
		if (marker.top > line) break;
		key = marker.key;
	}
	return key;
}

export interface ReadingActions {
	move(direction: number): void;
}

export function readingLineOffset(
	height: number,
	padding: number,
	fontSize: number,
) {
	return Math.max(Math.min(120, height * 0.2), padding + fontSize * 1.5);
}

function pageContentSize(article: HTMLElement, surface: HTMLElement) {
	const padding = getComputedStyle(article);
	return {
		width:
			article.clientWidth -
			parseFloat(padding.paddingLeft) -
			parseFloat(padding.paddingRight),
		height:
			surface.clientHeight -
			parseFloat(padding.paddingTop) -
			parseFloat(padding.paddingBottom) -
			1,
	};
}
export function ReadingSurface({
	chapter,
	targetKey,
	restoreId,
	onLocation,
	onReady,
	density = "Spacious",
	fontSize = "normal",
	actions,
	intro,
}: {
	chapter: SemanticChapter;
	actions?: Ref<ReadingActions>;
	intro?: ReactNode;
	targetKey?: string;
	restoreId?: number;
	onLocation?: (key: string) => void;
	onReady?: () => void;
	density?: Density;
	fontSize?: "normal" | "large" | "larger";
}) {
	const content = useRef<HTMLDivElement>(null);
	const [active, setActive] = useState(targetKey ?? chapter.verses[0]?.key);
	const anchor = useRef(active);
	anchor.current = active;
	const priorRestore = useRef<number | undefined>(undefined);
	const completedRestore = useRef<number | undefined>(undefined);
	const [budget, setBudget] = useState({ columns: 28, lines: 16 });
	const [surfaceSize, setSurfaceSize] = useState({ width: 0, height: 0 });
	const [layoutOverride, setLayoutOverride] = useState<{
		key: string;
		cards: PackedCard[];
	}>();
	const [fitOverride, setFitOverride] = useState<{
		key: string;
		scales: Record<string, number>;
	}>();
	const layoutKey = `${chapter.identity.editionKey}:${chapter.identity.book}:${chapter.identity.chapter}:${density}:${fontSize}:${budget.columns}x${budget.lines}:${surfaceSize.width}x${surfaceSize.height}`;
	const baseCards = useMemo(
		() => packChapter(chapter, density, budget),
		[chapter, density, budget],
	);
	const cards =
		layoutOverride?.key === layoutKey ? layoutOverride.cards : baseCards;
	const atomicCards = useMemo(() => verseCards(chapter), [chapter]);
	const fontScales = fitOverride?.key === layoutKey ? fitOverride.scales : {};
	const fontScaleKey = Object.entries(fontScales)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([key, scale]) => `${key}:${scale}`)
		.join(";");
	const packingKey = cards.map((card) => card.key).join(";");
	useLayoutEffect(() => {
		const surface = content.current?.closest("main");
		if (!surface || !surface.clientHeight) return;
		const fit = () => {
			for (const page of surface.querySelectorAll<HTMLElement>(
				".intro, :scope > .attribution",
			)) {
				const literature = page.querySelector<HTMLElement>(
					".intro-literature, .end-literature",
				);
				if (!literature) continue;
				const scale = minimumFittingScale(
					(value) => {
						page.style.setProperty("--presentation-scale", String(value));
						const bounds = literature.getBoundingClientRect();
						return {
							width: Math.max(bounds.width, literature.scrollWidth),
							height: Math.max(bounds.height, literature.scrollHeight),
						};
					},
					pageContentSize(page, surface),
				);
				page.style.setProperty("--presentation-scale", String(scale));
				page.dataset.pageFitScale = String(scale);
			}
		};
		fit();
		surface.addEventListener("toggle", fit, true);
		return () => surface.removeEventListener("toggle", fit, true);
	}, [surfaceSize, chapter, fontSize, intro]);
	useEffect(() => {
		const surface = content.current?.closest("main");
		if (!surface) return;
		let timer: ReturnType<typeof setTimeout>;
		let disposed = false;
		function measure() {
			const card = content.current?.querySelector(".verse-card");
			if (!card) return;
			const css = getComputedStyle(card);
			if (!surface?.clientHeight || !card.getBoundingClientRect().width) return;
			const next = layoutBudget(
				card.getBoundingClientRect().width -
					parseFloat(css.paddingLeft) -
					parseFloat(css.paddingRight),
				surface!.clientHeight,
				parseFloat(css.fontSize),
				parseFloat(css.lineHeight),
				parseFloat(css.paddingTop) + parseFloat(css.paddingBottom),
			);
			setSurfaceSize((current) =>
				current.width === surface!.clientWidth &&
				current.height === surface!.clientHeight
					? current
					: {
							width: surface!.clientWidth,
							height: surface!.clientHeight,
						},
			);
			surface!.style.setProperty(
				"--reading-height",
				`${surface!.clientHeight}px`,
			);
			setBudget((current) =>
				current.columns === next.columns && current.lines === next.lines
					? current
					: next,
			);
		}
		const resize = () => {
			if (disposed) return;
			restoring.current = true;
			clearTimeout(timer);
			timer = setTimeout(measure, 120);
		};
		void document.fonts?.ready.then(resize);
		document.fonts?.addEventListener("loadingdone", resize);
		const observer =
			typeof ResizeObserver === "undefined"
				? undefined
				: new ResizeObserver(resize);
		observer?.observe(surface);
		window.addEventListener("resize", resize);
		resize();
		return () => {
			disposed = true;
			clearTimeout(timer);
			observer?.disconnect();
			document.fonts?.removeEventListener("loadingdone", resize);
			window.removeEventListener("resize", resize);
		};
	}, [fontSize]);
	useLayoutEffect(() => {
		const element = content.current;
		const surface = element?.closest("main");
		if (!element || !surface || !surface.clientHeight) return;
		const articles = [...element.querySelectorAll<HTMLElement>(".verse-card")];
		if (articles.length !== cards.length) return;
		const overflowingKeys = new Set<string>();
		for (const [index, article] of articles.entries()) {
			const card = cards[index];
			const literature = article.querySelector<HTMLElement>(".card-literature");
			if (!card || !literature || !literature.clientWidth) return;
			const available = pageContentSize(article, surface);
			const measure = (scale: number) => {
				article.style.setProperty("--page-font-scale", String(scale));
				const bounds = literature.getBoundingClientRect();
				return {
					width: Math.max(bounds.width, literature.scrollWidth),
					height: Math.max(bounds.height, literature.scrollHeight),
				};
			};
			const atPreference = measure(1);
			const overflow =
				atPreference.width > available.width ||
				atPreference.height > available.height;
			if (!overflow) continue;
			if (card.verseKeys.length > 1) overflowingKeys.add(card.key);
		}
		const reduced = reduceOverflowingGroups(
			cards,
			atomicCards,
			overflowingKeys,
		);
		if (reduced) {
			setLayoutOverride({ key: layoutKey, cards: reduced });
			setFitOverride({ key: layoutKey, scales: {} });
			return;
		}
		const nextScales: Record<string, number> = {};
		for (const [index, article] of articles.entries()) {
			const card = cards[index];
			const literature = article.querySelector<HTMLElement>(".card-literature");
			if (!card || !literature) continue;
			const available = pageContentSize(article, surface);
			const scale = minimumFittingScale((value) => {
				article.style.setProperty("--page-font-scale", String(value));
				const bounds = literature.getBoundingClientRect();
				return {
					width: Math.max(bounds.width, literature.scrollWidth),
					height: Math.max(bounds.height, literature.scrollHeight),
				};
			}, available);
			if (scale < 0.9999) nextScales[card.key] = scale;
		}
		if (
			fitOverride?.key !== layoutKey ||
			JSON.stringify(fitOverride.scales) !== JSON.stringify(nextScales)
		)
			setFitOverride({ key: layoutKey, scales: nextScales });
	}, [chapter, cards, atomicCards, layoutKey, fontScaleKey, fitOverride]);
	const restoring = useRef(false);
	const callbacks = useRef({ onLocation, onReady });
	callbacks.current = { onLocation, onReady };
	useLayoutEffect(() => {
		if (restoreId === undefined) return;
		const navigation = priorRestore.current !== restoreId;
		const wanted = navigation ? targetKey : anchor.current;
		priorRestore.current = restoreId;
		restoring.current = true;
		const marker = [
			...(content.current?.querySelectorAll<HTMLElement>(
				"[data-location-key]",
			) ?? []),
		].find((node) =>
			JSON.parse(node.dataset.locationKeys ?? "[]").includes(wanted),
		);
		const card =
			marker?.closest<HTMLElement>("article") ??
			(wanted === "intro"
				? content.current?.querySelector<HTMLElement>(".intro")
				: undefined);
		const surface = content.current?.closest("main");
		if (card && surface) {
			surface.style.scrollSnapType = "none";
			surface.scrollTo?.({
				top:
					surface.scrollTop +
					card.getBoundingClientRect().top -
					surface.getBoundingClientRect().top,
				behavior: "instant",
			});
			surface.style.scrollSnapType = "";
			setActive(wanted);
			if (navigation && !document.querySelector("dialog[open]"))
				card.focus({ preventScroll: true });
		}
		let second = 0;
		const frame = requestAnimationFrame(() => {
			second = requestAnimationFrame(() => {
				restoring.current = false;
				if (completedRestore.current !== restoreId) {
					completedRestore.current = restoreId;
					callbacks.current.onReady?.();
				} else if (wanted) callbacks.current.onLocation?.(wanted);
			});
		});
		return () => {
			cancelAnimationFrame(frame);
			cancelAnimationFrame(second);
		};
	}, [
		restoreId,
		targetKey,
		packingKey,
		budget,
		density,
		fontSize,
		surfaceSize,
	]);
	useEffect(() => {
		const element = content.current;
		const surface = element?.closest("main");
		if (!element || !surface) return;
		let frame = 0;
		let settled: ReturnType<typeof setTimeout>;
		let touching = false;
		const pages = () => [
			...element.querySelectorAll<HTMLElement>(".verse-card, .intro"),
			...surface.querySelectorAll<HTMLElement>(":scope > .attribution"),
		];
		const update = () => {
			if (restoring.current) return;
			const top = surface.getBoundingClientRect().top;
			const currentCard = pages().find(
				(page) => Math.abs(page.getBoundingClientRect().top - top) <= 2,
			);
			if (!currentCard || currentCard.classList.contains("attribution")) return;
			const markers = [
				...currentCard.querySelectorAll<HTMLElement>("[data-location-key]"),
			];
			const retained = markers.some((marker) =>
				JSON.parse(marker.dataset.locationKeys ?? "[]").includes(
					anchor.current,
				),
			);
			const key = currentCard.classList.contains("intro")
				? "intro"
				: retained
					? anchor.current
					: markers[0]?.dataset.locationKey;
			setActive(key);
			if (key) callbacks.current.onLocation?.(key);
		};
		const settle = () => {
			if (restoring.current || touching || document.getSelection()?.toString())
				return;
			const top = surface.getBoundingClientRect().top;
			const closest = pages().sort(
				(a, b) =>
					Math.abs(a.getBoundingClientRect().top - top) -
					Math.abs(b.getBoundingClientRect().top - top),
			)[0];
			if (closest) {
				const distance = closest.getBoundingClientRect().top - top;
				if (Math.abs(distance) > 2)
					surface.scrollTo?.({
						top: surface.scrollTop + distance,
						behavior: "instant",
					});
			}
			update();
		};
		const scroll = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(update);
			clearTimeout(settled);
			settled = setTimeout(settle, 180);
		};
		const touchStart = () => {
			touching = true;
			clearTimeout(settled);
		};
		const touchEnd = () => {
			touching = false;
			clearTimeout(settled);
			settled = setTimeout(settle, 180);
		};
		const resumeSnap = () => {
			surface.style.scrollSnapType = "";
		};
		surface.addEventListener("wheel", resumeSnap, { passive: true });
		surface.addEventListener("touchstart", resumeSnap, { passive: true });
		surface.addEventListener("keydown", resumeSnap);
		surface.addEventListener("scroll", scroll, { passive: true });
		surface.addEventListener("scrollend", settle);
		surface.addEventListener("touchstart", touchStart, { passive: true });
		surface.addEventListener("touchend", touchEnd, { passive: true });
		surface.addEventListener("touchcancel", touchEnd, { passive: true });
		window.addEventListener("resize", scroll);
		const observer =
			typeof IntersectionObserver === "undefined"
				? undefined
				: new IntersectionObserver(scroll, {
						root: surface,
						threshold: [0, 1],
					});
		for (const card of element.querySelectorAll("article"))
			observer?.observe(card);
		update();
		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(settled);
			surface.removeEventListener("scroll", scroll);
			surface.removeEventListener("scrollend", settle);
			surface.removeEventListener("touchstart", touchStart);
			surface.removeEventListener("touchend", touchEnd);
			surface.removeEventListener("touchcancel", touchEnd);
			window.removeEventListener("resize", scroll);
			observer?.disconnect();
			surface.removeEventListener("wheel", resumeSnap);
			surface.removeEventListener("touchstart", resumeSnap);
			surface.removeEventListener("keydown", resumeSnap);
		};
	}, [chapter, packingKey, !!intro]);
	function move(direction: number) {
		const surface = content.current?.closest("main");
		const cards = [
			...(content.current?.querySelectorAll<HTMLElement>(
				".verse-card, .intro",
			) ?? []),
			...(surface?.querySelectorAll<HTMLElement>(":scope > .attribution") ??
				[]),
		];
		const aligned = surface
			? cards.findIndex(
					(card) =>
						Math.abs(
							card.getBoundingClientRect().top -
								surface.getBoundingClientRect().top,
						) <= 2,
				)
			: -1;
		const index =
			aligned >= 0
				? aligned
				: cards.findIndex(
						(card) =>
							(active === "intro" && card.classList.contains("intro")) ||
							[
								...card.querySelectorAll<HTMLElement>("[data-location-key]"),
							].some((marker) =>
								JSON.parse(marker.dataset.locationKeys ?? "[]").includes(
									active,
								),
							),
					);
		const target = cards[index + direction];
		if (!target) return;
		target.scrollIntoView({
			block: "start",
			behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
				? "instant"
				: "smooth",
		});
		target.focus({ preventScroll: true });
	}
	useImperativeHandle(actions, () => ({ move }));
	return (
		<div
			ref={content}
			style={
				{
					"--reader-font-size":
						fontSize === "larger"
							? "1.75rem"
							: fontSize === "large"
								? "1.5rem"
								: "clamp(1rem, calc(0.33rem + var(--reading-height, 634px) * 0.0232), 1.25rem)",
				} as React.CSSProperties
			}
			data-active-verse={active}
			onKeyDown={(event) => {
				if (
					document.getSelection()?.toString() ||
					interactiveTarget(event.target) ||
					event.altKey ||
					event.ctrlKey ||
					event.metaKey ||
					event.shiftKey
				)
					return;
				if (!["ArrowUp", "ArrowDown", "PageUp", "PageDown"].includes(event.key))
					return;
				const surface = content.current?.closest("main");
				if (!surface) return;
				event.preventDefault();
				move(event.key === "ArrowDown" || event.key === "PageDown" ? 1 : -1);
			}}
		>
			{intro}
			<ChapterCards chapter={chapter} cards={cards} fontScales={fontScales} />
		</div>
	);
}
