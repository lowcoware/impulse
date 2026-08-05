# Postgres — general-purpose relational store

Distilled from three harvested GitHub skills (wimolivier/postgresql-best-practices,
jfdasher/postgres-schema-introspection, pumarogie/claude-postgres-skills).
The other `stores-*.md` files cover
specific extensions/engines (postgis, clickhouse, mongodb, neo4j, redis);
this one is plain Postgres as the primary relational store. Vector search
specifically: `impulse-ai/references/pgvector.md`.

## Anti-patterns — flag on sight in review

| Pattern | Why it bites | Fix |
|---|---|---|
| `NOT IN (subquery)` | If the subquery can return a single NULL, the whole `NOT IN` silently matches nothing — not an error, just wrong results | `NOT EXISTS (...)` |
| `BETWEEN` on timestamp ranges | `BETWEEN a AND b` is inclusive on both ends — a "today" range double-counts midnight-boundary rows or silently excludes the day's last instant depending on how `b` was computed | `>= start AND < end` |
| `SELECT ... FOR UPDATE` with no `NOWAIT`/`SKIP LOCKED` | Silent indefinite lock-wait under contention instead of a fast, explicit failure or a deliberate skip | `NOWAIT` to fail fast, `SKIP LOCKED` for a worker-pool-safe queue-style claim |
| Missing index on a foreign-key column | Every join/delete-cascade on that FK does a sequential scan — detection query in observability.md | add the index; this is the exact check observability.md's unindexed-FK query already catches |
| `serial`/`bigserial` for new tables | Sequential IDs both enumerate the ID space (security-checklist.md's ID-enumeration rule) and, being monotonic-but-not-time-sortable-across-shards, don't help index locality the way a time-ordered UUID does | `GENERATED ALWAYS AS IDENTITY` at minimum; `uuidv7()` (Postgres 18+) as the default PK type — timestamp-ordered, so index locality stays good, unlike a fully random UUIDv4 |

## Table-type classification — before writing a join

Classify each table before writing SQL against an unfamiliar schema,
rather than guessing join strategy by trial and error:

- **Lookup** — small reference data, filter by a short code, rarely joined
  more than one hop away.
- **Core entity** — high cardinality, hub of relationships, filter by PK
  or a unique handle.
- **Dependent entity** — always reached through a FK, follows the
  parent's cascade rules.
- **Junction** — composite PK bridging two entities, no independent
  identity of its own.

The classification drives join order and filter placement below, not just
naming convenience.

## Query construction — read `pg_stats` before guessing

Before writing a non-trivial join or filter, `pg_stats` answers questions
that would otherwise be guessed:

- `n_distinct` — estimates result-set size for a given column, informing
  whether a filter is actually selective.
- `most_common_vals` — orders WHERE-clause filters by actual selectivity
  instead of an assumed one; apply the most selective filter first.
- `null_frac` — whether a NULL check on this column is even necessary.

Join order: low-cardinality tables first, most selective filters applied
earliest — the planner usually gets this right on its own, but knowing it
explains an unexpected plan instead of guessing at one.

## Schema access pattern — optional, not a default

A three-schema pattern (`data` for raw tables, `private` for internals,
`api` as a `SECURITY DEFINER` + `SET search_path` view layer) is a real
way to enforce access control at the database level instead of only in
the app layer. Flagging this as an OPTION worth knowing about, not a
default — most Go/FastAPI services in this suite enforce authorization in
the app layer already, and adding a DB-level schema-separation scheme on
top is real operational complexity that needs a real multi-consumer or
defense-in-depth reason, not speculative hardening.

**Row-level security (RLS)** is the same class of option, one level more
granular — a policy scoping every row to its owner, enforced by Postgres
itself rather than by app-layer `WHERE user_id = ?` clauses. Two traps if
it's used: `USING (true)` on a policy is a silent no-op — it enables RLS
in name while leaving every row readable, and looks protected in tooling
without being protected in practice; and the ownership check inside the
policy must derive from the server-side authenticated identity (a
`current_setting()` the app sets from its own auth, or Supabase-style
`auth.uid()`), never from a client-supplied `user_id` column value — a
client that can set its own `user_id` on write defeats the policy's
intent regardless of the policy syntax being technically correct.

## Read/write connection routing — explicit, not implicit

Relevant the moment a read replica exists (or is planned) — worth
deciding the shape even before one does, since it documents which code
paths mutate state either way. Default every DB call to a read-only
connection/session; writer access requires an explicit, visible opt-in
(a dedicated write-session factory, or a wrapping construct that marks
the call site as intentionally mutating) rather than being implicit from
"whichever function happens to call it." Configure the test/dev
environment to hard-fail on any writer access that wasn't explicitly
opted into — that turns an accidental write-against-a-replica bug (which
in production either errors confusingly or, worse, silently succeeds
against the primary while every other read in the request hit a stale
replica) into an immediate, loud test failure instead of a production
incident.

## Postgres-native alternatives — before reaching for a new service

Same "smallest sufficient step" spirit as `ladder.md`: for a project with
no Redis/scheduler infra yet, these cover real ground with zero added
infrastructure. Not a reason to rip out Redis where it's already there —
this is for the smaller case where a whole extra service would otherwise
get added just for one of these needs.

- **Job queue.** `SELECT ... FOR UPDATE SKIP LOCKED` (worker-safe claim,
  no double-processing) combined with `LISTEN`/`NOTIFY` (push-based
  wakeup instead of polling) covers queue-shaped work. `jobs.md`'s
  blessed primitive is still Redis Streams once Redis is already in the
  stack for other reasons.
- **Scheduling.** `pg_cron` runs recurring SQL directly inside Postgres
  (`SELECT cron.schedule('nightly-cleanup', '0 2 * * *', $$...$$)`) —
  the schedule lives in the database, not in application code, which
  sidesteps `jobs.md`'s documented two-replicas-both-run-cron failure
  mode entirely (there's nothing replica-unaware about it; only one
  Postgres instance runs the cron catalog).
- **Cache.** An `UNLOGGED TABLE` (`key TEXT PRIMARY KEY, value JSONB,
  expires_at TIMESTAMPTZ`) skips WAL writes — crash-truncated, not
  replicated to standbys, same "reconstructible data only" constraint
  `caching.md` already assumes for any cache. `INSERT ... ON CONFLICT DO
  UPDATE` for set, `WHERE expires_at > NOW()` for get, a `pg_cron` job
  for expired-row cleanup. Near-Redis write speed for cache-aside without
  adding a dependency.
- **Rate limiting.** The same `INSERT ... ON CONFLICT DO UPDATE` upsert
  pattern (`PRIMARY KEY (key, window_start)`, atomic increment, compare
  the returned count to the limit) replaces Redis `INCR`+`EXPIRE` for a
  project that doesn't have Redis yet.
- **Audit trail.** For `pre-code-gate.md`'s "stores PII or regulated
  data" box — don't leave "needs an audit trail" as an unspecified
  requirement. `CREATE TABLE orders_history (LIKE orders INCLUDING ALL)`
  plus `changed_at`/`changed_by`/`change_type` columns, populated by an
  `AFTER UPDATE OR DELETE` trigger inserting `OLD.*`, is the cheap
  Postgres-native default answer.

## DDL against a live table: `lock_timeout`, not an open-ended wait

`hardening-go.md`'s zero-downtime migration section covers the
expand→backfill→contract shape and N/N-1 compatibility; this is the
mechanism underneath it. An `ALTER TABLE` waiting for an `ACCESS
EXCLUSIVE` lock queues AHEAD of every query that arrives after it — one
long-running `SELECT` plus one unguarded DDL statement stalls the entire
table for every subsequent query, not just the ones the migration itself
would ever touch. `SET lock_timeout = '5s'` before any DDL against a live
table turns an indefinite stall into a recoverable failed statement
instead of a production incident.

Two related details:
- A failed `CREATE INDEX CONCURRENTLY` leaves an invalid index behind
  (`pg_index.indisvalid = false`) — Postgres does NOT clean this up
  automatically; check for and drop it before retrying.
- Whether adding a column needs the full expand-and-contract dance
  depends on the default's volatility (PG11+): a non-volatile default is
  metadata-only (instant, no table rewrite); a volatile default
  (`gen_random_uuid()`, `now()`) triggers a full table rewrite and needs
  the careful zero-downtime treatment.

## Connection pooling — PgBouncer transaction-mode breaks session state

`hardening-go.md`'s DB-pool section covers app-side pool sizing; this is
the pooling LAYER itself, which app-side tuning doesn't touch. Transaction-
mode pooling (the correct default for stateless web workloads) silently
breaks anything session-scoped: session-level prepared statements,
session advisory locks, `LISTEN`/`NOTIFY`, session variables, and cursors
held open across transactions. Each needs either a transaction-scoped
alternative or a dedicated session-pooled/direct connection carved out
for it — this works fine in dev (no pooler, or session-mode pooling) and
breaks silently in prod under transaction-mode PgBouncer, so it won't
surface in normal local testing. Go/pgx specifically: pgx's implicit
prepared-statement cache is incompatible with transaction pooling unless
PgBouncer tracks protocol-level prepared statements or the driver is set
to `default_query_exec_mode=exec`.

## Autovacuum and bloat — cluster defaults don't scale to a busy table

Nothing here is optional forever — dead-tuple accumulation and
transaction-ID wraparound are real failure modes, not theoretical:
- Tune `autovacuum_vacuum_scale_factor`/`threshold` per-table for
  high-write tables; the cluster-wide default (a percentage of table
  size) doesn't scale down to the tighter dead-tuple tolerance a busy
  table needs.
- Diagnostic queries: `pg_stat_user_tables` for dead-tuple counts,
  `age(relfrozenxid)` for wraparound-risk proximity.
- Remediation is NOT one tool for every case: `REINDEX CONCURRENTLY` for
  a bloated index (safe, online); `pg_repack` for a bloated table (online
  rewrite); `VACUUM FULL` — takes `ACCESS EXCLUSIVE` — never against a
  live table serving traffic.

## Two schema-design details worth knowing before they bite

- `timestamptz` normalizes to an absolute instant and does NOT retain the
  input's original timezone/offset — store `origin_tz text` as a
  separate column if the product actually needs to know what zone the
  user was in, not just when the instant occurred.
- `ON DELETE CASCADE` on a high-volume relationship needs its fan-out
  bounded before it ships — a large cascade is a real write with real
  lock/WAL/vacuum cost, not a free deletion primitive; an unbounded
  cascade on a hot parent table is a self-inflicted incident waiting for
  the first large deletion.

## Boundaries

Vector search / pgvector: `impulse-ai/references/pgvector.md`. PostGIS-
specific spatial queries: `stores-postgis.md`. Migration safety
(zero-downtime schema changes): `hardening-go.md`'s zero-downtime
migrations section. ID enumeration and encrypted-ID handling:
`security-checklist.md`.
