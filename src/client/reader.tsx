import { useEffect, useMemo, useRef, useState } from "react";
import {
	parseReaderRoute,
	type ReaderRoute,
	RouteError,
	readerPath,
	routeVerse,
} from "../domain/reader-route.js";
import { currentLocalDay, readingPlan } from "../domain/reading-plan.js";
import type {
	SemanticChapter,
	Translation,
} from "../domain/semantic-chapter.js";
import { mapTranslationLocation } from "../domain/translation-location.js";
import { useBrowserAppearance } from "./browser-appearance.js";
import { AdjacentPreparation } from "./adjacent-preparation.js";
import {
	ChapterLoadError,
	type ChapterSource,
	networkChapterSource,
} from "./chapter-source.js";
import { reportChapterDisplay } from "./fums.js";
import {
	InstallInvitation,
	useInstallInvitation,
} from "./install-invitation.js";
import {
	interactiveTarget,
	type PassageDrag,
	usePassageGesture,
} from "./passage-gesture.js";
import { ReaderMenu } from "./reader-menu.js";
import { passageLocation } from "./passage-location.js";
import {
	browserReadingStorage,
	localCalendarKey,
	type Preferences,
	type ReadingStorage,
} from "./reading-storage.js";
import { type ReadingActions, ReadingSurface } from "./reading-surface.js";
import { Attribution, IntroTitles } from "./semantic-renderer.js";

let activationSequence = 0;
const identity = (route: ReaderRoute) =>
	`${route.day}:${route.translation}:${route.book}:${route.chapter}`;
