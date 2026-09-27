# Verification notes

## Before implementation — 2026-09-27

- `mise run test:browser` passed in Chromium and WebKit: 20 responsive route/menu cases per engine and failure recovery, with invented responses and external requests blocked. This existing check does not yet cover the full baseline matrix or the additional geometry assertions required by tasks 1.1–1.2.
- `mise run cache:import-samples` completed offline and imported zero responses.
- `direnv exec . mise run verify:verse-fit` stopped at `PSA.1`: no usable cached response. It made no upstream request. Corpus geometry and benchmark available space/effective sizes have not been verified in this session.
- Implementation initially paused before CSS edits because cached fit acceptance was unavailable. At that checkpoint, no task was marked complete based on those partial checks.
- Physical iPhone Safari and standalone production PWA acceptance have not been exercised.

The unrelated untracked `add-static-webu-edition` change was left untouched.

## Resumed baseline capture

- User approved at most 20 API calls. Benchmark cache refresh used four successful requests and one failed sandboxed attempt (conservatively counted as five attempts). No retries or provider requests occur during layout verification. The raw cache survives normalizer revisions and is retained for 30 days.
- Initial offline inventory: 9/181 chapters usable, 172 missing. Four benchmark chapters were refreshed; the fifth was already cached. Full-corpus remeasurement remains unavailable within the approved request budget.
- Invented baselines: `.local/css-cleanup/before/`, 252 cases (Chromium/WebKit × seven viewports × three densities × three font preferences × light/dark). Each captures reader, intro, end and menu. Normal uses short content; large/larger use repeated invented prose/poetry and headings. Light uses normal motion; dark uses reduced motion. Viewports: 320×568, 390×844, 430×932, 844×390, 820×1180, 507×768, 1440×900.
- Baseline geometry: `before/geometry.json`; state/first-render geometry: `before/states.json`. Loading/failure screenshots cover the seven viewports in both engines. No real Scripture or provider metadata is stored in these screenshots.
- At 320×568 the baseline surface is 320×524 at y=44; each page is 524px high. Complete matrix dimensions and typography are in the ignored JSON reports.
- Expanded `mise run test:browser` passed in Chromium and WebKit: page/surface equality, complete content fit, snap alignment within 2px, logical verse retention on resize, menu focus restoration and 44px targets.
- Delayed-font, enlarged-root (20px), rotation and expanded-attribution checks passed in both engines.
- Playwright shutdown stalled under Bun after Chromium. The mise browser/fit tasks now use Bun to build their TypeScript runners and the existing pinned Node runtime to execute Playwright. No dependency was added.

## Implementation and acceptance scope

- Baseline cached CSB fit report: `.local/css-cleanup/benchmarks-before.json`, 810 completed cases before CSS edits (all seven Chromium viewports; 320×568 and 390×844 in WebKit). Each viewport covers three densities, three font preferences and 16/20px root sizes for all five benchmark chapters. The repeated extended baseline run was stopped after the user requested prioritizing implementation. The full after matrix remains the acceptance check; uncovered before cells are explicitly unverified comparisons.
- At 320×568, each benchmark chapter has a 524px surface and 507px verse content budget. Default Spacious effective verse size was 17.4368px for each of the five benchmark chapters. The report contains per-page effective sizes, fitting scales, width and available space throughout the matrix.
- Extracted the seven planned ownership files and retained the shared `style.css` imports. Consolidated duplicated page, intro and semantic paragraph rules; scoped document defaults to their reader consumers. No provider formatting, gesture behavior or last-seen preview functionality changed.
- Documented theme/measurement producers and consumers. Removed redundant selected-font fallback chains while retaining the standalone card-renderer default and browser compatibility fallbacks. Updated the unit assertion to the same large-preference token with its redundant fallback removed.
- Normal typography uses algebraically derived min/max size/height endpoints. Engines lacking typed length division keep the equivalent original expression under the compatibility path. This preserves the original curve at enlarged root sizes.
- Retained and explained the legacy startup page-height estimate under the design's explicit equivalence exception: percentage height would require a definite wrapper height and would alter pre-measurement behavior; the standalone corpus harness has no measuring parent. No new geometry owner was introduced.
- Real iPhone Safari toolbar, pinch zoom and installed standalone PWA checks are unavailable in this environment. Device/iOS/mode: unavailable. Physical-device acceptance remains unverified; desktop WebKit is not treated as device certification.

