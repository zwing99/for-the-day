# Proposal

## Why

Returning to an already loaded passage currently makes another browser-to-API request, even when the server avoids an upstream fetch. Readers should be able to revisit their loaded daily passages for 24 hours, including after reopening the app where translation rules permit.

## What Changes

- Cache complete validated chapters, independently by translation and passage, for a fixed 24 hours for API.Bible translations and one hour for ESV; do not refresh fresh hits on focus, reconnect, navigation, or reload.
- Persist API.Bible chapters in bounded browser storage for 24 hours and every ESV chapter loaded by the reader in dedicated browser storage for one hour, regardless of reading-day eligibility. Enforce ESV's existing stricter verse limits with whole-chapter eviction.
- Preserve exact semantic content, attribution, and FUMS display reporting. Cached permitted chapters are available offline until expiry; uncached or expired passages retain connection-required recovery.
- Deduplicate concurrent loads and degrade safely when browser storage is unavailable.
- Explicitly replace existing blanket browser-persistence prohibitions with this bounded chapter-retention policy. No corpus prefetch or provider expansion.

## Capabilities

### New Capabilities

- `browser-chapter-cache`: Frontend chapter reuse, fixed freshness, persistence policy, bounded admission, and failure handling.

### Modified Capabilities

- `local-pwa-development`: Allow dedicated permitted chapter storage while retaining a static-only service worker.
- `screen-paged-reading`: Permit chapter persistence separately from navigation references without changing transition behavior.

## Impact

The existing `ChapterSource` boundary, client composition, chapter API response metadata, browser storage, source/navigation/FUMS tests, and README offline guidance are affected. A small cache adapter using native IndexedDB is preferred over adding React Query. Server cache eligibility and provider bounds remain in force. Coordinate with the planned transient pool in `last-seen-passage-previews` so scope changes do not discard reusable fresh data or introduce competing loaders.
