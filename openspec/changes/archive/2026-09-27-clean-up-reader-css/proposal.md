# Proposal

## Why

The reader's single 609-line stylesheet mixes theme, page geometry, semantic Scripture, controls, and transitions, with earlier declarations overridden later. Consolidating those rules will make iPhone sizing easier to understand and maintain while preserving the established reading design.

## What Changes

- Replace the monolithic stylesheet with clearly named files and a single ordered CSS entry point.
- Consolidate repeated declarations and remove obsolete geometry, broad selectors, redundant fallbacks, and unexplained sizing values where equivalent behavior can be demonstrated.
- Make ownership of viewport height, safe areas, measured reading height, selected typography, and page-local fitting explicit.
- Keep a small set of meaningful theme and runtime custom properties; document their producers, consumers, units, and defaults instead of introducing a generic token system.
- Preserve current appearance, provider formatting, accessibility, navigation, page fit, preferences, and PWA behavior through regression verification.
- Add no CSS framework or styling dependency.

## Capabilities

### New Capabilities

None. This is a behavior-preserving implementation refactor.

### Modified Capabilities

None. Existing reading-first-interface, screen-paged-reading, semantic-card-packing, and local-pwa-development contracts remain authoritative. This change declares `skip_specs: true` rather than inventing behavior requirements.

## Impact

Primarily `src/client/style.css`, a new `src/client/styles/` directory, and the CSS imports used by the application and verse-fit harness. Small changes to the CSS/TypeScript measurement boundary are allowed only when needed to clarify existing ownership. Existing client/browser checks and cached verse-fit verification will establish equivalence. No API, storage, provider, deployment, or dependency changes are planned. Coordinate overlapping passage selectors with the separate last-seen-passage-previews change.
