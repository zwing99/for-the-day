# Proposal

## Why

The reader has an installable application shell, but mobile readers have no clear, restrained invitation to put it on their Home Screen. A returning reader also needs a fresh reading when the device's local calendar date advances, including when a day number repeats in a later month.

## What Changes

- Offer an accessible mobile install invitation on the screen opened in a browser, including on the private-network HTTP address printed by `mise run host`. Provide platform-specific installation guidance, a one-week reminder delay, a permanent opt-out that can be changed in Settings, and an honest explanation when an insecure local address cannot install the offline-capable PWA.
- On a new local calendar date, start the day's plan from its beginning on a fresh root/app launch or when a day-following app returns to the foreground; preserve an uninterrupted reading session and explicitly selected or linked passages.
- Keep prior reading locations available for deliberate navigation without letting a previous month's same-numbered day resume today's fresh start.

## Capabilities

### New Capabilities

- `mobile-install-invitation`: Eligibility, presentation, dismissal, and iPhone/Android installation guidance.

### Modified Capabilities

- `reading-plan`: Date-aware fresh start and foreground return behavior using the device's local calendar.

## Impact

Browser reader launch and visibility handling, local preference/position storage, the reader menu and mobile presentation, and browser/component verification. No API, provider, deployment, or new dependency is expected.
