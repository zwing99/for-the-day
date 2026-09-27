# Design

## Context

See proposal.md for motivation. `main.tsx` and `verse-fit-check.tsx` import the same stylesheet. Current CSS defines broad `main`, heading, paragraph, and button rules, then overrides card heights, padding, and intro typography later. The shell uses `100vh` followed by `100dvh` and an auto/minmax/auto grid; `reading-surface.tsx` measures the central surface and writes `--reading-height`, plus unitless fitting scales. The normal font interpolation contains `634px`, `0.33rem`, and `0.0232`, and pre-measurement card fallbacks subtract an assumed `112px` chrome height. Existing browser verification covers Chromium/WebKit routes, menus, and recovery, but does not establish real iPhone toolbar or installed-PWA behavior. The archived screen-snapping design already inspected hn-tok and adopted its applicable native paging patterns; no new interaction pattern is needed.

This is cross-cutting CSS organization and measurement-boundary work, so a design artifact is warranted. Specs are skipped because observable requirements stay unchanged.

## Goals / Non-Goals

**Goals:** Each style responsibility and runtime sizing input has a discoverable owner; intentional responsive overrides sit with the rules they modify; behavior and computed typography remain equivalent.

**Non-Goals:** Visual redesign, new fonts, new density behavior, new gesture logic, framework adoption, utility-class conversion, CSS-in-JS, offline Scripture, or changing supported browsers. Do not implement last-seen previews as part of this refactor.

## Decisions

### Plain CSS with a small ordered entry point

Keep `src/client/style.css` as imports only so both application and fit harness consume identical styles. Use these responsibility-based files under `src/client/styles/`, in this order:

- `theme.css`: font faces, light/dark palette, named presentation preferences and reading measures.
- `base.css`: document/root sizing, minimal native control defaults, shared focus treatment.
- `reader-layout.css`: shell grid, reading surface, page boxes, safe areas, compact-height layout, chrome and indicators.
- `scripture.css`: faithful semantic marks, whitespace, headings, literary spacing, selected and fitted typography.
- `presentation.css`: intro, attribution/end presentation, loading and recovery states.
- `menu.css`: native dialog, fields, actions, mobile sheet and wider dialog layout.
- `transitions.css`: passage stage/preview placement, transition states and reduced motion.

Retain descriptive component selectors and scope broad rules to their actual consumers. Keep responsive rules beside their base component declarations. Shared page geometry belongs in reader-layout, including intro/end page height; presentation owns their interior styling. Avoid new cascade layers or specificity tricks: a single explicit import order and narrowly scoped selectors are sufficient. Component-by-component CSS modules and a utility framework were considered but would add tooling or markup churn without addressing the current duplicate rules.

### Explicit geometry and value ownership

The shell alone owns viewport height. Its grid reserves actual chrome dimensions; the central reading surface owns available page height. Safe-area padding is applied once at the relevant edge by its owning component. Pages consume measured reading height, not a guessed viewport-minus-chrome formula. Preserve native scrolling, snap geometry and logical-anchor restoration.

Interpret "no magic variables" as no unexplained constants, opaque chains of custom properties, or hidden inheritance dependencies. It does not mean banning CSS custom properties needed for themes and DOM measurements. Retain only values with a concrete purpose: palette, reading measures, selected typography, measured reading height in CSS pixels, and page/presentation fitting scales with unitless default 1. Document runtime producers and consumers in a short comment at their definitions/boundary. Use literals for local one-off values; do not create tokens for every padding or border.

Replace empirical typography coefficients with an equivalent expression derived from named minimum/maximum font sizes and measured-height calibration endpoints, documenting the existing benchmark basis. Derive endpoints algebraically from the current expression; do not round them in a way that changes effective size. Preserve the interpolation curve and preference values. Remove duplicate fallback values when an authoritative declaration is guaranteed; retain browser compatibility fallbacks such as `100vh` before `100dvh` with a clear reason. Replace guessed pre-measurement geometry with the existing parent geometry where possible, verifying first render, font readiness and resize so this does not introduce a flash, circular measurement, or zero-height page. If equivalence cannot be demonstrated, keep and explain the existing fallback rather than changing behavior silently.

Deleting all custom properties was rejected because it would duplicate theme values and obscure the necessary measurement bridge. Changing font sizes to convenient round values was rejected because it would invalidate measured fit and alter design.

### Equivalence as the acceptance gate

Capture before/after screenshots and geometry with invented fixtures for short/long prose, line-heavy poetry, headings, intro, attribution, menu, loading and failure. Include light/dark, every density/font setting, reduced motion, 320/390/430 widths, short landscape, tablet/Split View and desktop. Compare selected/effective typography, page and surface height, safe-area/chrome spacing, overflow, snap alignment within two CSS pixels, focus and 44px targets. Cover scroll/touch, horizontal transitions, resizing with retained logical verse, and text/pinch zoom. Add behavior-focused browser assertions where current coverage lacks a useful regression gate; do not test stylesheet filenames or selector counts.

Use the existing offline response cache and `mise run verify:verse-fit` for CSB Psalm 60:1 with headings, 27:4, 17:14, 141:5 and Proverbs 30:4 across the standing matrix; record available space and effective size. Any actual font/formatting change requires full accessible Psalms/Proverbs remeasurement from cached responses. Missing/expired corpus data is a reported blocker to that claim, never permission for live downloads. Keep real provider text out of tracked artifacts. Use Playwright MCP for interactive localhost inspection in addition to repository browser tasks.

Real iPhone Safari checks cover expanded/collapsed browser chrome, portrait/landscape, pinch zoom, menu scrolling and installed standalone launch where an installed production shell is available. Desktop WebKit emulation is useful but cannot certify those device conditions. Record actual device/iOS/mode and unavailable checks honestly; do not claim complete iPhone acceptance without physical-device evidence. No platform-specific workaround is added without a reproduced failure; behavior changes require an explicit planning update.

## Risks / Trade-offs

- [Moving declarations changes cascade or inherited values] -> Capture baselines first, consolidate one responsibility at a time, and compare computed values and visible states.
- [Cleaner formulas change typography through rounding] -> Preserve the original curve, compare effective sizes, and run cached verse-fit acceptance.
- [Early layout differs before measurements arrive] -> Verify first paint, delayed fonts, loading, resize and restoration; use actual parent geometry rather than fixed chrome estimates where equivalent.
- [Another change touches passage styling] -> Keep preview behavior unchanged and rebase responsibility ownership against last-seen-passage-previews without overwriting its work.
- [Physical iPhone unavailable] -> Finish automated checks and report the remaining device acceptance separately instead of presenting WebKit as proof.

## Migration Plan

Capture a baseline, extract files without changing effective rules, then consolidate and clarify values in small runnable slices. Run focused checks per slice and full checks/build plus browser/fit verification at completion. No persistent data migration or dependency installation is needed. Revert only the refactor's stylesheet/import/boundary edits if equivalence fails, preserving unrelated work and user preferences. Record references/geometry and check limitations in this change's verification notes during implementation.
