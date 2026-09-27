# Integrated acceptance — 2026-09-26

All fifteen tasks are complete within this change's available-browser scope. The accepted chrome is unchanged. This checkpoint stops before provider implementation.

## Current screen composition

The viewport shell reserves quiet context/menu and indicators, with the approved compact-height exception. Complete pages use mandatory native settling, verse-boundary regrouping and measured indivisible typography fitting. Independent hn-tok source inspection and commit attribution are documented in the design and reader docs; no source was copied. The earlier growing-card checks are historical and do not establish current acceptance.

## Verification completed this session

Standalone Playwright MCP used isolated Chromium contexts and invented fixtures. Sixty cases covered short and expanded indented poetry, every density, and 320×568, 390×844, 430×932, 568×320, 768×1024, 820×1180, 1180×820, 375×1024, 507×768 and 1440×900. Every case fit its complete page, retained logical verse 2, and had no horizontal document overflow. Reading columns measured 288–560px. Screenshots are ignored `.local/reading-final-<size>-<density>-<kind>.png`; representative phone, landscape, tablet, Split View and desktop images were visually reviewed along with the earlier `.local/ui-before.png`. No exposed primary navigation rows or overlapping chrome were found.

A separate ten-size geometry check confirmed the actual `.reader-context` ends before the reading surface. The first screenshot harness used an obsolete header selector; its false results were harness errors. The subsequent touch harness omitted the chrome field from its output while filtering it; all underlying touch/navigation/attribution assertions were true, and the separate geometry check resolves the chrome assertion.

Thirty-three trusted-touch cases covered eleven sizes (the ten above plus 1024×768) and every density. Partial drag reveals an inert neighbor then returns without URL change; committed drag changes one passage; mounted Back restores the logical anchor to an aligned page. Alignment, no overflow, complete attribution fit and reachable notice links passed throughout.

The reduced-motion Chromium settings check changed appearance, font size, density and verse labels through the dialog, then reloaded. Dark/larger/Compact/hidden-label preferences and verse 2 survived; all literary text before/after reload was identical. Dark reader/sheet screenshots were reviewed. Existing component checks cover the intro setting, presentation re-anchoring and sheet shortcut exclusion. The guarded-storage test now explicitly verifies presentation preferences remain usable in memory when reads/writes throw.

## Reused current-contract evidence

[Archived screen-page acceptance](../archive/2026-09-26-screen-snapping-passage-transitions/integrated-acceptance.md) covers native vertical touch/wheel settling, horizontal wheel, diagonal/cancelled/multi-touch/selection exclusions, keyboard, zoom, resize continuity, sheet focus containment/Escape return, loading/access-denied/retry, reduced motion and accessibility-tree source order. It also records all five real typography benchmarks, every density, larger type and 200% text. No typography or rendering implementation changed this session, so these checks remain applicable.

Hardware safe areas and dynamic Safari chrome remain unverified. WebKit is unavailable locally; physical iPhone/iPad Safari is not connected. These limitations are expressly permitted to be reported by task 4.2 and do not close the original reader's device gates. Live VoiceOver is not a gate.

## Final checks and scope

`mise run check` passes typechecking, lint, formatting and 140 tests across 16 files. `mise run build` passes frontend and Node-compatible API builds. Strict OpenSpec validation and diff whitespace checks pass. Tracked fixture prose/notices/tokens remain invented; no real Scripture or credentials were added. Browser tests use isolated contexts and reference/preferences-only persistence; the archived acceptance records empty Scripture-capable persistent stores. `.envrc`, screenshots and provider samples remain ignored.

Initial task 10.1 remains complete. Tasks 10.2 (hardware safe areas), 10.3 (working translation selection), and 12.1–12.3 (larger original matrix, automated accessibility audit and unavailable device coverage) remain open. Their partially implemented behavior is not counted complete. Provider, fonts, sharing, PWA and deployment work remain outside this milestone. The last-seen preview change remains a separate proposal.
