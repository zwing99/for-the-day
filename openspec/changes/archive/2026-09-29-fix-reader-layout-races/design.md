# Design

## Context

See proposal.md for motivation. `reading-surface.tsx` debounces resize measurement by 120 ms, sets a shared restoring flag, computes packing asynchronously, and announces readiness after two animation frames. Measurement returns early for missing or zero-sized geometry without scheduling recovery itself. Scroll tracking and the 180 ms settlement fallback consult the same restoring flag. Existing frame cleanup and request abort guards provide protection, but need adversarial ordering coverage; asynchronous code alone is not evidence of a reproduced race.

`reader.tsx` hides the active surface during a prepared handoff; preview readiness can separately become invalid on resize or fitting changes. Existing tests cover interrupted readiness frames and passive previews, but do not establish physical Android paint behavior. Browser emulation has rendered CSB successfully. This design addresses lifecycle correctness without claiming that it solves the physical-device report.

## Goals / Non-Goals

**Goals:** Establish explicit ownership of pending layout work, bounded recovery, gesture-aware restoration, and a visible handoff fallback using the existing reader modules.

**Non-Goals:** New reading modes, Android detection, idle-transform removal, typography redesign, provider/cache changes, or wheel momentum policy changes owned by `fix-desktop-trackpad-passage-bounce`.

## Decisions

### Associate layout work with a revision and passage

Use a local generation token invalidated synchronously when measurement is requested or the passage/presentation changes. Timers, fitting results, and readiness frames must check that ownership before committing. Cancel pending work on replacement and unmount; cancellation and token checks complement one another. Retain existing request identity guards. Prefer this small lifecycle boundary over adding a state-machine dependency or extending arbitrary delays, which cannot establish ownership.

### Make measurement failure recoverable

Keep the last usable presentation during remeasurement. Retry transient zero geometry with a capped, cancellable delayed schedule, using existing resize observation and visibility return to restart recovery when appropriate. Bound each visible recovery episode to two seconds; if still unmeasurable, release transient restoration locks and expose a labeled retry state wherever no usable presentation exists. Retry starts a fresh revision. Do not use an unlimited animation-frame polling loop. A successful measurement must complete tracking recovery even when its numeric budget matches the previous budget. The two-second bound is a recovery policy, not a promise that hidden tabs receive timers on schedule.

### Separate active input from restoration ownership

Track vertical interaction and settlement independently of measurement readiness. Capture the current visible logical page before applying new geometry, and allow active input to update the pending anchor. Defer resize-driven scroll writes until touch and momentum or wheel scrolling settle; use native scrollend with the existing idle fallback, not touchend alone. Explicit navigation replaces the pending anchor immediately. After stable measurement and settlement, perform one current-revision alignment and resume progress tracking. Preserve the existing two-pixel page contract. Freezing an old anchor for the whole resize burst was rejected because it can undo the user's reading movement.

### Give handoff one visible owner

Derive the active/preview/fallback visibility decision together from destination identity and current layout readiness. Do not allow independent hiding rules to leave both content surfaces unavailable. Retain a usable destination presentation when safe; otherwise show its existing passage-labeled placeholder, then safe retry if layout recovery expires. The former passage must not masquerade as the new destination. Current-revision readiness transfers presentation ownership once; obsolete callbacks cannot clear a later handoff. Preserve inert previews, once-per-activation reporting, single history commitment, and focus only for the committed active surface. Simply removing all preview hiding was rejected because it exposes unfitted or incorrectly anchored content.

### Verify adverse ordering explicitly

Extend `tests/unit/client/reading-surface.test.tsx` with controlled geometry, resize callbacks, timers, and animation frames; extend `adjacent-reader.test.tsx` for handoff invalidation and interrupted navigation. Assert observable scroll position, visible presentation, readiness ownership, progress, focus, and history rather than private flag values. Establish which failing sequences reproduce before changing each path; narrow or update the plan if existing guards already satisfy a scenario.

Use Playwright MCP on localhost with WEBU or mocked/cached CSB for real layout and frame-by-frame visibility across resize bursts, font completion, and navigation. DOM-only tests cannot prove painted output. Check Chromium mobile emulation, desktop Chromium, and WebKit where available. Record physical Android verification as unavailable; no emulator result establishes a hardware-specific fix.

## Risks / Trade-offs

- [Delayed alignment feels sluggish] → Coalesce revisions and align promptly after genuine settlement; retain native scrolling throughout.
- [Retry work loops or outlives navigation] → Cap recovery, cancel by revision, and test unmount and hidden/visible transitions.
- [Fallback causes duplicate reporting or focus] → Keep presentation ownership separate from activation and exercise existing side-effect guards.
- [Shared reader code overlaps the trackpad change] → Keep wheel policy out of scope and rerun its integrated navigation scenarios if both changes land.
- [Android blanking is a separate compositor defect] → Report this change as fixing demonstrated lifecycle failures; retain the separate rendering hypothesis for subsequent investigation.

## Migration Plan

No persisted-data migration or new preference. Ship lifecycle and visibility changes together after regression checks. Roll back the implementation as a unit if navigation regresses; existing references and chapter caches remain compatible.