function PassageIntro({
	route,
	chapter,
	onBegin,
}: {
	route: ReaderRoute;
	chapter: SemanticChapter;
	onBegin?: () => void;
}) {
	const name = `${route.book === "PSA" ? "Psalm" : "Proverbs"} ${route.chapter}`;
	return (
		<article
			className="intro"
			tabIndex={-1}
			aria-label={`${name} introduction`}
		>
			<div className="intro-literature">
				<p className="eyebrow">
					Day {route.day} · {route.translation}
				</p>
				<h1>{name}</h1>
				<IntroTitles chapter={chapter} />
				<p className="gesture-hint">
					Swipe up to read · swipe left for the next passage
				</p>
				<button
					className="text-action"
					onClick={onBegin}
					tabIndex={onBegin ? undefined : -1}
				>
					Begin reading <span aria-hidden="true">↓</span>
				</button>
			</div>
		</article>
	);
}
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
	const preparation = useMemo(
		() => (source.cacheAware ? new AdjacentPreparation(source) : undefined),
		[source],
	);
	const [preferences, setPreferences] = useState(() =>
		repository.preferences(),
	);
	useBrowserAppearance(preferences.appearance);
	const preferencesRef = useRef(preferences);
	preferencesRef.current = preferences;
	const following = useRef<string | undefined>(undefined);
	const [menuOpen, setMenuOpen] = useState(false);
	const install = useInstallInvitation();
	const [drag, setDrag] = useState<PassageDrag>({ phase: "idle", offset: 0 });
	const [handoff, setHandoff] = useState<{
		route: ReaderRoute;
		direction: number;
		restoreId: number;
	}>();
	const stage = useRef<HTMLDivElement>(null);
	const menuTrigger = useRef<HTMLButtonElement>(null);
	const actions = useRef<ReadingActions>(null);
	const previewActions = useRef<ReadingActions>(null);
	const [visibleLocation, setVisibleLocation] = useState<string>();
	const [activeLayoutUnavailable, setActiveLayoutUnavailable] = useState(false);
	const [previewLayoutUnavailable, setPreviewLayoutUnavailable] =
		useState(false);
	function updatePreferences(next: Preferences) {
		repository.setPreferences(next);
		setPreferences(next);
	}
	function readRoute() {
		try {
			repository.lastFollowingDate();
			const url = new URL(window.location.href);
			const root = url.pathname === "/";
			const follows = root || window.history.state?.dayFollowing === true;
			const date = follows ? localCalendarKey() : undefined;
			following.current = date;
			let route = parseReaderRoute(url, preferencesRef.current.translation);
			if (url.pathname === "/" || /^\/\d+$/.test(url.pathname)) {
				const hint = date
					? repository.lastFollowingDate() === date
						? repository.dateActivePassage(date)
						: undefined
					: repository.activePassage(route.day);
				if (hint) route = { ...route, book: hint.book, chapter: hint.chapter };
			}
			if (date) {
				if (!root && repository.lastFollowingDate() !== date) {
					const first = readingPlan(Number(date.slice(-2)))[0]!;
					route = {
						...route,
						day: Number(date.slice(-2)),
						...first,
						location: undefined,
						orgIds: undefined,
					};
				}
				repository.setFollowingDate(date);
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
	const activeRequest = useRef<AbortController | undefined>(undefined);
	const switchRequest = useRef<AbortController | undefined>(undefined);
	const [switching, setSwitching] = useState<Translation>();
	const [switchFailure, setSwitchFailure] = useState<{
		translation: Translation;
		error: ChapterLoadError;
	}>();
	const [switchRetryReady, setSwitchRetryReady] = useState(true);
	useEffect(() => {
		const failure = switchFailure?.error;
		setSwitchRetryReady(failure?.code !== "rate-limit");
		if (failure?.code !== "rate-limit") return;
		const timer = setTimeout(
			() => setSwitchRetryReady(true),
			(failure.retryAfterSeconds ?? 60) * 1000,
		);
		return () => clearTimeout(timer);
	}, [switchFailure]);
	const [mappingNotice, setMappingNotice] = useState(false);
	const [error, setError] = useState<ChapterLoadError>();
	const [attempt, setAttempt] = useState(0);
	const [retryReady, setRetryReady] = useState(true);
	const current = useRef<ReaderRoute | undefined>(undefined);
	function flush() {
		if (current.current) {
			repository.savePosition(current.current);
			if (following.current)
				repository.saveDatePosition(following.current, current.current);
		}
	}
	function navigate(
		next: ReaderRoute,
		replace = false,
		swipeDirection?: number,
	) {
		setHandoff(
			previewChapter &&
				previewKey === identity(next) &&
				previewReady === previewPresentationKey &&
				swipeDirection
				? { route: next, direction: swipeDirection, restoreId: navigation.id }
				: undefined,
		);
		activeRequest.current?.abort();
		switchRequest.current?.abort();
		setSwitching(undefined);
		setSwitchFailure(undefined);
		setMappingNotice(false);
		flush();
		const id = ++activationSequence;
		activeNavigation.current = id;
		readyNavigation.current = undefined;
		current.current = undefined;
		setVisibleLocation(undefined);
		setError(undefined);
		if (
			previewChapter &&
			previewKey === identity(next) &&
			previewReady === previewPresentationKey
		)
			setResult({
				chapter: previewChapter,
				key: identity(next),
				activation: `chapter-${++activationSequence}`,
			});
		window.history[replace ? "replaceState" : "pushState"](
			following.current ? { dayFollowing: true } : null,
			"",
			readerPath(next),
		);
		setNavigation({ route: next, id });
	}
	useEffect(() => {
		const pop = () => {
			setHandoff(undefined);
			activeRequest.current?.abort();
			switchRequest.current?.abort();
			setSwitching(undefined);
			setSwitchFailure(undefined);
			setMappingNotice(false);
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
			else if (document.visibilityState === "visible" && following.current) {
				const date = localCalendarKey();
				if (date !== following.current) {
					flush();
					current.current = undefined;
					following.current = date;
					repository.setFollowingDate(date);
					const first = readingPlan(Number(date.slice(-2)))[0]!;
					navigate({
						day: Number(date.slice(-2)),
						...first,
						translation: preferencesRef.current.translation,
					});
				}
			}
		};
		window.addEventListener("popstate", pop);
		window.addEventListener("pagehide", flush);
		document.addEventListener("visibilitychange", hidden);
		return () => {
			switchRequest.current?.abort();
			window.removeEventListener("popstate", pop);
			window.removeEventListener("pagehide", flush);
			document.removeEventListener("visibilitychange", hidden);
		};
	}, [repository]);
	useEffect(() => {
		if (!route) return;
		preparation?.setActive(route);
	}, [key, preparation]);
	useEffect(() => () => preparation?.dispose(), [preparation]);
	useEffect(() => {
		if (route && result?.key === key) preparation?.startAfterUsable(route);
	}, [key, result, preparation]);
	useEffect(() => {
		if (!route) return;
		if (result?.key === key) return;
		const controller = new AbortController();
		activeRequest.current = controller;
		setError(undefined);
		setResult(undefined);
		(preparation
			? preparation.load(route, controller.signal)
			: source.get(route, controller.signal, {
					translation: route.translation,
					readingDay: route.day,
					timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				})
		)
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
		return () => {
			controller.abort();
			if (activeRequest.current === controller)
				activeRequest.current = undefined;
		};
	}, [key, source, preparation, attempt]);
	const chapter = result?.key === key ? result.chapter : undefined;
	async function switchTranslation(translation: Translation) {
		if (!route || translation === route.translation) return;
		switchRequest.current?.abort();
		const controller = new AbortController();
		switchRequest.current = controller;
		setSwitching(translation);
		setSwitchFailure(undefined);
		try {
			const nextChapter = await source.get(route, controller.signal, {
				translation,
				readingDay: route.day,
				timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			});
			if (controller.signal.aborted) return;
			const anchor = current.current ?? location ?? route;
			const sourceVerse = chapter
				? (routeVerse(chapter, anchor) ?? chapter.verses[0]!)
				: undefined;
			const mapped =
				anchor.location === "intro" ||
				(!chapter && !anchor.location && preferencesRef.current.intros)
					? undefined
					: chapter && sourceVerse
						? mapTranslationLocation(chapter, sourceVerse, nextChapter)
						: {
								verse:
									nextChapter.verses.find(
										(verse) => verse.displayLabel === anchor.location,
									) ?? nextChapter.verses[0]!,
								approximate: !!anchor.location,
							};
			const next = {
				...anchor,
				translation,
				location: mapped?.verse.displayLabel ?? "intro",
				orgIds: mapped?.verse.orgIds,
			};
			navigate(next);
			setError(undefined);
			setResult({
				chapter: nextChapter,
				key: identity(next),
				activation: `chapter-${++activationSequence}`,
			});
			setMappingNotice(mapped?.approximate ?? false);
			updatePreferences({ ...preferencesRef.current, translation });
		} catch (failure) {
			if (!controller.signal.aborted)
				setSwitchFailure({
					translation,
					error:
						failure instanceof ChapterLoadError
							? failure
							: new ChapterLoadError(
									"unavailable",
									"Scripture is temporarily unavailable. Please try again.",
								),
				});
		} finally {
			if (switchRequest.current === controller) setSwitching(undefined);
		}
	}
	let location: ReaderRoute | undefined;
	let routeError = navigation.error;
	if (route && chapter) {
		try {
			location = passageLocation(
				route,
				chapter,
				preferences,
				repository,
				following.current,
			);
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
		const previous = current.current;
		if (
			previous?.day === next.day &&
			previous.book === next.book &&
			previous.chapter === next.chapter &&
			previous.translation === next.translation &&
			previous.location === next.location &&
			JSON.stringify(previous.orgIds ?? []) ===
				JSON.stringify(next.orgIds ?? [])
		)
			return;
		setVisibleLocation(next.location);
		current.current = next;
		repository.savePosition(next);
		if (following.current) repository.saveDatePosition(following.current, next);
		window.history.replaceState(
			following.current ? { dayFollowing: true } : null,
			"",
			readerPath(next),
		);
	}
	const plan = route ? readingPlan(route.day) : [];
	const index = plan.findIndex(
		(p) => p.book === route?.book && p.chapter === route?.chapter,
	);
	function changePassage(direction: number) {
		const passage = plan[index + direction];
		if (route && passage)
			navigate(
				{
					...route,
					...passage,
					location: undefined,
					orgIds: undefined,
				},
				false,
				direction,
			);
	}
	const { slide, ...gestures } = usePassageGesture(changePassage, {
		disabled: menuOpen || !route || !!routeError,
		resetKey: `${navigation.id}:${preferences.density}:${preferences.fontSize}`,
		canMove: (direction) => !!plan[index + direction],
		progress: setDrag,
		width: () => stage.current?.clientWidth ?? window.innerWidth,
	});
	const neighbor = drag.direction ? plan[index + drag.direction] : undefined;
	const previewRoute =
		handoff?.route ??
		(drag.phase !== "idle" && route && neighbor
			? {
					...route,
					...neighbor,
					location: undefined,
					orgIds: undefined,
				}
			: undefined);
	const previewKey =
		previewRoute && source.cacheAware ? identity(previewRoute) : undefined;
	const [previewResult, setPreviewResult] = useState<{
		key: string;
		chapter: SemanticChapter;
	}>();
	const [previewReady, setPreviewReady] = useState<string>();
	const [previewLayoutRevision, setPreviewLayoutRevision] = useState(0);
	useEffect(() => {
		const resize = () => setPreviewLayoutRevision((value) => value + 1);
		window.addEventListener("resize", resize);
		return () => window.removeEventListener("resize", resize);
	}, []);
	const previewPresentationKey = `${previewKey}:${preferences.density}:${preferences.fontSize}:${previewLayoutRevision}`;
	useEffect(() => setPreviewReady(undefined), [previewPresentationKey]);
	useEffect(() => setPreviewLayoutUnavailable(false), [previewPresentationKey]);
	useEffect(() => {
		if (!previewRoute || !previewKey) return;
		const controller = new AbortController();
		setPreviewReady(undefined);
		source
			.get(previewRoute, controller.signal, {
				translation: previewRoute.translation,
				readingDay: previewRoute.day,
				timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			})
			.then((chapter) => {
				if (
					!controller.signal.aborted &&
					chapter.identity.translation === previewRoute.translation &&
					chapter.identity.book === previewRoute.book &&
					chapter.identity.chapter === previewRoute.chapter
				)
					setPreviewResult({ key: previewKey, chapter });
			})
			.catch(() => {
				/* The labeled placeholder remains available. */
			});
		return () => controller.abort();
	}, [previewKey, source]);
	const previewChapter =
		previewResult && previewKey && previewResult.key === previewKey
			? previewResult.chapter
			: undefined;
	let previewLocation: ReaderRoute | undefined;
	if (previewRoute && previewChapter) {
		try {
			previewLocation = passageLocation(
				previewRoute,
				previewChapter,
				preferences,
				repository,
				following.current,
			);
		} catch {
			/* An invalid saved anchor leaves the preview unavailable. */
		}
	}
	const previewHandoffReady =
		!!handoff &&
		previewKey === identity(handoff.route) &&
		!!previewChapter &&
		!!previewLocation &&
		previewReady === previewPresentationKey;
	const previewRetryAvailable = !!handoff && previewLayoutUnavailable;
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
		flush();
		following.current = undefined;
		const next = readingPlan(day)[0]!;
		navigate({
			day,
			...next,
			translation: route?.translation ?? preferences.translation,
		});
	}
	function selectToday() {
		flush();
		current.current = undefined;
		const date = localCalendarKey();
		following.current = date;
		const day = Number(date.slice(-2));
		const first = readingPlan(day)[0]!;
		const hint =
			repository.lastFollowingDate() === date
				? repository.dateActivePassage(date)
				: undefined;
		repository.setFollowingDate(date);
		navigate({
			day,
			...(hint ?? first),
			translation: route?.translation ?? preferences.translation,
		});
	}
	function restart(day: boolean) {
		if (!route) return;
		flush();
		for (const p of day ? plan : [route])
			repository.resetPosition({ ...route, ...p });
		if (following.current)
			for (const p of day ? plan : [route])
				repository.resetDatePosition(following.current, { ...route, ...p });
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
				{(switching || switchFailure || mappingNotice) && (
					<div className="translation-notice" role="status" aria-live="polite">
						{switching ? (
							`Loading ${switching}… You can keep reading.`
						) : switchFailure ? (
							<>
								{switchFailure.error.message}{" "}
								{chapter
									? "Your current translation remains available."
									: "Choose another translation or try again."}
								<button
									disabled={!switchRetryReady}
									onClick={() =>
										void switchTranslation(switchFailure.translation)
									}
								>
									Retry translation
								</button>
							</>
						) : (
							"Approximate verse match. Numbering differs or verified alignment is unavailable."
						)}
					</div>
				)}
			</header>
			<InstallInvitation install={install} />
			<div
				ref={stage}
				className="passage-stage"
				data-transition={drag.phase}
				data-handoff={previewHandoffReady ? "ready" : undefined}
			>
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
						<section className="reader-recovery" role="alert">
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
						<section className="reader-recovery">
							<div role="alert">
								<p>{error.message}</p>
							</div>
							{error.code === "rate-limit" && (
								<p className="recovery-guidance" role="status">
									{retryReady
										? "You can try again now."
										: "Retry will become available after the provider’s waiting period. You can choose another translation in the reader menu."}
								</p>
							)}
							<button
								disabled={!retryReady}
								onClick={() => setAttempt((value) => value + 1)}
							>
								{retryReady ? "Try again" : "Please wait before retrying"}
							</button>
						</section>
					) : !chapter || !location ? (
						<p className="reader-loading" role="status">
							Loading Scripture for {passageName}…
						</p>
					) : (
						<>
							<ReadingSurface
								key={key}
								actions={actions}
								onLayoutUnavailable={setActiveLayoutUnavailable}
								chapter={chapter}
								density={preferences.density}
								fontSize={preferences.fontSize}
								deferFocus={!!handoff}
								restoreId={navigation.id}
								targetKey={intro ? "intro" : routeVerse(chapter, location)?.key}
								intro={
									preferences.intros ? (
										<PassageIntro
											route={route!}
											chapter={chapter}
											onBegin={() =>
												navigate(
													{
														...location!,
														location: chapter.verses[0]!.displayLabel,
														orgIds: undefined,
													},
													true,
												)
											}
										/>
									) : undefined
								}
								onReady={() => {
									if (activeNavigation.current !== navigation.id) return;
									readyNavigation.current = navigation.id;
									record(location!);
									setHandoff(undefined);
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
				{activeLayoutUnavailable && !previewHandoffReady && (
					<section
						className="reading-layout-fallback"
						role="status"
						aria-label={`${passageName} layout recovery`}
					>
						<p>Still preparing this page.</p>
						<button onClick={() => actions.current?.retryLayout()}>
							Retry page layout
						</button>
					</section>
				)}
				{previewRoute && (drag.phase !== "idle" || handoff) && (
					<main
						className="passage-preview reading-scroll"
						inert={!previewHandoffReady && !previewRetryAvailable}
						aria-hidden={!previewHandoffReady && !previewRetryAvailable}
						style={{
							transform: handoff
								? "translateX(0)"
								: `translateX(calc(${drag.direction === 1 ? "100%" : "-100%"} + ${drag.offset}px))`,
						}}
					>
						<div
							className="passage-preview-placeholder"
							hidden={
								!!previewChapter &&
								!!previewLocation &&
								previewReady === previewPresentationKey
							}
						>
							<p className="eyebrow">
								{(drag.direction || handoff?.direction) === 1
									? "Next reading"
									: "Previous reading"}
							</p>
							<h2>
								{previewRoute.book === "PSA" ? "Psalm" : "Proverbs"}{" "}
								{previewRoute.chapter}
							</h2>
							<p>Loading Scripture…</p>
							{previewLayoutUnavailable && handoff && (
								<button onClick={() => previewActions.current?.retryLayout()}>
									Retry page layout
								</button>
							)}
						</div>
						{previewChapter && previewLocation && (
							<div
								className="passage-preview-content"
								style={{
									visibility:
										previewReady === previewPresentationKey
											? "visible"
											: "hidden",
								}}
							>
								<ReadingSurface
									key={previewKey}
									actions={previewActions}
									chapter={previewChapter}
									passive
									density={preferences.density}
									fontSize={preferences.fontSize}
									restoreId={handoff?.restoreId ?? navigation.id}
									targetKey={
										previewLocation.location === "intro"
											? "intro"
											: routeVerse(previewChapter, previewLocation)?.key
									}
									intro={
										preferences.intros ? (
											<PassageIntro
												route={previewRoute!}
												chapter={previewChapter}
											/>
										) : undefined
									}
									onReady={() => setPreviewReady(previewPresentationKey)}
									onPreparing={() => setPreviewReady(undefined)}
									onLayoutUnavailable={setPreviewLayoutUnavailable}
								/>
								<Attribution chapter={previewChapter} />
							</div>
						)}
					</main>
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
				install={install}
				open={menuOpen}
				onClose={() => {
					setMenuOpen(false);
					menuTrigger.current?.focus();
				}}
				preferences={{
					...preferences,
					translation: route?.translation ?? preferences.translation,
				}}
				onTranslation={(value) => void switchTranslation(value)}
				onPreferences={updatePreferences}
				day={route?.day ?? currentLocalDay()}
				plan={plan}
				index={index}
				onPassage={selectPassage}
				onDay={selectDay}
				onToday={selectToday}
				onRestart={restart}
				onCard={(direction) => actions.current?.move(direction)}
				chapter={chapter}
				getLink={
					chapter && location && !routeError
						? () =>
								new URL(
									readerPath(current.current ?? location),
									window.location.origin,
								).href
						: undefined
				}
			/>
		</div>
	);
}
