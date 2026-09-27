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
import { cachedChapterSource } from "../../../src/client/cached-chapter-source.js";
import {
	BrowserChapterRepository,
	memoryChapterStorage,
} from "../../../src/client/chapter-cache.js";
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
	if (translation === "ESV" || translation === "WEBU") {
		c.identity.provider = translation === "WEBU" ? "static" : "crossway";
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
	for (const t of ["NIV", "NLT", "ESV", "WEBU", "CSB"] as const) {
		select(t);
		await waitFor(() =>
			expect(
				new URL(window.location.href).searchParams.get("translation"),
			).toBe(t),
		);
		expect(window.location.pathname).toBe("/23/psalm/23/2");
		expect(storage.preferences().translation).toBe(t);
		if (t === "ESV" || t === "WEBU")
			expect(screen.getByRole("status").textContent).toContain(
				"Approximate verse match",
			);
	}
	expect(get).toHaveBeenCalledTimes(6);
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
it.each(["NLT", "WEBU"] as const)(
	"cancels a pending %s switch when passage navigation supersedes it",
	async (translation) => {
		let resolve: (value: ReturnType<typeof chapter>) => void = () => {};
		let signal: AbortSignal | undefined;
		const get = vi.fn(async (p, s, context) => {
			if (context.translation === translation) {
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
		select(translation);
		fireEvent.click(screen.getByRole("button", { name: "Psalm 53" }));
		await screen.findByRole("button", { name: /Begin reading/ });
		expect(signal?.aborted).toBe(true);
		await act(async () => resolve(chapter(translation)));
		expect(window.location.pathname).toContain("/psalm/53");
		expect(new URL(window.location.href).searchParams.get("translation")).toBe(
			"CSB",
		);
	},
);

it("uses the same cache for menu switching and subsequent route loads", async () => {
	const repository = new BrowserChapterRepository(memoryChapterStorage());
	const get = vi.fn(async (_p, _s, context) => chapter(context.translation));
	const source = cachedChapterSource({ get }, repository, async () => "r");
	const storage = new ReadingStorage();
	try {
		render(<Reader source={source} storage={storage} report={vi.fn()} />);
		await screen.findByRole("article", { name: "Verse 2" });
		for (const translation of ["NIV", "CSB", "NIV"] as const) {
			select(translation);
			await waitFor(() =>
				expect(storage.preferences().translation).toBe(translation),
			);
			expect(window.location.pathname).toBe("/23/psalm/23/2");
		}
		expect(get).toHaveBeenCalledTimes(2);
	} finally {
		repository.dispose();
	}
});

it.each(["failed", "pending"])(
	"opens WEBU when initial CSB is %s and ignores its late response",
	async (state) => {
		let completeCsb: (value: ReturnType<typeof chapter>) => void = () => {};
		let csbSignal: AbortSignal | undefined;
		const get = vi.fn(async (_passage, signal, context) => {
			if (context.translation === "WEBU") return chapter("WEBU");
			csbSignal = signal;
			if (state === "failed")
				throw new ChapterLoadError("configuration", "Configure the provider.");
			return new Promise<ReturnType<typeof chapter>>((resolve) => {
				completeCsb = resolve;
			});
		});
		const storage = new ReadingStorage();
		render(<Reader source={{ get }} storage={storage} report={vi.fn()} />);
		if (state === "failed") await screen.findByRole("alert");
		else await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
		select("WEBU");
		await waitFor(() => expect(storage.preferences().translation).toBe("WEBU"));
		expect(window.location.pathname).toBe("/23/psalm/23/2");
		expect(screen.getByRole("status").textContent).toContain(
			"Approximate verse match",
		);
		expect(csbSignal?.aborted).toBe(true);
		await act(async () => completeCsb(chapter("CSB")));
		expect(new URL(window.location.href).searchParams.get("translation")).toBe(
			"WEBU",
		);
		expect(screen.getByRole("article", { name: "Verse 2" })).toBeTruthy();
	},
);
