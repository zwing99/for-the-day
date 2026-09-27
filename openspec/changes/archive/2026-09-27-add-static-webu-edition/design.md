# Design

## Context

See proposal.md for motivation. The existing SemanticChapter contract restricts translation to CSB/NIV/NLT/ESV and provider to api-bible/crossway. ChapterSource is a browser boundary; browserChapterSource wraps API loading with licensed-edition storage and fetches server configuration metadata. Translation allowlists also occur in route and preference validation. Current verse-fit verification is CSB-specific and uses the ignored API.Bible response cache. Vite builds the browser independently of the Hono listener.

eBible's edition page (https://ebible.org/find/show.php?id=engwebu) explicitly identifies WEBU as public domain and offers USFM, USFX, HTML and other downloads. WEBU uses LORD/GOD in the Old Testament; do not accidentally import the Classic WEB edition.

## Goals / Non-Goals

**Goals:** Reuse the existing semantic renderer and chapter boundary; make source-to-index fidelity independently verifiable; isolate WEBU from licensed retention and server availability.

**Non-Goals:** Full-text search, additional books, default-edition migration, service-worker bulk corpus installation, cloud deployment, or refactoring unrelated reader packing changes.

## Decisions

### Pin structured source and retain reproducibility inputs

Use the edition page's USFX archive as the structured import source; retain only Psalms/Proverbs source extracts and source/license provenance in a dedicated tracked WEBU corpus directory. Keep the downloaded full archive under ignored local storage, recording its checksum and exact URL. Retain the extracts' checksums for offline reproduction. XML preserves literary structure better than verse-per-line or read-aloud formats. Implement a focused importer that handles the actual supported-book markup and fails on unhandled text-bearing structures; inspect those source files during the import task. The importer reuses the existing jsdom XML parser during tooling only; no parser dependency is added and no XML parser enters the browser bundle. Refresh uses the system unzip command; generation and integrity checks use only pinned extracts. No runtime parsing of XML in the browser.

Footnotes are deliberately excluded from generated reader content, as directed during implementation. Skip each USFX `f` subtree, including its reference and annotation text, while retaining its following tail text exactly. Preserve footnotes in the pinned source extracts for provenance and reproducibility. Independent fidelity checks compare Scripture and literary structure excluding these annotation subtrees; no footnote controls are added.

Explicit mise refresh downloads the source; separate generation and integrity tasks never use network access. Initial import is performed during apply, not this proposal. Review source changes and compare deterministic generated output before adopting refreshes.

### Generate static semantic chapters and a manifest

USFX inspection confirmed `q` poetry, `d` titles, `p` paragraphs/book headings, `w` word metadata and `qs` inline emphasis, plus verse start/end markers and stanza breaks. All 181 chapters and 3,376 source verses are retained. Preamble navigation metadata stays in the source extracts; book titles are retained on chapter one. The 121 annotation subtrees are excluded under the explicit footnote decision above.

Emit one validated JSON chapter per book/chapter under a corpus-revision directory in Vite public assets, plus a manifest containing chapter hashes, source verse identities/indexes and provenance. Derive revision from source extracts, schema and normalizer version; stable IDs derive from source location. Generated files and public-domain extracts are committed. The manifest is an address/index structure, not a user-facing search feature. Hash verification and identity/schema validation reject corrupted or mixed versions. Preserve supplied text without editorial repair; preserve meaningful markup as semantic nodes. Source markers define verse membership, including any title conventions or combined spans.

Extend semantic identity with WEBU and an explicit static provider discriminator. WEBU has tracking kind none; do not represent it as API.Bible or Crossway. Do not assert organizational verse equivalence across editions without verified mapping; existing approximate translation switching remains the fallback.

### Dispatch before licensed cache initialization

Compose ChapterSource so WEBU goes directly to the static manifest/chapter source and other editions use the existing cached API source. Initialize licensed metadata/storage lazily when a licensed edition is requested; WEBU must not wait for /api/content-configuration. Support AbortSignal and stale-selection safeguards. Use revision-specific static URLs and bounded per-session reuse; do not admit WEBU to existing licensed caches or apply their expiry/bounds. Browser HTTP asset caching may help offline reading, but all-corpus offline availability is outside scope. Existing service-worker policy excludes all Scripture JSON from precache and interception. Bind the browser build to the exact manifest checksum and revision in a generated TypeScript pin so mixed manifests fail before selecting a chapter. Retain at most six validated chapters per session. Licensed storage also rejects static admission explicitly.

The existing unified API remains limited to its four editions. A WEBU API endpoint and DynamoDB repository would duplicate static delivery with unnecessary service dependencies.

### Use production assets as verification data

Checksum verification uses native SubtleCrypto where available and the existing Smithy pure-JavaScript SHA-256 implementation on plain HTTP LAN origins used by `mise run host`. Promote the already installed `@smithy/core` version to a pinned direct dependency rather than introduce another hashing package or bypass integrity checks. Browser verification accepts `WEB_HOST` to exercise a real non-secure LAN origin as well as localhost.

Corpus tests read the same manifest/chapter assets the browser serves and compare them against pinned structured extracts. Test all chapter indexes and independently compare source text order and meaningful structure; hashes alone cannot prove normalization fidelity. Keep small invented fixtures for malformed-source failure coverage. The repository's blanket exclusion of real Scripture fixtures needs a narrow documented public-domain WEBU exception; restricted CSB/NIV/NLT/ESV samples remain ignored.

Extend verse-fit verification with an explicit WEBU edition mode that loads static chapters and uses the actual semantic renderer. Scan all 181 chapters to find measured maxima, including attached headings, across default/all densities, small portrait, short landscape, tablet/Split View, larger type and zoom. Record available space, selected/effective size, complete fit and legibility. Keep CSB mode cache-only and its existing benchmarks intact. Coordinate with improve-measured-verse-packing without changing its proposed geometry or treating WEBU maxima as CSB proxies.

## Risks / Trade-offs

- Source markup/verse conventions differ from API.Bible → preserve source identity, validate every chapter, and use approximate cross-edition mapping unless proven.
- Public-domain assets increase repository/build size → retain only two books, split chapter payloads, and report actual size before completion.
- Stable hashes can conceal importer omissions → compare independent source text and structure inventories, not only regenerated hashes.
- Existing tasks start Docker → document a WEBU-only frontend workflow using dev:web and add a database-free production static preview task if the current task cannot provide it.
- Offline caching may retain an old release → revision-specific asset URLs prevent mixing; missing assets fail safely without automatic upstream fallback.

## Migration Plan

Add corpus tooling/assets first, then WEBU contract and static loading, then settings/routes and verification. Existing persisted preferences remain valid; CSB stays default. Update developer docs and the narrow fixture exception. Rollback removes WEBU selection/assets and restores unsupported WEBU preferences through existing validation defaults; licensed caches remain untouched.
