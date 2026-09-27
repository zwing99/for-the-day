# Tasks

Playwright MCP Chromium and installed Playwright WebKit have completed automated browser checks through block 12. The earlier tool failure/recovery is recorded in [browser-verification-todo.md](browser-verification-todo.md). Physical iPhone/iPad Safari was unavailable to automation; remaining device checks are explicitly recorded in [visual and accessibility verification](../../../docs/visual-accessibility.md).

## 1. Toolchain and localhost environment

- [x] 1.1 Pin Bun, supported Node LTS, and repository CLI tooling in `mise.toml`; establish a single Bun manifest/lockfile and separate browser/server TypeScript configurations; verify `mise install`, lockfile installation, and typecheck task discovery.
- [x] 1.2 Scaffold React/Vite and a separately constructed Hono app with a Node-compatible local listener and Vite `/api` proxy; verify a localhost page and safe health response through the proxy, plus server execution under the pinned Node runtime.
- [x] 1.3 Add repository `compose.yml` with the official pinned AWS DynamoDB Local image, localhost endpoint, persistent volume, dummy credentials, and idempotent table initialization; verify `mise run db:start`, `db:init`, repeated initialization, and `db:stop` without AWS access.
- [x] 1.4 Expose setup/dev/test/check/build/preview and focused test/lint/format/lifecycle tasks through mise without duplicated competing workflows; document ports, Docker prerequisites, shutdown, and task purpose; verify discoverability and that dev cleans up child processes.
- [x] 1.5 Add safe `.env.example` for provider keys, translation edition IDs, local DynamoDB, and ports; protect actual environments and ignored provider samples using reviewed gitignore.io templates if `.gitignore` changes; verify setup preserves existing credentials, the example stays tracked, and the initial browser build contains no server secrets.

## 2. Reading plan and eligibility domain

- [x] 2.1 Implement pure ordered plans for every day 1–30 and the day-31 exception with strict input validation; add table-driven tests covering all days and exact day-7/day-31 output; verify via the focused domain suite.
- [x] 2.2 Implement current-local-day resolution and circular ESV day eligibility on the fixed 31-position cycle, including chapter membership and injected clock/time-zone context; verify tests for every day pair, inclusive ±5 boundaries, day 30 → 25–31/1–4, day 1/31, February, and UTC/local-day differences.
- [x] 2.3 Document day defaults, explicit selection precedence, midnight behavior, and ESV circular eligibility in developer/domain documentation; verify examples match the tested domain outputs.

## 3. Semantic model and initial CSB adapter

- [x] 3.1 Implement the semantic tree, verse-fragment index, attribution/tracking contracts, runtime validation, and complete-verse extraction without React dependencies; verify invented-text fixtures cover paragraphs, poem lines/indentation, titles, headings, split/merged verses, partial IDs, and exact ordered text conservation.
- [x] 3.2 Implement the API.Bible adapter for the configured CSB edition using whole-chapter JSON and V3 FUMS metadata; verify mocked fetch tests for request options, cancellation, semantic/ID preservation, unknown text-bearing nodes, missing token, and safe access/rate-limit/provider failures without live requests.
- [x] 3.3 With developer-supplied credentials, inspect ignored real CSB Psalm 23, a titled/indented Psalm, Psalm 119, and a Proverbs chapter; document endpoint generation, structural mappings, edition access, and any corrected design assumptions; verify exact text/structure against the source locally and commit only invented-text equivalents for regression coverage. If access is unavailable, report this gate as incomplete rather than substitute bundled Scripture.

## 4. DynamoDB chapter service and first real Scripture milestone

- [x] 4.1 Implement the chapter repository boundary and DynamoDB Local whole-chapter storage with schema/edition-aware keys, injectable clock, 24-hour application expiry, lossless serialization, and oversized-record bypass; verify isolated integration tests for write/read, translation/book/chapter isolation, retained expired items, incompatible revisions, and metadata/text equality.
- [x] 4.2 Add conservative API.Bible cache admission/whole-chapter eviction and explicit expiry maintenance behind the repository, with conditional admission where needed; verify capacity and physical-removal integration tests and document local cache behavior.
- [x] 4.3 Connect the chapter service to cache lookup/miss/refresh and provider adapters, with fresh-hit provider avoidance and process-local deduplication; verify unit tests with repository/provider fakes and DynamoDB integration tests proving that fresh cached CSB avoids provider access.
- [x] 4.4 Expose validated Hono chapter responses and safe typed error/status handling with no-store browser headers; verify request tests for invalid inputs without provider calls, missing chapters, rate limits, configuration/cache failure, and redaction of upstream secrets/details; document the API contract.
- [x] 4.5 Add the small browser chapter-source boundary, faithful semantic React renderer, and simple complete-verse cards for CSB; implement visible attribution and the FUMS display adapter; verify component tests for exact text/structure, cached-token reporting, intro/prefetch suppression, StrictMode deduplication, and loading/retry states.
- [x] 4.6 Verify the first runnable milestone: `mise run dev` displays a real CSB Psalm via provider → Hono → DynamoDB Local → normalized chapter → React, and a repeated request uses cache; inspect poetry/attribution/FUMS behavior against the ignored source, run focused suites/check/build, and document the smoke-check result without committing Bible text or credentials.

