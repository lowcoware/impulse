# Dependencies

Ladder rungs 3-5: stdlib → platform primitive → blessed dep. Outside the list = one-line justification or no.

## Blessed stack

| Domain | Canon |
|---|---|
| Go | 1.23+ |
| Go HTTP | Gin — the canon, first choice. GoFiber v3 second. Not chi, not echo |
| Go DB | GORM; Squirrel + pgx raw SQL where the ORM fights you |
| Go logging | zap, structured JSON |
| Go config | viper; validate at startup or refuse to boot |
| Go Kafka | segmentio/kafka-go |
| Go RPC | gRPC + protobuf |
| Go WebSocket | gorilla/websocket |
| Go request validation | go-playground/validator, at the DTO boundary — not scattered checks in handlers |
| Go app-level rate limiting | ulule/limiter — Traefik closes coarse per-IP abuse, this closes per-account/per-key abuse from an authenticated caller |
| Go OIDC login | coreos/go-oidc against the IdP's discovery URL — never hand-write authorization/token/userinfo endpoints |
| Go JWT | go-jose/v4 or golang-jwt/v5, algorithm pinned in code — deep JWT/claims rules: `impulse-security/references/auth.md` |
| Go passkeys | go-webauthn/webauthn |
| Go tests | testify, go-sqlmock, miniredis, testcontainers |
| Rust | only by the language-choice ladder below — a proven-by-profile hot path, an algorithmic problem, or shared core logic across platforms, never a from-scratch service |
| Rust HTTP | Axum (tokio) |
| Rust async runtime | tokio |
| Rust DB | sqlx — compile-time-checked queries, hand-written SQL |
| Rust → Python extension | PyO3 + maturin — the escape valve at the top of Python's optimization ladder (`hardening-python.md`), a module, not a service rewrite |
| Rust cross-platform bindings | `flutter_rust_bridge`, `uniffi`, `napi`, `wasm-pack` |
| Rust API docs | utoipa — OpenAPI generated from code, same contract-first rule as Go/Python |
| Rust → TS types, no schema | `typeshare` (1Password) — `#[typeshare]` on a struct/enum, CLI walks the crate and emits the TS (also Swift/Go/Kotlin/Python) equivalent directly, no OpenAPI in between. Cheaper than utoipa's generate-schema-then-generate-client chain, but only valid when client and server ship in the same release — nothing enforces the contract at a version boundary the way a diffed schema does |
| Rust tests | built-in `#[test]`, `criterion` for benchmarks |
| Python | 3.14 — only where it earns it: ML/AI/embeddings, bots, parsers |
| Python HTTP | FastAPI + pydantic v2 + uvicorn |
| Python Telegram bot | aiogram v3, async — see "Telegram bots" in layout.md / boundaries.md |
| Node.js | LTS (22/24), TypeScript strict — only where it earns it: BFF/gateway, realtime-heavy edge, a team already TS end-to-end |
| Node HTTP | Fastify — the canon. Not Express (no built-in schema validation/typing, slower), not Koa, not NestJS (DI ceremony this ladder rejects by default) |
| Node validation/typing | TypeBox (`@fastify/type-provider-typebox`) first; Zod (`fastify-type-provider-zod`) where the team already standardizes on it |
| Node DB access | Drizzle ORM; Kysely where the team wants query-builder-only, no ORM |
| Node logging | pino — Fastify's built-in logger, structured JSON, off-main-thread transport |
| Node queues | BullMQ on Redis |
| Node contract | tRPC only when the whole stack is TypeScript with no consumer outside that monorepo; the moment an external/mobile consumer shows up, OpenAPI is required same as Go/Python — tRPC types don't cross a language boundary |
| Node contract, runtime-defined schema | tRPC's build-time types don't apply when the data model itself is user-defined at runtime (custom objects/fields, e.g. a CRM). Use GraphQL instead — its schema can express a shape only known once the app is running. Rule of thumb: tRPC when the schema is known at build time, GraphQL when it's only known at runtime |
| Storage | PostgreSQL (+PostGIS, pgvector), Redis (Valkey — the license-driven drop-in fork — as the default in new deployments), ClickHouse, Qdrant, Neo4j, MinIO, MongoDB |
| Edge | Traefik |
| Deploy | Docker Compose multi-env (dev / prod / observability) |
| CI/CD | GitHub Actions |
| Observability | Prometheus, Grafana, Loki, Alertmanager, Sentry |

