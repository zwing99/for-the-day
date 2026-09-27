import { describe, expect, it } from "vitest";
import { publicFailureCategory } from "../../../scripts/verse-fit-support.js";

describe("verse-fit provider failure output", () => {
	it("reports rate limits and access denial without provider details", () => {
		expect(publicFailureCategory(429, "rate-limit")).toBe("rate-limit");
		expect(publicFailureCategory(502, "rate-limit")).toBe("rate-limit");
		expect(publicFailureCategory(403, "access-denied")).toBe("access-denied");
		expect(publicFailureCategory(503, "access-denied")).toBe("access-denied");
	});

	it("reduces unknown and credential-like errors to a safe category", () => {
		expect(publicFailureCategory(503, "configuration")).toBe("configuration");
		expect(publicFailureCategory(500, "secret-api-token-value")).toBe(
			"unavailable",
		);
		expect(publicFailureCategory(500)).toBe("unavailable");
	});
});
