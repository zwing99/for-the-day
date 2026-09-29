# Public beta deployment

The beta hostname is `fortheday.beckyandzac.com`. GitLab.com is the canonical repository and deployment authority. Deployment uses one Terraform root and one GitLab-managed state:

| Root | GitLab state | Purpose |
| --- | --- | --- |
| `terraform/` | `beta-app` | Dedicated public hosted zone, then ACM, CloudFront, private S3, API Gateway, Lambda, and DynamoDB |

The first apply creates only the public hosted zone. The app resources are enabled in that same root after the parent delegates the zone.

## GitLab project and AWS OIDC role

The project is `zwing99/for-the-day`, project ID `87006951`, namespace ID `445508`. Protect the `main` branch and the `beta` deployment environment. Do not store AWS access keys in GitLab. The AWS deployment role already exists outside Terraform. The application separately creates the Lambda execution role it needs.

The GitLab.com IAM OIDC provider and deployment role are already created. The root at `terraform/` calls `modules/dns` for the first apply; `modules/app`, which wires the cache, Lambda IAM, API, and frontend modules, is initially commented out. After delegation, uncomment the app module and app outputs in `terraform/main.tf` and `terraform/outputs.tf`. The `terraform/iam` root calls the policy module and renders trust and permission documents using AWS provider `aws_iam_policy_document` data sources; it does not create or update the external role. It restricts trust to this project, namespace, `main`, and audience `sts.amazonaws.com`. It grants the deployment role access to named beta resources where AWS supports resource-level permissions and does not grant parent-zone access. Render and review the policies before attaching them: `terraform -chdir=terraform/iam init -backend=false`, `terraform -chdir=terraform/iam plan -refresh=false -out=/tmp/beta-iam.tfplan`, and `terraform -chdir=terraform/iam show -json /tmp/beta-iam.tfplan | node scripts/verify-iam-policies.mjs`.

The project already has the five provider variables below. Keep them **Protected** and scoped to `beta` or `*`; mask and hide the two secret keys. The beta Terraform jobs map these names to Terraform's `TF_VAR_*` inputs without printing their values. Add `ROLE_ARN` as a protected variable scoped to `beta` or `*`:

| Variable | Value |
| --- | --- |
| `ROLE_ARN` | `arn:aws:iam::716853106749:role/gitlab-fortheday-deploy-role` |
| `API_BIBLE_KEY` | API.Bible key for CSB, NIV, and NLT |
| `API_BIBLE_CSB_ID` | API.Bible CSB edition ID |
| `API_BIBLE_NIV_ID` | API.Bible NIV edition ID |
| `API_BIBLE_NLT_ID` | API.Bible NLT edition ID |
| `CROSSWAY_KEY` | Crossway ESV key |

The role ARN is an identifier rather than a secret, but protect it with the same environment and branch restrictions. Confirm variable presence with `glab variable list`; it reports names and scope but does not display values. Keep GitLab pipeline debug tracing disabled.

The `aws-oidc-test` job runs on protected `main` pipelines before deployment. It exchanges the GitLab ID token for temporary AWS credentials and prints only the caller account and role ARN. If it fails, compare the role's provider ARN, audience, project and namespace IDs, and `sub` branch condition before investigating later deployment jobs.

## Terraform state and first deployment

GitLab CI uses the job token for the HTTP state backend. State addresses are assembled in the pipeline from the current project ID and the state names above; the token is provided through `TF_HTTP_PASSWORD` for each job and is not written to a backend file. Initialize locally only when intentionally operating state with an approved GitLab identity. Do not put a job token in Terraform variables, a plan file, or an artifact.

Run the first setup in this order:

1. Run the protected `main` pipeline and confirm `aws-oidc-test`, unit tests, builds, and Terraform validation pass.
2. Confirm `module "app"` remains commented out in `terraform/main.tf`. Start the manual `beta:plan` job and review it; then start the single manual `beta:apply` job. It creates only the dedicated public hosted zone. Copy the four `name_servers` values from its output.
3. Add those four NS records at the `beckyandzac.com` parent DNS provider. The deployment role has no parent-zone permissions. Wait until public DNS resolves the child zone's NS records.
4. Uncomment `module "app"` in `terraform/main.tf` and the application outputs in `terraform/outputs.tf`. Confirm the protected beta provider variables listed above are present. Start the manual `beta:plan` job and review its output. Then start the same `beta:apply` job; it applies the app resources, waits for DNS certificate validation, publishes the matching Lambda build, uploads static assets, and invalidates the entry document paths.
5. Review the job output and then run `mise run verify:beta -- https://fortheday.beckyandzac.com` (or the equivalent release check) to verify DNS/TLS, health, the SPA shell and deep link, WEBU JSON, and a missing asset. It makes no licensed-provider requests.

The app configuration in `terraform/main.tf` composes `modules/app`, which wires the cache, runtime IAM, API, and frontend modules; the same file calls the reusable DNS module. CI calls `terraform apply` directly after checks, without saving or publishing a plan file. Terraform marks provider inputs sensitive for terminal output, but they are still present in Lambda configuration and the `beta-app` Terraform state. Project members with sufficient access may be able to download that state. Restrict project membership, state access, CI variable editing, and AWS Lambda configuration access. The public reader never receives provider values.

The Terraform roots preserve the hosted zone, S3 bucket, and DynamoDB table from accidental destroy. The static bucket blocks public access and is readable through CloudFront OAC. S3 versioning retains prior object versions. CloudFront sends `/api` and `/api/*` to API Gateway with caching disabled and forwards query strings; API errors stay under the Hono error contract. Missing objects in the private S3 origin may return 403, which is still a missing response and cannot return the SPA shell.

## Tests and local checks

CI runs `tests/unit` without Docker. DynamoDB Local integration tests in `tests/integration` remain a local-only TODO until a non-Docker CI strategy is chosen; CI does not use Docker in Docker. Terraform validation initializes providers with backend access disabled and requires no AWS credentials or provider variables.

Useful local checks:

```sh
mise run typecheck
mise run check
mise run build
mise run build:lambda
mise run terraform:fmt
mise run terraform:validate
```

Do not run the DynamoDB Local integration suite in CI. Locally, it remains available after starting the repository's official DynamoDB Local compose service.

## Rotation, release retention, and rollback

To rotate a provider key or edition ID, change its protected GitLab variable and run `beta:plan`, review the result, then run `beta:apply`. Terraform applies a new Lambda configuration; no Lambda invocation-time secret lookup is used. Never use `set -x`, `env`, or a command that prints `TF_VAR_*` values.

Every release uses the commit SHA as its release identifier. The publish job retains the matching Lambda ZIP and frontend files under the private bucket's `releases/<commit-sha>/` prefix and does not delete older hashed or WEBU revision assets from the live root. The root `index.html`, service worker, and manifest are uploaded after immutable assets. S3 object versioning also retains older root documents.

To roll back, use `scripts/deploy/rollback-beta.sh <previous-commit-sha>` from a protected beta job. It restores the matching release's Lambda code and alias, copies its static files without deleting retained assets, then invalidates the entry paths. It does not change DNS, provider variables, or the DynamoDB table. The next normal Terraform release reconciles the alias to the selected build.

The public `/api/health` release check makes no provider requests. Do not add licensed Scripture smoke requests to CI without a separately approved provider request budget.
