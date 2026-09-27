# Design

## Context

See proposal.md for motivation. `reader.tsx` currently fetches on active key changes, discards its previous result, and renders a labeled placeholder for every horizontal preview. `ReadingStorage` already saves independent day/book/chapter references and checks translation compatibility at restoration. `ReadingSurface` restores logical references to fitted pages but owns active location callbacks and focus. `createDisplayReporter` deduplicates by activation, not chapter fetch. Existing gesture code supplies offset and completion/return phases; it needs no new thresholds. Navigation/storage tests and the standing CSB fit benchmarks provide regression gates. The inspected hn-tok reference supplies vertical paging patterns but no horizontal saved-page presentation to reuse.

## Goals / Non-Goals

**Goals:** Reuse chapter content independently from activation, prepare saved-page geometry before revelation, and keep background work subordinate to active navigation.

**Non-Goals:** Defining persistent/offline Scripture policy (owned by `browser-passage-cache`), preloading other days or editions, provider expansion, new dependencies, changes to server cache/TTL, or retaining a mounted chapter for every daily passage.

## Decisions

### Shared chapter source and bounded preparation scheduler

Use the single cache-aware `ChapterSource` composed by `browser-passage-cache` for foreground and background loads. That source owns fixed freshness, persistence, bounded admission and compatible in-flight sharing. This scheduler owns only current-scope warming priority and cancellation; it must not maintain a competing chapter pool/freshness policy or clear reusable chapters on day/translation changes. Current request first; after usable content, warm next then remaining plan sequentially. Foreground navigation promotes/joins its compatible request, aborting unrelated background subscribers when necessary. Reject obsolete generation results even if an adapter ignores abort. On scope change cancel obsolete preparation/activation, preserving the source cache. Background failures remain separate from active errors; rate limits pause scheduling for the supplied delay (existing 60-second fallback), and access/configuration errors stop scope warming. No automatic retry loop for failed warming; a foreground attempt retains normal recovery.

An adjacent-only pool was considered but would repeat requests and leave later daily swipes cold. Parallel full-day loading was rejected because it competes with foreground reading and increases rate-limit bursts. This proposal intentionally replaces the preceding design's prohibition on warming the bounded daily plan, without authorizing corpus prefetch.

### Prepare presentation without activating it

Share the existing exact semantic renderer, complete-verse packing, and measured fitting. Separate passive page preparation from active observer/focus/reporting callbacks. Render at most the active passage and its revealed neighbor; retain other chapters as data only. Resolve the neighbor's saved logical reference using the same explicit/saved/default policy as activation, including compatible translation, introduction preferences, and packed/merged references. Prepare alignment before revealing a ready panel; do not use raw scroll pixels as saved progress. Recompute on presentation/viewport changes. If fitting is not ready, retain the loading placeholder until the containing page is aligned.

Mounting the ordinary active surface unchanged as a preview was rejected because its effects can write progress and steal focus. A screenshot-only preview was rejected because it loses semantic fidelity and current responsive fitting. A passive surface must be inert/aria-hidden and have no active observers or reporter calls.

### Commit prepared page with visual continuity

Keep preview offset stable when data arrives. On completion preserve the prepared destination presentation through activation; do not briefly remount at scroll zero or replace it with the intro. Reuse chapter data while creating a fresh activation id for each committed visit. Only then flush the outgoing reference, push once, focus, enable observation, and report according to actual Scripture visibility. Cancellations and menu/resize/navigation interruptions discard preparation effects without activating the neighbor. Reduced motion uses the same prepared-page selection with immediate navigation. Cold/failure destinations keep existing safe loading/retry and restore directly to their saved page when available.

### Precedence and delivery

Implement after `screen-snapping-passage-transitions` 4.X acceptance. This change owns saved-page preview continuity and bounded warming. The earlier loading placeholder remains valid only when data/prepared layout is unavailable; it is no longer the required presentation for ready content. All earlier fit, reference, privacy, gesture, and activation contracts remain. Before synchronization/archive, reconcile the preceding change's loading-only documentation and warming restriction explicitly; do not let archive order reinstate them. Its historical 3.X completion remains evidence for the earlier milestone, not this feature.

## Risks / Trade-offs

- [Ready data with unfinished fitting can flash the wrong page] → Keep placeholder until passive layout resolves; verify intermediate and immediately committed frames.
- [Transient provider metadata reused across visits] → Separate data from fresh activation ids; preserve current reporting policy and metadata under the dedicated browser retention policy.
- [Background failures or stale promises affect active reading] → Separate scheduler errors, validate identities, and enforce generation checks and foreground priority.
- [Many hidden mounted chapters waste work] → Mount only active and revealed neighbor; keep the bounded plan as transient data.
- [Invalid or stale saved anchors] → Use the existing safe route validation/recovery policy; never silently rewrite Scripture identity.

## Migration Plan

Use the shared source and revision/storage policy from `browser-passage-cache`; this preview change adds no separate persisted schema or API migration. Add scheduler tests first, then passive presentation and commitment integration, then browser acceptance. Rollback can return to loading previews and active fetches while keeping existing saved references intact. Planning only in this change creation; no implementation is authorized yet.