## 5. Native vertical reading surface

- [x] 5.1 Adapt hn-tok's native vertical overflow/viewport/snap pattern independently, with phone-first fluid layout, exact usable-height pages, safe areas, bounded tablet reading measure, and measured complete-content page fitting; verify phone/iPad portrait/landscape/Split View cases for short content, a very long verse, larger text, complete-content fitting, and mandatory page settling.
- [x] 5.2 Implement active logical-location detection using semantic markers and a reading-line strategy, including fitted oversized pages and mandatory settled-page alignment; verify component/browser tests that the active verse remains correct after page fitting, restoration, and settled snapping without depending on a fixed whole-card visibility ratio.
- [x] 5.3 Add focusable previous/next card behavior, reduced-motion handling, and accessible loading/content markup; verify keyboard navigation and semantic reading order through Playwright's accessibility tree and document the hn-tok source/commit inspiration and differences without copied source. Live VoiceOver/screen-reader testing is not a completion gate for now.

Block 5 completion reconciles the existing implementation with [the archived screen-page acceptance](../archive/2026-09-26-screen-snapping-passage-transitions/integrated-acceptance.md) and [reader documentation](../../../docs/reading-surface.md). For 5.2, the newer screen-page contract takes precedence: semantic markers retain the addressed verse within its aligned containing page. Chromium verification covers responsive fit, restoration, settling, keyboard focus, reduced motion, and accessibility-tree order. The selection-shortcut correction additionally passed fresh Chromium checks, all 146 unit/component tests, type/lint/format checks, and production build. WebKit and physical Safari remain unavailable and are not claimed verified.

## 6. Passage navigation, URLs, and independent restoration

- [x] 6.1 Implement strict route parsing/generation for root/day/passage/verse/intro routes and translation-bearing shared links; verify round trips and invalid day/book/chapter/verse syntax, partial labels, and outside-plan recovery without permissive index clamping.
- [x] 6.2 Add versioned guarded preferences/position repositories with memory fallback, storing logical per-day/per-passage locations and active-passage hints; verify corruption/unavailable-storage tests, translation/density preference retention, and absence of Scripture text in persisted records.
- [x] 6.3 Implement the navigation/restore coordinator with explicit-URL → saved → intro/first-verse precedence, outgoing position flush, cancellation, observer suppression, and push/replace/popstate policy; verify independent A/B/C passage locations, reload, shared links, Back/Forward in an already mounted reader, and out-of-order response rejection.
- [x] 6.4 Implement the pure horizontal classifier and thin event hook preserving `pan-y pinch-zoom`; verify clear left/right navigation, bounded ends, vertical/diagonal rejection, cancellation, multi-touch, controls/text-selection exclusions, and visible drag/return/commit transitions and at most one change per gesture.
- [x] 6.5 Connect previous/next/direct passage controls and scoped keyboard shortcuts to the same coordinator; verify all passages can be reached without gestures, form/settings keys are not intercepted, and native selection/zoom remain usable and every reading stop aligns to a page; document URLs, history behavior, and restoration scope.

## 7. Semantic packing, densities, and formatting

- [x] 7.1 Implement deterministic text/line-budget estimation and complete verse units retaining literary paths; verify stable output for repeated inputs and conservation of all ordered text leaves/fragments without duplicating chapter text into cards.
- [x] 7.2 Implement Spacious one-verse/atomic-span cards and Balanced/Compact natural-unit grouping with distinct budgets; verify tests for every density, paragraph/stanza boundaries, poetry indentation, headings, very short content, and outputs that are not fixed verse counts.
- [x] 7.3 Implement heading attachment, parent-preserving long-unit continuations at valid verse boundaries, and indivisible oversized page-local type fitting; verify no orphan headings, verse splitting, omitted text, clipping, internal reading scrolling, or midway settled stops across representative fixtures.
- [x] 7.4 Connect stable quantized budgets from actual reading-column width/height and typography, with repacking around the current logical anchor; verify increased Balanced/Compact grouping on larger usable tablet budgets, unchanged Spacious behavior, and location/preference preservation across density/type-size/rotation/Split View changes; document adaptive packing invariants and refinement knobs.

