// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
	type PassageDrag,
	usePassageGesture,
} from "../../../src/client/passage-gesture.js";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
});
function Harness({
	change,
	progress,
	bounded = false,
	disabled = false,
}: {
	change: (direction: number) => void;
	progress?: (drag: PassageDrag) => void;
	bounded?: boolean;
	disabled?: boolean;
}) {
	const { slide: _slide, ...handlers } = usePassageGesture(change, {
		progress,
		canMove: () => !bounded,
		disabled,
		width: () => 390,
	});
	return (
		<main {...handlers}>
			<button>Control</button>
			<p>Reading text</p>
		</main>
	);
}
const touch = (clientX: number, clientY: number) => ({ clientX, clientY });
it("reports at most once, excludes controls and cancels multi-touch/vertical gestures", () => {
	const change = vi.fn();
	const { container } = render(<Harness change={change} />);
	const main = container.querySelector("main")!;
	fireEvent.touchStart(main, { touches: [touch(200, 100)] });
	fireEvent.touchEnd(main, { touches: [], changedTouches: [touch(100, 100)] });
	fireEvent.touchEnd(main, { touches: [], changedTouches: [touch(100, 100)] });
	expect(change).toHaveBeenCalledTimes(1);
	fireEvent.touchStart(container.querySelector("button")!, {
		touches: [touch(200, 100)],
	});
	fireEvent.touchEnd(main, { touches: [], changedTouches: [touch(100, 100)] });
	fireEvent.touchStart(main, { touches: [touch(200, 100)] });
	fireEvent.touchMove(main, { touches: [touch(200, 130)] });
	fireEvent.touchEnd(main, { touches: [], changedTouches: [touch(100, 130)] });
	fireEvent.touchStart(main, { touches: [touch(200, 100), touch(100, 100)] });
	fireEvent.touchEnd(main, { touches: [], changedTouches: [touch(100, 100)] });
	fireEvent.touchStart(main, { touches: [touch(200, 100)] });
	fireEvent.touchCancel(main);
	fireEvent.touchEnd(main, { touches: [], changedTouches: [touch(100, 100)] });
	expect(change).toHaveBeenCalledTimes(1);
});
it("reveals progress before committing once after completion", () => {
	vi.useFakeTimers();
	const change = vi.fn(),
		progress = vi.fn();
	const { container } = render(<Harness change={change} progress={progress} />);
	const main = container.querySelector("main")!;
	fireEvent.touchStart(main, { touches: [touch(200, 100)] });
	fireEvent.touchMove(main, { touches: [touch(100, 105)] });
	expect(progress).toHaveBeenLastCalledWith({
		phase: "dragging",
		offset: -100,
		direction: 1,
	});
	expect(change).not.toHaveBeenCalled();
	fireEvent.touchEnd(main, { touches: [], changedTouches: [touch(100, 105)] });
	expect(progress).toHaveBeenLastCalledWith({
		phase: "settling",
		offset: -390,
		direction: 1,
	});
	fireEvent.touchEnd(main, { touches: [], changedTouches: [touch(100, 105)] });
	act(() => vi.advanceTimersByTime(180));
	expect(change).toHaveBeenCalledExactlyOnceWith(1);
});
it.each(["short", "cancel", "boundary", "resize", "menu"])(
	"returns without commitment for %s",
	(kind) => {
		vi.useFakeTimers();
		const change = vi.fn(),
			progress = vi.fn();
		const view = render(
			<Harness
				change={change}
				progress={progress}
				bounded={kind === "boundary"}
			/>,
		);
		const main = view.container.querySelector("main")!;
		fireEvent.touchStart(main, { touches: [touch(200, 100)] });
		fireEvent.touchMove(main, {
			touches: [touch(kind === "short" ? 170 : 100, 100)],
		});
		if (kind === "cancel") fireEvent.touchCancel(main);
		else
			fireEvent.touchEnd(main, {
				touches: [],
				changedTouches: [touch(kind === "short" ? 170 : 100, 100)],
			});
		if (kind === "resize") fireEvent(window, new Event("resize"));
		if (kind === "menu")
			view.rerender(<Harness change={change} progress={progress} disabled />);
		act(() => vi.advanceTimersByTime(500));
		expect(change).not.toHaveBeenCalled();
		expect(progress).toHaveBeenLastCalledWith({ phase: "idle", offset: 0 });
	},
);
it("accepts horizontal trackpad input and rejects vertical input and native zoom", () => {
	vi.useFakeTimers();
	const change = vi.fn(),
		progress = vi.fn();
	const { container } = render(<Harness change={change} progress={progress} />);
	const main = container.querySelector("main")!;
	fireEvent.wheel(main, { deltaX: 80, deltaY: 2 });
	expect(progress).toHaveBeenLastCalledWith({
		phase: "dragging",
		offset: -80,
		direction: 1,
	});
	act(() => vi.advanceTimersByTime(140));
	fireEvent.wheel(main, { deltaX: 80, deltaY: 2 });
	act(() => vi.advanceTimersByTime(100));
	fireEvent.wheel(main, { deltaX: 20, deltaY: 2 });
	act(() => vi.advanceTimersByTime(100));
	fireEvent.wheel(main, { deltaX: 10, deltaY: 2 });
	act(() => vi.advanceTimersByTime(100));
	expect(change).toHaveBeenCalledTimes(1);
	fireEvent.wheel(main, { deltaX: 80, deltaY: 100 });
	fireEvent.wheel(main, { deltaX: 80, ctrlKey: true });
	act(() => vi.advanceTimersByTime(500));
	expect(change).toHaveBeenCalledTimes(1);
});
it("preserves active text selection", () => {
	const selection = vi
		.spyOn(window, "getSelection")
		.mockReturnValue({ toString: () => "selected" } as Selection);
	const change = vi.fn();
	const { container } = render(<Harness change={change} />);
	const main = container.querySelector("main")!;
	fireEvent.touchStart(main, { touches: [touch(200, 100)] });
	fireEvent.touchEnd(main, { touches: [], changedTouches: [touch(100, 100)] });
	expect(change).not.toHaveBeenCalled();
	selection.mockRestore();
});
it("commits immediately without settling when reduced motion is requested", () => {
	vi.stubGlobal("matchMedia", () => ({ matches: true }));
	const change = vi.fn(),
		progress = vi.fn();
	const { container } = render(<Harness change={change} progress={progress} />);
	const main = container.querySelector("main")!;
	fireEvent.touchStart(main, { touches: [touch(200, 100)] });
	fireEvent.touchMove(main, { touches: [touch(100, 100)] });
	fireEvent.touchEnd(main, { touches: [], changedTouches: [touch(100, 100)] });
	expect(change).toHaveBeenCalledExactlyOnceWith(1);
	expect(progress.mock.calls.some(([drag]) => drag.phase === "settling")).toBe(
		false,
	);
	vi.unstubAllGlobals();
});
