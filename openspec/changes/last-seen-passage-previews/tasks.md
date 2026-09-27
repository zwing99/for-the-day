# Tasks

## 1. Transient daily preparation

- [ ] 1.1 Add a scope-bounded chapter pool behind the existing source boundary; verify ready/in-flight deduplication, identity checks, scope cancellation, late-result rejection, and fresh activation independent from cached content with unit tests.
- [ ] 1.2 Add sequential current-first/next-first daily warming and foreground promotion; verify one background request, no other-day fetches, navigation joining in-flight work, rate-limit cooldown, access/configuration stop, and active-reading isolation with controlled source/timer tests; document scheduling and transient retention.
- [ ] 1.3 Integrate the pool into active chapter loading while preserving retry and abort behavior; verify existing navigation/error/reporting tests and mise check/build pass before changing preview rendering.

## 2. Passive last-seen page presentation

- [ ] 2.1 Separate passive fit/restoration from active focus/location/reporting effects; test introduction/first-verse defaults, translation compatibility, explicit URL precedence, saved packed/merged identities, and absence of passive progress/history/focus/report calls; document the activation boundary.
- [ ] 2.2 Render the ready neighbor at its saved containing page using current density/type/viewport, showing a placeholder until alignment is prepared; verify both-axis complete fit, exact provider text/order conservation, two-pixel alignment, inert/aria-hidden keyboard exclusion, and data arriving mid-drag without offset changes with component/browser tests.
- [ ] 2.3 Preserve the prepared page through commitment and restore cold destinations directly on load; verify A-X/B-Y round trips in both directions, one history push, outgoing flush, fresh once-per-activation reporting, no intro flash/scroll jump, cancellation/interruption, reduced motion, and safe committed failure/retry; run mise check/build and update transition documentation.

## 3. Integrated acceptance and precedence

- [ ] 3.1 Record intermediate, settling, and first committed frames for ready and delayed destinations on small portrait, short landscape, tablet/Split View, and desktop; exercise touch, trackpad, keyboard/menu, resize/type/density changes, native zoom, and bounded ends; use standing CSB fit references and invented packed/merged fixtures, and report unavailable Safari/device checks explicitly.
- [ ] 3.2 Review browser storage/network/reporting to verify bounded scope and no Scripture/provider persistence or preview side effects; reconcile the earlier loading-only preview and warming restriction with this change's precedence, then run mise check/build and strict OpenSpec validation and deliver a visual checkpoint.
