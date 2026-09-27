# reader-navigation Specification

## Purpose

Make passages effortless to navigate while retaining independent logical locations across passage changes, URLs, browser history, preferences, and translation changes.

The corrected screen geometry, complete-content fitting, and visible horizontal transitions follow `screen-snapping-passage-transitions` (latest user decision, 2026-09-26). Former proximity/taller-card/no-shrink behavior is superseded; unrelated requirements are retained.

## Requirements

### Requirement: Native vertical navigation
Vertical movement SHALL navigate cards within the current passage using native browser scrolling with mandatory page snapping and complete usable-height pages. The reader SHALL use one active vertical scroll surface and SHALL NOT require a nested two-dimensional scroll surface. Reading past the last card SHALL remain in the current passage until explicit passage navigation. Oversized indivisible cards SHALL fit complete content using measured page-local typography reduction, with no intermediate settled positions or internal reading scrollbar.

#### Scenario: Vertical reading
- **WHEN** the reader scrolls upward through a Psalm
- **THEN** subsequent complete pages in that Psalm settle at viewport boundaries without changing passages

### Requirement: Deliberate horizontal passage navigation
A clearly horizontal leftward swipe SHALL select the next passage and a rightward swipe SHALL select the previous passage. Predominantly vertical and ambiguous diagonal gestures SHALL NOT change passages. Multi-touch, cancelled gestures, text selection, and gestures on controls SHALL NOT trigger passage changes. The sequence SHALL have bounded ends without wraparound. Native vertical scrolling and zoom SHALL remain available. A deliberate horizontal drag SHALL reveal an adjacent passage panel while moving the outgoing panel; qualifying release SHALL complete the slide and one navigation, while cancellation or insufficient movement SHALL return without a history change. Reduced motion SHALL suppress animated sliding.

#### Scenario: Clear horizontal swipe
- **WHEN** a deliberate leftward swipe is completed while reading Psalm 37 on day 7
- **THEN** Psalm 67 becomes active

#### Scenario: Vertical or diagonal gesture
- **WHEN** a gesture is predominantly vertical or lacks clear horizontal dominance
- **THEN** the active passage is unchanged

#### Scenario: Final passage
- **WHEN** a leftward swipe is completed in Proverbs 7 on day 7
- **THEN** the reader remains in Proverbs 7

### Requirement: Non-gesture alternatives
The reader SHALL provide focusable previous/next passage controls, direct passage selection, and keyboard navigation. While the reading surface is focused, ArrowLeft/ArrowRight SHALL change passages and ArrowUp/ArrowDown or PageUp/PageDown SHALL advance within the passage appropriately. Shortcuts SHALL not intercept editing, settings interaction, selection, or native zoom. All navigation SHALL be available without touch gestures.

#### Scenario: Keyboard passage change
- **WHEN** ArrowRight is pressed with focus in the reading surface
- **THEN** the next passage is selected and its location restored

### Requirement: Independent persistent locations
The reader SHALL remember a logical position independently for each selected day and passage. Returning to a passage SHALL restore that position rather than restart it. Position persistence SHALL contain references and preferences, not Scripture text. Logical position SHALL be independent of density, font, viewport, and card index. Storage failure SHALL leave reading usable within the current session.

#### Scenario: Independent positions
- **WHEN** positions A, B, and C are reached in Psalms 7, 37, and 67 and Psalm 7 is selected again
- **THEN** position A is restored

#### Scenario: Reload
- **WHEN** a saved passage is reopened without an explicit verse URL
- **THEN** its logical saved position is restored

### Requirement: Addressable Scripture locations and precedence
URLs SHALL encode selected day, book, chapter, and a stable logical verse location, with optional translation and organizational identity context. The numeric location in `/7/psalm/67/3` SHALL mean displayed verse 3, not card 3. A canonical shared URL SHALL include translation so another reader's preference cannot reinterpret the verse. An intro SHALL have an explicit address. Explicit URL state SHALL override saved position; otherwise saved passage position SHALL override the intro or first-verse default. Invalid paths, days, passages outside the selected plan, and invalid verse anchors SHALL produce a useful recovery state without silently opening an unrelated location.

#### Scenario: Shared URL
- **WHEN** a canonical day-7 Psalm-67 verse-3 URL with an explicit translation is opened
- **THEN** that translation and logical location are displayed even if local storage contains another location

#### Scenario: Missing saved position
- **WHEN** a valid passage is selected without a verse URL or saved position
- **THEN** it opens its intro if enabled, otherwise its first Scripture card

#### Scenario: Invalid route
- **WHEN** `/7/psalm/23/3` is opened
- **THEN** a recovery state explains that the passage is outside the day-7 plan and offers a valid route

### Requirement: Browser history synchronization
Explicit day, passage, translation, and direct-location changes SHALL create useful browser history entries. Ordinary vertical reading SHALL replace the current location entry so each card does not require a separate Back action. Back/Forward SHALL restore route-driven translation, passage, and location after data and cards are ready. Restoration SHALL not generate additional navigation entries or be overwritten by an active-card observer during restoration.

#### Scenario: Back after passage change
- **WHEN** the reader advances through several cards, changes passage, and presses Back
- **THEN** the previous passage and its last location are restored in one Back action

#### Scenario: Popstate restoration
- **WHEN** Forward selects a different logical location in an already mounted reader
- **THEN** the scroll position updates to that location and remains synchronized with the URL

### Requirement: Translation location mapping
Changing translation SHALL preserve day and active passage and SHALL retain the logical verse location whenever representable. Mapping SHALL use organizational IDs, merged/split ranges, and verified provider mappings where available. It SHALL NOT universally equate displayed verse numbers across translations. If an exact mapping is unavailable, the reader SHALL select a verified nearest location when available, otherwise use the same displayed verse as an explicitly approximate fallback; if that verse is absent it SHALL use the closest available verse in chapter order. A quiet accessible notice SHALL indicate approximation. Mapping SHALL not reset reading to the beginning except when that is the only available location. Failed switching SHALL leave the previous successful translation/location usable.

#### Scenario: Psalm numbering differs
- **WHEN** a current verse maps to a differently numbered target verse via organizational identity
- **THEN** the target's corresponding verse is shown rather than copying its numeric label blindly

#### Scenario: Mapping unavailable
- **WHEN** no exact or verified nearest mapping exists
- **THEN** the conservative fallback is applied and identified as approximate

#### Scenario: Switch failure
- **WHEN** the newly requested translation fails to load
- **THEN** existing Scripture and location remain available with retry or another translation choice

#### Scenario: Sparse Crossway correspondence
- **WHEN** only a first-verse Crossway correspondence is verified and a different unmapped verse has the same displayed label in the target edition
- **THEN** that same-label location is selected with an approximation notice rather than treating the sparse correspondence as proof of the nearest mapped verse
