# Proposal

## Why

Provider quotas and storage restrictions make repeatable Scripture verification difficult. A pinned public-domain WEBU Psalms/Proverbs corpus gives the reader a credential-free edition and supplies faithful, reusable offline test and layout data.

## What Changes

- Import and index all 150 Psalms and 31 Proverbs chapters from eBible's `engwebu` edition, preserving exact Scripture and literary structure.
- Publish versioned semantic chapter JSON and a corpus manifest as static browser assets.
- Add WEBU to translation settings, persistence, routes, sharing, and translation switching while retaining CSB as the initial preference.
- Add reproducible offline generation/integrity checks and corpus-based unit/browser/layout verification through mise tasks.
- Permit tracked public-domain WEBU corpus assets and test use explicitly; restricted provider text and metadata remain excluded from tracked fixtures.
- Keep source refresh opt-in; ordinary builds, tests, and reading make no eBible or paid-provider calls for WEBU.

## Capabilities

### New Capabilities

- `static-webu-corpus`: Source provenance, faithful deterministic indexing, static delivery, and offline corpus verification.

### Modified Capabilities

- `reader-experience`: Add WEBU to selectable and persistent translation preferences.

## Impact

Translation and semantic identity validation, browser chapter-source composition, route/storage allowlists, static build assets, verification scripts, unit/browser tests, mise tasks, and developer documentation. WEBU bypasses the chapter API and licensed-provider caches, so existing API translation contracts and retention limits remain unchanged. No cloud infrastructure, new default edition, complete-Bible reader, search UI, or guaranteed offline installation of the entire corpus is included.

Source: https://ebible.org/find/show.php?id=engwebu (public domain; World English Bible naming must identify unchanged text).
