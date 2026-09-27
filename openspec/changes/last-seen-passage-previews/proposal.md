# Proposal

## Why

Horizontal passage slides are close to the desired interaction, but their loading previews do not show where the reader last stopped. Moving left or right should feel like returning to an independently positioned passage, with the same page visible during the swipe and after commitment.

## What Changes

- Reveal the destination's last-seen aligned page when its content is available, preserving its logical verse rather than restarting at the introduction.
- Reuse transient chapter data for previously visited passages and warm the current day's passages in the background, current passage first, next passage second, then remaining passages sequentially.
- Keep loading previews as an honest fallback, never delay navigation for background work, and preserve safe recovery.
- Keep previews inert and free of progress, history, focus, and display-reporting side effects; activate the prepared page only on commitment.
- Preserve reference-only browser persistence and existing screen fitting, bounded navigation, gesture, and reduced-motion behavior.

## Capabilities

### New Capabilities

- `last-seen-passage-navigation`: Last-seen page continuity across horizontal transitions, supported by bounded transient daily passage preparation.

### Modified Capabilities

None published: `openspec list --specs` reports no main specs. This follows `screen-snapping-passage-transitions` and supersedes its loading-only preview implementation and prohibition on eagerly fetching the day's bounded plan; its other requirements remain controlling.

## Impact

Reader coordinator, chapter-source reuse/scheduling, preview presentation, reading-surface activation boundaries, gesture integration, tests, and reader documentation. No API shape, persisted storage schema, provider expansion, dependency, deployment, or server-cache/TTL changes. Implement after the current screen-snapping change's acceptance work.
