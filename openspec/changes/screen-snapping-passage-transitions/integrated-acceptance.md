# Integrated acceptance — 2026-09-26

Tasks 4.1 and 4.2 are complete within the available-browser scope. Standalone Playwright MCP exercised isolated Chromium contexts against localhost; real provider content stayed transient. No full-corpus rescan was needed because fonts and provider formatting were unchanged.

## Completed measurements

All three densities were checked with the five standing CSB benchmarks. All rendered chapter pages were measured, not only the addressed verse. The 135 cases below passed complete two-axis fit, exact page heights, mandatory snapping, restored-page alignment within two CSS pixels, and no horizontal body overflow.

| Viewport | Usable height | Minimum effective type | Minimum local scale |
| --- | --- | --- | --- |
| 320×568 | 462px | 16px | 1 |
| 390×844 | 738px | 20px | 1 |
| 430×932 | 826px | 20px | 1 |
| 568×320 | 276px | 15.83px | 0.9896 |
| 768×1024 | 918px | 20px | 1 |
| 1024×768 | 662px | 20px | 1 |
| 375×1024 | 918px | 20px | 1 |
| 507×768 | 662px | 20px | 1 |
| 1440×900 | 794px | 20px | 1 |

The existing invented fixture passed another 27 cases across these viewports and densities, including split and merged identities. An oversized invented fixture with twelve indented poetic lines, using the larger preference, passed 27 cases after the fitting correction. Its minimum effective size was 10.36px at 320×568; this deliberately pathological invented fixture establishes content conservation/fit, not readable real-corpus defaults.

The larger preference with all five real benchmarks passed 30 cases at 320×568 and 568×320 after the correction. Minimum effective sizes were 16.67px and 15.83px respectively.

## Fitting correction

The binary measurement search mutates page typography. It previously left the final trial scale applied even when the returned rounded scale was smaller. React does not necessarily rewrite a style whose stored value has not changed. Near a line-wrap boundary, the trial could leave content taller than the available area. The fitting helper now applies the accepted rounded scale before returning. A behavior test covers a discontinuous wrapping threshold; browser reruns of the failing real and invented cases pass.

## Text-zoom legibility correction

200% root text (32px) was checked with all five benchmarks and three densities at 320×568, 390×844, and 768×1024: 45 geometry cases pass. However, enlarged chrome leaves only 324px of reading height at 320×568 and complete-page fitting reduces the minimum effective type to **9.78px**. At 390×844 the minimum is 19.97px, and at 768×1024 it is 32px. Geometric fit is not acceptance of the small-phone legibility result.

Native Chromium page-scale emulation at 390×844 reports visualViewport.scale=2 while the CSS Scripture size stays 20px, the anchor remains PSA.60.1, and mandatory snapping remains enabled. This confirms browser magnification is not cancelled by local fitting; it is not physical Safari pinch verification.

The user approved compact chrome/composition. At heights up to 600px, brand/dots are omitted and reading padding is 8px vertically / 16px horizontally (with safe-area protection). Text still enlarges; spacing no longer consumes the reclaimed area. A 45-case 200% rerun at 320×568, 390×844 and 568×320 passes fit and alignment across all benchmarks/densities. Minimum effective sizes are 18.43px, 19.97px and 14.67px respectively. On the small portrait phone, usable height is 476–490px depending on the passage label wrapping. A 45-case default rerun at 320×568, 320×740 and 568×320 passes: respective usable heights are 524px, 634px and 276px, minimum effective sizes 17.44px, 19.99px and 15.83px, and all portrait scales remain 1.

WebKit is not installed in the local Playwright cache. Physical iPhone/iPad Safari, hardware safe areas and dynamic Safari chrome have not been verified.

## Integrated interactions and visual checkpoint

Another 27 invented-fixture cases (nine viewport sizes × three densities) passed trusted CDP touch checks: 30px partial drag visibly reveals the inert/aria-hidden neighbor and returns without changing the URL; 100px drag visibly reveals the neighbor and commits the next passage; mounted Back restores the same logical anchor to an aligned page. First/destination/restored pages remain aligned, no horizontal body overflow appears, and the end attribution page is aligned, fitted and has reachable links.

At 390×844, Chromium additionally passed vertical trusted touch and native wheel settling, horizontal wheel passage navigation, diagonal/cancelled/multi-touch/selection exclusions, keyboard page navigation, sheet focus containment/Escape return, reduced-motion navigation without translation, transient loading, safe access-denied failure, menu access during failure, and successful retry. Fast synthetic vertical flings were checked after one second to allow native inertia/snap settling, rather than treating intermediate animation frames as resting positions. Height changes to 700px and tablet resize retained the logical anchor and alignment. This simulates viewport changes, not Safari chrome or hardware safe areas.

Chromium's accessibility tree exposes the named main landmark and introduction, Verse 1a, Verse 2, Verse 3-4 articles in source order. Inactive previews are inert/aria-hidden; unit/component tests verify they cannot report or save progress. Live VoiceOver remains outside the current completion gate.

Invented-only phone/tablet screenshots were captured and inspected at `.local/screen-checkpoint-phone.png` and `.local/screen-checkpoint-tablet.png`. Both show quiet context, bounded text measure, no overlap and no primary navigation button rows. Real-content intermediate-drag evidence remains ignored; no Scripture screenshots are introduced into tracked fixtures.

Browser persistence in the isolated acceptance context contains generated logical reference URLs only; sessionStorage, IndexedDB, Cache Storage and service-worker registrations are empty. Preference persistence is separately covered by the storage/component suite. Provider reporting may maintain its own anonymous identifier in a normal real-provider context; this is not Scripture or a credential.

## Final checks and reconciliation

`mise run check` passes typechecking, lint, formatting and all 140 tests in 16 files. `mise run build` passes browser and Node-compatible API builds. Strict validation passes for this change and the affected predecessor changes. Both tracked fixture modules were reviewed: all prose/notices/tokens are invented. `.envrc`, local research and browser screenshots are ignored; frontend assets contain none of the server credential/configuration variable names checked.

Older specs retain the corrected mandatory-screen, complete-content fitting and visible-transition contracts. The approved compact-chrome exception is recorded consistently so archive order cannot restore mandatory indicators on constrained-height screens. Main specs have not been created and no change has been archived.

Verified overlap covers the reopened reading-first card fitting and intro/reporting/navigation slices (1.2, 2.2, 2.3). Other earlier tasks remain open where their complete acceptance includes additional screenshots, themes, broader settings/provider work or device coverage. Initial-change sections 8 onward, fonts, sharing, PWA and deployment remain outside this checkpoint. The user accepted chrome as good enough and requested no further chrome refinement. The separate last-seen-preview proposal remains planning-only.
