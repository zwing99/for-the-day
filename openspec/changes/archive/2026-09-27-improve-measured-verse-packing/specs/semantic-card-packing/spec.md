# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
