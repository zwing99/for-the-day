export interface Gesture {
	x: number;
	y: number;
	started: number;
	vertical: boolean;
	horizontal?: boolean;
	cancelled: boolean;
}
export function gestureMove(gesture: Gesture, x: number, y: number): Gesture {
	const dx = Math.abs(x - gesture.x),
		dy = Math.abs(y - gesture.y);
	if (gesture.vertical || gesture.horizontal || gesture.cancelled)
		return gesture;
	return {
		...gesture,
		vertical: dy >= 12 && dy >= dx,
		horizontal: dx >= 12 && dx >= 1.75 * dy,
	};
}
export function gestureResult(
	gesture: Gesture,
	x: number,
	y: number,
	ended: number,
): -1 | 1 | undefined {
	const dx = x - gesture.x,
		dy = y - gesture.y;
	if (
		gesture.cancelled ||
		gesture.vertical ||
		ended < gesture.started ||
		ended - gesture.started > 700 ||
		Math.abs(dx) < 56 ||
		Math.abs(dx) < 1.75 * Math.abs(dy)
	)
		return undefined;
	return dx < 0 ? 1 : -1;
}
