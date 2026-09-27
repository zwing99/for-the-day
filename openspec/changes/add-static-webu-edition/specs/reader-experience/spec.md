# Spec Delta

## MODIFIED Requirements

### Requirement: Settings and persistent preferences
Settings SHALL provide Today, day selection, passage/day restart, CSB/NIV/NLT/ESV/WEBU selection, system/light/dark appearance, font size, Spacious/Balanced/Compact density, intros on/off, and verse numbers on/off. Initial preferences SHALL be CSB, Balanced, system appearance, normal font size, intros on, and verse numbers on. Preferences SHALL persist across reloads through a small storage boundary. Hiding verse numbers SHALL affect labels only. Invalid or unavailable storage SHALL fall back to valid defaults without breaking reading. Font selection SHALL remain replaceable without changing Scripture or location contracts.

#### Scenario: Preference restoration
- **WHEN** NLT, Compact, dark appearance, larger type, and intros off are selected and the application reloads
- **THEN** those preferences are restored

#### Scenario: Hidden verse labels
- **WHEN** verse numbers are disabled
- **THEN** labels are hidden while verse identities, URLs, text, and navigation remain functional

#### Scenario: Corrupt persistence
- **WHEN** saved preferences contain malformed or unsupported values
- **THEN** valid preferences are retained where possible and invalid values use defaults

#### Scenario: WEBU selection and location
- **WHEN** WEBU is selected, shared at a verse location, and reopened from the link or saved preference
- **THEN** WEBU remains selected and the requested logical location opens using static Scripture assets
