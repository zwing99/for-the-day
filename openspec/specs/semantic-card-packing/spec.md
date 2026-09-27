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
The reader SHALL offer Spacious, Balanced, and Compact, with Balanced as default. Spacious SHALL place one complete verse on each reading card, retaining attached titles/headings and literary associations; a provider-supplied inseparable merged verse span SHALL remain together. Balanced and Compact SHALL group by natural paragraph, stanza, heading, and verse boundaries using text length and an approximate usable viewport budget. Compact SHALL use a larger target budget than Balanced. Balanced and Compact SHALL NOT be implemented as fixed verse counts, and identical outputs for short or indivisible content SHALL be valid.

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
