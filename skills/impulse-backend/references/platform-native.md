# Platform-native — the rung 3/4 catalog

Lookup for "does this already exist before I write it". Rung 3 = stdlib,
rung 4 = platform primitive (`ladder.md`). Format: what you reach for → what
already ships → what you stop maintaining.

The rung-4 table in `deps.md` (UNIQUE, FK/CHECK, upsert, SETEX, SET NX,
Streams, partition keys, consumer groups, edge rate-limit/CORS/TLS) is not
repeated here — this file is what comes AFTER that table.

Version tags mark what a row needs; the blessed floor is Go 1.23 / Python 3.14
(`deps.md`), current is Go 1.26.

## Go stdlib

| You reach for | Already ships | You stop maintaining |
|---|---|---|
| `pkg/errors` or a custom cause-chain type | `fmt.Errorf("ctx: %w", err)` + `errors.Is/As/Join` | a dep frozen since 2021 and your own unwrap logic |
| a `contains`/`indexOf`/`dedup` loop, or a shared `utils` package for it | `slices`, `maps` (1.21) | the util package every service re-copies |
| `wg.Add(1)` + `defer wg.Done()` by hand, or a worker-pool dep | `wg.Go(func(){ ... })` (1.25) | the whole Add/Done mismatch bug class. Ceiling: no error propagation, no cancel — that is still `errgroup` |
| `context.Background()` for work that outlives the request, or a bespoke detached-context type | `context.WithoutCancel(ctx)`, `context.AfterFunc` (1.21) | trace/correlation values silently dropped by `Background()` |
| `time.Sleep` in a test to let goroutines settle | `testing/synctest` (stable 1.25) — fake clock, blocks until the bubble is idle | the flake, and the sleep budget that only grows |
| a `uuid` dep to mint a session/API token | `crypto/rand.Text()` (1.24) | a dependency for one function — and UUIDv4 was never a token format |
| `filepath.Join` on user input plus a hand-written `..` guard | `os.OpenRoot` / `os.Root` (1.24), enforced below the syscall | a traversal guard that misses symlinks |
| `chi`/`gorilla/mux` for a second listener (admin, internal, metrics) | `net/http.ServeMux` patterns (1.22): `mux.HandleFunc("GET /jobs/{id}", h)` | a router dep for a two-route surface. Gin stays canon for the service API |
| package var + `init()` + `sync.Once` to build a singleton lazily | `sync.OnceValue(f)` / `sync.OnceFunc(f)` (1.21) | the nil-until-initialized window |
| `rand.Seed(time.Now().UnixNano())` | `math/rand/v2` (1.22), seeded for you — `crypto/rand` for anything secret | a seeding ritual deprecated since 1.20 |
| `strings.Split(s, "=")[1]` | `strings.Cut` | the index panic on malformed input |

## Python stdlib

| You reach for | Already ships | You stop maintaining |
|---|---|---|
| `pytz` | `zoneinfo.ZoneInfo("Europe/Moscow")` | vendored tzdata and the `localize()` footgun. Ceiling: slim/alpine images carry no system tzdata — add the `tzdata` package or `ZoneInfo` raises at runtime |
| `python-dateutil` to parse a timestamp from an API or DB | `datetime.fromisoformat()` — takes offsets and `Z` since 3.11 | a dep. Ceiling: RFC 2822 and human-written dates still need dateutil |
| a hand-written `chunks(seq, n)` | `itertools.batched` (3.12) | an off-by-one on the last batch |
| a pydantic `BaseModel` for a struct that never crosses a trust boundary | `@dataclass`, `StrEnum` (3.11) | validation cost on data you produced yourself. Pydantic stays at request/response and every external payload — that is a carve-out, not a preference |
| `@app.on_event("startup")` | `lifespan=` + `contextlib.asynccontextmanager` | a deprecated hook, and startup failures that vanish instead of refusing to boot |
| `random.choice` for a token, `==` to compare a secret or signature | `secrets.token_urlsafe()`, `hmac.compare_digest()` | a predictable token and a timing oracle |
| a module-level dict as a memo cache | `functools.cache` | your own eviction bug. Ceiling: unbounded and per-process — Redis when a second replica appears |

## JS/TS and Node

Browser UI primitives (dialog, dropdown, observers, debounce) are
`impulse-frontend`'s call — reka-ui and VueUse first. This lane is runtime and data.

| You reach for | Already ships | You stop maintaining |
|---|---|---|
| `dotenv` | `node --env-file=.env` (stable in 22/24) | a dep in the boot path. Ceiling: no variable expansion — a `.env` whose values reference other values behaves differently than under dotenv |
| `uuid` | `crypto.randomUUID()` | |
| `lodash.clonedeep` | `structuredClone(obj)` | Ceiling: functions, class identity and DOM nodes throw `DataCloneError` |
| `qs` / `query-string` | `new URLSearchParams(...)` | encoding edge cases you would have hand-tested |
| `lodash.groupby` | `Object.groupBy(arr, fn)` (Baseline 2024) | |
| `axios` inside a Nuxt app | `$fetch` / `useFetch` (ofetch ships with Nuxt) | a second HTTP client, plus the SSR payload dedup you would lose |
| `setTimeout` + `AbortController` wiring for a fetch timeout | `AbortSignal.timeout(ms)`, composed with `AbortSignal.any([...])` | a timer you forget to clear on the success path |

