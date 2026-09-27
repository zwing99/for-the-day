# Tasks

## 1. Corpus and semantic contract

- [x] 1.1 Add WEBU/static-provider identity support with tracking none; verify semantic validation accepts WEBU and rejects invalid provider/translation combinations without weakening licensed-edition tests.
- [x] 1.2 Add explicit mise source-refresh tooling, retrieve the engwebu USFX archive, inspect Psalms/Proverbs markup and retain their extracts with provenance/checksums; verify correct edition and complete book coverage, and document the public-domain fixture exception and refresh process.
- [x] 1.3 Implement deterministic offline indexing into revisioned static semantic chapters and a manifest; verify all 181 chapter identities, ordered source text, literary structure, source verse coverage and bidirectional fragment indexes with independent corpus tests, plus invented unsupported-markup failure cases.
- [x] 1.4 Add mise generation/integrity tasks and document them; verify two offline generations produce identical output, missing/stale/corrupt assets fail, and ordinary build/test commands never refresh upstream content.

## 2. Static reader integration

- [x] 2.1 Add manifest/chapter static loading with checksum/schema/identity validation and cancellation, dispatch WEBU before lazy licensed-cache initialization; verify source tests cover missing assets, mismatched revision, corruption, aborted loads and absence of API/metadata/database/tracking calls.
- [x] 2.2 Add WEBU to settings, preferences, route/share validation and translation switching; verify reload/deep-link round trips, approximate mapping when equivalence is unverified, stale-response protection, and unchanged CSB defaults with domain/client tests.
- [x] 2.3 Document and expose database-free frontend development and production static preview through mise; verify WEBU works in both with provider credentials absent and API/database stopped, and record corpus/build sizes and service-worker asset behavior.

## 3. Verification using public-domain content

- [x] 3.1 Extend browser verification to use actual WEBU static assets without external Scripture access; verify short/long content, source headings/poetry, loading/failure recovery, keyboard/accessibility, mobile touch/scrolling and translation return in Chromium/WebKit, documenting the offline corpus workflow.
- [x] 3.2 Add explicit WEBU mode to corpus verse-fit verification; verify it loads only pinned static data while existing CSB mode remains cache-only, and document commands and edition-specific reporting.
- [x] 3.3 Measure the full WEBU Psalms/Proverbs corpus across supported densities, small portrait phones, short landscape, tablet/Split View, larger type and zoom; deliver geometry/reference reports including attached-heading maxima, available space, selected/effective type size, complete fit and legibility, and retain existing configured-CSB regression requirements.

## 4. Integration milestone

- [x] 4.1 Run mise check, production build, offline corpus integrity verification and the relevant browser/layout checks; confirm static-only production reading and unchanged licensed-edition behavior, record unavailable checks, and reconcile artifacts with any measured source or layout limitations before marking implementation complete.
