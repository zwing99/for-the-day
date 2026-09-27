# semantic-card-packing Specification

## Purpose

Group semantic Scripture into readable cards according to density and viewport budget without changing text or sacrificing literary structure.

The corrected screen geometry, complete-content fitting, and visible horizontal transitions follow `screen-snapping-passage-transitions` (latest user decision, 2026-09-26). Former proximity/taller-card/no-shrink behavior is superseded; unrelated requirements are retained.

## Requirements

### Requirement: Deterministic packing and fidelity
For the same normalized chapter, density, and layout budget, packing SHALL produce the same ordered cards and logical location ranges. Cards SHALL collectively reference all chapter Scripture text exactly once and in source order. Packing SHALL preserve literary metadata, including line breaks, indentation, stanza/paragraph associations, and headings. It SHALL NOT split a verse merely to reach a target, rewrite text, or remove content. Verse fragments across multiple source nodes SHALL remain part of the same verse unit.

#### Scenario: Repeated packing
- **WHEN** identical inputs are packed repeatedly
- **THEN** card grouping and ordered location ranges are identical

#### Scenario: Verse crosses poetic lines
- **WHEN** one verse occupies several differently indented lines
- **THEN** all its fragments remain together with their line structure intact

### Requirement: Three reading densities
The reader SHALL offer Spacious, Balanced, and Compact, with Balanced as default. Spacious SHALL place one complete verse on each reading card, retaining attached titles/headings and literary associations; a provider-supplied inseparable merged verse span SHALL remain together. Balanced and Compact SHALL group by natural paragraph, stanza, heading, and verse boundaries using actual rendered geometry at the selected typography; estimates MAY seed grouping but SHALL NOT be the final capacity decision. Balanced SHALL target 80% of usable content height and Compact SHALL target 95%, with complete fit in both axes required. A complete first unit that exceeds its density target SHALL remain intact. Natural breaks SHALL be preferred without preventing adjacent compatible units from sharing a page below the target. New section headings and unknown atomic structures SHALL be deliberate grouping boundaries. Compact SHALL use a larger target budget than Balanced. Balanced and Compact SHALL NOT be implemented as fixed verse counts, and identical outputs for short or indivisible content SHALL be valid.

#### Scenario: Spacious
- **WHEN** a chapter contains individually identifiable verses
- **THEN** each Spacious reading card contains one complete verse with its relevant structure

#### Scenario: Natural boundaries
- **WHEN** paragraph or stanza endings provide useful breaks in Balanced or Compact
- **THEN** those breaks are preferred to filling cards with a fixed number of verses

#### Scenario: Very short content
- **WHEN** a chapter contains one short verse
- **THEN** every density produces a deliberate readable card without empty filler cards

### Requirement: Adapt content amount to usable reading space
Balanced and Compact packing SHALL derive their budgets from the actual usable reading-column width and height, typography, and reserved context/attribution space. When a larger viewport increases usable capacity, cards SHALL accommodate more complete natural units where the content permits, while preserving readable line length, literary boundaries, and the selected density. A wider screen alone SHALL NOT force longer lines beyond the reading measure. Spacious SHALL retain its one-verse or inseparable-span rule at every size. Smaller heights, narrowed Split View, and increased font size SHALL reduce the budget appropriately without omitting Scripture.

#### Scenario: Greater tablet capacity
- **WHEN** a long fixture of small complete natural units is packed at the same density and font size with phone and larger tablet reading budgets
- **THEN** Balanced and Compact fit more units on a tablet card where the larger usable budget permits, with all text and boundaries preserved

#### Scenario: Spacious on a tablet
- **WHEN** Spacious is used on an iPad-sized viewport
- **THEN** each reading card still contains one complete verse or inseparable merged span rather than automatically switching density

#### Scenario: Avoidable singleton on a phone
- **WHEN** a Balanced page has one complete verse and the next compatible complete unit can be added within the measured 80% target at the selected size
- **THEN** the units share a page, and further compatible additions are evaluated until the next addition exceeds the target or reaches a deliberate boundary

