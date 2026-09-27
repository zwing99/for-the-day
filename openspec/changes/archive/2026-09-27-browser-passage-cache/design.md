# Design

## Context

See proposal.md for motivation. `networkChapterSource` validates full semantic chapters and always fetches with `no-store`; `Reader` fetches on route changes and translation switching. The API returns only `{ chapter }`. DynamoDB independently retains bounded chapters for 24 hours; API.Bible's ignored development response cache is a separate 30-day exception. Existing source tests deliberately verify repeated ESV fetches and absent persistence. `ReadingStorage` contains preferences/references only and must retain that purpose.

The user confirmed reuse must survive reloads/reopening. API.Bible's [FAQ](https://docs.api.bible/common-questions/) permits bounded caching and its [fair-use documentation](https://docs.api.bible/guides/fair-use/) requires display reporting. The newer [licensing reference](https://care.api.bible/article/396-common-licensing-policies) describes a 30-day refresh ceiling; the fixed 24-hour API.Bible browser lifetime is shorter. [Crossway conditions](https://api.esv.org/) limit retained verses and book fractions; the proposed one-hour ESV lifetime stays within those bounds, with this app enforcing a stricter 300-total/200-per-book cap. These references were checked on 2026-09-27; configured edition-specific restrictions must still take precedence.

## Goals / Non-Goals

**Goals:** Put reuse below UI activation, preserve the source injection seam, and make freshness/admission deterministic with an injectable clock and storage boundary.

**Non-Goals:** React Query adoption, service-worker API interception, whole-day/corpus warming, cross-tab network deduplication, indefinite offline Bible availability, or changing server retention. No typography or renderer changes.

## Decisions

### A chapter-source decorator with native storage

Wrap the ordinary network source with a small cache-aware source composed once for the app. Use bounded memory plus IndexedDB for permitted translations. Keep `ReadingStorage` separate. Whole chapters match current API and semantic identities, preserving merged spans and notices without reconstructing verse fragments. Cache keys use public configuration revision, translation, book, chapter, and returned edition/model identities; reading-day is lookup policy rather than Scripture identity.

React Query would still need custom persistence, bounded verse admission, provider eligibility, and exact freshness rules. Native IndexedDB avoids a new dependency and synchronous localStorage writes. HTTP or service-worker response caching would bypass validation and translation policy, so keep existing `no-store` transport and static-only worker behavior.

### Explicit public configuration revision

Expose a credential-free content configuration revision through a small no-store metadata endpoint, derived from configured edition IDs and normalizer/model revisions. Fetch once on app startup when online, never on fresh passage visits or focus. Retain the last observed revision for offline reopening; an offline browser cannot discover a server configuration change. The chapter success envelope includes the serving revision to handle startup/load races. Never admit a result into a newer namespace if its revision differs. A newly observed revision removes incompatible entries and prevents old in-flight results from activating. Existing injected sources can remain unchanged; the network adapter owns envelope metadata through a small internal boundary.

This adds a small startup metadata request, not another chapter request; a hit performs no chapter API or Scripture provider call. FUMS traffic remains required. Starting the browser TTL at successful browser retrieval is intentional and separate from the server's upstream TTL: server expiry does not shorten the requested 24-hour browser reuse window. API.Bible development samples remain a distinct documented exception, not browser records.

### Fixed freshness, bounded admission, and eligibility

Record retrieval and expiry timestamps; expire API.Bible browser records exactly at 24 hours and ESV browser records exactly at one hour. Reject malformed/future timestamps. Reads update eviction recency only and never extend either lifetime. Use one IndexedDB transaction for expired-record removal, whole-chapter LRU eviction, and admission so tabs cannot exceed 400 canonical verses per API.Bible translation. Persistent storage is authoritative for permitted retention; reconcile memory against its manifest before serving so evicted records do not remain indefinitely in another tab's pool. Count merged spans by canonical verse coverage, not rendered pages. Oversized chapters return complete without retention.

ESV uses dedicated browser storage for every chapter returned to the reader for up to one hour from successful browser retrieval, capped at 300 total and 200 per book. Do not use reading-day eligibility to gate browser lookup or admission; server cache eligibility remains unchanged and affects only whether an API miss reaches the provider. Every uncached request still passes through ordinary server and provider validation. Remove expired entries on startup, reads/writes, and scheduled expiry while active; browsers cannot guarantee physical deletion while closed. Persistent failure falls back to bounded memory without preventing network success. Whole-chapter eviction means not every previously loaded chapter can remain when the bound is reached; oversized chapters are returned complete but not retained.

### Shared requests, consumer cancellation, and display reporting

Maintain in-flight records separately from completed data. Share only compatible identity/eligibility-context loads with an internal controller and independently abortable subscribers. Abort transport when no subscribers remain; never persist an abandoned or invalid result. Failed loads leave no successful record and retry uses ordinary safe errors. Reader generation checks continue to prevent obsolete activation.

Cache content only, not activation IDs or display state. A return visit creates a new activation and existing `createDisplayReporter` behavior reports its supplied FUMS token when Scripture is displayed. Offline reporting retains current best-effort failure handling; this change does not add a tracking queue. Focus/reconnect must not trigger chapter refresh. All foreground and future preview requests use the same cache-aware source. The pending `last-seen-passage-previews` scheduler may own warming priority, but must not clear this cache on scope changes or maintain an independent freshness policy. Implement this cache independently without adding preview rendering.

## Risks / Trade-offs

- [Storage eviction or browser deletion causes extra calls] → State the bounded-retention exception and gracefully fetch; never promise durable offline storage.
- [Provider limits differ by edition] → Default to the stricter observed limits and keep persistence eligibility explicit; ESV retention is limited to one hour and its stricter admission bounds.
- [Two cache layers retain data independently] → Preserve each layer's existing bounds; the browser limit does not authorize increasing server or ESV allowances.
- [Old app reopens offline after edition change] → Use last observed revision only within the fixed TTL; document that configuration invalidation requires connectivity.
- [Pending preview changes reinstate conflicting cache rules] → Reconcile overlapping design/spec text before applying or archiving either change, preserving separate activation and cache lifecycles.

## Migration Plan

Introduce public revision metadata and pure policy tests, then storage/source composition and navigation tests, then mocked browser acceptance and README updates. New IndexedDB storage is versioned and contains no tracked Scripture fixtures. Rollback disables the decorator and deletes its dedicated database while leaving preference/reference storage intact. Reconcile the blanket persistence rules only through the deltas in this change; do not hand-edit generated workflow guidance.
