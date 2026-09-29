# Proposal

## Why

The reader is ready for a public beta, but it currently runs only through the localhost Vite server, Node listener, and DynamoDB Local. A repeatable AWS deployment is needed at `fortheday.beckyandzac.com` without exposing provider credentials or weakening the local development workflow.

## What Changes

- Provision a dedicated public Route 53 hosted zone for `fortheday.beckyandzac.com`, DNS validated ACM certificate, private S3 static origin, CloudFront distribution, API Gateway HTTP API, Node.js Lambda, and DynamoDB chapter cache in `us-east-1` with Terraform.
- Route SPA deep links and static assets to S3 and `/api/*` to API Gateway on the same public origin. Preserve current chapter API behavior and support WEBU static chapters plus CSB, NIV, NLT, and ESV through their existing providers.
- Add a Lambda entry point and production configuration that reuse the existing Hono app, provider adapters, and repository. Keep the localhost listener and DynamoDB Local path available.
- Move the canonical repository and beta deployment pipeline to `https://gitlab.com/zwing99/for-the-day`. Use GitLab CI with an externally created, project scoped AWS OIDC role and two GitLab-managed Terraform states; provide the role trust and permission contract.
- Supply provider keys and edition IDs as protected, masked GitLab CI variables and deploy them as Lambda environment variables. Document their presence in the access-controlled GitLab Terraform state and the redeployment needed for rotation; no runtime secret fetch is required.
- Document parent zone NS delegation, setup order, release verification, rollback, and the distinction between CloudFront's SPA rewrite function and the API Lambda.

## Capabilities

### New Capabilities

- `public-beta-deployment`: A repeatable public AWS deployment and release path at the beta hostname, including DNS, routing, server runtime, cache, secrets, and GitLab authentication.

### Modified Capabilities

None. The existing Scripture, cache, and localhost behavior contracts remain in force.

## Impact

Terraform, GitLab CI, GitLab-managed state, mise tasks, production build packaging, a new server Lambda entry point and shared server setup, deployment documentation, AWS account resources, DNS delegation in the parent zone, and provider configuration. No Scripture text or provider responses are added to tracked files.