#### Scenario: Two to four verses fit
- **WHEN** two, three, or four adjacent compatible verses together fit the Balanced target but the next unit does not
- **THEN** the page contains that measured group without shrinking typography to increase its verse count

#### Scenario: Compact capacity
- **WHEN** the same chapter and geometry are settled at Balanced and Compact
- **THEN** Compact uses its larger target and produces no more Scripture pages than Balanced, with identical output permitted where boundaries or indivisible units determine grouping

### Requirement: Measured packing acceptance
Packing acceptance SHALL include an offline before/after audit of all available cached CSB Psalms and Proverbs chapters and invented behavior fixtures. It SHALL record viewport and actual usable geometry, selected and effective typography, ordered reference ranges, page count, singleton frequency, occupied height, and stopping reason. An avoidable singleton means a singleton whose next compatible unit fits its density target at selected size; settled Balanced and Compact output SHALL contain zero such singletons in the audited corpus. Physical iPhone 17 Pro Safari checks SHALL record actual viewport, safe areas, iOS version, browser chrome states, and standalone mode when available. Missing cached chapters or physical-device checks SHALL be reported explicitly and SHALL NOT be claimed as verified. Real Scripture and provider metadata SHALL remain outside tracked verification artifacts.

#### Scenario: Underfill detected despite complete fit
- **WHEN** all pages fit but an eligible singleton's next unit fits within the measured density target
- **THEN** packing acceptance fails and identifies the reference and geometry responsible

#### Scenario: Offline corpus gap
- **WHEN** a required cached chapter is missing or expired
- **THEN** verification reports the coverage gap without fetching the provider and does not claim full-corpus acceptance

#### Scenario: Emulation only
- **WHEN** verification has desktop WebKit evidence but no physical iPhone evidence
- **THEN** the report identifies physical Safari toolbar, safe-area, and zoom checks as outstanding

### Requirement: Headings stay with following text
A heading, Psalm title, or acrostic division SHALL be attached to following Scripture rather than appearing alone at a card's bottom. Consecutive headings SHALL stay in source order. Changing density SHALL affect grouping rather than remove headings or change literary meaning.

#### Scenario: Heading near budget limit
- **WHEN** adding a heading to the current card would leave its following verse on the next card
- **THEN** the heading moves with that following verse

### Requirement: Large literary units and accessible overflow
Oversized natural units SHALL first use valid internal literary boundaries at complete verse boundaries where possible, retaining their parent association. When such a split would cut a verse, inseparable span, or atomic literary structure, the unit SHALL remain intact on one exact usable-height page, using measured page-local typography reduction as needed. Complete content SHALL fit without clipping, removed line breaks, an internal reading scrollbar, or an intermediate settled position. Increased font size and small viewports SHALL not hide content.

#### Scenario: Long paragraph with valid verse boundaries
- **WHEN** a paragraph exceeds the budget and can be separated at complete verse boundaries
- **THEN** its continuation is grouped into consecutive cards that retain the paragraph association

#### Scenario: Very long indivisible verse
- **WHEN** a single verse exceeds the usable viewport budget
- **THEN** its complete text and literary structure fit one aligned page through measured typography reduction before navigation reaches the next page

### Requirement: Repacking preserves logical location
Changing density, font size, or viewport budget SHALL locate the reader's existing logical verse anchor in the resulting cards rather than restore an obsolete card index. Literary formatting SHALL remain intact in every density.

#### Scenario: Density switch midway
- **WHEN** the reader at verse 8 changes from Balanced to Spacious
- **THEN** the verse-8 card becomes visible rather than the eighth card or the passage beginning

#### Scenario: Tablet resize during reading
- **WHEN** the reader at verse 8 rotates an iPad or changes its Split View width
- **THEN** cards repack for the new usable space while verse 8 remains the logical reading location
