# Proposal

## Why

The localhost reader exposes temporary navigation controls as its primary interface and does not deliver the immersive card rhythm that motivated the hn-tok reference. Correct the reading surface before continuing provider work so subsequent features build on an accepted product experience.

## What Changes

- Replace the oversized scrolling application header and persistent card/passage button rows with a viewport-led Scripture feed, quiet persistent context, and one discoverable menu.
- Give Scripture groups deliberate full-screen placement, mandatory vertical settling, and complete-content fitting; reduce grouping first and shrink indivisible oversized pages without clipping or changing provider formatting.
- Make upward/downward native scrolling and deliberate horizontal passage swipes the primary interactions; retain keyboard and menu alternatives.
- Introduce a restrained ordered passage indicator and an accessible navigation/settings sheet, using the existing routes, storage, gesture classifier, and packing model.
- Make optional intros part of the scroll sequence, with a quiet Begin alternative and gesture guidance rather than a separate button-gated screen.
- Establish concrete visual acceptance checks against independently inspected hn-tok patterns before returning to the initial reader backlog.

## Capabilities

### New Capabilities

- `reading-first-interface`: Observable visual hierarchy, viewport composition, minimized chrome, and accessible interaction alternatives for the reader.

### Modified Capabilities

None in the archived spec inventory, which is currently empty. The pending `initial-localhost-reader` change already introduces `reader-experience` and `reader-navigation`; this change adds a focused complementary contract and identifies overlapping work explicitly in its design.

## Impact

Frontend reader coordinator, reading surface, semantic card presentation, CSS, preference integration, component tests, and browser verification documentation. No provider, API, cache, TTL, deployment, or Scripture text contract changes. No new UI framework or gesture dependency is planned. Implement this change before resuming provider tasks in `initial-localhost-reader`; shared work must be reconciled without checking unrelated tasks complete.

## Precedence correction — 2026-09-26

The user-approved `screen-snapping-passage-transitions` change takes precedence for vertical page geometry, settling/restoration, oversized-content fitting, and horizontal transitions. These artifacts are corrected to that contract so sync/archive order cannot restore the former proximity-snap/taller-card behavior. Earlier implementation evidence is historical; reopened tasks require verification under the corrected contract. Unrelated requirements remain in force.
