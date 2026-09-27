// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useBrowserAppearance } from "../../../src/client/browser-appearance.js";
import type { Preferences } from "../../../src/client/reading-storage.js";

let meta: HTMLMetaElement;
beforeEach(() => {
	meta = document.createElement("meta");
	meta.name = "theme-color";
	meta.content = "#f8f6ef";
	document.head.append(meta);
});
afterEach(() => {
	cleanup();
	meta.remove();
	vi.unstubAllGlobals();
});

it("matches browser chrome to explicit dark/light preferences even when the OS differs", () => {
	const media = {
		matches: false,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	};
	vi.stubGlobal("matchMedia", () => media);
	const { rerender, unmount } = renderHook(
		({ appearance }) => useBrowserAppearance(appearance),
		{ initialProps: { appearance: "dark" as Preferences["appearance"] } },
	);
	expect(document.documentElement.dataset.browserAppearance).toBe("dark");
	expect(meta.content).toBe("#222320");
	media.matches = true;
	rerender({ appearance: "light" });
	expect(document.documentElement.dataset.browserAppearance).toBe("light");
	expect(meta.content).toBe("#f8f6ef");
	unmount();
	expect(document.documentElement.hasAttribute("data-browser-appearance")).toBe(
		false,
	);
});

it("follows live system appearance changes and removes the listener on unmount", () => {
	let onChange: () => void = () => {};
	const media = {
		matches: false,
		addEventListener: vi.fn((_type: string, fn: () => void) => {
			onChange = fn;
		}),
		removeEventListener: vi.fn(),
	};
	vi.stubGlobal("matchMedia", () => media);
	const { unmount } = renderHook(() => useBrowserAppearance("system"));
	expect(meta.content).toBe("#f8f6ef");
	media.matches = true;
	onChange();
	expect(meta.content).toBe("#222320");
	expect(document.documentElement.dataset.browserAppearance).toBe("dark");
	unmount();
	expect(media.removeEventListener).toHaveBeenCalledWith("change", onChange);
});
