# reading-plan Specification

## Purpose

Provide a predictable Psalms and Proverbs reading sequence for the reader's local calendar day and for any manually selected day number.

## Requirements

### Requirement: Daily passage sequence
The reader SHALL provide, for each integer day d from 1 through 30, Psalms d, d+30, d+60, d+90, and d+120 followed by Proverbs d. Day 31 SHALL contain Psalm 119 followed by Proverbs 31. Passage ordering SHALL remain consistent across translations and densities.

#### Scenario: Ordinary day
- **WHEN** day 7 is selected
- **THEN** the ordered passages are Psalms 7, 37, 67, 97, 127, and Proverbs 7

#### Scenario: All ordinary days
- **WHEN** a plan is requested for any integer day from 1 through 30
- **THEN** it contains exactly the five computed Psalms and the corresponding Proverbs chapter, in that order

#### Scenario: Special day
- **WHEN** day 31 is selected
- **THEN** the ordered passages are Psalm 119 and Proverbs 31

### Requirement: Local day and explicit selection
Opening the root URL SHALL select the current day number in the reader's local calendar. The reader SHALL allow selection of every integer day 1–31 regardless of the current month's length. Explicit URL state and manual selection SHALL take precedence over today's default. A currently open reading session SHALL NOT jump to another plan at midnight; the Today control SHALL use the current local day when invoked.

#### Scenario: Local calendar differs from UTC
- **WHEN** the reader's local calendar day is 7 while UTC has reached day 8 and the root URL is opened
- **THEN** day 7 is selected

#### Scenario: Manual day in a short month
- **WHEN** the reader chooses day 31 during February
- **THEN** the day-31 sequence is available

#### Scenario: Midnight during reading
- **WHEN** the local day changes while a passage is open
- **THEN** the current passage and location remain until the reader explicitly changes them

### Requirement: Restart scope
The reader SHALL offer restart of the active passage and restart of the selected day's passages. Restart SHALL clear only the corresponding saved locations and return to an intro if enabled, otherwise the beginning of Scripture. Preferences and positions for other days SHALL be preserved.

#### Scenario: Restart passage
- **WHEN** Psalm 67 is restarted on day 7
- **THEN** its saved position is cleared and the other passages' positions remain available

#### Scenario: Restart day
- **WHEN** day 7 is restarted
- **THEN** all day-7 passage positions are reset and reading opens its first passage without changing translation or density
