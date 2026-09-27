import { expect, it } from "vitest";
import {
	type Gesture,
	gestureMove,
	gestureResult,
} from "../../../src/domain/passage-gesture.js";

const start: Gesture = {
	x: 100,
	y: 100,
	started: 0,
	vertical: false,
	cancelled: false,
};
it("accepts deliberate left/right and rejects short, diagonal, cancelled, multi-contact and slow gestures", () => {
	expect(gestureResult(start, 0, 110, 200)).toBe(1);
	expect(gestureResult(start, 200, 110, 200)).toBe(-1);
	for (const [x, y, time] of [
		[50, 100, 200],
		[0, 180, 200],
		[0, 110, 701],
		[0, 110, -1],
	])
		expect(gestureResult(start, x!, y!, time!)).toBeUndefined();
	expect(
		gestureResult({ ...start, cancelled: true }, 0, 100, 200),
	).toBeUndefined();
});
it("locks out horizontal navigation after established vertical intent", () => {
	const vertical = gestureMove(start, 105, 130);
	expect(
		gestureResult(gestureMove(vertical, 0, 130), 0, 130, 300),
	).toBeUndefined();
});
it("exposes only deliberate horizontal progress and keeps the chosen axis locked", () => {
	expect(gestureMove(start, 110, 105).horizontal).toBe(false);
	expect(gestureMove(start, 130, 120).horizontal).toBe(false);
	const horizontal = gestureMove(start, 130, 105);
	expect(horizontal.horizontal).toBe(true);
	expect(gestureMove(horizontal, 130, 200).vertical).toBe(false);
	const vertical = gestureMove(start, 105, 130);
	expect(gestureMove(vertical, 200, 130).horizontal).toBe(false);
});
