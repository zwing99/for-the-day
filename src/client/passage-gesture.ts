import { type TouchEvent, useEffect, useRef, type WheelEvent } from "react";
import {
	type Gesture,
	gestureMove,
	gestureResult,
} from "../domain/passage-gesture.js";
export const interactiveTarget = (target: EventTarget | null) =>
	target instanceof Element &&
	!!target.closest(
		"button,a,input,select,textarea,summary,[contenteditable],[role=dialog]",
	);
export interface PassageDrag {
	phase: "idle" | "dragging" | "settling";
	offset: number;
	direction?: -1 | 1;
}
interface GestureOptions {
	disabled?: boolean;
	resetKey?: string;
	canMove?: (direction: number) => boolean;
	progress?: (drag: PassageDrag) => void;
	width?: () => number;
}
export function usePassageGesture(
	change: (direction: number) => void,
	options: GestureOptions = {},
) {
	const state = useRef<Gesture | undefined>(undefined);
	const callbacks = useRef({ change, options });
	callbacks.current = { change, options };
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const settling = useRef(false);
	const dragDirection = useRef<-1 | 1 | undefined>(undefined);
	const wheelBlocked = useRef(false);
	const lastWheel = useRef(-Infinity);
	const wheel = useRef<{ x: number; y: number; last: number } | undefined>(
		undefined,
	);
	const selected = () => !!window.getSelection()?.toString();
	function reset() {
		clearTimeout(timer.current);
		state.current = undefined;
		wheel.current = undefined;
		settling.current = false;
		callbacks.current.options.progress?.({ phase: "idle", offset: 0 });
	}
	useEffect(() => {
		reset();
		const selection = () => {
			if (selected()) reset();
		};
		window.addEventListener("resize", reset);
		document.addEventListener("selectionchange", selection);
		window.addEventListener("blur", reset);
		return () => {
			clearTimeout(timer.current);
			window.removeEventListener("resize", reset);
			document.removeEventListener("selectionchange", selection);
			window.removeEventListener("blur", reset);
		};
	}, [options.disabled, options.resetKey]);
	function progress(x: number, y: number) {
		const gesture = state.current;
		if (!gesture) return;
		state.current = gestureMove(gesture, x, y);
		if (!state.current.horizontal || state.current.cancelled) return;
		const dx = x - gesture.x;
		const direction = dx < 0 ? 1 : -1;
		dragDirection.current = direction;
		const width = callbacks.current.options.width?.() ?? window.innerWidth;
		const bounded = callbacks.current.options.canMove?.(direction) === false;
		callbacks.current.options.progress?.({
			phase: "dragging",
			direction,
			offset: Math.max(-width, Math.min(width, dx * (bounded ? 0.2 : 1))),
		});
	}
	function release(x: number, y: number, ended: number, cancel = false) {
		const gesture = state.current;
		state.current = undefined;
		if (!gesture) return;
		const direction =
			cancel || selected() ? undefined : gestureResult(gesture, x, y, ended);
		const commit =
			direction && callbacks.current.options.canMove?.(direction) !== false
				? direction
				: undefined;
		if (commit) wheelBlocked.current = true;
		if (!gesture.horizontal && !commit) {
			reset();
			return;
		}
		const animated =
			!!callbacks.current.options.progress &&
			!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		if (!animated) {
			reset();
			if (commit) callbacks.current.change(commit);
			return;
		}
		settling.current = true;
		callbacks.current.options.progress?.({
			phase: "settling",
			direction: commit ?? dragDirection.current,
			offset: commit
				? -commit * (callbacks.current.options.width?.() ?? window.innerWidth)
				: 0,
		});
		timer.current = setTimeout(() => {
			reset();
			if (commit) callbacks.current.change(commit);
		}, 180);
	}
	return {
		slide(direction: number) {
			if (
				settling.current ||
				options.disabled ||
				options.canMove?.(direction) === false
			)
				return;
			reset();
			state.current = {
				x: 0,
				y: 0,
				started: 0,
				vertical: false,
				horizontal: true,
				cancelled: false,
			};
			release(-direction * 56, 0, 0);
		},
		onTouchStart(event: TouchEvent) {
			if (
				state.current ||
				settling.current ||
				options.disabled ||
				event.touches.length !== 1 ||
				interactiveTarget(event.target) ||
				selected()
			) {
				if (settling.current) return;
				reset();
				state.current = {
					x: 0,
					y: 0,
					started: 0,
					vertical: false,
					cancelled: true,
				};
				return;
			}
			const touch = event.touches[0]!;
			state.current = {
				x: touch.clientX,
				y: touch.clientY,
				started: event.timeStamp,
				vertical: false,
				cancelled: false,
			};
		},
		onTouchMove(event: TouchEvent) {
			if (!state.current) return;
			if (event.touches.length !== 1 || selected()) {
				reset();
				return;
			}
			const touch = event.touches[0]!;
			progress(touch.clientX, touch.clientY);
		},
		onTouchEnd(event: TouchEvent) {
			const gesture = state.current;
			if (event.touches.length) {
				if (gesture) gesture.cancelled = true;
				return;
			}
			if (!gesture) return;
			if (event.changedTouches.length !== 1 || selected()) {
				reset();
				return;
			}
			const touch = event.changedTouches[0]!;
			release(touch.clientX, touch.clientY, event.timeStamp);
		},
		onTouchCancel() {
			const gesture = state.current;
			if (gesture) release(gesture.x, gesture.y, performance.now(), true);
		},
		onWheel(event: WheelEvent) {
			if (event.ctrlKey) {
				reset();
				return;
			}
			const now = event.timeStamp;
			const quiet = now - lastWheel.current > 180;
			lastWheel.current = now;
			if (wheelBlocked.current) {
				if (!quiet || settling.current) return;
				wheelBlocked.current = false;
			}
			if (
				options.disabled ||
				settling.current ||
				interactiveTarget(event.target) ||
				selected()
			)
				return;
			if (!wheel.current || now - wheel.current.last > 180) {
				wheel.current = { x: 0, y: 0, last: now };
				state.current = {
					x: 0,
					y: 0,
					started: now,
					vertical: false,
					cancelled: false,
				};
			}
			const input = wheel.current;
			const factor =
				event.deltaMode === 1
					? 16
					: event.deltaMode === 2
						? window.innerHeight
						: 1;
			input.x -= event.deltaX * factor;
			input.y -= event.deltaY * factor;
			input.last = now;
			progress(input.x, input.y);
			clearTimeout(timer.current);
			timer.current = setTimeout(() => {
				wheel.current = undefined;
				release(input.x, input.y, input.last);
			}, 140);
		},
	};
}
