# Layout — Go / FastAPI

One structure per service. Flat, idiomatic, zero architecture ceremony. Split by responsibility, never by line count.

## Go: flat cmd/internal

```
orders/
  cmd/orders/main.go     # composition root: load+validate config, wire by hand, graceful shutdown
  internal/
    handler/             # Gin handlers: decode, validate input, call service, map errors to HTTP
    service/             # business logic; owns domain errors
    repo/                # Postgres/Redis access; SQL lives here only
    events/              # Kafka producers/consumers (see events.md)
  migrations/            # versioned, from migration #1
  contracts/             # proto / OpenAPI / AsyncAPI this service owns
  Dockerfile             # multi-stage, non-root
  .env.example
```

1. Everything under `internal/` — export nothing but contracts. Other services consume contracts, never packages.
2. When handler/service/repo stops fitting, grow by domain noun (`internal/billing/`), not by adding layers.
3. Zero `ports/`, `adapters/`, `usecases/`, `value_objects/`, CQRS command/query folders. Any of these in a diff = BLOCK.
4. One `main.go` per binary. Wiring by hand — no DI framework.
5. No `pkg/`, `utils/`, `common/`, `helpers/` dumping grounds. Name the responsibility or inline the code.

## Interfaces

| Rule | Do |
|---|---|
| Define at consumer | Interface lives in the package that CALLS it, next to the caller |
| Keep small | 1-3 methods; grow only when a caller needs more |
| One impl | Use the concrete type — no interface until a second impl exists |
| Exception | Single-impl interface allowed ONLY as a test seam (go-sqlmock, testify mocks, miniredis) |
| Never | A `ports/` package of pre-declared interfaces "for flexibility" |

## Split by responsibility, not line count

1. No line-count cap. A 700-line file with one responsibility is fine.
2. Split when a second responsibility appears: parsing mixed with business rules, two unrelated entities in one file.
3. Test: describe the file in one sentence without "and". Can't → split at the "and".
4. Functions: extract when a block has a name and a reason, not at N lines.

## Splitting safely, once the decision above says split

The rule above decides WHEN; this is HOW without breaking the build
mid-refactor. Classify the split by risk before starting:

| Tier | Shape | Safety requirement |
|---|---|---|
| Low | Single-file internal refactor (extract a function within the same file) | None beyond normal review |
| Medium | Extract to a new file, same package/module | Build/test pass after the move, before moving on |
| High | Split into multiple new files/modules | Write the new files → verify the build compiles → only then delete the old content, one file at a time, git-committing between rounds (max 3-5 files per round) |
| Critical | Changes build-config or module/package boundaries | Explicit user approval before starting, not just before merging |

**The File Split Trap** (why High-tier needs the write-verify-delete order,
not a single big move): text-based splitting can cut a function body
mid-definition, leave an orphaned closing brace that becomes a syntax
error only in the file it landed in, or produce a barrel/index file that
misses a re-export — and in TS/JS specifically, `export *` does not
forward default exports, so a mechanical split silently drops one. None
of these show up until the build runs — verifying after each small round
catches them one mistake at a time instead of debugging a tangle of
simultaneous breaks across a dozen new files.

## Python: FastAPI

Only where Python earns it (ML/AI/embeddings, bots, parsers).

```
embedder/
  app/
    main.py              # app factory: validate config, mount routers, lifespan shutdown
    routers/             # endpoints: decode, call service, map errors to HTTP
    services/            # business logic; owns domain exceptions
    repositories/        # DB / vector-store access
    schemas/             # pydantic v2 request/response + settings models
  migrations/
  Dockerfile
  .env.example
```

1. Routers hold zero business logic: decode, call, translate errors.
2. pydantic v2 validates at the trust boundary. No hand-rolled dict checks past the router.
3. No Clean-Arch onion, no `domain/entities/value_objects` tree, no repository ABC hierarchy.

## Python: Telegram bot (aiogram v3)

A Telegram bot is its own microservice. Python async, aiogram v3. Thin adapter only — zero business logic.

```
support-bot/
  bot/
    main.py              # bot factory: validate config, register routers, start polling/webhook, graceful shutdown
    handlers/             # aiogram routers: message/callback handlers — parse update, call grpc client, render reply
    keyboards/            # inline/reply keyboard builders
    fsm/                  # aiogram FSM states — conversation flow only, no business rules
    grpc_client/          # generated stubs + thin wrapper; the ONLY way this service talks to the rest of the system
  Dockerfile
  .env.example
```

