# Packing verification

## Offline baseline

Captured before replacing estimated packing on 2026-09-27. `mise run cache:import-samples` imported zero additional responses; existing raw cache entries were reused. The audit used the actual ReadingSurface and shared semantic renderer, with provider access disabled and browser API/external requests blocked. Raw geometry and references are ignored under `.local/packing-audit/baseline.json`.

Emulated portrait viewport: 390 × 844 CSS px. This is a comparison geometry, not a measured iPhone 17 Pro viewport. Coverage: 13 cached CSB chapters out of 181; 168 missing. Available references: Psalms 3, 17, 23, 27, 57, 60, 87, 117, 119, 141, 147; Proverbs 7, 30. No full-corpus acceptance is claimed. Upstream requests: zero.

| Density | Pages | Singletons | Mean occupied height | Maximum chapter audit time |
| --- | ---: | ---: | ---: | ---: |
| Spacious | 341 | 341 | 17.3% | 930 ms |
| Balanced | 172 | 45 | 34.3% | 783 ms |
| Compact | 105 | 8 | 56.2% | 735 ms |

The baseline candidate check found 36 Balanced and two Compact singletons whose composed addition fit the geometric target. These raw counts do not yet distinguish deliberate literary boundaries. Timings include the audit's 400 ms settlement wait and candidate rendering and are not reader cold/warm timings.

## Physical device evidence

No physical iPhone 17 Pro is connected or available to this session. Actual device viewport, safe areas, iOS version, Safari expanded/collapsed chrome, standalone mode and pinch/text zoom have not been measured. Desktop emulation does not replace those checks.

## Implementation checks in progress

Typechecking passed. Domain tests: 89 passed. Client tests: 116 passed. `mise run check`: 262 tests passed, including lint and formatting. Browser acceptance and final corpus comparisons are still in progress; remaining task checkboxes remain open.

## Current measured prototype

Same 13-chapter cached portrait audit: Balanced 94 pages (five singletons, mean occupied height 62.6%); Compact 85 pages (two singletons, mean occupied height 69.2%). Both densities have zero avoidable singletons after checking deliberate boundaries. Both remaining Compact singletons precede a literary boundary. No pages were shrunk in this portrait audit. This prototype still requires the stanza-preference decision and the remaining settlement/measurement acceptance tests.

Chromium and WebKit existing regression runners each passed 20 responsive route/menu cases and failure recovery without provider requests. Production build passed. Domain tests now total 91 passing tests. The full `mise run verify:verse-fit` stopped at missing Psalm 1 cache data and made no upstream requests; it is not a full-corpus pass.

## Natural-group policy

When at least two complete units already occupy a page, keep the next paragraph or stanza whole on a fresh page if it fits there, its first verse fits on the current page, and the whole group does not. A one-unit page continues to grow whenever the next compatible unit fits. This resolves the natural-break preference while preserving the no-avoidable-singleton rule.

## Pinned WEBU full-corpus packing

The offline candidate audit used the pinned static WEBU corpus (all 181 Psalms/Proverbs chapters), the actual ReadingSurface and shared semantic renderer, at 390 × 844 CSS px for all densities. It blocked every external/API request. Raw references and geometry are ignored in `.local/packing-audit/webu-current.json`.

| Density | Chapters | Pages | Singletons | Avoidable singletons | Mean occupied height | Overflow | Group shrink |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Balanced | 181 | 1,179 | 95 | 0 | 64.7% | 0 | 0 |
| Compact | 181 | 991 | 76 | 0 | 76.9% | 0 | 0 |

Compact used fewer or equal pages than Balanced in each chapter. The remaining singletons stop at chapter end or a deliberate literary boundary, or their next complete compatible unit does not fit. The longest measured audit chapter completed in 1.72 seconds, including the renderer's settlement wait and per-page checks. These timings are full chapter/density audit timings, not just packing computation.

The existing CSB baseline is compared only over its 13 cached chapters (CSB 94 Balanced / 85 Compact vs. baseline 172 / 105). No claim is made about the other 168 CSB chapters. The bounded five-chapter CSB regression matrix passed 1,260 Chromium/WebKit cases from cache; the full CSB scan correctly stopped at missing Psalm 1 data.

A direct candidate/visible-renderer comparison on WEBU Psalm 23 matched at 560 × 362 CSS px with both using 20px type. The measurement candidate host is `inert` and `aria-hidden`; no focus entered it. The full audit harness now repeats that comparison for the first visible card in each chapter and density, including source headings, verse labels, poetry indentation, and selected font size.

Playwright MCP smoke on Psalm 23 at 320 × 568, 390 × 844, 844 × 390, and 820 × 1180 CSS px confirmed the first rendered page aligned with the measured reading surface; long Psalm 119 at day 29 retained verse 1 as its active anchor. Scroll produced a scroll event and settled with the page aligned. Long chapter Balanced timing was 1,148ms cold and 868ms on a repeated pass; Compact was 835ms. This includes 400ms deliberate settlement in the audit harness. Physical touch hardware, Safari chrome, and pinch zoom remain unavailable; the browser scroll smoke is not physical touch evidence.

`mise run check` passed 265 unit/component tests with typechecking, lint, and formatting. Domain tests after natural-group policy: 92 passed; client tests: 116 passed. Chromium and WebKit responsive suites each passed 20 route/menu cases and recovery after the measured policy. Production build passed. The cached CSB verse-fit command reported the missing cache and made no upstream requests; its five-case matrix passed separately. The physical iPhone 17 Pro matrix remains unavailable.

## Standing CSB fit matrix

`VERSE_FIT_SCOPE=benchmarks mise run verify:verse-fit` passed 1,260 cached cases: the five standing references (Psalm 60:1 with attached headings, 27:4, 17:14, 141:5, Proverbs 30:4), three densities, normal/large/larger type, 16px and 20px root type, seven viewports from 320 × 568 through 1440 × 900, in Chromium and WebKit. The narrowest measured page interior had 280 CSS px of vertical capacity. The most severe page-local fit was Psalm 60:1 with headings at 320 × 568, larger type, 20px root: 502 CSS px available, selected size 35px, effective size 19.2px (scale 0.5487). This is an indivisible heading-attached unit; the grouped-page portrait audit had no shrinking. The full default CSB scan stopped at missing Psalm 1 cache data. Fonts and semantic formatting were unchanged by this packing change, so the full licensed corpus was not downloaded or remeasured.

The final WEBU Chromium/WebKit browser regression also changed density to Balanced, selected larger type, hid verse numbers, dispatched a delayed font-ready event, enlarged root type to 20px, resized 390 × 844 to 400 × 850, and confirmed the addressed Psalm 23:4 anchor, page geometry, and unchanged selected preferences. Existing browser cases checked keyboard, simulated touch, native scrolling, loading, failure and recovery, and exact WEBU text at phone/landscape/tablet widths. The test made zero external Scripture requests.