Deploy story = Compose + Traefik. Full stop.

## Monorepo tooling — when the Node contract row applies

Only relevant once tRPC's precondition is met: one team, whole product TS, shared types between a Fastify backend and a Nuxt/Vue frontend in one repo. Don't stand up any of this for a single-service repo.

| Tool | Pick it when |
|---|---|
| pnpm workspaces alone | 2-3 packages, no cross-package build-order pain yet — `pnpm-workspace.yaml` (`apps/*`, `packages/*`) is enough |
| Turborepo | pnpm workspaces start hurting (rebuild-everything-on-every-change, no shared CI cache) but the team wants zero opinion on how each package builds/tests/lints — it just orchestrates whatever `package.json` scripts already exist |
| Nx | same pain plus the team wants enforced module boundaries, AST-aware code generators, and an affected-graph — more ceremony, earns it on multi-team monorepos, not a 2-app one |

Setup facts (vercel/turborepo docs + own official agent skill at `vercel/turborepo/skills/turborepo/`):
- Turborepo layers on top of the package manager's own workspace feature — it doesn't replace pnpm/npm/yarn workspaces, it orchestrates them. Docs give equivalent instructions for pnpm/npm/yarn/bun; no hard pnpm mandate, but pnpm is what most current Turborepo example repos default to.
- Recommended layout: `apps/` for deployable apps/services (the Fastify API, the Nuxt app), `packages/` for everything shared (libs, tooling, `packages/shared-types`) — Turborepo's own docs state this split explicitly.
- Rule of thumb for `packages/shared-types`: promote types to a real workspace package the moment more than one `apps/*` imports them — reaching across package boundaries with relative `../` paths is the anti-pattern Turborepo's structure docs call out directly; below that, keep types local and skip the package.
- Remote caching shares build/task-output cache across the team and CI (Vercel's managed cache, free tier, or self-hosted against Turborepo's cache API) — this is the actual payoff over plain pnpm workspaces once CI time starts hurting.
- Nx vs Turborepo, one line: Turborepo is a thin build-orchestration layer over your existing scripts; Nx adds a project graph, enforced boundaries, and AST-aware generators (`nx g`) — heavier, earns it on multi-team repos, overkill for the two-app tRPC scenario this row describes.

## Language-choice ladder

Three peer languages, not one canon plus exceptions. Stop at the first that fits:

1. **Go** — the default; no reason from below applies.
2. **Python** — a library solves the problem and nothing in Go does (ML, embeddings, document parsing), or it's a bot/parser/data-processing job, or the author is a Python-first beginner shipping their first service.
3. **Rust** — a hot path with a measured profile, an algorithmic problem where the gap is multiples not percent, or shared core logic across several platforms (mobile/web/server) via the bindings row above. Almost never a whole service from scratch — usually a module inside a Go/Python service (`hardening-rust.md`).
4. **Node.js/TypeScript** is not a rung on this ladder — it's a standing exception taken for exactly one reason: end-to-end TypeScript with types shared across the stack (tRPC), not performance or ecosystem. Legitimate when one team owns both ends and the whole product is TS; still requires OpenAPI the moment an external consumer appears.

"Proven by profile" means measured, not guessed: rewriting something to Rust
that was never profiled is the most expensive form of gold-plating — more
complex language, smaller hiring pool, slower iteration, paid for a gain
nobody measured. Frame the threshold as a ceiling marker: `// impulse:
staying on Go's handler X, move the hot loop to Rust when p95 misses N ms
at Y% time in Z`.

