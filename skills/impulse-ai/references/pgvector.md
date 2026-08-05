# pgvector — vector search inside Postgres, before reaching for Qdrant

Source: distilled from timescale/pg-aiguide (harvested GitHub skill,
Apache-2.0). Requires pgvector 0.8.0+ (for `halfvec`, `binary_quantize`,
iterative scan).

## When this beats standing up Qdrant

The ladder decision (qdrant.md's own framing — a dedicated vector DB earns
its place at real production traffic/scale, not speculatively) has a
concrete alternative most projects skip past: if the project already runs
Postgres and the corpus is in the low millions of vectors or smaller,
pgvector avoids a second stateful service entirely — one fewer thing to
back up, monitor, and operate. Reach for Qdrant specifically when the
corpus outgrows what fits in Postgres's shared memory comfortably, or when
multitenancy/payload-filtering needs outgrow SQL `WHERE` clauses. Don't
default to Qdrant for a small-to-medium RAG corpus just because it's the
purpose-built tool — that's the same "which official package" question
components.md's design-system table asks, applied to infra instead of UI.

## Golden path (use this unless there's a specific reason not to)

- Embedding column: `halfvec(N)` (N = embedding dimension) — 50% smaller
  storage/index than plain `vector`, minimal recall loss. Not `vector`
  by default.
- Distance: cosine (`<=>`). For unit-normalized embeddings cosine and
  inner product rank identically; default to cosine regardless.
- Index: HNSW, `m = 16`, `ef_construction = 64`. HNSW builds on empty
  tables with no training step and has a better speed/recall tradeoff
  than IVFFlat for almost every case — only reach for IVFFlat under a
  write-heavy workload where frequent index rebuilds are acceptable and
  memory is tight.
- Query-time recall knob: `SET hnsw.ef_search = 100` as a starting point
  (default 40 trades recall for speed more than most RAG use cases want).
- Query shape: `ORDER BY embedding <=> $1::halfvec(N) LIMIT k` — always
  cast the query vector explicitly (`::halfvec(N)`), and match the query
  operator to the index's ops class (`halfvec_cosine_ops` needs `<=>`;
  `halfvec_l2_ops` needs `<->`) — a mismatched operator silently skips
  the index instead of erroring.

```sql
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contents TEXT NOT NULL,
  embedding halfvec(1536) NOT NULL
);
CREATE INDEX ON items USING hnsw (embedding halfvec_cosine_ops);

SELECT id, contents FROM items ORDER BY embedding <=> $1::halfvec(1536) LIMIT 10;
```

## Memory sizing — the number that decides if this scales

HNSW's real cost is staying resident in memory; once it doesn't, p95/p99
latency spikes while CPU sits idle (a diagnostic worth checking before
assuming a query-plan problem). Rough capacity at `m=16`, 1536-dim:

| RAM | Approx max `halfvec` vectors |
|---|---|
| 16 GB | ~2-3M |
| 32 GB | ~4-6M |
| 64 GB | ~8-12M |
| 128 GB | ~16-25M |

Halve these for 3072-dim embeddings; halve again for `m=32`. If the index
won't fit even with `halfvec`, binary quantization is the escape hatch —
not the default:

```sql
CREATE TABLE items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contents TEXT NOT NULL,
  embedding halfvec(1536) NOT NULL,
  embedding_bq bit(1536) GENERATED ALWAYS AS (binary_quantize(embedding)::bit(1536)) STORED
);
CREATE INDEX ON items USING hnsw (embedding_bq bit_hamming_ops);

-- Query with re-ranking (binary distance for candidates, real distance for final order)
SET hnsw.ef_search = 800;  -- must be >= inner LIMIT
WITH q AS (SELECT binary_quantize($1::halfvec(1536))::bit(1536) AS qb)
SELECT * FROM (
  SELECT i.id, i.contents, i.embedding
  FROM items i, q
  ORDER BY i.embedding_bq <~> q.qb
  LIMIT 800
) candidates
ORDER BY candidates.embedding <=> $1::halfvec(1536)
LIMIT 10;
```

32x memory reduction, ~80x oversampling ratio (800 candidates for 10
results) as a starting point — binary quantization loses precision, so
re-ranking against real distance on a wider candidate set recovers most
of the accuracy back.

## Filtered search — pick the strategy by filter selectivity

A `WHERE` clause alongside `ORDER BY embedding <=>` isn't automatic — by
default HNSW can stop early with a filter present, returning fewer rows
than the `LIMIT` asked for.

| Filter shape | Strategy |
|---|---|
| Highly selective (<~10k matching rows) | B-tree index on the filter column, let Postgres prefilter before ANN |
| Low-cardinality (few distinct values) | Partial HNSW index per filter value (`... WHERE category_id = 11`) |
| Many filter values / large dataset | Partition the table by the filter key, keep each ANN index small |
| Filter matters but doesn't fit the above | `SET hnsw.iterative_scan = relaxed_order` (keeps searching past the point HNSW would otherwise stop), raise `hnsw.max_scan_tuples` if still sparse — trades latency for completeness |

## Maintenance

- `VACUUM` regularly — stale entries persist post-update/delete until
  vacuumed.
- `REINDEX` if performance degrades after high churn (rebuilds the graph).
- Build the index AFTER bulk loading, not before — building against an
  empty/small table then bulk-inserting is slower than loading first.

## Common symptom → cause → fix

| Symptom | Cause | Fix |
|---|---|---|
| Query doesn't use the ANN index | Missing `ORDER BY`+`LIMIT`, operator/ops-class mismatch, or missing explicit cast | Match operator to ops class; cast the query vector explicitly |
| Fewer results than `LIMIT` (filtered query) | HNSW stopped early due to the filter | Iterative scan, raise `max_scan_tuples`, or prefilter/partition per the table above |
| High latency, low CPU | Index no longer resident in memory | `halfvec`, lower `m`/`ef_construction`, add RAM, partition, or binary-quantize |
| Zero/missing results | NULL or zero-vector rows | Never store NULL embeddings; zero vectors break cosine distance |

## Boundaries

General relational schema design, migrations, and non-vector Postgres
work: impulse-backend's stores files (add a `stores-postgres.md` there
if a project needs general Postgres guidance beyond vectors — this file
is vector-search-specific, not a general Postgres reference). Qdrant's own
collection design, multitenancy, and quantization: `qdrant.md` — this file
exists precisely for the case where reaching for Qdrant would be the
overengineered choice.
