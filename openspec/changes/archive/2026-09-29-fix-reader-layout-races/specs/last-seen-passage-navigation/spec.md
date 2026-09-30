# Spec Delta

## ADDED Requirements

### Requirement: Passage handoff retains a visible presentation
During preview preparation, invalidation, and committed handoff, the reader SHALL display a usable passage presentation or a passage-labeled loading/retry presentation in the reading region. It SHALL NOT hide both the active passage and its replacement without a visible fallback. Only readiness for the current destination and presentation SHALL complete handoff. Recovery SHALL preserve the destination's logical reference and existing single-commit history, progress, focus, and display-reporting semantics.

#### Scenario: Ready preview invalidated during commitment
- **WHEN** viewport, density, or font changes invalidate a prepared destination as its swipe commits
- **THEN** the reading region retains visible content or the destination's labeled fallback until its current fitted page is ready, then shows the intended page without an introduction flash

#### Scenario: Delayed destination measurement
- **WHEN** committed destination measurement is temporarily unavailable
- **THEN** a visible presentation remains throughout automatic recovery and retry remains available if recovery cannot complete

#### Scenario: Obsolete preview signals readiness
- **WHEN** a previous preview completes after navigation or presentation changes
- **THEN** its completion cannot reveal stale content or finish the current handoff, and the current presentation remains visible

#### Scenario: Interrupted handoff
- **WHEN** Back, Forward, or another explicit navigation interrupts a pending handoff
- **THEN** the newest destination owns the visible presentation and obsolete completion creates no additional history entry, focus change, progress write, or display report
