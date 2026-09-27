const cachePrefix = "for-the-day-shell-";
let waiting = false;
const listeners = new Set<() => void>();
export const shellUpdate = {
	getSnapshot: () => waiting,
	subscribe(listener: () => void) {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
};

export async function configureShell(production: boolean): Promise<void> {
	if (!("serviceWorker" in navigator)) return;
	try {
		if (!production) {
			const workerUrl = new URL("/sw.js", location.origin).href;
			for (const registration of await navigator.serviceWorker.getRegistrations()) {
				if (
					[
						registration.active,
						registration.waiting,
						registration.installing,
					].some((worker) => worker?.scriptURL === workerUrl)
				)
					await registration.unregister();
			}
			if ("caches" in globalThis) {
				for (const name of await caches.keys())
					if (name.startsWith(cachePrefix)) await caches.delete(name);
			}
			return;
		}
		const registration = await navigator.serviceWorker.register("/sw.js", {
			scope: "/",
			updateViaCache: "none",
		});
		const notify = () => {
			if (!registration.waiting || !navigator.serviceWorker.controller) return;
			waiting = true;
			for (const listener of listeners) listener();
		};
		notify();
		registration.addEventListener("updatefound", () => {
			registration.installing?.addEventListener("statechange", notify);
		});
	} catch {
		// Installation/storage failure leaves the ordinary online reader usable.
	}
}
