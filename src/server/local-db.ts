import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { NodeHttpHandler } from "@smithy/node-http-handler";

export function localDatabase() {
	const endpoint = process.env.DYNAMODB_ENDPOINT ?? "http://127.0.0.1:8000";
	const url = new URL(endpoint);
	if (
		url.protocol !== "http:" ||
		!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
		url.username ||
		url.password
	) {
		throw new Error(
			"DYNAMODB_ENDPOINT must be a loopback HTTP endpoint for DynamoDB Local.",
		);
	}
	return new DynamoDBClient({
		requestHandler: new NodeHttpHandler({
			connectionTimeout: 1000,
			requestTimeout: 2000,
		}),
		endpoint,
		region: process.env.DYNAMODB_REGION ?? "us-east-1",
		credentials: { accessKeyId: "local", secretAccessKey: "local" },
		maxAttempts: 1,
	});
}
