import { useEffect, useRef, useState } from "react";
import {
	parseReaderRoute,
	type ReaderRoute,
	RouteError,
	readerPath,
	routeVerse,
} from "../domain/reader-route.js";
import { currentLocalDay, readingPlan } from "../domain/reading-plan.js";
import type { SemanticChapter } from "../domain/semantic-chapter.js";
import {
	ChapterLoadError,
	type ChapterSource,
	networkChapterSource,
} from "./chapter-source.js";
import { reportChapterDisplay } from "./fums.js";
import {
	interactiveTarget,
	type PassageDrag,
	usePassageGesture,
} from "./passage-gesture.js";
import { ReaderMenu } from "./reader-menu.js";
import {
	browserReadingStorage,
	type Preferences,
	type ReadingStorage,
} from "./reading-storage.js";
import { type ReadingActions, ReadingSurface } from "./reading-surface.js";
import { Attribution, IntroTitles } from "./semantic-renderer.js";

let activationSequence = 0;
const identity = (route: ReaderRoute) =>
	`${route.day}:${route.translation}:${route.book}:${route.chapter}`;
export function Reader({
	source = networkChapterSource,
	report = reportChapterDisplay,
	storage,
}: {
	source?: ChapterSource;
	report?: typeof reportChapterDisplay;
	storage?: ReadingStorage;
}) {
	const repository = useRef(storage ?? browserReadingStorage()).current;
	const [preferences, setPreferences] = useState(() =>
		repository.preferences(),
	);
	const preferencesRef = useRef(preferences);
	preferencesRef.current = preferences;
	const [menuOpen, setMenuOpen] = useState(false);
	const [drag, setDrag] = useState<PassageDrag>({ phase: "idle", offset: 0 });
	const stage = useRef<HTMLDivElement>(null);
	const menuTrigger = useRef<HTMLButtonElement>(null);
	const actions = useRef<ReadingActions>(null);
	const [visibleLocation, setVisibleLocation] = useState<string>();
	function updatePreferences(next: Preferences) {
		repository.setPreferences(next);
		setPreferences(next);
	}
	function readRoute() {
		try {
			const url = new URL(window.location.href);
			let route = parseReaderRoute(url, preferencesRef.current.translation);
			if (url.pathname === "/" || /^\/\d+$/.test(url.pathname)) {
				const hint = repository.activePassage(route.day);
				if (hint) route = { ...route, book: hint.book, chapter: hint.chapter };
			}
			return { route, id: ++activationSequence };
		} catch (error) {
			return {
				error:
					error instanceof RouteError
						? error
						: new RouteError("This reading link is invalid."),
				id: ++activationSequence,
			};
		}
	}
	const [navigation, setNavigation] = useState(readRoute);
	const activeNavigation = useRef(navigation.id);
	const readyNavigation = useRef<number | undefined>(undefined);
	const route = navigation.route;
	const key = route ? identity(route) : "invalid";
	const [result, setResult] = useState<{
		chapter: SemanticChapter;
		key: string;
		activation: string;
	}>();
	const [error, setError] = useState<ChapterLoadError>();
	const [attempt, setAttempt] = useState(0);
	const [retryReady, setRetryReady] = useState(true);
	const current = useRef<ReaderRoute | undefined>(undefined);
	function flush() {
		if (current.current) repository.savePosition(current.current);
	}
	function navigate(next: ReaderRoute, replace = false) {
		flush();
		const id = ++activationSequence;
		activeNavigation.current = id;
		readyNavigation.current = undefined;
		current.current = undefined;
		setVisibleLocation(undefined);
		window.history[replace ? "replaceState" : "pushState"](
			null,
			"",
			readerPath(next),
		);
		setNavigation({ route: next, id });
	}
	useEffect(() => {
		const pop = () => {
			flush();
			const next = readRoute();
			activeNavigation.current = next.id;
			readyNavigation.current = undefined;
			current.current = undefined;
			setVisibleLocation(undefined);
			setNavigation(next);
		};
		const hidden = () => {
			if (document.visibilityState === "hidden") flush();
		};
		window.addEventListener("popstate", pop);
		window.addEventListener("pagehide", flush);
		document.addEventListener("visibilitychange", hidden);
		return () => {
			window.removeEventListener("popstate", pop);
			window.removeEventListener("pagehide", flush);
			document.removeEventListener("visibilitychange", hidden);
		};
	}, [repository]);
	useEffect(() => {
		if (!route) return;
		const controller = new AbortController();
		setError(undefined);
		setResult(undefined);
		source
			.get(route, controller.signal, {
				translation: route.translation,
				readingDay: route.day,
				timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			})
			.then((chapter) => {
				if (!controller.signal.aborted)
					setResult({
						chapter,
						key,
						activation: `chapter-${++activationSequence}`,
					});
			})
			.catch((failure) => {
				if (!controller.signal.aborted)
					setError(
						failure instanceof ChapterLoadError
							? failure
							: new ChapterLoadError(
									"unavailable",
									"Scripture is temporarily unavailable. Please try again.",
								),
					);
			});
		return () => controller.abort();
	}, [key, source, attempt]);
	const chapter = result?.key === key ? result.chapter : undefined;
	let location: ReaderRoute | undefined;
	let routeError = navigation.error;
	if (route && chapter) {
		try {
			const saved = repository.position(route);
			location = route.location
				? route
				: saved?.translation === route.translation
					? saved
					: {
							...route,
							location: preferences.intros
								? "intro"
								: chapter.verses[0]?.displayLabel,
						};
			if (location.location === "intro" && !preferences.intros)
				location = { ...location, location: chapter.verses[0]?.displayLabel };
			routeVerse(chapter, location);
		} catch (failure) {
			routeError = failure as RouteError;
		}
	}
	const intro = location?.location === "intro";
	useEffect(() => {
		if (chapter && result && location && !routeError)
			report(
				chapter,
				result.activation,
				visibleLocation ? visibleLocation !== "intro" : !intro,
			);
	}, [chapter, result, intro, visibleLocation, report, routeError]);
	useEffect(() => {
		if (error?.code !== "rate-limit") {
			setRetryReady(true);
			return;
		}
		setRetryReady(false);
		const timer = setTimeout(
			() => setRetryReady(true),
			(error.retryAfterSeconds ?? 60) * 1000,
		);
		return () => clearTimeout(timer);
	}, [error]);
	function record(next: ReaderRoute) {
		setVisibleLocation(next.location);
		current.current = next;
		repository.savePosition(next);
		window.history.replaceState(null, "", readerPath(next));
	}
	const plan = route ? readingPlan(route.day) : [];
	const index = plan.findIndex(
		(p) => p.book === route?.book && p.chapter === route?.chapter,
	);
	function changePassage(direction: number) {
		const passage = plan[index + direction];
		if (route && passage)
			navigate({
				...route,
				...passage,
				location: undefined,
				orgIds: undefined,
			});
	}
	const { slide, ...gestures } = usePassageGesture(changePassage, {
		disabled: menuOpen || !route || !!routeError,
		resetKey: `${navigation.id}:${preferences.density}:${preferences.fontSize}`,
		canMove: (direction) => !!plan[index + direction],
		progress: setDrag,
		width: () => stage.current?.clientWidth ?? window.innerWidth,
	});
	const neighbor = drag.direction ? plan[index + drag.direction] : undefined;
	const passageName = route
		? `${route.book === "PSA" ? "Psalm" : "Proverbs"} ${route.chapter}`
		: "Reading link";
	function selectPassage(i: number) {
		if (route && plan[i])
			navigate({
				...route,
				...plan[i]!,
				location: undefined,
				orgIds: undefined,
			});
	}
	function selectDay(day: number) {
		const next = readingPlan(day)[0]!;
		navigate({
			day,
			...next,
			translation: route?.translation ?? preferences.translation,
		});
	}
	function restart(day: boolean) {
		if (!route) return;
		flush();
		for (const p of day ? plan : [route])
			repository.resetPosition({ ...route, ...p });
		current.current = undefined;
		const passage = day ? plan[0]! : route;
		navigate({
			...route,
			...passage,
			location: preferences.intros ? "intro" : undefined,
			orgIds: undefined,
		});
	}
	return (
		<div
			className="reader-shell"
			data-appearance={preferences.appearance}
			data-verse-labels={preferences.verseLabels}
		>
			<header className="reader-context">
				<div>
					<span className="reader-brand">
						For the day · {route ? `Day ${route.day}` : "Reading link"}
					</span>
					<p>
						{passageName}{" "}
						<span className="translation-label">{route?.translation}</span>
					</p>
				</div>
				<button
					ref={menuTrigger}
					className="menu-trigger"
					aria-label="Open reader menu"
					aria-haspopup="dialog"
					aria-expanded={menuOpen}
					onClick={() => setMenuOpen(true)}
				>
					<span aria-hidden="true">☰</span>
				</button>
			</header>
			<div ref={stage} className="passage-stage" data-transition={drag.phase}>
				<main
					className="reading-scroll"
					style={{ transform: `translateX(${drag.offset}px)` }}
					tabIndex={0}
					aria-label="Scripture reader"
					{...gestures}
					onKeyDown={(event) => {
						if (
							menuOpen ||
							document.getSelection()?.toString() ||
							interactiveTarget(event.target) ||
							event.altKey ||
							event.ctrlKey ||
							event.metaKey ||
							event.shiftKey
						)
							return;
						if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
							event.preventDefault();
							slide(event.key === "ArrowRight" ? 1 : -1);
						}
					}}
				>
					{routeError ? (
						<section role="alert">
							<p>{routeError.message}</p>
							<a
								href={
									route
										? readerPath({
												...route,
												location: undefined,
												orgIds: undefined,
											})
										: "/"
								}
							>
								Open a valid reading
							</a>
						</section>
					) : error ? (
						<section role="alert">
							<p>{error.message}</p>
							<button
								disabled={!retryReady}
								onClick={() => setAttempt((value) => value + 1)}
							>
								{retryReady ? "Try again" : "Please wait before retrying"}
							</button>
						</section>
					) : !chapter || !location ? (
						<p role="status">Loading Scripture…</p>
					) : (
						<>
							<ReadingSurface
								key={key}
								actions={actions}
								chapter={chapter}
								density={preferences.density}
								fontSize={preferences.fontSize}
								restoreId={navigation.id}
								targetKey={intro ? "intro" : routeVerse(chapter, location)?.key}
								intro={
									preferences.intros ? (
										<article
											className="intro"
											tabIndex={-1}
											aria-label={`${passageName} introduction`}
										>
											<div className="intro-literature">
												<p className="eyebrow">
													Day {route?.day} · {route?.translation}
												</p>
												<h1>{passageName}</h1>
												<IntroTitles chapter={chapter} />
												<p className="gesture-hint">
													Swipe up to read · swipe left for the next passage
												</p>
												<button
													className="text-action"
													onClick={() =>
														navigate(
															{
																...location!,
																location: chapter.verses[0]!.displayLabel,
																orgIds: undefined,
															},
															true,
														)
													}
												>
													Begin reading <span aria-hidden="true">↓</span>
												</button>
											</div>
										</article>
									) : undefined
								}
								onReady={() => {
									if (activeNavigation.current !== navigation.id) return;
									readyNavigation.current = navigation.id;
									record(location!);
								}}
								onLocation={(verseKey) => {
									if (
										activeNavigation.current !== navigation.id ||
										readyNavigation.current !== navigation.id
									)
										return;
									if (verseKey === "intro") {
										record({ ...route!, location: "intro", orgIds: undefined });
										return;
									}
									const verse = chapter.verses.find((v) => v.key === verseKey);
									if (verse)
										record({
											...route!,
											location: verse.displayLabel,
											orgIds: verse.orgIds,
										});
								}}
							/>
							<Attribution chapter={chapter} />
						</>
					)}
				</main>
				{neighbor && drag.phase !== "idle" && (
					<div
						className="passage-preview"
						inert
						aria-hidden="true"
						style={{
							transform: `translateX(calc(${drag.direction === 1 ? "100%" : "-100%"} + ${drag.offset}px))`,
						}}
					>
						<div>
							<p className="eyebrow">
								{drag.direction === 1 ? "Next reading" : "Previous reading"}
							</p>
							<h2>
								{neighbor.book === "PSA" ? "Psalm" : "Proverbs"}{" "}
								{neighbor.chapter}
							</h2>
							<p>Loading Scripture…</p>
						</div>
					</div>
				)}
			</div>
			<nav className="passage-indicators" aria-label="Passages">
				{plan.map((p, i) => (
					<button
						key={`${p.book}:${p.chapter}`}
						aria-label={`${p.book === "PSA" ? "Psalm" : "Proverbs"} ${p.chapter}`}
						aria-current={i === index ? "page" : undefined}
						onClick={() => selectPassage(i)}
					>
						<span
							aria-hidden="true"
							className={i === index ? "active-indicator" : ""}
						/>
					</button>
				))}
			</nav>
			<ReaderMenu
				open={menuOpen}
				onClose={() => {
					setMenuOpen(false);
					menuTrigger.current?.focus();
				}}
				preferences={preferences}
				onPreferences={updatePreferences}
				day={route?.day ?? currentLocalDay()}
				plan={plan}
				index={index}
				onPassage={selectPassage}
				onDay={selectDay}
				onRestart={restart}
				onCard={(direction) => actions.current?.move(direction)}
				chapter={chapter}
			/>
		</div>
	);
}
