# Proposal

## Why

The reader currently permits vertical stops between cards and changes passages only after a swipe ends. The requested reading interaction is a full-screen feed with mandatory settling and a visible horizontal passage slide.

## What Changes

- Make intro and reading pages exactly the usable viewport height and settle vertical scrolling at page boundaries, including restored/shared locations.
- Keep complete verses and indivisible merged spans intact. Reduce grouping before reducing type size; shrink oversized individual pages to fit while preserving all provider text, line breaks, indentation, and headings.
- Research all accessible CSB Psalms and Proverbs using the actual semantic renderer: rank both verse text length and rendered height, including line-heavy verses and attached headings. Establish reference-only regression benchmarks and a standing AGENTS.md verification rule. Revalidate for every newly supported edition.
- Show outgoing and incoming passages sliding with a deliberate horizontal drag, completing or returning on release; preserve bounded navigation, independent positions, safe loading/failure, and reduced-motion behavior.
- Explicitly supersede the earlier unarchived changes' proximity-snap, growing-card, and no-smaller-text decisions. Historical verification remains historical; their delivery must not be mistaken for this new acceptance gate.

## Capabilities

### New Capabilities

- `screen-paged-reading`: Mandatory vertical screen settling, complete-content fitting, measured verse benchmarks, and interactive horizontal passage transitions.

### Modified Capabilities

None: there are no published main specs yet. Related pending capabilities are `reader-experience`, `semantic-card-packing`, and `reading-first-interface`; this change records the behavioral overrides for eventual synchronization.

## Impact

Browser reading surface, semantic packing/rendering, gesture hook/classifier, navigation coordinator, CSS, component/browser tests, and reader documentation. AGENTS.md gains the explicitly requested standing verification rule. No provider expansion, cache/TTL changes, deployment, new fonts, or dependencies are authorized. Provider content used for research remains untracked and credentials stay server-side.
