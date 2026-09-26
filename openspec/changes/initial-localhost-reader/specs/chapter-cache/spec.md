# Spec Delta

## Purpose

Reduce repeated provider fetches with a local server-side chapter cache that preserves content fidelity, isolates identities, and respects freshness and provider storage constraints.

## ADDED Requirements

### Requirement: Whole-chapter cache identity and integrity
The local API SHALL use DynamoDB Local for its server-side cache. Cache identity SHALL isolate translation, book, and chapter and invalidate incompatible model or provider-edition revisions. Cached data SHALL represent a complete normalized chapter, including attribution, formatting, IDs, and FUMS metadata. User preferences and reading positions SHALL NOT be stored in DynamoDB.

#### Scenario: Translation isolation
- **WHEN** Psalm 23 is cached for CSB and requested for NIV
- **THEN** CSB data cannot satisfy the NIV request

#### Scenario: Chapter isolation
- **WHEN** Psalm 23 is cached and Psalm 24 or Proverbs 23 is requested
- **THEN** the requested chapter has a distinct cache identity

#### Scenario: Metadata round trip
- **WHEN** a normalized chapter is written and read
- **THEN** its text, semantic structure, identities, attribution, and provider tracking metadata are unchanged

### Requirement: Freshness independent of physical deletion
Entries SHALL expire approximately 24 hours after successful upstream retrieval. At or after their application expiration time they SHALL NOT satisfy a fresh read even if DynamoDB has not removed them. A fresh eligible hit SHALL avoid provider access. A miss, incompatible revision, or stale entry SHALL fetch and normalize the whole chapter before storing a replacement. This change SHALL NOT serve expired Scripture as a fallback to provider failures.

#### Scenario: Fresh hit
- **WHEN** an eligible compatible entry is requested before expiration
- **THEN** the chapter is returned without a provider fetch

#### Scenario: Expired item still exists
- **WHEN** an entry is requested at its expiration timestamp and remains physically present
- **THEN** it is treated as stale and the provider is called

#### Scenario: Refresh failure
- **WHEN** the provider fails while replacing an expired entry
- **THEN** the API returns a safe failure without presenting the expired entry as fresh

### Requirement: ESV day eligibility
ESV cache reads and writes SHALL be allowed only when a valid requested reading day belongs to the requested passage's reading plan and its circular distance from the current day in the reader's supplied valid local time zone is at most five. Distance SHALL be `min(abs(readingDay - currentLocalDay), 31 - abs(readingDay - currentLocalDay))`, wrapping on the fixed 1–31 reading-day cycle even in shorter calendar months. Ineligible requests SHALL bypass both existing cache reads and cache writes while returning the complete upstream chapter. Eligibility SHALL be re-evaluated on every request independently of the 24-hour expiration.

#### Scenario: Boundary included
- **WHEN** the reader's current day is 15 and ESV is requested for a passage in the day-10 or day-20 plan with valid context
- **THEN** that request is cache-eligible

#### Scenario: Beyond boundary
- **WHEN** the current day is 15 and the requested ESV reading day is 9 or 21
- **THEN** the provider is called even if a fresh cache entry exists and the response is not cached

#### Scenario: Forward wrap
- **WHEN** the current day is 30
- **THEN** reading days 25–31 and 1–4 are eligible, including day 3, while days 5 and 24 are ineligible

#### Scenario: Backward wrap
- **WHEN** the current day is 1 and ESV is requested for the day-31 plan
- **THEN** the request is eligible for caching

#### Scenario: Short calendar month
- **WHEN** the current day is February 28
- **THEN** eligibility still follows the 31-position reading cycle rather than changing its cycle length to 28

#### Scenario: Chapter shared between plans
- **WHEN** Psalm 119 is requested in the day-29 plan and again in the day-31 plan
- **THEN** each request's eligibility is evaluated using its selected day while chapter identity remains ESV/PSA/119

#### Scenario: Local time zone
- **WHEN** UTC and the reader's time zone have different day numbers
- **THEN** eligibility uses the reader's local day, computed using the current server instant

### Requirement: Provider storage bounds
Eligible caches SHALL remain within provider storage allowances through whole-chapter eviction and explicit removal of expired or no-longer-eligible ESV entries. Expiration metadata alone SHALL NOT be considered physical removal. Concurrent writes SHALL NOT exceed a configured provider verse budget. ESV SHALL remain below the 500-verse and half-book ceilings, with no persistent frontend Scripture cache. Responses SHALL remain complete when a chapter cannot be cached; partial chapter caching SHALL NOT be used.

#### Scenario: Eligible window exceeds capacity
- **WHEN** requests within the five-day window would exceed the ESV storage budget
- **THEN** whole cached chapters are evicted before admitting another chapter and every response remains complete

#### Scenario: Eligibility changes
- **WHEN** a cached ESV chapter no longer belongs to any eligible day in the current request context
- **THEN** it is physically removed during cache maintenance before further ESV admission

#### Scenario: Concurrent admission
- **WHEN** two eligible chapter writes compete for the final available verse budget
- **THEN** admission remains within the budget rather than allowing both unchecked writes

#### Scenario: Oversized cache record
- **WHEN** a complete chapter cannot fit the cache's record limits
- **THEN** the full chapter is returned without storing truncated content
