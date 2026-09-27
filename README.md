# For the day

A localhost Psalms and Proverbs reader. The current CSB milestone has a reading-first card feed, native scrolling, deliberate passage swipes, independent saved locations, and a quiet reader menu for navigation and presentation settings. NIV/NLT/ESV provider integration, translation continuity, and the PWA remain in progress. See [the interface guide](docs/reading-first-interface.md) for controls and verification.

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
| `dev:web`, `dev:api` | Run individual local processes |
| `test` | Fast Docker-independent unit tests |
| `test:domain` | Focused pure domain tests once present |
| `typecheck` | Browser and Node-compatible server checks |
| `lint`, `format:check`, `format` | Lint, check formatting, or format source |
| `check` | Typechecking, lint, format checks, fast tests |
| `build` | Build browser assets and Node-compatible API |
| `preview` | Serve an existing production build on port 4173 with API proxy |
| `db:start`, `db:init`, `db:stop` | Persistent local database lifecycle |

Cache/API behavior and the latest verification checkpoint are in [docs/chapter-api-cache.md](docs/chapter-api-cache.md).

Raw provider responses belong only in ignored `.local/provider-samples/`. Commit invented-text fixtures rather than copyrighted Scripture or credentials. Use `test:integration` for isolated DynamoDB checks and `smoke:csb` for opt-in live checks while dev runs; browser verification works through the standalone Playwright MCP.

## Verification record

The pinned tools install, frozen dependency installation, typechecks, health unit test, formatting/lint, production build, Node 24 API execution, and Vite health proxy have passed. DynamoDB Local start/init/repeated-init/stop and fresh temporary-table creation through the AWS CLI container have passed. The temporary table was removed afterward. The standalone Playwright MCP has verified the CSB milestone on phone/tablet layouts, exact text/attribution, and cached-token FUMS reporting. The earlier in-app Browser plugin failure remains separate; future interaction/PWA gates are still pending.

The semantic chapter model and initial mocked CSB adapter are documented in [docs/scripture-model.md](docs/scripture-model.md). The adapter is connected to the CSB milestone page; authenticated CSB text/structure fidelity verification has passed for four representative chapters. Rendered fidelity remains a later gate.
