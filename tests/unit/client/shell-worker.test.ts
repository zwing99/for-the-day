import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

function worker() {
	const handlers: Record<string, (event: unknown) => void> = {};
	const match = vi.fn().mockResolvedValue(new Response("static shell"));
	const addAll = vi.fn().mockResolvedValue(undefined);
	const remove = vi.fn().mockResolvedValue(true);
	const skipWaiting = vi.fn();
	const claim = vi.fn();
	const fetch = vi.fn();
	runInNewContext(readFileSync("scripts/shell-worker.js", "utf8"), {
		__CACHE_NAME__: "for-the-day-shell-current",
		__STATIC_PATHS__: ["/index.html", "/assets/main.js", "/fonts/serif.woff2"],
		URL,
		Request: class extends Request {
			constructor(path: string, options: RequestInit) {
				super(new URL(path, "https://reader.test"), options);
			}
		},
		fetch,
		self: {
			location: { origin: "https://reader.test" },
			skipWaiting,
			clients: { claim },
			addEventListener: (type: string, handler: (event: unknown) => void) => {
				handlers[type] = handler;
			},
		},
		caches: {
			open: async () => ({ match, addAll }),
			keys: async () => [
				"for-the-day-shell-old",
				"for-the-day-shell-current",
				"unrelated",
			],
			delete: remove,
		},
	});
	return { handlers, match, addAll, remove, skipWaiting, claim, fetch };
}

it("does not intercept API, tracking, provider, unknown, query-bearing asset or non-GET requests", () => {
	const w = worker();
	for (const [url, mode, method] of [
		["https://reader.test/api/bible/ESV/PSA/23", "cors", "GET"],
		[
			"https://reader.test/api/bible/CSB/PSA/23?readingDay=23",
			"navigate",
			"GET",
		],
		["https://reader.test/api", "navigate", "GET"],
		[
			"https://api.scripture.api.bible/v1/bibles/test/chapters/PSA.23",
			"cors",
			"GET",
		],
		["https://api.esv.org/v3/passage/html/", "cors", "GET"],
		["https://fums.api.bible/f3.js", "cors", "GET"],
		["https://reader.test/fums", "cors", "GET"],
		["https://reader.test/assets/main.js?token=example", "cors", "GET"],
		["https://reader.test/assets/main.js", "cors", "POST"],
	]) {
		const respondWith = vi.fn();
		w.handlers.fetch!({ request: { url, mode, method }, respondWith });
		expect(respondWith).not.toHaveBeenCalled();
	}
});

it("serves the static shell for offline translation-bearing deep links without caching their URLs", async () => {
	const w = worker();
	let response: Promise<Response> | undefined;
	w.handlers.fetch!({
		request: {
			url: "https://reader.test/7/psalm/7/2?translation=ESV",
			method: "GET",
			mode: "navigate",
		},
		respondWith: (value: Promise<Response>) => {
			response = value;
		},
	});
	expect(await (await response)!.text()).toBe("static shell");
	expect(w.match).toHaveBeenCalledWith("/index.html");
	expect(w.fetch).not.toHaveBeenCalled();
	expect(w.addAll).not.toHaveBeenCalled();
});

it("installs exact assets and cleans only obsolete app caches without forcing takeover", async () => {
	const w = worker();
	let pending: Promise<unknown> | undefined;
	const waitUntil = (promise: Promise<unknown>) => {
		pending = promise;
	};
	w.handlers.install!({ waitUntil });
	await pending;
	expect(
		w.addAll.mock.calls[0]![0].map((r: Request) => new URL(r.url).pathname),
	).toEqual(["/index.html", "/assets/main.js", "/fonts/serif.woff2"]);
	w.handlers.activate!({ waitUntil });
	await pending;
	expect(w.remove.mock.calls).toEqual([["for-the-day-shell-old"]]);
	expect(w.skipWaiting).not.toHaveBeenCalled();
	expect(w.claim).not.toHaveBeenCalled();
});
