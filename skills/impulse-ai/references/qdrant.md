# Qdrant — collection design, indexing, decay

## Collection design

One collection with payload-based tenant/type filtering is the default —
matches the ladder's platform-primitive rung (use what Qdrant already
gives you before building your own partitioning). Split into multiple
collections only for regulatory isolation requirements or genuinely
different embedding models per tenant — not as a default "cleaner"
structure.

## Indexing — the mistake that silently degrades over time

**Any field used in a `filter` must have an explicit payload index.**
Qdrant does not auto-index payloads — an unindexed filter works correctly
on a small collection and silently degrades to a full scan as data grows,
with no error, just increasingly bad latency. Create the index before bulk
ingestion, not after noticing slow queries.

The `filter` on a search request is applied *during* HNSW graph traversal,
not as a post-hoc pass over the top-k results — this is what makes "find
similar among this user's documents" behave correctly at all. Filtering
client-side after an unfiltered top-k search either starves a selective
filter (too few results survive) or forces an artificially huge `limit` to
compensate; always push the condition into the query's `filter`, never
apply it after the response comes back.

## HNSW tuning order

Leave defaults (`m: 16`, `ef_construct: 100`) unless a measured recall
problem exists — don't pre-tune speculatively. When retrieval quality is
actually measured as insufficient:

1. Tune query-time `ef` first — cheap, per-query, no rebuild.
2. Only then touch `m`/`ef_construct` — expensive, requires a full index
   rebuild.

