# Design

## Context

See proposal.md for scope. Current `style.css` uses `y proximity` and minimum-height cards. `reading-surface.tsx` disables snapping during marker-offset restoration and only reenables it on input. `passage-gesture.ts` tracks touches but exposes only a release-time direction to the coordinator; there is no drag offset or neighboring panel. Existing packing estimates line budgets and preserves complete/merged verse units.

The local hn-tok checkout at commit `08f7548bfbbe258aff0ce3927760e09096cfd9da` was inspected again: StoryFeed uses fixed `100dvh`, `y mandatory`, start alignment, and `scrollSnapStop: always`. Adapt these independently to the reader's usable height. hn-tok has no horizontal passage animation to copy.

## Goals / Non-Goals

**Goals:** Strict screen settling, complete-content fit, measured default typography, reversible direct horizontal manipulation, and preserved semantic/reference contracts.

**Non-Goals:** Verse pagination, text editing, provider expansion, cache changes, persistent browser Scripture, new gesture frameworks, automatic passage advance, or copying reference source.

## Decisions

### Mandatory native vertical pages

Use the existing single native vertical surface with mandatory snap and stop-always on exact usable-height pages. Derive height from the shell's actual central area, with safe-area chrome excluded. Snap restoration to the containing page, retaining the addressed logical verse even if it is inside a group; do not restore to an arbitrary marker offset. Restore mandatory snap immediately after restoration, not only after another input. Use scrollend plus a debounced fallback to verify/repair settled page alignment where browser behavior requires it. Do not fight active touch, selection, or pinch input. First and last pages require full-height sizing too; attribution must be a complete aligned end page or readable reserved presentation, never a short unsnapped trailing area.

Native mandatory snap is preferred to a fully custom vertical transform deck because it retains browser scrolling and input accessibility. One-page gesture advancement and settled boundaries need browser tests; CSS alone is not proof of correct behavior.

### Measure content before local type fitting

Keep the semantic renderer and reference slices. Estimates propose grouping; DOM measurement at the selected typography validates both dimensions. Split overflowing Balanced/Compact groups at complete-verse boundaries first. Only indivisible content scales down; do not shrink whole chapters or reduce the stored preference. Fit by recomputing font size and line height together, preserving relative indentation, whitespace, marks, and headings. Use a bounded convergence search against actual content dimensions, triggered by font readiness, viewport/layout changes, and presentation changes. Never hide overflow as a substitute for verification. Mark effective page typography in testable layout metadata.

Normal portrait defaults must fit the real worst-case benchmark set without local reduction. Short landscape and larger-size pages can require reduction. Automatically fitting very large text can counteract text zoom, so preserve native pinch zoom and verify that accessibility zoom is still effective rather than silently cancelling browser scaling. Record effective sizes and visual legibility as acceptance evidence; do not invent an unapproved fixed minimum that would reintroduce overflowing pages. If real supported cases demand unreadable sizes, report the conflict before accepting the implementation.

The user approved compact chrome after integrated 200% text checks exposed unreadable fitting on a 320×568 phone. At viewport heights up to 600px, omit redundant brand/dot chrome, preserve the passage label and named menu target, and reserve fixed 8px vertical / 16px horizontal reading padding plus safe-area insets. Spacing need not grow with text; content and controls retain their selected/enlarged sizes. This also replaces the former landscape-only compact layout. The measured minimum real-benchmark effective size at 200% on 320×568 improves from 9.78px to 18.43px, with complete fit and retained logical anchors.

### Measured benchmarks rather than folklore

Responsive normal typography uses the measured usable height and stays between 1rem and 1.25rem. In short landscape, omit redundant brand/dot chrome and reduce vertical page padding while retaining the menu's full touch target and directional alternatives. This recovers readable space for the heading-heavy benchmark; page-local fitting remains available for larger preferences. The user authorized this layout adjustment after the original landscape measurement required approximately 10px text.

Use the configured CSB chapter API and faithful renderer to scan all 150 Psalms and 31 Proverbs chapters. Measure complete atomic units, not array indices (merged/split verse identities differ from card indices). Rank verse-only and heading-attached heights separately; count text length and preserved poetic lines separately. Keep candidates tied for the maximum. Persist only references, counts, geometry, edition, renderer/font configuration, and coverage in planning/developer records; source content and provider tokens stay transient or ignored. Repeat for newly supported editions and typography changes. The research report in this change records the current baseline; implementation must verify default grouping as well as atomic candidates.

