# static-webu-corpus Specification

## Purpose

Provide a faithful public-domain WEBU Psalms and Proverbs corpus for static reading and reproducible offline testing and layout verification.

## Requirements

### Requirement: Pinned faithful corpus
The corpus SHALL contain all 150 Psalms and 31 Proverbs chapters of eBible edition `engwebu`. Its manifest SHALL record source URL, retrieval date, source checksum, edition, semantic schema and normalizer revisions, chapter paths and checksums, and verse indexes. Indexing SHALL preserve exact Scripture characters, meaningful whitespace, headings, titles, poetry lines, indentation, inline semantics and source verse boundaries. Footnote annotation subtrees SHALL be omitted from generated reader content while remaining unchanged in pinned source extracts; text following a footnote SHALL be preserved. Unknown text-bearing structures SHALL be preserved faithfully or fail generation explicitly. The corpus SHALL identify World English Bible Updated and public-domain status with a source link.

#### Scenario: Complete indexed corpus
- **WHEN** the pinned corpus is validated
- **THEN** every supported chapter and source verse is indexed exactly once in source order and all chapter checksums and semantic identities validate

#### Scenario: Structured poetry
- **WHEN** a verse crosses multiple poetry lines or follows a supplied title
- **THEN** indexed content preserves the source text and structure and keeps titles distinct from verse identities

### Requirement: Independent static reading
WEBU SHALL load complete semantic chapters from same-origin versioned static assets in development and production builds without chapter API requests, provider credentials, DynamoDB, external Scripture calls, or FUMS reporting. Licensed-edition API and retention behavior SHALL remain unchanged. Invalid identities, corrupt data, and unavailable assets SHALL produce safe retryable failures without substituting another translation. WEBU assets SHALL use corpus revision isolation rather than licensed-edition expiry and verse bounds. Offline browser reading SHALL require locally available assets; complete offline corpus installation is not promised.

#### Scenario: Credential-free reading
- **WHEN** WEBU is selected with the chapter API and database unavailable
- **THEN** the static frontend displays the requested complete chapter with WEBU identification and no provider tracking

#### Scenario: Invalid asset
- **WHEN** a requested static chapter has the wrong edition, identity, checksum, or semantic structure
- **THEN** the reader rejects it with safe recovery and does not display substituted Scripture

#### Scenario: Local-network HTTP selection
- **WHEN** WEBU is selected from settings on the plain HTTP local-network URL provided by `mise run host`, without SubtleCrypto available
- **THEN** the reader validates static asset checksums and displays the requested WEBU chapter without provider requests

### Requirement: Reproducible offline verification
Ordinary builds, unit tests and WEBU corpus verification SHALL run from committed public-domain source extracts and generated assets without downloading Scripture. Explicit source refresh SHALL be separate from deterministic generation. Verification SHALL detect missing chapters, source-text or structure loss, duplicate or broken verse indexes, stale revisions, and nondeterministic output. WEBU layout verification SHALL measure its entire supported corpus and record edition-specific worst cases and geometry without paid-provider calls. WEBU results SHALL NOT replace configured licensed-edition regression checks.

#### Scenario: Disconnected verification
- **WHEN** WEBU generation, corpus tests and layout verification run without external network access or provider credentials
- **THEN** they use the pinned local corpus and fail clearly on missing data rather than downloading replacements

#### Scenario: Source refresh
- **WHEN** a developer explicitly refreshes the upstream source
- **THEN** source provenance and generated revisions change together and a reviewable integrity diff is produced before adopting the new corpus
