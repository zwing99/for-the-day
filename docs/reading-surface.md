# Native reading surface

## Adaptive semantic packing

The chapter tree owns text; cards contain ordered leaf references and complete verse identities. The renderer reconstructs their original literary parents, so paragraph continuations retain their association and poetry retains indentation and line breaks. Leading headings attach to the following complete verse. Merged spans stay together.

Packing estimates line costs from text length, literary blocks, indentation, breaks, and heading space. Balanced targets 55% of estimated usable lines; Compact targets 85%. These fractions are refinement knobs, not verse counts. Budgets use the actual bounded column, current type and line height, and page padding. Width and height are quantized in four-column/four-line steps; resize measurement waits 120ms. Spacious remains one complete verse or merged span. Measured overflowing groups split at complete verse boundaries before indivisible content receives local fitting. Unknown literary parents remain atomic even when they contain recognizable paragraphs; measured repair preserves that status.

Playwright MCP verification for block 7.x covered exact invented-text conservation and verse-8 retention through density, font-size, rotation, and Split View changes. A 30-unit fixture used 10 Balanced/5 Compact pages on 390×844, versus 3/3 on 820×1180; Spacious used 30 at both sizes. Larger type reduced capacity without changing the anchor. A nested unknown group stayed on one page in Balanced and Compact, fitting 672.89px of content into 673px available space. Chromium magnification reached 2× with `pan-y pinch-zoom` and its anchor retained.

The five real CSB benchmark references in `AGENTS.md` passed 90 default-type cases across all densities at 320×568, 390×844, 844×390, 768×1024, 1180×820, and 375×1024. Measured usable surface heights were respectively 524, 738, 346, 918, 714, and 918px; minimum effective default sizes were 17.44, 20, 16, 20, 20, and 20px, with no local reduction required. Another 60 large/larger-type cases on 320×568 and 844×390 passed, with minimum effective sizes 19.27/19.63px. Fifteen 200%-text cases at 320×568 passed with 476–490px usable surface height and minimum effective size 18.43px. All checked pages fit completely and aligned without body overflow. Fonts and semantic rendering were unchanged; the existing full-corpus measurements remain applicable. WebKit and physical iPhone/iPad Safari were not exercised in this verification.

## Horizontal passage transitions

Deliberate touch and horizontal trackpad gestures lock their axis after 12px; horizontal intent requires 1.75 times the vertical displacement. The outgoing surface follows the drag and reveals an inert, aria-hidden, passage-labeled loading panel. Previews do not fetch or persist neighboring Scripture. Release requires at least 56px, horizontal dominance, and no more than 700ms. Completion and return take 180ms; reduced motion removes translation and commits immediately. Trackpad release uses a 140ms quiet period and suppresses continuing momentum until another 180ms input gap.

Only completion invokes the existing coordinator: it flushes the outgoing reference, pushes history once, restores the destination's independent saved reference, and activates normal fetch, focus, and reporting. Keyboard left/right use completion motion; menu and passage selectors retain direct bounded navigation. Short, cancelled, and boundary gestures return. Resize, selection, menu opening, preference changes, and new navigation clear pending motion. Vertical scrolling and pinch zoom retain browser behavior.

Chromium verification on 2026-09-26 recorded a 140px drag revealing the neighbor at x=250px, an unchanged URL during drag, an inert/aria-hidden preview, and no body overflow. Trusted short/cancelled touch, menu interruption, and resize returned to x=0 without navigation. Reduced motion showed no transform or preview animation and still navigated. Component tests verify no preview fetch, position write, history push, or reporting call, followed by exactly one committed push. Integrated acceptance covers every density on phones, short landscape, tablets, Split View and desktop; see `openspec/changes/archive/2026-09-26-screen-snapping-passage-transitions/integrated-acceptance.md`. WebKit and physical Safari were unavailable and are not claimed verified.

Viewports up to 600px tall use compact chrome and fixed reading padding to preserve space for enlarged text. Passage context and the named menu remain available; page/passage alternatives remain in the menu. At 200% text on 320×568, the measured real-benchmark minimum effective Scripture size is 18.43px. Native browser magnification remains effective. Fitting applies the final accepted typography after measuring, avoiding line-wrap overflow from a discarded trial size.

Independently adapted from the native overflow/viewport/snap composition reviewed in hn-tok's `StoryFeed.tsx` at commit `08f7548bfbbe258aff0ce3927760e09096cfd9da`. No reference source was copied.

The viewport shell uses `100vh` fallback and `100dvh` sizing; its main element is the single vertical scroll surface. Intro, Scripture, and attribution pages equal its measured usable height. Mandatory native snapping with stop-always aligns complete screens. A scrollend handler and debounced fallback repair a settled boundary without fighting active touch or text selection. Gutters and safe-area padding retain a bounded 38rem column. Page alternatives are available in the reader menu. Complete verse groups reduce before measured local typography fitting; content stays intact with no internal scrollbar.

Location detection uses the aligned page. Explicit and saved verse anchors restore to their containing page; grouped and merged identities stay intact, and the addressed verse remains the logical position until the reader changes pages. Snapping reactivates immediately after restoration. Resize and presentation changes realign the containing page. Native selection and pinch zoom remain available. Arrow Up/Down, Page Up/Down, and menu Previous/Next page move between pages, including attribution, with focus and reduced-motion support. Locations are persisted as canonical reference-only URLs and synchronized with browser history.

## Screen-page verification on 2026-09-26

