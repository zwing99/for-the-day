# Proposal

## Why

Horizontal passage slides are close to the desired interaction, but their loading previews do not show where the reader last stopped. Moving left or right should feel like returning to an independently positioned passage, with the same page visible during the swipe and after commitment.

## What Changes

- Reveal the destination's last-seen aligned page when its content is available, preserving its logical verse rather than restarting at the introduction.
- Reuse chapter data through the shared cache-aware source from `browser-chapter-cache`. Once the current passage is usable, prepare its previous and next passages sequentially so leftward and rightward swipes can reveal the destination's actual saved page whenever content and fitting are ready. Reprioritize those neighbors after navigation; do not warm unrelated passages or exceed the source's retention bounds.
- Keep loading previews as an honest fallback, never delay navigation for background work, and preserve safe recovery.
- Keep previews inert and free of progress, history, focus, and display-reporting side effects; activate the prepared page only on commitment.
- Preserve reference-only navigation persistence and the dedicated browser chapter retention policy and existing screen fitting, bounded navigation, gesture, and reduced-motion behavior.

## Capabilities

### New Capabilities

- `last-seen-passage-navigation`: Last-seen page continuity across horizontal transitions, supported by bounded daily passage preparation through the shared source.

### Modified Capabilities

None. The published `reader-navigation` requirement for independent locations and `screen-paged-reading` requirements for passive previews and unloaded neighbors remain in force; this change adds the ready-neighbor behavior in `last-seen-passage-navigation`.

This follows the archived `screen-snapping-passage-transitions` change. Its loading placeholder remains the fallback for content or layout that is not ready. The published `browser-chapter-cache` retention and in-flight sharing rules continue to govern all chapter reuse.

## Impact

Reader coordinator, chapter-source reuse/scheduling, preview presentation, reading-surface activation boundaries, gesture integration, tests, and reader documentation. No API shape, persisted storage schema, provider expansion, dependency, deployment, or server-cache/TTL changes. The screen-snapping and browser chapter cache changes are archived prerequisites.
