# Store: PostGIS — ST_DWithin, bbox, routes

One of six blessed non-core stores (see `deps.md`). `arch:` compounds
silently over months; `bug:` is catchable in a single diff. Platform
primitive over app code, name the ceiling, cite real incidents.

**Use when** geo data lives alongside relational data you already need
transactions/joins over (routes, POIs, radius search bolted onto an
existing Postgres app). **Not when** you need dedicated road-network
routing at scale, tile-rendering pipelines, or heavy raster analysis —
reach for pgRouting/OSRM or a dedicated GIS engine.

**arch:**

1. **`geometry(Point,4326)` used for distance/radius math.**
   `ST_Distance`/`ST_DWithin` return degrees, not meters — radius filters
   are silently wrong at any latitude away from the equator. *Fix:* use
   `geography` type for lat/lng distance, or cast (`geom::geography`) at
   query time.
2. **No GiST index on the geometry column.** Fine on dev-sized data, seq
   scan in prod once the route/POI table outgrows cache. *Fix:*
   `CREATE INDEX ... USING GIST(geom)` in the same migration that adds
   the column.
3. **Dual source of truth — geometry column + raw lat/lng floats updated
   separately.** Drift between the two; bbox/route logic reads whichever
   path wrote last. *Fix:* one source column, derive the other via a
   generated column/trigger.
4. **`ST_SetSRID` used to "fix" ingested route data with unknown/wrong
   CRS.** Mislabels wrong coordinates as correct — corrupts every
   downstream join/distance with no error, until someone cross-checks
   against a map. *Fix:* verify source CRS at ingestion; `ST_Transform`
   reprojects, `ST_SetSRID` only labels — never substitute one for the
   other. This is the #1 PostGIS production bug.

**bug:**

1. `ST_SetSRID(geom, 4326)` where `ST_Transform` was needed → coordinates
   unchanged, SRID label now lies, distance/area silently wrong. *Fix:*
   `ST_Transform(geom, target_srid)` whenever source SRID ≠ target SRID.
2. Literal point built without an SRID compared against an SRID-4326
   indexed column → "mixed SRID" error, or an implicit cast that bypasses
   the index into a seq scan. *Fix:* always
   `ST_SetSRID(ST_MakePoint(lng,lat), 4326)` matching the column's SRID.
3. `WHERE ST_Distance(a,b) < radius` in a hot path → not sargable,
   computes distance for every row before filtering, GiST index unused.
   *Fix:* `ST_DWithin(a,b,radius)` — logically identical, index-accelerated.
4. New geometry column merged with no GiST index in the same PR → passes
   review on small fixture data, query plan flips to seq scan under load.
   *Fix:* index ships with the column, not as a follow-up ticket.
5. `geometry(4326)` column, radius param in meters passed straight into
   `ST_DWithin` → unit mismatch (degrees vs meters), radius silently
   ~100x off. *Fix:* cast to `geography` or transform to a metric SRID
   before comparing.

**Incidents:**
Habr Q&A — `ST_DWithin` radius query returned wrong points; root cause
was a point literal built without an SRID matched against the geometry
column. Fixed by wrapping the literal with
`ST_GeomFromText('POINT(...)', 4326)`.
[qna.habr.com/q/317268](https://qna.habr.com/q/317268)
Habr — production `TopologyException` traced not to the queried rows but
to invalid geometries elsewhere in the same spatially-indexed base table;
fixed with `ST_MakeValid`.
[habr.com/ru/articles/517784](https://habr.com/ru/articles/517784/)

Docs: [ST_DWithin over ST_Distance](https://postgis.net/documentation/tips/st-dwithin/) ·
[ST_SetSRID vs ST_Transform](https://postgis.net/documentation/tips/st-set-or-transform/) ·
[geometry vs geography](https://postgis.net/documentation/faq/geometry-or-geography/) ·
[spatial indexing intro](https://postgis.net/workshops/postgis-intro/indexing.html)
