# WEBU implementation verification

The pinned `engwebu` USFX archive was imported on 2026-09-27. Its exact provenance and checksums are in `corpus/webu/provenance.json`; extracts retain all 150 Psalms, 31 Proverbs and 3,376 source verse identities. The generated revision is `77d4396ba4f48f19ddabd444` (semantic schema 1, normalizer 2). All 121 source footnote annotation subtrees are deliberately omitted from generated reader content under the user's implementation decision; their following text stays exact and the original source extracts retain the annotations unchanged.

## Fidelity and integrity

Independent corpus tests walk pinned XML and compare every chapter's ordered text (excluding annotations), source verse order, titles, poetry text/indentation, word-source attributes, inline emphasis and static identities against actual production JSON. Shared semantic validation checks both directions of every verse/fragment index. Invented unsupported-markup cases fail instead of dropping content. Two offline generations produce identical output. Tests detect missing/corrupt/stale chapter output, stale manifest pins and unexpected old assets. Generation and ordinary build/test paths make no upstream requests.

`mise run webu:update` was exercised against the upstream archive: it reported the supported source unchanged, regenerated all 181 chapters without footnotes and left tracked source provenance unchanged. The separate source-only refresh and offline generation/integrity tasks are documented in the corpus README and developer guide.

Static loading verifies the build-pinned manifest hash/revision and each chapter's hash/schema/edition/passage identity/index before display. Tests reject missing assets, corruption, revision/schema/identity/index mismatch and late cancelled transports, and prove WEBU neither initializes licensed metadata/storage nor admits static chapters to licensed storage. The existing API rejects WEBU before provider access. Preferences, routes and share URLs round-trip WEBU; equivalence remains approximate when unverified. Initial CSB stays the default. Recovery also permits selecting WEBU when initial CSB is pending or failed, clears the previous error and ignores late CSB completion.

## Browser and static-only production

The WEBU suite passed in Chromium and WebKit with actual static assets and external requests blocked. It covered six chapters (Psalms 1, 23, 60, 119, 141 and Proverbs 30) at 320×568, 390×844, 844×390, 820×1180 and 507×768: 60 route/text/geometry/menu cases across both engines. Every rendered Scripture text segment matched the static chapter in exact source order. Checks also exercised keyboard/native scrolling, touch-event passage swipes, Escape focus restoration, reload/deep links, delayed loading, missing-asset retry, approximate translation return and initial licensed-edition failure recovery. Licensed translation return used invented CSB content, with no provider calls. The existing licensed-edition suite separately passed all 40 responsive route/menu cases and recovery.

Playwright MCP also exercised the production build on `preview:static`, with API and external routes blocked: WEBU loaded only its same-origin manifest and requested chapter. The preview task starts no API or database process. Shared user development services were left running and were unreachable through the blocked browser routes; independent source tests also make licensed database initialization throw if reached. No provider credentials are needed by the frontend. Production Psalm 60:1 at 844×390 with larger type was visually inspected: the attached title and full verse fit legibly at 19.87px effective size (selected 28px, scale 0.7097).

The corpus is 21,854,047 bytes uncompressed and approximately 1,851,817 bytes as separately gzipped assets. Chapter payloads span 12,984–1,021,458 bytes. Pinned extracts/license/provenance total approximately 1.38 MB; the browser/API build is approximately 24.28 MB. The browser source retains at most six chapters per session. The production worker's allowlist contains no Scripture paths; it neither installs the full corpus nor guarantees those HTTP assets will be present offline.

## Full corpus layout

`VERSE_FIT_EDITION=WEBU mise run verify:verse-fit` completed 126 full-corpus scenarios in Chromium: seven viewports × three densities × normal/large/larger preferences × 16px/20px root sizes. This is 22,806 chapter/scenario pairs and 401,592 rendered pages, including intro and attribution pages. Every measured page fit vertically/horizontally and used its measured one-screen surface height. The geometry-only [report](verse-fit-report.json) records edition/revision, attached-heading maxima, available space, selected/effective type, complete fit and all shrinking references; it contains no Scripture text. CSS, font and renderer hashes identify the measured implementation. A later error-recovery-only Reader change is disclosed in that report; successful WEBU-first rendering/geometry was unchanged and recovery was checked separately.

Spacious, Balanced and Compact normal-size cases at the standard 16px root needed no verse-page shrinking in any viewport. The minimum effective Scripture size across the entire matrix was 16px in short landscape. At the 20px enlarged root it was at least 20px. The largest attached-heading page was Psalm 60:1 throughout the measured matrix.

| Viewport | Available verse space (height × width) | Selected/effective normal type | Largest attached-heading height |
| --- | --- | --- | --- |
| 320×568 | 507×288px | 17.44 / 17.44px | 396.16px |
| 390×844 | 674×342px | 20 / 20px | 453.38px |
| 430×932 | 762×382px | 20 / 20px | 379px |
| 844×390 | 329×576px | 16 / 16px | 243px |
| 820×1180 | 1010×560px | 20 / 20px | 341.20px |
| 507×768 | 598×459px | 20 / 20px | 379px |
| 1440×900 | 730×560px | 20 / 20px | 341.20px |

These rows show the Spacious, normal-preference, 16px-root maxima; the machine-readable report contains every density/type/root combination. Larger preferences require page-local shrinking on some verses, especially the smallest phone: 320×568 Spacious large shrank seven pages; larger shrank 97 of the 3,376 verse units. Their minimum effective size was 20.66px. This preserves the selected preference and full text instead of promising that every verse can retain a 28px size on a small screen. No packing/typography changes were made to accommodate WEBU.

Root enlargement is automated zoom/type stress, not physical pinch-zoom certification. Physical iPhone/iPad Safari, device accessibility text controls and true pinch zoom were unavailable. Chromium full-corpus measurement plus desktop WebKit browser checks do not establish physical-device behavior. Existing CSB benchmarks remain a separate cache-only regression gate, with no WEBU result used as a substitute.

## Integration gate

### LAN HTTP loading correction

`WEB_HOST=10.13.0.172 BROWSER_EDITION=WEBU mise run test:browser` passed the complete Chromium/WebKit suite on the actual non-secure LAN origin: 60 route/text/geometry/menu cases plus reload, touch, scrolling, loading/retry, translation return and failed-CSB-to-WEBU recovery. Zero external Scripture requests. Offline corpus integrity also passed for all 181 chapters.

Selecting WEBU over the `mise run host` plain HTTP LAN URL originally failed because SubtleCrypto was unavailable. Reproduced through Playwright at the network origin, then added a pure-JavaScript SHA-256 fallback using the already installed Smithy implementation, promoted to a pinned direct dependency. Checksum validation remains mandatory. Two regression tests cover successful loading and rejection of altered bytes without SubtleCrypto. The updated check passes 258 tests, both typechecks, lint and formatting; production build passes. Playwright verified menu selection into WEBU on the LAN development server and production static preview with API requests blocked. No reader geometry or Scripture assets changed.

The final `mise run check` passed 256 tests, both typechecks, lint and formatting. Production build, offline `webu:verify`, strict OpenSpec validation and `git diff --check` passed. The complete WEBU browser suite also passed against the production static preview in both engines. The standing CSB matrix passed all 1,260 cases in Chromium/WebKit, using only existing cached responses and making zero upstream requests; its [geometry/reference summary](csb-regression-summary.json) is retained separately. Existing licensed browser checks and provider/unit behavior remain green. Full licensed-corpus maxima were not remeasured because licensed typography/formatting was unchanged; none of these WEBU measurements replaces that edition's standing regressions.
