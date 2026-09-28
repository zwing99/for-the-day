import { useEffect, useRef } from "react";
import { currentLocalDay, type Passage } from "../domain/reading-plan.js";
import type { SemanticChapter } from "../domain/semantic-chapter.js";
import type { InstallController } from "./install-invitation.js";
import { PwaUpdateNotice } from "./pwa-update-notice.js";
import type { Preferences } from "./reading-storage.js";
import { Attribution } from "./semantic-renderer.js";
import { ShareLink } from "./share-link.js";

export function ReaderMenu({
	open,
	onClose,
	preferences,
	onPreferences,
	onTranslation,
	day,
	plan,
	index,
	onPassage,
	onDay,
	onToday,
	install,
	onRestart,
	onCard,
	chapter,
	getLink,
}: {
	open: boolean;
	onClose(): void;
	preferences: Preferences;
	onPreferences(next: Preferences): void;
	onTranslation(translation: Preferences["translation"]): void;
	day: number;
	plan: Passage[];
	index: number;
	onPassage(index: number): void;
	onDay(day: number): void;
	onToday?(): void;
	install?: InstallController;
	onRestart(day: boolean): void;
	onCard(direction: number): void;
	chapter?: SemanticChapter;
	getLink?: () => string;
}) {
	const dialog = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		const element = dialog.current;
		if (!element) return;
		if (open) element.showModal();
		else if (element.open) element.close();
	}, [open]);
	const dismiss = () => {
		dialog.current?.close();
		onClose();
	};
	const act = (action: () => void) => {
		dismiss();
		action();
	};
	return (
		<dialog
			ref={dialog}
			className="reader-menu"
			aria-labelledby="reader-menu-title"
			onKeyDown={(event) => {
				if (event.key !== "Tab") return;
				const controls = [
					...event.currentTarget.querySelectorAll<HTMLElement>(
						"button:not(:disabled),select:not(:disabled),input:not(:disabled),a[href],summary",
					),
				].filter((node) => {
					const closedDetails = node.closest("details:not([open])");
					return (
						node.getClientRects().length > 0 &&
						(!closedDetails ||
							closedDetails.querySelector("summary")?.contains(node))
					);
				});
				const first = controls[0];
				const last = controls.at(-1);
				if (event.shiftKey && document.activeElement === first) {
					event.preventDefault();
					last?.focus();
				} else if (!event.shiftKey && document.activeElement === last) {
					event.preventDefault();
					first?.focus();
				}
			}}
			onCancel={(event) => {
				event.preventDefault();
				dismiss();
			}}
		>
			{open && (
				<>
					<header>
						<h2 id="reader-menu-title">Reader menu</h2>
						<button aria-label="Close reader menu" onClick={dismiss}>
							Close
						</button>
					</header>
					<section aria-labelledby="navigation-title">
						<h3 id="navigation-title">Reading</h3>
						<div className="menu-actions">
							<button
								disabled={index <= 0}
								onClick={() => act(() => onPassage(index - 1))}
							>
								Previous passage
							</button>
							<button
								disabled={index < 0 || index >= plan.length - 1}
								onClick={() => act(() => onPassage(index + 1))}
							>
								Next passage
							</button>
							<button disabled={!chapter} onClick={() => act(() => onCard(-1))}>
								Previous page
							</button>
							<button disabled={!chapter} onClick={() => act(() => onCard(1))}>
								Next page
							</button>
						</div>
						<label>
							Passage
							<select
								aria-label="Passage"
								value={index}
								disabled={!plan.length}
								onChange={(e) => act(() => onPassage(Number(e.target.value)))}
							>
								{plan.map((p, i) => (
									<option key={`${p.book}:${p.chapter}`} value={i}>
										{p.book === "PSA" ? "Psalm" : "Proverbs"} {p.chapter}
									</option>
								))}
							</select>
						</label>
						<label>
							Day
							<select
								aria-label="Day"
								value={day}
								onChange={(e) => act(() => onDay(Number(e.target.value)))}
							>
								{Array.from({ length: 31 }, (_, i) => (
									<option key={i + 1} value={i + 1}>
										{i + 1}
									</option>
								))}
							</select>
						</label>
						<div className="menu-actions">
							<button
								onClick={() => act(onToday ?? (() => onDay(currentLocalDay())))}
							>
								Today
							</button>
							<button
								disabled={!chapter}
								onClick={() => act(() => onRestart(false))}
							>
								Restart passage
							</button>
							<button
								disabled={!chapter}
								onClick={() => act(() => onRestart(true))}
							>
								Restart day
							</button>
						</div>
					</section>
					<section aria-labelledby="presentation-title">
						<h3 id="presentation-title">Presentation</h3>
						<label>
							Translation
							<select
								aria-label="Translation"
								value={preferences.translation}
								onChange={(e) =>
									act(() =>
										onTranslation(e.target.value as Preferences["translation"]),
									)
								}
							>
								<option value="CSB">CSB</option>
								{["NIV", "NLT", "ESV", "WEBU"].map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</select>
						</label>
						<label>
							Appearance
							<select
								aria-label="Appearance"
								value={preferences.appearance}
								onChange={(e) =>
									onPreferences({
										...preferences,
										appearance: e.target.value as Preferences["appearance"],
									})
								}
							>
								{["system", "light", "dark"].map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</select>
						</label>
						<label>
							Font size
							<select
								aria-label="Font size"
								value={preferences.fontSize}
								onChange={(e) =>
									onPreferences({
										...preferences,
										fontSize: e.target.value as Preferences["fontSize"],
									})
								}
							>
								{["normal", "large", "larger"].map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</select>
						</label>
						<label>
							Density
							<select
								aria-label="Density"
								value={preferences.density}
								onChange={(e) =>
									onPreferences({
										...preferences,
										density: e.target.value as Preferences["density"],
									})
								}
							>
								{["Spacious", "Balanced", "Compact"].map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</select>
						</label>
						<label className="check-field">
							<input
								type="checkbox"
								checked={preferences.intros}
								onChange={(e) =>
									onPreferences({ ...preferences, intros: e.target.checked })
								}
							/>
							Passage introductions
						</label>
						<label className="check-field">
							<input
								type="checkbox"
								checked={preferences.verseLabels}
								onChange={(e) =>
									onPreferences({
										...preferences,
										verseLabels: e.target.checked,
									})
								}
							/>
							Verse numbers
						</label>
					</section>
					{install?.platform && (
						<section aria-labelledby="install-settings-title">
							<h3 id="install-settings-title">Install app</h3>
							<button onClick={() => act(install.install)}>Install app</button>
							<label className="check-field">
								<input
									type="checkbox"
									checked={install.neverAsk}
									onChange={(event) =>
										install.setNeverAsk(event.target.checked)
									}
								/>
								Never ask again
							</label>
						</section>
					)}
					{getLink && <ShareLink getLink={getLink} />}
					<PwaUpdateNotice />
					{chapter && <Attribution chapter={chapter} />}
				</>
			)}
		</dialog>
	);
}