Chromium wheel and emulated touch releases settled exactly at page boundaries. Intro and expanded attribution fit at 320×568 and 568×320; the end page aligns and never advances passages. Proverbs 30:4 retained its reference through Compact packing, rotation, reload, and mounted Back/Forward. Native browser scaling reached 2× with `pan-y pinch-zoom` retained. Unit checks cover complete text/indentation, containing-page restoration, immediate snap reactivation, focus, reduced motion, stale fetch rejection, saved/explicit precedence, and reporting activation. Physical trackpad/Safari and full accessibility zoom acceptance remain section 4 checks.

## Verification on 2026-09-26

The following records the superseded growing-card milestone; it is historical evidence, not acceptance of the screen-page contract above.

- Chromium through the standalone Playwright MCP: 390×844, 820×1180, 1180×820, 430×820 and 320×568. One viewport-height scroll surface, minimum viewport-height cards, no horizontal/body overflow.
- Invented long fixture at 320×568 with 24px root text: a 27,905px card remained scrollable in the same surface, with no nested scroller or horizontal overflow; the active verse stayed correct despite a tiny card visibility fraction.
- Begin opens verse 1; repeated Next reaches verses 2, 3 and 4 with destination focus. Reduced-motion navigation exercised. Browser verification caught and corrected control snap/focus issues.
- Unit/component tests cover marker selection through tall content and destination focus/reduced motion. Existing exact-text conservation tests remain passing.
- Keyboard Enter on Next card moved focus to Verse 2. Playwright's accessibility tree exposed Verse 1–6 in source order, named Previous/Next card controls, and attribution. Task 5.3 passed these revised checks. Live screen-reader review is not a completion gate for now. Physical Safari/touch verification remains a later explicit gate.

The current reading-first composition and its verification are documented in [reading-first-interface.md](reading-first-interface.md). Earlier control-row checks below describe the temporary implementation before this correction.

## CSB verse-fit corpus scan

Normal Scripture typography adapts to the measured reading height between 16px and 20px at the standard root size. Short landscape uses less page padding and removes passage dots and the redundant brand; navigation remains in the menu with full touch targets. Complete-verse groups reduce before indivisible pages receive a measured local font adjustment. That adjustment preserves the selected preference and provider formatting. The benchmark measurements and effective sizes are recorded in the active change's `verse-fit-research.md`.

Run `mise run verify:verse-fit` when refreshing the Psalms/Proverbs typography benchmarks or after changing the semantic renderer. It requires configured `API_BIBLE_CSB_ID`, the local API (`mise run dev`), and installed Chrome/Chromium. The command reads all 150 Psalms and 31 Proverbs chapters through the ignored 30-day API.Bible response cache with network access disabled, checks edition and passage identity, renders through `ChapterCards`, and reports actual font metrics and reference/geometry winners by height, characters, words, and preserved semantic lines. Missing or expired source responses stop the scan without upstream requests. It keeps chapter content in memory and prints no Scripture, credentials, provider tokens, or upstream error messages. The regular visual regression set remains the five references in `AGENTS.md`.

## Source Serif 4 verification — 2026-09-27

Self-hosted unmodified Source Serif 4 release 4.005R assets and their license are in `public/fonts/source-serif-4/`. CSS exposes `--font-scripture`, `--reading-measure`, `--context-measure`, `--scripture-line-height`, and normal/large/larger size tokens. The normal-size token is defined on `.reading-scroll` so it can use the measured `--reading-height`. Provider indentation remains expressed in em units. Font readiness invalidates fitting even when viewport dimensions do not change. A browser token substitution to Georgia and a 32rem column retained the addressed verse, with no domain change.

The user approved saved-sample and known-worst-case verification in place of a new full-corpus scan for this font change. The 594 cases comprise 396 checks of 22 existing chapters across six viewports/all densities, 108 checks of all five CSB regression chapters plus ESV Psalm 57 across the same matrix, and 90 large/larger/200%-text checks of those benchmarks. Every rendered ordered text leaf matched its local chapter; all cards fit with provider formatting intact. This evidence covers the saved chapters, not unmeasured corpus maxima.

| Viewport | Available surface | Minimum normal effective size | Benchmark fitting |
| --- | --- | --- | --- |
| 320×568 | 524px | 16.50px ESV; 17.44px CSB | ESV Psalm 57 uses 5.38% shrinking; all five CSB benchmarks need none |
| 390×844 | 738px | 20px | No shrinking |
| 844×390 | 346px | 15.64px ESV; 16px CSB | ESV Psalm 57 uses 2.24% shrinking; all five CSB benchmarks need none |
| 768×1024 | 918px | 20px | No shrinking |
| 375×1024 | 918px | 20px | No shrinking |
| 1440×900 | 794px | 20px | No shrinking |

Large/larger choices retained their preferences while indivisible benchmarks fitted locally: minimum effective CSB type was 19.21px in small portrait and 19.62px in short landscape; ESV Psalm 57's minima were 16.50px and 15.64px. At 200% root text on 320×568 the surface was 476px, with minimum CSB 18.60px and ESV 16.47px. Native 2× browser magnification retained the logical verse and `pan-y pinch-zoom`. Both themes were exercised and invented-text screenshots were visually reviewed. Hardware Safari safe areas, dynamic browser chrome, WebKit, and physical iPhone/iPad testing remain block 12 gates.

Three additional 320×568 checks switched CSB Psalm 57:1 to ESV with the approximation notice visible, one per density. The active anchor remained verse 1, all content fit into 470px within a 486px surface, and effective type was 16.47px (0.53% local fitting after adaptive normal sizing).
