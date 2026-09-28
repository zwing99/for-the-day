# Installable application shell

## Add to your Home Screen

On a supported mobile browser visit, the reader offers a small invitation above the reading page. Reading remains available. Choose **Install app** to open Android's installation prompt when the browser provides one. Otherwise, use the browser menu and choose **Install app** or **Add to Home Screen**, then confirm. On iPhone in Safari, open **Share** or **Page Menu**, choose **Add to Home Screen**, leave **Open as Web App** enabled when offered, then tap **Add**. Browser menu labels vary by version. These steps follow [Apple's iPhone guide](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios) and [Chrome's Android guide](https://support.google.com/chrome/answer/9658361/use-progressive-web-apps-android?co=GENIE.Platform%3DAndroid&hl=en-GB).

**Remind me in a week** hides the invitation for seven elapsed days. **Never ask again** hides future automatic invitations until you turn that choice off in reader Settings. The reader menu keeps an **Install app** action on supported mobile browsers, including when opened from the private-network HTTP address printed by `mise run host`. That address is for phone interaction testing; the app shell and Android PWA installation require HTTPS or localhost/loopback. From the LAN address, Install app explains this limit and reading remains usable. Opening instructions does not mean installation succeeded. The invitation is absent in standalone Home Screen mode.

### LAN host behavior

On a phone, `mise run host` serves a private IPv4 HTTP origin (such as `http://10.x.x.x`). Supported mobile browsers show the invitation and menu action there so the install steps can be tested. The phone and development computer must share a network. HTTP on a LAN address does not provide the secure context needed for the offline app shell. Android explains that HTTPS is needed; iPhone explains that the Home Screen icon opens this local address and the phone must stay on the same network. `localhost` and loopback remain trustworthy for the device that runs the browser; a phone's own `localhost` refers to the phone, not the development computer. Public insecure HTTP origins and desktop browsers do not show the mobile invitation.

### Mobile install and daily-start verification — 2026-09-28

The production build passed LAN-host interaction checks at `http://10.13.0.172:4174` in mobile iPhone WebKit and Android Chromium. Both platforms showed the install invitation above, without overlap with, the reader; portrait/landscape layout, help, menu action, keyboard close, touch scrolling, larger root text, same-date return, next-month reset for a repeated day number, and standalone invitation suppression passed. Android help stated that installation from this private HTTP address requires HTTPS. A separate Playwright accessibility snapshot confirmed the built desktop reader has no mobile invitation. The physical iPhone Mirror was connected to an existing standalone session; the invite is intentionally hidden in that mode.

The cached CSB one-screen regression passed 1,800 cases in Chromium and WebKit with the invitation visible for mobile geometry: five benchmark references, all three densities, normal/large/larger preferences, 16px/20px root sizes, and 320×568, 390×844 and 844×390. At default preference, all tested verse pages fit without local shrinking; minimum measured reader surfaces were 423.6px, 673.7px and 280.8px respectively. No upstream requests were made. `mise run check` passed 291 unit/component tests and both typechecks, lint and formatting; `mise run build` passed. Storage regressions verify the rolling 90-date bound.

## iPhone Mirroring viewport trial — 2026-09-28

The iPhone 17 Pro was running the reader from `mise run host` in Home Screen standalone mode, so Vite edits appeared live. In portrait dark mode, the original intro had a 62 CSS pixel band below the footer, and the small “For the day” brand looked blurred against the status treatment. A temporary local probe was shown on the phone and then removed. Its user agent contained `iPhone OS 18_7` and `Version/27.0`; that string is not a reliable OS-version measurement, so the installed iOS version remains unconfirmed.

| CSS pixels | Before (`100dvh`) | Trial/final (`100vh` in iOS standalone) |
| --- | ---: | ---: |
| Screen | 402×874 | 402×874 |
| `innerWidth × innerHeight` | 402×812 | 402×874 |
| `documentElement.clientWidth × clientHeight` | 402×812 | 402×812 |
| Visual viewport; offset; scale | 402×812; 0; 1 | 402×874; 0; 1 |
| `100vh` / `100dvh` / `100svh` / `100lvh` | 874 / 812 / 812 / 874 | 874 / 874 / 812 / 874 |
| Safe area top/right/bottom/left | 62 / 0 / 34 / 0 | 62 / 0 / 34 / 0 |
| Shell | 0–812 | 0–874 |
| Header | 0–113 | 0–113 before top-clearance adjustment |
| Reading surface | 113–734 (621 high) | 113–796 (683 high) before top-clearance adjustment |
| Footer | 734–812 (78 high) | 796–874 (78 high) |

The 62px gap began exactly where the `100dvh` shell ended. A live `100vh` trial put the footer and passage indicators at the physical screen bottom, with the 34px home-indicator safe area still inside the footer. The final scoped CSS rule reproduced that result without the probe. The header first reserved 24px more space after the reported top safe inset in tall portrait standalone mode. At that point, on a settled Scripture page, the shell was 0–874, header 0–137, brand 89–106, menu 88–132 (44px target), surface 137–796 (659px), and footer 796–874. The active page aligned at 137–796, exactly matching the surface; the preceding intro was −522–137. The intro and first Scripture page were visually checked in dark mode, and the Scripture page was also checked in light mode. The brand remained visible at 0.8rem with full text color; the menu and passage label did not overlap it. The appearance preference was restored to `system` after testing. At the user's request, the header clearance was increased another 4px to 28px; the user visually confirmed the result on the phone after iPhone Mirroring disconnected. Landscape, Safari tab mode, rotation, zoom, keyboard dismissal, saved-location restoration, and the installed iOS version still need checks.

[WebKit bug 301994](https://bugs.webkit.org/show_bug.cgi?id=301994) describes a similar Home Screen viewport mismatch. This phone's measured `vh`/`dvh` split and successful live trial support the scoped `100vh` correction, while ordinary browser tabs retain `100dvh`.

### Cached fit and browser checks

`mise run check` passed both typechecks, lint, format, and 265 unit tests; `mise run build` passed. The browser regression passed 28 mocked route/menu cases in each of Chromium and WebKit, including 320/390/402/430px phone widths and contiguous shell/surface/footer bounds. No provider requests were made.

With `VERSE_FIT_SCOPE=benchmarks`, 1,260 cached CSB cases passed across Chromium and WebKit: five standing worst-case references, three densities, normal/large/larger size, 16px/20px root type, and seven portrait, landscape, tablet, and desktop viewports. The following minima combine both engines and all size settings; every tested page fit completely. The browser matrices used ordinary tab geometry with no simulated phone safe area; the physical standalone portrait surface measured 659px as recorded above.

| Viewport | Minimum surface / content height | Minimum effective Scripture size |
| --- | ---: | ---: |
| 320×568 | 519px / 502px | 10.54px |
| 390×844 | 723px / 642px | 15.68px |
| 430×932 | 811px / 730px | 20px |
| 844×390 | 341px / 324px | 11.25px |
| 820×1180 | 1059px / 978px | 20px |
| 507×768 | 647px / 566px | 18.93px |
| 1440×900 | 779px / 698px | 20px |

The 10.54px minimum was Psalm 60:1 with attached headings at 320×568 under `larger` plus a 20px root size; 11.25px was the same reference in short landscape. At normal size with a 16px root, the minimum effective size was 16px. These unusually small combined larger-type/zoom cases need a legibility review before calling the fit acceptance complete. All five required cached chapters were present; no full-corpus remeasurement or live provider scan occurred.

Run `mise run build`, then `mise run preview`, and open `http://127.0.0.1:4173`. Preview uses built assets and the local Hono API proxy. The manifest declares a standalone window, root start URL/scope, and 192px/512px icons exported from the existing logo. iOS metadata includes a 180px Apple touch icon and a translucent status bar. The page background and browser theme color follow the reader's explicit appearance preference or live system appearance, so a dark reader also paints the safe-area canvas dark. Physical iPhone/iPad installation remains part of the later device review.

Service workers require a secure browser context: localhost/loopback preview qualifies, but a phone's plain HTTP LAN URL from `mise run host` does not. That task remains useful for ordinary reader interaction testing. No HTTPS deployment infrastructure is added. See [MDN's service-worker guide](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) for the browser lifecycle and secure-context rules.

## What works offline

After successful shell installation, reload or reopen the app to let the worker control it. The cached shell can open root and deep reading links offline, including translation/location query parameters. It retains fonts, icons and reader controls. An unavailable chapter shows “Scripture requires a connection. Reconnect, then try again.” Restore connectivity and choose **Try again** to load the chapter at the requested location.

Dedicated chapter storage supports fresh retained CSB/NIV/NLT chapters for up to 24 hours and ESV chapters for up to one hour after retrieval, including reload/reopening. Fixed expiry, whole-chapter verse bounds and browser storage deletion/eviction limit availability; there is no durable offline Scripture guarantee. Expired chapters require a connection and are never shown as a failure fallback. The worker remains static-only. Clearing site data removes the offline shell and local reading preferences/positions.

## Static storage and updates

`scripts/pwa-build.ts` generates `/sw.js` with an exact static asset allowlist and a cache name derived from the shell, assets and worker source. It precaches HTML, emitted JS/CSS, four font files, icons and the manifest. It does not cache arbitrary responses, deep-link URLs, API data, remote providers, FUMS, or secrets. Unknown requests, external origins, non-GET requests, `/api` and `/api/*` bypass interception; query-bearing static asset requests also bypass it. Chapter requests use `no-store`. Dedicated IndexedDB chapter retention follows [browser retention policy](chapter-api-cache.md#browser-chapter-retention); localStorage still holds guarded preferences and logical reading locations only.

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

### Earlier correction: a 10px visual header nudge

At this earlier milestone, only the header text container and menu button received a relative 10px downward offset in installed iOS/WebKit portrait windows taller than 600px. The live iPhone check above showed the brand remained blurred. The current implementation replaces that visual offset with 28px of header space after the safe-area inset, so the reading surface is remeasured and repacked.

Chromium simulated the iOS/standalone conditions and a 59px top/34px bottom safe area at 390×844. The brand moved from y=63.5px to 73.5px and menu from y=60.02px to 70.02px. Before and after, the reading surface stayed at y=109.04–766px and the bottom controls at y=766–844px. All 212 tests and the production build passed. Actual iPhone blur clearance still needs device confirmation. No provider calls were made.

### WebKit follow-up — 2026-09-27

After the user installed Playwright WebKit, a focused check ran in WebKit 26.6 at 390×844, 320×568, 844×390 and 768×1024 with mobile/touch contexts, dark appearance and invented chapter responses. Screenshots were visually reviewed. Fonts loaded, cards fit, no horizontal overflow or runtime errors occurred, the settings dialog stayed within every viewport, and tapping Begin reached the first verse. Eight chapter requests were mocked; no provider/tracking requests were made.

Desktop WebKit reported standalone mode and `-webkit-touch-callout` support as false, so the installed-iOS conditions and safe-area values were explicitly simulated for the header comparison. At 390×844, the brand moved from y=63.22px to 73.22px and menu from y=59.52px to 69.52px, while the reading surface remained at y=108.03–766px and footer at y=766–844px. Short portrait and landscape correctly received no nudge. This is a WebKit layout smoke check, not evidence that the Dynamic Island/system blur or physical installed-PWA behavior was reproduced. Broader WebKit/device verification remains in block 12.

## WEBU static content

WEBU loads revisioned same-origin chapter JSON without the API or licensed chapter caches. Scripture JSON is excluded from the shell worker’s precache and interception allowlist, so installation does not download the complete corpus. A previously fetched asset may be available through browser HTTP caching; unavailable or corrupt assets fail safely with retry and never substitute a translation. A new build pins its manifest and corpus revision together. Old releases cannot silently mix chapters from the new corpus.
