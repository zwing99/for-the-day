# Tasks

## 1. Revision and translation policy

- [x] 1.1 Add credential-free content configuration revision metadata and chapter envelope revision; verify API tests cover edition/normalizer changes, safe serialization, and no upstream calls for metadata. Document the startup-only metadata request in developer/API guidance.
- [x] 1.2 Keep server-side ESV eligibility policy intact and add/reuse pure canonical verse accounting for browser admission; verify server regressions still cover circular boundaries, short months, time zones, and invalid context, while browser unit tests cover 300-total/200-per-book bounds independently of reading-day eligibility without Docker or provider calls.

## 2. Bounded browser storage

- [x] 2.1 Implement a versioned chapter repository with injectable clock/storage and native IndexedDB persistence for API.Bible and ESV chapters; verify exact 24-hour API.Bible expiry, exact one-hour ESV expiry across reloads, non-sliding reads, identity/schema validation, revision invalidation, metadata fidelity, and ESV reuse independent of reading-day eligibility using invented fixtures.
- [x] 2.2 Implement transactional 400-verse per-translation LRU admission, whole-chapter eviction, startup/active expiry cleanup, and bounded memory fallback; verify concurrent storage admission, merged-span accounting, oversized rejection, cross-tab eviction reconciliation, corruption, and unavailable/quota-limited storage. Document retention exceptions and cleanup while closed.

## 3. Source and reader integration

- [x] 3.1 Add the cache-aware source decorator and shared-load cancellation handling; verify one network request for concurrent consumers, independent cancellation, no abandoned-result activation/admission, failure retry, and ESV browser reuse across reading days with fake clocks while server eligibility remains unchanged.
- [x] 3.2 Compose one reusable source for navigation and translation switching; verify return visits, same chapter across reading days, reload restoration, focus/reconnect avoidance, revision/load races, and preservation of saved references/history in component/source tests.
- [x] 3.3 Verify actual cached Scripture activations preserve FUMS return-visit reporting while intros/previews remain unreported; retain service-worker tests excluding API/FUMS response caching and update README with permitted offline chapters, one-hour ESV persistence, and storage limitations.
- [x] 3.4 Reconcile overlapping planning assumptions with `last-seen-passage-previews` before either implementation/archive introduces a competing pool or clears this cache; verify both plans retain the shared source and separate content/activation lifecycles, without implementing preview features here.

## 4. Integrated acceptance

- [x] 4.1 Exercise localhost in Playwright with mocked provider/API data and recorded chapter request counts: passage/translation return, reload/reopen, offline fresh hit and expired miss, storage failure, ESV reuse across reading days and one-hour persistent reuse, short/long content, mobile touch/scroll, and accessible failure recovery. Verify two tabs respect ESV and API.Bible persistent admission bounds and record results without live provider calls.
- [x] 4.2 Run `mise run check`, `mise run test`, and `mise run build`; report results and unavailable browser targets. Confirm no text/formatting/typography change, real Scripture fixtures, credentials, or unrelated changes enter the implementation diff; run standing cached fit verification if implementation changes rendering or geometry.
