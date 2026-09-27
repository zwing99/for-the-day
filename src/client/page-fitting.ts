export interface ContentSize {
	width: number;
	height: number;
}

/** Return the largest scale in [0, 1] whose measured content fits both axes. */
export function minimumFittingScale(
	measure: (scale: number) => ContentSize,
	available: ContentSize,
): number {
	const fits = (size: ContentSize) =>
		size.width <= available.width && size.height <= available.height;
	if (fits(measure(1))) return 1;
	let low = 0;
	let high = 1;
	for (let iteration = 0; iteration < 18; iteration++) {
		const middle = (low + high) / 2;
		if (fits(measure(middle))) low = middle;
		else high = middle;
	}
	const accepted = Math.floor(low * 10000) / 10000;
	// DOM measurements apply trial typography. Leave the accepted value applied,
	// including when React's stored scale is unchanged and no render follows.
	measure(accepted);
	return accepted;
}
