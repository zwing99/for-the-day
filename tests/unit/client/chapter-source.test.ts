// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { networkChapterSource } from "../../../src/client/chapter-source.js";
import { semanticFixture } from "../../fixtures/semantic-chapter.js";

afterEach(() => vi.unstubAllGlobals());
it("offers connection-required recovery without persisting an offline chapter", async () => {
	vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
	vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
	await expect(
		networkChapterSource.get(
			{ book: "PSA", chapter: 23 },
			new AbortController().signal,
		),
	).rejects.toMatchObject({
		code: "offline",
		message: "Scripture requires a connection. Reconnect, then try again.",
	});
	vi.restoreAllMocks();
});
it("fetches only the requested ESV chapter, without background prefetch or browser persistence", async () => {
	const mock = vi.fn<typeof fetch>().mockImplementation(async (input) => {
		const c = semanticFixture();
		c.identity.translation = "ESV";
		c.identity.provider = "crossway";
		c.identity.chapter = Number(String(input).split("?")[0]!.split("/").at(-1));
		c.tracking = { kind: "none" };
		return Response.json({ chapter: c });
	});
	vi.stubGlobal("fetch", mock);
	const writes = vi.spyOn(Storage.prototype, "setItem");
	const signal = new AbortController().signal;
	for (const chapter of [7, 37, 7])
		await networkChapterSource.get({ book: "PSA", chapter }, signal, {
			translation: "ESV",
			readingDay: 7,
			timeZone: "America/Chicago",
		});
	expect(mock).toHaveBeenCalledTimes(3);
	expect(mock.mock.calls.map((c) => String(c[0]))).toEqual(
		[7, 37, 7].map(
			(c) => `/api/bible/ESV/PSA/${c}?readingDay=7&timeZone=America%2FChicago`,
		),
	);
	for (const call of mock.mock.calls)
		expect(call[1]).toMatchObject({ signal, cache: "no-store" });
	expect(writes).not.toHaveBeenCalled();
	writes.mockRestore();
});
it("contains malformed server responses without exposing their body", async () => {
	vi.stubGlobal(
		"fetch",
		vi
			.fn()
			.mockResolvedValue(
				new Response("private upstream diagnostic", { status: 502 }),
			),
	);
	await expect(
		networkChapterSource.get(
			{ book: "PSA", chapter: 23 },
			new AbortController().signal,
		),
	).rejects.toMatchObject({
		code: "unavailable",
		message: "Scripture is temporarily unavailable. Please try again.",
	});
});

it("retains identifiable rate limiting even when an intermediary returns HTML", async () => {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue(
			new Response("private diagnostic", {
				status: 429,
				headers: { "retry-after": "5" },
			}),
		),
	);
	await expect(
		networkChapterSource.get(
			{ book: "PSA", chapter: 23 },
			new AbortController().signal,
		),
	).rejects.toMatchObject({ code: "rate-limit", retryAfterSeconds: 5 });
});
