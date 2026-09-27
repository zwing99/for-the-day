# Tasks

## 1. Capture behavior and geometry baselines

- [x] 1.1 Capture existing invented-fixture screenshots and computed geometry for reader, intro, end/attribution, menu, loading and failure across the design's viewport/presentation matrix; record baseline locations and dimensions in verification notes and verify no live provider requests occur.
- [x] 1.2 Add or extend focused browser regression assertions for measured page/surface height, complete content fit, two-pixel snap alignment, logical-anchor retention on resize, focus restoration and 44px targets; verify they pass on the current application in Chromium/WebKit using mocked responses.
- [x] 1.3 Run cached-only CSB benchmark verification before edits, recording reference, available space, effective size and cache limitations in verification notes; verify existing samples can be imported without network and never fetch missing/expired data automatically.

## 2. Extract focused plain CSS files

- [x] 2.1 Extract theme and base styles into `styles/theme.css` and `styles/base.css`, retaining the common `style.css` entry point; verify light/dark, native controls and focus against baseline screenshots and run formatting checks.
- [x] 2.2 Extract reader geometry and faithful semantic typography into `styles/reader-layout.css` and `styles/scripture.css`, preserving effective cascade initially; verify page dimensions, selected/effective font sizes, line breaks and indentation against baseline and run client tests.
- [x] 2.3 Extract intro/end/loading/recovery, menu and passage transitions into `styles/presentation.css`, `styles/menu.css` and `styles/transitions.css`; verify responsive menu, transition/reduced-motion states and recovery with mocked browser checks, and confirm app and verse-fit harness load the same ordered entry point.

## 3. Consolidate ownership and remove unexplained values

- [x] 3.1 Consolidate repeated component rules and scope broad selectors to actual consumers, keeping intentional responsive overrides beside their owning rules; verify before/after computed geometry and screenshots for each affected state and document import/file ownership at the CSS entry point.
- [x] 3.2 Clarify theme and runtime property names, units, producers, consumers and defaults; remove redundant fallback chains and obsolete rules while retaining required compatibility fallbacks; verify delayed font loading, first render and existing fitting tests, and document the measurement boundary inline.
- [x] 3.3 Express normal typography calibration through documented meaningful endpoints with an equivalent curve, including enlarged root font sizes; replace guessed chrome-height fallbacks with actual parent geometry where equivalent; verify measured sizes, no initial zero-height/flash, retained anchors after rotation/resize, and the cached CSB fit matrix before accepting the slice.

## 4. Integrated acceptance

- [x] 4.1 Run `mise run check`, `mise run build`, `mise run test:browser` and cached-only `mise run verify:verse-fit`; inspect localhost via Playwright MCP for touch/scroll, horizontal gestures, zoom, all densities, light/dark and loading/failure, recording geometry and any unavailable checks without tracked provider text.
- [x] 4.2 Exercise real iPhone Safari with expanded/collapsed browser chrome, rotation, pinch zoom, menu scrolling and standalone production PWA where available; record device/iOS/mode and results, or explicitly record unavailability and leave physical-device acceptance unverified rather than claiming emulation certifies it.
- [x] 4.3 Review the final diff for duplicate geometry ownership, unexplained values, new dependencies and interference with last-seen-passage-previews; verify behavior equivalence evidence is complete, document remaining limitations and retain unchanged existing specs.
