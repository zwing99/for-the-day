/** Invented text in authenticated Crossway HTML structures; no Scripture. */
export function crosswayFixture(count = 3) {
	const base = 19023000;
	const lines = Array.from(
		{ length: count },
		(_, i) =>
			`<span class="line${i % 2 ? " indent" : ""}"><b class="verse-num" id="v${base + i + 1}-1">${i + 1} </b><a class="va" rel="v${base + i + 1}" alt="esv_06"></a>Amber &amp; copper ${i + 1}.<span class="divine-name">BOATS</span><br /></span>`,
	).join("\n");
	return {
		canonical: "Psalm 23",
		parsed: [[base + 1, base + count]],
		passage_meta: [
			{
				chapter_start: [base + 1, base + count],
				chapter_end: [base + 1, base + count],
			},
		],
		passages: [
			`<h3><a class="va" rel="v${base + 1}"></a>Invented heading</h3>\n<h4 class="psalm-title">Invented title</h4>\n<p class="block-indent"><span class="begin-line-group"></span>${lines}<span class="end-line-group"></span></p>\n<p class="copyright">Invented copyright &amp; notice</p>`,
		],
	};
}
