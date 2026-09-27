# Installable application shell

Run `mise run build`, then `mise run preview`, and open `http://127.0.0.1:4173`. Preview uses built assets and the local Hono API proxy. The manifest declares a standalone window, root start URL/scope, and 192px/512px icons exported from the existing logo. iOS metadata includes a 180px Apple touch icon and a translucent status bar. The page background and browser theme color follow the reader's explicit appearance preference or live system appearance, so a dark reader also paints the safe-area canvas dark. Physical iPhone/iPad installation remains part of the later device review.

Service workers require a secure browser context: localhost/loopback preview qualifies, but a phone's plain HTTP LAN URL from `mise run host` does not. That task remains useful for ordinary reader interaction testing. No HTTPS deployment infrastructure is added. See [MDN's service-worker guide](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) for the browser lifecycle and secure-context rules.

## What works offline

After successful shell installation, reload or reopen the app to let the worker control it. The cached shell can open root and deep reading links offline, including translation/location query parameters. It retains fonts, icons and reader controls. An unavailable chapter shows “Scripture requires a connection. Reconnect, then try again.” Restore connectivity and choose **Try again** to load the chapter at the requested location.

This is shell-only recovery. There is no offline Scripture guarantee. Already displayed chapter data can remain in memory until navigation or closing; the worker never makes it persistent. Clearing site data removes the offline shell and local reading preferences/positions.

## Static storage and updates

`scripts/pwa-build.ts` generates `/sw.js` with an exact static asset allowlist and a cache name derived from the shell, assets and worker source. It precaches HTML, emitted JS/CSS, four font files, icons and the manifest. It does not cache arbitrary responses, deep-link URLs, API data, remote providers, FUMS, or secrets. Unknown requests, external origins, non-GET requests, `/api` and `/api/*` bypass interception; query-bearing static asset requests also bypass it. Chapter requests use `no-store`. IndexedDB is unused; localStorage holds guarded preferences and logical reading locations only.

An update waits while the previous worker has reading tabs open. The menu announces that an update is ready: finish reading, close all reader tabs/windows, then reopen. There is no forced reload or production `skipWaiting`/`clients.claim`. Activation deletes only obsolete `for-the-day-shell-*` caches, preserving unrelated caches and user progress. This follows the browser's [default update lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers#updating_your_service_worker).

Development does not install a caching worker. It unregisters this app's worker and clears its static caches. Vite also serves a non-caching retirement worker so a reused preview origin can release an old controller. When switching the same origin from preview to development, allow the worker update to finish and refresh again; live source and hot reload then take over. Normal development (5173) and preview (4173) use separate origins.

## Block 11 verification — 2026-09-27

Build and preview passed. An alternate API port preserved the existing development session. Playwright MCP used isolated Chromium contexts and invented mocked chapter/error responses. No live Scripture or FUMS calls were made.

- Manifest/icon responses returned 200 with actual 192×192/512×512 dimensions. Standalone metadata and a translation-bearing verse deep link were verified; the icon export was visually reviewed.
- At 390×844, a cached shell opened a different passage/translation deep link offline, showed connection-required recovery without horizontal overflow, then recovered the requested verse through **Try again**. Source Serif 4 loaded from shell assets.
- Cache Storage held exactly 11 static files; IndexedDB was empty; localStorage held only logical locations. Unit regressions prove API/provider/FUMS/unknown/non-GET requests bypass interception.
- A simulated worker version waited with the active verse unchanged, announced the update, then removed the old cache after the controlled tab closed. Reopening retained the logical verse.
- Replacing preview with Vite development on the same port retired the old worker. After retirement and refresh, registrations and caches were empty and `/@vite/client` loaded. The ordinary development origin likewise had no worker/caches and loaded hot reload.
- The reported white iPhone status area and blurred brand label led to translucent iOS metadata, synchronized canvas/theme colors, an opaque header and 8px of space after the top safe-area inset. Chromium verified canvas/header/theme agreement for explicit light/dark overrides and live system changes. iPhone status-bar rendering needs physical confirmation, including light-mode contrast. Previously installed icons may need removal and reinstallation for changed iOS metadata.

All 212 unit/component tests, both TypeScript configurations, lint, formatting, browser/Node builds and strict OpenSpec validation passed. WebKit and physical iPhone/iPad installation/offline checks remain in block 12.

### Safe-area fit regression

The header adjustment passed 198 offline cases using all five saved CSB worst-case chapters and ESV Psalm 57, in every density. Safe-area inputs were conservatively simulated as 32px top, 24px bottom and 28px on both sides; these are CSS simulations, not hardware measurements. Ordered semantic text, poetry, headings, full page fit and loaded fonts were verified, with no horizontal overflow. All default CSB benchmark pages fit without shrinking. Default ESV Psalm 57:1 required local fitting in these constrained phone cases; preferences and text stayed unchanged.

| Viewport | Reading surface | Minimum default effective type | Minimum default local scale |
| --- | --- | --- | --- |
| 320×568 | 492px | 15.12px | 0.9058 |
| 390×844 | 686px | 19.57px | 0.9783 |
| 844×390 | 314px | 14.12px | 0.8825 |
| 768×1024 | 866px | 20px | 1 |
| 375×1024 | 866px | 20px | 1 |
| 1440×900 | 742px | 20px | 1 |

Large/larger preferences passed at 320×568 and 844×390, with minimum effective sizes of 15.12px/14.12px respectively for ESV Psalm 57:1. The 200% root-text case passed at 320×568 with a 444px surface and a 15.09px minimum. These minima reflect indivisible-page fitting under the existing user-approved policy, not a lower saved font preference. No new full-corpus scan or live provider requests were needed for this safe-area change.

### Current correction: a 10px visual header nudge

The user clarified that only a subtle 10px movement of the top text was intended. The padding-based workaround above has been superseded: header padding is restored to its original safe-area calculation. Only the header text container and menu button receive a relative 10px downward offset in installed iOS/WebKit portrait windows taller than 600px. This does not reserve additional layout height, repack Scripture, or move the bottom passage indicators. Short windows, landscape and ordinary browser windows retain their original placement.

Chromium simulated the iOS/standalone conditions and a 59px top/34px bottom safe area at 390×844. The brand moved from y=63.5px to 73.5px and menu from y=60.02px to 70.02px. Before and after, the reading surface stayed at y=109.04–766px and the bottom controls at y=766–844px. All 212 tests and the production build passed. Actual iPhone blur clearance still needs device confirmation. No provider calls were made.

### WebKit follow-up — 2026-09-27

After the user installed Playwright WebKit, a focused check ran in WebKit 26.6 at 390×844, 320×568, 844×390 and 768×1024 with mobile/touch contexts, dark appearance and invented chapter responses. Screenshots were visually reviewed. Fonts loaded, cards fit, no horizontal overflow or runtime errors occurred, the settings dialog stayed within every viewport, and tapping Begin reached the first verse. Eight chapter requests were mocked; no provider/tracking requests were made.

Desktop WebKit reported standalone mode and `-webkit-touch-callout` support as false, so the installed-iOS conditions and safe-area values were explicitly simulated for the header comparison. At 390×844, the brand moved from y=63.22px to 73.22px and menu from y=59.52px to 69.52px, while the reading surface remained at y=108.03–766px and footer at y=766–844px. Short portrait and landscape correctly received no nudge. This is a WebKit layout smoke check, not evidence that the Dynamic Island/system blur or physical installed-PWA behavior was reproduced. Broader WebKit/device verification remains in block 12.
