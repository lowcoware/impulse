# Search — Postgres FTS first, RU-aware

## The ladder

1. **Postgres FTS** — default. Zero new infra, transactional with source
   data, GIN-indexed FTS scales to millions of rows. Row count is NOT the
   escalation trigger — UX is.
2. **Meilisearch/Typesense** — only when a concrete wall hits: typo
   tolerance (PG FTS is exact-lexeme — structural, not a config gap),
   search-as-you-type latency, faceted UX, relevance tuning beyond ts_rank.
   Real cost: one more service to run/monitor/back up/sync.
3. **Elasticsearch** — no at this scale. Cluster/JVM/shard ops dwarf the win
   vs Meilisearch.

`impulse:` marker shape: `-- impulse: PG FTS, move to Meilisearch when typo-search
becomes a product requirement`.

## Postgres FTS craft

1. **Stored generated column, not per-query compute:**
   ```sql
   ALTER TABLE t ADD COLUMN search_vector tsvector
     GENERATED ALWAYS AS (
       setweight(to_tsvector('russian', coalesce(title,'')), 'A') ||
       setweight(to_tsvector('russian', coalesce(body,'')),  'B')
     ) STORED;
   CREATE INDEX ON t USING GIN (search_vector);
   ```
   `setweight` A/B/C/D = title beats body in ranking naturally.
2. **`websearch_to_tsquery` for user input** — never throws on garbage,
   supports `"phrase"` / `-exclude` / `OR`. `to_tsquery` raises syntax
   errors on most real user input — internal DSL only.
3. Rank: `ORDER BY ts_rank_cd(search_vector, query) DESC` (cover-density
   rewards term proximity). Highlight: `ts_headline` — don't hand-roll.

## Russian specifics

1. `'russian'` config = Snowball stemmer — algorithmic suffix-stripping,
   good enough for product/blog search. Real morphology → chain hunspell:
   `ru_RU` ispell dictionary first, `russian_stem` as catch-all (ispell
   vocabulary is finite — must chain).
2. **ё/е don't match** (`ёлка` ≠ `елка`) — known unfixed PG behavior.
   Normalize `translate(text,'ё','е')` at BOTH write and query time.
3. Mixed RU/EN: single `'russian'` config tokenizes Latin words but won't
   stem them. Real bilingual corpus → per-row `ts_config` column or parallel
   tsvector columns OR-ed. No clean built-in.
4. Typo tolerance for RU: pg_trgm layer, not a "better config". Note 2026
   state: Typesense RU stemming is broken (manual dictionaries only),
   Meilisearch RU is outside its optimized tier — for RU relevance, PG FTS
   + ispell often BEATS both dedicated engines. Check before escalating.

## pg_trgm — fuzzy/substring

1. For short strings: usernames, SKUs, product names, typo lookups.
   `CREATE INDEX ON t USING GIN (name gin_trgm_ops);` → `%` operator /
   `ORDER BY name <-> $1`. Turns `ILIKE '%x%'` from seq-scan into indexed.
2. Zero semantics (no stemming/stopwords) — never a tsvector replacement
   for prose. Combine: FTS for body relevance, trgm as zero-results
   fallback or for short-string fields.

## Sync to a dedicated engine (if escalated)

App-level dual-write is simplest and drifts on partial failure — accept it
WITH a periodic reconciliation job, or go CDC (Debezium WAL→engine) and pay
the ops. At this scale: dual-write + nightly reconcile. Postgres stays
source of truth — engine is a rebuildable projection (Tier 3 in
`impulse-devops/references/backup.md` — reindex, don't restore).

## Hybrid with Qdrant (RAG lane, not app-search lane)

Different problem: user-facing search UI = this file; semantic retrieval
for LLM context = `impulse-ai/references/rag.md`. Qdrant Query API: sparse (BM25) + dense
prefetch, fuse with **RRF** (rank-based — BM25 and cosine scores live on
incompatible scales, weighted-sum alpha is fragile). Hybrid wins when
queries mix exact tokens (IDs, codes, rare nouns) with paraphrase.

## Review catches (`bug:`)

1. `ILIKE '%q%'` on a large table shipped as "search" — seq scan every
   query. → FTS or trgm index.
2. `to_tsvector(...)` inline per query instead of stored column.
3. Search results `ORDER BY id`/`created_at` — no relevance signal.
4. Raw user input into `to_tsquery($1)` — syntax error on most real input.
   → `websearch_to_tsquery`.

Sources: postgresql.org/docs textsearch-*/pgtrgm, Qdrant hybrid-queries
docs, typesense#1665 (RU stemming), meilisearch#612, pganalyze GIN guide.
External confirmation of this file's own ladder framing (row-count is not
the trigger, UX is): field consensus independently lands on the same shape
— most search-bar-over-your-own-data apps never reach the point where a
dedicated engine is necessary, and starting with Postgres FTS + migrating
later is lower-risk than starting with Elasticsearch.
[Supabase: Postgres full-text search vs the rest](https://supabase.com/blog/postgres-full-text-search-vs-the-rest)