## New-dep rule

1. On the list → use it, zero justification.
2. Off the list → one line: what it does that stdlib + blessed + platform primitive can't. Can't write the line → don't add it.
3. Never pull a library for one function — write or copy the function.
4. Pin everything: lockfile committed (`go.sum` / `poetry.lock` or `uv.lock` / `package-lock.json` or `pnpm-lock.yaml` / `Cargo.lock` — whichever the repo uses per language, one, never both). CI runs one vuln scanner per language present — `govulncheck` (Go), `pip-audit` (Python), `cargo-audit` (Rust) — plus `trivy` on the built image. Lockfile discipline detail: `../../impulse-dependency-audit/references/supply-chain.md`.

## Python tooling — modern stack, not legacy defaults

| Legacy | Use instead | Why |
|---|---|---|
| `pip install` / `pip freeze` | `uv add` / `uv remove` / `uv sync` | one tool for resolve+install+lock, no manual `pyproject.toml` dependency editing |
| Poetry | `uv` | faster resolver, simpler config, same lockfile discipline |
| `requirements.txt` | PEP 723 inline metadata (standalone scripts) / `pyproject.toml` (projects) | dependency declaration lives with the code it applies to |
| manual `source .venv/bin/activate` | `uv run <cmd>` | no stale-shell-forgot-to-activate class of bug |
| mypy / pyright | `ty` (Astral) | faster; same category of tool, not a different guarantee |
| `[project.optional-dependencies]` for dev tools | `[dependency-groups]` (PEP 735) | dev/test/docs deps don't leak into the installable package's dependency graph |
| pre-commit | `prek` | no Python runtime needed to run the hooks |

Never manage a virtualenv by hand once `uv` is in play — `uv run` resolves
and activates implicitly per-invocation; a hand-activated shell drifts from
the lockfile silently. (Re-expressed from trailofbits/skills `modern-python`,
CC BY-SA 4.0.)

## Node tooling

| Legacy | Use instead | Why |
|---|---|---|
| `npm install` in CI/Docker | `npm ci` (or `pnpm install --frozen-lockfile`) | fails loud on lockfile drift instead of silently rewriting it — see `hardening-node.md` supply-chain section |
| `ts-node` for local dev/scripts | `tsx` | faster (esbuild-based), no separate `ts-node --esm` config dance |
| hand-written `interface` for a request/response shape | TypeBox/Zod schema, type inferred from it | one source of truth that's both the runtime validator and the compile-time type — a plain `interface` validates nothing |
| `nodemon` | Node's built-in `--watch` (stable 22+) | a dep for something the runtime now ships |
| manual `NODE_ENV` + hand-rolled `.env` loader | `node --env-file=.env` + a startup-validated config schema (baseline.md) | no dep in the boot path, and invalid config still refuses to boot |
| ESLint config assembled by hand | a maintained flat-config preset (`typescript-eslint` recommended + Fastify community config) | drift-free ruleset, not a bespoke one nobody updates |

`npm ci --ignore-scripts` in build/CI images unless a specific dependency's
`postinstall` is verified necessary (native addon compilation is the
legitimate case) — arbitrary `postinstall` execution is the standing
supply-chain risk in the npm ecosystem (`hardening-node.md`).

## Platform primitive over app code (rung 4)

Before writing infrastructure code, ask: which platform already does this? Then check this table.

