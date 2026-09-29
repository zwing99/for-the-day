import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { handle } from "hono/aws-lambda";
import { createApp } from "./app.js";
import { createChapterServices } from "./services.js";

export function createLambdaApp(environment: NodeJS.ProcessEnv = process.env) {
	const client = DynamoDBDocumentClient.from(
		new DynamoDBClient({ region: environment.AWS_REGION ?? "us-east-1" }),
		{ marshallOptions: { removeUndefinedValues: true } },
	);
	const { services, revision } = createChapterServices({
		client,
		table: environment.DYNAMODB_TABLE ?? "for-the-day-chapters",
		configuration: {
			apiBibleKey: environment.API_BIBLE_KEY,
			csbId: environment.API_BIBLE_CSB_ID,
			nivId: environment.API_BIBLE_NIV_ID,
			nltId: environment.API_BIBLE_NLT_ID,
			crosswayKey: environment.CROSSWAY_KEY,
		},
	});
	return createApp(services, revision);
}

const app = createLambdaApp();
export const handler = handle(app);
