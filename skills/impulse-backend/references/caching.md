# Caching strategy

NOT day-one baseline — `baseline.md` deliberately excludes caching layers.
This is ceiling-marker / add-when-a-real-hot-read-appears territory; mark it
with a `impulse:` trigger, don't build it speculatively. The `arch:`
cache-stampede finding (`ai-bug-patterns-be.md`, Shopify Black Friday 2019)
is the failure this prevents — extend it, don't duplicate.

1. **Default cache-aside:** miss → load from DB → populate; write → DELETE
   the key (not SET). Write-through only for low-write, staleness-intolerant
   data — it doubles write latency and still needs invalidation.
2. **Stampede:** a fixed TTL on a hot key → synchronized mass expiry → every
   request misses at once and hammers the DB. Fix: TTL + 10-20% jitter, or a
   singleflight/mutex around the miss-fetch so one request repopulates.
   A third option that beats both when the key is truly hot: probabilistic
   early recompute — the miss-probability climbs as expiry nears, so the
   refresh happens in the background while the still-valid value keeps
   serving, never as a synchronized cliff (the XFetch technique, VLDB 2015).
   Combine with negative caching (short TTL on empty/404 results) so a
   missing-row lookup doesn't repeat the same wasted query every request.
3. **Stale-cache-after-write:** DB write succeeds, the cache DELETE fails or
   races, and an in-flight reader repopulates with the pre-write value. Fix:
   double-delete (invalidate before AND after the write), or verify the DEL
   with bounded-backoff retry — never fire-and-forget an invalidation.
4. **Event-driven invalidation (outbox/CDC) over TTL-only** for anything
   correctness-sensitive; TTL is a backstop, not a strategy.
5. **Cache expensive/hot reads only** — caching a cheap or low-reuse query
   adds a failure mode for zero win.
5a. **Immutable/finalized data is a distinct trigger from "hot," and the
    fix isn't a cache — it's compute-once-and-persist.** Data belonging to
    a genuinely closed record (a completed order, a closed reporting
    period) that still gets recalculated from source tables on every read
    is the easiest class of waste to miss, because the code stays
    correct — it's not producing wrong answers, just repeating work on
    data that provably won't change again. Recognize by the trigger
    condition (this record can never be updated again), not by request
    volume — a rarely-read closed record still doesn't need recomputing
    on the read that finally happens.
6. **Key includes a version segment** (`user:v2:123`) — same rule as
   `impulse-ai/references/rag.md`'s embedding cache-key; an unversioned key silently
   serves old-shape data after a logic change.
7. **Where the caching lives (Go, but the shape generalizes): a decorator
   behind the same repository interface, not caching calls scattered
   through business logic.** A `RepoRedis` type implements the exact same
   Repository interface as the real Postgres-backed repo — checks Redis
   first, falls through to Postgres on miss — and the use-case/business
   logic layer only ever depends on the Repository interface, with zero
   awareness a cache exists underneath it. Keeps cache-aside logic in one
   place instead of duplicated at every call site, and the interface stays
   swappable (test doubles, a future different cache, or no cache at all
   for a code path that shouldn't have one).

Sources: [Redis: taming the thundering herd](https://redis.io/blog/how-to-tame-the-thundering-herd-problem/) ·
[Habr: cache invalidation as a consistency problem](https://habr.com/ru/companies/otus/articles/1033194/) ·
[OneUptime: handling cache stampede in Redis, XFetch/probabilistic early expiration](https://oneuptime.com/blog/post/2026-01-21-redis-cache-stampede/view)
