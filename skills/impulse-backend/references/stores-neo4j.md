# Store: Neo4j — routing, trust graphs, APOC/GDS

One of six blessed non-core stores (see `deps.md`). `arch:` compounds
silently over months; `bug:` is catchable in a single diff. Platform
primitive over app code, name the ceiling, cite real incidents.

**Use when** hop-depth is unbounded/data-dependent or weighted pathfinding
is required (Dijkstra/A*, GDS algorithms). **Not when** depth is fixed and
shallow (2-3 hops) — a recursive CTE is enough; having FKs is not
justification for a graph DB.

**arch:**

1. **Unsized GDS graph projection.** `gds.graph.project` loads the whole
   node/rel set into an in-memory catalog separate from DB heap; grows
   unbounded regardless of `dbms.memory.*` settings — a 120GB-RAM pod has
   OOM'd at ~40GB because GDS heap defaults to 25% of system memory and
   doesn't auto-scale. *Fix:* run `gds.graph.project.estimate` first,
   set `heap.initial_size = heap.max_size` explicitly, `gds.graph.drop`
   after use.
2. **Unbounded variable-length Cypher in production code** (`[*]`/`[*..]`
   with no ceiling). Path count grows exponentially with graph size —
   fine on a small dev graph, times out/OOMs at scale. *Fix:* always
   bound hops (`[*1..4]`), narrow with labels/direction.
3. **Postgres as source of truth, Neo4j as a derived graph with no sync
   contract.** Dual-write drift on the trust graph, silent divergence, no
   outbox/CDC. *Fix:* single writer path (CDC/outbox Postgres→Neo4j),
   reconciliation job; Neo4j is a read-optimized index, not a second
   source of truth.
4. **`apoc.periodic.iterate` driven by full node objects instead of
   ids.** The parent tx tracks every touched node/rel in memory — heap
   blowup on large batch jobs. *Fix:* return `elementId()`, small
   `batchSize`, or Cypher 5 `CALL {} IN TRANSACTIONS` for simple batch
   writes instead of APOC.

**bug:**

1. Missing `defer session.Close(ctx)` → connection pool exhaustion under
   load. *Fix:* close immediately after `NewSession`, never persist
   sessions across requests.
2. Raw `session.Run` for writes instead of `ExecuteWrite`/`ExecuteRead` →
   no automatic retry on transient cluster errors (leader switch), no
   causal-consistency guarantee. *Fix:* always use the managed-transaction
   functions.
3. `fmt.Sprintf`/string-concat building Cypher with user input → Cypher
   injection (OWASP ASVS 5.3.4 names it explicitly), also defeats
   query-plan caching. *Fix:* parameterize (`$id`) everywhere, including
   inside `apoc.cypher.run`.
4. App-side loop calling `session.Run` once per item → N+1 round trips.
   *Fix:* `UNWIND $ids AS id MATCH ...` in one query.
5. An unbounded `-[*]-`/`-[:REL*]-` slipped into a "make it work" diff —
   same failure as arch:2 but at line-review granularity. *Fix:* explicit
   upper bound, or GDS `bfs`/`shortestPath` for large-scale traversal.

**Incidents:**
GDS OOM on a 120GB-RAM host, crashed at ~40GB used, because GDS heap
defaults to 25% of system RAM with no auto-scale.
[community.neo4j.com/t/...71262](https://community.neo4j.com/t/gds-runs-in-heap-and-heap-is-by-default-set-to-25-of-system-memory-leading-to-oom-quickly-way-to-make-it-dynamically-more/71262)
Habr migration postmortem: idle RAM went 70MB (Postgres)→700MB, spiked to
6GB on a 1,300-entity fetch (23s vs seconds in Postgres); partial node
updates silently dropped unlisted nested properties.
[habr.com/ru/articles/755682](https://habr.com/ru/articles/755682/)

Docs: [GDS memory estimation](https://neo4j.com/docs/graph-data-science/current/common-usage/memory-estimation/) ·
[variable-length paths](https://neo4j.com/docs/cypher-manual/current/patterns/variable-length-paths/) ·
[Go driver transactions](https://neo4j.com/docs/go-manual/current/transactions/) ·
[apoc.periodic.iterate memory](https://neo4j.com/developer/kb/how-does-apoc-periodic-iterate-work-with-resources/) ·
[OWASP ASVS Cypher injection](https://github.com/OWASP/ASVS/issues/1824)