| Need | Use | Never hand-roll |
|---|---|---|
| Uniqueness | Postgres UNIQUE constraint | SELECT-then-INSERT check |
| Integrity, valid values | FK + CHECK constraints, enums | scattered app-level ifs |
| Atomic update | transaction, `UPDATE ... RETURNING` | read-modify-write in app |
| Cache with TTL | Redis SETEX / EXPIRE | map + janitor goroutine |
| Distributed lock | Redis SET NX PX | lock table + polling |
| Lightweight queue | Redis Streams | DB polling table (outbox is the exception) |
| CORS, compression, TLS | Traefik middleware at the edge | per-service middleware copies |
| Rate limit | layered: coarse per-IP at Traefik + per-user/per-key middleware in the app on unauthenticated write endpoints (`impulse-security/references/rate-limit.md` owns) | edge-only ("Traefik handles it") or hand-rolled counters |
| Per-key ordering | Kafka partition key | app-side sequence numbers |
| Consumer scaling | Kafka consumer groups | custom work distribution |
| Duplicate delivery | event_id dedup + committed offsets | bespoke dedup service |
| User-authored condition/rule | an expression engine: `expr-lang`, CEL, or Rego (OPA) | a hand-rolled condition parser — no serious project in the wild writes its own |
| API breaking-change check in CI | `oasdiff` diffing the PR's generated OpenAPI schema against main | manual "looks backward-compatible to me" review |
| Delta-sync to a client | an audit table alongside the primary table, client pulls since-cursor | shipping full state on every sync request |

Choosing the primitive with a known ceiling → mark it: `// impulse: <ceiling>, <upgrade trigger>` (see ladder.md).

## Expression engine choice — user-authored conditions

Pick by what the rule needs to touch, not by familiarity:

| Engine | Pick when | Ceiling |
|---|---|---|
| `expr-lang/expr` | a simple typed boolean/arithmetic condition over Go structs you control (pricing rule, feature-flag condition, alert threshold) | no query language over a data graph — one expression, one input struct |
| CEL (`google/cel-go`) | you need a portable, spec'd language with a built-in runtime cost budget (Kubernetes' own admission-webhook CEL uses exactly this) — cross-language portability (server + client) matters | cost estimation only bounds *evaluation*, not the size of data you hand it |
| Rego (OPA) | full policy-as-code: rules that combine multiple data sources, deny/allow with reasons, org-wide policy bundles | no built-in per-eval resource budget — you own the timeout |

### Sandboxing and DoS — the part the one-liner skipped

- **expr-lang**: the language itself is memory-safe, side-effect-free, and
  loop-free by construction — a bare expression cannot infinite-loop or
  reach outside its `expr.Env()` inputs. That guarantee evaporates the
  moment you register a custom Go function into the environment: any
  function with a side effect (file I/O, exec, outbound HTTP, DB write)
  exposed to a user-authored expression is now callable by that user —
  the same shape as the real-world `expr-eval` (JS library, unrelated
  project, same pattern) RCE via unsanitized custom-function registration.
  Only expose pure, side-effect-free helper functions to a user-facing
  environment.
- **CEL**: not Turing-complete by design — no unbounded loops in the
  language at all. For real DoS protection, use `cel-go`'s `EstimateCost`
  at compile time to reject overly expensive expressions before running
  them, and track actual runtime cost during evaluation with a hard budget
  (the pattern Kubernetes uses for CRD/admission-webhook CEL rules: a
  per-expression CPU-unit budget that halts evaluation mid-run if
  exceeded). Without a runtime budget, cost estimation alone only screens
  the compiled expression, not adversarial input sizes at eval time.
- **Rego/OPA**: has no built-in per-evaluation resource limit — `opa eval`
  will run a policy to completion however long that takes. The concrete
  DoS vector: Rego makes external calls (`http.send`, data joins)
  **sequentially**, not concurrently, so a policy chaining several
  external lookups is slow by construction even without malice, and a
  user-authored policy that fans out lookups can turn "check a
  permission" into a multi-second call. Wrap every `rego.Eval` call in
  `context.WithTimeout` from the host side — OPA itself won't stop a slow
  policy for you — and treat "policy makes N external calls" as a review
  flag, not something to allow unbounded in user-authored bundles.
- **Injection, all three**: same rule as SQL/shell — never string-concat
  user input into the expression/policy source itself; only pass user
  data through the typed environment/input object. A user-authored
  *condition* (values) is the supported case; a user-authored *program
  text* that gets string-assembled from other user input is the injection
  case, regardless of engine.