1. Handlers decode the update, call a gRPC client, render the reply. No DB access, no direct import of another service's code.
2. All business logic lives in the service the bot calls over gRPC — the bot is the transport, not the brain.
3. Day-one baseline applies (see baseline.md), plus: graceful shutdown drains polling/webhook in flight before exit; every gRPC call gets a timeout (baseline rule, no exemption for bots).

## Error-handling ladder

| Layer | Owns | Action |
|---|---|---|
| repo / clients | infra errors (pgx, redis, kafka, HTTP) | wrap with operation context: `fmt.Errorf("fetch order %s: %w", id, err)`; never return raw driver errors |
| service | domain errors (`ErrOrderNotFound`, `ErrCurrencyMismatch`) | translate nameable infra errors to domain (`pgx.ErrNoRows` → `ErrOrderNotFound`); pass unknown infra errors up wrapped |
| handler | HTTP mapping | domain error → real code; unmapped → 500 + log with stack |

| Domain error class | HTTP |
|---|---|
| not found | 404 |
| input invalid | 400 / 422 |
| conflict, duplicate, idempotency replay mismatch | 409 |
| unauthenticated / forbidden | 401 / 403 |
| anything unmapped | 500 |

1. Swallowing banned: `_ = err`, `except Exception: pass`, empty catch = BLOCK. Deliberate ignore = one-line comment naming why.
2. `200` with an error body — banned. `500` for every failure — banned.
3. Log each error once, at the boundary, structured (zap) with `correlation_id` + entity IDs. No log-and-rethrow at every layer.
4. Timeout, cancellation: propagate `ctx` to the lowest call; a network call without a timeout is a bug (see baseline.md).

## Naming

| Rule | Bad | Good |
|---|---|---|
| Self-documenting | `amt`, `d`, `tmp2` | `totalAmount`, `retryDelay` |
| Length ∝ scope | `theLoopIndexVariable` in a 3-line loop | `i` |
| No translit | `zakazRepo`, `polzovatel` | `orderRepo`, `user` |
| Language conventions | `Get_user` in Go | `GetUser` exported, `getUser` internal |

Identifiers always English. Docstring/comment language — see docs.md.

## API versioning

REST = URL path (`/v1/...`) — explicit, curlable, cacheable per version;
header versioning only for internal clients that control their own headers.
gRPC = version in the proto package (`grpc.md`). Both follow `events.md`'s
additive-only rule: add optional fields/routes, never rename/retype/remove
in place — a breaking change is a new version, full stop. Deprecate the old
version with `Deprecation: true` + `Sunset: <RFC 8594 date>` + a
`Link:` to the migration guide; track per-version traffic, don't kill it
until consumers are near-zero. Full pagination + keyset detail:
`hardening-go.md`.

## Contract-first design

Design the contract before the handler. The wire shape is the hardest thing
to change once a consumer depends on it — get it right on paper first, it
lives in `contracts/` as the service's owned artifact (proto / OpenAPI /
AsyncAPI).

1. **Model resources, not RPC verbs (REST).** Nouns + HTTP methods
   (`POST /v1/orders`, `GET /v1/orders/{id}`), not `/createOrder`,
   `/getOrderById`. gRPC is the opposite — verbs are fine there
   (`CreateOrder`), the proto package carries the version.
2. **One error shape, service-wide.** Pick it once (RFC 9457 problem+json is
   the sane default: `type`/`title`/`status`/`detail`/`instance`) and every
   endpoint returns it. Maps straight onto the error-handling ladder above —
   domain error class → HTTP code → the same body every time. A consumer that
   learns your error shape once should never be surprised.
3. **Contract is the source of truth, not generated from code.** Write/own
   the proto or OpenAPI spec; generate stubs/clients from it (`buf` for proto,
   an OpenAPI generator for REST). Codegen-from-handlers drifts silently and
   makes the spec an afterthought.
4. **Design list endpoints for pagination from #1.** Keyset by default
   (`hardening-go.md`) — a list route that can't paginate is a `impulse:` ceiling
   waiting to fall over. Decide the cursor shape in the contract, not after.
5. **Idempotency on unsafe writes.** `POST`/create paths that a client may
   retry take an `Idempotency-Key` (or a natural dedup key) — decide it in the
   contract; enforce it per `events.md` idempotency rules.
6. **Whether to design a formal contract at all follows the ladder.** An
   internal two-service edge may not need a full OpenAPI doc day one — a typed
   handler + the shared error shape is enough. Reach for the full spec when a
   third consumer, an external client, or codegen needs it. Mark the ceiling.

Big or contested contract decision (REST vs gRPC vs events, resource
boundaries) → run it through `impulse-brainstorm` first, land it as an ADR.
