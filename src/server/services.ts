import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { ChapterIdentity } from "./cache/chapter-repository.js";
import { DynamoChapterRepository } from "./cache/dynamodb-chapters.js";
import { ChapterService } from "./chapter-service.js";
import { contentRevision } from "./content-revision.js";
import { ApiBibleProvider } from "./providers/api-bible.js";
import { CROSSWAY_EDITION, CrosswayProvider } from "./providers/crossway.js";

export interface ProviderConfiguration {
	apiBibleKey?: string;
	csbId?: string;
	nivId?: string;
	nltId?: string;
	crosswayKey?: string;
}

function validSetting(value: string | undefined): value is string {
	return !!value && value.trim() === value;
}

export function missingProviderConfiguration(
	configuration: ProviderConfiguration,
): string[] {
	return [
		["API_BIBLE_KEY", configuration.apiBibleKey],
		["API_BIBLE_CSB_ID", configuration.csbId],
		["API_BIBLE_NIV_ID", configuration.nivId],
		["API_BIBLE_NLT_ID", configuration.nltId],
		["CROSSWAY_KEY", configuration.crosswayKey],
	]
		.filter(([, value]) => !validSetting(value))
		.map(([name]) => name as string);
}

export function createChapterServices(options: {
	client: DynamoDBDocumentClient;
	table: string;
	configuration: ProviderConfiguration;
	providerFetch?: typeof fetch;
}) {
	const repository = new DynamoChapterRepository({
		client: options.client,
		table: options.table,
	});
	const identities: Array<Omit<ChapterIdentity, "book" | "chapter">> = [];
	const services: Partial<
		Record<"CSB" | "NIV" | "NLT" | "ESV", ChapterService>
	> = {};
	const apiBibleKey = validSetting(options.configuration.apiBibleKey)
		? options.configuration.apiBibleKey
		: undefined;
	for (const [translation, configuredId] of [
		["CSB", options.configuration.csbId],
		["NIV", options.configuration.nivId],
		["NLT", options.configuration.nltId],
	] as const) {
		const bibleId = validSetting(configuredId) ? configuredId : undefined;
		const identity = {
			translation,
			provider: "api-bible" as const,
			providerBibleId: bibleId ?? "unconfigured",
			editionKey: `api-bible-v2:${bibleId ?? "unconfigured"}:normalizer-2`,
		};
		identities.push(identity);
		if (apiBibleKey && bibleId) {
			services[translation] = new ChapterService(
				new ApiBibleProvider({
					apiKey: apiBibleKey,
					fetch: options.providerFetch,
					bibleId,
					translation,
				}),
				repository,
				identity,
			);
		}
	}
	const esvIdentity = {
		translation: "ESV" as const,
		provider: "crossway" as const,
		providerBibleId: "esv",
		editionKey: CROSSWAY_EDITION,
	};
	identities.push(esvIdentity);
	if (validSetting(options.configuration.crosswayKey)) {
		services.ESV = new ChapterService(
			new CrosswayProvider({ apiKey: options.configuration.crosswayKey }),
			repository,
			esvIdentity,
		);
	}
	return {
		services,
		identities,
		repository,
		revision: contentRevision(identities),
	};
}
