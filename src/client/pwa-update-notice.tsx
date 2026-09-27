import { useSyncExternalStore } from "react";
import { shellUpdate } from "./pwa.js";

export function PwaUpdateNotice() {
	const ready = useSyncExternalStore(
		shellUpdate.subscribe,
		shellUpdate.getSnapshot,
	);
	return ready ? (
		<p role="status">
			An app update is ready. When you finish reading, close all reader tabs and
			reopen the app to use it.
		</p>
	) : null;
}
