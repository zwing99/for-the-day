# CSB verse fit research — 2026-09-26

## Method and coverage

Measured all 150 Psalms and 31 Proverbs chapters returned by the configured localhost CSB provider boundary using the existing faithful `ChapterCards` renderer and stylesheet in Chromium. Reproduce with `direnv exec . mise run verify:verse-fit` (or `mise run verify:verse-fit` when direnv is already loaded); the opt-in task uses the existing local API and Chrome. All 181 requests succeeded. After allowing each React render and configured font to settle, measured 3,376 atomic verse cards and verified their rendered verse identities against `completeVerseUnits` (merged identities stay atomic). Identified references using each rendered card's verse labels, not array indices. The command compares every rendered text fragment with `orderedText`, verifies the configured CSB provider identity, and prints only references and geometry. It keeps Scripture and provider metadata transient and exits with sanitized categories for rate-limit/access failures.

The baseline used Georgia, 20 CSS-pixel Scripture, 1.7 line height, 320px outer card width, 24px side padding, and 32px top/bottom padding. Verse-only measurements temporarily hid supplied headings in the isolated measurement host; full-page measurements included them. Text counts excluded heading text and verse labels. Preserved line counts refer to `.semantic-line` groups, not soft-wrapped browser lines. No Scripture text, provider token, or credentials are recorded here; source stayed transient in browser memory and the existing server cache.

## Worst-case references at 320px

| Criterion | Psalm reference | Measurement | Proverbs reference | Measurement |
| --- | --- | --- | --- | --- |
| Tallest heading-attached page | Psalm 60:1 | 548.06px content; two headings | Proverbs 30:4 | 408px content |
| Tallest verse without headings | Psalm 27:4 | 360px; six poetic lines | Proverbs 30:4 | 408px; seven poetic lines |
| Most characters | Psalm 17:14 | 214 characters; six poetic lines | Proverbs 30:4 | 230 characters |
| Most words | Psalm 141:5 | 38 words; seven poetic lines | Proverbs 30:4 | 48 words |
| Most preserved poetic lines | Psalm 141:5 | Seven lines | Proverbs 30:4 | Seven lines |

These are edition-specific rendered benchmarks, not a claim about all Bible translations. Line wrapping, heading attachment, fonts, and viewport changes can change the winners. Each criterion had a single maximum in this baseline. Default Balanced grouping requires additional fit verification; these measurements concern atomic cards.

## Width sweep and default fit

A second full-corpus sweep measured heading-attached content at five card widths. Psalm 60:1 remained the tallest page: 548.06px at 320px, 476.27px at 390px, 401.47px at 430px, and 364.07px at both 820px and 844px (the bounded reading measure limits width). The 320×740 reader's measured usable surface was 634px, leaving 570px after vertical padding: the 20px atomic default fits with about 22px spare. The larger portrait targets have more capacity. The previous 547.66px result was from an exploratory harness; the checked-in browser task is now the source for the 320px value.

This does not establish fit in short landscape, smaller-height phones, larger text, browser zoom, new fonts, or other editions. A smaller 320×568 target would not accommodate the same 611.66px padded maximum under the existing chrome geometry; adaptive default typography and/or local fitting must be verified there. No lower default font size is asserted as tested. The implementation must calibrate its default size for declared supported portrait heights and record effective fitting sizes elsewhere.

## Standing regression set

## Responsive calibration checkpoint

The live Chromium reader verified all five references without local reduction at 320×568, 320×740, 390×844, and 430×932. Normal typography responds to the actual reading surface height, bounded between 16px and 20px at the standard root size. The selected preference remains unchanged.

| Viewport | Effective default | Available content height | Psalm 60:1 with headings |
| --- | --- | --- | --- |
| 320×568 | 16px | 397px | 380.91px; scale 1 |
| 320×740 | 19.99px | 569px | 547.26px; scale 1 |
| 390×844 | 20px | 673px | 476.27px; scale 1 |
| 430×932 | 20px | 761px | 401.47px; scale 1 |

Short landscape now removes the redundant brand and passage dots, retains the 44px menu target and menu passage alternatives, and uses 8px vertical page padding. At 568×320, the surface is 276px tall and leaves 259px for content. Psalm 60:1 with headings fits at scale 0.9896, approximately 15.83px; its full rendering was visually inspected in Chromium. This resolves the previous 10.28px result without removing Scripture or changing the stored preference.

All five landscape benchmarks fit. The other four use 16px normally; at the larger preference their effective sizes are 23.13px (27:4), 24.50px (17:14), 21.66px (141:5), and 21.77px (Proverbs 30:4). Psalm 60:1 fits at 15.83px for both larger preferences. At 320×568 the larger preferences fit the complete Psalm 60 chapter with a minimum effective size of 16.67px. Local fitting necessarily limits enlargement of its largest indivisible page; native pinch zoom remains available. Integrated zoom/device verification remains in section 4 tasks.

## Standing regression procedure

Always verify Psalm 60:1 with its supplied headings, Psalm 27:4, Psalm 17:14, Psalm 141:5, and Proverbs 30:4. Re-scan the configured corpus after typography/renderer changes or enabling another edition; retain additional winners/ties. Use all densities and preserve exact provider formatting. Geometry acceptance must test full content fit, aligned page settling, heading associations, and readable effective type, not word count alone.
