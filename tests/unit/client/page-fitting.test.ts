import { expect, it } from "vitest";
import { minimumFittingScale } from "../../../src/client/page-fitting.js";

it("returns the largest stable scale that fits both measured dimensions", () => {
	const measure = (scale: number) => ({
		width: 500 * scale,
		height: 900 * scale,
	});
	const available = { width: 300, height: 450 };
	const first = minimumFittingScale(measure, available);
	const second = minimumFittingScale(measure, available);
	expect(first).toBe(second);
	expect(first).toBe(0.5);
	expect(measure(first).width).toBeLessThanOrEqual(available.width);
	expect(measure(first).height).toBeLessThanOrEqual(available.height);
});

it("keeps the selected scale when a page already fits", () => {
	expect(
		minimumFittingScale(() => ({ width: 280, height: 400 }), {
			width: 300,
			height: 500,
		}),
	).toBe(1);
});

it("leaves accepted typography applied after a line-wrap threshold search", () => {
	let applied = 1;
	const measure = (scale: number) => {
		applied = scale;
		return { width: 272, height: scale <= 0.8289 ? 397 : 420 };
	};
	const accepted = minimumFittingScale(measure, { width: 272, height: 397 });
	expect(applied).toBe(accepted);
	expect(measure(applied).height).toBeLessThanOrEqual(397);
});
