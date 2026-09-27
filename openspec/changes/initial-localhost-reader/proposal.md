# Proposal

## Why

Reading the day's Psalms and Proverbs should feel quiet, immediate, and beautiful on a phone. This change establishes a polished localhost reader whose native vertical navigation keeps Scripture central, with faithful provider formatting and clean boundaries for a later deployment.

## What Changes

- Establish Bun, React, TypeScript, Vite, Hono, modern CSS, mise tasks, and official DynamoDB Local through Docker Compose, with safe configuration and an early real-CSB vertical slice.
- Provide the local-calendar reading plan for days 1–31, manual day selection, and CSB (default), NIV, NLT, and ESV through one browser-facing chapter API.
- Preserve Scripture text and semantic structure through provider adapters, a normalized chapter model, and whole-chapter server caching, including attribution and required API.Bible FUMS reporting.
- Cache ESV only for requested reading days within five positions of the reader's current local day on the circular 1–31 reading cycle; bound eligible cached text by provider allowances as well as approximately 24-hour freshness.
- Provide semantic reading cards with Spacious, Balanced (default), and Compact densities, native vertical scrolling, deliberate horizontal passage changes, independent saved locations, and shareable URLs.
- Prioritize phone-sized devices while adapting to iPad-sized viewports: Balanced and Compact use additional usable space for more naturally grouped Scripture, with comfortable line lengths and position-preserving resizing.
- Add optional passage intros, quiet context and passage indicators, restrained settings, local preference persistence, accessible alternatives to gestures, and a static-shell PWA foundation.
- Plan incremental domain, provider, cache, navigation, browser, and mobile Safari verification, including iPad portrait/landscape and Split View, without live provider calls in ordinary automated tests.

This planning change creates artifacts only. Its implementation scope excludes production AWS infrastructure, Terraform, deployment, CI/CD, accounts, cloud sync, notes, highlights, bookmarks, notifications, social or AI features, engagement mechanics, monetization, and persistent frontend Scripture caching. The project remains permanently free and non-commercial.

## Capabilities

### New Capabilities

- `reading-plan`: Calendar-day plans, manual day selection, passage ordering, and restart behavior.
- `scripture-delivery`: Normalized whole-chapter API, provider fidelity, translation access, attribution, FUMS, and safe failures.
- `chapter-cache`: DynamoDB Local whole-chapter caching, freshness, isolation, metadata integrity, and ESV eligibility and capacity limits.
- `semantic-card-packing`: Deterministic density-aware grouping that preserves verses, literary structure, headings, and oversized content.
- `reader-navigation`: Native vertical reading, horizontal passage changes, logical location URLs, history, restoration, and translation mapping.
- `reader-experience`: Typography, context, intro cards, settings, local preferences, accessibility, and loading/error presentation.
- `local-pwa-development`: Local setup and command surface, Docker-independent unit tests, DynamoDB integration verification, and static-shell PWA behavior.

### Modified Capabilities

None; the repository has no existing behavioral specifications or application implementation.

## Impact

Implementation will introduce frontend, server, shared domain, and test modules; `mise.toml`, `compose.yml`, a Bun lockfile, `.env.example`, and setup documentation. Provider access requires server-side API.Bible and Crossway credentials; local AWS credentials are dummy values and no AWS account is needed. React/Vite/Hono, a Node-compatible DynamoDB client, focused test tooling, and a server-side HTML parser are anticipated dependencies; hn-tok's native browser patterns should be adapted before adding gesture or animation libraries.

The design records an actual source review of [hn-tok](https://github.com/rewdy/hn-tok/tree/08f7548bfbbe258aff0ce3927760e09096cfd9da), the reuse candidates and limitations, and provider documentation evidence. No external credentials, copyrighted Scripture text, or reference application source will be committed by this planning change.

## Precedence correction — 2026-09-26

The user-approved `screen-snapping-passage-transitions` change takes precedence for vertical page geometry, settling/restoration, oversized-content fitting, and horizontal transitions. These artifacts are corrected to that contract so sync/archive order cannot restore the former proximity-snap/taller-card behavior. Earlier implementation evidence is historical; reopened tasks require verification under the corrected contract. Unrelated requirements remain in force.