## PostgreSQL

| You reach for | Already ships | You stop maintaining |
|---|---|---|
| app code recomputing a derived value on every write (normalized email, totals, search vector) | a generated column | drift the day one write path forgets. FTS specifics: `search.md` |
| SELECT-then-check that no booking/slot overlaps | `EXCLUDE USING gist (room_id WITH =, during WITH &&)` (needs `btree_gist`) | a race that app code structurally cannot close |
| an app check for "unique among non-deleted rows" | partial unique index `... WHERE deleted_at IS NULL` | a uniqueness rule enforced only where someone remembered it |
| a row-per-INSERT loop for an import or backfill | `COPY`, or multi-row `INSERT` | minutes of round-trips, and a half-finished import |
| polling a table to see whether a row changed | `LISTEN` / `NOTIFY` | a poll loop and its interval tuning. Ceiling, and it is a hard one: not durable — a disconnected listener misses the event outright, payload caps at 8000 bytes. Anything that must not be missed goes outbox + Kafka (`events.md`) |
| app-side recursion over a tree (categories, referral chain) | `WITH RECURSIVE` | a round trip per level |
| fetching all rows to compute running totals or rank-within-group | window functions: `SUM(...) OVER (...)`, `RANK() OVER (PARTITION BY ...)` | pulling a table across the wire to produce one number |
| an app mutex around a critical section that already runs inside a transaction | `pg_advisory_xact_lock(key)` — released on commit or rollback, no TTL to tune | a lock that outlives its transaction. Redis `SET NX` stays the default for cross-service locks (`deps.md`) |

## Redis

| You reach for | Already ships | You stop maintaining |
|---|---|---|
| `KEYS prefix:*` to find or purge keys | `SCAN` with a cursor, or an index set you maintain | an O(N) command that blocks the single thread — this is an outage on a real keyspace, not a slow query |
| `GET` then `DEL` to release a lock | Lua compare-and-delete against an owner token | deleting a lock your TTL already handed to someone else. Ceiling: a single-node lock is lost on failover — money/state belongs in the DB transaction |
| a table plus a poller for "do this at time T" (delayed retry, reminder) | sorted set: `ZADD due <ts> <id>`, drain with `ZRANGEBYSCORE ... LIMIT` | a scheduler table, its index, and its cleanup job |
| a Set of user IDs to count uniques (DAU, reach) | `PFADD` / `PFCOUNT` — 12 KB fixed, ~0.8% error | memory that grows with your user base. Ceiling: no exact count, no membership test |
| a custom retry loop for stream messages a dead consumer never acked | `XAUTOCLAIM` (6.2+) on the consumer group | your own pending-entry ownership bookkeeping |

## Kafka

| You reach for | Already ships | You stop maintaining |
|---|---|---|
| a "current state" table or cache that a consumer rebuilds | a compacted topic (`cleanup.policy=compact`), key = entity id | the snapshot job. Ceiling: compaction keeps the last value per key, so point-in-time replay is gone — keep a retention-based topic if you need history |
| a `deleted: true` event plus filtering in every consumer | a tombstone — null value on the key | delete-marker logic in N consumers, and rows compaction would have removed for you |
| app-level confirmation that the broker really persisted a write | `acks=all` with `min.insync.replicas=2` | a confirm protocol you invented. At RF=3 this survives losing one broker |
| auto-commit plus a handler that can fail | `enable.auto.commit=false`, commit after the side effect (kafka-go: `CommitMessages`) | silent message loss that presents as a bug in your handler |

## Traefik

Config lives in `impulse-security/references/edge.md`; rate limit, CORS,
compression and TLS are already in `deps.md`. What is left:

| You reach for | Already ships | You stop maintaining |
|---|---|---|
| the same auth check copy-pasted into every internal service | `forwardAuth` to one auth service | N copies that drift apart, one of which is the incident |
| app-level IP checks on an admin route | `ipAllowList` middleware | `X-Forwarded-For` parsing, which you will get wrong under a proxy chain |
| retrying a failed upstream call in the calling service | `retry` middleware — idempotent routes only | per-caller retry config. Not a substitute for the baseline's backoff+jitter on business calls |
| app code doing http→https redirects and security headers | `redirectScheme` + `headers` middleware | per-service copies of edge concerns |

Shared ceiling: middleware is per-route config, not per-user logic. The moment
a rule needs your database — per-tenant quota, RBAC, ownership — it belongs in
the app, and `deps.md`'s "never hand-roll" no longer applies.

Sources: go.dev release notes 1.21-1.26 · docs.python.org 3.14 whatsnew ·
postgresql.org docs (ddl-generated-columns, rangetypes, sql-notify) ·
redis.io commands · kafka.apache.org design/compaction · doc.traefik.io middlewares.
