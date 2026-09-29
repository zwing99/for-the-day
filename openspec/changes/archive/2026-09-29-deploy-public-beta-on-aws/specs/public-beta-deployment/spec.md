# Spec Delta

## Purpose

Make the existing reader available as a repeatable public beta on AWS while preserving the same-origin API contract, Scripture fidelity, cache limits, and server-side credential boundary.

## ADDED Requirements

### Requirement: Public beta hostname and reader routing
The beta SHALL be reachable over HTTPS at `fortheday.beckyandzac.com` after its dedicated public hosted zone is delegated from the parent DNS zone. The site SHALL serve the built reader, install assets, and bundled WEBU chapters through its static origin. Valid reader deep links SHALL load the SPA directly; missing static files SHALL not silently return the SPA shell. The beta SHALL be open to the public without a login or geographic restriction.

#### Scenario: Direct reader link
- **WHEN** a visitor opens a valid passage URL directly or refreshes it
- **THEN** the reader shell loads over HTTPS and resolves the requested passage

#### Scenario: Missing static asset
- **WHEN** a requested versioned asset does not exist
- **THEN** the site returns a missing asset response rather than HTML under the asset URL

### Requirement: Same-origin deployed chapter API
CloudFront SHALL direct `/api` and `/api/*` to API Gateway and all other paths to the static origin. API requests SHALL reach the deployed Hono API through the beta hostname with path and query values intact; the SPA rewrite SHALL never handle an API path. CSB, NIV, NLT, and ESV SHALL retain their existing chapter, attribution, reporting, validation, and cache contracts; WEBU SHALL remain served from static assets. API responses SHALL not be cached by CloudFront, and the deployed API SHALL return safe errors without exposing credentials or upstream diagnostics.

#### Scenario: Licensed chapter request
- **WHEN** a visitor requests a configured licensed edition through `/api/bible/:translation/:book/:chapter` with reading context
- **THEN** the API returns the existing semantic chapter contract using the correct provider and cache policy

#### Scenario: Provider failure
- **WHEN** a provider request fails or is rate limited
- **THEN** the visitor receives the existing safe error and retry behavior without a cached stale API response

#### Scenario: API origin selection
- **WHEN** a visitor requests `/api` or `/api/health`
- **THEN** CloudFront routes the request to API Gateway and never serves the SPA shell

### Requirement: Production cache and credentials
The deployed API SHALL use an AWS DynamoDB table with the existing repository's freshness, identity, TTL, and provider storage limits. Provider credentials and edition IDs for all four licensed editions SHALL be supplied through protected GitLab CI variables and deployed as Lambda environment variables. Their values SHALL remain absent from source control, frontend assets, pipeline logs, and shared artifacts; access to the GitLab-managed Terraform state that contains them SHALL be restricted. Missing or invalid configuration SHALL fail safely without leaking values.

#### Scenario: Fresh deployed cache hit
- **WHEN** a compatible eligible chapter is requested before its expiry
- **THEN** the deployed API returns the complete cached chapter without another provider request

#### Scenario: Provider configuration unavailable
- **WHEN** production provider environment variables are missing or invalid
- **THEN** the API exposes a safe unavailable response and does not reveal their values

### Requirement: Repeatable controlled release
The canonical repository on GitLab.com SHALL provide a repeatable beta infrastructure and application deployment path through GitLab CI using short lived AWS OIDC credentials from a project scoped external role. Terraform state SHALL be stored in separate GitLab-managed DNS and application states with locking. The pipeline SHALL verify and publish a matched API and frontend build, support rerunning a release and restoring a prior known build, and document the required DNS delegation and secret setup. Ordinary checks and release verification SHALL avoid live provider requests unless separately authorized.

#### Scenario: Authorized deployment
- **WHEN** an authorized beta pipeline runs after required checks pass
- **THEN** it deploys the intended code and static assets and verifies the beta health and shell endpoints without provider calls

#### Scenario: Untrusted workflow context
- **WHEN** a pipeline outside the authorized GitLab project and protected `main` branch requests deployment credentials
- **THEN** AWS denies role assumption
