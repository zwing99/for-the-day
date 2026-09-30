# Spec Delta

## ADDED Requirements

### Requirement: Layout updates recover without overriding current reading intent
The reader SHALL keep available reading content visible during viewport, font, and density updates. Once geometry is measurable and input settles, it SHALL align the page containing the current logical reference within two CSS pixels. Layout work superseded by a newer presentation or passage SHALL NOT change position, readiness, focus, or saved progress. During active vertical input and its momentum, resize-driven restoration SHALL NOT force a return to an older recorded page; settlement SHALL retain the user's resulting logical page. Explicit navigation SHALL retain precedence over prior passage restoration.

#### Scenario: Resize burst during vertical reading
- **WHEN** viewport changes repeatedly while the reader scrolls vertically through pages
- **THEN** available content remains visible, restoration does not interrupt the gesture or its momentum, and after input and geometry settle the resulting page aligns within two CSS pixels without returning to an older page

#### Scenario: Temporary unavailable geometry
- **WHEN** initial or subsequent layout measurement encounters zero available width or height and the surface later becomes measurable
- **THEN** the reader automatically completes layout and restores the intended page without requiring another user action or unrelated resize event

#### Scenario: Prolonged unavailable geometry
- **WHEN** layout cannot complete after bounded recovery attempts
- **THEN** the reader retains available content or an honest loading/retry presentation and does not leave an unexplained blank reading region or permanently disable position tracking after recovery

#### Scenario: Superseded completion
- **WHEN** a font, viewport, density, or passage change supersedes pending layout completion
- **THEN** completion from the older presentation cannot mark the new presentation ready, restore an obsolete position, steal focus, or write obsolete progress

#### Scenario: Navigation during pending restoration
- **WHEN** the reader explicitly navigates while a previous layout restoration is pending
- **THEN** the destination's requested logical reference wins and late work cannot move the reader back to the previous passage or page
