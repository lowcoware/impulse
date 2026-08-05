# Store: MongoDB — document store

One of six blessed non-core stores (see `deps.md`). `arch:` compounds
silently over months; `bug:` is catchable in a single diff. Platform
primitive over app code, name the ceiling, cite real incidents.

**Use when** documents are the natural unit of access — read/written
whole, polymorphic shape *at write time*, no cross-document transaction
needs (event payloads, CMS content, catalogs with variable per-item
attributes). **Not when** the data is fundamentally relational with a few
flexible fields — that's Postgres + JSONB. Joining across collections via
`$lookup` more than occasionally means a relational problem got modeled
as documents; go back to Postgres.

**arch:**

1. **No `$jsonSchema` validator on the collection.** Different service
   versions write incompatible shapes (`email` vs `user_email`, int vs
   string) into the same collection — nobody can answer "what fields
   exist" without sampling docs. *Fix:* `$jsonSchema` validator
   (`validationLevel: "moderate"` during migration, `"strict"` once
   stable) + a `schemaVersion` field the app branches on.
2. **`$lookup` without a preceding `$match`.** Full collection scan
   before every join, cost scales with total collection size, not result
   size. *Fix:* filter-then-join — `$match` on an indexed field first,
   `$lookup` after.
3. **Unbounded embedded array ("Massive Arrays" anti-pattern).** Every
   `$push` rewrites the whole document, array indexes bloat, document
   eventually hits the 16MB hard limit and inserts start failing. *Fix:*
   Bucket Pattern (fixed-size sub-documents per time window) for
   time-series-like growth, or Outlier Pattern + separate collection for
   the rare oversized doc.
4. **`$lookup`-heavy aggregations used as a relational join engine.**
   Pipelines become unreadable and un-indexable end to end. *Fix:* >1-2
   regular join hops is a signal that data belongs in Postgres.

**bug:**

1. `Find()` with no `Limit`/no pagination cursor → OOM or unbounded
   response as the collection grows past what fit at launch. *Fix:*
   `SetLimit(n)` + cursor-based pagination, always.
2. New query filters on a field with no supporting index → silent
   `COLLSCAN`, fine in dev, times out at prod scale. *Fix:* require
   `explain()` or an index migration alongside any new query shape.
3. Raw `$push` with no `$slice`/cap on a hot array field → unbounded
   growth toward the 16MB limit. *Fix:*
   `$push: {arr: {$each: [x], $slice: -N}}` or move to a separate
   collection.
4. Multi-document write assumed atomic with no session/transaction →
   partial writes on crash leave cross-document invariants broken (e.g.
   balance debited, ledger entry missing). *Fix:*
   `session.WithTransaction` (replica set required), or redesign as a
   single-document write.
5. Query built from raw user input (`bson.M{"$where": userString}`, or a
   raw user-supplied object where a scalar is expected) → NoSQL/operator
   injection, e.g. `{"password": {"$ne": null}}`. *Fix:* bind user input
   into typed structs before building `bson.M`; never accept raw
   operator maps from clients.

**Incidents:**
Habr, "Ошибки выбора MongoDB в качестве основной БД в стартапе" (2022) —
no schema enforcement let devs write inconsistent field names/types into
the same collection, forced eventual migration to Postgres.
[habr.com/ru/articles/692736](https://habr.com/ru/articles/692736/)
updown.io postmortem — primary Mongo latency degraded ~200x under load,
secondary failures compounded by unrelated memory pressure, near-total
outage.
[medium.com/@adrienjarthon/updown-io-incident-postmortem](https://medium.com/@adrienjarthon/updown-io-incident-postmortem-f4707cd20091)

Docs: [`$jsonSchema` validation](https://www.mongodb.com/docs/manual/core/schema-validation/) ·
[schema versioning pattern](https://medium.com/mongodb/using-mongodb-schema-validation-with-the-schema-versioning-pattern-f51ce63ff376) ·
[`$lookup` reference](https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/) ·
[Outlier Pattern / Massive Arrays](https://www.mongodb.com/docs/v7.0/data-modeling/design-patterns/group-data/outlier-pattern/) ·
[16MB document limit](https://www.mongodb.com/docs/manual/reference/limits/)
