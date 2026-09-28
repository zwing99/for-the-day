# Design

## Context

See `proposal.md` for the reported failure and the two delta specs for the expected behavior. `index.html` requests `viewport-fit=cover` and a translucent iOS status bar; the manifest uses standalone display. `.reader-shell` owns a three-row grid with `height: 100vh; height: 100dvh`. Header and footer padding use `env(safe-area-inset-*)`. `ReadingSurface` measures the grid's middle row through `ResizeObserver` and publishes its CSS pixel height for page sizing and fit. An iOS/WebKit standalone portrait rule visually offsets header contents by 10px without reserving space. Existing browser checks simulate insets; `docs/pwa.md` explicitly leaves physical installation and status-area rendering unverified.

Apple's [device dimensions](https://developer.apple.com/design/human-interface-guidelines/layout) list iPhone 17 Pro at 402×874 points, which is a regression viewport, not a runtime layout constant. WebKit's [safe-area guidance](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) supports edge-to-edge canvas plus inset foreground controls. The [visual viewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) can differ from the layout viewport under zoom or the keyboard.

## Goals / Non-Goals

**Goals:**

- Keep one coherent shell-height source so the header, measured reading surface, pages, and footer occupy the actual standalone portrait app window.
- Place foreground controls using reported safe-area insets and retain complete-content page fitting.
- Make the reported iPhone 17 Pro portrait state reproducible and measurable without tracking a device model at runtime.

**Non-Goals:**

- New device detection, analytics, provider requests, or deployment infrastructure.
- A redesign of reader chrome, navigation, or Scripture packing policy.
- Treating pinch zoom or a visible keyboard as permission to disable zoom or discard reading position.
- Physical Safari-tab comparison, landscape, keyboard, zoom, rotation, and restoration acceptance in this change. Existing main-spec requirements for these behaviors remain in force.

## Decisions

### Diagnose the installed portrait viewport

The reader was running from `mise run host` on the mirrored iPhone, so temporary local diagnostics appeared live. In standalone portrait, `screen.height` and `100vh` were 874px, while `innerHeight`, `documentElement.clientHeight`, `visualViewport.height`, and `100dvh` were 812px. The top and bottom safe-area insets were 62px and 34px. The shell and footer ended at 812px, exactly where the visible 62px bottom band began. The full measurements and cleanup of the temporary probe are recorded in `docs/pwa.md`. The user-agent OS version was inconsistent and the installed OS version was not independently confirmed.

This distinguishes the short dynamic viewport from a footer padding or page-packing error. Inferring a fixed offset from the screenshot would fail under display settings and iOS changes.

### Preserve the CSS-owned grid and measured surface

Keep the shell as the owner of viewport height and safe-area chrome, and keep pages sized from the actual reading element. A live `100vh` trial expanded the standalone web layer to 874px and moved the footer to 796–874px, with the home-indicator inset inside it. Scope `height: 100vh` to iOS/WebKit standalone mode; ordinary tabs continue using `100dvh`. Do not assign page height from `visualViewport.height`: pinch zoom and the software keyboard can change it independently of the layout viewport. The surface's `ResizeObserver` remains the source for packing, fit, and snap geometry.

Alternative: size the footer or pages directly with viewport arithmetic. That would create separate height calculations and risk gaps or page misalignment when header height and safe-area insets change.

### Resolve header clearance from measured bounds

The original 10px visual offset left the brand in the status-area blur. Replace it with grid-reserved top padding 28px beyond the reported top safe inset on tall portrait standalone windows. Keep the user's preferred brand visible, increase it to 0.8rem and use the theme's text color. The user confirmed the final appearance on the phone; light and dark screenshots showed clear label/menu separation. The menu retained a measured 44px target. Alternative: a visual-only transform would move text without reserving reading-surface space and would leave the page measurement inconsistent with the visible header.

### Verify without live provider scans

Use mocked chapters for browser checks and cached-only CSB inputs for one-screen-fit regression. Both browser engines passed 28 responsive route/menu cases, including four phone widths; 1,260 cached benchmark cases passed without upstream requests. The phone's settled page measured exactly one reading-surface height. Record the measured physical-device results and unverified cases in `docs/pwa.md`.

## Risks / Trade-offs

- [iOS version or installation mode changes viewport reporting] → Scope the correction to installed iOS/WebKit mode and retain ordinary-tab `100dvh`; recheck on future iOS releases. The installed OS version and a physical Safari-tab comparison were unavailable in this pass.
- [WebKit reports a short dynamic viewport in standalone mode] → The mirrored iPhone 17 Pro measured `100dvh` at 812px and `100vh` at 874px. A live `100vh` trial expanded the drawable web layer and placed the footer at 874px; scope that rule to iOS/WebKit standalone mode and retain `100dvh` in tabs. Recheck after iOS updates because WebKit bug 301994 describes related viewport behavior.
- [Changing the header height repacks Scripture] → Keep `ResizeObserver` measurement, run cached fit benchmarks, and check one settled page on the phone. The final extra 4px was user-reviewed visually after the last geometry probe.
- [Combined larger type and 20px root zoom can produce very small effective type on the shortest viewport] → Record the 10.54px Psalm 60:1 outlier in `docs/pwa.md`; a later typography review can address it separately without changing this viewport fix.
- [Desktop emulation reports different safe areas from iOS] → Treat automation as regression coverage; physical portrait measurements establish this change's device behavior. Landscape, keyboard, zoom, and saved-location restoration were not physically rechecked in this pass.

## Migration Plan

No data migration is needed. The active `mise run host` session showed the updated shell live on the installed reader. Production delivery follows the existing static-shell update flow. Revert the scoped viewport/header CSS if a device regression appears, without altering saved reading positions.
