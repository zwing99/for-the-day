import { expect, it, vi } from "vitest";
import { createApp } from "../../src/server/app.js";
import { contentRevision } from "../../src/server/content-revision.js";
import { semanticFixture } from "../fixtures/semantic-chapter.js";

it("revisions reflect editions and model changes, with a credential-free allowlist", () => {
	const identity = semanticFixture().identity;
	const original = contentRevision([identity]);
	expect(
		contentRevision([{ ...identity, apiKey: "private" } as typeof identity]),
	).toBe(original);
	expect(
		contentRevision([{ ...identity, editionKey: "normalizer-3" }]),
	).not.toBe(original);
	expect(
		contentRevision([{ ...identity, providerBibleId: "other-edition" }]),
	).not.toBe(original);
	expect(contentRevision([identity], 2)).not.toBe(original);
});
it("metadata never loads Scripture and uses no-store", async () => {
	const get = vi.fn();
	const response = await createApp({ CSB: { get } }, "public-revision").request(
		"/api/content-configuration",
	);
	expect(await response.json()).toEqual({ revision: "public-revision" });
	expect(response.headers.get("Cache-Control")).toBe("no-store");
	expect(get).not.toHaveBeenCalled();
});
