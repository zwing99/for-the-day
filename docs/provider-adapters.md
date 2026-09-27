# Provider adapters and development verification

The local listener wires CSB, NIV, and NLT to their configured API.Bible edition IDs and ESV to Crossway. Provider credentials and interpretation stay on the server. An unconfigured edition returns a safe configuration error without preventing another configured edition from working. The reader menu switches these licensed translations and static WEBU while preserving the active day, passage, and logical verse. WEBU bypasses these server adapters and uses pinned same-origin assets; it has no tracking and unverified cross-edition mappings remain approximate.

API.Bible uses whole-chapter JSON and retains source attributes, exact text, organizational identities, attribution, and V3 FUMS metadata. The second normalizer revision explicitly recognizes `cl` chapter titles, `qa` acrostic divisions, and `li1`–`li3` indented literary lines observed in the saved NIV/NLT responses. Chapter cache keys isolate editions and normalizer revisions. The ignored 30-day raw-response development cache survives those revisions, so re-normalization does not require another upstream request.

Crossway uses whole-chapter HTML with headings, subheadings, verse numbers/anchors, and full copyright. The adapter parses an AST, decodes entities once, preserves literary text and indentation, and distinguishes serialization whitespace between blocks from meaningful inline whitespace. Audio, footnotes, cross-references, external CSS, and surrounding-chapter navigation are suppressed by request options. Returned copyright paragraphs are retained in order as the full attribution notice, with an ESV link. Unknown text-bearing elements remain conservative groups; incomplete or ambiguous chapter identities fail safely.

## Inspected identity metadata

Saved Psalms 23, 60, 119 and Proverbs 30 responses were inspected for each of NIV, NLT, and ESV. These are observed identities for the configured editions, not a universal numbering rule:

| Chapter | Complete verses | Crossway anchor for printed verse 1 | NIV/NLT organizational identity for printed verse 1 |
| --- | ---: | --- | --- |
| Psalm 23 | 6 | `19023001` | `PSA.23.1` |
| Psalm 60 | 12 | `19060001` | `PSA.60.3` |
| Psalm 119 | 176 | `19119001` | `PSA.119.1` |
| Proverbs 30 | 33 | `20030001` | `PRO.30.1` |

The Psalm 60 superscription explains why copying printed numbers into organizational IDs is incorrect. Crossway nodes retain their own numeric anchors and deliberately have no invented API.Bible organizational IDs. The mapping boundary applies only these four inspected first-verse correspondences, in both directions, for the configured NIV (`78a9f6124f344018-01`) and NLT (`d6e14a625393b4da-01`) editions. Other Crossway anchors and editions remain unverified and use an explicitly approximate fallback.

## ESV cache and browser lifetime

The browser sends `readingDay` and its IANA `timeZone` with the active chapter request. The repository uses its server clock to compute that zone's current day. Cache reads and writes require both context fields, chapter membership in that day's plan, and circular distance at most five on the fixed 31-position cycle. Missing context, an older ineligible day, or a passage outside that plan returns provider content without reading or populating the ESV cache. Psalm 119 is checked independently for day 29 and day 31.

The ESV manifest is shared across normalizer revisions, uses conditional transactions, and admits at most 300 verses total and 200 per book. Chapters remain atomic: oldest whole chapters are evicted, oversized records bypass storage intact, and maintenance physically removes expired, incompatible, and newly ineligible records. These conservative budgets reserve room for one active browser chapter under the supported-book storage limits. Time-zone maintenance can reduce another zone's hit rate; it cannot make an ineligible request use cached content.

The network chapter source has no chapter cache or background prefetch. Reader activation clears its previous result, cancels the departing request, and unmounts the previous reading surface. Returning to an ESV passage makes a new request; the eligible server cache may satisfy it. Browser persistence contains references and preferences only. API requests use `cache: no-store`; no Scripture enters localStorage, IndexedDB, or Cache Storage through these modules.

## Verification

`mise run verify:provider-samples` checks existing ignored responses offline: exact source/normalized/rendered text, attribution, tracking metadata where applicable, and complete verse counts. It makes no provider requests. Raw samples are prerequisites and are never tracked.

The block-8 browser check replayed these saved chapters through Playwright MCP while intercepting every chapter request. Across 216 cases, complete cards fit in every density at 320×568, 390×844, 768×1024, 844×390, and 375×1024, plus larger type at 320×568. Default minimum effective type was respectively 17.44, 20, 20, 16, and 20px; minimum scales were 1. Larger type had a minimum scale of 0.6265 and effective size of 17.54px. Available surface heights were 524, 738, 918, 346, and 918px. A 200% text check preserved the addressed ESV location and `pan-y pinch-zoom`; native page magnification reached 2 without changing that location. Tablet presentation was visually reviewed.

The earlier full-corpus scan covered 181 chapters and 3,376 indexed verses per edition before the final API.Bible style mappings. It is historical coverage; the final mapping revision was checked against representative source shapes, not another live full-corpus download. Further exhaustive measurements must reuse saved responses or have an explicitly approved request budget. Physical iPhone/iPad Safari and WebKit verification remain later gates.

The user accepted occasional measured shrinking for a handful of oversized pages on the smallest devices. The previously measured ESV Psalm 57:1 with attached headings at 320×568 uses scale 0.9436, 16.45px effective type, and 491.52px literature height on a 524px page. Ordinary pages keep the selected size, and fitting never changes that preference or removes text.

## Translation switching and alignment

Supplied organizational sets, inclusive ranges, and partial verse IDs take precedence over printed labels. An overlapping merged or split identity selects its representable target location in chapter order. Verified Crossway bridges remain separate from provider-supplied metadata. If exact correspondence is absent, a nearest supplied/verified organizational location takes precedence; otherwise the same printed label is approximate, then the nearest available numbered location (source order for nonnumeric labels). A polite visible status identifies every approximate match; this is not an exhaustive versification database.

Switching loads only the requested chapter while existing Scripture stays usable. Success flushes the outgoing position, pushes one translation-bearing URL, restores the mapped verse, and persists the selected translation. Failure preserves the successful chapter, URL, and preference, with retry and other translation choices. Rate-limited retry waits for the supplied delay. Passage navigation, history navigation, a replacement switch, and unmount cancel pending switches. Shared explicit translation URLs override the saved preference for that session without changing it merely by being opened.

Block 9 verification: 196 unit/component tests; Playwright MCP tested all four translations at verse 2, explicit-link reload, Back/Forward, failure retention and retry, and reference-only persistence using invented chapters. Saved NIV→ESV chapter replay checked Psalms 23/60/119 and Proverbs 30 with the approximate notice across every density at 320×568, 844×390, and 768×1024 (36 cases). All complete cards fit; minimum effective type 15.10px, minimum scale 1, and minimum page height 325px with the notice visible. No upstream Scripture requests were made. Browser replay suppressed tracking; existing reporter tests cover display reporting. Physical Safari remains a later verification gate.
