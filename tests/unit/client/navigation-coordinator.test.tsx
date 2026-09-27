// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Reader } from "../../../src/client/reader.js";
import {
	defaultPreferences,
	ReadingStorage,
} from "../../../src/client/reading-storage.js";
import type { ReaderRoute } from "../../../src/domain/reader-route.js";
import type { Passage } from "../../../src/domain/reading-plan.js";
import { semanticFixture } from "../../fixtures/semantic-chapter.js";

const surface = vi.hoisted(() => ({
	current: undefined as
		| undefined
		| {
				targetKey?: string;
				onReady?: () => void;
				onLocation?: (key: string) => void;
		  },
}));
// Drive readiness and settled markers independently of DOM geometry to exercise the coordinator.
vi.mock("../../../src/client/reading-surface.js", () => ({
	ReadingSurface: (props: typeof surface.current) => {
		surface.current = props;
		return <div data-testid="surface">{props?.targetKey}</div>;
	},
}));
const route = (chapter: number, location?: string): ReaderRoute => ({
	day: 7,
	book: "PSA",
	chapter,
	translation: "CSB",
	location,
});
const source = () => ({
	get: vi.fn(async (p: Passage) => {
		const chapter = semanticFixture();
		chapter.identity.book = p.book;
		chapter.identity.chapter = p.chapter;
		return chapter;
	}),
});
async function ready(target: string) {
	await waitFor(() => expect(surface.current?.targetKey).toBe(target));
	act(() => surface.current?.onReady?.());
}
beforeEach(() => {
	surface.current = undefined;
	window.history.replaceState(null, "", "/7/psalm/7");
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

it("retains independent A/B/C positions, flushes outgoing state, and reloads saved progress", async () => {
	const storage = new ReadingStorage();
	const get = source();
	const view = render(
		<Reader source={get} storage={storage} report={vi.fn()} />,
	);
	await ready("intro");
	act(() => surface.current?.onLocation?.("a"));
	const save = vi.spyOn(storage, "savePosition");
	fireEvent.click(screen.getByRole("button", { name: "Psalm 37" }));
	expect(save.mock.calls[0]?.[0]).toMatchObject(route(7, "1a"));
	await ready("intro");
	act(() => surface.current?.onLocation?.("b"));
	fireEvent.click(screen.getByRole("button", { name: "Psalm 67" }));
	await ready("intro");
	act(() => surface.current?.onLocation?.("d"));
	for (const [chapter, target] of [
		[7, "a"],
		[37, "b"],
		[67, "d"],
	] as const) {
		fireEvent.click(screen.getByRole("button", { name: `Psalm ${chapter}` }));
		await ready(target);
	}
	expect(storage.position(route(7))?.location).toBe("1a");
	expect(storage.position(route(37))?.location).toBe("2");
	expect(storage.position(route(67))?.location).toBe("4");
	view.unmount();
	window.history.replaceState(null, "", "/7/psalm/37");
	render(<Reader source={get} storage={storage} report={vi.fn()} />);
	await ready("b");
	expect(window.location.pathname).toBe("/7/psalm/37/2");
});

it("suppresses observer writes until ready and rejects departing callbacks immediately", async () => {
	const storage = new ReadingStorage();
	const view = render(
		<Reader source={source()} storage={storage} report={vi.fn()} />,
	);
	await waitFor(() => expect(surface.current?.targetKey).toBe("intro"));
	const save = vi.spyOn(storage, "savePosition");
	act(() => surface.current?.onLocation?.("a"));
	expect(save).not.toHaveBeenCalled();
	expect(window.location.pathname).toBe("/7/psalm/7");
	await ready("intro");
	const departed = surface.current!;
	fireEvent.click(screen.getByRole("button", { name: "Psalm 37" }));
	act(() => {
		departed.onReady?.();
		departed.onLocation?.("b");
	});
	expect(window.location.pathname).toBe("/7/psalm/37");
	await ready("intro");
	expect(storage.position(route(7))?.location).toBe("intro");
	expect(view.getByTestId("surface").textContent).toBe("intro");
});

it("replaces settled reading entries and restores Back/Forward without pushing", async () => {
	const storage = new ReadingStorage();
	const push = vi.spyOn(window.history, "pushState");
	render(<Reader source={source()} storage={storage} report={vi.fn()} />);
	await ready("intro");
	act(() => {
		surface.current?.onLocation?.("a");
		surface.current?.onLocation?.("b");
	});
	expect(push).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Psalm 37" }));
	await ready("intro");
	act(() => surface.current?.onLocation?.("d"));
	expect(push).toHaveBeenCalledTimes(1);
	act(() => window.history.back());
	await ready("b");
	expect(window.location.pathname).toBe("/7/psalm/7/2");
	act(() => window.history.forward());
	await ready("d");
	expect(window.location.pathname).toBe("/7/psalm/37/4");
	expect(push).toHaveBeenCalledTimes(1);
});

it("honors shared translation/location ahead of storage and uses first verse with intros off", async () => {
	const storage = new ReadingStorage();
	storage.setPreferences({
		...defaultPreferences,
		translation: "NLT",
		intros: false,
	});
	storage.savePosition(route(7, "2"));
	window.history.replaceState(null, "", "/7/psalm/7/1a?translation=CSB");
	const get = source();
	render(<Reader source={get} storage={storage} report={vi.fn()} />);
	await ready("a");
	expect(get.get.mock.calls[0]?.[0]).toMatchObject({ translation: "CSB" });
	act(() => {
		window.history.pushState(null, "", "/7/psalm/37");
		window.dispatchEvent(new PopStateEvent("popstate"));
	});
	await ready("a");
	await waitFor(() => expect(window.location.pathname).toBe("/7/psalm/37/1a"));
	expect(window.location.search).toBe("?translation=NLT");
});
