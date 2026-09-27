# Spec Delta

## Purpose

Deliver complete Scripture chapters through one local API while retaining provider text, literary structure, location metadata, attribution, and required usage reporting.

## ADDED Requirements

### Requirement: Unified chapter API
The API SHALL support `GET /api/bible/:translation/:book/:chapter` for CSB, NIV, NLT, and ESV, books PSA and PRO, and valid chapters of those books. CSB SHALL be the initial preference. CSB/NIV/NLT SHALL use API.Bible and ESV SHALL use Crossway. Success SHALL return a complete normalized semantic chapter with translation, provider, chapter identity, location data, attribution, and provider tracking metadata. Optional reading-day and time-zone context SHALL support ESV cache eligibility without changing Scripture identity.

#### Scenario: Translation-independent contract
- **WHEN** a valid Psalm chapter is requested in CSB or ESV
- **THEN** both responses use the same semantic chapter contract and identify the actual translation and provider

#### Scenario: Missing optional cache context
- **WHEN** an ESV chapter is requested with optional reading-day/time-zone cache context omitted
- **THEN** the API returns the chapter through the provider without reading or populating the ESV cache

### Requirement: Semantic structure and exact text
Normalization SHALL preserve every supplied Scripture text segment in source order, with its exact characters, punctuation, capitalization, and meaningful whitespace. It SHALL retain meaningful chapter, heading, title, paragraph, poetry/stanza, line, indentation, verse and fragment boundaries, inline semantics, and organizational identifiers where supplied. A verse SHALL be representable across multiple literary nodes. Unknown text-bearing structures SHALL retain their text and source order or cause an explicit normalization failure; they SHALL NOT be silently dropped. Scripture SHALL NOT be flattened to a verse-and-text list, rewritten, summarized, corrected, or omitted for layout.

#### Scenario: Poetry and split verse
- **WHEN** a provider returns an indented poem with one verse spanning several lines
- **THEN** normalization retains its line order, indentation, verse membership, and exact text without inventing separate verses

#### Scenario: Psalm 119 divisions
- **WHEN** Crossway supplies subheadings and acrostic divisions for Psalm 119
- **THEN** the normalized chapter preserves those divisions and their relationship to the following text

#### Scenario: Unfamiliar structure
- **WHEN** a response contains a previously unsupported text-bearing node
- **THEN** its text is retained in a conservative semantic fallback or the request fails usefully, rather than returning incomplete Scripture

### Requirement: Provider representations and identity
API.Bible content SHALL be requested as whole-chapter structured JSON with meaningful titles and verse identity information. Crossway content SHALL be requested as whole-chapter semantic HTML including headings, subheadings, verse anchors, and required copyright information. Translation-specific IDs, organizational ID ranges or sets, and provider verse identities SHALL remain distinguishable. Crossway verse numbers SHALL NOT be asserted to equal API.Bible organizational IDs without a verified mapping.

#### Scenario: Multiple organizational IDs
- **WHEN** an API.Bible verse span supplies more than one organizational ID or a partial verse suffix
- **THEN** all supplied identity information survives normalization

#### Scenario: Crossway title
- **WHEN** a Psalm HTML response includes a canonical title or subheading
- **THEN** it remains available to the reading renderer and optional intro

### Requirement: Attribution alongside Scripture
The reader SHALL display provider-required translation identification and copyright/attribution alongside displayed Scripture, retain required notices exactly, and provide accessible full notices. ESV displays SHALL identify ESV and include a link to esv.org. Required attribution SHALL remain available with controls concealed and SHALL NOT be replaced by an application-authored paraphrase.

#### Scenario: Minimal chrome
- **WHEN** reading controls are concealed
- **THEN** required attribution remains legible and the full notice can be reached without a gesture

### Requirement: API.Bible view reporting
API.Bible tracking metadata SHALL survive normalization, API serialization, and caching. The browser SHALL report the supplied FUMS token using the provider's required reporting mechanism when that chapter's Scripture becomes displayed, including chapters served from server cache. Prefetch alone and intro-only presentation SHALL NOT report a Scripture view. Re-renders or movement between cards during one continuous chapter display SHALL NOT create duplicate reports. Returning after another passage SHALL constitute a new display. Tracking failure SHALL NOT alter or replace Scripture.

#### Scenario: Cached chapter is displayed
- **WHEN** an API.Bible chapter arrives from cache and its first Scripture card is displayed
- **THEN** its preserved token is reported once for that display

#### Scenario: Fetch without display
- **WHEN** a chapter is fetched but the reader never displays its Scripture
- **THEN** no FUMS view is reported for that fetch

### Requirement: Safe validation and failures
The API SHALL reject unsupported translations/books, non-integer or out-of-range chapters, and invalid supplied cache context before upstream access. Missing chapters, provider access/configuration failures, identifiable rate limits, provider outages, normalization failures, and required cache failures SHALL produce stable safe error codes. Identifiable rate limits SHALL expose a safe retry delay when available. API keys, authorization headers, sensitive URLs, upstream bodies, and inappropriate upstream diagnostics SHALL NOT reach browser errors or logs. A missing provider credential SHALL NOT prevent using another configured provider.

#### Scenario: Invalid chapter
- **WHEN** `/api/bible/CSB/PSA/151` is requested
- **THEN** the API returns an invalid-request error without a provider call

#### Scenario: Provider rate limit
- **WHEN** a provider responds with an identifiable rate limit
- **THEN** the browser receives a rate-limit error and safe retry guidance without the raw upstream body

#### Scenario: Unconfigured ESV
- **WHEN** Crossway credentials are absent but API.Bible credentials are configured
- **THEN** CSB remains usable and ESV requests fail with a safe configuration error
