// Build substitutes this exact static allowlist and content-derived cache name.
const CACHE_NAME = __CACHE_NAME__;
const STATIC_PATHS = __STATIC_PATHS__;
const STATIC = new Set(STATIC_PATHS);
const CACHE_PREFIX = "for-the-day-shell-";

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) =>
				cache.addAll(
					STATIC_PATHS.map((path) => new Request(path, { cache: "reload" })),
				),
			),
	);
	// Updates wait for all old reading tabs to close. Never skipWaiting or reload.
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((names) =>
				Promise.all(
					names
						.filter(
							(name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME,
						)
						.map((name) => caches.delete(name)),
				),
			),
	);
});

self.addEventListener("fetch", (event) => {
	const request = event.request;
	const url = new URL(request.url);
	// Never intercept API, provider or FUMS requests, even same-origin lookalikes.
	if (
		request.method !== "GET" ||
		url.origin !== self.location.origin ||
		url.pathname === "/api" ||
		url.pathname.startsWith("/api/")
	)
		return;
	if (request.mode === "navigate") {
		event.respondWith(
			caches
				.open(CACHE_NAME)
				.then(
					async (cache) => (await cache.match("/index.html")) ?? fetch(request),
				),
		);
	} else if (!url.search && STATIC.has(url.pathname)) {
		event.respondWith(
			caches
				.open(CACHE_NAME)
				.then(
					async (cache) => (await cache.match(url.pathname)) ?? fetch(request),
				),
		);
	}
});
