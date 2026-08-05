# Observability — wiring the stack the baseline requires

`baseline.md` mandates `/metrics` + structured JSON logs day-one. This file
is how you actually wire the stack around them so a service isn't shipping a
metrics endpoint nobody scrapes. Compose-scale (not k8s), Traefik edge.
Blessed stack: Prometheus, Grafana, Loki + Promtail, Alertmanager, Sentry.

## Prometheus

1. No k8s-style service discovery in plain Compose — `static_configs:
   targets: ["service:port"]` using Compose service names as DNS (containers
   share the network). `dockerswarm_sd_configs` only works under Swarm, not
   `docker compose up`.
2. Exposition: Go — `promauto.NewCounter/Histogram` + `promhttp.Handler()`
   on `/metrics`; Python/FastAPI — `prometheus-fastapi-instrumentator`
   (`Instrumentator().instrument(app).expose(app)`), ships
   `http_request_duration_seconds{handler}` with few buckets on purpose.
3. Expose the 4 golden signals (latency, traffic, errors, saturation) — not
   hundreds of vanity metrics.
4. **Cardinality is a Prometheus footgun too, not just Loki's.** Series =
   (buckets+3) × label-value-combos; a `user_id`/`request_id`/raw-path/
   `pod_id` label is unbounded and blows up the head block (~3-4KB RAM per
   active series). Documented incident: a `pod_id` label added 150K
   series/hr, RAM 8→32GB in a week, Prometheus OOMKilled *during* an
   incident — killing alerting exactly when it was needed. High-cardinality
   dimensions go in logs/traces, never metric labels.
5. Recording rules precompute expensive/repeated PromQL (dashboard queries
   hitting the same expr every refresh). Name `level:metric:operation`.
6. Sizing: default 15-day retention; disk ≈ `retention_s × samples/s × ~2
   bytes`. Local TSDB handles ~10M active series — a handful of Compose
   services is nowhere near it. Thanos/Mimir is explicit overkill below
   multi-cluster / multi-tenant / dedicated-SRE scale — don't add it
   speculatively (ladder).

## Grafana

1. Provision as code: `provisioning/datasources/*.yaml` +
   `provisioning/dashboards/*.yaml` pointing at JSON on disk, loaded at
   startup. Clicked-in-by-hand dashboards are the config-drift arch-smell
   (`ai-bug-patterns-be.md`) in visual form.
2. `allowUiUpdates: true` is a trap: UI edits persist to Grafana's DB, then
   get silently clobbered on the next provisioning reload — live diverges
   from git until overwritten.
3. Dashboard sprawl: only a few dashboards get opened during a real
   incident; the rest is unowned "just in case" cruft that slows MTTR.
   Fewer, owned dashboards beat a wall of them.

## Loki + Promtail

1. **THE Loki footgun: label cardinality.** High-cardinality values
   (`user_id`, `request_id`, `trace_id`) as Loki *labels* destroy it — each
   distinct label-value combo is a separate stream with its own index +
   chunks. Grafana's own docs cite a real blowup: a `requestId` label hit
   24,653 distinct values across 24,979 streams — nearly every stream unique,
   defeating indexing entirely; ingesters then OOM-loop, and raising the
   stream limit only makes it flush more tiny chunks (don't). Labels are
   low-cardinality routing dimensions only (service, env, level) — keep to
   tens of values.
2. High-cardinality fields you still need to *search* (customer id, txn id)
   go in the log line (`| json | field="x"` at query time) or in **structured
   metadata** (Loki 2.9+, TSDB schema) — stored per line, not indexed.
   Never promote them to labels.
3. Promtail scrapes Compose containers, parses JSON logs; set retention to
   match Prometheus so the two signals cover the same window.
4. LogQL: filter on stream labels first, then `| json`, then field — order
   matters for performance (`{job="orders"} | json | correlation_id="xyz"`).

## Alertmanager

1. One routing tree, one source of truth: Prometheus rules fire alerts,
   Alertmanager routes/groups/dedups/inhibits. It's pure YAML (no DB,
   GitOps-friendly).
2. Group + dedup to avoid alert storms; inhibition suppresses downstream
   alerts when a parent cause already fired.
3. Alert fatigue is the failure mode — an alert that fires and gets ignored
   is worse than none. Page-worthy (user-facing, needs a human now) vs
   dashboard-worthy (investigate later) is the line; most things are the
   latter.
