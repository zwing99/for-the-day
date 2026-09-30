# Proposal

## Why

Reader measurement, scroll restoration, and preview readiness can overlap during viewport or font changes, allowing stale positioning or temporarily hidden passage content. Physical Android users report blank passages and intermittent flashes; these timing hazards warrant regression coverage, but their connection to that device failure remains unconfirmed.

## What Changes

- Make layout completion belong to the current passage and layout revision, rejecting obsolete work.
- Recover from temporarily unmeasurable surfaces without requiring another user action or unrelated resize event.
- Preserve visible reading content and current user intent through resize bursts and active scrolling, then align the settled logical page.
- Keep a visible passage or honest loading/retry presentation throughout preview invalidation and committed handoff.
- Add deterministic timing regressions and browser checks using cached or mocked chapters.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `screen-paged-reading`: Define recoverable layout updates and restoration that respects active scrolling and rejects obsolete completion.
- `last-seen-passage-navigation`: Require continuous visible presentation during preview invalidation and passage handoff.

## Impact

Primarily `src/client/reading-surface.tsx`, `src/client/reader.tsx`, and handoff styling in `src/client/styles/transitions.css`, with nearby unit and browser verification. Coordinate shared reader integration with `fix-desktop-trackpad-passage-bounce`; this change does not alter wheel gesture thresholds or momentum classification. No provider, storage, dependency, or infrastructure changes. Simplified-reader settings and the unconfirmed idle-transform rendering hypothesis are outside this change.
