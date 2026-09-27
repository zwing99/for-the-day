# Visual and accessibility verification

Block 12 of `initial-localhost-reader` was completed on 2026-09-27 using Playwright MCP Chromium 153.0.8010.54 and installed Playwright WebKit 26.6. Physical iPhone/iPad Safari was unavailable to automation; the device checks below remain unverified.

## Refinements

The existing Source Serif 4 typography, bounded reading measure, semantic formatting, page fitting, and 10px standalone header offset were retained. Loading and recovery use quiet system typography and bounded message lengths. Invalid-link recovery has a 44px action target. Rate limiting announces both the waiting guidance and the eventual availability of retry, while the menu remains usable for another translation. Malformed server responses receive a safe message without exposing their body; an identifiable HTML 429 still retains its retry cooldown.

Menu control borders now use the muted text color for sufficient contrast. WebKit's native select appearance ignored the existing minimum height, so selects now have an explicit 44px box and a restrained CSS chevron. They remain native select elements with the platform option picker. Menu headings and labels can wrap at enlarged text sizes without horizontal overflow. Escape closes the modal before returning focus to its trigger, correcting a WebKit failure where that trigger was still inert when focus was attempted.

## Layout and content checks

Each engine passed 351 layout checks: 252 benchmark cases (14 viewports × three densities × six saved chapters), 72 representative chapter cases (all four editions' Psalm 23, Psalm 119, and Proverbs 30 at two sizes × three densities), and 27 enlarged-type cases. The benchmark chapters were CSB Psalms 60, 27, 17, 141 and Proverbs 30, plus ESV Psalm 57. Checks measured every rendered Scripture page for complete vertical/horizontal fit, usable-height page geometry, aligned restoration, and absence of horizontal document overflow.

These checks replayed existing permitted samples in memory with tracking disabled. Every chapter request was intercepted before navigation; **zero live Scripture or FUMS requests were made**. No new full-corpus scan was performed: the existing block-10 saved-sample exception remains documented in [the typography measurements](reading-surface.md#source-serif-4-verification--2026-09-27). No font or Scripture formatting changed in block 12. Screenshots and local verification helpers remain Git-ignored under `.local`; tracked evidence contains references and geometry only.

The table reports default-size benchmark minima across all three densities and six benchmark chapters. Surface heights are CSS pixels without simulated OS safe areas. Chromium and WebKit differ by about one pixel in header metrics. Minimum effective sizes below the ordinary size occur on measured oversized pages, chiefly the known ESV attached-heading page; preferences remain unchanged.

| Viewport | Chromium surface | WebKit surface | Minimum effective type, Chromium / WebKit |
| --- | ---: | ---: | ---: |
| 320×568 | 524 | 524 | 16.50 / 16.47px |
| 390×844 | 738 | 739 | 20 / 20px |
| 430×932 | 826 | 827 | 20 / 20px |
| 568×320 | 276 | 276 | 12.32 / 12.32px |
| 844×390 | 346 | 346 | 15.64 / 15.66px |
| 768×1024 | 918 | 919 | 20 / 20px |
| 820×1180 | 1074 | 1075 | 20 / 20px |
| 1024×1366 | 1260 | 1261 | 20 / 20px |
| 1024×768 | 662 | 663 | 20 / 20px |
| 1180×820 | 714 | 715 | 20 / 20px |
| 1366×1024 | 918 | 919 | 20 / 20px |
| 375×1024 | 918 | 919 | 20 / 20px |
| 507×768 | 662 | 663 | 20 / 20px |
| 1440×900 | 794 | 795 | 20 / 20px |

At 320×568, ESV Psalm 57:1 uses scale 0.9462 in Chromium and 0.9443 in WebKit. The particularly short 568×320 landscape needs scale 0.7697; its 12.32px type is a constrained-height compromise and still needs real-device legibility review. Native zoom remains available.

Enlarged-size and 200% root-text checks passed in all densities. The following measured Chromium examples show the available literature space and the effective size of the ESV Psalm 57 worst-case page; other pages retain more of the selected size. Root-text enlargement is an automated text-zoom surrogate, not a physical Safari zoom test.

| Viewport | Large/larger available space | Large/larger effective type | 200% text available space | 200% text effective type |
| --- | ---: | ---: | ---: | ---: |
| 320×568 | 508px | 16.50px | 474px | 16.47px |
| 844×390 | 330px | 15.64px | 296px | 15.39px |
| 507×768 | 598px | 22.70px | 472px | 19.59px |

An invented 60-unit paragraph verified adaptive grouping and exact ordered text conservation in both engines. At 390×844, Spacious/Balanced/Compact produced 60/30/20 pages; at 820×1180 they produced 60/9/6. The tablet column remained 608px including gutters, leaving about 560px for normal-size Scripture. Spacious remained one verse per page, and an explicit verse-8 anchor survived every grouping.

Fresh visual review covered the small-phone CSB Psalm 27:4 poetry, dark-phone Psalm 60:1 with all attached headings, tablet Compact Psalm 119 with its acrostic heading, and dark landscape Proverbs 30:4. Text retained its indentation, line breaks, and headings. Short content had deliberate surrounding space; the tablet accommodated additional natural units without extending lines across the screen. Menus were reviewed in both engines and themes. All 14 viewport menus had contained bounds, no horizontal overflow, and 44px button/select targets; a 320px menu also passed at 200% root text.

## Accessibility and interaction

Focused automated DOM audits covered named controls/dialogs, duplicate IDs, primary target sizes (checkbox labels provide the target), viewport zoom restrictions, and theme contrast. These are targeted checks, not a claim of exhaustive WCAG conformance or a substitute for assistive-technology testing.

| Color against reader background | Light contrast | Dark contrast |
| --- | ---: | ---: |
| Scripture/body text | 12.54:1 | 12.55:1 |
| Muted context and control borders | 5.98:1 | 7.97:1 |
| Focus outline | 6.42:1 | 9.33:1 |

Both engines passed Playwright accessibility-tree review of named menu fields and faithful literary reading order, keyboard page navigation, modal focus wrapping, Escape dismissal/focus return, and visible 3px focus outlines. Loading, ordinary failures, malformed responses, rate-limit cooldown/retry, and invalid-route recovery passed. Component tests also verify that the dialog closes before focus returns and that cooldown readiness is announced.

Reduced-motion contexts suppressed animated navigation while retaining functional page and passage actions. Native text selection blocked navigation shortcuts. Synthetic touch sequences exercised clear horizontal changes and rejection of vertical, diagonal, cancelled, and multi-touch gestures in both engines; Back restored the prior logical location. These injected DOM sequences verify the classifier integration, not native finger scrolling.

Chromium additionally received browser-native touch input: successive vertical swipes advanced settled scroll positions 738 → 1476 → 2214 → 2952px without passage changes or backward jumps, with zero alignment error. A diagonal swipe retained the passage; a deliberate horizontal swipe selected the next one. A two-contact pinch reached visual viewport scale 1.398 without changing the logical route. Desktop WebKit native wheel scrolling settled to page boundaries; mobile WebKit automation does not support wheel injection. Native finger swipe/pinch behavior in real Safari remains unverified.

Viewport changes 390×844 → 390×700 → 844×390 → 820×1180 → 375×1024 retained the logical verse and aligned page in both engines, exercising height changes, rotation, and narrowed Split View geometry. Actual browser-toolbar animation and iPad multitasking were not reproduced. The four existing WebKit safe-area simulations were rerun: the standalone header nudge remained exactly 10px with unchanged reading-surface/footer bounds. Simulated insets cannot establish OS status-bar or Dynamic Island rendering; see [PWA device limits](pwa.md).

## Checks and remaining device review

`mise run check` passed all 214 tests plus both TypeScript configurations and lint/format checks. `mise run build` passed the browser build and Node-compatible server bundle. Strict OpenSpec validation passed. No DynamoDB-specific implementation changed in this slice; integration and full end-to-end readiness remain block 13.

Physical devices were not connected to an automation or remote Safari inspection session. Real iPhone/iPad checks that could not be run are PWA installation/status colors, Dynamic Island blur and the 10px nudge, safe-area behavior with actual browser chrome, fast momentum scrolling, native selection/pinch and the native option picker, very short landscape legibility, rotation with browser toolbars, and actual iPad Split View resizing. Live VoiceOver remains outside the completion gate per the approved tasks. Block 12's automated work is complete with these explicit device limitations; block 13 remains pending.
