import type { SemanticChapter } from "../domain/semantic-chapter.js";

interface FumsWindow extends Window {
	fums?: (...args: unknown[]) => void;
	fumsData?: unknown[][];
}
export function createDisplayReporter(track: (token: string) => void) {
	const reported = new Set<string>();
	return (
		chapter: SemanticChapter,
		activation: string,
		scriptureVisible: boolean,
	) => {
		if (
			!scriptureVisible ||
			chapter.tracking.kind !== "api-bible-fums" ||
			reported.has(activation)
		)
			return;
		try {
			track(chapter.tracking.token);
			reported.add(activation);
		} catch {
			/* Reporting never changes Scripture. A subsequent display may retry. */
		}
	};
}
function track(token: string) {
	const target = window as FumsWindow;
	target.fumsData ??= [];
	target.fums ??= (...args) => {
		target.fumsData?.push(args);
	};
	if (!document.querySelector("script[data-fums-tracker]")) {
		const script = document.createElement("script");
		script.src = "https://pkg.api.bible/fumsV3.min.js";
		script.async = true;
		script.dataset.fumsTracker = "true";
		document.head.append(script);
	}
	target.fums("trackView", token);
}
export const reportChapterDisplay = createDisplayReporter(track);
