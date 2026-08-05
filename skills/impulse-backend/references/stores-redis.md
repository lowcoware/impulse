# Store: Redis — data modeling, connections, ops

One of six blessed non-core stores (see `deps.md`). Caching *strategy*
(invalidation, stampede, TTL jitter) lives in `caching.md` — this file is
Redis itself: which structure, how to connect, what not to call in
production. `arch:` compounds silently over months; `bug:` is catchable
in a single diff.

## 1. Pick the structure by access pattern, not by data shape

| Use case | Structure | Why |
|---|---|---|
| Simple values, counters | String | atomic `INCR`/`DECR` |
| Object with independently-updated fields | Hash | per-field read/write, no whole-object rewrite |
| Queue, recent-N items | List | O(1) push/pop at ends |
| Unique items, membership | Set | O(1) `SADD`/`SISMEMBER` |
| Rankings, score ranges | Sorted Set | `ZADD`/`ZRANGE`/`ZRANK` |
| Nested/hierarchical data | JSON (RedisJSON) | path-level updates |
| Event log, fan-out | Stream | persistent, consumer groups |

**Anti-pattern:** a flat object serialized into one String — updating one
field means fetch + parse + mutate + rewrite the whole blob. Use a Hash.

## 2. Key naming

`{entity}:{id}:{attribute}` — lowercase, colon-separated, stable hierarchy
(`user:1001:profile`, `session:abc123`). Keep keys short but readable —
they live in memory and appear in every command; never a full URL or long
string as a key (hash it or extract a short ID). Prefix for multi-tenancy
(`tenant:42:user:7:cart`) so scans and ACLs can target one tenant.

## 3. Connections — pool or multiplex, never one connection per request

| Style | Used by | Note |
|---|---|---|
| Pool | redis-py, Jedis, go-redis | each lease blocks if pool exhausted; size to concurrency |
| Multiplex | Lettuce | single shared connection; **cannot** carry blocking commands like `BLPOP` |

Opening a new TCP connection per operation is the single biggest client
mistake — always pool or multiplex.

**bug:** issuing `BLPOP`/`BRPOP`/`BLMOVE` (or any blocking command) on a
Lettuce multiplexed connection stalls every other caller sharing it —
Lettuce's own docs require a dedicated connection for blocking commands,
not the shared default. *Detect:* a blocking call with no separate
connection/pool configured for it. *Fix:* dedicated connection (or a
separate pool) for anything that blocks.

## 4. Pipeline bulk work

For N independent commands, pipeline them into one round-trip instead of N.
Non-transactional pipelining for pure throughput; `transaction=True` only
when atomicity is actually needed (see MULTI/EXEC semantics).

## 5. Commands that block the whole server — never in production paths

**arch:** `KEYS`, `SMEMBERS` (on a large set), `HGETALL` (on a large
hash) walk the full keyspace or container. Redis is single-threaded —
one slow command blocks every other client on that instance for its
whole duration, not just the caller who issued it; Redis's own command
reference flags `KEYS` as unsafe for production for exactly this reason.
Cheap on a small dataset, silently degrades into a full-instance stall as
the keyspace/collection grows — no error, just rising latency for
everyone. *Detect:* `KEYS`, `SMEMBERS(`/`HGETALL(` on a key with no
known-small bound. *Fix:* `SCAN`/`HSCAN`/`SSCAN`/`ZSCAN` with a cursor,
always.

## 6. Client-side caching (RESP3)

For read-heavy workloads on hot keys, RESP3 client-side caching lets the
client hold a local copy and get server-pushed invalidation — cuts
round-trips for keys read far more often than written. Not a replacement
for `caching.md`'s app-level cache-aside; this is a Redis-protocol-level
optimization on top of it.

## 7. Timeouts

Set connect/read/write timeouts explicitly and fail fast — a hung Redis
connection with no timeout blocks the caller indefinitely, same class of
bug as an HTTP client with no deadline (baseline.md's every-network-call
rule applies to Redis too).

## Sources

Re-expressed from `redis/agent-skills` (`redis-core`, `redis-connections`
— MIT, Redis Inc.).
