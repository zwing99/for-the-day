import { useState } from "react";

/** Only a canonical location URL crosses the platform sharing boundary. */
export function ShareLink({ getLink }: { getLink(): string }) {
	const [message, setMessage] = useState("");
	const [manualLink, setManualLink] = useState("");
	const [busy, setBusy] = useState(false);
	async function copy() {
		const url = getLink();
		setBusy(true);
		try {
			if (!navigator.clipboard?.writeText) throw new Error("unavailable");
			await navigator.clipboard.writeText(url);
			setManualLink("");
			setMessage("Link copied.");
		} catch {
			setManualLink(url);
			setMessage(
				"Could not copy automatically. Select the link below to copy it.",
			);
		} finally {
			setBusy(false);
		}
	}
	async function share() {
		setBusy(true);
		try {
			await navigator.share({ url: getLink() });
			setMessage("Link shared.");
		} catch (error) {
			setMessage(
				error instanceof DOMException && error.name === "AbortError"
					? "Sharing cancelled. You can still copy the link."
					: "Could not share. Use Copy link instead.",
			);
		} finally {
			setBusy(false);
		}
	}
	return (
		<section aria-labelledby="sharing-title">
			<h3 id="sharing-title">Current location</h3>
			<div className="menu-actions">
				{typeof navigator.share === "function" && (
					<button disabled={busy} onClick={() => void share()}>
						Share link
					</button>
				)}
				<button disabled={busy} onClick={() => void copy()}>
					Copy link
				</button>
			</div>
			<p className="menu-note" role="status">
				{message}
			</p>
			{manualLink && (
				<label className="manual-link">
					Location link
					<input
						readOnly
						value={manualLink}
						onFocus={(event) => event.target.select()}
					/>
				</label>
			)}
		</section>
	);
}
