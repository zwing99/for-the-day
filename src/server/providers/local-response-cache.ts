import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const LOCAL_RESPONSE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
interface CachedResponse {
	version: 1;
	retrievedAt: number;
	status: number;
	contentType: string;
	retryAfter?: string;
	body: string;
}
interface Options {
	directory?: string;
	clock?: () => number;
	fetch?: typeof fetch;
	allowNetwork?: boolean;
}

/** Local listener/tooling only: raw responses survive normalizer revisions. */
export function localResponseCache(options: Options = {}): typeof fetch {
	const directory = options.directory ?? ".local/provider-response-cache";
	const clock = options.clock ?? Date.now;
	const pending = new Map<string, Promise<CachedResponse>>();
	function response(value: CachedResponse): Response {
		return new Response(value.body, {
			status: value.status,
			headers: {
				"Content-Type": value.contentType,
				...(value.retryAfter ? { "Retry-After": value.retryAfter } : {}),
			},
		});
	}
	return async (input, init) => {
		const url = new URL(input instanceof Request ? input.url : String(input));
		if (
			url.origin !== "https://v2.api.bible" ||
			(init?.method ?? (input instanceof Request ? input.method : "GET")) !==
				"GET"
		)
			throw new Error("Unsupported local provider cache request.");
		const signal =
			init?.signal ?? (input instanceof Request ? input.signal : undefined);
		signal?.throwIfAborted();
		const key = createHash("sha256").update(url.href).digest("hex");
		const path = join(directory, `${key}.json`);
		async function read(): Promise<CachedResponse | undefined> {
			let raw: string;
			try {
				raw = await readFile(path, "utf8");
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === "ENOENT")
					return undefined;
				throw new Error("Local provider response cache could not be read.");
			}
			let value: CachedResponse;
			try {
				value = JSON.parse(raw);
			} catch {
				throw new Error(
					"Local provider response cache is invalid; repair it before fetching.",
				);
			}
			if (
				value.version !== 1 ||
				!Number.isFinite(value.retrievedAt) ||
				value.status !== 200 ||
				typeof value.body !== "string" ||
				typeof value.contentType !== "string"
			)
				throw new Error(
					"Local provider response cache is invalid; repair it before fetching.",
				);
			if (
				value.retrievedAt > clock() ||
				clock() - value.retrievedAt >= LOCAL_RESPONSE_TTL_MS
			) {
				await unlink(path);
				return undefined;
			}
			return value;
		}
		const cached = await read();
		signal?.throwIfAborted();
		if (cached) return response(cached);
		const existing = pending.get(key);
		if (existing) {
			const value = await existing;
			signal?.throwIfAborted();
			return response(value);
		}
		if (options.allowNetwork === false)
			throw new Error(
				"No fresh local provider response. Offline verification will not use the API quota.",
			);
		const request = (async () => {
			// Check write access before spending an upstream request.
			await mkdir(directory, { recursive: true, mode: 0o700 });
			const temp = join(directory, `${key}.${randomUUID()}.tmp`);
			await writeFile(temp, "", { mode: 0o600, flag: "wx" });
			try {
				const upstream = await (options.fetch ?? fetch)(input, init);
				const value: CachedResponse = {
					version: 1,
					retrievedAt: clock(),
					status: upstream.status,
					retryAfter: upstream.headers.get("Retry-After") ?? undefined,
					contentType:
						upstream.headers.get("Content-Type") ?? "application/json",
					body: await upstream.text(),
				};
				if (upstream.status === 200) {
					await writeFile(temp, JSON.stringify(value), { mode: 0o600 });
					await rename(temp, path);
				}
				return value;
			} finally {
				await unlink(temp).catch(() => {});
			}
		})();
		pending.set(key, request);
		try {
			const value = await request;
			signal?.throwIfAborted();
			return response(value);
		} finally {
			pending.delete(key);
		}
	};
}
