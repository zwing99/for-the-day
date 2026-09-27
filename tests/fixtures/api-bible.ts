const run = (text: string, verseId?: string, verseOrgIds?: string[]) => ({
	type: "text",
	text,
	attrs: {
		...(verseId ? { verseId } : {}),
		...(verseOrgIds ? { verseOrgIds } : {}),
	},
});
const tag = (name: string, style: string, items: unknown[], attrs = {}) => ({
	type: "tag",
	name,
	attrs: { style, ...attrs },
	items,
});
export function apiBibleFixture() {
	return {
		data: {
			id: "PSA.23",
			bookId: "PSA",
			number: "23",
			bibleId: "test-csb",
			reference: "Test 23",
			copyright: "Invented test notice",
			content: [
				tag("para", "d", [run("Invented title")]),
				tag("para", "s1", [run("First heading")]),
				tag("para", "p", [
					tag("verse", "v", [run("1a")], { number: "1a", sid: "PSA 23:1a" }),
					run("  Amber ", "PSA.23.1a", ["PSA.23.2a"]),
					tag("char", "nd", [run("BOATS", "PSA.23.1a")]),
					run(" sail. ", "PSA.23.1a"),
				]),
				tag("para", "q1", [
					tag("verse", "v", [run("2")], { number: "2", sid: "PSA 23:2" }),
					run("Blue kites\u00a0rise,", "PSA.23.2", ["PSA.23.3"]),
				]),
				tag("para", "q2", [run("\tand drift. ", "PSA.23.2", ["PSA.23.3"])]),
				tag("future-node", "future-style", [
					run("Copper wheels turn!", "PSA.23.3-4", ["PSA.23.4", "PSA.23.5"]),
				]),
			],
		},
		meta: { fumsToken: "invented-token", retained: { mode: "test" } },
	};
}

/** Invented text in structures observed in authenticated CSB responses. */
export function observedCsbFixture() {
	const fixture = apiBibleFixture();
	const span = (items: unknown[]) =>
		tag("verse-span", "", items, {
			class: "verse-span",
			verseId: "PSA.23.1",
			verseOrgIds: ["PSA.23.2"],
		});
	fixture.data.content = [
		tag("para", "s2", [
			tag("char", "qac", [run("Invented division")]),
			run(" "),
			tag("char", "tl", [run("Invented title")]),
		]),
		tag("para", "d", [run("Invented superscription")]),
		tag("para", "q1", [
			span([
				tag("verse", "v", [run("1")], { number: "1", sid: "PSA 23:1" }),
				run("Amber ", "PSA.23.1", ["PSA.23.2"]),
				tag("char", "nd", [span([run("BOATS", "PSA.23.1", ["PSA.23.2"])])]),
			]),
		]),
		tag(
			"para",
			"q",
			[
				span([
					run(" sail ", "PSA.23.1", ["PSA.23.2"]),
					tag("char", "sup", [span([run("x", "PSA.23.1", ["PSA.23.2"])])]),
					tag("char", "qs", [
						span([run(" onward.", "PSA.23.1", ["PSA.23.2"])]),
					]),
				]),
			],
			{ vid: "PSA 23:1" },
		),
		tag("para", "b", []),
	];
	return fixture;
}
