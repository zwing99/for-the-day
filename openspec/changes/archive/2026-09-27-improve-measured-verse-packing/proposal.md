# Proposal

## Why

Balanced frequently shows a single verse on the user's iPhone 17 Pro despite apparently having room for two to four. Current estimated packing and overflow-only correction do not verify that usable space is being used, so complete-fit checks alone can miss underfilled pages.

## What Changes

- Make Balanced and Compact grouping respond to measured rendered capacity at the selected typography, preserving natural boundaries and complete verse units.
- Establish an offline before/after packing audit that records utilization, singleton frequency, candidate additions, and why each page stops growing.
- Require regression tests for avoidable singletons, faithful poetry/headings, density ordering, stable repacking, and complete fit.
- Verify iPhone 17 Pro Safari geometry and browser chrome states, plus the standing responsive and accessibility matrix; distinguish emulation from physical-device evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `semantic-card-packing`: Measured density targets, growth of underfilled groups, and auditable packing acceptance.

## Impact

Changes target domain packing, the reading surface's measurement/fitting loop, and offline browser verification. Preserve provider text, local position persistence, page snapping, and existing single-unit shrink behavior. No provider downloads are authorized by this proposal; use the existing response cache. Coordinate with `clean-up-reader-css` on geometry ownership. No new dependency or infrastructure is planned.
