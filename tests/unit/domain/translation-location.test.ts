import { expect, it } from "vitest";
import { mapTranslationLocation } from "../../../src/domain/translation-location.js";
import { semanticFixture } from "../../fixtures/semantic-chapter.js";

it("maps organizational sets, ranges and partial identities independently of labels", () => {
	const a = semanticFixture(),
		b = semanticFixture();
	a.verses[1]!.orgIds = ["PSA.23.8-10"];
	b.verses[2]!.orgIds = ["PSA.23.9a"];
	expect(mapTranslationLocation(a, a.verses[1]!, b)).toMatchObject({
		verse: { key: "c" },
		approximate: false,
	});
	a.verses[1]!.orgIds = ["PSA.23.1b"];
	expect(mapTranslationLocation(a, a.verses[1]!, b).approximate).toBe(true);
	a.verses[1]!.orgIds = ["PSA.23.1"];
	expect(mapTranslationLocation(a, a.verses[1]!, b)).toMatchObject({
		verse: { key: "a" },
		approximate: false,
	});
});
it("bridges only inspected anchors and configured editions, including superscription offsets", () => {
	const a = semanticFixture(),
		b = semanticFixture();
	a.identity.chapter = b.identity.chapter = 60;
	a.identity.translation = "ESV";
	a.identity.provider = "crossway";
	a.verses[0]!.providerIds = ["19060001"];
	a.verses[0]!.orgIds = [];
	b.identity.translation = "NIV";
	b.identity.providerBibleId = "78a9f6124f344018-01";
	b.verses[1]!.orgIds = ["PSA.60.3"];
	expect(mapTranslationLocation(a, a.verses[0]!, b)).toMatchObject({
		verse: { key: "b" },
		approximate: false,
	});
	expect(mapTranslationLocation(b, b.verses[1]!, a)).toMatchObject({
		verse: { key: "a" },
		approximate: false,
	});
	b.identity.providerBibleId = "another-edition";
	expect(mapTranslationLocation(a, a.verses[0]!, b).approximate).toBe(true);
});
it("uses verified nearest identity before same label, then approximate same label and nearest available order", () => {
	const a = semanticFixture(),
		b = semanticFixture();
	a.verses[1]!.orgIds = ["PSA.23.5"];
	expect(mapTranslationLocation(a, a.verses[1]!, b)).toMatchObject({
		verse: { key: "c" },
		approximate: true,
	});
	a.verses[1]!.orgIds = [];
	expect(mapTranslationLocation(a, a.verses[1]!, b)).toMatchObject({
		verse: { key: "b" },
		approximate: true,
	});
	a.verses[1]!.displayLabel = "9";
	expect(mapTranslationLocation(a, a.verses[1]!, b)).toMatchObject({
		verse: { key: "d" },
		approximate: true,
	});
});

it("does not use a sparse first-verse Crossway bridge to reset an unmapped verse", () => {
	for (const [translation, edition] of [
		["NIV", "78a9f6124f344018-01"],
		["NLT", "d6e14a625393b4da-01"],
	] as const) {
		const source = semanticFixture(),
			target = semanticFixture();
		source.identity.translation = translation;
		source.identity.providerBibleId = edition;
		target.identity.translation = "ESV";
		target.identity.provider = "crossway";
		target.verses[0]!.providerIds = ["19023001"];
		target.verses[0]!.orgIds = [];
		target.verses[1]!.providerIds = ["19023002"];
		target.verses[1]!.orgIds = [];
		expect(
			mapTranslationLocation(source, source.verses[1]!, target),
		).toMatchObject({
			verse: { key: "b", displayLabel: "2" },
			approximate: true,
		});
		expect(
			mapTranslationLocation(target, target.verses[1]!, source),
		).toMatchObject({
			verse: { key: "b", displayLabel: "2" },
			approximate: true,
		});
	}
});