## 8. Remaining providers and bounded ESV caching

- [x] 8.1 Extend the API.Bible adapter to configured NIV and NLT editions without provider behavior in UI modules; verify request/contract tests, edition-aware cache isolation, and configured-versus-unconfigured translation behavior; inspect ignored representative responses and add invented-text structural fixtures for actual differences.
- [x] 8.2 Implement Crossway whole-chapter HTML requests and server-side AST normalization with verified headings/subheadings/verse anchors/poetry/indentation/copyright mappings; verify mock-based text conservation and structural tests including Psalm-119-shaped divisions, merged/partial identities, entities, and safe failures.
- [x] 8.3 With Crossway credentials, inspect ignored real representative Psalms and Proverbs responses, validate supported chapter/book verse counts and required attribution, and record verified location correspondences; verify normalized/rendered structure locally and commit only invented-text fixtures and identity metadata. Keep this gate incomplete if credentials are unavailable.
- [x] 8.4 Enforce ESV circular ±5 eligibility on cache reads and writes using server-clock/IANA-zone context, with omitted context and outside-plan requests uncached; verify unit/integration tests for boundary/wrap/local-time cases, fresh-entry bypass outside the window, and Psalm 119 in both day-29/day-31 plans.
- [x] 8.5 Implement conservative ESV total/per-book budgets, manifest revision checks, atomic whole-chapter admission/oldest eviction, and explicit expired/no-longer-eligible deletion; verify isolated DynamoDB tests for metadata retention, fresh-hit provider avoidance, physically retained expiry, concurrent conflicts, and capacity that cannot grow with repeated day requests.
- [x] 8.6 Ensure the browser retains only active ESV chapter data without background ESV chapter prefetch or persistent Scripture caching; verify passage changes release inactive ESV data and all provider content remains out of browser persistence; document ESV cache context, circular policy, budgets, and uncached older-day behavior.

## 9. Translation location continuity

- [x] 9.1 Implement location mapping using organizational sets/ranges/partial IDs and verified Crossway correspondences, keeping printed labels distinct from canonical identity; verify tests for superscription offsets, merged/split verses, exact mappings, and absent organizational metadata.
- [x] 9.2 Implement explicit approximate same-label/nearest-location fallback and an accessible quiet notice without a beginning reset; verify tests where numbering differs or a target verse is absent and confirm fallback is never presented as exact.
- [x] 9.3 Connect translation switching to retained day/passage/location, preference persistence, URL history, and failure rollback; verify browser tests switching all four translations mid-passage, reloading explicit translation links, and leaving successful Scripture usable after a failed switch; document mapping guarantees and limits.

## 10. Passage context, settings, and presentation controls

- [x] 10.1 Add optional intro cards using provider title references, a non-gesture Begin action, saved-progress precedence, and explicit intro URLs; verify tests for no fabricated titles, disabled intros, retained canonical headings, and return-to-progress behavior.
- [x] 10.2 Add subtle persistent passage labels, direct ordered passage indicators with non-color active state, and discoverable minimal controls/attribution; verify phone/iPad/desktop layouts, safe-area placement, focusability, and lack of overlapping Scripture.
- [x] 10.3 Add a mobile settings dialog with appropriate tablet bounds for Today/day/restart, translation, system/light/dark, font size, density, intros, and verse labels through the repositories; verify preference/default persistence, scoped passage/day resets, local-midnight Today behavior, form labels, dismissal, focus return, and portrait/landscape/Split View usability.
- [x] 10.4 Add self-hosted licensed open-source Scripture typography and replaceable CSS/font-size/measure tokens; verify the font license is retained, switching tokens requires no domain changes, and short/long poetry remains faithful/readable in both themes.
- [x] 10.5 Add canonical link sharing with Web Share and copy-link fallback while preserving native text selection; verify translation-bearing location links, success/failure announcements, unsupported APIs, and no bulk Scripture/credential sharing; document controls and browser persistence.

