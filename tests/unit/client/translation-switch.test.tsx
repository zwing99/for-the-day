// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ChapterLoadError } from "../../../src/client/chapter-source.js";
import { Reader } from "../../../src/client/reader.js";
import { ReadingStorage } from "../../../src/client/reading-storage.js";
import type { Translation } from "../../../src/domain/semantic-chapter.js";
import { semanticFixture } from "../../fixtures/semantic-chapter.js";

beforeEach(() => {
	window.history.replaceState(null, "", "/23/psalm/23/2?translation=CSB");
	localStorage.clear();
	HTMLDialogElement.prototype.showModal = function () {
		this.setAttribute("open", "");
	};
	HTMLDialogElement.prototype.close = function () {
		this.removeAttribute("open");
	};
});
afterEach(cleanup);
function select(value: Translation) {
	fireEvent.click(screen.getByRole("button", { name: "Open reader menu" }));
	fireEvent.change(screen.getByRole("combobox", { name: "Translation" }), {
		target: { value },
	});
}
function chapter(translation: Translation) {
	const c = semanticFixture();
	c.identity.translation = translation;
	if (translation === "ESV") {
		c.identity.provider = "crossway";
		c.tracking = { kind: "none" };
		for (const v of c.verses) v.orgIds = [];
	}
	return c;
}
it("switches all editions at the current location, persists success, and marks unverified matching approximate", async () => {
	const storage = new ReadingStorage();
	const get = vi.fn(async (_p, _s, context) => chapter(context.translation));
	render(<Reader source={{ get }} storage={storage} report={vi.fn()} />);
	await screen.findByRole("article", { name: "Verse 2" });
	for (const t of ["NIV", "NLT", "ESV", "CSB"] as const) {
		select(t);
		await waitFor(() =>
			expect(
				new URL(window.location.href).searchParams.get("translation"),
			).toBe(t),
		);
		expect(window.location.pathname).toBe("/23/psalm/23/2");
		expect(storage.preferences().translation).toBe(t);
		if (t === "ESV")
			expect(screen.getByRole("status").textContent).toContain(
				"Approximate verse match",
			);
	}
	expect(get).toHaveBeenCalledTimes(5);
});
it("keeps successful content and URL usable after a failed switch and retries without a history rollback", async () => {
	const get = vi
		.fn()
		.mockResolvedValueOnce(chapter("CSB"))
		.mockRejectedValueOnce(
			new ChapterLoadError("configuration", "Translation is not configured."),
		)
		.mockResolvedValueOnce(chapter("NLT"));
	const storage = new ReadingStorage();
	render(<Reader source={{ get }} storage={storage} report={vi.fn()} />);
	await screen.findByRole("article", { name: "Verse 2" });
	const before = window.location.href;
	select("NLT");
	await screen.findByRole("button", { name: "Retry translation" });
	expect(screen.getByRole("article", { name: "Verse 2" })).toBeTruthy();
	expect(window.location.href).toBe(before);
	expect(storage.preferences().translation).toBe("CSB");
	fireEvent.click(screen.getByRole("button", { name: "Retry translation" }));
	await waitFor(() => expect(storage.preferences().translation).toBe("NLT"));
});
it("cancels a pending switch when passage navigation supersedes it", async () => {
	let resolve: (value: ReturnType<typeof chapter>) => void = () => {};
	let signal: AbortSignal | undefined;
	const get = vi.fn(async (p, s, context) => {
		if (context.translation === "NLT") {
			signal = s;
			return new Promise<ReturnType<typeof chapter>>((r) => {
				resolve = r;
			});
		}
		const c = chapter("CSB");
		c.identity.chapter = p.chapter;
		return c;
	});
	render(<Reader source={{ get }} report={vi.fn()} />);
	await screen.findByRole("article", { name: "Verse 2" });
	select("NLT");
	fireEvent.click(screen.getByRole("button", { name: "Psalm 53" }));
	await screen.findByRole("button", { name: /Begin reading/ });
	expect(signal?.aborted).toBe(true);
	await act(async () => resolve(chapter("NLT")));
	expect(window.location.pathname).toContain("/psalm/53");
	expect(new URL(window.location.href).searchParams.get("translation")).toBe(
		"CSB",
	);
});
