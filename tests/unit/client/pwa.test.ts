// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { configureShell, shellUpdate } from "../../../src/client/pwa.js";

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

it("registers only the static production worker and announces a waiting update without reload", async () => {
	const registration = { waiting: {}, addEventListener: vi.fn() };
	const register = vi.fn().mockResolvedValue(registration);
	vi.stubGlobal("navigator", { serviceWorker: { register, controller: {} } });
	const listener = vi.fn();
	const unsubscribe = shellUpdate.subscribe(listener);
	await configureShell(true);
	expect(register).toHaveBeenCalledWith("/sw.js", {
		scope: "/",
		updateViaCache: "none",
	});
	expect(shellUpdate.getSnapshot()).toBe(true);
	expect(listener).toHaveBeenCalledOnce();
	unsubscribe();
});

it("dev unregisters only this app's worker and removes only its static caches", async () => {
	const own = {
		active: { scriptURL: `${location.origin}/sw.js` },
		unregister: vi.fn(),
	};
	const other = {
		active: { scriptURL: `${location.origin}/other.js` },
		unregister: vi.fn(),
	};
	const register = vi.fn();
	const remove = vi.fn();
	vi.stubGlobal("navigator", {
		serviceWorker: { register, getRegistrations: async () => [own, other] },
	});
	vi.stubGlobal("caches", {
		keys: async () => ["for-the-day-shell-old", "other-app"],
		delete: remove,
	});
	await configureShell(false);
	expect(own.unregister).toHaveBeenCalledOnce();
	expect(other.unregister).not.toHaveBeenCalled();
	expect(register).not.toHaveBeenCalled();
	expect(remove.mock.calls).toEqual([["for-the-day-shell-old"]]);
});

it("contains unsupported or failed installation without disrupting reading", async () => {
	vi.stubGlobal("navigator", {});
	await expect(configureShell(true)).resolves.toBeUndefined();
	vi.stubGlobal("navigator", {
		serviceWorker: { register: vi.fn().mockRejectedValue(new Error("denied")) },
	});
	await expect(configureShell(true)).resolves.toBeUndefined();
});
