import { useEffect, useRef, useState } from "react";

const key = "for-the-day:v1:install-invitation";
const week = 7 * 24 * 60 * 60 * 1000;
export type InstallPlatform = "iphone" | "android";
export interface InstallPreference {
	version: 1;
	remindAfter?: number;
	neverAsk: boolean;
}
export function readInstallPreference(
	storage: Pick<Storage, "getItem"> | undefined,
	now = Date.now(),
): InstallPreference {
	try {
		const value = JSON.parse(storage?.getItem(key) ?? "null");
		if (!value || value.version !== 1 || typeof value.neverAsk !== "boolean")
			return { version: 1, neverAsk: false };
		const remindAfter = value.remindAfter;
		if (
			remindAfter !== undefined &&
			(!Number.isFinite(remindAfter) ||
				remindAfter < now - week ||
				remindAfter > now + week)
		)
			return { version: 1, neverAsk: value.neverAsk };
		return {
			version: 1,
			neverAsk: value.neverAsk,
			...(remindAfter === undefined ? {} : { remindAfter }),
		};
	} catch {
		return { version: 1, neverAsk: false };
	}
}
export function installPlatform(
	userAgent: string,
	secure: boolean,
	standalone: boolean,
	url?: string,
): InstallPlatform | undefined {
	if ((!secure && !isPrivateHttpDevelopmentOrigin(url)) || standalone)
		return undefined;
	if (/iPhone|iPod/i.test(userAgent)) return "iphone";
	if (/Android/i.test(userAgent)) return "android";
	return undefined;
}
export function isPrivateHttpDevelopmentOrigin(value?: string): boolean {
	if (!value) return false;
	try {
		const url = new URL(value);
		if (url.protocol !== "http:") return false;
		const octets = url.hostname.split(".").map(Number);
		if (
			octets.length !== 4 ||
			octets.some(
				(octet) => !Number.isInteger(octet) || octet < 0 || octet > 255,
			)
		)
			return false;
		return (
			octets[0] === 10 ||
			(octets[0] === 172 && octets[1]! >= 16 && octets[1]! <= 31) ||
			(octets[0] === 192 && octets[1] === 168)
		);
	} catch {
		return false;
	}
}
interface DeferredPrompt extends Event {
	prompt(): Promise<void>;
	userChoice?: Promise<{ outcome: string }>;
}
export interface InstallController {
	platform?: InstallPlatform;
	privateHttpPreview: boolean;
	visible: boolean;
	neverAsk: boolean;
	helpOpen: boolean;
	install(): void;
	remind(): void;
	setNeverAsk(value: boolean): void;
	closeHelp(): void;
}
function browserStorage(): Storage | undefined {
	try {
		return window.localStorage;
	} catch {
		return undefined;
	}
}
export function useInstallInvitation(): InstallController {
	const [platform, setPlatform] = useState<InstallPlatform>();
	const [privateHttpPreview, setPrivateHttpPreview] = useState(false);
	const [preference, setPreference] = useState<InstallPreference>(() =>
		typeof window === "undefined"
			? { version: 1, neverAsk: false }
			: readInstallPreference(browserStorage()),
	);
	const [sessionDismissed, setSessionDismissed] = useState(false);
	const [helpOpen, setHelpOpen] = useState(false);
	const [prompt, setPrompt] = useState<DeferredPrompt>();
	useEffect(() => {
		const installed = () =>
			window.matchMedia?.("(display-mode: standalone)").matches ||
			(navigator as Navigator & { standalone?: boolean }).standalone === true;
		const refresh = () => {
			const localPreview = isPrivateHttpDevelopmentOrigin(window.location.href);
			setPrivateHttpPreview(localPreview && !window.isSecureContext);
			setPlatform(
				installPlatform(
					navigator.userAgent,
					window.isSecureContext,
					installed(),
					window.location.href,
				),
			);
		};
		const capture = (event: Event) => {
			event.preventDefault();
			setPrompt(event as DeferredPrompt);
		};
		const complete = () => {
			setPlatform(undefined);
			setHelpOpen(false);
		};
		const media = window.matchMedia?.("(display-mode: standalone)");
		refresh();
		media?.addEventListener("change", refresh);
		window.addEventListener("beforeinstallprompt", capture);
		window.addEventListener("appinstalled", complete);
		return () => {
			media?.removeEventListener("change", refresh);
			window.removeEventListener("beforeinstallprompt", capture);
			window.removeEventListener("appinstalled", complete);
		};
	}, []);
	const save = (value: InstallPreference) => {
		setPreference(value);
		try {
			browserStorage()?.setItem(key, JSON.stringify(value));
		} catch {
			/* Session state still works. */
		}
	};
	return {
		platform,
		privateHttpPreview,
		visible:
			!!platform &&
			!sessionDismissed &&
			!preference.neverAsk &&
			!(preference.remindAfter && preference.remindAfter > Date.now()),
		neverAsk: preference.neverAsk,
		helpOpen,
		install() {
			setSessionDismissed(true);
			if (platform === "android" && prompt) {
				setPrompt(undefined);
				void prompt.prompt().catch(() => setHelpOpen(true));
			} else setHelpOpen(true);
		},
		remind() {
			setSessionDismissed(true);
			save({ version: 1, neverAsk: false, remindAfter: Date.now() + week });
		},
		setNeverAsk(value) {
			setSessionDismissed(value);
			save({ version: 1, neverAsk: value });
		},
		closeHelp() {
			setHelpOpen(false);
		},
	};
}
export function InstallInvitation({ install }: { install: InstallController }) {
	const dialog = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		if (install.helpOpen) dialog.current?.showModal();
		else dialog.current?.close();
	}, [install.helpOpen]);
	if (!install.visible && !install.helpOpen) return null;
	return (
		<>
			{install.visible && (
				<aside
					className="install-invitation"
					aria-label="Install app invitation"
				>
					<span>Keep For the Day on your Home Screen.</span>
					<div className="install-actions">
						<button onClick={install.install}>Install app</button>
						<button onClick={install.remind}>Remind me in a week</button>
						<button onClick={() => install.setNeverAsk(true)}>
							Never ask again
						</button>
					</div>
				</aside>
			)}
			{install.helpOpen && (
				<dialog
					ref={dialog}
					className="install-help"
					aria-labelledby="install-help-title"
					onCancel={install.closeHelp}
				>
					<h2 id="install-help-title">Add For the Day to your Home Screen</h2>
					{install.platform === "iphone" ? (
						<>
							<p>
								In Safari, open Share or Page Menu, choose Add to Home Screen,
								keep Open as Web App enabled if offered, then tap Add.
							</p>
							{install.privateHttpPreview && (
								<p>
									This Home Screen icon opens the local address and needs the
									phone to stay on the same network.
								</p>
							)}
						</>
					) : install.privateHttpPreview ? (
						<p>
							Android cannot install the offline app from this local HTTP
							address. Use a secure HTTPS address to install it; reading remains
							available here.
						</p>
					) : (
						<p>
							Open your browser menu, choose Install app or Add to Home Screen,
							then confirm.
						</p>
					)}
					<button autoFocus onClick={install.closeHelp}>
						Done
					</button>
				</dialog>
			)}
		</>
	);
}
