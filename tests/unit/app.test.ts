import { describe, expect, it } from "vitest";
import { createApp } from "../../src/server/app.js";

describe("local API health", () => {
	it("returns only safe status and prevents browser caching", async () => {
		const response = await createApp().request("/api/health");
		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(await response.json()).toEqual({ status: "ok" });
	});
});

import { vi } from "vitest";
import { CacheError } from "../../src/server/cache/chapter-repository.js";
import { ProviderError } from "../../src/server/providers/provider.js";
import { semanticFixture } from "../fixtures/semantic-chapter.js";

describe("chapter API", () => {
	it.each([
		"CSB/PSA/151",
		"CSB/PRO/32",
		"CSB/PSA/1.5",
		"CSB/PSA/01",
		"OTHER/PSA/23",
		"CSB/GEN/1",
		"CSB/PSA/23?readingDay=32",
		"CSB/PSA/23?timeZone=bad-zone",
	])("rejects %s before accessing providers", async (path) => {
		const get = vi.fn();
		const response = await createApp({ CSB: { get } }).request(
			`/api/bible/${path}`,
		);
		expect(response.status).toBe(400);
		expect(get).not.toHaveBeenCalled();
		expect(response.headers.get("Cache-Control")).toBe("no-store");
	});
	it("returns a whole normalized chapter with no-store", async () => {
		const chapter = semanticFixture();
		const response = await createApp({
			CSB: { get: async () => chapter },
		}).request("/api/bible/CSB/PSA/23");
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ chapter });
		expect(response.headers.get("Cache-Control")).toBe("no-store");
	});
	it.each([
		[new ProviderError("not-found"), 404],
		[new ProviderError("rate-limit", 120), 429],
		[new ProviderError("configuration"), 503],
		[new ProviderError("access-denied"), 503],
		[new ProviderError("provider-unavailable"), 503],
		[new ProviderError("normalization"), 502],
		[new CacheError(), 503],
		[new Error("private key and upstream body"), 500],
	])("maps safe errors", async (error, status) => {
		const response = await createApp({
			CSB: {
				get: async () => {
					throw error;
				},
			},
		}).request("/api/bible/CSB/PSA/23");
		expect(response.status).toBe(status);
		const body = await response.text();
		expect(body).not.toContain("private key");
		expect(body).not.toContain("upstream body");
		if (status === 429) expect(response.headers.get("Retry-After")).toBe("120");
		expect(response.headers.get("Cache-Control")).toBe("no-store");
	});
	it("keeps configured CSB usable when another translation is absent", async () => {
		const app = createApp({ CSB: { get: async () => semanticFixture() } });
		expect((await app.request("/api/bible/ESV/PSA/23")).status).toBe(503);
		expect((await app.request("/api/bible/CSB/PSA/23")).status).toBe(200);
	});
});