If a rebuild is genuinely justified, calibrate against the field's own
reference points rather than guessing new numbers: a high-recall offline-
batch profile runs `m=24, ef_construct=400, ef_search=500`; a latency-
sensitive real-time profile runs `m=12, ef_construct=200, ef_search=100`.
Higher `m` improves recall (more graph connectivity, less chance of
getting stuck in a local minimum) at the cost of index size and build
time; higher `ef_construct` builds a better-navigable graph at insert-time
cost; higher `ef_search` trades query latency for recall directly, per
query, with no rebuild. Plot recall vs. `ef` and stop increasing it once
the curve flattens — past that point it's pure latency cost for no
retrieval gain.
[Milvus: HNSW parameter tradeoffs, M/efConstruction/efSearch](https://milvus.io/ai-quick-reference/what-are-the-key-configuration-parameters-for-an-hnsw-index-such-as-m-and-efconstructionefsearch-and-how-does-each-influence-the-tradeoff-between-index-size-build-time-query-speed-and-recall)

## Multitenancy — pick by tenant count/skew, not by habit

Same default as Collection design above (one collection, payload-based
partitioning) — this section is the tenant-scale mechanics on top of that
default: a keyword payload index on the tenant field with `is_tenant=true`
(v1.11+, stores each tenant's vectors together for sequential reads), a
`must` filter on that field at every query.

At real SaaS scale (a few large tenants + a long tail of small ones),
plain payload partitioning creates a noisy-neighbor problem: one whale
tenant's load degrades every other tenant sharing the collection. **Tiered
multitenancy** (v1.16+) layers custom sharding on top of payload tenancy —
small tenants share one fallback shard, large tenants get dedicated shards,
promotable with no downtime as a tenant grows. Don't exceed ~1000 dedicated
shards per cluster; the fallback shard must fit on one node; sharding
method is fixed at collection creation (can't convert auto-sharded →
custom in place — decide up front if isolation will ever be needed).

Data residency (e.g. regional compliance) uses the same custom-sharding
mechanism, keyed by region instead of tenant.

**v1.19** adds per-tenant IDF statistics for BM25/sparse scoring: without
it, term rarity is computed against the WHOLE collection's vocabulary,
which skews relevance for any tenant whose domain vocabulary differs from
the aggregate (a legal-docs tenant sharing a collection with a
support-tickets tenant gets scoring tuned to neither). Scope IDF to the
tenant filter when hybrid/BM25 search is multitenant.

**A payload filter is not your whole security model.** Tenant isolation
via payload filtering is an application-layer responsibility — the filter
enforces nothing on its own if application code forgets to apply it.

## Memory — quantization before scaling out

Resident memory (ID tracker, `always_ram` quantized vectors, payload
indexes) is what actually threatens OOM; OS page cache holding original
vectors degrades performance under pressure but doesn't crash the
service. If resident memory exceeds ~80% of total RAM, that's the signal
to act — not to add nodes reflexively.

**v1.19 (Aug 2026)** replaces the old per-setting memory knobs with one
unified `memory` parameter that places each component (vectors, index,
payload) into one of three tiers — `pinned` (always RAM), `cached` (RAM
when available, disk-backed otherwise), `cold` (disk-first) — reason about
placement per component instead of juggling `on_disk`/`always_ram` flags
separately. Same release adds a TurboQuant datatype: compresses vectors to
4 bits without retaining a full-precision copy, up to 9x storage reduction
over prior TurboQuant quantization — evaluate before reaching for
`float16`/`int8` below if the precision loss is tolerable for the recall
bar in use.

Cheapest-first memory reduction, before reaching for more hardware:

1. Quantization — store compressed vectors in RAM, originals on disk.
2. `float16`/`int8` vector datatypes — 2x/4x memory cut, some precision
   tradeoff.
3. Matryoshka Representation Learning (MRL) — keep small vectors in RAM,
   large ones on disk.
4. Put payload indexes and sparse vectors on disk explicitly — they're
   more disk-tolerant than dense vectors.
5. `async_scorer` (Linux, kernel 5.11+) — `io_uring` for parallel disk
   access, meaningful win for low-RAM/on-disk deployments.

Putting the HNSW index itself on disk is a last resort (real latency
cost) — only sensible with low-latency local NVMe, or in multitenant
deployments where only a fraction of tenants are hot at once.

## Embedding model migration — version-gated, plan the downtime story upfront

Vectors from different models are incompatible — never mixed in one
vector space. On v1.18+, named vector fields can be added/removed on an
existing collection; on v1.17 and earlier, all named vectors must be
defined at collection creation.

1. **Zero-downtime replace** (v1.18+, named vectors): add the new vector
   field to the existing collection, re-embed in the background via
   `UpdateVectors`, verify quality, delete the old field. Pre-v1.18 or
   unnamed vectors: create a new collection, re-embed into it, point the
   app at a collection **alias**, atomically swap the alias — but the
   alias swap only redirects queries, payloads must be re-uploaded
   separately.
2. **Side-by-side (A/B, multi-modal)**: same mechanics, but keep both
   vector fields live and compare via `using: "old_model"` vs
   `using: "new_model"` before swapping.
3. **Dense → hybrid (adding sparse/BM25)**: can't add sparse vectors to a
   collection using an unnamed dense vector — must recreate. If already on
   named dense vectors + v1.18+, add the sparse field directly.
4. Large multi-vectors (ColBERT) co-located with dense vectors degrade
   *every* query, not just multi-vector ones — a documented case dropped
   from 13s to 2s latency after moving ColBERT off the hot path. Put large
   vectors on disk during any side-by-side migration.
5. Bulk re-embed: batch upload 64-256 points/request across 2-4 parallel
   streams, disable HNSW during load (`indexing_threshold_kb` high, restore
   after). For 400GB+, expect days; for <25MB, re-indexing from source
   beats the migration tooling.

Don't delete the old collection before verifying the new one, and don't
skip payload migration on an alias swap — the alias moves queries, not
data.

## Backup

Snapshots are disaster recovery, not high availability. Nightly snapshot
export to off-cluster storage, with periodic restore drills (an untested
backup is not a backup) — replication is the actual HA mechanism, don't
conflate the two.

## Decay patterns — `arch:`-caliber, compound over months

Parallel to `impulse-review/references/ai-bug-patterns-be.md`'s `arch:` tag
philosophy: these don't break today, they compound silently.

1. **No transactional/outbox link between source-DB deletes and
   vector-DB deletes** → orphaned vectors accumulate, dilute retrieval
   quality. Qdrant point counts are explicitly approximate — no FK
   enforcement exists to catch this for you.
2. **No TTL/purge job on a growing collection** → stale vectors compete
   with ground truth in retrieval ranking. A documented real case
   accumulated ~6,000 stale records/month with zero cleanup running.
   Deletion itself is lazy: a delete marks the point, it doesn't reclaim
   space until segment optimization runs — plan a TTL/purge job as
   "delete, then wait for optimization to actually free memory," not as an
   instant reclaim, or capacity planning will be wrong by exactly the size
   of the not-yet-optimized backlog.
3. **Soft-deleted points may remain reconstructible inside the HNSW
   graph** — a real compliance/erasure-obligation gap if "deleted" is
   assumed to mean gone; if erasure guarantees matter, verify Qdrant's
   actual deletion semantics for the version in use, don't assume.
4. **No periodic drift check** (sampling new-vs-old embedding
   distributions) → domain/vocabulary shift degrades retrieval with no
   alert — the collection looks healthy in every metric that isn't
   specifically checking for this.
5. **Document updates with no re-embed+upsert trigger** → retrieval serves
   stale content indefinitely; the source of truth changed, the vector
   index didn't hear about it.
