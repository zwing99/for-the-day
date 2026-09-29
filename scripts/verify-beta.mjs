import { readFile } from "node:fs/promises";
import { lookup } from "node:dns/promises";
import { resolve } from "node:path";

const input = process.argv[2] ?? process.env.BETA_ORIGIN;
if (!input)
	throw new Error(
		"Usage: node scripts/verify-beta.mjs https://fortheday.beckyandzac.com",
	);
const origin = new URL(input);
if (origin.protocol !== "https:")
	throw new Error("Beta origin must use HTTPS.");
const addresses = await lookup(origin.hostname, { all: true });
if (!addresses.length)
	throw new Error(`DNS returned no addresses for ${origin.hostname}.`);

async function fetchPath(path, expectedStatus = 200) {
	const response = await fetch(new URL(path, origin));
	if (response.url !== new URL(path, origin).href)
		throw new Error(
			`${path} redirected to a different origin: ${response.url}`,
		);
	if (response.status !== expectedStatus)
		throw new Error(
			`${path} returned HTTP ${response.status}; expected ${expectedStatus}.`,
		);
	return response;
}
function contentType(response, expected) {
	const value = response.headers.get("content-type") ?? "";
	if (!expected.test(value))
		throw new Error(
			`Unexpected Content-Type for ${response.url}: ${value || "missing"}`,
		);
}
function assertHtml(body, label) {
	if (!/<html\b/i.test(body))
		throw new Error(`${label} did not contain the reader HTML shell.`);
}

const health = await fetchPath("/api/health");
contentType(health, /application\/json/i);
if ((await health.json()).status !== "ok")
	throw new Error("/api/health returned an unexpected payload.");
if (health.headers.get("cache-control") !== "no-store")
	throw new Error("/api/health is cacheable at the edge.");

const shell = await fetchPath("/");
contentType(shell, /text\/html/i);
const html = await shell.text();
assertHtml(html, "/");
const deepLink = await fetchPath("/1/psalm/1?translation=CSB");
contentType(deepLink, /text\/html/i);
assertHtml(await deepLink.text(), "Direct reader link");

const manifest = JSON.parse(
	await readFile(resolve("dist/scripture/webu/manifest.json"), "utf8"),
);
const webu = await fetchPath(`/scripture/webu/${manifest.revision}/PSA/1.json`);
contentType(webu, /application\/json/i);
const chapter = await webu.json();
if (chapter.schemaVersion !== 1 || chapter.identity?.translation !== "WEBU")
	throw new Error(
		"The WEBU route did not return a WEBU chapter JSON document.",
	);

const scriptPath = html.match(/<script\b[^>]*\bsrc="([^"]+\.js)"/i)?.[1];
if (!scriptPath)
	throw new Error("The reader HTML did not reference a JavaScript bundle.");
const script = await fetchPath(scriptPath);
contentType(script, /(?:application|text)\/javascript/i);
if (/<html\b/i.test(await script.text()))
	throw new Error(`${scriptPath} returned HTML instead of JavaScript.`);

const missingPath = `/assets/does-not-exist-${Date.now()}.js`;
const missing = await fetch(new URL(missingPath, origin));
if (![403, 404].includes(missing.status))
	throw new Error(
		`${missingPath} returned HTTP ${missing.status}; expected a missing-object response.`,
	);
if (/<html\b/i.test(await missing.text()))
	throw new Error(
		`${missingPath} returned the SPA HTML shell for a missing asset.`,
	);

console.log(
	`Beta checks passed for ${origin.origin} (${addresses.map(({ address }) => address).join(", ")}).`,
);
