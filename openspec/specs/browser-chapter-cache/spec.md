# browser-chapter-cache Specification

## Purpose

Avoid repeat browser chapter API requests by reusing faithful, fresh Scripture within translation-specific retention and storage limits.

## Requirements

### Requirement: Fixed-duration chapter reuse
The browser SHALL reuse a successfully loaded complete chapter for the same translation, book, and chapter for at most 24 hours from its successful browser retrieval for CSB, NIV, and NLT, and at most one hour for ESV browser storage. Fresh retained hits SHALL make no chapter API request on passage return, day changes sharing that chapter, translation return, focus, or reconnect. Reads SHALL NOT extend expiry. At or after the applicable expiry the next demand SHALL request the chapter; expired content SHALL NOT be served on failure. Retention limits, invalidation, and unavailable storage SHALL take precedence over reuse. Browser ESV reuse SHALL NOT depend on reading-day eligibility.

#### Scenario: Return to a loaded translation
- **WHEN** a reader loads CSB Psalm 23, changes translation or passage, and returns before expiry while the entry remains retained
- **THEN** the browser displays the retained CSB chapter without another chapter API call

#### Scenario: API.Bible exact expiration
- **WHEN** a retained API.Bible entry reaches 24 hours since retrieval
- **THEN** the next request treats it as a miss and a failed refresh does not display expired Scripture

#### Scenario: ESV exact expiration
- **WHEN** an ESV browser entry reaches one hour since retrieval
- **THEN** the next request treats it as a miss and a failed refresh does not display expired Scripture

### Requirement: Permitted persistence and offline access
CSB, NIV, NLT, and ESV chapters successfully loaded by the reader SHALL survive reloads and app reopening in dedicated browser storage until their translation-specific expiry or required eviction. Fresh retained content SHALL be usable offline until expiry or eviction. Browser ESV lookup and admission SHALL NOT depend on reading-day eligibility; the separate server-side ESV cache eligibility policy remains unchanged. Missing, expired, or uncacheable chapters SHALL retain safe connection-required recovery. ESV storage SHALL be limited to one hour and remain within the existing conservative verse bounds. Storage read/write failures SHALL leave online reading usable and permit bounded in-memory reuse.

#### Scenario: Reopen offline
- **WHEN** the cached application shell opens offline with a fresh retained CSB, NIV, NLT, or ESV chapter
- **THEN** that chapter displays faithfully without a chapter API call

#### Scenario: Browser storage unavailable
- **WHEN** persistence is blocked or its quota is exhausted
- **THEN** successful network reading remains usable and retained ESV chapters remain available until expiry or eviction

### Requirement: Bounded translation policy
Browser caches SHALL enforce a maximum of 400 retained canonical verses per API.Bible translation across retained memory and persistent entries, counting duplicate copies once and merged spans by their covered canonical verses. Whole chapters SHALL be evicted least-recently-used before admission exceeds the bound; oversized chapters SHALL be returned complete without retention. Concurrent tabs SHALL NOT exceed persistent admission bounds. Expired or incompatible entries SHALL be physically removed on cache startup and subsequent maintenance while the app is active; no background execution while the app is closed is promised. ESV browser retention SHALL use the conservative 300-total/200-per-book verse limits regardless of reading-day eligibility; whole-chapter LRU eviction SHALL maintain these bounds. ESV reading-day eligibility SHALL continue to govern only the separate server-side chapter cache. Browser requests for uncached ESV chapters SHALL still use the ordinary API and provider access checks.

#### Scenario: ESV reuse across reading days
- **WHEN** an ESV chapter retained by the browser is requested on a different reading day before its one-hour expiry
- **THEN** the browser reuses it without an API request, regardless of server cache eligibility for that day

#### Scenario: ESV whole-chapter eviction
- **WHEN** admitting another ESV chapter would exceed the browser verse bound
- **THEN** least-recently-used whole chapters are evicted until the new chapter fits, or the chapter is returned without retention if it cannot fit by itself

#### Scenario: Bounded whole-chapter admission
- **WHEN** another chapter would exceed a translation's browser verse bound
- **THEN** whole retained chapters are evicted before admission and Scripture is never truncated

### Requirement: Integrity and compatibility
Retained chapters SHALL preserve exact provider text, structure, line breaks, indentation, verse identities, attribution, and tracking metadata. Cache lookup SHALL validate identity and semantic schema and isolate translation, book, chapter, configured edition, and incompatible content revisions. A public content-configuration revision SHALL be available to the browser without exposing credentials; incompatible entries SHALL never satisfy a hit once the browser has observed that revision. Corrupt entries SHALL be discarded safely.

#### Scenario: Corrupt or incompatible stored chapter
- **WHEN** persisted data fails validation or belongs to a different observed edition or content revision
- **THEN** it is removed and the requested chapter is loaded through the ordinary source

### Requirement: Shared loads and display lifecycle
Concurrent requests for the same compatible chapter and eligibility context within one app instance SHALL share a single chapter API request. Cancelling one consumer SHALL NOT cancel other consumers; abandoned work SHALL NOT activate stale content. Failed loads SHALL NOT be cached and SHALL remain retryable. Cache hits SHALL create ordinary fresh display activations and retain existing FUMS reporting on actual Scripture display, including return visits; caching SHALL NOT suppress required tracking or report previews as displays.

#### Scenario: Shared load with one cancelled consumer
- **WHEN** two consumers request the same chapter and one cancels
- **THEN** the remaining consumer receives the chapter from one API request and the cancelled consumer cannot activate it

#### Scenario: Return visit reporting
- **WHEN** a cached API.Bible chapter is displayed after another passage
- **THEN** the new display reports its retained FUMS token according to the existing reporting contract without fetching the chapter again
