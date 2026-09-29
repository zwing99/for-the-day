# Tasks

## 1. Production API runtime

- [x] 1.1 Extract shared provider/service construction from the local listener while preserving its loopback database and development response cache; verify current API and provider unit tests plus the local preview still work.
- [x] 1.2 Add a Node-compatible Hono Lambda handler and AWS DynamoDB client path using execution-role credentials; verify handler tests cover `/api/health`, path/query forwarding, safe failures, and unchanged chapter response shape with mocked providers.
- [x] 1.3 Read all five provider configuration fields from Lambda environment variables, validate missing/invalid values, and reuse the existing service construction; verify mocked handler tests cover safe configuration failures without printing values or adding runtime secret requests.
- [x] 1.4 Add a reproducible Node Lambda ZIP build through mise, pin necessary tools/dependencies through the existing toolchain, and verify the artifact runs under the selected Lambda-compatible Node version without Bun runtime APIs.

## 2. AWS foundation and routing

- [x] 2.1 Add pinned Terraform providers, variables, outputs, the top-level `terraform/main.tf` root composed from reusable modules, and a GitLab HTTP backend for state `beta-app` in `us-east-1`; keep only `modules/dns` enabled for the first apply and render the external deploy-role policies through Terraform IAM policy documents without creating that role. Verify `terraform fmt`, the deployment root, and policy contents through a discoverable mise task without provider secrets.
- [ ] 2.2 Provision the dedicated public hosted zone from the `modules/dns` block in `terraform/main.tf` and output its four name servers; verify its apply can complete before parent delegation or certificate issuance.
- [ ] 2.3 Provision DNS-validated ACM certificate, CloudFront A/AAAA records, private versioned S3 bucket, and OAC policy in the app root; verify plans show no public bucket access and identify the delegated zone.
- [x] 2.4 Implement and exercise the CloudFront SPA viewer-request function for `/`, day routes, and passage/verse routes, rewriting each to the root `/index.html` while leaving WEBU JSON, hashed assets, icons, manifest, and unknown file requests intact; verify focused route cases against the built SPA paths and query strings.
- [ ] 2.5 Add the API Gateway HTTP API, Lambda integration and execution role, DynamoDB table/TTL, separate CloudFront `/api` and `/api/*` behaviors with disabled caching, query forwarding, and safe gateway throttles; verify Terraform plan and mocked gateway event tests keep both API paths out of the SPA and preserve reading context.
- [x] 2.6 Document initialization of the GitLab-managed state using CI job token HTTP backend and lock endpoints, first apply with only the DNS module enabled, hosted-zone delegation, then uncommenting the app module and using the same plan/apply jobs; verify a fresh operator can identify every state and DNS action from outputs.

## 3. Credentials and deploy identity

- [x] 3.1 Configure Terraform's Lambda environment from sensitive inputs for all five provider fields and enforce the 4 KB Lambda limit; verify missing variables stop deployment, runtime configuration failures are safe, and source/browser assets contain no provider values.
- [x] 3.2 Publish an external OIDC role trust policy and narrowly scoped deployment permission policy for GitLab.com project `zwing99/for-the-day` on protected `main`, using its project/namespace IDs and covering Terraform, Lambda configuration, artifact upload, and invalidation permissions; verify the documented trust conditions and permissions against pipeline operations.
- [x] 3.3 Document protected, masked, hidden GitLab variable entry and rotation for CSB, NIV, NLT, and ESV, the `beta` environment/branch restriction, role ARN variables, Lambda configuration visibility, and the fact that app Terraform state contains provider values; verify first deployment and rotation instructions never print credentials or publish a saved plan.

## 4. GitLab release and recovery

- [ ] 4.1 Move the canonical remote to GitLab.com and add a serialized GitLab CI beta pipeline for protected `main` and manual runs using OIDC, repository checks, deterministic frontend/API builds, sensitive provider inputs, Terraform apply without secret-bearing plan artifacts, and matched build publication; verify CI lint/static review and a dry-run plan without provider calls or logged values.
- [ ] 4.2 Upload versioned static files before entry documents, set appropriate cache metadata, deploy the matching Lambda ZIP, and invalidate only necessary CloudFront paths; verify release scripts are idempotent and preserve older hashed/WEBU assets needed by retained clients.
- [ ] 4.3 Retain release identifiers/artifacts and document a rollback that restores the matching previous API and static build without replacing DNS, secret values, or the cache table; verify a rehearsal using local or isolated artifacts.
- [ ] 4.4 Add provider-free release checks for TLS/DNS, `/api/health`, `/`, a direct reader deep link, WEBU JSON, and a missing asset; verify checks fail clearly on wrong-origin routing or HTML served as JSON/JS.

## 5. Integrated acceptance

- [x] 5.1 Run typechecking, lint/format checks, the full automated suite, production build, Terraform validation, and focused SPA/API routing checks; record results and any account-dependent checks that cannot run. (CI-compatible unit suite: 310 tests; DynamoDB Local integration suite intentionally remains outside CI per project instructions.)
- [ ] 5.2 When AWS access, parent NS delegation, and protected GitLab provider variables are supplied, review the redacted Terraform plan, deploy the beta, verify the public hostname and all non-provider checks, and record actual resource outputs without credentials or licensed Scripture. Any live licensed-edition smoke request requires a separately approved provider request budget.
