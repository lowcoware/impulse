# Hardening — Go production traps beyond the baseline

`baseline.md` is the day-one minimum. This file is the layer above: Go
patterns that pass tests, pass review at a glance, and take down a service
months later under real load. Every entry has a real incident or a
documented study behind it — cited, not vibes. Python equivalent:
`hardening-python.md`.

## Interfaces

1. **Size is a health signal once one exists** (`layout.md` gates whether one
   should exist at all): "the bigger the interface, the weaker the
   abstraction," and `interface{}`/`any` says nothing about the actual
   contract — both push toward narrow, specific interfaces (Go proverbs).
2. **No implementor-side interface written just to swap in a mock.** Don't
   declare an interface next to its only real implementation so a test can
   substitute a fake — test through the real implementation's public API
   first (`httptest`, `miniredis`, go-sqlmock); an interface only belongs in
   the *consuming* package (Go Code Review Comments).
3. **Accept interfaces, return structs.** Parameters ask for the narrowest
   interface the function needs; return values stay concrete so callers get
   the full API, not a lossy view.

## Context propagation

1. `defer cancel()` immediately after every `context.With*` call — a
   `WithTimeout`/`WithCancel`/`WithDeadline` with no `defer cancel()` on the
   next line leaks the timer/goroutine per call. The single most common
   goroutine-leak shape in Go services.
