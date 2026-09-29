import { describe, expect, it, vi } from "vitest";
import { handle } from "hono/aws-lambda";
import type { APIGatewayProxyEventV2, LambdaContext } from "hono/aws-lambda";
import { createLambdaApp } from "../../src/server/lambda.js";
import { createApp } from "../../src/server/app.js";
import { semanticFixture } from "../fixtures/semantic-chapter.js";

function gatewayEvent(path: string, query = ""): APIGatewayProxyEventV2 {
	return {
		version: "2.0",
		routeKey: "$default",
		headers: { host: "beta.example.test" },
		rawPath: path,
		rawQueryString: query,
		body: null,
		isBase64Encoded: false,
		requestContext: {
			http: { method: "GET" },
		} as APIGatewayProxyEventV2["requestContext"],
	};
}

const context = {} as LambdaContext;

describe("AWS Lambda API adapter", () => {
	it("serves the existing health route through an API Gateway v2 event", async () => {
		const response = await handle(createApp())(
			gatewayEvent("/api/health"),
			context,
		);
		expect(response.statusCode).toBe(200);
		expect(JSON.parse(response.body)).toEqual({ status: "ok" });
		expect(response.headers?.["cache-control"]).toBe("no-store");
	});

	it("forwards the passage path and reading context to the chapter service", async () => {
		const chapter = semanticFixture();
		const get = vi.fn(async () => chapter);
		const app = handle(createApp({ CSB: { get } }));
		const response = await app(
			gatewayEvent(
				"/api/bible/CSB/PSA/23",
				"readingDay=12&timeZone=America%2FChicago",
			),
			context,
		);
		expect(response.statusCode).toBe(200);
		expect(JSON.parse(response.body)).toEqual({
			chapter,
			revision: "unconfigured",
		});
		expect(get).toHaveBeenCalledWith(
			{ book: "PSA", chapter: 23 },
			{ readingDay: 12, timeZone: "America/Chicago" },
		);
	});

	it("returns a safe unavailable response for absent provider configuration", async () => {
		const app = createLambdaApp({
			AWS_REGION: "us-east-1",
			API_BIBLE_KEY: "",
			API_BIBLE_CSB_ID: "",
			API_BIBLE_NIV_ID: "",
			API_BIBLE_NLT_ID: "",
			CROSSWAY_KEY: "",
		});
		const response = await app.request("/api/bible/CSB/PSA/23");
		expect(response.status).toBe(503);
		const body = await response.text();
		expect(body).toContain('"code":"configuration"');
		expect(body).not.toContain("API_BIBLE_KEY");
		expect(body).not.toContain("CROSSWAY_KEY");
	});
});
