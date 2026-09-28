# Design

## Context

See [proposal.md](proposal.md). The manifest and static-only worker already support installation. The reader has a bounded menu and localStorage-backed preferences and logical locations. The root route uses the device-local day, then the reader replaces the URL with a canonical passage path. Saved active passage and verse locations currently use only the numeric plan day, so they can accidentally revive a prior month's same-numbered day. Existing navigation changes are in progress in `last-seen-passage-previews`; implementation must integrate with that result rather than overwrite it.

## Goals / Non-Goals

**Goals:** Preserve the one-screen Scripture composition, make install controls keyboard and touch accessible, and distinguish a device-local calendar date from a plan day number. Keep explicit links and manual selection authoritative.

**Non-Goals:** Automatic installation, detecting every installation performed from another browser, server-side synchronization, or changing provider/cache behavior.

## Decisions

### Install invitation presentation and eligibility

Use a compact, dismissible invitation in the opening reader view and a persistent Install app action in the menu. Reserve layout space while it is shown; do not overlay Scripture. Keep the invitation independent of passage intros because saved or explicit locations bypass intros. Limit automatic display to supported mobile, secure install-capable contexts and suppress it in standalone display mode (including the iOS standalone signal). Avoid presenting it in the ordinary insecure LAN development host, where the service-worker shell cannot install as intended. Desktop remains outside this invitation.

Android should capture `beforeinstallprompt` when available and call its prompt only from the reader's Install app gesture. If unavailable, show Android browser-menu guidance. iPhone shows Safari Share/Page Menu instructions and a note to keep Open as Web App enabled where offered; a web page cannot invoke that flow. `appinstalled` and standalone display mode suppress the invite when observable. Do not infer that tapping instructions means installation succeeded. Browser install menus can change, so copy should accommodate alternate labels.

An automatic invitation appears on every eligible visit unless suppressed. Store a small versioned invitation record with `remindAfter` and `neverAsk` under the existing browser-storage boundary. A seven-day delay uses elapsed time; reject malformed or future timestamps rather than permanently hiding the invite. The menu's Install app action remains accessible after either dismissal. Settings exposes Never ask again and reversal. If storage is unavailable, keep dismissal for the current session and leave reading functional.

Alternatives considered: a forced first-run dialog would block reading; tying the invitation to the intro would miss returning or deep-linked readers; relying only on the browser's own promotion would not provide iPhone guidance.

### Date-aware daily progress

Use the device's local `YYYY-MM-DD` calendar key, computed from local date components, alongside the existing plan day number. A root or installed-app start enters day-following mode. Record its last active local date and date-scoped active passage and verse positions. On the same date, resume that date's progress. On a changed date, select the first passage with no saved location for that date, so the intro appears when enabled. Other passages on that date also begin fresh until read. Older date-scoped positions remain available for deliberate navigation/history; the existing undated day-number positions remain usable for manual routes and as migration data, but never seed a fresh date's automatic start. Store only dates and logical references, never Scripture.

Track whether the current session follows today separately from its canonical URL, because ordinary reading replaces `/` with a passage path. On visibility return, compare local calendar keys only for a day-following session. If changed, save the outgoing location under its original date and navigate to the new date's beginning. While continuously visible, do not schedule a midnight redirect. Explicit links and manual day selection exit day-following mode until the user selects Today or launches the app/root again. This preserves the existing precedence requirement.

Alternatives considered: clearing all saved positions would destroy useful history; keying by numeric day alone causes the month-repeat bug; a midnight timer would interrupt reading; UTC dates could disagree with the reader's device calendar.

## Risks / Trade-offs

- [Mobile browser capabilities and labels vary] → Use capability checks, short fallback instructions, and device/browser verification.
- [Installed status may not be visible in another browser profile] → Suppress using observable standalone/native install signals; never claim universal install detection.
- [Invitation changes available reading height] → Reserve space, remeasure and verify full verse fit at supported phone sizes, type scales, and densities.
- [Device time or timezone can change] → Evaluate local date on launch/foreground and avoid mutating older date records; accept the device clock as the user's requested guide.
- [Existing undated progress has no calendar identity] → Preserve it for manual navigation; begin the first date-aware automatic reading fresh and then use date-scoped records.

## Migration Plan

Add new browser-storage keys without deleting current positions or preferences. If the feature is rolled back, the old reader continues using the existing undated keys; unknown date and invite keys are inert. No server data migration is needed.
