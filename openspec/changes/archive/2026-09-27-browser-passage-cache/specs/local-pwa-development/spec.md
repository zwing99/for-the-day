# Spec Delta

## MODIFIED Requirements

### Requirement: PWA application shell
The built localhost application SHALL include a valid manifest, appropriate metadata, install icons, and a service worker that caches versioned static shell/assets. Navigation fallback SHALL support valid deep links after the shell has been cached. API responses and provider content SHALL NOT enter service-worker caches. Dedicated browser chapter storage SHALL permit only the validated chapters authorized by browser-chapter-cache, including ESV chapters loaded by the reader within the one-hour lifetime and verse bounds; FUMS endpoint responses and secrets SHALL NOT enter persistent browser caches. Offline shell launch SHALL display a fresh retained chapter when available and explain that unavailable or expired Scripture requires a connection. Development SHALL avoid stale service-worker interference with hot reload.

#### Scenario: Offline shell
- **WHEN** a previously installed/cached shell opens without connectivity
- **THEN** the application shell loads and offers a useful connection-required state for unavailable Scripture

#### Scenario: Chapter request through service worker
- **WHEN** `/api/bible/CSB/PSA/23` is requested
- **THEN** its response is not written to service-worker storage; only a validated permitted chapter can enter dedicated browser chapter storage

#### Scenario: Updated application build
- **WHEN** a new shell version is activated
- **THEN** obsolete static caches are removed and the update does not force a mid-reading reload
