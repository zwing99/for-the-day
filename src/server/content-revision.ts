import { createHash } from "node:crypto";
import type { ChapterIdentity } from "./cache/chapter-repository.js";

/** Hash an explicit public allowlist; never serialize provider configuration. */
export function contentRevision(
	identities: Array<Omit<ChapterIdentity, "book" | "chapter">>,
	modelVersion = 1,
): string {
	const publicIdentities = identities
		.map((identity) => [
			identity.translation,
			identity.provider,
			identity.providerBibleId,
			identity.editionKey,
		])
		.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
	return createHash("sha256")
		.update(JSON.stringify([modelVersion, publicIdentities]))
		.digest("hex");
}
