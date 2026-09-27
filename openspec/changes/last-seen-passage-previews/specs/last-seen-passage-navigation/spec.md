# Spec Delta

## Purpose

Preserve each passage's last-seen reading page visibly throughout horizontal navigation, with bounded background preparation and commit-only activation.

## ADDED Requirements

### Requirement: Horizontal navigation returns to the last-seen page
Leftward and rightward passage navigation SHALL return to the destination's independent last-seen logical reference for the selected day and compatible translation. When destination content is ready, the incoming panel SHALL display the aligned page containing that reference during dragging and settling, and SHALL retain that page and reference after commitment without an introduction flash or scroll jump. Packed and merged identities SHALL retain their addressed logical verse. With no compatible saved reference, the reader SHALL use the existing introduction/first-verse preference. Explicit navigation URLs SHALL continue to take precedence over saved progress.

#### Scenario: Round trip between passages
- **WHEN** the reader leaves A at verse X, reads B to verse Y, then swipes back to A and forward to B
- **THEN** ready incoming panels and committed destinations show the containing pages for X and Y respectively, retaining each logical reference

#### Scenario: Presentation changes
- **WHEN** density, type size, or viewport changes before a return swipe
- **THEN** the incoming passage resolves its saved logical reference against the current fitted page grouping and lands within two CSS pixels of the containing page boundary

#### Scenario: Unvisited or incompatible saved passage
- **WHEN** the destination has no saved reference compatible with the selected translation
- **THEN** its preview and committed presentation use the configured introduction or first-verse default without applying another translation's identity

### Requirement: Daily preparation is bounded and subordinate to reading
The reader SHALL prioritize the active passage, then prepare the next passage and remaining selected-day passages in the background with at most one background request in flight. Ready and in-flight requests SHALL be reused for navigation without duplicate requests for the same content identity. Foreground navigation SHALL take priority over background work. Day or translation changes SHALL cancel obsolete work and reject late results. Background rate-limit responses SHALL suspend further warming for at least the supplied retry delay; access/configuration failures SHALL stop warming for that scope. Background failures SHALL NOT replace or interrupt an available active passage.

#### Scenario: Current passage loads first
- **WHEN** a day is opened
- **THEN** background preparation starts only after the current passage is usable, prioritizes the next passage, and loads only the selected day's bounded plan

#### Scenario: Navigation joins preparation
- **WHEN** the reader navigates to a passage already ready or loading in the background
- **THEN** navigation reuses that data or request and does not wait for unrelated background passages

#### Scenario: Scope changes or rate limit
- **WHEN** the day/translation changes or background work receives a rate-limit response
- **THEN** obsolete results cannot appear in the new scope and no further warming runs during the applicable cooldown

### Requirement: Preview preparation has no reading side effects
Background preparation and inactive panels SHALL NOT write progress, modify history, change focus, or report Scripture display. Inactive panels SHALL remain inert and excluded from the accessibility tree. Only commitment SHALL flush outgoing progress, create one passage-history entry, activate destination focus/location observers, and allow once-per-activation reporting when Scripture is displayed. Browser persistence SHALL contain only preferences and references; Scripture and provider metadata SHALL remain transient memory and SHALL NOT be written to local/session storage, IndexedDB, service-worker caches, or tracked fixtures.

#### Scenario: Cancelled preview
- **WHEN** a prepared destination is revealed by an insufficient, cancelled, or interrupted swipe
- **THEN** the current passage returns with unchanged history and progress, and the preview produces no display report or focus change

#### Scenario: Cached destination activation
- **WHEN** a qualifying swipe commits a previously prepared chapter
- **THEN** one history entry and a fresh activation are created, with reporting governed by actual Scripture visibility rather than the earlier fetch

### Requirement: Unavailable content retains honest recovery
If destination content is not ready, the reader SHALL show a passage-labeled loading placeholder, complete navigation without waiting for background preparation, and restore the saved containing page once content becomes ready. If data becomes ready mid-gesture, the panel SHALL keep its horizontal position and render at the destination's saved page. A loading fallback SHALL NOT fabricate Scripture or reset saved progress. Committed failures SHALL retain safe retry behavior. Bounded ends, native vertical scroll/selection/pinch zoom, reduced motion, and non-gesture navigation SHALL retain the preceding screen-paged contract.

#### Scenario: Slow or failed destination
- **WHEN** a swipe commits before destination data is available
- **THEN** loading or safe retry appears for that passage and a successful load restores its saved page without first displaying its introduction

#### Scenario: Destination becomes ready during drag
- **WHEN** destination data becomes ready while its panel is partially revealed
- **THEN** its saved page replaces the placeholder at the existing horizontal offset without committing progress or navigation
