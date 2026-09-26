# Repository guidance

## OpenSpec workflow

OpenSpec is the source of truth for meaningful product and architecture changes. Before implementation, inspect the relevant proposal, specs, design, and tasks; use the repository's OpenSpec instructions and keep task status accurate. Specs define observable behavior, design records architecture decisions, and tasks should be incremental and verifiable. Ask when ambiguity would materially change behavior or architecture. If implementation exposes a planning error, update or flag the artifact instead of silently diverging.

Implement the smallest coherent slice, keep the project runnable at useful milestones, and verify it before calling it complete. Do not add product requirements or infrastructure ahead of an approved change. OpenSpec-generated integrations and workflow files should be maintained through OpenSpec; do not hand-edit generated copies to resolve conflicting guidance.

## Product and architecture

Prioritize an excellent localhost application. Do not introduce AWS deployment infrastructure (Terraform, S3, CloudFront, API Gateway, Lambda deployment, domains, certificates, or CI/CD) until an OpenSpec change explicitly calls for it. Keep local architecture compatible with the intended future shape: browser frontend, Hono API on Node.js Lambda, DynamoDB cache, with CloudFront as the public entry point when deployed.

Keep domain logic independent of UI code where practical, external providers behind adapters, and cache access behind a small repository boundary. Preserve provider-supplied Scripture formatting and text exactly; never modify, paraphrase, summarize, or correct it. Keep credentials server-side and do not expose them or sensitive upstream errors to browser clients. Treat accessibility, responsive behavior, mobile Safari, and touch interaction as core requirements. Prefer native browser behavior and simple, focused modules over speculative abstractions.

## Toolchain and local development

Use `mise.toml` as the canonical toolchain and repository task surface. Prefer discoverable `mise run ...` tasks for setup, development, checks, and service lifecycle; pin repository-level tools through mise and avoid duplicating workflows across shell scripts, Makefiles, and package scripts. Use Bun as the JavaScript runtime, package manager, and script runner where practical; commit its lockfile and do not introduce npm, yarn, or pnpm as competing package managers. Keep browser TypeScript standard and backend code compatible with Node.js rather than relying on Bun-only APIs.

Use the official DynamoDB Local Docker image through the repository `compose.yml` when local DynamoDB is introduced. Expose its lifecycle through mise tasks. Unit tests must not require Docker; use DynamoDB Local when testing DynamoDB-specific behavior. Do not introduce LocalStack. Terraform is out of scope until an OpenSpec change calls for it; when added, expose its pinned toolchain and normal operations through mise.

When updating `.gitignore`, regenerate the relevant editor, operating-system, and stack templates from the HTTPS gitignore.io API (`https://www.toptal.com/developers/gitignore/api/`) and preserve its generated source header. Treat the generated rules as a trusted baseline, but verify the requested template names and review the diff for rules that could hide source, configuration, or shared editor settings. Add project-specific rules separately with a short explanation. Keep the generated template list in the header aligned with the API request; if a requested editor has no template, do not claim it was generated and add only a justified local rule.

The hn-tok repository (https://github.com/rewdy/hn-tok) is an approved reference implementation. Inspect its source for relevant interaction patterns before reinventing them. Adapt useful patterns when they fit this product's requirements, preserve required attribution for copied or substantially derived code, and do not copy its product design wholesale.

## Implementation and verification

For each implementation slice, inspect the applicable planning artifacts and code, make a small coherent change, add or update behavior-focused tests, and run focused checks. Run typechecking, lint/format checks, the full suite, and production build at appropriate milestones. Do not weaken a valid test to pass. For UI changes, exercise realistic mobile viewports, scrolling and touch, short and long content, loading and failure states, and accessibility. Report checks that could not be run.

Before adding dependencies, check whether the platform, existing code, or hn-tok already provides a simple solution. Do not commit credentials; provide safe `.env.example` configuration and keep server secrets separate from frontend variables. Document architectural reasoning in OpenSpec design artifacts and keep developer setup instructions aligned with mise tasks.

## Repository safety

Preserve unrelated user changes and keep edits scoped to the active task. Do not perform destructive Git operations unless explicitly requested. Update this file only when experience reveals a useful durable repository-wide rule; keep temporary task details in the relevant OpenSpec change.
