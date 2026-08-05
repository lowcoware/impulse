# RAG pipelines — chunking, retrieval, embedding hygiene

## Vector store choice — before any of the below

Don't default to standing up Qdrant for every RAG feature. If the project
already runs Postgres and the corpus is small-to-medium (low millions of
vectors or fewer), pgvector avoids a second stateful service entirely —
detail and golden-path config: `pgvector.md`. Qdrant earns its place at
real scale or real multitenancy/filtering needs (`qdrant.md`), same ladder
discipline as skipping a speculative eval harness below.

## Chunking

1. Default: 256-512 token chunks, 10-20% overlap, via a **structure-aware**
   splitter — headers/tables/code blocks as atomic units, ancestor-header
   metadata attached to each chunk. Naive fixed-size splitting on
   Markdown/code silently degrades retrieval quality (splits mid-table,
   mid-function).
2. Don't default to semantic (embedding-similarity) chunking — variable
   output size and threshold-tuning cost rarely beat cheap recursive
   splitting for the effort. A 2026 cross-paper benchmark confirms this
   isn't just a cost call: recursive 512-token splitting scored 69%
   end-to-end accuracy vs. semantic chunking's 54%, despite semantic
   chunking winning on raw retrieval recall (91.9% vs. lower) — semantic
   chunks are topic-pure but too small to carry the context the LLM needs
   to actually answer, and the approach runs ~14x slower to build. Chunk
   overlap specifically was found to add indexing cost with no measurable
   retrieval benefit in a separate SPLADE-based analysis — don't treat
   "add overlap" as a free quality lever. Add hybrid BM25+embedding
   retrieval before upgrading chunking strategy; it's usually the
   higher-leverage fix, confirmed below.
   [Denser: RAG chunking strategies 2026, 8-method comparison](https://denser.ai/blog/rag-chunking-strategies/)
3. **Contextual retrieval**: prepend chunk-specific context before
   embedding, for chunks with implicit references ("it" needing the
   preceding paragraph to resolve). Anthropic reports ~35-67%
   retrieval-failure reduction from this alone — cheap relative to the
   payoff, do it before reaching for a bigger model or a rerank step.

## Hybrid + rerank — the measured payoff

Concrete numbers behind "add hybrid before upgrading chunking": one
production benchmark chain — BM25 alone 58% → hybrid (BM25 + dense + RRF)
79% → + cross-encoder rerank 91%. A second study found hybrid+rerank a
+17.4% relative Recall@5 gain over hybrid-alone, +39% over dense-only.
Counter-intuitive but repeatedly confirmed: BM25 alone beats dense-only
retrieval with a strong commercial embedding model on several metrics,
especially in domains with exact-term significance (financial/legal docs,
codes, IDs) — hybrid isn't a nice-to-have, it's the minimum viable
baseline for any RAG deployment, not an upgrade path. Fuse by **RRF**
(rank-based), never a weighted sum of raw scores — BM25's unbounded
positive integers and cosine's [-1,1] range aren't comparable, and a naive
sum silently lets BM25 dominate.
[AppScale: hybrid search and reranking in production RAG 2026](https://appscale.blog/en/blog/hybrid-search-and-reranking-production-rag-bm25-dense-cross-encoder-2026)

## Embedding model selection — don't trust the leaderboard alone

MTEB/BEIR rank models, but Recall@10 on those benchmarks does not reliably
transfer to your own domain — decide with 300-500 labeled query-passage
pairs from your OWN traffic, not the leaderboard position. Separate
caveat: models trained after 2023 may have seen BEIR's own corpora during
training, which inflates their apparent BEIR score specifically (benchmark
contamination, not real generalization). Dimension/quantization tradeoff:
768-1024 dims is the sweet spot for most RAG; Matryoshka Representation
Learning gets to 256 dims for ~2-3% precision loss and a 4x storage cut —
worth trying before assuming a smaller model is the only path to lower
cost.
[FutureAGI: evaluating embedding models in 2026](https://futureagi.com/blog/evaluating-embedding-models-2026/)

## Long context vs. RAG — the 2026 hybrid default, not a replacement

RAG usage grew ~400% 2024→2026 despite repeated "RAG is dead" predictions
from long-context models — the 2026 data doesn't support retiring it.
Long context wins specifically when the corpus is under ~200K tokens,
relatively stable, and the query needs reasoning across the WHOLE corpus
rather than retrieving a specific fact. It stops being viable long before
the advertised window fills: frontier models show 30-50% accuracy drops
well inside their documented limits (the lost-in-the-middle/context-rot
effects already cited in `shared/velocity.md`). RAG stays essential when
the corpus exceeds any context window outright, or the data changes
frequently enough that incremental re-indexing beats reloading everything.
The converged 2026 pattern for large, stable corpora: retrieve 50-200K
relevant tokens via RAG, THEN long-context-reason over that retrieved set —
hybrid, not either/or.
[Wire Blog: long context vs RAG, what the 2026 data shows](https://usewire.io/blog/long-context-vs-rag-what-the-data-shows/)

## Retrieval evaluation — minimum viable, not RAGAS

1. 30-50 golden queries with expected chunk IDs, run as a regression suite
   on every retrieval-affecting change. Block merges if `recall@5 < 0.7`.
2. No multi-metric eval harness (RAGAS-style) until sampling real
   production traffic — building one speculatively is the ladder's
   YAGNI-skip rung applied to eval tooling.
3. Faithfulness/groundedness: reference-free LLM-as-judge, target >0.8, as
   the pragmatic small-team substitute for a human-labeled dataset.

## Embedding service hygiene

1. **Batch by token-count budget**, not fixed request count — sort/group
   by length to cut padding waste. Documented 5-10x throughput gain from
   this alone with sentence-transformers.
2. **Never compare vectors across model versions.** Identical text embedded
   by v1 vs. v2 is not comparable even at equal dimension — tag every
   collection/cache-key with model id+version
   (`docs_v2_minilm-l6-384`), never a bare model name.
3. Any embedding-model or dimension swap = full re-embed with an atomic
   rollback path, never a live mutation with no fallback. Pre-v1.18
   Qdrant (or unnamed vectors): new collection + alias swap, per
   `qdrant.md`'s migration section. v1.18+ named vectors: add the new
   field to the existing collection and swap fields after verification —
   same safety property, different mechanism; see `qdrant.md` for the
   version-gated procedure, don't default to the old alias-only path.
4. Cache key includes model version AND chunking version, not just a text
   hash — invalidate on document-update events, TTL only as backstop.

## AI-typical code bugs specific to this domain

Cross-reference `impulse-review/references/ai-bug-patterns-be.md` — these are
new `bug:`-caliber findings this file adds:

- **Missing L2 normalization before cosine similarity** — silently biases
  ranking toward longer/denser text. Check before any `dot()`/cosine call
  on raw embeddings.
- **Blocking sync embedding-API calls inside `async def` routes** — same
  event-loop-stall pattern as `impulse-backend/references/hardening-python.md`,
  specifically common in embedding-service glue code that wraps a sync SDK.
- **Retries on embedding-API rate limits with no backoff/jitter, or
  ignoring `Retry-After`** — same resilience rule as
  `impulse-backend/references/events.md`, applied to LLM/embedding provider
  calls specifically.
- **Never log full embedding vectors** — log query text, chunk IDs, and
  scores only; a logged 384-dim float array is pure noise and a
  data-volume/cost problem in the log pipeline.
