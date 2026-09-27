# Spec Delta

## Purpose

Present Scripture in a quiet, polished, accessible mobile reader with restrained context and controls, persistent preferences, and useful loading and recovery behavior.

The corrected screen geometry, complete-content fitting, and visible horizontal transitions follow `screen-snapping-passage-transitions` (latest user decision, 2026-09-26). Former proximity/taller-card/no-shrink behavior is superseded; unrelated requirements are retained.

## ADDED Requirements

### Requirement: Typography and restrained presentation
Scripture SHALL be the dominant reading content. Light, dark, and system appearance SHALL provide readable text, meaningful literary indentation, and sufficient contrast. Short passages SHALL receive intentional spacing; long passages SHALL remain comfortably readable. Text SHALL not be clipped. Default typography SHALL ordinarily fit measured worst-case real verse and attached-heading benchmarks at the selected size. Occasional page-local shrinking SHALL be permitted for a handful of oversized verse or attached-heading pages, especially on the smallest devices. Indivisible oversized pages SHALL use only the measured reduction needed for complete fit while retaining selected preferences and native zoom. Effective sizes and legibility SHALL be verified. The experience SHALL avoid advertising, monetization, social mechanics, gamification, decorative gradients, ornamental religious imagery, dashboard presentation, and excessive permanent controls.

#### Scenario: Short and long cards
- **WHEN** the reader displays a short verse and an oversized poetic passage
- **THEN** both remain readable with deliberate spacing and intact text

### Requirement: Phone-first adaptable tablet presentation
Phone-sized devices SHALL be the primary design target. The same reader SHALL remain polished and usable on iPad-sized viewports in portrait, landscape, and narrowed Split View. Layout SHALL adapt to the actual available viewport rather than a device name. Wider layouts SHALL maintain a comfortable bounded Scripture line length, readable type, and appropriately sized controls/settings. Balanced and Compact SHALL use extra usable reading space for additional natural Scripture grouping where content permits, rather than retain a fixed phone content budget. The selected density and font-size preference SHALL remain unchanged by viewport changes. The reading sequence and navigation grammar SHALL remain consistent across sizes.

#### Scenario: Tablet reading
- **WHEN** the reader opens on an iPad-sized portrait viewport with Balanced density
- **THEN** Scripture uses a comfortable reading measure, card grouping reflects available reading space, and controls remain touch-friendly

#### Scenario: Tablet landscape or Split View
- **WHEN** an iPad-sized reader rotates or is resized into a narrow Split View
- **THEN** text, controls, and settings adapt to the available width and height without clipping, changing preferences, or losing the current logical verse

### Requirement: Optional passage intros
Intros SHALL be enabled initially and disableable in settings. They SHALL identify the passage and show provider-supplied canonical titles/headings when available, without inventing editorial descriptions. An intro SHALL provide a gesture hint and a non-gesture Begin control. Saved or explicitly addressed Scripture progress SHALL take precedence over the intro. Disabling intros SHALL not remove titles/headings from Scripture rendering.

#### Scenario: Returning to progress
- **WHEN** a passage has saved progress and intros are enabled
- **THEN** the saved Scripture location opens directly

#### Scenario: No provider title
- **WHEN** a passage has no supplied canonical title
- **THEN** the intro identifies the book/chapter without a fabricated title

### Requirement: Quiet persistent orientation
While reading, a subtle passage identifier SHALL remain near the top without overlapping text. A restrained ordered passage indicator SHALL identify the current day's passages, indicate the active passage beyond color alone, and allow direct selection. On constrained-height viewports, redundant brand and indicators MAY be omitted to preserve reading space, with direct passage choices retained in the named menu. Optional progress SHALL describe location without streaks, completion rewards, or engagement prompts. Essential controls SHALL remain discoverable through keyboard and screen readers when reading chrome is minimized.

#### Scenario: Orientation
- **WHEN** Psalm 86 is active
- **THEN** the passage identifier and active indicator orient the reader without taking precedence over Scripture

### Requirement: Settings and persistent preferences
Settings SHALL provide Today, day selection, passage/day restart, CSB/NIV/NLT/ESV selection, system/light/dark appearance, font size, Spacious/Balanced/Compact density, intros on/off, and verse numbers on/off. Initial preferences SHALL be CSB, Balanced, system appearance, normal font size, intros on, and verse numbers on. Preferences SHALL persist across reloads through a small storage boundary. Hiding verse numbers SHALL affect labels only. Invalid or unavailable storage SHALL fall back to valid defaults without breaking reading. Font selection SHALL remain replaceable without changing Scripture or location contracts.

#### Scenario: Preference restoration
- **WHEN** NLT, Compact, dark appearance, larger type, and intros off are selected and the application reloads
- **THEN** those preferences are restored

#### Scenario: Hidden verse labels
- **WHEN** verse numbers are disabled
- **THEN** labels are hidden while verse identities, URLs, text, and navigation remain functional

#### Scenario: Corrupt persistence
- **WHEN** saved preferences contain malformed or unsupported values
- **THEN** valid preferences are retained where possible and invalid values use defaults

### Requirement: Accessible mobile and desktop behavior
The reader SHALL use semantic content and controls, meaningful accessible names, visible focus, contrast meeting WCAG AA for text, and touch targets of at least 44 CSS pixels for primary interactive controls. It SHALL honor reduced motion, text zoom, pinch zoom, iPhone/iPad safe areas, dynamic browser viewports, portrait/landscape and Split View changes, and desktop input. Settings SHALL manage focus on open/close and support keyboard dismissal. Screen readers SHALL encounter Scripture in literary order without repeated forced announcements while scrolling. Context SHALL remain legible despite its subtle visual treatment.

#### Scenario: Mobile Safari viewport changes
- **WHEN** browser chrome expands or the phone rotates
- **THEN** safe-area controls and all Scripture remain accessible and logical location is retained

#### Scenario: Reduced motion
- **WHEN** reduced motion is requested
- **THEN** programmatic navigation avoids animated movement and decorative loading animation is suppressed

#### Scenario: Settings focus
- **WHEN** settings opens and is then dismissed by keyboard
- **THEN** focus is managed within the settings interaction and returns to its invoking control

### Requirement: Loading and recovery
Initial loading SHALL present a calm accessible status without fabricated Scripture. Failed requests SHALL offer appropriate retry, passage/day recovery, or translation choice. Missing chapters, invalid URLs, provider failures, and identifiable rate limits SHALL be distinguishable through useful safe messages. Rate-limit guidance SHALL discourage immediate repeated retries. A late response for an inactive passage or translation SHALL NOT replace the currently selected content.

#### Scenario: Out-of-order requests
- **WHEN** a prior passage request resolves after the active passage changes
- **THEN** it cannot replace the active passage's content or saved position

#### Scenario: Provider unavailable
- **WHEN** a chapter request fails
- **THEN** the reader offers a useful safe recovery action while preserving the requested location for retry

### Requirement: Sharing location
The reader SHALL offer a focused share-link action for the current logical location, using native sharing when supported and a copy-link alternative. Sharing SHALL include translation and SHALL not share provider credentials or bulk Scripture text. Native text selection SHALL remain usable. Bulk Scripture export and custom Scripture-copy features are outside this change.

#### Scenario: Share without native support
- **WHEN** native sharing is unavailable
- **THEN** the current canonical location link can still be copied with accessible success or failure feedback
