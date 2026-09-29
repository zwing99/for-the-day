import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const source = readFileSync(
	"terraform/modules/frontend/spa-rewrite.js",
	"utf8",
);
function rewrite(uri: string) {
	const request = { uri, querystring: { translation: { value: "CSB" } } };
	const result = runInNewContext(`${source}\nhandler(event)`, {
		event: { request },
	});
	return result as typeof request;
}

describe("CloudFront SPA viewer request", () => {
	it.each(["/", "/1", "/31", "/12/psalm/23", "/12/proverbs/31/4-5"])(
		"rewrites recognized reader route %s to the SPA shell",
		(uri) => {
			const result = rewrite(uri);
			expect(result.uri).toBe("/index.html");
			expect(result.querystring).toEqual({ translation: { value: "CSB" } });
		},
	);

	it.each([
		"/api",
		"/api/health",
		"/scripture/webu/revision/PSA/23.json",
		"/assets/index-deadbeef.js",
		"/manifest.webmanifest",
		"/favicon.svg",
		"/33",
		"/12/psalm/23/invalid-location",
		"/future-reader-route",
		"/unknown/route",
	])("leaves static, API, and unknown paths unchanged: %s", (uri) => {
		expect(rewrite(uri).uri).toBe(uri);
	});
});

it("keeps archived release artifacts private at the public edge", () => {
	const result = rewrite("/releases/abc123/lambda.zip");
	expect(result).toMatchObject({
		statusCode: 404,
		statusDescription: "Not Found",
	});
});
