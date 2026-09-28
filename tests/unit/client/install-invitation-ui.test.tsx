// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
	InstallInvitation,
	useInstallInvitation,
} from "../../../src/client/install-invitation.js";

function Harness() {
	const install = useInstallInvitation();
	return (
		<>
			<InstallInvitation install={install} />
			<button onClick={install.install}>Menu install app</button>
			<button onClick={() => install.setNeverAsk(false)}>
				Restore invitation
			</button>
		</>
	);
}
beforeEach(() => {
	window.localStorage.clear();
	Object.defineProperty(navigator, "userAgent", {
		configurable: true,
		value: "Mozilla/5.0 (iPhone)",
	});
	Object.defineProperty(window, "isSecureContext", {
		configurable: true,
		value: true,
	});
	window.matchMedia = vi.fn(() => ({
		matches: false,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	})) as unknown as typeof window.matchMedia;
	HTMLDialogElement.prototype.showModal = function () {
		this.setAttribute("open", "");
	};
	HTMLDialogElement.prototype.close = function () {
		this.removeAttribute("open");
	};
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

it("shows iPhone instructions from the opening invitation and keeps the menu action", async () => {
	render(<Harness />);
	await screen.findByRole("complementary", { name: "Install app invitation" });
	fireEvent.click(
		screen.getByRole("button", { name: "Install app", exact: true }),
	);
	expect(
		screen.queryByRole("complementary", { name: "Install app invitation" }),
	).toBeNull();
	expect(screen.getByRole("dialog").textContent).toContain(
		"Share or Page Menu",
	);
	fireEvent.click(screen.getByRole("button", { name: "Done" }));
	fireEvent.click(screen.getByRole("button", { name: "Menu install app" }));
	expect(screen.getByRole("dialog").textContent).toContain(
		"Add to Home Screen",
	);
});

it("reminds for a week and restores the opt-out", async () => {
	render(<Harness />);
	await screen.findByRole("complementary", { name: "Install app invitation" });
	fireEvent.click(screen.getByRole("button", { name: "Remind me in a week" }));
	expect(
		screen.queryByRole("complementary", { name: "Install app invitation" }),
	).toBeNull();
	expect(
		JSON.parse(
			window.localStorage.getItem("for-the-day:v1:install-invitation") ??
				"null",
		).remindAfter,
	).toBeGreaterThan(Date.now());
	fireEvent.click(screen.getByRole("button", { name: "Restore invitation" }));
	await waitFor(() =>
		expect(
			screen.getByRole("complementary", { name: "Install app invitation" }),
		).toBeTruthy(),
	);
	fireEvent.click(screen.getByRole("button", { name: "Never ask again" }));
	expect(
		screen.queryByRole("complementary", { name: "Install app invitation" }),
	).toBeNull();
});

it("uses Android's native prompt when provided", async () => {
	Object.defineProperty(navigator, "userAgent", {
		configurable: true,
		value: "Mozilla/5.0 (Android 16)",
	});
	const prompt = vi.fn(async () => {});
	render(<Harness />);
	const event = new Event("beforeinstallprompt", {
		cancelable: true,
	}) as Event & { prompt: typeof prompt };
	event.prompt = prompt;
	window.dispatchEvent(event);
	await screen.findByRole("complementary", { name: "Install app invitation" });
	fireEvent.click(
		screen.getByRole("button", { name: "Install app", exact: true }),
	);
	await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
	expect(screen.queryByRole("dialog")).toBeNull();
});

it("shows Android menu steps without a native prompt", async () => {
	Object.defineProperty(navigator, "userAgent", {
		configurable: true,
		value: "Mozilla/5.0 (Android 16)",
	});
	render(<Harness />);
	await screen.findByRole("complementary", { name: "Install app invitation" });
	fireEvent.click(
		screen.getByRole("button", { name: "Install app", exact: true }),
	);
	expect(screen.getByRole("dialog").textContent).toContain("browser menu");
	expect(screen.getByRole("button", { name: "Done" })).toBe(
		document.activeElement,
	);
});

it("suppresses the invitation in standalone mode", () => {
	window.matchMedia = vi.fn(() => ({
		matches: true,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	})) as unknown as typeof window.matchMedia;
	render(<Harness />);
	expect(
		screen.queryByRole("complementary", { name: "Install app invitation" }),
	).toBeNull();
});

it("shows the LAN HTTP install limitation without hiding the phone invitation", () => {
	render(
		<InstallInvitation
			install={{
				platform: "android",
				privateHttpPreview: true,
				visible: true,
				neverAsk: false,
				helpOpen: true,
				install() {},
				remind() {},
				setNeverAsk() {},
				closeHelp() {},
			}}
		/>,
	);
	expect(
		screen.getByRole("complementary", { name: "Install app invitation" }),
	).toBeTruthy();
	expect(screen.getByRole("dialog").textContent).toContain(
		"Android cannot install",
	);
	expect(screen.getByRole("dialog").textContent).toContain(
		"secure HTTPS address",
	);
});
