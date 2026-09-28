# Tasks

## 1. Date-aware daily start

- [ ] 1.1 Add validated device-local calendar keys and date-scoped active passage and logical position storage while retaining existing undated positions for manual navigation; verify unit tests cover same-date resume, month-repeat isolation, malformed storage, and unavailable storage.
- [ ] 1.2 Update root/app launch and foreground return to follow today only for day-following sessions, preserving explicit links, manual choices, Today, and uninterrupted visible reading; verify component tests cover midnight, background return, timezone-local date, same-date return, and browser history.
- [ ] 1.3 Document daily start and return behavior in reader documentation; verify the description matches tested navigation and run focused reader tests.

## 2. Mobile install invitation

- [ ] 2.1 Add mobile installation eligibility and a small validated reminder record, with native prompt capture and installed-state suppression; verify unit tests cover one-week expiry, permanent opt-out/reversal, standalone mode, and unsupported contexts.
- [ ] 2.2 Add the compact invitation, platform-specific install help, persistent menu action, and Settings choice without covering Scripture; verify component tests cover iPhone and Android actions, dismissal, focus, keyboard access, and readable failure/loading states.
- [ ] 2.3 Update PWA user guidance with iPhone and Android steps and reminder behavior; verify the documented paths against current browser/device behavior and run focused UI checks at mobile portrait and landscape sizes.

## 3. Integration verification

- [ ] 3.1 Run `mise run check` and `mise run build`; verify no regressions in the full unit/component suite or production assets.
- [ ] 3.2 Exercise a built localhost reader with browser automation in mobile Chromium and WebKit, including fresh/same/new local dates, install eligibility, scroll/touch, zoom, accessibility, and standalone suppression; verify all required CSB one-screen fit benchmarks across configured densities and relevant phone geometries without live provider requests.
