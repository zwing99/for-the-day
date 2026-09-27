# Design

## Context

See proposal.md for motivation. `card-packing.ts` quantizes capacity to four columns/lines, estimates character wrapping, and applies 0.55/0.85 density factors. Oversized natural groups are flushed independently, potentially leaving reusable space. `reading-surface.tsx` measures actual cards but only halves overflowing groups; it cannot reclaim underfilled pages. These are observed mechanisms, not a confirmed diagnosis of the user's device. Existing tests prove conservation and comparative tablet capacity but do not test rendered utilization. `verify-verse-fit` measures atomic verses offline and cannot alone certify multi-verse packing.

## Goals / Non-Goals

**Goals:** One authoritative settled packing result based on faithful rendering, explainable page boundaries, bounded measurement, and preserved logical anchors.

**Non-Goals:** Font redesign, provider normalization changes, fixed verse counts, gesture redesign, new dependencies, or live corpus downloads. The existing hn-tok-derived native paging interaction remains applicable; this change does not introduce a new interaction pattern.

## Decisions

### Render candidate groups at selected size

Keep pure domain ownership of atomic units, legal boundaries, source ordering, and deterministic candidate selection. Supply measured geometry from the client through a small measurement boundary rather than importing DOM concerns into domain code. Use the faithful semantic renderer in a noninteractive measurement surface with identical width, typography, heading/paragraph spacing, verse labels, and relevant page CSS. Exclude this surface from accessibility, focus, location observers, and provider display reporting. Measure composed candidates: summing atomic heights is insufficient because shared paragraphs and stanza spacing change when combined.

Estimates may seed or accelerate candidate search, but final selection uses measured height and width. Greedily evaluate adjacent complete units in source order up to the density target: Balanced 80%, Compact 95% of actual content height. Prefer whole natural groups when they fit; continue large paragraphs/stanzas at legal verse boundaries. Preserve new section headings as deliberate boundaries and unknown groups as indivisible. Multiple small compatible paragraphs/stanzas may share a page while keeping their rendered separation. A first atomic unit may exceed the density target; fit it intact using the existing overflow fallback if it exceeds total capacity. Never shrink a separable group just to add verses.

Raising 0.55 alone was rejected because character estimates, coarse quantization, natural-group flushes, and DOM spacing can still cause underfill. Unbounded page filling was rejected because density should retain visible breathing room. Fixed two-to-four counts were rejected because poem geometry and headings vary.

### Stable measurement lifecycle

Derive content capacity from actual page interior, reserving padding/context once. Measure at scale 1 independently of previous fitted pages. Cache candidate measurements within a layout revision including chapter identity/content, usable width/height, computed typography, font readiness, density, and label preference. Invalidate on font load, resize/orientation, relevant preferences, and zoom-induced geometry changes. Bound work to finite legal candidates, batch DOM reads/writes, discard stale revisions, and commit a settled result once per revision; do not alternate growth and overflow splitting. Restore the logical verse to an aligned page after settlement. Retain existing indivisible fitting as a safety fallback and verify convergence under repeated identical geometry.

### Acceptance measures both fit and unused capacity

Capture the current implementation's baseline before modifying it. Extend offline browser tooling through a discoverable mise task using `localResponseCache({ allowNetwork: false })`; import existing samples without network access. Audit every available cached CSB Psalm/Proverbs chapter in the real reading surface at all densities, with the main corpus comparison at normal iPhone portrait settings. Record coverage, references, page count, distribution of units per page, singleton fraction, occupancy, candidate rejection reason, available dimensions, selected/effective type, and timing. Fail on any avoidable singleton, clipping, duplication, omission, or grouped typography shrink. Do not require every page to contain two-to-four verses; require measured grouping when compatible content permits it.

Use invented tracked fixtures for exact expected grouping and tests of boundary policy. Keep real source responses, screenshots containing Scripture, and raw measurements under ignored `.local`; tracked verification notes contain references and geometry only. Run existing `verify:verse-fit` and the standing Psalm 60:1 with headings, 27:4, 17:14, 141:5 and Proverbs 30:4 matrix. If fonts or formatting change, remeasure the full accessible corpus offline and report any gap.

Use Playwright MCP to inspect localhost, in addition to automated Chromium/WebKit checks. Establish iPhone 17 Pro dimensions from actual device measurements, not an assumed device preset. Cover expanded/collapsed Safari chrome, portrait/landscape, safe areas, text/pinch zoom, and installed standalone mode when available. Emulation supplements physical evidence. Cover 320px phones, short landscape, tablet/Split View, larger type, every density, labels, font loading, loading/failure, scrolling/touch, accessibility, snapping within two CSS pixels, and anchor restoration.

## Risks / Trade-offs

- [Candidate rendering adds layout work] → Cache by revision, batch measurements, record cold/warm timings, and test long chapters for responsiveness before acceptance.
- [Measurement CSS diverges from visible pages] → Share renderer/styles and compare measured candidates with final visible geometry.
- [Growth changes location or causes flicker] → Commit settled groups atomically, reject stale work, and verify restoration during font/resize events.
- [CSS cleanup changes ownership concurrently] → Coordinate against `clean-up-reader-css`; use actual computed geometry and avoid duplicating its stylesheet refactor.
- [Unavailable physical device or cached corpus] → Finish independent automated work and report outstanding acceptance precisely; obtain explicit budget approval before any necessary live retrieval.

## Migration Plan

Capture offline baselines, implement and test candidate policy, integrate measured settlement, then compare corpus and responsive results. No persisted-state migration is required. Rollback is limited to this change's packing/measurement edits and preserves references and preferences. Record completed checks and remaining coverage in verification.md before claiming acceptance.
