# Spec Delta

## Purpose

Provide a repeatable localhost development workflow and an installable static application shell with clear verification boundaries and no dependency on production AWS infrastructure.

## ADDED Requirements

### Requirement: Discoverable local workflow
The repository SHALL expose pinned tool installation through `mise install` and setup, development, unit testing, checks, and builds through `mise run setup`, `mise run dev`, `mise run test`, `mise run check`, and `mise run build`. Bun SHALL be the JavaScript package manager/runtime and its lockfile SHALL be committed during implementation. `mise.toml` SHALL be the canonical task surface without a competing Makefile or task runner. Documentation SHALL explain Docker and provider credential prerequisites, ports, service lifecycle, and safe shutdown.

#### Scenario: New developer
- **WHEN** a developer with Docker available runs install and setup, supplies documented provider credentials, then runs dev
- **THEN** the localhost frontend, API, and chapter cache can be used without an AWS account

### Requirement: Local DynamoDB lifecycle
A repository-level `compose.yml` SHALL use the official AWS DynamoDB Local image. Mise SHALL expose start, stop, table initialization, and integration-test tasks, with setup creating required local configuration and tables idempotently. DynamoDB-specific tests SHALL use isolated local tables or equivalent isolation and SHALL not affect a developer's reading cache. The local service SHALL use explicit local endpoints and dummy credentials, with no production provisioning or LocalStack.

#### Scenario: Repeated setup
- **WHEN** setup is run twice
- **THEN** local tables remain usable and existing developer credentials are not overwritten

### Requirement: Secret-safe configuration
The repository SHALL provide a credential-free `.env.example` describing API.Bible credentials and translation IDs, Crossway credentials, DynamoDB Local endpoint/table/region, and local ports. Provider secrets SHALL remain server-side and absent from frontend environment variables, bundles, service-worker caches, test fixtures, and tracked files. Missing credentials SHALL produce actionable local setup guidance rather than bundled Bible text.

#### Scenario: Production frontend build
- **WHEN** the frontend is built with server credentials configured
- **THEN** the generated browser assets contain no provider secret values

### Requirement: Automated verification boundaries
Fast unit and component tests SHALL run without Docker, AWS access, or live Bible provider requests. Ordinary automated tests SHALL use mocks and structurally representative fixtures containing invented non-Scripture text or permitted public-domain test content; copyrighted Scripture text SHALL NOT be committed. Explicit DynamoDB Local integration tests SHALL cover cache write/read, translation/chapter/book isolation, application expiry, metadata round trips, fresh-hit provider avoidance, ESV day eligibility, and bounded eviction. Typechecking, lint/format verification, the full automated suite, and production build SHALL be available through mise.

#### Scenario: Unit tests without services
- **WHEN** Docker is stopped and provider credentials are absent
- **THEN** `mise run test` completes its unit/component suite without network access

#### Scenario: Integration prerequisite missing
- **WHEN** the explicit DynamoDB integration task runs without an available local service
- **THEN** it provides clear setup guidance rather than connecting to AWS or silently passing skipped cache tests

### Requirement: PWA application shell
The built localhost application SHALL include a valid manifest, appropriate metadata, install icons, and a service worker that caches versioned static shell/assets. Navigation fallback SHALL support valid deep links after the shell has been cached. API responses, provider content, FUMS endpoints, and secrets SHALL NOT enter persistent browser caches. Offline shell launch SHALL explain that Scripture requires a connection; this change SHALL not promise offline Scripture availability. Development SHALL avoid stale service-worker interference with hot reload.

#### Scenario: Offline shell
- **WHEN** a previously installed/cached shell opens without connectivity
- **THEN** the application shell loads and offers a useful connection-required state for unavailable Scripture

#### Scenario: Chapter request through service worker
- **WHEN** `/api/bible/CSB/PSA/23` is requested
- **THEN** its response is not written to service-worker or other persistent frontend Scripture storage

#### Scenario: Updated application build
- **WHEN** a new shell version is activated
- **THEN** obsolete static caches are removed and the update does not force a mid-reading reload
