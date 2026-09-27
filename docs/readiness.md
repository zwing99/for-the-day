# Localhost reader readiness

Verification completed on 2026-09-27 for `initial-localhost-reader`, block 13. This record covers the delivered localhost application and explicitly separates automated evidence from unavailable physical-device checks.

## Setup and command checks

`mise install` succeeded with the pinned Bun 1.3.12 and Node 24.21.0. An unrelated globally configured pnpm installation was reported by mise; this repository uses only Bun. Frozen dependency installation made no lockfile changes. `mise run setup` succeeded twice against Docker Desktop and the persistent DynamoDB Local table. A separate empty temporary directory verified `.env.example` copying, then byte-for-byte preservation of an existing invented credential on repeated setup.

`mise run dev` was exercised on isolated ports 15174/18791 to preserve the existing reader process. The Vite proxy returned a healthy API response. Ctrl-C released both application ports and left DynamoDB Local running. The built listener also ran under pinned Node on isolated ports: health returned 200, an invalid chapter returned 400, and missing provider credentials returned 503 with actionable configuration guidance. Shutdown released those ports. No AWS account or real AWS credentials were used.

A simulated unavailable Docker executable verified that `db:start` fails with instructions to install/open Docker Desktop and retry setup/dev. The same preflight is used by setup, dev, host, and preview. It does not hide Compose failures. Missing provider access remains a safe recovery state; it never substitutes bundled Scripture.

## Final verification

- `mise run check`: 215 unit/component tests in 26 files; browser/server typechecking, lint, and formatting passed.
- `mise run test:integration`: 15 isolated DynamoDB Local tests passed. Temporary test tables are removed; developer cache data is preserved. Coverage includes metadata fidelity, identity/revision isolation, retained expired rows, fresh-hit provider suppression, circular ESV eligibility and time zones, explicit physical pruning, and concurrent total/per-book bounded eviction.
- `mise run test:browser`: Chromium and WebKit each passed 20 invented-response route/menu cases at 320×568, 390×844, 844×390, 820×1180, and 507×768, plus failure/retry recovery and Escape focus restoration. Routes include all four translations. External requests are blocked before navigation. This repeatable smoke task complements the broader [block 12 browser review](visual-accessibility.md).
- `mise run verify:csb-samples` and `mise run verify:provider-samples`: all 16 saved-source checks passed without network access, preserving source/normalized/rendered text, literary structure, attribution, identities, and tracking metadata where applicable.
- `mise run build`: browser production assets and the Node-target API passed. The build was also exercised with configured server credentials.
- OpenSpec strict validation and Git whitespace checks passed.

No Scripture typography, fitting, page geometry, or provider normalization changed in block 13. The earlier 702 Chromium/WebKit fit cases and saved-sample font-change exception remain documented in [visual/accessibility verification](visual-accessibility.md) and [reading surface measurements](reading-surface.md).

## Approved provider smoke review

The user explicitly approved a maximum of four chapter requests plus required FUMS displays. Exactly one real Psalm 23 request was made for each of CSB, NIV, NLT, and ESV. Every chapter retained all six verses, exactly matched its previously verified source's text, semantic structure, and attribution, and survived a lossless isolated DynamoDB/Hono round trip. A second API request used a provider that throws if called, proving the cache hit preserved the entire chapter and tracking metadata. The isolated smoke table was removed. No new ESV source files were saved.

Chromium then replayed the permitted saved chapters and verified exact ordered rendered Scripture in all four editions. Displaying cached API.Bible chapters loaded the actual FUMS script and received HTTP 200 from `fums.api.bible` for CSB, NIV, and NLT. These were cached-token reports, not additional chapter downloads. No tracker was mocked for that checkpoint; intro/prefetch suppression and continuous-display deduplication are covered by the existing component tests and earlier browser evidence. HTTP 200 establishes transport acceptance, not visibility into the provider's internal analytics.

The real-response navigation review exposed a sparse-correspondence error: NIV/NLT Psalm 23:2 could select ESV verse 1 because the only verified Crossway bridge was treated as a chapter-wide nearest correspondence. Bridges now prove exact matches only. Unmapped Crossway locations use the explicitly approximate same-label/nearest-available fallback. A new regression covers both configured editions and both directions; existing supplied-organizational-ID nearest tests remain intact. Fresh Chromium verification retained verse 2 through CSB → NIV → NLT → ESV → CSB, reload, and Back/Forward. No new provider mappings are claimed.

