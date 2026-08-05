# OpenTelemetry Collector — when the threshold in observability.md is crossed

`observability.md` gates a full OTel Collector + Tempo backend behind a
real threshold (3+ service hops deep AND cross-service latency
attribution is a recurring need) — don't reach for this file speculatively.
Once that threshold is actually crossed, these are the specific footguns
that make the difference between a config that validates and one that
silently does nothing.

## The #1 mistake

Defining a component under `receivers:`/`processors:`/`exporters:` does
**nothing** on its own — it only runs if referenced inside
`service.pipelines.<signal>`. A config can be "valid" and do nothing
because a pipeline was never wired. Check the `service` block last; confirm
every defined component is referenced, and every referenced name is
defined (undefined references fail validation).

## core vs contrib — crash, not a YAML error

Many common components ship **only** in `otelcol-contrib`, not core
`otelcol`: `prometheus` receiver, `hostmetrics`, `filelog`, `kafka`,
`resourcedetection`, `transform`/`filter` (OTTL), `tail_sampling`, the
`spanmetrics` connector, `prometheusremotewrite`/`loki` exporters. A
contrib-only component on the core image is a **startup crash**, not a
config-validation error — flag it before deploy, not after.

## Processor order is load-bearing

`memory_limiter` FIRST (must see data before anything buffers it, or it
can't shed load) → resource/detection → sampling/filter/transform →
`batch` LAST (batches the final shape before export). `tail_sampling`
(traces) goes before `batch` and needs whole traces — don't shard one
trace across replicas without a load-balancing exporter in front.

## Connectors are wired in TWO pipelines

`spanmetrics` (and any connector) is an *exporter* in the source pipeline
and a *receiver* in the destination pipeline. Wiring it once produces no
metrics or a validation error — the usual miss when cross-checking
`service.pipelines` against the component blocks above it.

## Sampling must be downstream of metric generation

If `tail_sampling` runs before `spanmetrics`, RED metrics are computed from
only the surviving sampled fraction — request rate is wrong by the
sampling ratio and **nothing looks broken**. Fork the pipeline instead:
ingest exports to `[spanmetrics, forward/sampled]`; a second traces
pipeline receives `forward/sampled`, applies `tail_sampling`, exports to
the backend. `spanmetrics` must see 100% of spans. At >1 replica,
`tail_sampling` needs a `loadbalancing` tier keyed by `traceID` so all
spans of one trace reach the same sampler — behind a plain load balancer,
sampling is simply broken.

## `resource_to_telemetry_conversion` is a tradeoff, not a default-on

Off (default): resource attributes land only on `target_info` — join with
`... * on (job, instance) group_left(service_name) target_info` for
`sum by (service_name)` to work. On: copies **every** resource attribute
onto **every** series — including high-cardinality ones (`k8s.pod.name`,
`host.id`), multiplying series count. Enable only after dropping
high-cardinality resource attributes; otherwise leave off + keep
`target_info: enabled: true`.

## Exporter reliability — the queue key differs per exporter

Production exporters need `retry_on_failure` **plus a queue**, but the
key differs: `otlp`/`otlphttp` use `sending_queue` (add
`storage: file_storage/...` for durability); `prometheusremotewrite`
rejects `sending_queue` at startup and uses `remote_write_queue` instead
(memory-only — no `storage:` option; use `prometheusremotewrite`'s own
`wal:` for restart-survivable durability). If validation rejects a queue
key, look up that specific exporter's own key — don't conclude the
exporter has no durability option.

## Removed/renamed components — don't flag as still-present or still-missing

`logging` exporter → removed, use `debug`. `loki` exporter → removed from
contrib, send OTLP to Loki's native OTLP endpoint via `otlphttp`
(`endpoint: http://loki:3100/otlp`). `jaeger` **exporter** → gone, use
`otlp`/`otlphttp` (Jaeger ingests OTLP natively); the `jaeger` **receiver**
still exists (beta) for ingesting legacy Jaeger-protocol spans during
migration — don't call it removed. Bare `${VAR}` env syntax is deprecated
→ `${env:VAR}`.

## Validate before calling it done

`otelcol validate --config=config.yaml` (core) /
`otelcol-contrib validate --config=config.yaml` (contrib) loads and
type-checks the full config without starting it. A config handed back
without running this is unverified — say so if the binary isn't
available, don't claim validation happened.

## Sources

Re-expressed from `s3onghyun/otelcol-doctor` (Apache-2.0).
