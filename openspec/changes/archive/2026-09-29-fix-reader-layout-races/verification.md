# Verification notes

## Layout fault injection

The localhost reader used the cached CSB Psalm 29 response. Before implementation, a temporary bad source line returned from every measurement attempt. Readiness stayed false while Scripture remained in the DOM. A separate zero-height surface injection collapsed the reading region to 0 CSS px; the verse remained attached below the visible region. Removing the injected style allowed the existing `ResizeObserver` to recover. The temporary source line and DOM instrumentation were removed after the comparison.

After the fix, at a 390 × 844 viewport, a temporary `getBoundingClientRect()` override returned zero width for verse cards while wheel input moved the page and three resize events arrived 45 ms apart. `scrollTop` reached 1476 px and the logical anchor changed to `PSA.29.3`; the surface and Scripture remained visible. After restoring measurements, layout readiness returned without another resize and the same anchor remained active. The readiness frames were delayed by 120 ms during this trace.

After a follow-up resize burst, the active verse, URL, and saved position all agreed on `PSA.29.3` (`/29/psalm/29/3?translation=CSB&org=PSA.29.3`).

Screenshots are kept in the ignored `.playwright-mcp/` directory:

- Before: `layout-race-before-fix-source-bad-line.png` and `reader-layout-before-fix-zero-geometry.png`.
- After recovery: `layout-race-after-fix-resize-burst.png` and `layout-race-after-fix-recovered.png`.
- Handoff: `layout-race-after-fix-handoff-ready.png` and `layout-race-after-fix-handoff-invalidated.png`.
- Exhaustion and retry: `layout-race-after-fix-retry-visible.png`.

With reduced motion enabled, a prepared destination owned the presentation while ready. A resize invalidated that preview; ownership returned to the active destination immediately, its Scripture remained present and visible, and the labeled preview placeholder remained displayed. When zero surface height persisted beyond two seconds, the active reader showed the passage-labeled status and “Retry page layout” control. Restoring dimensions and activating retry removed the fallback and retained the current page.

The injected failures demonstrate lifecycle paths only; they do not establish that physical Android devices encounter the same cause. No physical Android device was available for this localhost run.

## Deterministic regressions

The reading-surface and adjacent-reader tests pass with current code. Running those same tests temporarily against the original `HEAD` reading surface produced three failures: transient zero-geometry recovery, exhausted recovery and retry, and preserving the moved logical page during a resize while touch input was active. The original source was restored immediately afterward.

The tests also cover latest-destination readiness ownership, unmount cancellation, and side-effect counts through preview invalidation. Focused client suite: 147 tests passed after final integration changes.

## Integrated acceptance

`mise run test:browser` passed in Chromium and WebKit. Each engine passed 28 mocked route/menu and failure-recovery cases with no provider requests. Coverage includes initial load and reload, short and long WEBU chapters, responsive viewport and font changes, keyboard and touch navigation, wheel scrolling, loading/retry, and reduced-motion handoff. Chromium additionally retained a live Scripture text selection through a zoom-like root-size change and resize, and the iOS `navigator.standalone` path correctly suppressed the browser install invitation. Standalone CSS media-query behavior and native browser pinch zoom were not directly emulated. No physical Android device was available; this verification does not establish the reported Android failure's cause.

The cache-only `verify:verse-fit` benchmark passed 1,800 cases with no upstream requests. It covered Psalm 60:1, Psalm 27:4, Psalm 17:14, Psalm 141:5, and Proverbs 30:4 in Chromium and WebKit; 320×568, 390×844, 430×932, 844×390, 820×1180, 507×768, and 1440×900 browser viewports; and 320×568, 390×844, and 844×390 iPhone touch emulation. Every case ran Spacious, Balanced, and Compact density, normal/large/larger preference, and 16/20px root size. Geometry assertions found no page content overflowing its available width or height. Available page height ranged from 207 to 1,026 CSS px; the measured reader surface ranged from 267.95 to 1,074.97 CSS px. Scripture whitespace remained `pre-wrap` where supplied and semantic indentation remained present.

The smallest measured effective verse type was 8.01 CSS px (a page-local scale of 0.4785) for the largest text/root-size combination in the smallest portrait emulation; the selected preference remains saved. At default normal size and 16px root size, the regression set's smallest measured effective verse type was 14 CSS px. The extreme stress-size reduction fits geometrically but is a legibility concern for a separate typography follow-up; no licensed text was copied into this report. Full-corpus maxima were not remeasured, as required by the cache-only scope.

Final checks: `mise run check` passed (typechecking, lint, format check, and 315 unit tests); `mise run build` passed for browser assets and the Node-compatible API; `mise run test:browser` passed in Chromium and WebKit; `openspec validate fix-reader-layout-races` passed. Changes are limited to reader measurement/restoration, handoff visibility, matching regressions, and this change's browser verification. The overlapping trackpad change's gesture thresholds and momentum classification were not changed.