Wrapped ESV eligibility and eviction were reviewed through the fresh isolated integration suite using injected clocks and invented content; no additional real chapter requests were consumed to repeat those deterministic cases.

## Secrets, storage, and scope review

A local value-matching audit checked both configured provider secrets against all tracked files, intended source additions, and browser bundles without printing key values. It also compared 490 longer Scripture segments from all saved representative API.Bible/Crossway samples. No matches were found. This is evidence for the configured keys and sampled text, not a universal copyright detector. Tracked fixtures were reviewed as invented text; real response samples remain Git-ignored. `.env.example` remains tracked, and local environments, `.local/`, and browser diagnostics remain ignored.

Fresh Chromium persistence inspection after four-edition switching found only reference/preference records in localStorage, no IndexedDB databases, and no Cache Storage entries in development. The actual FUMS tracker also creates its own `fums.dId` identifier during reporting; it contains no Scripture or server key. Built-app static-only caching, offline deep links, waiting updates, and development retirement are documented in [PWA verification](pwa.md). API responses retain `no-store`.

No production deployment infrastructure, AWS-account integration, Terraform, LocalStack, persistent frontend Scripture cache, accounts, cloud sync, notes, highlights, bookmarks, notifications, social/AI features, engagement mechanics, or monetization was added. The pre-existing OpenSpec-generated Copilot setup workflow installs the planning CLI; it is not application deployment infrastructure and remains under OpenSpec management.

## Capability reconciliation

Every requirement in the seven capability specs was reviewed against implementation, tests, and recorded browser/provider evidence. The following grouping includes all 40 requirements; no pending product behavior is hidden by task completion.

| Capability | Requirements reviewed | Evidence |
| --- | --- | --- |
| Reading plan | Daily sequence; local day/explicit selection; restart scope | All-day and time-zone domain tests; reader interface/storage tests; [plan guide](reading-plan.md) |
| Scripture delivery | Unified API; exact semantic text; provider representation/identity; attribution; FUMS; safe validation/failures | Mocked adapter/API/component tests; 16 saved-source checks; four live requests; actual cached FUMS reports; [model](scripture-model.md) and [API/cache](chapter-api-cache.md) |
| Chapter cache | Local response reuse; whole-chapter identity/integrity; application freshness; ESV day eligibility; provider storage bounds | Raw-cache tests; 15 fresh DynamoDB integration tests; isolated real-chapter round trips; [API/cache guide](chapter-api-cache.md) |
| Semantic card packing | Determinism/fidelity; three densities; adaptive content amount; attached headings; oversized literary units; anchor-preserving repacking | Pure conservation/packing and measured-fitting tests; 702 browser fit cases; [reading surface](reading-surface.md) |
| Reader navigation | Native vertical movement; deliberate horizontal movement; non-gesture alternatives; independent locations; address/precedence; history; translation mapping | Navigation/gesture/storage/component tests; prior trusted Chromium touch and WebKit checks; fresh real-response switch/reload/history review; [reader guide](reading-first-interface.md) |
| Reader experience | Restrained typography; phone/tablet adaptation; intros; quiet orientation; settings/persistence; accessibility; recovery; sharing | Interface/share/focus tests; 40 fresh browser cases; earlier contrast/keyboard/semantic-order/resize/zoom checks; [visual/accessibility review](visual-accessibility.md) |
| Local/PWA development | Discoverable tasks; local database lifecycle; secret-safe configuration; automated boundaries; shell PWA | Repeated setup/dev/shutdown; Docker/missing-provider guidance; final suites/build/Node checks; secret audit; [developer guide](development.md) and [PWA guide](pwa.md) |

The sparse Crossway mapping correction is recorded in design and the delivery contract remains unchanged. Exact first-verse bridges are retained; approximate fallback is never represented as universal verse equivalence. The screen-snapping precedence correction and user-approved saved-sample font verification remain in force.

## Unavailable checks

Physical iPhone/iPad Safari, actual Dynamic Island/status-bar blur, installation UI, dynamic browser chrome, native finger momentum/selection/pinch, real rotation, and iPad Split View were unavailable to automation. These checks are **not completed** or inferred from desktop WebKit. See [the device limitations](visual-accessibility.md) for the detailed manual list. Live VoiceOver was explicitly waived as a completion gate by the user; actual screen-reader speech is not claimed verified. Native sharing used mocks in its earlier verification and no links were sent externally.

All specified implementation and available automated/provider gates are complete. Archiving or deploying is a separate user decision; no archive, commit, push, or deployment is performed by block 13 itself.
