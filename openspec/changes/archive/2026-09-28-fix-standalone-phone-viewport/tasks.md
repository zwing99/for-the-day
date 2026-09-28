# Tasks

## 1. Diagnose and correct installed portrait geometry

- [x] 1.1 Measure the installed iPhone 17 Pro portrait viewport, safe areas, shell, header, reading surface, and footer with a temporary local probe; record the before/after values and the 62px gap cause in `docs/pwa.md`, then remove the probe.
- [x] 1.2 Apply the scoped standalone iOS/WebKit `100vh` shell correction while retaining grid-owned chrome and measured pages; verify live on the mirrored phone that the footer reaches the 874px window bottom with the 34px safe area inside it.

## 2. Restore readable portrait chrome and verify pages

- [x] 2.1 Replace the ineffective 10px visual header offset with reserved safe-area clearance, keep the brand visible, and verify readable brand, passage label, and 44px menu target on the installed phone in light and dark appearance; record the user's final 4px visual confirmation in `docs/pwa.md`.
- [x] 2.2 Extend browser geometry regression to 320/390/402/430px widths and verify contiguous shell, surface, and footer rows plus complete measured pages in Chromium and WebKit; record the phone's settled 659px page alignment and the later 4px clearance adjustment in `docs/pwa.md`.

## 3. Integration acceptance

- [x] 3.1 Run typecheck, lint/format, full unit suite, production build, browser regression, and cached-only CSB fit benchmarks across all densities, sizes, and zoom settings; record 1,260 complete-fit cases, effective-size minima, and the remaining unverified device cases in `docs/pwa.md`.
