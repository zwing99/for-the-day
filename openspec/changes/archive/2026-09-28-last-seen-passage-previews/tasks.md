# Tasks

## 1. Shared-source adjacent preparation

- [x] 1.1 Use the shared cache-aware source governed by `browser-chapter-cache` and add a scope-bounded preparation scheduler; verify ready/in-flight deduplication, identity checks, scope cancellation, late-result rejection, and fresh activation independent from cached content with unit tests.
- [x] 1.2 After the active passage is usable, prepare its next and previous available passages sequentially and reprioritize neighbors after commitment; verify one background request, no unrelated passage warming, both-direction readiness when retained, navigation joining in-flight work, foreground priority, rate-limit cooldown, access/configuration stop, and active-reading isolation with controlled source/timer tests. Verify eviction or failed preparation falls back to honest loading; document scheduling and the shared source retention policy.
- [x] 1.3 Integrate the scheduler with shared-source active chapter loading while preserving retry and abort behavior; verify existing navigation/error/reporting tests and mise check/build pass before changing preview rendering.

## 2. Passive last-seen page presentation

- [x] 2.1 Separate passive fit/restoration from active focus/location/reporting effects; test introduction/first-verse defaults, translation compatibility, explicit URL precedence, saved packed/merged identities, and absence of passive progress/history/focus/report calls; document the activation boundary.
- [x] 2.2 Render a ready previous or next neighbor at its saved containing page using current density/type/viewport, showing a placeholder until content and alignment are prepared; verify both-axis complete fit, exact provider text/order conservation, two-pixel alignment, inert/aria-hidden keyboard exclusion, and data or fitted layout arriving mid-drag without offset changes with component/browser tests.
- [x] 2.3 Preserve the prepared page through commitment and restore cold destinations directly on load; verify A-X/B-Y round trips in both directions, one history push, outgoing flush, fresh once-per-activation reporting, no intro flash/scroll jump, cancellation/interruption, reduced motion, and safe committed failure/retry; run mise check/build and update transition documentation.

## 3. Integrated acceptance and precedence

- [x] 3.1 Record intermediate, settling, and first committed frames for ready and delayed destinations on small portrait, short landscape, tablet/Split View, and desktop; exercise touch, trackpad, keyboard/menu, resize/type/density changes, native zoom, and bounded ends; use standing CSB fit references and invented packed/merged fixtures, and report unavailable Safari/device checks explicitly.
- [x] 3.2 Review browser storage/network/reporting to verify adjacent-only warming and permitted dedicated chapter persistence, no competing pool/cache clearing, and no preview side effects; update reader documentation for ready saved-page previews and honest loading fallback, then run mise check/build and strict OpenSpec validation and deliver a visual checkpoint.
