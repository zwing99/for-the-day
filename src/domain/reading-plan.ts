export type Book = "PSA" | "PRO";
export interface Passage {
	book: Book;
	chapter: number;
}

export function validateDay(day: number): void {
	if (!Number.isInteger(day) || day < 1 || day > 31)
		throw new RangeError("Reading day must be an integer from 1 through 31.");
}

export function readingPlan(day: number): Passage[] {
	validateDay(day);
	const psalms =
		day === 31 ? [119] : [day, day + 30, day + 60, day + 90, day + 120];
	return [
		...psalms.map((chapter): Passage => ({ book: "PSA", chapter })),
		{ book: "PRO", chapter: day },
	];
}

export function currentLocalDay(
	clock: () => Date = () => new Date(),
	timeZone?: string,
): number {
	const now = clock();
	if (!Number.isFinite(now.getTime()))
		throw new RangeError("Invalid clock value.");
	if (timeZone === undefined) return now.getDate();
	const part = new Intl.DateTimeFormat("en-US", { timeZone, day: "numeric" })
		.formatToParts(now)
		.find((part) => part.type === "day");
	if (!part) throw new RangeError("Unable to resolve local day.");
	return Number(part.value);
}

export function eligibleReadingDay(
	selectedDay: number,
	today: number,
): boolean {
	validateDay(selectedDay);
	validateDay(today);
	const gap = Math.abs(selectedDay - today);
	return Math.min(gap, 31 - gap) <= 5;
}

export function esvCacheEligible(
	passage: Passage,
	selectedDay: number,
	clock: () => Date,
	timeZone: string,
): boolean {
	return (
		eligibleReadingDay(selectedDay, currentLocalDay(clock, timeZone)) &&
		readingPlan(selectedDay).some(
			(entry) =>
				entry.book === passage.book && entry.chapter === passage.chapter,
		)
	);
}