## Zoom limitation reproduced with original and refactored styles

- Playwright MCP at 390×844, Compact density, 20px root text and CSS `zoom: 1.2` produced `--page-font-scale: 0` and a 0px verse font. The identical probe with the saved original stylesheet reproduced the same result. CSS zoom causes measured bounding rectangles and client-space fit budgets to use different scales. This is an existing fitting issue, not an equivalence regression; CSS-zoom legibility acceptance is not claimed. Correcting the fitter would change behavior and belongs in a separate planning decision.
- Native pinch zoom and physical iPhone behavior are not certified by this CSS-zoom probe.

## Final automated results

- `mise run check`: typechecking, lint, formatting and all 233 unit tests passed. `mise run build` passed for frontend and Node API. `mise run test:browser` passed in both engines after consolidation.
- Final invented capture: `.local/css-cleanup/after/`, 252 presentation cases plus state screenshots. 1,038/1,040 matched screenshots are byte-identical. The remaining two images (the same Chromium 820×1180 Compact/large/dark end and menu state) differ by exactly two pixels at x=129, y=545–546; manual inspection confirms identical content/layout.
- All selected/effective typography and page/surface/menu geometry match, except one sampled WebKit 507×768 intro content height (272px vs 280px) despite byte-identical screenshots. Same-page recheck results are recorded separately below. Raw custom-property formula strings differ intentionally; comparisons use effective font sizes, fitting scales and geometry.
- Playwright MCP exercised menu/focus, scrolling, densities, dark appearance and a horizontal touch gesture to Psalm 53 using intercepted invented responses. The fixture's retained verse identity did not supply a valid location for that next chapter, so the resulting recovery state is a fixture limitation; no new passage/preview implementation was added.
- No new dependency, storage, provider, API, deployment or persistent-preference behavior was introduced. Existing specs and unrelated change artifacts remain untouched.

- Same-page original/refactor recheck at 507×768 passed in Chromium and WebKit: intro content height 280px at a 16px root and 342.453125px at a 20px root, with all effective geometry equal. Report: `.local/css-cleanup/recheck.json`. The earlier sampled difference is transient rather than a reproducible CSS regression.

- Chromium page-scale (pinch emulation) at 1.5× retained a 20px computed verse font. This is distinct from the failing CSS-zoom probe and does not certify physical Safari pinch behavior.

- Final cached CSB acceptance: `VERSE_FIT_SCOPE=benchmarks VERSE_FIT_REPORT=.local/css-cleanup/benchmarks-after.json mise run verify:verse-fit` passed **1260 cases** across Chromium/WebKit, seven viewports, all three densities/font preferences, 16/20px roots and the five established benchmarks. No upstream requests occurred. Every chapter page fit completely; effective verse sizes range from 16px to 35px, with no zero-size pages.
- All 810 cases with completed before evidence match exactly in effective typography, fitting scales and geometry. The five remaining WebKit before viewport matrices were not captured; their after-fit results are verified, and the complete invented screenshot matrix plus same-page original/refactor recheck supply complementary equivalence evidence.
- Final `mise run check`, `mise run build`, `mise run test:browser`, formatting, diff whitespace check and OpenSpec validation passed. Full-corpus maxima were not remeasured because source responses are missing and the typography curve/provider formatting remain mathematically unchanged. No additional API calls were used beyond the four successful refreshes and one failed attempt already recorded.
- Remaining product limitation: existing CSS-zoom fitting failure. Remaining verification limitations: physical iPhone/Safari/standalone acceptance and full-corpus maxima remeasurement. These are not claimed as passing.
