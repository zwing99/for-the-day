# Browser passage cache verification — 2026-09-27

## Scope and request counts

All responses and prose were invented. No Scripture provider or FUMS endpoints were contacted. Playwright MCP exercised localhost Chromium; the same isolated-context harness also passed in installed Playwright Chromium and WebKit. The in-app browser connection was unavailable because its tool rejected a missing sandbox-policy field. Physical installed iPhone/iPad Safari was not available.

The main sequence ran at 390×844 with mobile/touch enabled and reduced motion. Counts below are cumulative chapter requests, excluding startup metadata.

| Checkpoint | Chapter requests |
| --- | ---: |
| Initial CSB Psalm 23 | 1 |
| Psalm 53, then return to Psalm 23 | 2 |
| NIV Psalm 23, then return to CSB | 3 |
| Reload and focus/reconnect events | 3 |
| Reopen with chapter API and metadata unavailable | 3 |
| Expire stored content, reload with API unavailable | 4 |
| Accessible Try again recovery | 5 |
| ESV Psalm 119 on day 29, then day 31 | 6 |
| ESV retrieval timestamp set just under one hour old, reload | 6 |

There were nine startup metadata requests over the nine app starts in that sequence; foreground visits and focus/reconnect events did not add metadata requests. Offline tests blocked API access while allowing the shell/dev assets; static offline shell behavior remains covered by the existing service-worker tests.

## Storage and reader checks

- Simultaneous native IndexedDB admission from two tabs attempted two 180-verse ESV chapters in different books and two 250-verse CSB chapters. The committed totals were 180 ESV verses and 250 CSB verses in both engines, within 300-total/200-per-book and 400-per-translation bounds. Unit tests also verify same-book eviction and reconciliation without a retained memory copy.
- A separate context with IndexedDB access denied loaded Psalm 23, visited Psalm 53 and returned with exactly two chapter requests, proving bounded session-memory reuse.
- Short content and long invented verse content were exercised at 390×844, 320×568, 844×390 and 768×1024. Touch menu activation, scrolling, dialog dismissal and lack of horizontal overflow passed. No page errors were reported.
- Component tests exercise actual cache-backed FUMS activations, intro suppression, return reporting, reload restoration, shared menu/route translation reuse, saved URL references and focus/reconnect avoidance. Existing navigation/history and service-worker exclusions remain covered by the full suite.
- Fake-clock tests cover exact 24-hour and one-hour expiry, non-sliding reads, active cleanup, revision invalidation, schema/identity corruption, merged/partial canonical accounting including Crossway numeric IDs, quota failure and oversized admission. Source tests cover independent cancellation, late abandoned results, admission cancellation, failure retry, startup metadata count and revision/load races.

## Diff boundaries

No rendering, text normalization, typography, packing or page geometry changed, so standing cached verse-fit remeasurement is not required. No real Scripture/provider metadata fixtures, credentials, dependencies, deployment infrastructure, or unrelated implementation changes were added. The preview proposal/design/spec/tasks were reconciled as explicitly required by task 3.4; preview behavior itself was not implemented. Other pre-existing change directories were preserved.

## Final checks

`mise run check` passed both TypeScript configurations, lint, formatting and all 233 unit/component tests. The separately requested `mise run test` also passed all 233 tests, and `mise run build` produced browser assets and the Node-compatible listener. `git diff --check` passed. Strict OpenSpec validation passed for this change and the reconciled preview change. The final cancellation/storage changes were rechecked through Playwright MCP with the same six-request sequence and native two-tab bounds.