4. Don't run two parallel routing trees (Grafana Unified Alerting AND
   Alertmanager) — point Grafana at the same Alertmanager as a notifier.
5. When an error-rate SLO exists, alert on BURN RATE with two windows
   (Google SRE math), not raw error %: fast burn 14.4x over 1h (checked
   with a 5m sub-window) = page — eats 2% of monthly budget per hour;
   slow burn 6x over 6h (+30m sub-window) = warn. Kills both flavors of
   bad alert: too-twitchy (blip pages) and too-numb (slow leak never
   fires).

## Sentry

1. Wire it: Go/Gin — `sentrygin` middleware (Fiber: `sentryfiber`), registered *before* others
   or the Hub isn't available to them; `defer sentry.Flush(2*time.Second)`.
   Python/FastAPI — `sentry_sdk.init` with `StarletteIntegration` +
   `FastApiIntegration`.
2. DSN is a *public* write-only key, not a secret — but still env-var it
   (`SENTRY_DSN`), never hardcode, for per-env DSNs and rotation hygiene.
3. **PII in stack traces is the real risk.** Dynamic-language traces capture
   local variable values at exception time — unredacted passwords/tokens/
   session IDs routinely land in captured request bodies/headers/locals.
   `send_default_pii=False` is the default; use `before_send` to scrub
   app-specific sensitive fields before the event leaves the process
   ("never send data you can't retract").
4. `traces_sample_rate=1.0` is fine at low traffic, explicitly needs
   reduction under load (errors aren't sampled by it — separate from
   transaction/span sampling). Set `release` (or `SENTRY_RELEASE`) for
   deploy tracking.

## Diagnosing "it's slow" — the USE Method

When latency/throughput looks wrong and the cause isn't obvious from the
correlation story below, don't guess at a cause — walk each resource
(CPU, memory, disk I/O, network) through three questions systematically
before concluding anything (Brendan Gregg's USE Method, general-purpose,
not tied to any specific datastore):

- **Utilization** — how busy is it, as a percentage of capacity, over the
  window that matters?
- **Saturation** — is work queued waiting for this resource (run queue
  length, swap activity, disk queue depth)? A resource can be under 100%
  utilized and still be the bottleneck if queueing is happening.
- **Errors** — is the resource throwing errors (retransmits, ECC errors,
  dropped packets) that themselves cost time independent of utilization?

Checking all three for each resource, in order, before forming a
hypothesis, catches classes of bug that jumping straight to "must be the
database" misses — a saturated but low-utilization disk queue, or a
network interface silently retransmitting, look nothing like a CPU
bottleneck but cost the same p99 regression.

### Two Postgres diagnostics worth having memorized

Detection-grep style, same spirit as security-checklist.md's checks —
mechanical, copy-pasteable, catch a common real bug class before it's a
production incident:

```sql
-- Unindexed foreign keys (a real FK join with no supporting index)
SELECT c.conname, c.conrelid::regclass AS table_name, a.attname AS column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
  );

-- Slowest queries by mean execution time (requires pg_stat_statements)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;
```

## The correlation story — connect the three signals

`correlation_id`/`trace_id` (baseline requires propagating them) is what
links a log line to a trace to a metric spike. Flow: structured JSON log
carries the id → Loki queryable via `| json | correlation_id=` → Grafana
derived fields regex-extract a trace id from the log and render a clickable
link into Tempo/Jaeger (configure BOTH Loki→Tempo and Tempo→Loki or one
direction silently fails).

**OpenTelemetry — anti-overengineering call.** For a handful of Compose
services with shallow (1-2 hop) fan-out, a `correlation_id`/`trace_id`
string propagated through structured logs + Loki `| json` filtering is
sufficient and near-zero-cost. Justify a full OTel collector + Tempo
backend + auto-instrumentation only when request fan-out is 3+ services
deep AND cross-service latency attribution (not just "which service
errored") becomes a recurring debugging need — the collector/backend cost
is real, don't pay it speculatively. Same threshold logic as the
sync-call-chain `arch:` finding. Once justified: `otel-collector.md` for
the config authoring/debugging footguns.

## Scope note

This file covers observability wiring specifically — the "how" behind the
baseline's /metrics+logs requirement. Compose multi-env layout, Traefik
cert automation, and GitHub Actions CI are separate deploy concerns; they'd
justify a dedicated devops skill only if that breadth is actually wanted,
not a reason to bloat this file.
