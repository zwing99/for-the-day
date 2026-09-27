# Spec Delta

## Purpose

Provide complete Scripture on vertically snapping viewport pages and direct horizontal passage slides, with measured typography acceptance based on real provider formatting.

## ADDED Requirements

### Requirement: Vertical scrolling settles on complete screens
The reader SHALL use pages equal to the actual usable reading viewport, excluding quiet chrome and safe areas. After vertical touch, wheel, trackpad, keyboard, or programmatic navigation settles, a page boundary SHALL align with the viewport within two CSS pixels; the reader SHALL NOT remain between screens. Intro and end-of-passage presentation SHALL respect this sequence. Passage ends SHALL remain bounded without automatic passage changes. Resizing, restoration, and density changes SHALL align the page containing the logical verse, rather than place that verse midway in the viewport.

#### Scenario: Partial vertical drag
- **WHEN** a reader releases a vertical drag between two pages
- **THEN** the feed settles to a complete page without overlapping adjacent pages at rest

#### Scenario: Restored packed verse
- **WHEN** an explicit or saved verse belongs to a grouped page
- **THEN** that entire page is aligned and the addressed verse identity is retained

### Requirement: Complete Scripture fits each reading page
Pages SHALL retain complete verses and inseparable merged spans, provider text, line breaks, indentation, heading associations, and literary order. Balanced and Compact SHALL reduce grouping at valid complete-verse boundaries before shrinking text. An indivisible oversized page SHALL reduce its rendered typography only as much as required to fit both available height and width. It SHALL NOT continue onto another screen, clip text, remove lines, or introduce an internal reading scrollbar. Fit adjustments SHALL NOT overwrite the selected font-size preference. Ordinary pages SHALL use the selected size; default typography SHALL fit the measured real CSB worst-case benchmarks without per-page shrinking in supported portrait phone viewports.

#### Scenario: Line-heavy verse
- **WHEN** a verse with many preserved poetic lines exceeds the usable page
- **THEN** the intact verse and its attached headings fit through a page-local type adjustment

#### Scenario: Group exceeds capacity
- **WHEN** a grouped page contains separable complete verses that do not fit
- **THEN** grouping decreases before typography shrinks

### Requirement: Provider-based worst-case typography verification
Typography acceptance SHALL measure all accessible Psalms and Proverbs verses in each supported edition with the faithful renderer, ranking verse-only rendered height, attached-heading page height, preserved line count, and text length separately. Regression references SHALL include each book's tallest verse, tallest heading-attached page, longest text, and most-line candidates, including ties. Verification SHALL cover default settings, all densities, small phones, short landscape, tablet/Split View, larger type, and text/pinch zoom. Measurements SHALL record edition, viewport, font, available space, effective size, and complete-content fit. Published benchmarks SHALL contain references and geometry only, with real Scripture/provider metadata confined to ignored research artifacts or transient memory. Unavailable editions/devices SHALL be reported rather than assigned an unverified global maximum.

#### Scenario: Typography change
- **WHEN** a font, spacing, packing, viewport, or renderer change is proposed
- **THEN** the standing benchmark checks establish complete fit and preserved formatting before acceptance

### Requirement: Horizontal passages follow deliberate drag
After a deliberate horizontal gesture is distinguished from vertical scrolling, the outgoing passage SHALL follow the drag while an adjacent passage panel is revealed. A qualifying release SHALL complete one directional slide and navigate exactly once; an insufficient, cancelled, or out-of-bounds gesture SHALL return to the current passage without committing history or position changes. No wraparound SHALL occur. Vertical/ambiguous diagonal gestures, selection, multi-touch, zoom, controls, and an open dialog SHALL NOT initiate passage navigation. Horizontal trackpad input and non-gesture alternatives SHALL retain bounded navigation and coherent directional transitions.

#### Scenario: Partial horizontal drag
- **WHEN** a reader drags horizontally without reaching the commit threshold
- **THEN** the neighboring panel is visibly revealed during the drag and the current panel returns on release

#### Scenario: Completed leftward drag
- **WHEN** a leftward swipe qualifies and a next passage exists
- **THEN** the next panel finishes entering from the right and one passage-history entry is committed

### Requirement: Transitions preserve reading state and accessibility
Transition previews SHALL NOT write the destination's saved progress, steal focus, or report a Scripture display. Inactive panels SHALL be excluded from the accessibility tree and keyboard order. Independent passage positions, outgoing flush, URL push/replace policy, stale-response rejection, native selection, zoom, and menu focus SHALL remain intact. Neighbor loading SHALL use a passage-labeled placeholder without fabricated Scripture; failures SHALL provide safe recovery. Reduced motion SHALL avoid animated sliding and spring-back while preserving navigation. Browser persistence SHALL remain preferences and references only.

#### Scenario: Unloaded adjacent passage
- **WHEN** a swipe reveals a destination whose content is not ready
- **THEN** a labeled loading panel appears and safe recovery remains available if loading fails

#### Scenario: Reduced motion
- **WHEN** reduced motion is enabled
- **THEN** passage navigation completes without sliding animation and reading state remains correct
