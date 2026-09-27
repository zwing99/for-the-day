import { useLayoutEffect } from "react";
import type { Preferences } from "./reading-storage.js";

/** Match browser/PWA chrome and the safe-area canvas to the reader preference. */
export function useBrowserAppearance(appearance: Preferences["appearance"]) {
	useLayoutEffect(() => {
		const root = document.documentElement;
		const meta = document.querySelector<HTMLMetaElement>(
			'meta[name="theme-color"]',
		);
		const previous = root.getAttribute("data-browser-appearance");
		const previousColor = meta?.content;
		const media = window.matchMedia?.("(prefers-color-scheme: dark)");
		const apply = () => {
			const dark =
				appearance === "dark" || (appearance === "system" && media?.matches);
			root.dataset.browserAppearance = dark ? "dark" : "light";
			if (meta) meta.content = dark ? "#222320" : "#f8f6ef";
		};
		apply();
		media?.addEventListener("change", apply);
		return () => {
			media?.removeEventListener("change", apply);
			if (previous === null) root.removeAttribute("data-browser-appearance");
			else root.setAttribute("data-browser-appearance", previous);
			if (meta && previousColor !== undefined) meta.content = previousColor;
		};
	}, [appearance]);
}
