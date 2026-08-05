# Store: ClickHouse — telemetry, aggregates, heatmaps

One of six blessed non-core stores (see `deps.md`). Format follows
`impulse-review`'s `arch:`/`bug:` split — `arch:` compounds silently over
months, `bug:` is catchable in a single diff. Platform primitive over app
code, name the ceiling, cite real incidents.

**Use when** append-mostly analytical scans at >10M rows need sub-second
P95 (telemetry, rollups, heatmaps). **Not when** the query is a point
lookup, a single-row mutation, or needs FK integrity / read-after-write
consistency — that's Postgres.

**arch:**

1. **Treating `ALTER TABLE ... UPDATE/DELETE` as a point op.** It's an
   async, heavyweight mutation that rewrites the *whole part* — 1 row
   changed in a 100GB part rewrites 100GB, queues up, isn't atomic on
   interruption. *Fix:* lightweight `DELETE FROM` (marks `_row_exists`,
   22.8+) or model changes as `ReplacingMergeTree`/`CollapsingMergeTree`
   inserts. Some shops just revoke UPDATE/DELETE grants outright.
2. **High-cardinality `PARTITION BY`** (e.g. `user_id`, `request_id`).
   Millions of partitions, merges can't cross partitions, parts pile up
   until `TOO_MANY_PARTS` throttles inserts cluster-wide. `ORDER BY`/
   `PARTITION BY` are fixed at `CREATE TABLE` — changing later means a
   full rewrite. *Fix:* partition by low-cardinality date/month
   (<1000 partitions); put high-cardinality columns in `ORDER BY`.
3. **Small-insert storms** — one row per `INSERT`. Each insert is a new
   part; part count outpaces background merges → `TOO_MANY_PARTS`,
   ingestion stalls. *Fix:* batch client-side (10K-1M rows/insert) or
   `async_insert=1, wait_for_async_insert=1` server-side buffering.
4. **`FINAL` as a correctness crutch on `ReplacingMergeTree`.** Dedup is
   merge-driven, not synchronous; `FINAL` "fixes" duplicate reads but
   adds 21-550% query overhead and moves merge cost into the hot path.
   *Fix:* `-Merge`/`argMax` aggregation on read, or a materialized-view
   rollup; reserve `FINAL` for small/rarely-queried tables.
5. **Mutable column inside `ORDER BY`** on a `ReplacingMergeTree`. Dedup
   keys off the sort key — if that column changes value, the engine sees
   a new logical row and the old one never collapses. *Fix:* keep
   `ORDER BY` columns immutable per entity; put mutable state outside it.

**bug:**

1. `conn.Exec(INSERT...)` per event inside a loop → one part per row,
   triggers the too-many-parts footgun. *Fix:* `PrepareBatch` +
   `AppendStruct` in the loop, one `Send()` outside it.
2. Code gates on a mutation being "applied" right after
   `ALTER TABLE ... UPDATE/DELETE` returns → statement returns
   immediately, mutation is queued async, read-your-write fails silently.
   *Fix:* don't depend on mutation completion in the hot path.
3. Reusing a `driver.Batch` after `Send()` inside a retry loop → batch is
   finalized, further appends panic/error. *Fix:* fresh `PrepareBatch`
   per attempt.
4. Swallowed `batch.AppendStruct()` error, or a whole-batch retry with no
   dedup token → one bad row aborts silently, or a retry duplicates
   already-sent rows. *Fix:* check every append error; use
   `async_insert_deduplicate` or an idempotent insert id on retry.
5. Reading a `ReplacingMergeTree` table for immediate post-insert counts
   (e.g. unique-visitor heatmap) → under/overcounts until the next
   background merge, no guaranteed timing. *Fix:* `-State`/`-Merge`
   materialized view, not merge-time dedup, for anything correctness-sensitive.

**Incidents:**
Trigger.dev (Nov 2025) hit intermittent OTel-ingest failures — partition
key + late-arriving events created thousands of tiny parts, breaching the
3000-part ceiling; fixed by redesigning the partition key and blocking
late writes to old partitions.
[trigger.dev/blog/clickhouse-too-many-parts-postmortem](https://trigger.dev/blog/clickhouse-too-many-parts-postmortem)
Cloudflare's billing pipeline changed partition scheme from `(day)` to
`(namespace, day)`, parts grew 10x, query planner took an exclusive mutex
per query over the full parts list → severe lock contention.
[blog.cloudflare.com/clickhouse-query-plan-contention](https://blog.cloudflare.com/clickhouse-query-plan-contention/)

Docs: [mutations](https://clickhouse.com/docs/guides/developer/mutations) ·
[partitioning key](https://clickhouse.com/docs/optimize/partitioning-key) ·
[too-many-parts](https://clickhouse.com/docs/tips-and-tricks/too-many-parts) ·
[async inserts](https://clickhouse.com/docs/optimize/asynchronous-inserts) ·
[MV rollup pattern](https://clickhouse.com/docs/knowledgebase/materialized-view-rollup-timeseries) ·
[Altinity: choosing ORDER BY/PARTITION BY](https://kb.altinity.com/engines/mergetree-table-engine-family/pick-keys/)
