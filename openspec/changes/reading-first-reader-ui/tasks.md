# Tasks

## 1. Reading composition and quiet chrome

- [x] 1.1 Replace the large reader header and permanent card/passage button rows with a viewport shell, subtle passage/translation context, and one named menu trigger; verify component assertions and a 390px Playwright screenshot show Scripture without exposed navigation rows.
- [x] 1.2 Give semantic cards bounded, vertically composed short-content wrappers and measured indivisible-content fitting; derive minimum card height, packing reserve, and reading-line geometry from the usable scroll surface; verify exact text/structure conservation and page-aligned explicit/saved anchors on short, packed, merged, and fitted oversized fixtures.
- [x] 1.3 Add ordered passage indicators with 44px targets, accessible book/chapter names, and non-color active state; share navigation actions with keyboard and future sheet controls; verify six/two passage plans, bounded ends, independent restoration, and absence of chrome-triggered swipes.
- [x] 1.4 Document the shell, card composition, independent hn-tok inspiration, and retained scrolling guarantees in the reader docs; verify before/after phone screenshots and run `mise run check` and `mise run build` for this milestone.

## 2. Continuous intro flow

- [x] 2.1 Mount enabled intros in the same scroll sequence as Scripture, retain provider-only titles and a quiet Begin action/hint, and preserve explicit/saved-location precedence; verify scrolling reveals Scripture without Begin and disabled intros retain canonical headings.
- [x] 2.2 Coordinate intro/verse visibility, replacement URL updates, restoration suppression, and display reporting; verify intro does not report FUMS, first actual Scripture display reports once, repacking does not repeat reporting, and Back/Forward/reload restore the intended logical location.
- [x] 2.3 Document intro behavior and verify phone native scrolling, reduced-motion Begin, long first cards, and browser history with Playwright; run the focused component/navigation suite and `mise run check` before completing this milestone.

## 3. Accessible navigation and presentation sheet

- [x] 3.1 Add a labeled native dialog/sheet with navigation actions, direct passage choices, visible close, Escape dismissal, focus containment/return, and feed gesture/shortcut exclusion; verify keyboard/component behavior and Playwright accessibility-tree order on phone and tablet.
- [x] 3.2 Connect appearance, font size, density, intros, and verse labels to the existing guarded preference repository and CSS tokens; verify persistence, storage failure fallback, same-verse re-anchoring, faithful hidden-label rendering, and light/dark/reduced-motion browser layouts.
- [x] 3.3 Add Today/day selection and scoped passage/day restart through reading-plan/routes/storage; identify unimplemented translations as unavailable without enabling premature switching; verify local-midnight Today, day 31, independent day/passage positions, restart scope, and unavailable-choice behavior with component tests.
- [x] 3.4 Integrate legible passage attribution/full notices and calm loading/retry/invalid-link recovery into the new composition; verify mocked failures, rate-limit cooldown, no fabricated Scripture, sheet access during failure, and no disclosure of provider secrets.
- [x] 3.5 Update reader/setup documentation for the finished controls and current CSB-only checkpoint; verify documented interactions in Playwright and run `mise run check` and `mise run build` before completing the sheet milestone.

## 4. Integrated visual acceptance and backlog reconciliation

- [x] 4.1 Review and record Playwright screenshots at 320/390/430px phones, short landscape, 768×1024 and 820×1180 tablet portrait, tablet landscape, narrow Split View, and desktop using short/long invented fixtures and every density; verify no horizontal overflow, comfortable bounded measure, no overlapping chrome, legible attribution, and stable logical anchors after resizing.
- [x] 4.2 Exercise native vertical scroll, horizontal/diagonal/cancelled/multi-touch gestures, selection, keyboard, zoom, safe areas, sheet focus, and loading/recovery in Chromium and WebKit where available; record accessibility-tree review and explicitly report unavailable WebKit/physical Safari checks without claiming them complete. Live VoiceOver is not a gate.
- [x] 4.3 Run final `mise run check` and `mise run build`, review tracked fixtures and browser persistence for Scripture/secrets, and reconcile verified overlap with initial-change tasks 10.1–10.3 and 12 without checking partially delivered work complete; deliver a visual review checkpoint before resuming provider implementation.

## Precedence correction — 2026-09-26

The user-approved `screen-snapping-passage-transitions` change takes precedence for vertical page geometry, settling/restoration, oversized-content fitting, and horizontal transitions. These artifacts are corrected to that contract so sync/archive order cannot restore the former proximity-snap/taller-card behavior. Earlier implementation evidence is historical; reopened tasks require verification under the corrected contract. Unrelated requirements remain in force.