2. Never swap a live request context for `context.Background()` inside a
   spawned goroutine — the goroutine loses cancellation and parks on
   `ctx.Done()` forever, since a fresh background context never cancels. A
   documented case: a worker pool (1,000 workers × 500 tasks/day) leaked
   500K context objects/day, 3.5M stuck in memory after a week, because
   nested contexts inside the pool never inherited the caller's
   cancellation. [Habr: "Одна строка — тысячи горутин"](https://habr.com/ru/companies/otus/articles/957486/)
3. `context.WithValue` carries request-scoped metadata only (trace ID,
   correlation ID, auth principal) — never a DB handle, logger, or config.
   Stuffing dependencies into context hides them from the function
   signature and turns a compile-time wiring mistake into a runtime panic
   from a failed type assertion.

## Panic / recover boundaries

1. `recover()` wraps the *outermost* dispatch loop — the whole
   message-processing/request-handling call, not just the business-logic
   sliver inside it. A panic in the framework/pubsub wrapper itself, if
   outside the recover boundary, crashes the process.
2. **Goroutines spawned inside a handler are NOT covered by that handler's
   recover.** A panic doesn't propagate to the parent goroutine — it kills
   the whole process. Every `go func(){...}()` needs its own recover if it
   can panic.
3. Real incident: a consumer unwrapped a nil error inside a pubsub wrapper,
   nil-pointer-dereferenced, and because recover only wrapped app code (not
   the wrapper), the panic crashed the process — auto-restart re-fetched
   the same poison message and crashed again, taking down every replica in
   sequence. Poison messages go to DLQ (`events.md` §5), never
   retry-crash-retry.

## Worker pool sizing — Little's Law, not core count

IO-bound worker pools (fan-out over HTTP/DB/RPC calls) need a ceiling far
**above** CPU core count — a goroutine blocked on IO holds no CPU, so
"size the pool to cores" starves it exactly when the downstream is slow
and concurrency would help most.

```
needed concurrency N ≈ arrival rate λ × per-task IO duration W   (Little's Law — a lower bound)
pool ceiling = max(N, downstream's actual concurrent capacity)
             capped by memory and by not overwhelming the downstream
```

Only **CPU-bound** work (hashing, encoding, in-process compute) sizes near
core count — and even then, `GOMAXPROCS` must be aligned to the container's
actual CPU limit, or it defaults to the *host's* core count inside a
cgroup-limited container: the pool sizes itself against a number the
kernel then throttles, and scheduling contention makes throughput worse
than a smaller pool would have. **Go 1.25+: the runtime does this itself**
— on Linux it now reads the cgroup CPU limit at startup and periodically
re-checks it, so `go.uber.org/automaxprocs` is redundant on 1.25+ (still
needed pre-1.25, or where the limit changes faster than the runtime's
poll interval and exact-immediacy matters).
[Go blog: container-aware GOMAXPROCS](https://go.dev/blog/container-aware-gomaxprocs)

Three pool invariants, cheap to violate silently:

1. **Isolate by failure-semantics, not just by call site.** A query pool
   (must never drop work, blocks under pressure) and a best-effort pool
   (small, drops on full rather than blocking) are different pools with
   different failure modes — mixing them means a slow best-effort task can
   starve latency-critical queries.
2. **Query/critical pools must be blocking-mode, never drop-on-full.** A
   non-blocking submit that silently discards a task when the pool is full,
   paired with a `WaitGroup.Wait()` that never gets its matching `Done()`,
   is a permanent hang — not a rare edge case, the direct consequence of
   the design.
3. **Never a bare `pool.Submit()`.** Wrap submission in one function that
   falls back to running the task inline (same goroutine) on submit
   failure — this guarantees the task is never silently dropped and the
   `WaitGroup` always balances, closing off the hang in #2 structurally
   instead of hoping it doesn't happen.

Start with the smallest split that fits (often just "online reads" +
"critical writes") — splitting into many specialized pools before there's
evidence of contention between them is the mirror-image mistake, wasted
resources for isolation nothing is actually fighting over. Re-expressed
from `zuoyebang/aiweave`'s concurrency-design methodology (Apache-2.0).

## Database connection pools

1. Sizing formula: `MaxOpenConns ≈ postgres max_connections / replica_count
   − admin_buffer`. `MaxIdleConns` at 25-50% of `MaxOpenConns`.
   `ConnMaxLifetime` set below the LB/Postgres idle-session timeout (e.g.
   30 min) so connections don't go stale behind a load balancer.
2. A pool with no explicit `SetMaxOpenConns`/pgxpool `MaxConns` is
   effectively unbounded (or absurdly low on the default) — a ticking
   outage, not a tuning nice-to-have.
3. Exhaustion signature (what to look for in dashboards once this ships):
   active connections pinned at 100%, idle at 0, connection-wait-time and
   p95/p99 climbing while DB CPU/memory look fine — the DB is healthy,
   requests are queued for a connection slot that doesn't exist.
4. Real incident: a slight DB degradation caused an app-side pool to empty
   and reconnect — with no cap on reconnect rate, transaction volume spiked
   from a normal 15/min to 6,500/min, amplifying a minor blip into an
   outage. Retry logic must never be allowed to open connections faster
   than the pool's own limit. [Habr/Avito: работа с Postgres в Go](https://habr.com/ru/companies/avito/articles/461935/)

## Zero-downtime migrations

1. Expand → backfill → contract. Expand: additive only (nullable column,
   `CREATE INDEX CONCURRENTLY`). Backfill: batched, small transactions,
   resumable. Contract: drop the old column/constraint only after every
   replica runs code that no longer needs it.
   Adding `NOT NULL`/`CHECK`/FK to a big live table without a full-table
   lock: `ADD CONSTRAINT ... NOT VALID` (instant, applies to new rows) →
   backfill → `VALIDATE CONSTRAINT` (takes only a light lock).
2. **N/N-1 compatibility rule:** during a rolling deploy, old and new
   binaries run against the *same* schema simultaneously. A migration that
   renames/drops a column, or adds `NOT NULL`/a unique constraint with no
   default, breaks whichever binary version wasn't written for that exact
   schema state.
3. A migration and the code that structurally depends on it landing in the
   *same* deploy is the review-time tell — they must be separable across at
   least one deploy cycle for a rolling rollout to be safe.
4. **Rollback path defined BEFORE running forward.** Every migration states
   how to undo it (down migration, or an explicit "irreversible — restore
   from backup" note) before the up runs — deciding rollback mid-incident
   is how a bad migration becomes a long outage. Backfill retries must be
   idempotent; partial failure must be observable (progress table or
   logged watermark), not silent.
5. **Contract is separately authorized, never implicit.** The destructive
   step (drop column/constraint/table) is its own change with its own
   review — finishing the expand+backfill never auto-triggers it. Stop
   after the requested stage passes. (Language-neutral rule — applies to
   Python/Alembic identically; lives here because the Go file owns the
   zero-downtime section.)

## gRPC

1. Deadline propagation is automatic *only if* every hop forwards the
   inbound `ctx` downstream. A client call built on `context.Background()`/
   `context.TODO()` instead of the handler's own `ctx` silently breaks the
   deadline chain for that hop and everything behind it.
2. Streaming RPCs: calling `CloseSend()` alone does not release resources —
   the client must drain with `Recv()` until EOF/error, or explicitly
   cancel. Several open grpc-go issues document leaks from streams "closed"
   but never drained.
3. Long-running server-side stream handlers must periodically check
   `ctx.Err()`/`stream.Context().Done()` — without it, a client that
   cancelled leaves the server-side handler running to completion, burning
   CPU/DB work nobody will read.
4. Use `codes.Canceled` vs `codes.DeadlineExceeded` distinctly. Conflating
   both into `codes.Internal` (a common shortcut) breaks client-side retry
   logic, since only some codes are safely retryable.

## Error-handling idiom

1. **Handle an error exactly once — log OR wrap-and-return, never both.**
   Logging an error and then also returning/wrapping it duplicates the
   same failure up the call stack — every layer that does both produces
   a repeated log line for one real failure, and the eventual top-level
   log is redundant noise instead of a single clear signal.
2. **Error strings never prefixed with "failed to"/"unable to."** Those
   phrases stack into unreadable repetition once an error gets wrapped
   several levels deep (`failed to failed to unable to read index`).
   State what was being attempted, not that it failed — the fact that
   it's an error is already carried by the error type itself:
   `fmt.Errorf("read index: %w", err)`, not
   `fmt.Errorf("failed to read index: %w", err)`.
3. **`errgroup.Group` with `SetLimit`, not a hand-rolled semaphore
   channel, for bounded concurrent work.** One primitive bounds
   concurrency, propagates the first error, and cancels the shared
   context together — a hand-rolled `chan struct{}` semaphore does the
   bounding but usually misses the error-propagation and cancellation
   parts, which then get bolted on separately and inconsistently.

## Logging discipline

1. A debug-level log path gated by a flag that defaults `true`, or any
   `Info`+ log inside a hot per-request/per-message path logging a full
   payload, is a review-time BLOCK, not a style nit. Real incident: a
   feature flag left debug logging on in production, saturated disk I/O,
   took the service unresponsive. [Freshworks: from debug logs to disk disasters](https://medium.com/@freshworks.engg/from-debug-logs-to-disk-disasters-how-a-minor-feature-flag-nearly-took-down-our-contact-center-613560bc01f0)
2. Never log a whole struct via `zap.Any("request", req)` — a field added
   to that struct later silently starts appearing in every log line,
   including if it's a secret. Name the safe fields explicitly.
3. Correlation IDs are opaque; PII/secrets are filtered by the logging
   middleware itself (a design property), not by remembering not to log
   them at each call site. [OWASP Microservices Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Microservices_Security_Cheat_Sheet.html)
4. **Log at the boundary layer, not in every layer a call passes through.**
   Service/data/repository layers propagate errors via return values and
   don't log themselves — logging happens once, at the layer that owns the
   request boundary (an HTTP handler, a queue consumer, a cron entrypoint).
   The same lower-layer method is often reached from multiple entry points;
   layer-local logging both duplicates the same event once per call site
   AND misjudges severity — a "record not found" is a normal, expected
   `ErrNotFound` at the repository layer, and only the boundary layer knows
   whether that's a real WARN/ERROR (a user hit a stale link) or entirely
   routine (an existence check that's supposed to sometimes miss).

## IO aggregation — the same bug class as N+1, one fix

5. **Batch-first.** A loop calling a single-item fetch/write method per
   iteration is the N+1 pattern regardless of which layer it's in — reach
   for (or add) a `*List`/batch-shaped method instead of looping a
   singular one.
6. **Independent-but-serial IO is the same bug wearing different clothes.**
   Multiple unrelated reads awaited one after another (`await a(); await
   b(); await c()` with no data dependency between them) pays their sum in
   latency for no reason — fan them out concurrently (goroutines +
   `errgroup`, or the language's equivalent) and aggregate. Only a genuine
   data dependency (b needs a's result) justifies serial awaiting.
7. **The reverse mistake exists too — don't over-parallelize a single
   query, and don't double-wrap an already-locally-cached read** in
   another concurrency layer; parallelism has coordination overhead, and
   applying it where there's no independent IO to overlap just adds
   goroutines with nothing to gain.

## Pagination

1. Keyset (cursor) is the default for any list beyond a few thousand rows.
   `OFFSET` is not free — Postgres scans and discards every row before the
   offset: `OFFSET 0` ~8ms, `OFFSET 999800` on 10M rows can hit seconds.
   Reserve `OFFSET` for shallow "jump to page N" UIs.
2. It's also a correctness trap, not just perf: offset breaks under
   concurrent writes — delete a row while a user is on page 1 and page 2's
   window shifts, silently dropping/duplicating a row. Keyset's cursor is a
   value, not a position, so it's immune.
   ```sql
   SELECT id, created_at FROM orders
   WHERE (created_at, id) < ($last_created_at, $last_id)  -- tie-break for stable sort
   ORDER BY created_at DESC, id DESC LIMIT 50;
   ```
3. Stable-sort requirement: the sort key must be unique or tie-broken by a
   unique column — sorting by `created_at` alone with duplicate timestamps
   skips/repeats rows across pages.
4. `COUNT(*)` is a full scan on large tables — return it only for offset-mode
   UIs that need it; for a rough number use `pg_class.reltuples`, never
   `COUNT(*)` on an infinite-scroll/keyset feed. List endpoints return
   `{items, next_cursor}`, not `{items, page, total}`, by default.

## Transaction boundaries

1. The service layer opens and closes the transaction; repo methods accept
   an already-open `tx` and never `Begin`/`Commit` themselves. That's what
   lets one service method compose two repo calls atomically.
2. **The AI-generated bug: a tx held open across a network/gRPC/HTTP call.**
   The pooled connection sits idle-in-transaction for the full RTT — under
   load this drains the pool (the exhaustion signature above), and if the
   outbound call needs the same DB, deadlocks.
   ```go
   // wrong: conn held hostage for the payment RTT
   tx, _ := pool.Begin(ctx); repo.InsertOrder(ctx, tx, o)
   paymentClient.Charge(ctx, req); tx.Commit(ctx)
   // right: commit first; cross-service state goes via outbox (events.md §4)
   tx, _ := pool.Begin(ctx); repo.InsertOrder(ctx, tx, o); tx.Commit(ctx)
   paymentClient.Charge(ctx, req)
   ```
3. Nested `Begin` in pgx/GORM is a `SAVEPOINT`, not a real nested tx — use
   it for "this sub-step's failure shouldn't abort the whole tx," never as
   isolation.
4. Never pass `*sql.Tx` via `context.WithValue` — violates the "context
   carries request metadata, never a DB handle" rule above and hides the tx
   from the signature. Pass it explicitly, or via a `db.Transact(ctx,
   func(tx) error {...})` closure.

## Migration tooling

1. golang-migrate is canon (plain SQL up/down, CLI-first, DB-agnostic).
   goose only when you need Go-code data transforms alongside SQL; Atlas
   only if declarative diff/drift-detection earns its steeper buy-in —
   evaluate, don't default.
2. Every migration ships both `.up.sql` and `.down.sql`; no down script = a
   review block.
3. Test up AND down against real Postgres in CI (testcontainers) — an
   unexecuted down script is an assumption, not a working rollback.
4. **Reality check:** a down migration that dropped a column/table can't
   restore lost data — "rollback" only undoes schema shape. For destructive
   changes, fix-forward is the real plan; state that per-migration.
5. Migration + its dependent code in the same deploy breaks N/N-1
   compatibility (the zero-downtime rule above) — ship them a deploy apart.
   Alembic (Python) follows the same up/down + CI-rollback-tested discipline;
   autogenerate is a draft, not a final migration.

## Schema design (Postgres)

Design the schema before the first migration — it's the hardest thing to
change once rows exist. Postgres is the default; reach for another store only
when its access pattern genuinely doesn't fit (the `stores-*.md` files).

1. **Normalize to 3NF first, denormalize only with a measured reason.** A
   duplicated column is a consistency bug waiting for the day the two copies
   disagree. Denormalize for a proven read-path cost, and say so in a `impulse:`
   marker — never "for speed" up front.
2. **Right types, enforced at the DB.** `timestamptz` (never naive
   `timestamp`) for time, `numeric` for money — never `float` and never PG's
   legacy `money` type (locale-dependent, lossy casts), `text` + `CHECK` over
   arbitrary `varchar(n)`, native `enum` or a lookup table over a
   free-string status, `uuid`/`bigint` PK via `GENERATED ALWAYS AS IDENTITY`
   (not legacy `serial` — identity is SQL-standard and permission-cleaner) —
   decide per `impulse:` if IDs are guessable/enumerable (IDOR surface, see
   `impulse-security`).
3. **Constraints are correctness, not decoration.** `NOT NULL`, `UNIQUE`, `FK`
   with an explicit `ON DELETE` policy, `CHECK` for invariants. The DB is the
   last line that can't be bypassed by a buggy service. A "we'll enforce it in
   code" invariant is one race from broken.
4. **Index the queries you actually run, not every column.** Each index taxes
   every write. Add for real read paths (FK columns — PG does NOT auto-index
   the referencing side of a foreign key, the classic slow-cascade/slow-join
   surprise; common `WHERE`/`ORDER BY`; the keyset cursor from Pagination
   above); composite-column order follows the query's equality-then-range
   shape. Drop indexes nothing uses. Unique-with-NULLs: PG 15+
   `NULLS NOT DISTINCT` when two NULLs should count as duplicates.
5. **NULL means "unknown," not "empty" or "false."** A nullable boolean is
   three states — usually a modeling mistake. Prefer `NOT NULL DEFAULT`.
6. **Soft vs hard delete is a design decision, not a reflex.** Soft delete
   (`deleted_at`) keeps history but leaks into every query and every unique
   constraint (`UNIQUE` must become partial `WHERE deleted_at IS NULL`).
   Decide once, per table.
7. **JSONB for genuinely schemaless/variable data only** — not as an escape
   from designing columns. Anything you filter or join on wants a real column.
   The `impulse:` ceiling: a JSONB blob you keep adding GIN indexes to is a table
   asking to be normalized. Real numbers, not a vibe: every insert/update
   touching a GIN-indexed JSONB column decomposes the whole document to
   update the index — on write-heavy tables with large documents this can
   cut insert throughput 30-50%. Operator class matters too: `jsonb_ops`
   (default) indexes can reach 60-80% of table size; `jsonb_path_ops`
   trades broader operator support for a much smaller index, 20-30% of
   table size — pick it when queries only ever use `@>`/`?`-style
   containment, not full key-existence search.
   [pganalyze: understanding Postgres GIN indexes](https://pganalyze.com/blog/gin-index)
8. **Ceiling markers, not premature partitioning/sharding.** Design for
   today's volume; mark where table partitioning (time-series), a read
   replica, or a move to ClickHouse (`stores-clickhouse.md`) becomes the answer. Don't
   partition a 10k-row table.

Contested schema shape (the aggregate boundary, event-sourcing vs CRUD, one
big table vs split) → `impulse-brainstorm` first, land as an ADR.

## Binary size — when image size/cold-start/registry-transfer cost matters

Not a default optimization — relevant when container image size,
serverless cold-start, or CI artifact-transfer time is a real constraint,
not speculatively. Ordered by measured impact, biggest first:

1. **`-ldflags="-s -w"`** (strip symbol table and DWARF debug info) —
   25-35% raw reduction, the single largest win, do this first before
   anything else on the list.
2. **`-gcflags=all=-l`** (disable inlining) — an additional 5-10 points,
   but this trades against hot-path latency. Measure both build variants
   under real load before shipping the smaller one; a size win that costs
   real request latency isn't free.
3. **`CGO_ENABLED=0` + `-tags netgo,osusergo` together** — can
   paradoxically INCREASE size for a service with large C-backed
   dependencies (heavy cloud SDKs, for example). Build both ways and
   compare actual output size — don't assume static-linking is always
   smaller.
4. **Repo-specific build tags gating optional heavyweight features** —
   check `goreleaser.yaml`/the Dockerfile/CI config for existing `-tags`
   usage before adding new ones; a project may already have a smaller
   build variant nobody's using in the default build path.
5. **Watch for packages that weaken dead-code elimination**: `plugin`,
   `reflect`, `text/template`, `html/template`, `embed`, `time/tzdata` —
   importing any of these can pull in more of the runtime than the
   import itself suggests, defeating the linker's ability to strip
   unused code.

Anti-patterns: never treat PGO (profile-guided optimization) as a size
technique — it's a speed technique, orthogonal to this list. Never run
UPX after code-signing on macOS (the compressed binary fails signature
verification and gets SIGKILL'd at launch). Never declare success from
raw byte count alone — measure raw size, compressed/registry-transfer
size, AND runtime behavior (startup time, memory) together; a smaller
binary that's slower to start defeats the point on a cold-start-sensitive
deployment.