### Direction-locked horizontal transition

Extend the pure classifier with direction locking and explicit idle/dragging/settling/committed states; expose progress without committing navigation. Render a clipped horizontal panel strip around the existing vertical surface, with outgoing and destination presentation translated together. Vertical scroll remains independent; avoid nested horizontal overflow and preserve `pan-y pinch-zoom`. Pointer/touch and trackpad adapters feed the same state machine with one completion per gesture. Use conservative existing dominance/distance rules, add velocity only if behavior tests justify it. At boundaries use a restrained return animation, not wraparound.

Show a passage-labeled loading preview unless adjacent data is already available in transient state; do not eagerly fetch the whole plan. Preview rendering is inert and aria-hidden and has no FUMS/location observers. Only commitment flushes the outgoing reference, updates history once, and activates the destination coordinator/reporting. Reduced motion removes animated translation. Interruption by a menu, cancellation, new navigation, resize, or stale fetch resets the transition coherently. Loading/failure panels remain usable after commitment.

### Precedence and merging

The latest user decisions in this change supersede proximity snapping, growing oversized cards, and prohibitions on smaller type in the two earlier unarchived changes. Correct those existing artifacts in place so archive order cannot resurrect the older contract. Preserve requirement names where possible, retain unrelated behavior, and reopen only checked tasks whose acceptance changed. This change owns the new screen/transition implementation and measurement gate; earlier checked results describe their previous milestone, not verification of revised requirements. Before eventual sync/archive, review duplicate related requirements for consistency; do not create main specs during this planning step.

## Risks / Trade-offs

- [Attached titles can dominate a short verse] → Benchmark heading-attached page height separately from verse length and retain titles faithfully.
- [Fitting can make pathological invented content tiny] → Verify realistic corpus legibility and report effective sizes; never claim extreme invented cases establish readable defaults.
- [Mandatory snap can regress restoration or Safari input] → Align page geometry and restoration together and exercise wheel/touch/keyboard/resize, with unavailable devices reported.
- [Preview could duplicate attribution/reporting or steal focus] → Keep inactive panels inert and activate only at commit.
- [Two overlapping changes could restore obsolete rules] → Update conflicting artifact text and acceptance checkboxes, with explicit precedence notes in each change.

## Migration Plan

### Follow-up: last-seen page in horizontal transitions

User feedback: the current horizontal interaction is close, but swiping left or right should reveal and return to the destination passage's last-seen reading page. Each passage retains its independent logical reference. The incoming panel should present the aligned page containing that saved reference during the swipe, then land on that same page after commitment, rather than visually restarting at its introduction. Loading previews are the current intermediate implementation; restoring a saved reference only after loading does not fully deliver this visual continuity. Revisit this with transient adjacent-passage availability/background loading in a subsequent planning update. Previews must still avoid progress writes, focus changes, and display reporting.

No storage schema or API migration. Preserve existing reference URLs/preferences; map saved anchors to containing pages. Implement incremental local milestones and keep the app runnable. Roll back the new rendering/transition code if needed without modifying persisted references; planning continues to describe the requested behavior rather than silently restoring superseded requirements.

## Merge precedence map

| Existing capability / requirement | Corrected contract | Winning change |
| --- | --- | --- |
| reader-navigation / Native vertical navigation | Mandatory exact-height page settling; no tall scrolling exception | screen-snapping-passage-transitions |
| reader-navigation / Deliberate horizontal passage navigation | Visible drag, complete/return motion, one bounded commit | screen-snapping-passage-transitions |
| semantic-card-packing / Large literary units and accessible overflow | Complete-verse group reduction, then measured indivisible type fitting | screen-snapping-passage-transitions |
| reader-experience / Typography and restrained presentation | Measured default fit, local oversized fitting, verified effective size/zoom | screen-snapping-passage-transitions |
| reading-first-interface / Viewport-led reading composition | Exact usable screens with complete content fit | screen-snapping-passage-transitions |
| reading-first-interface / Gesture-first navigation with accessible alternatives | Snapped vertical pages and interactive horizontal panels | screen-snapping-passage-transitions |

Requirement names in older deltas remain stable for synchronization. Their bodies now agree with this table. Apply this change first, then reconcile reopened older tasks against its evidence; archive order must not be used as a substitute for semantic review.
