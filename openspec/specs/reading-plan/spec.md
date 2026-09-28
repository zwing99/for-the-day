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
Opening the root URL SHALL select the current day number from the device's local calendar. A fresh root or installed-app launch on a local calendar date different from the last day-following visit SHALL start that date's plan at its first passage and at its beginning, even when the same numeric day was read in a previous month. A day-following app returning to the foreground after the device's local date changes SHALL do the same. Reopening on the same local date SHALL restore that date's reading progress. The reader SHALL allow selection of every integer day 1–31 regardless of the current month's length. Explicit URL state and manual day selection SHALL take precedence over automatic daily starting. A continuously visible reading session SHALL NOT jump at midnight; the Today control SHALL use the current device-local day when invoked.

#### Scenario: Local calendar differs from UTC
- **WHEN** the device's local calendar day is 7 while UTC has reached day 8 and the root URL is opened
- **THEN** day 7 is selected

#### Scenario: Fresh date on launch
- **WHEN** a reader last used the day-following app on local September 7 and launches it on local September 8
- **THEN** day 8 opens at its first passage and beginning rather than resuming day 7

#### Scenario: Repeated day number in a later month
- **WHEN** a reader has saved progress for September 7 and launches the day-following app on October 7
- **THEN** October 7 starts at its first passage and beginning rather than resuming September 7 progress

#### Scenario: Same-date return
- **WHEN** a reader returns to a day-following app on the same local date
- **THEN** that date's saved passage and location are restored

#### Scenario: Foreground after date change
- **WHEN** a day-following app was in the background across a device-local date change and returns to the foreground
- **THEN** the new date's plan opens at its first passage and beginning

#### Scenario: Manual day in a short month
- **WHEN** the reader chooses day 31 during February
- **THEN** the day-31 sequence is available

#### Scenario: Midnight during reading
- **WHEN** the local date changes while a passage remains visible
- **THEN** the current passage and location remain until the reader leaves and returns or explicitly changes them

#### Scenario: Explicit or manual selection
- **WHEN** the reader opens an explicit reading link or manually selects a day
- **THEN** the selected day and location remain in effect instead of an automatic new-day start

### Requirement: Restart scope
The reader SHALL offer restart of the active passage and restart of the selected day's passages. Restart SHALL clear only the corresponding saved locations and return to an intro if enabled, otherwise the beginning of Scripture. Preferences and positions for other days SHALL be preserved.

#### Scenario: Restart passage
- **WHEN** Psalm 67 is restarted on day 7
- **THEN** its saved position is cleared and the other passages' positions remain available

#### Scenario: Restart day
- **WHEN** day 7 is restarted
- **THEN** all day-7 passage positions are reset and reading opens its first passage without changing translation or density
