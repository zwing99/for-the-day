# Design

## Context

See proposal.md for motivation. The current `reader.tsx` mounts a large header, passage buttons and select before the content. `reading-surface.tsx` mounts a sticky Previous/Next card row; CSS then reserves six rem above every card. Intros currently replace Scripture with a Begin-gated section. The semantic tree, pure density packer, native scrolling, conservative swipe classifier, canonical URLs, and reference-only persistence already exist and should be retained. Settings UI is still pending.

The independent source inspection of [hn-tok](https://github.com/rewdy/hn-tok/tree/08f7548bfbbe258aff0ce3927760e09096cfd9da) covered StoryFeed, StoryCard, IntroCard, global styles, and docs/design.md in the existing local reference checkout. Its useful patterns are a viewport scroll feed, centered bounded card content, restrained metadata, and an intro in the same sequence. It uses fixed-height mandatory snapping; the corrected reader contract uses exact usable-height pages and mandatory snapping, fitting complete oversized units to the page. Its terminal typography, article links, switches, and news styling are not Scripture design requirements. No source copying is planned; no source license was found in the earlier review.

## Goals / Non-Goals

**Goals:** Remove testing chrome now; make the feed feel coherent on phones; deliver accessible alternatives behind quiet chrome; reuse existing semantic/location contracts; define a concrete visual review milestone before provider work resumes.

**Non-Goals:** Provider expansion, Crossway mapping, sharing, font downloads, PWA installation, cache changes, deployment, automatic passage advance, or a new UI framework. Retain the current serif as a replaceable token for this milestone; licensed font selection remains initial-change task 10.4.

## Decisions

### 1. Compose one feed with bounded persistent chrome

Use an outer viewport shell with small top context, a central native scroll surface, and a restrained bottom passage indicator. Keep the menu trigger in the top context. Reserve actual chrome height and safe-area insets in layout; card minimum height and packing budget derive from the remaining scroll viewport. This avoids overlays obscuring text and eliminates hardcoded compensation for the former sticky buttons. Do not use global `main` selectors to style the sheet's scroll behavior.

Short cards vertically center their literary content within padded usable space, with left-aligned text and preserved indentation. Every page has exact usable height. Oversized grouped content separates at complete-verse boundaries first; indivisible units use measured page-local typography reduction, preserving every line and its structure. Mandatory settling and page-aligned restoration follow `screen-snapping-passage-transitions`. Use typography/spacing/color tokens and a single centered reading column; keep contrast sufficient despite subdued chrome. Required attribution remains legible in the passage flow, with full notice access in the sheet where useful; do not put all notices behind the menu.

Alternative: simply hide button rows with CSS. Rejected because the header, intro gating, six-rem reserve, and viewport budgets would retain the wrong composition.

### 2. Separate visual affordances from navigation actions

Extract a small reusable navigation action boundary from the coordinator and surface so the sheet invokes the same passage/card operations as keyboard navigation. Avoid storing card indices as progress. Indicators are small marks inside 44px targets, named with book/chapter and active state, without large pill/button outlines. Show all six plan choices (two on day 31) in order. Sheet navigation uses clear text actions and direct choices; buttons are appropriate inside an explicitly opened controls surface.

Keep the current conservative touch classifier. Exclude the sheet and chrome from feed gestures and scoped key handling. No automatic hiding timer is necessary: fixed quiet chrome avoids discoverability and focus problems. Alternative: gesture-only navigation rejected because it removes accessible alternatives.

### 3. Put intro and Scripture in the same native flow

Mount the optional intro before semantic cards instead of returning a separate intro-only view. Intro presentation references provider titles without removing or duplicating text inside the Scripture partition. Initial restoration selects intro or a verse according to existing precedence. Measure intro visibility separately from semantic verse markers so the first verse cannot overwrite the intro URL before Scripture is visible. Begin scrolls to the first verse using replacement history and reduced-motion handling; ordinary scroll also replaces location. Report FUMS only when Scripture is actually displayed, once per existing activation, including transition from intro.

Alternative: keeping a Begin-only screen fails the reference's continuous feed interaction. Rebuilding the route or chapter model is unnecessary.

### 4. Deliver a focused sheet using existing repositories

Use the native dialog where compatible, with one sheet-sized presentation on phones and bounded dimensions on larger screens. Provide labeled controls for the settings already modeled in storage and Today/day/restart navigation. Restart affects only the requested passage/day and uses existing route rules. Day changes follow the defined reading plan; Today resolves the current local calendar day at action time. Apply appearance and verse-label preferences through presentation only. Density/font changes reuse pure packing and logical re-anchoring.

At this checkpoint only CSB has a working provider adapter. Show other planned editions as unavailable, without enabling an unimplemented switch or pretending exact continuity exists. Later initial-change task 9.3 owns enabling all working translations and mapping/rollback. No extra provider calls or Scripture persistence are introduced by this sheet.

### 5. Make visual review an acceptance milestone

Capture before/after localhost screenshots with invented short, long poetry, heading, merged-span, and loading/error fixtures through Playwright. Review phone first: opening Scripture should show the reading composition immediately, no button row, and discoverable context/menu. Then exercise native scroll, conservative horizontal/diagonal input, keyboard and accessibility-tree order, sheet focus, restored links, and resizing. Use Chromium and WebKit when available; report unavailable WebKit or physical Safari checks honestly. Live VoiceOver remains outside the completion gate per the user's prior instruction.

## Risks / Trade-offs

- [Centering and smaller chrome change marker geometry] → Measure the usable surface and reading line coherently; verify explicit and saved anchors within packed and fitted oversized pages.
- [Intro observer reports Scripture prematurely] → Separate intro visibility from verse tracking; add mocked FUMS and history behavior checks.
- [Small indicators become inaccessible] → Keep 44px targets, visible focus, named choices, and a non-color active mark.
- [New sheet duplicates unfinished initial-change work] → Reconcile only verified overlapping tasks; leave providers, sharing, fonts, PWA, and remaining device checks open.
- [Reference resemblance becomes visual copying] → Independently implement the viewport/spacing interaction patterns; preserve the Scripture-specific serif and literary structure.

## Migration Plan

Implement and verify this change before resuming initial-change section 8. No storage schema or canonical URL migration is planned. Stage the shell/card composition first, then intro flow and accessible sheet, then visual acceptance. Reconcile initial-change tasks 10.1–10.3 and applicable portions of 12 only when their full individual acceptance conditions pass; translation selection portions remain pending until provider/mapping work exists. Sections 5–7 must retain their existing navigation, fidelity, and packing guarantees. This proposal does not change existing checkbox status. Rollback is scoped frontend changes with existing URL and storage contracts retained; no external deployment is involved.

## Precedence correction — 2026-09-26

The user-approved `screen-snapping-passage-transitions` change takes precedence for vertical page geometry, settling/restoration, oversized-content fitting, and horizontal transitions. These artifacts are corrected to that contract so sync/archive order cannot restore the former proximity-snap/taller-card behavior. Earlier implementation evidence is historical; reopened tasks require verification under the corrected contract. Unrelated requirements remain in force.
