# Tasks

## 1. Measured typography and complete-page fitting

- [x] 1.1 Turn the recorded CSB research into a reproducible opt-in mise verification task using the existing source/renderer boundaries; verify edition/identity, render completion, all 181 chapters, atomic merged units, separate height/line/length winners and ties, safe reference-only output, and graceful rate-limit/access failures; document the command without tracking Scripture.
- [x] 1.2 Add DOM-validated complete-verse grouping and measured page-local type fitting; verify unchanged ordered text, headings, poetry, indentation, merged/split identities, group reduction before shrinking, both-axis fit, preference retention, and stable convergence with behavior-focused tests.
- [x] 1.3 Calibrate default responsive typography against Psalm 60:1 with headings, Psalms 27:4, 17:14, 141:5, and Proverbs 30:4; verify default portrait fit without local shrinking at 320×568/740, 390×844, and 430×932, plus complete-content fitting at larger text and short landscape; record actual effective sizes and legibility, update research/developer guidance, and run check/build for this milestone.

## 2. Mandatory vertical screen settling

- [x] 2.1 Replace growing cards/proximity snapping with exact usable-height intro, Scripture, and end pages and mandatory stop-always snapping; verify partial wheel/touch/trackpad scrolling settles within two CSS pixels of a boundary, first/last pages align, all content/attribution remains reachable, and no automatic passage advance occurs.
- [x] 2.2 Restore explicit/saved anchors to their containing aligned page while retaining addressed verse identity; verify intro/Begin, packed and merged anchors, mounted Back/Forward, reload, density/type changes, rotation/Split View, immediate snap reactivation, focus, and once-per-activation FUMS behavior.
- [x] 2.3 Update keyboard/menu card alternatives and reader documentation for fitted screen pages; verify native selection/zoom, reduced motion, semantic reading order, loading/retry, no midway resting position after programmatic navigation, and run focused tests plus check/build before the milestone is complete.

## 3. Interactive horizontal passage slides

- [x] 3.1 Extend classifier and thin input adapter with direction locking, visible drag progress, release/return states, and trackpad input; verify vertical/diagonal rejection, selection/control/dialog exclusions, multi-touch, cancellation, bounded ends, and one commit per gesture with unit tests.
- [x] 3.2 Add outgoing/neighbor panel translation, loading previews, completion/return motion, and interruption handling; verify intermediate-drag screenshots visibly reveal the adjacent panel, insufficient/cancelled/boundary gestures return, resize/menu interruption resets cleanly, reduced motion avoids animation, and no horizontal body overflow appears.
- [x] 3.3 Activate navigation/history/focus/reporting only on commitment; verify independent A/B positions, outgoing flush, exactly one history entry, no preview writes or FUMS, inert/aria-hidden inactive panels, stale fetch rejection, safe failure/retry, and non-gesture directional navigation; document transition behavior and run check/build.

## 4. Integrated acceptance and precedence reconciliation

- [x] 4.1 Verify every density with benchmark and invented fixtures at 320/390/430px phones, short landscape, tablet portrait/landscape, Split View, and desktop; record complete fit, settled-page geometry, intermediate/completed/returned horizontal motion, effective typography, attribution, 200% text/native pinch zoom, and retained logical anchors.
- [x] 4.2 Exercise Chromium and WebKit/physical Safari where available for realistic touch, trackpad/wheel, dynamic chrome/safe areas, focus/accessibility-tree order, loading/recovery, and reduced motion; report unavailable checks explicitly without treating them as verified.
- [x] 4.3 Run final mise check/build and strict OpenSpec validation; review browser persistence/fixtures for Scripture and secrets, reconcile reopened earlier tasks only against the revised contract, confirm no obsolete snap/overflow requirements will win on sync/archive, and deliver a visual checkpoint before provider work resumes.
