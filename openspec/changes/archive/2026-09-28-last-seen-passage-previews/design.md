# Design

## Context

See proposal.md for motivation. `reader.tsx` currently fetches on active key changes, discards its previous result, and renders a labeled placeholder for every horizontal preview. `ReadingStorage` already saves independent day/book/chapter references and checks translation compatibility at restoration. `ReadingSurface` restores logical references to fitted pages but owns active location callbacks and focus. `createDisplayReporter` deduplicates by activation, not chapter fetch. Existing gesture code supplies offset and completion/return phases; it needs no new thresholds. Navigation/storage tests and the standing CSB fit benchmarks provide regression gates. The inspected hn-tok reference supplies vertical paging patterns but no horizontal saved-page presentation to reuse.

## Goals / Non-Goals

**Goals:** Reuse chapter content independently from activation, prepare saved-page geometry before revelation, and keep background work subordinate to active navigation.

**Non-Goals:** Defining persistent/offline Scripture policy (owned by `browser-passage-cache`), preloading other days or editions, provider expansion, new dependencies, changes to server cache/TTL, or retaining a mounted chapter for every daily passage.

## Decisions

### Shared chapter source and bounded preparation scheduler

Use the single cache-aware `ChapterSource` established by the archived `browser-passage-cache` change for foreground and background loads. That source owns fixed freshness, persistence, bounded admission and compatible in-flight sharing. This scheduler owns only current-scope warming priority and cancellation; it must not maintain a competing chapter pool/freshness policy or clear reusable chapters on day/translation changes. Current request first; after usable content, warm the next and previous available passages sequentially. Recompute those two neighbors after each committed navigation. Do not warm the rest of the day's plan: the shared source's bounded verse admission could evict a neighbor before a swipe, and unrelated requests compete with reading. Foreground navigation promotes/joins its compatible request, aborting unrelated background subscribers when necessary. Reject obsolete generation results even if an adapter ignores abort. On scope change cancel obsolete preparation/activation, preserving the source cache. Background failures remain separate from active errors; rate limits pause scheduling for the supplied delay (existing 60-second fallback), and access/configuration errors stop scope warming. No automatic retry loop for failed warming; a foreground attempt retains normal recovery.

The shared chapter source reuses retained chapters across visits; the scheduler needs no separate adjacent-only pool. Full-day warming was rejected because it competes with foreground reading and can evict the previous or next chapter under the published retention bound. The archived screen-snapping design's loading-only preview is superseded for a ready neighbor; its placeholder remains valid while content or fitted layout is unavailable.

### Prepare presentation without activating it

Share the existing exact semantic renderer, complete-verse packing, and measured fitting. Separate passive page preparation from active observer/focus/reporting callbacks. Render at most the active passage and its revealed neighbor; obtain other ready content through the shared source when needed. Resolve the neighbor's saved logical reference using the same explicit/saved/default policy as activation, including compatible translation, introduction preferences, and packed/merged references. Prepare alignment before revealing a ready panel; do not use raw scroll pixels as saved progress. Recompute on presentation/viewport changes. If fitting is not ready, retain the loading placeholder until the containing page is aligned.

Mounting the ordinary active surface unchanged as a preview was rejected because its effects can write progress and steal focus. A screenshot-only preview was rejected because it loses semantic fidelity and current responsive fitting. A passive surface must be inert/aria-hidden and have no active observers or reporter calls.

### Commit prepared page with visual continuity

Keep preview offset stable when data arrives. On completion preserve the prepared destination presentation through activation; do not briefly remount at scroll zero or replace it with the intro. Reuse chapter data while creating a fresh activation id for each committed visit. Only then flush the outgoing reference, push once, focus, enable observation, and report according to actual Scripture visibility. Cancellations and menu/resize/navigation interruptions discard preparation effects without activating the neighbor. Reduced motion uses the same prepared-page selection with immediate navigation. Cold/failure destinations keep existing safe loading/retry and restore directly to their saved page when available.

The active surface still mounts and measures independently after commitment. Keep the passive preview over it, and hide the active surface, until measured packing, page fitting, and saved-reference restoration finish. Its readiness callback ends the handoff. This prevents an estimate-based one-verse frame from appearing between the correct held preview and final active page.

### Precedence and delivery

The screen-snapping and browser chapter cache changes are archived and their published specs are current. This change owns saved-page preview continuity and adjacent warming. The earlier loading placeholder remains valid only when data or prepared layout is unavailable; it is no longer the required presentation for ready content. All published fit, reference, privacy, gesture, cache-retention, and activation contracts remain. Reconcile reader documentation with that behavior during implementation; archived artifacts remain historical records.

## Risks / Trade-offs

- [Ready data with unfinished fitting can flash the wrong page] → Keep placeholder until passive layout resolves; verify intermediate and immediately committed frames.
- [Transient provider metadata reused across visits] → Separate data from fresh activation ids; preserve current reporting policy and metadata under the dedicated browser retention policy.
- [Background failures or stale promises affect active reading] → Separate scheduler errors, validate identities, and enforce generation checks and foreground priority.
- [Many hidden mounted chapters waste work] → Mount only active and revealed neighbor; request only current neighbors for background preparation.
- [Invalid or stale saved anchors] → Use the existing safe route validation/recovery policy; never silently rewrite Scripture identity.

## Migration Plan

Use the shared source and revision/storage policy from the published browser chapter cache spec; this preview change adds no separate persisted schema or API migration. Add scheduler tests first, then passive presentation and commitment integration, then browser acceptance. Rollback can return to loading previews and active fetches while keeping existing saved references intact.
