import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin } from "vite";

/** Static allowlist only: never crawl API responses or cache arbitrary requests. */
export function shellPwa(): Plugin {
	let outDir: string;
	let building = false;
	return {
		name: "for-the-day-static-shell",
		configResolved(config) {
			outDir = resolve(config.root, config.build.outDir);
			building = config.command === "build";
		},
		configureServer(server) {
			// Retire a preview worker if this origin is later used for hot-reload dev.
			server.middlewares.use((request, response, next) => {
				if (request.url?.split("?")[0] !== "/sw.js") return next();
				response.setHeader("Content-Type", "text/javascript");
				response.setHeader("Cache-Control", "no-store");
				response.end(`self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith("for-the-day-shell-")) await caches.delete(name);
  await self.clients.claim();
  await self.registration.unregister();
})()));`);
			});
		},
		async closeBundle() {
			if (!building) return;
			const paths = ["/index.html", "/manifest.webmanifest"];
			for (const dir of ["assets", "icons", "fonts/source-serif-4"]) {
				for (const name of await readdir(resolve(outDir, dir))) {
					if (/\.(?:js|css|woff2|png)$/.test(name))
						paths.push(`/${dir}/${name}`);
				}
			}
			paths.sort();
			const template = await readFile(
				new URL("./shell-worker.js", import.meta.url),
				"utf8",
			);
			const hash = createHash("sha256").update(template);
			for (const path of paths)
				hash.update(path).update(await readFile(resolve(outDir, `.${path}`)));
			const name = `for-the-day-shell-${hash.digest("hex").slice(0, 20)}`;
			await writeFile(
				resolve(outDir, "sw.js"),
				template
					.replace("__CACHE_NAME__", JSON.stringify(name))
					.replace("__STATIC_PATHS__", JSON.stringify(paths)),
			);
		},
	};
}
