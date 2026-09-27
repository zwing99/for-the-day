# Spec Delta

## Purpose

Deliver an immersive Scripture card feed whose visual hierarchy and primary interactions prioritize reading while retaining discoverable accessible controls.

The corrected screen geometry, complete-content fitting, and visible horizontal transitions follow `screen-snapping-passage-transitions` (latest user decision, 2026-09-26). Former proximity/taller-card/no-shrink behavior is superseded; unrelated requirements are retained.

## ADDED Requirements

### Requirement: Viewport-led reading composition
The reader SHALL present Scripture as the dominant content in one native vertical scroll surface. Cards SHALL occupy exactly the usable viewport and vertical scrolling SHALL settle at page boundaries. Oversized groups SHALL separate at complete-verse boundaries first; indivisible oversized units SHALL reduce page-local typography as needed to fit every line, without clipping, altered provider formatting, or nested reading scrolling. A large application heading or navigation block SHALL NOT precede each reading session's Scripture location. A bounded reading column SHALL remain on tablet and desktop.

#### Scenario: Short Scripture card
- **WHEN** a short Scripture group is active on a phone
- **THEN** its content occupies an intentionally spaced viewport composition without a prominent navigation row

#### Scenario: Oversized poetry
- **WHEN** a poetic group exceeds the usable viewport at larger text size
- **THEN** the intact content fits one aligned page through measured typography reduction, preserving literary order and indentation

### Requirement: Quiet reading chrome
During ordinary reading the interface SHALL show a subtle current passage/translation label, a restrained ordered passage indicator, and one discoverable menu trigger. It SHALL NOT display persistent Previous/Next card buttons, Previous/Next passage button rows, or an exposed passage select. Indicators SHALL convey the active passage beyond color, have meaningful accessible names, and support direct selection. Chrome SHALL reserve space rather than overlap Scripture, respect safe areas, and retain legible attribution with an accessible full-notice view.

#### Scenario: Default reading state
- **WHEN** Scripture is visible and the menu is closed
- **THEN** no navigation button row is visible, the passage is identifiable, and the menu remains operable; on constrained-height viewports, redundant brand and passage indicators may be omitted to preserve reading space, with direct passage choices retained in the menu

### Requirement: Gesture-first navigation with accessible alternatives
Native vertical scrolling SHALL settle on complete screens within the current passage. Deliberate horizontal drags SHALL visibly slide the outgoing and adjacent passage panels, committing one bounded passage change on a qualifying release or returning on cancellation/insufficient movement. The menu SHALL expose previous/next card and passage navigation and named direct passage choices. Keyboard navigation SHALL remain available without opening the menu. Selection, vertical or ambiguous diagonal gestures, multi-touch, cancelled gestures, and interaction with controls or the open sheet SHALL NOT change passages accidentally.

#### Scenario: Reading without controls
- **WHEN** the reader scrolls vertically and then completes a deliberate leftward swipe
- **THEN** reading advances within the passage first and selects the next passage only on the deliberate swipe

#### Scenario: Navigation without gestures
- **WHEN** a keyboard user opens the menu
- **THEN** named navigation alternatives are reachable, dismissal restores focus, and passage selection retains independent saved locations

### Requirement: Intros participate in the feed
An enabled intro SHALL be the first viewport card of a passage without saved or explicitly addressed Scripture progress. It SHALL identify the passage, use only provider-supplied titles, provide quiet gesture guidance and a Begin alternative, and allow native scrolling directly into Scripture. Scrolling from the intro SHALL update the logical URL without adding a Back entry for each card. Explicit or saved Scripture locations SHALL bypass the intro; disabled intros SHALL retain canonical titles within Scripture.

#### Scenario: First passage visit
- **WHEN** an enabled intro opens without saved progress
- **THEN** scrolling upward through the feed reveals Scripture without requiring activation of Begin

#### Scenario: Returning to Scripture
- **WHEN** a saved or explicit verse location is reopened
- **THEN** that verse is restored without an intro or header obstructing it

### Requirement: Focused navigation and presentation sheet
The menu SHALL open a mobile-friendly sheet or bounded tablet/desktop dialog with named navigation choices and controls for Today/day, scoped restart, appearance, font size, density, intros, and verse labels. Preferences SHALL use existing validated persistence and preserve logical location during repacking. Only configured working translation choices SHALL be enabled until translation continuity is implemented. The sheet SHALL contain focus, support Escape and a visible close action, restore invoking focus, and leave native scrolling and zoom usable. Failed changes SHALL offer usable recovery without silently discarding successful reading state.

#### Scenario: Density change
- **WHEN** density or font size changes in the sheet
- **THEN** the same logical verse remains active when the sheet closes and the preference survives reload

#### Scenario: Unavailable translation
- **WHEN** a translation lacks working provider support
- **THEN** it is identified as unavailable and cannot replace the successfully displayed passage

### Requirement: Responsive and accessible visual acceptance
The interface SHALL preserve its reading-first hierarchy at 320, 390, and 430 CSS-pixel phone widths, short landscape, tablet portrait/landscape, narrowed Split View, and desktop. Primary interactive targets SHALL be at least 44 CSS pixels even when their visible marks are small. Light/dark appearance, visible focus, contrast, reduced motion, text/pinch zoom, and semantic reading order SHALL remain supported. Loading and recovery SHALL use the same restrained composition without fabricated Scripture. Visual review SHALL cover short and long invented Scripture fixtures and retained logical location after resizing.

#### Scenario: Rotation and constrained width
- **WHEN** a larger-text reader rotates or enters narrow Split View
- **THEN** the same logical verse remains active and Scripture, indicators, sheet, and attribution remain readable without horizontal page overflow

#### Scenario: Loading failure
- **WHEN** a chapter request fails
- **THEN** a calm named recovery state offers an appropriate action and the menu remains discoverable
