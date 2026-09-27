# Developer guide

Setup details, commands, and verification history for For the day. For an introduction, see the [README](../README.md).

## Local development

Install [mise](https://mise.jdx.dev/) and Docker Desktop, then run:

```sh
mise install
mise run setup
# Configure server-only provider credentials and edition IDs in .env.
mise run dev
```

Setup installs the Bun lockfile, creates `.env` only if absent, starts DynamoDB Local, and initializes its table. Existing credentials are preserved. No AWS account is needed. API.Bible edition IDs depend on your account's CSB/NIV/NLT access; Crossway uses a separate key. Never put these secrets in `VITE_*` variables. Missing credentials will remain an explicit setup error rather than supply bundled Scripture.

The frontend binds to `127.0.0.1:5173` and proxies `/api` to the Hono listener on `127.0.0.1:8787`. DynamoDB Local binds to `127.0.0.1:8000`. Override ports in `.env`; keep `DYNAMODB_ENDPOINT` aligned with `DYNAMODB_PORT`. The server only accepts a loopback database endpoint and uses fixed dummy credentials.

For phone testing, stop the running dev process and run:

```sh
mise run host
```

Connect your phone to the same Wi-Fi network and open the printed `http://<local-ip>:5173` URL (or your configured `WEB_PORT`). If multiple addresses are printed, use your computer's Wi-Fi address. This task exposes Vite on the local network; Hono and DynamoDB remain on loopback, with API requests forwarded through Vite. Ctrl-C stops both application processes. If the phone cannot connect, allow the process through your computer's firewall and check that the Wi-Fi network permits devices to communicate.

`mise run dev` supervises the frontend and API; Ctrl-C stops both. The database volume persists. `mise run db:stop` stops the local database without deleting data. `mise run db:start` starts it, and `mise run db:init` runs the pinned official AWS CLI one-shot Compose container. That container waits for readiness, creates the table if absent, and waits until active; repeated initialization is safe. Its endpoint is fixed to `http://dynamodb:8000` inside Compose, regardless of the host port. It mounts no AWS credentials. Both Docker images are version-pinned. The DynamoDB process runs as root inside this local container to write the initially root-owned named volume.

## Provider credentials with direnv

With direnv installed and hooked into your shell, run:

```sh
mise run configure:envrc
direnv allow
mise run dev
```

The Bash script prompts for the API.Bible key and CSB edition ID, plus optional NIV/NLT IDs and Crossway key. Key entry is hidden. It creates an owner-only, Git-ignored `.envrc` and refuses to overwrite an existing file. Review the generated exports before allowing it. Local service defaults need no additional input; customize those in `.env` if needed.

Bun and Docker Compose load `.env` for their processes. Mise does not reload it over direnv's exported credentials, so blank `.env` provider fields do not override your shell values. Restart an already running dev process after configuring credentials.

## Commands

Use `mise tasks` to discover the command surface. Package scripts do not duplicate it.

| Task | Purpose |
| --- | --- |
| `configure:envrc` | Prompt for provider credentials and create a private `.envrc` |
| `setup` | Install locked dependencies and prepare configuration/database |
| `dev` | Prepare database and supervise Vite/Hono |
| `host` | Run on the local network and print phone testing URLs |
| `dev:web`, `dev:api` | Run individual local processes |
| `test` | Fast Docker-independent unit tests |
| `test:domain` | Focused pure domain tests |
| `test:client` | Reader component and client tests without services |
| `test:providers` | Mocked adapter tests without credentials or live provider calls |
| `typecheck` | Browser and Node-compatible server checks |
| `lint`, `format:check`, `format` | Lint, check formatting, or format source |
| `check` | Typechecking, lint, format checks, fast tests |
| `build` | Build browser assets and Node-compatible API |
| `preview` | Serve an existing production build on port 4173 with API proxy |
| `db:start`, `db:init`, `db:stop` | Persistent local database lifecycle |
| `test:integration` | Isolated cache tests; start DynamoDB Local first |
| `test:browser` | Chromium/WebKit responsive routes, menus, focus and recovery using invented responses; run dev:web first |
| `smoke:csb` | Opt-in real-provider smoke test; requires credentials, saved samples, and dev |
| `inspect:csb`, `verify:csb-samples` | Save ignored provider samples, then verify their fidelity offline |
| `cache:import-samples` | Import saved API.Bible samples into the 30-day development cache without network requests |
| `verify:verse-fit` | Offline layout measurement from cached responses; requires Vite and Chrome and stops on cache misses |

Cache/API behavior and the latest verification checkpoint are in [docs/chapter-api-cache.md](chapter-api-cache.md).

For the repeatable browser smoke suite, install the pinned Playwright browsers once with `mise exec -- bun x --no-install playwright install chromium webkit`, start `mise run dev:web`, then run `mise run test:browser` in another terminal. It intercepts all chapter requests and blocks external requests, so no provider credentials or API quota are used. `WEB_PORT` selects the frontend port. Broader touch, PWA, and measured worst-case review results are linked from [final readiness](readiness.md).

If setup/dev reports Docker unavailable, open Docker Desktop and wait until its engine is running, then retry. If Docker is absent, install it first. Missing provider credentials or edition access produces a safe reader recovery state; configure the corresponding server fields and restart dev. Unit/component tests remain Docker-independent. Live provider smoke checks are opt-in: agree on a request budget first and reuse saved responses for subsequent verification.

The built preview includes the installable static shell. See [PWA behavior and verification](pwa.md) for offline recovery, exclusions, safe updates and development cleanup. `mise run host` uses plain HTTP for phone interaction testing; service-worker installation needs localhost/loopback or a secure origin.

Local development reuses raw API.Bible responses from `.local/provider-response-cache/` for 30 days. This directory is Git-ignored and responses survive normalizer changes. The local listener and CSB inspection task consult it before upstream requests. Import existing samples with `mise run cache:import-samples`; layout verification uses this cache without falling back to live provider calls. New interactive chapter requests can still use API quota on a cache miss. ESV retains its separate bounded cache policy.

Raw provider responses belong only in ignored `.local/provider-samples/`. Commit invented-text fixtures rather than copyrighted Scripture or credentials. Use `test:integration` for isolated DynamoDB checks and `smoke:csb` for opt-in live checks while dev runs; browser verification works through the standalone Playwright MCP.

## Verification record

Latest checkpoint (2026-09-27): all 53 initial-reader tasks are complete. `mise run check` passes 215 unit/component tests and both typechecks/lint/format checks; 15 isolated DynamoDB integration tests, 40 Chromium/WebKit route/menu cases plus recovery, production build, and Node 24 runtime checks pass. Four approved live chapter requests and actual cached FUMS reports passed. Final acceptance, the translation-mapping correction, secret/storage review, and unavailable physical Safari checks are recorded in [readiness](readiness.md). Desktop WebKit verification does not establish actual iPhone/iPad behavior.

The following paragraphs preserve earlier milestone evidence; the final readiness record supersedes their pending-gate statements.

Block 1 command-surface verification: `mise tasks` lists the documented tasks; `mise run check` passed all 140 unit/component tests and type/lint/format checks, and `mise run build` passed. Starting `mise run dev` initialized the existing local table and served a healthy `/api/health` response through Vite. Ctrl-C released both ports 5173 and 8787, as verified with `lsof`; DynamoDB remained available as intended.

The pinned tools install, frozen dependency installation, typechecks, health unit test, formatting/lint, production build, Node 24 API execution, and Vite health proxy have passed. DynamoDB Local start/init/repeated-init/stop and fresh temporary-table creation through the AWS CLI container have passed. The temporary table was removed afterward. The standalone Playwright MCP has verified the CSB milestone on phone/tablet layouts, exact text/attribution, and cached-token FUMS reporting. The earlier in-app Browser plugin failure remains separate; future interaction/PWA gates are still pending.

The semantic chapter model and initial mocked CSB adapter are documented in [docs/scripture-model.md](scripture-model.md). The adapter is connected to the CSB milestone page; authenticated CSB text/structure fidelity verification has passed for four representative chapters. Rendered fidelity remains a later gate.