Block 10 verification is recorded in [the reader guide](../../../docs/reading-first-interface.md#block-10-verification--2026-09-27) and [typography measurements](../../../docs/reading-surface.md#source-serif-4-verification--2026-09-27). The user explicitly approved saved samples and known worst-case references instead of a fresh full-corpus scan for this font change. All 594 offline fit cases passed, using no live Scripture or tracking requests. Safe-area CSS inputs were simulated; physical Safari/WebKit checks remain block 12. Native sharing was mocked, so no links were externally transmitted.

## 11. PWA application-shell foundation

- [x] 11.1 Add manifest, mobile/install metadata, and appropriately sized icons with built-app localhost preview support; verify manifest/icon responses, standalone foundation, and deep-link preview behavior through `mise run build` and `mise run preview`.
- [x] 11.2 Add versioned static-shell/font/asset service-worker caching with explicit API/provider/FUMS exclusions and development registration controls; verify browser tests prove that no Scripture response is in Cache Storage, IndexedDB, or localStorage and hot reload is not masked by a stale worker.
- [x] 11.3 Add shell-only offline recovery and non-disruptive version activation/cache cleanup; verify cached-shell deep links offline, connection-required Scripture states, and updates without forced mid-reading reload; document supported PWA behavior and the absence of offline Scripture guarantees.

Block 11 verification is recorded in [PWA behavior](../../../docs/pwa.md#block-11-verification--2026-09-27). Chromium verified static-only storage, offline deep links/retry, waiting updates/cleanup, and same-origin dev worker retirement using invented mocks. No live Scripture/tracking requests were made. Physical installation and the iPhone status-bar correction need device confirmation in block 12.

## 12. Visual and accessibility refinement

- [x] 12.1 Refine editorial typography/spacing, quiet context/controls, and loading/failure/rate-limit recovery with phones as the primary target, covering 320/390/430px phones, short landscape, iPad-sized 768×1024/820×1180/1024×1366 viewports and landscape counterparts, narrowed Split View, and desktop; verify comfortable line lengths, adaptive content amount, and short/long Psalms/Proverbs in all densities, and record visual review results.
- [x] 12.2 Complete contrast, visible focus, semantic reading order, 44px primary targets, reduced motion, text/pinch zoom, dialog focus, and accessible recovery refinements; verify automated accessibility checks plus keyboard and Playwright accessibility-tree review without weakening valid tests. Live VoiceOver/screen-reader testing is not a completion gate for now.
- [x] 12.3 Exercise realistic touch scrolling, horizontal/diagonal gestures, selection, safe areas, dynamic browser chrome, rotation, tablet Split View resizing, and long content in WebKit and physical iPhone/iPad Safari when available; verify logical-position continuity and record results, explicitly reporting any physical-device check that could not be run.

Block 12 verification is recorded in [visual and accessibility verification](../../../docs/visual-accessibility.md). Chromium and WebKit passed 702 combined offline layout cases, targeted accessibility audits, keyboard/focus/recovery checks, and logical continuity across viewport changes. Browser checks found and corrected WebKit Escape focus restoration and undersized native select controls, plus menu overflow at 200% text size. No live Scripture or FUMS requests were made. Physical Safari was unavailable to automation; native iPhone/iPad touch, browser chrome, PWA status/blur, and actual Split View limits are explicitly reported rather than claimed verified.

## 13. End-to-end readiness verification

- [ ] 13.1 Run the documented new-developer sequence `mise install` → `mise run setup` → credential configuration → `mise run dev`, including idempotent setup and graceful missing-Docker/provider guidance; verify a genuinely usable localhost reader without an AWS account and correct any setup documentation drift.
- [ ] 13.2 Run `mise run check`, full unit/component tests, DynamoDB Local integration tests, browser verification, production build, and Node compatibility checks; verify all suites pass and document any unavailable external/manual verification without counting it as complete.
- [ ] 13.3 Perform an opt-in real-provider smoke review for all four translations, exact formatting/text conservation, cached FUMS displays, wrapped ESV eligibility/eviction, shared URLs/history, and position preservation; review built bundles/persistent caches/tracked files for secrets or copyrighted Bible text and verify no production infrastructure or excluded product features were introduced.
- [ ] 13.4 Reconcile delivered behavior with every capability spec, keep OpenSpec task status accurate, and flag any provider-contract planning corrections for artifact updates; verify remaining tasks/gates are honestly reported before implementation is called complete.

## Precedence correction — 2026-09-26

The user-approved `screen-snapping-passage-transitions` change takes precedence for vertical page geometry, settling/restoration, oversized-content fitting, and horizontal transitions. These artifacts are corrected to that contract so sync/archive order cannot restore the former proximity-snap/taller-card behavior. Earlier implementation evidence is historical; reopened tasks require verification under the corrected contract. Unrelated requirements remain in force.
