import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	LOCAL_RESPONSE_TTL_MS,
	localResponseCache,
} from "../../../src/server/providers/local-response-cache.js";

let directory: string;
const url =
	"https://v2.api.bible/bibles/test/chapters/PSA.23?content-type=json";
beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), "ftd-response-cache-"));
});
afterEach(async () => {
	await rm(directory, { recursive: true, force: true });
});
describe("30-day local development responses", () => {
	it("survives process/normalizer changes and preserves raw text and tracking without storing credentials", async () => {
		const body = JSON.stringify({
			data: { content: "Invented & exact text" },
			meta: { fumsToken: "invented-view-token" },
		});
		const upstream = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				new Response(body, { headers: { "Content-Type": "application/json" } }),
			);
		const first = localResponseCache({ directory, fetch: upstream });
		expect(
			await (
				await first(url, { headers: { "api-key": "dummy-private-key" } })
			).text(),
		).toBe(body);
		const restarted = localResponseCache({ directory, fetch: upstream });
		expect(
			await (
				await restarted(url, {
					headers: { "api-key": "different-private-key" },
				})
			).text(),
		).toBe(body);
		expect(upstream).toHaveBeenCalledTimes(1);
		const files = await readdir(directory);
		expect(files).toHaveLength(1);
		const saved = await readFile(join(directory, files[0]!), "utf8");
		expect(saved).not.toContain("dummy-private-key");
		expect(saved).not.toContain("api-key");
	});
	it("expires exactly after 30 days, including offline misses without upstream requests", async () => {
		let now = 1000;
		const upstream = vi
			.fn<typeof fetch>()
			.mockImplementation(async () => new Response("invented"));
		const cache = localResponseCache({
			directory,
			clock: () => now,
			fetch: upstream,
		});
		await cache(url);
		now += LOCAL_RESPONSE_TTL_MS - 1;
		await cache(url);
		expect(upstream).toHaveBeenCalledTimes(1);
		now++;
		await expect(
			localResponseCache({
				directory,
				clock: () => now,
				fetch: upstream,
				allowNetwork: false,
			})(url),
		).rejects.toThrow("Offline verification");
		expect(upstream).toHaveBeenCalledTimes(1);
		expect(await readdir(directory)).toEqual([]);
		await cache(url);
		expect(upstream).toHaveBeenCalledTimes(2);
	});
	it("deduplicates concurrent misses and isolates editions/options", async () => {
		const upstream = vi
			.fn<typeof fetch>()
			.mockImplementation(async () => new Response("invented"));
		const cache = localResponseCache({ directory, fetch: upstream });
		const responses = await Promise.all(
			Array.from({ length: 10 }, () => cache(url)),
		);
		expect(await Promise.all(responses.map((r) => r.text()))).toEqual(
			Array(10).fill("invented"),
		);
		expect(upstream).toHaveBeenCalledTimes(1);
		await cache(url.replace("bibles/test/", "bibles/another/"));
		await cache(url + "&include-titles=true");
		expect(upstream).toHaveBeenCalledTimes(3);
	});
	it("does not persist failed responses and retains safe retry guidance", async () => {
		const upstream = vi.fn<typeof fetch>().mockImplementation(
			async () =>
				new Response("failure", {
					status: 429,
					headers: { "Retry-After": "60" },
				}),
		);
		const cache = localResponseCache({ directory, fetch: upstream });
		expect((await cache(url)).headers.get("Retry-After")).toBe("60");
		await cache(url);
		expect(upstream).toHaveBeenCalledTimes(2);
		expect(await readdir(directory)).toEqual([]);
	});
	it("fails closed for broken cache files and cannot send unsupported providers or cancelled requests", async () => {
		const upstream = vi
			.fn<typeof fetch>()
			.mockImplementation(async () => new Response("invented"));
		const cache = localResponseCache({ directory, fetch: upstream });
		await cache(url);
		const file = (await readdir(directory))[0]!;
		await writeFile(join(directory, file), "broken");
		await expect(cache(url)).rejects.toThrow("repair it before fetching");
		expect(upstream).toHaveBeenCalledTimes(1);
		await expect(cache("https://api.esv.org/v3/passage/html/")).rejects.toThrow(
			"Unsupported",
		);
		const controller = new AbortController();
		controller.abort();
		await expect(
			cache(url, { signal: controller.signal }),
		).rejects.toMatchObject({ name: "AbortError" });
		expect(upstream).toHaveBeenCalledTimes(1);
	});
});
