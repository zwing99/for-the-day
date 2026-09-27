# Design

## Context

See [proposal.md](proposal.md) for motivation and scope and the seven capability specs for observable behavior. The working tree was clean at discovery. The repository currently contains root guidance, OpenSpec configuration, generated integrations, and empty spec/archive directories; it has no application, dependency manifest, mise configuration, or existing behavioral specs. Generated integrations will be left under OpenSpec's management.

The first useful milestone is a real CSB Psalm flowing through Hono and DynamoDB Local into readable React cards. Model and cache boundaries must support that milestone without requiring the complete interaction system first. The eventual deployment shape informs boundaries only; no deployment resources or adapters are created here.

The local flow is browser → Vite `/api` proxy → Node-compatible Hono application → chapter repository → DynamoDB Local, with upstream adapters on cache misses. The future static frontend will be S3 → CloudFront; CloudFront will be the single public entry point, routing `/api/*` to API Gateway → Node/Hono Lambda → DynamoDB. A later explicitly approved change will own Terraform and all provisioning. The Hono application, semantic API, and repository boundary keep that transition independent of the reader and domain modules.

### Reference review and evidence

The actual [hn-tok source](https://github.com/rewdy/hn-tok/tree/08f7548bfbbe258aff0ce3927760e09096cfd9da) was cloned to a temporary directory and reviewed at commit `08f7548bfbbe258aff0ce3927760e09096cfd9da`. Review covered all application components and hooks, domain/API helpers and tests, routing, theme, CSS, entrypoint, Vite/test configuration, package manifest, HTML metadata, and the product/technical/design documents. Documentation contains older stack versions and aspirational behavior; source is authoritative for what was observed.

| Source | Observed pattern | Decision for this reader |
| --- | --- | --- |
| `src/components/StoryFeed.tsx` | Native `overflow-y` container, `100dvh` cards, mandatory vertical snap, IntersectionObserver at 0.6, intro at DOM index 0 | Adapt the native flow and observer concept; use semantic anchors rather than child-index arithmetic, and fit oversized complete units to exact-height pages |
| `src/hooks/useActiveStoryIndex.ts` | URL-driven index, history push for navigation, one-time instant restoration guarded by a ref | Adapt URL-first restoration, extend it to every route change/popstate, suppress observer writes while restoring, and replace history during ordinary scrolling |
| `src/hooks/useVisitedStories.ts`, preference/theme hooks | Storage read/write failures are contained; preferences have narrow hook boundaries | Adapt guarded persistence behind one versioned repository; store logical locations rather than visited IDs |
| `src/hooks/useStories.ts`, `src/api/hn.ts`, `src/api/feed.ts` | Abortable fetch wrappers, keyed request deduplication, pure feed helpers with behavioral tests | Follow this separation with a small chapter source and pure reading/packing/location helpers |
| `src/main.tsx`, theme and `index.html` | Self-hosted font imports, theme abstraction, `viewport-fit=cover`, per-scheme metadata | Adapt asset and viewport practices; use our editorial visual system and explicit safe-area CSS |

The reviewed source has no horizontal swipe detector, service worker, or manifest. Keyboard navigation described in planning is not implemented. The hook restores only once, and its intro/index conventions and permissive `parseInt`/catch-all behavior are unsuitable for strict Scripture URLs. The 0.6 whole-card visibility threshold cannot identify a card taller than the viewport. These findings justify focused additions rather than copying assumptions about functionality.

No `LICENSE` file or package license declaration was found in the inspected tree. The user authorizes studying and adapting this reference, but that does not establish the friend's copyright grant for copying. Initial implementation will independently adapt these browser patterns and credit hn-tok as the reference in developer documentation. Direct or substantially derived source reuse is gated on an explicit license or permission from its copyright holder, with the exact file/commit, notice, and modifications recorded. This gate does not block independent pattern adaptation.

Provider evidence was inspected through official documentation, including the documented API.Bible JSON response and Crossway HTML response, not through authenticated chapter calls:

- [API.Bible content formats](https://docs.api.bible/resources/content-output-formats/): JSON contains nested tag/text nodes and per-text identity attributes. Preserve those relationships rather than flattening the content array.
- [API.Bible Scripture styling](https://docs.api.bible/resources/scripture-styling/): USX-derived `q1`/`q2` and heading styles convey poetry and indentation.
- [API.Bible verse references](https://docs.api.bible/resources/referencing-verses/): organizational identity can differ from printed labels and can include sets and partial references.
- [API.Bible chapter contract](https://docs.api.bible/guides/chapters/): whole chapters carry copyright and response metadata. Older examples and current documentation show different endpoint/metadata generations; target one configured endpoint generation and verify it during credentialed setup.
- [API.Bible FUMS](https://docs.api.bible/resources/fair-use/): retain the token and use the documented V3 tracker with `trackView` on display.
- [Crossway passage HTML](https://api.esv.org/docs/passage-html/): HTML plus numeric passage metadata supports verse anchors, headings, subheadings, and copyright options; subheadings include Psalm titles and Psalm 119 divisions.
- [Crossway conditions](https://api.esv.org/): ESV cache/display limits require bounded storage and attribution. A near-today window alone does not enforce the verse allowance.
- [API.Bible FAQ](https://docs.api.bible/common-questions/): cache retention and consecutive-verse guidance also constrain admission; access depends on the configured account's translation entitlements.

These representative documented responses establish the model below. They are not evidence that every requested translation exposes every structural feature. Implementation must inspect locally obtained Psalm 23, a titled/indented Psalm, Psalm 119, and representative Proverbs responses before declaring adapters complete. Raw copyrighted responses stay ignored locally; committed fixtures reproduce their structure with invented text. This is a specific fidelity checkpoint, not an invitation to replace this design with flat strings.

## Goals / Non-Goals

**Goals:** Keep domain functions pure and the provider/cache seams small; make text conservation an invariant; use browser-native interaction with reliable location state; reach an end-to-end CSB milestone early; provide a repeatable local command surface and explicit verification gates.

**Non-Goals:** A general-purpose Bible parser, a cross-translation verse alignment service, speculative plugin architecture, a virtualized infinite feed, a gesture/animation framework, or persistent browser Scripture storage. All product and deployment exclusions in the proposal remain applicable.

## Decisions

### 1. One repository, focused modules, mise-owned commands

Use a single Bun dependency manifest/lockfile and separate browser/server TypeScript configurations. Proposed layout:

```text
src/domain/       reading plan, semantic model, packing, locations, eligibility
src/client/       React reader, settings, gesture hook, storage, chapter source
src/server/       Hono app, chapter service, providers, cache repository
tests/fixtures/   invented-text provider-shaped fixtures
tests/integration/ DynamoDB Local tests
public/           manifest source, icons, static metadata assets
mise.toml         pinned tools and all discoverable tasks
compose.yml       official DynamoDB Local service
```

React and Vite provide the frontend. The Hono application is constructed independently from its local listener and has injectable provider/cache dependencies for tests. Run the local listener with Bun using a Node-compatible Hono Node HTTP adapter; avoid `Bun.serve`, Bun storage APIs, and Bun-only server contracts. Pin Bun and a supported Node LTS through mise, with Node used to verify the server build's eventual runtime compatibility. Pin project CLI versions rather than using floating executables.

Vite serves the browser on a documented localhost port and proxies `/api/*` to Hono. A local built-app preview exposes the same path arrangement for PWA verification. Bind services to loopback by default. Provider credentials live in the server environment, never `VITE_*`. `setup` installs with the Bun lockfile, copies `.env.example` only if no local environment exists, starts Docker, waits for DynamoDB readiness, and initializes tables idempotently. It does not obtain provider credentials automatically. `dev` supervises frontend/API processes and ensures cache readiness; shutdown stops child processes but leaves the local cache volume available until an explicit lifecycle action.

For user-requested physical-phone testing, `mise run host` opts Vite into binding on all local interfaces and prints available non-loopback IPv4 URLs using the configured web port. It reuses the dev supervisor and database preparation. Hono and DynamoDB retain their loopback bindings; the phone uses Vite's API proxy. Normal dev remains loopback-only.

Tasks include `setup`, `dev`, `test`, `test:integration`, `test:browser`, `typecheck`, `lint`, `format:check`, `check`, `build`, `preview`, `db:start`, `db:stop`, and `db:init`. `test` is the fast Docker-independent suite. `check` runs type/lint/format and fast tests. Integration and browser tasks remain explicit, and the final milestone runs all suites plus build. Scripts needed for initialization/supervision are narrow task implementations invoked through mise, not another command surface. Package scripts must not duplicate these workflows.

Use the official `amazon/dynamodb-local` image, pinned to an available version/digest during implementation, with persistent local data and explicit localhost endpoint/dummy region/credentials. A pinned official AWS CLI one-shot Compose service waits for DynamoDB Local and creates the table idempotently using a fixed Compose-service endpoint and dummy credentials; `db:init` runs that service. Unit tests use an in-memory repository double. AWS SDK DynamoDB modules provide Node-compatible access to the local endpoint; no AWS account discovery or default production endpoint fallback is allowed. If `.gitignore` changes, regenerate verified gitignore.io templates and review exceptions so `.env.example` and shared settings remain trackable.

Alternatives: multiple workspaces add ceremony at this size; a Bun-only listener would undermine runtime compatibility; a full UI framework or hn-tok's complete dependency stack is not needed for the focused reader. Prefer native controls and modern CSS. Use Vitest/Testing Library for domain/components, a focused lint/format tool, and browser automation for Chromium/WebKit. Use a server-side HTML parser such as parse5 rather than regex parsing or a full DOM runtime. Check current versions/compatibility when adding each dependency.

### 2. Lossless semantic tree with a separate verse index

The chapter's ordered tree owns text exactly once. A separate verse index points into it; it does not duplicate text. Provider-generated verse label strings are distinct from Scripture text. Stable source paths and IDs support diagnostics and deterministic packing. The initial TypeScript contract is:

```ts
type Translation = 'CSB' | 'NIV' | 'NLT' | 'ESV';
type Book = 'PSA' | 'PRO';
type Provider = 'api-bible' | 'crossway';
type NodeId = string;

interface VerseIdentity {
  key: string;                 // unique within this provider edition/chapter
  displayLabel: string;        // supports 0, ranges, and partial labels
  providerIds: string[];
  orgIds: string[];            // preserve sets/ranges/suffixes as supplied
  sourceOrdinal: number;      // ordering fallback, never a universal verse ID
}

interface SourceInfo {
  path: string;
  tag?: string;
  style?: string;
  ids?: string[];
  attributes?: Record<string, string | string[]>;
}

type SemanticNode =
  | { id: NodeId; kind: 'text'; text: string; verseKeys: string[];
      marks: string[]; source: SourceInfo }
  | { id: NodeId; kind: 'verse-marker'; verseKeys: string[];
      label: string; source: SourceInfo }
  | { id: NodeId; kind: 'break'; role: 'line' | 'stanza';
      source: SourceInfo }
  | { id: NodeId; kind: 'group';
      role: 'section' | 'heading' | 'title' | 'paragraph' | 'poetry'
          | 'stanza' | 'line' | 'inline' | 'unknown';
      level?: number; indent?: number; children: SemanticNode[];
      source: SourceInfo };

interface SemanticChapter {
  schemaVersion: 1;
  identity: { translation: Translation; book: Book; chapter: number;
    provider: Provider; providerBibleId: string; editionKey: string };
  reference: string;
  nodes: SemanticNode[];
  verses: Array<VerseIdentity & { fragmentNodeIds: NodeId[] }>;
  introTitleNodeIds: NodeId[];
  attribution: { notice: string; translationLabel: string;
    requiredLinks: Array<{ label: string; href: string }> };
  tracking: { kind: 'none' } | { kind: 'api-bible-fums'; version: 3;
    token: string; suppliedMetadata: Record<string, unknown> };
}

interface LogicalLocation {
  kind: 'intro' | 'verse';
  translation: Translation;
  verseKey?: string;
  displayLabel?: string;
  orgIds: string[];
  sourceOrdinal?: number;
}

interface ReadingCard {
  key: string;
  slices: Array<{ nodeId: NodeId; fromChild?: number; toChild?: number }>;
  verseKeys: string[];
  anchor: LogicalLocation;
  oversized: boolean;
}
```

`marks` and source styles carry meaningful inline features such as small-cap divine names without changing the provider's letters. Attributes are selected semantic data, not arbitrary executable HTML. Fragment membership can refer to several verse keys for merged spans. A text run with several independently mapped spans must be split only at provider-established boundaries, never inferred punctuation. Titles and headings retain ordered tree positions even when also referenced by an intro. The reading-card partition covers the chapter exactly once; the optional intro is an additional presentation referencing metadata.

API.Bible normalization walks nested JSON, maps USX-derived styles to groups, carries supplied `verseId`/`verseOrgIds`/markers forward, and retains text segments verbatim. Contiguous poetry lines are grouped only when source grouping/style transitions justify it. Do not invent stanza breaks from verse numbers. Keep paragraph/stanza parent identity when packing later separates a large unit.

Crossway normalization parses the HTML AST on the server, extracts verse/heading anchors and paragraph/poetry structure, decodes HTML entities once into their represented characters, and keeps semantic breaks distinct from serialization newlines. Include headings, subheadings, verse anchors and first-verse numbers; disable audio links, external CSS, surrounding-chapter navigation, footnotes, and cross-references for this focused scope. Request full copyright and disable the mutually exclusive short-copyright option. Preserve returned Scripture text and meaningful spaces; do not trim/collapse text, normalize punctuation, use textContent to flatten a passage, or regex-rewrite markup. Request-suppressed ancillary notes are not discarded returned Scripture.

Unknown text-bearing nodes become `unknown` groups with safe ordered children and conservative packing. If identity or structural ambiguity would make a complete faithful rendering impossible, fail with a safe normalization error and update the fixture mapping before proceeding. Never silently return a partially normalized chapter. Rendering uses React semantic elements, not untrusted raw HTML or provider-supplied scripts/styles. Conservation tests compare ordered source text runs against normalized text runs and compare structural events separately; render checks verify punctuation, spaces, breaks, headings, and indents.

Alternatives: `{verse,text}` destroys literary structure; storing only provider HTML makes API.Bible and Crossway behavior leak into the UI; embedding all text again in per-verse/card structures encourages divergence. The tree plus reference index handles split verses without a generic Bible database.

### 3. Provider adapters and chapter service

`BibleProvider.fetchChapter` returns a semantic chapter or a typed provider failure. `API.BibleProvider` selects configured server-side CSB/NIV/NLT edition IDs, requests whole chapters as JSON with titles and verse identity enabled, and retains response metadata. The example environment documents edition IDs without credentials; do not guess that one edition ID works for every account. The implementation targets one endpoint generation and its documented V3 FUMS mode, rather than supporting all historical API shapes. For an older endpoint that requires it, explicitly request `fums-version=3` and verify `meta.fumsToken`; missing required metadata is a contract failure.

`CrosswayProvider` uses `/v3/passage/html/` for the named complete Psalm/Proverbs chapter, with the HTML options above. Numeric anchors are Crossway identities, not proof of API.Bible organizational equivalence. Provider parsing and identities stay inside adapters plus a small location-mapping boundary. Fetch uses standard Web APIs, cancellation/timeouts, response validation, and bounded retry only for safe transient failures; do not retry a rate limit immediately or prefetch an entire day automatically.

The Hono service validates translation/book/chapter, resolves provider and cache policy, returns `{ chapter }`, and maps failures to `{ error: { code, message, retryAfterSeconds? } }`. Use 400 invalid input/context, 404 missing chapter, 429 identifiable rate limits, 503 unconfigured provider/cache or upstream unavailable, and 502 invalid provider/normalization contract. Browser responses are `Cache-Control: no-store`; server-side DynamoDB caching is independent of HTTP browser caching. Logs use safe codes/request IDs and exclude authorization headers, upstream bodies, tracking tokens, and credential-bearing URLs.

For ESV, the browser sends `?readingDay=7&timeZone=America%2FChicago`. The server validates day 1–31 and IANA zone, computes the current local day from its clock using that zone, verifies that the chapter belongs to that day plan, and evaluates circular eligibility. Client-supplied context is a performance hint, not an authorization boundary; the storage budget is enforced regardless of context. Context omitted means no ESV cache. Valid context for a chapter outside the selected plan also means no ESV cache, preserving the generic chapter endpoint. Malformed supplied values receive 400. CSB/NIV/NLT do not use the near-today eligibility rule.

FUMS lives in a browser reporting adapter. Load the documented tracker once from its fixed HTTPS origin, initialize its queue before it finishes loading, and call `fums('trackView', token)` when Scripture is displayed. Keep an activation identifier to report once per continuous display, including cached content, and allow another report after leaving/returning. React StrictMode and repacking must not duplicate a report. Never execute script text carried in provider metadata. Do not report hidden fetches or intros, pass user IDs, or add optional analytics. Tracking unavailability is contained without changing text; the reporter remains ready for a later valid display. Required notices have a legible passage-level presentation plus an accessible full-notice view; do not hide all attribution inside settings.

### 4. DynamoDB repository, freshness, and ESV bounds

Keep cache access behind `ChapterRepository` operations for lookup, atomic admission, invalidation, and maintenance. Keys include translation/book/chapter plus semantic schema and provider edition/config revision. Store timestamps, expiration epoch seconds, verse count, provider, and the complete serialized semantic chapter. Enable DynamoDB built-in row TTL on `expiresEpochSeconds`; manifest rows omit TTL. Native deletion is asynchronous, so application freshness checks and explicit bounded-storage maintenance remain required. Approximately 24 hours means 86,400 seconds after successful retrieval; use an injectable clock. Check expiration in application code even when the item remains present. No stale-on-error behavior in this slice. Process-local in-flight deduplication prevents simultaneous misses for the same eligible chapter from amplifying provider requests.

DynamoDB's item size limit also applies to metadata and keys. Start with lossless Node-compatible gzip of serialized chapter bytes when needed; round-trip equality is mandatory. If the entire encoded chapter cannot fit within the record limit, return it uncached. Do not chunk verses, truncate fields, or add object storage for this edge case. Cache unavailability on a required lookup returns a safe 503 with local setup guidance rather than silently replacing DynamoDB with another cache.

Use conservative provider capacity admission from the start. API.Bible guidance requests fewer than 500 consecutive cached verses and short retention; a per-edition cap of 400 total verses is a simple conservative implementation of that guidance. ESV uses at most 300 server-cached verses total and at most 200 per supported book, reserves space for one active browser chapter, and retains no inactive ESV chapters in browser memory. These deliberately conservative bounds fit the supported books while leaving room below the published 500-verse/half-book ceilings. Validate supported-book/chapter counts against provider metadata in the fidelity checkpoint. No persistent browser Scripture storage, bulk copy/export, or ESV background chapter prefetch is added.

The user-defined ESV eligibility is:

```text
gap = abs(selectedReadingDay - currentLocalDay)
eligible = min(gap, 31 - gap) <= 5
```

This uses the fixed 31-day plan cycle, not the actual number of days in the calendar month. On day 30 the eligible day numbers are 25–31 and 1–4. Requests outside the window bypass fresh hits as well as writes. Store the chapter once, not once per reading day; derive eligible plans from the pure reading-plan function. Psalm 119 belongs to both day 29 and day 31, but eligibility for a response still uses its requested selected day.

Expired and no-longer-eligible ESV entries are explicitly deleted during maintenance before admission. A short local maintenance timer handles physical expiration while idle; request-time maintenance also applies the current reader time-zone context. Since localhost may be used from different zones, global near-day pruning can reduce another zone's hit rate; it cannot corrupt text or make an ineligible request use cache. Cache contents are expendable and this trade-off avoids separate time-zone cache namespaces.

Use a small provider/edition manifest item containing entry identities, counts, retrieval times, and revision, updated with DynamoDB conditional transactions along with admissions/evictions. Evict oldest whole chapters until within capacity; include physically expired entries in capacity until deleted. Optimistic revision checks/retries prevent concurrent unchecked admission, with batch pruning where transaction limits require it. Keep this enforcement inside the repository, not the browser. Capacity is small enough for a manifest without a general distributed cache framework. Test conflict behavior as well as basic CRUD. The daily window and TTL never substitute for verse-count admission.

Alternatives: unlimited TTL-only storage violates provider constraints because deletion is asynchronous; splitting chapters violates the chosen cache unit; day-keyed duplicate caches waste the verse budget. Server cache and browser preferences remain separate.

### 5. One vertical surface and conservative horizontal detection

Adapt hn-tok's `100dvh`, vertical overflow, and snap-start composition. Add `100vh` fallback, viewport-fit metadata, safe-area padding, a readable maximum measure on large screens, and enough space for context/attribution. Cards use exact usable viewport height and mandatory snap boundaries. Reduce grouping at complete-verse boundaries before shrinking indivisible oversized pages to fit. Restore the containing page rather than a marker offset; there is no inner reading scroller. The detailed fit and transition contract is `screen-snapping-passage-transitions`.

Phones are the primary design target, and iPad sizes receive a deliberate responsive layout. Keep a single centered reading column, with fluid gutters and a typography-relative maximum measure around 45–65 characters rather than a hardcoded phone-width container or full-width tablet text. Minor type/spacing scaling is bounded and respects the user's font-size preference. Tablet settings and controls use appropriate maximum widths and touch targets. Use available viewport/container dimensions rather than user-agent or device-name checks; a narrow iPad Split View should naturally use the compact layout. Rotation and Split View resize update the same reading surface and location coordinator, without introducing multiple passage columns or changing the navigation grammar.

Use IntersectionObserver as a scheduling signal, then select the logical card/verse at a reading line near the top of usable content. Retain the addressed verse identity inside a packed page without moving its page boundary. Prefer `scrollend` when supported and a short debounced scroll fallback for settled URL/persistence writes. Store the logical verse reference and restore its containing aligned page; do not store or restore arbitrary intra-page scroll offsets.

Alignment repair chooses the nearest page at the current scroll position. It must not clamp repair to a stale gesture origin: rapid input or native momentum may already have advanced farther, and origin-based repair would visibly rewind. Native mandatory snapping with stop-always governs page advancement; custom repair preserves current progress while aligning its page boundary.

A small pure gesture classifier and thin event hook are necessary because hn-tok has no horizontal detector. Use a single primary touch/pointer, `touch-action: pan-y pinch-zoom`, passive observation, and no vertical `preventDefault`. Start with a 12px direction-lock threshold and require at least 56px horizontal travel, horizontal distance at least 1.75 times vertical distance, and a bounded completion time around 700ms. Once vertical intent is established, reject horizontal navigation for that gesture. Reject cancellation, multiple contacts, active text selection, and interactive targets. Tune minor thresholds through mobile testing without changing the conservative dominance contract. Execute at most one passage change on completion, with a restrained transition or none under reduced motion.

Use a bounded transform strip only for direct horizontal passage slides, retaining the single native vertical surface. Do not add nested horizontal scrollers, gesture dependencies, or hn-tok's proposed virtualized fallback. Six passages (two on day 31) do not require an infinite feed. If native behavior needs adjustment on Safari, adjust snap/threshold/overflow mechanics and reverify the same behavior contract.

### 6. URL state and logical restoration coordinator

Use the browser History API behind a small navigation store/hook, with pure strict URL parsing/generation. A routing dependency is not necessary for one reading surface. Canonical routes are `/:day/:bookSlug/:chapter/:location?translation=CSB`, with `psalm` and `proverbs` slugs, `intro` or a supplied verse label as location, and an optional encoded organizational identity query when available. `/7/psalm/67/3?translation=CSB` means CSB verse 3. Provider labels containing partial/range syntax are validated against the fetched chapter, not parsed with permissive `parseInt`. An explicit intro route redirects by replacement to the first verse when intros are disabled.

`/` chooses today's local plan; `/:day` chooses that day; `/:day/:book/:chapter` selects a passage and resolves saved/default position. Generated shared links always carry translation. For links without it, use the saved translation or CSB default, then canonicalize by replacement. Reject a passage outside its day's plan rather than silently clamp it. Validate verse existence after data arrives, and show recovery actions for invalid anchors instead of opening an unrelated verse.

Restore precedence is explicit URL location, saved location for day/passage, then enabled intro or first Scripture location. Positions are keyed by day/book/chapter, with translation-tagged logical anchors and optional per-translation hints so translation switches can preserve more precise prior locations. Do not key durable progress by card number or pixel scrollTop. A root reopen defaults to the current day, not a persisted old day; the day's last active passage hint can be restored within that plan.

A coordinator handles navigate → fetch → pack → locate → instant restore → observe. While restoring or changing layout, observer-originated URL/storage writes are suspended. Cancel obsolete requests and use activation IDs so late results cannot overwrite the current passage. Route effects run for initial load and every popstate; no one-time `hasRestored` guard. Save the outgoing logical location synchronously through the repository before changing passages, with pagehide/visibility flush for pending writes.

Explicit day/passage/translation/direct-location actions push history after preserving the outgoing entry. Ordinary vertical reading replaces the current entry. Popstate restores without pushing. Avoid a history entry for every verse while still preserving meaningful explicit navigation. Keyboard actions use the same coordinator as gestures and passage buttons.

Cross-translation mapping first intersects source/target organizational identity sets/ranges, including suffixes and merged verses. A small explicit correspondence map may bridge verified Crossway anchors to API.Bible identities for supported chapters; never manufacture `orgId` from a Crossway number. Without verified correspondence, retain the same displayed label as an approximate fallback, then nearest available chapter-order verse if absent, with a quiet accessible notice. Preserve the requested anchor until new content succeeds; failure leaves the previous successful chapter visible and restores its URL/preference consistently. This bounded approach meets the location contract without constructing an exhaustive versification database.

### 7. Deterministic semantic packing, then measured overflow safeguards

Keep packing pure: input chapter, density, and a quantized layout budget derived from usable width/height, font-size/line-height tokens, and reserved context/attribution space. Use deterministic estimated line costs based on text length, indentation, explicit poetry lines, and heading spacing, not browser DOM measurements or fixed verse counts. Quantize budget classes and debounce resize/repacking to prevent mobile browser chrome from reshuffling cards on every pixel change.

Calculate budget width from the actual bounded reading column, not the full tablet viewport. Balanced and Compact grow their usable content budget on iPad when greater width/height permits more complete natural units; they do not carry a fixed phone budget onto a larger screen or simply enlarge a sparse phone card. A landscape or Split View change can reduce capacity when usable height/width falls, so packing responds to both dimensions. Spacious remains one verse or atomic span regardless of screen size. Preserve density and font-size preferences and re-anchor the logical verse after every settled layout change. Cover increased capacity with a synthetic sequence of small natural units whose tablet budget admits more units than its phone budget, while accepting unchanged groupings for short or indivisible passages.

Build complete verse units from fragment references, retaining source literary paths. Treat inseparable merged spans as one atomic unit. Attach leading headings/titles/acrostic labels to following text. Spacious emits one verse unit per card. Balanced targets a conservative fraction of usable lines; Compact targets a larger fraction. Prefer whole stanzas/paragraphs, and combine small neighboring units when natural boundaries and budget allow. When a unit is too large, split only at complete verse boundaries that preserve parent associations; otherwise emit an oversized card. Never split a verse, orphan headings, or fill blank space with altered/duplicated text.

Cards reference tree slices rather than construct rewritten Scripture strings. Assert that slices partition all text leaves in source order and that every verse fragment remains accounted for. Density changes, font-size changes, and viewport changes repack around the current logical anchor. Validate estimates using actual DOM dimensions; reduce grouping first and fit indivisible pages with measured typography reduction. No content may overflow the aligned page at rest. Start the thin slice with faithful simple verse cards, then build the final packer on those tested units.

### 8. Editorial reader and browser-local repositories

Use neutral light/dark backgrounds, a readable serif for Scripture and a quiet system sans for controls. Begin with a self-hosted open-source family such as Source Serif 4, including its license notice, and CSS typography tokens (`--font-scripture`, measure, size, line height, indentation). Font choice can change without touching domain logic or saved locations. Avoid an external font request; preserve normal italics/small caps only where meaningful. Final font choice and spacing are localhost refinement decisions.

The active surface has a restrained passage label, unobtrusive direct passage indicator, required attribution, and a discoverable menu/controls affordance. Chrome can recede visually but essential controls remain focusable and available to assistive technology. Settings uses a focused mobile-friendly dialog/sheet with native fields, labeled ranges, and a small set of choices. It is not a dashboard. Share the canonical URL through Web Share with Clipboard API fallback; no custom bulk Scripture export/copy in this slice. Native text selection remains intact.

The user explicitly wants native scrolling and deliberate passage swipes to be the primary UI. Prominent card/passage button rows are temporary implementation and testing controls, not the final presentation. Final refinement places non-gesture alternatives in a quiet discoverable controls area while keeping keyboard and assistive-technology access. Do not make buttons the dominant reading interaction.

Implement `PreferencesRepository` and `ReadingPositionsRepository` over guarded, versioned localStorage records, with schema validation and memory fallback. Components never call localStorage directly. Persist translation, density, appearance, font size, intros, verse labels, positions, and a within-day active-passage hint. Leave font choice replaceable through tokens and the preference schema without a font-picker product feature. Storage contains no Scripture text. Handle malformed JSON, quota/private-mode failures, and unavailable storage.

Focus, contrast, 44px primary targets, safe areas, text zoom, reduced motion, and semantic reading order are part of each UI milestone. Use polite status announcements for deliberate passage changes/loading/errors, not every scroll event. Non-gesture passage buttons and direct selection are always available through the controls; keyboard shortcuts ignore form controls/dialogs and preserve native selection and zoom while card navigation settles on aligned pages.

### 9. Shell-only PWA and future frontend data boundary

Place browser requests behind a `ChapterSource` interface so an IndexedDB-backed source can be added in a later change without changing reader/packing contracts. This change uses network fetch and short-lived in-memory data only; ESV retains only the active chapter and disables background chapter prefetch. No IndexedDB Scripture store or localStorage Scripture text.

Use a manifest with install icons, standalone display, start URL, colors, and mobile metadata. A focused service worker precaches versioned app shell, local font files, and static assets; use navigation fallback for deep links. Explicitly exclude `/api/*`, upstream provider/tracker hosts, and all Scripture responses from Cache Storage. Serve API responses with no-store. Build registration is enabled for localhost preview/PWA verification, while development avoids stale workers. On offline launch show the shell and connection-required chapter state. New shell versions clean old caches and offer a non-disruptive update at a sensible time; never force a reload mid-reading. No user progress is managed by the worker.

Alternatives: a broad runtime cache would accidentally retain copyrighted content and imply unsupported offline reading; a general offline data layer would delay the first useful application.

### 10. Verification at runnable milestones

Use table-driven reading-plan tests for all days, deterministic packing tests with invented-text semantic fixtures, provider conservation/structural tests, URL parsing and generation round trips, storage/restore/history/translation tests, and gesture classifier tests. Fixture structures cover prose, poetry, multiple indentation levels, titles, headings, partial/merged verses, unknown nodes, very short/long content, and Psalm-119-shaped acrostic groups without committed copyrighted Scripture.

Actual DynamoDB integration uses an isolated local table and injected provider fakes/clock. Verify CRUD, identity isolation, incompatible revisions, application expiration despite retained items, metadata fidelity, fresh-hit suppression of fetches, misses/refresh, ESV circular eligibility (1/30/31 and shorter months), local time-zone differences, capacity admission/physical eviction, transaction conflicts, and shared Psalm 119 plan membership. No live provider calls occur in ordinary automated tests.

Browser checks cover URL reload/sharing/back/forward, native scrolling, deliberate horizontal gestures, vertical/diagonal rejection, focus/settings, errors/rate limits, layout changes, short/long poems, enlarged type, and shell-only offline behavior. Exercise representative 320/390/430px phone widths, short-height landscape, iPad-sized 768×1024, 820×1180, and 1024×1366 viewports with landscape counterparts, narrowed Split View, safe areas, and desktop. Verify increased Balanced/Compact content capacity, bounded line lengths, unchanged Spacious behavior, and verse restoration across resize; do not evaluate tablets only as stretched phone screenshots. WebKit automation is useful but cannot establish physical iPhone/iPad Safari touch and multitasking behavior; record real Safari device checks or report those limitations explicitly. Inspect normalized output and visual structure against ignored real provider responses during an opt-in credentialed smoke check.

## Risks / Trade-offs

At the user's request, live VoiceOver/screen-reader testing is not a completion gate for this change for now. Keyboard checks and Playwright accessibility-tree review verify focus, accessible names, and semantic reading order. This does not remove the accessible product behavior requirements or establish actual screen-reader speech behavior.

- [Provider formatting varies by edition and API generation] → Verify the specified representative responses at the adapter milestone, commit only invented-text structural fixtures, and update this design/specs if a material planning error appears.
- [FUMS token validity across cached displays is not fully specified by the inspected pages] → Exercise cached-token reporting during the opt-in provider checkpoint. If token renewal requires a different upstream operation, flag the conflict with the fresh-hit contract rather than silently dropping reporting or secretly fetching on every hit.
- [No license found for hn-tok source copying] → Adapt independently and document inspiration; resolve actual direct reuse rights before copying source.
- [Near-today ESV chapters exceed provider capacity] → Enforce conservative verse-count budgets and atomic whole-chapter eviction in addition to circular eligibility and TTL.
- [Provider access is account-specific] → Require valid server-side keys/edition access for real-CSB verification; keep all ordinary tests credential-free and preserve access to other configured translations.
- [Packing estimates and mobile Safari snapping can be imperfect] → Use exact page geometry, measured complete-content fit, page-aligned restoration, and mandatory native snapping; verify settled boundaries through phone tests.
- [Crossway/API.Bible mappings may be incomplete] → Verify available identities, use explicit approximate fallback notices, and test split/merged and superscription cases without promising universal alignment.
- [A reference source pattern is proven in hn-tok but not automatically verified for this reader] → Reuse the simple mechanism and verify the actual interaction requirements at each relevant milestone.

## Migration Plan

No existing application or user data requires migration. Implementation proceeds through the task milestones, preserving a runnable localhost reader after the first vertical slice. Version storage and chapter schemas so incompatible local records can fall back safely or be invalidated. Cache removal is lossless to the source of truth; provider text can be fetched again. Service-worker rollback replaces shell assets and clears only obsolete static caches. No cloud deployment or migration is part of this change.

## Open Questions

No unresolved product or architecture decision blocks the planning artifacts. Real provider access and physical mobile Safari availability are execution prerequisites for their stated verification gates, not reasons to invent content. Font selection, minor density/gesture thresholds, and spacing can be refined locally within the contracts above. Permission for direct hn-tok source copying is needed only if implementation elects that reuse path; independent adaptation is ready to proceed.

## Precedence correction — 2026-09-26

The user-approved `screen-snapping-passage-transitions` change takes precedence for vertical page geometry, settling/restoration, oversized-content fitting, and horizontal transitions. These artifacts are corrected to that contract so sync/archive order cannot restore the former proximity-snap/taller-card behavior. Earlier implementation evidence is historical; reopened tasks require verification under the corrected contract. Unrelated requirements remain in force.
