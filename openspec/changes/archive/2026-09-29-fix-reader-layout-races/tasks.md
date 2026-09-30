# Tasks

## 1. Make layout completion and recovery reliable

- [x] 1.0 Attempt to reproduce the reported blank/flash failure before fixing it using temporary localhost fault injection: force zero-sized measurements, delay fitting/readiness completion, and trigger resize bursts during scrolling and prepared handoff. Use mocked or cached CSB Psalm 29; capture screenshots and a timestamped trace of surface/card bounds, scroll position, computed visibility, passage identity, and readiness transitions. Confirm whether Scripture actually disappears and which injected sequence causes it, then repeat the identical sequence after the fix as a regression check. Remove temporary diagnostics and record negative results honestly: reproducing an injected blank demonstrates that failure path, but does not establish that physical Android devices encounter the same cause.
- [x] 1.1 Add deterministic reading-surface regressions for resize between readiness frames, rapid font/density revisions, navigation/unmount with pending work, and unchanged-budget remeasurement; record which sequences fail before implementation and verify assertions cover current position, readiness, focus, and progress.
- [x] 1.2 Add passage/revision ownership to pending measurement, fitting, and restoration completion with cancellation; run the focused reading-surface tests and verify obsolete work cannot commit while current work still completes once.
- [x] 1.3 Implement bounded zero-geometry recovery, visible retry fallback when necessary, and recovery on visibility return; add tests for automatic transient recovery without an extra resize, two-second exhaustion, retry, cancellation, and resumption of position tracking. Document the recovery lifecycle beside the implementation and verify no retry survives unmount.

## 2. Preserve reading intent during resize

- [x] 2.1 Separate active vertical input/settlement from restoration, update the pending logical anchor as the reader moves, and defer resize-driven scroll writes until settlement; add focused touch, momentum, wheel, and explicit-navigation interruption tests proving no stale jump and final alignment within two CSS pixels.
- [x] 2.2 Exercise resize bursts during vertical scrolling in localhost Playwright MCP using local or mocked chapters; verify content remains visible, the resulting logical page survives, and saved progress agrees after settlement. Record actual geometry and outcomes in this change's verification notes.

## 3. Preserve visible passage handoff

- [x] 3.1 Centralize active/preview/fallback visibility ownership and gate completion by destination and presentation revision; extend adjacent-reader tests for preview invalidation during commitment, delayed measurement, obsolete readiness, and Back/Forward interruption. Verify at least one appropriate presentation remains visible with one history commit and no duplicate focus, progress, or display reporting.
- [x] 3.2 Verify loading and exhausted-layout retry are accessible and restore the destination's saved page without an introduction flash; exercise retry and reduced-motion handoff in Playwright MCP and record the outcomes, including any coordination needed with the trackpad-bounce change.

## 4. Integrated acceptance

- [x] 4.1 Run localhost Playwright MCP checks in mobile Chromium emulation, desktop Chromium, and available WebKit across initial load, reload, browser and standalone emulation, resize/font changes, short/long passages, touch/wheel/keyboard navigation, selection, zoom, and menus; sample visibility through handoff and record unavailable physical Android checks without claiming the device bug is resolved.
- [x] 4.2 Verify complete one-screen fit using cached CSB Psalm 60:1, 27:4, 17:14, 141:5 and Proverbs 30:4 across all densities, supported small portrait/short landscape/tablet viewports, larger type, and zoom; record available space, effective type size, and preserved formatting. Use cache-only verse-fit verification and report missing samples without initiating a live corpus scan.
- [x] 4.3 Run mise typecheck, lint, format:check, test, and build tasks plus relevant browser verification; record results and limitations in verification notes, confirm changes remain scoped to the lifecycle fixes, and validate the OpenSpec change.
