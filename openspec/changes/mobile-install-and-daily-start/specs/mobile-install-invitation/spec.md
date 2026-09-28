# Spec Delta

## Purpose

Help mobile readers install the existing web app through a quiet, accessible invitation with instructions suited to their device and durable control over reminders.

## ADDED Requirements

### Requirement: Mobile install invitation
On an eligible mobile browser visit, the reader SHALL show a compact install invitation on the screen the reader opens. It SHALL offer Install app, Remind me in a week, and Never ask again without covering Scripture or preventing reading. It SHALL not appear in an installed standalone app or where the app cannot offer a working installation path. It SHALL remain available as an Install app action in the reader menu when relevant, including after an invitation is dismissed.

#### Scenario: First eligible mobile visit
- **WHEN** an uninstalled reader opens the app in a supported iPhone or Android browser without a dismissal preference
- **THEN** the install invitation is visible on that opening screen and reading remains usable

#### Scenario: Installed app
- **WHEN** the reader opens the app from its installed Home Screen icon
- **THEN** the invitation is absent

#### Scenario: Unsupported installation context
- **WHEN** the page cannot offer a working installation path
- **THEN** the reader does not show an automatic install invitation

### Requirement: Reminder choices
The reader SHALL show the invitation on each eligible visit until installation, a seven-day reminder delay, or a permanent opt-out suppresses it. Remind me in a week SHALL suppress it for seven elapsed days; Never ask again SHALL suppress future automatic invitations on that browser. Settings SHALL expose the permanent choice and allow the reader to turn automatic invitations back on. Dismissal state SHALL contain no Scripture or provider content.

#### Scenario: One-week delay
- **WHEN** the reader chooses Remind me in a week and revisits before seven elapsed days
- **THEN** the automatic invitation is absent; after the delay it appears on the next eligible visit

#### Scenario: Permanent opt-out and reversal
- **WHEN** the reader chooses Never ask again
- **THEN** future automatic invitations are absent until the reader changes that choice in Settings

### Requirement: Platform-appropriate installation help
The Install app action SHALL open the browser's native installation prompt when that browser offers one. Otherwise it SHALL give clear, current, platform-specific manual instructions: iPhone Share or Page Menu then Add to Home Screen and Add, and Android browser menu then its install action and confirmation. It SHALL never claim that installation completed until the browser reports or the installed app context establishes that result.

#### Scenario: Android native prompt
- **WHEN** an eligible Android browser offers a native install prompt and the reader taps Install app
- **THEN** that browser prompt opens for the reader to confirm

#### Scenario: iPhone instructions
- **WHEN** an iPhone reader taps Install app
- **THEN** the reader sees concise Add to Home Screen steps appropriate to iPhone without a false one-tap installation claim

#### Scenario: Native prompt unavailable
- **WHEN** an Android browser does not offer an in-page install prompt but provides a menu installation path
- **THEN** Install app shows manual menu instructions
