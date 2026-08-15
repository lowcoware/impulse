# Day-one baseline — exempt from YAGNI

Every greenfield service ships ALL of this from commit #1. Not mode-gated,
not task-size-gated, never "later". The ladder decides how much code; this
list decides what always exists.

## Whitelist

| Item | Requirement | Done when |
|---|---|---|
| Health endpoints | `/health/live` = process alive. `/health/ready` = DB reachable, migrations applied, broker connected. | both routes respond; ready returns 503 while a dependency is down |
| Graceful shutdown | Handle SIGTERM: drain in-flight, close consumers/pools. | see shutdown order below; `kill -TERM` loses zero in-flight requests |
| Structured logs | JSON via zap. Fields: `timestamp`, `level`, `service`, `correlation_id`, `trace_id`, `message`. IDs propagated on every outbound call and published event. | grep a request id across two services and get both sides |
| Metrics | Prometheus `/metrics`: latency histogram, RPS, error rate per handler. | endpoint scrapes clean |
| Migrations | Versioned (golang-migrate / Alembic) from migration #1. No schema by hand, ever. | fresh DB + migrate up = working service |
| Config validation | Typed config, validated at startup. Invalid = refuse to boot. | see rules below |
| Timeouts | Timeout on EVERY network call. No timeout = bug. | see table below; zero infinite-wait calls in the diff |
| Idempotent consumers | Events arrive twice. Dedup by `event_id` before side effects. | replaying an event produces no second side effect (details: events.md) |
| Env + Dockerfile | `.env.example` lists every variable, empty values. Multi-stage Dockerfile, non-root final user (digest pins, cache order: impulse-devops/dockerfile.md). | image builds; `whoami` in container is not root |
| Retries | Exp backoff + jitter, capped attempts. Idempotent operations ONLY. Formula: [AWS Builders' Library, "capped exponential backoff, then full jitter"](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) — capping alone still synchronizes every client at the cap; jitter is what actually spreads the retries, not an optional extra. | no retry wraps a non-idempotent call |
| Outbox + DLQ | Required when events cross a service boundary with money/state at stake. Otherwise: `impulse:` marker with trigger. | outbox present, or marker like `// impulse: sync publish, add outbox when event carries money/state` (details: events.md) |
| Backups restore-tested | Every stateful store: automated backup + a drilled restore path + a named owner (details: impulse-devops/backup.md). Untested backups = GitLab 2017: five channels, all silently dead. | restore drill run before real data reaches prod; owner named |
| Money-path deploy safety | Code that moves money: staged rollout + automated kill-switch on an exposure threshold + second reviewer on the deploy. Knight 2012: $460M in 45 min, no kill switch, no reviewer. | kill-switch and rollout gate exist before the first money-moving deploy |

## Config validation at startup

1. One typed config struct/model per service (viper + struct in Go, pydantic-settings in Python). All settings enter through it — zero `os.Getenv` outside config loading.
2. Validate at boot: required fields present, ports/URLs parse, numbers in range, enums match.
3. Invalid config → log the exact failing key, exit non-zero. Never limp to the first request and die there.
4. Defaults for dev only. Production values explicit via env.
5. Secrets never in code or committed `.env`. `.env` in `.gitignore`; `.env.example` is the documentation. Delivery mechanism per environment tier — plain env is the local-dev floor only; production delivery (Compose `secrets:` mounts, injected stores): `impulse-security/references/secrets.md` owns the tier rule, `impulse-devops/references/compose.md` the Compose wiring.

## Graceful shutdown order

1. Catch SIGTERM (and SIGINT for local dev).
2. Flip `/health/ready` to 503 — stop receiving new traffic.
3. Stop accepting: close HTTP listener, pause Kafka consumers (finish current batch, commit offsets).
4. Drain in-flight work under a deadline (10–30s), enforced by context.
5. Close in order: producers → consumers → DB pools → Redis.
6. Exit 0 on clean drain, non-zero if the deadline killed work.

```go
ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, os.Interrupt)
defer stop()
// <-ctx.Done() → ready=503 → srv.Shutdown(drainCtx) → close consumers, pools
```

## Timeouts — every network call

| Call | Rule |
|---|---|
| Outbound HTTP (Go) | own `http.Client{Timeout: ...}` — `http.DefaultClient` is banned (no timeout) |
| Outbound HTTP (Python) | `httpx` with explicit `Timeout`; `requests` without `timeout=` is banned |
| DB | pgx pool: connect timeout + per-query `context.WithTimeout`; statement_timeout set |
| Redis | dial + read/write timeouts in client options |
| Kafka | dialer/reader/writer timeouts configured; never library infinity |
| gRPC | deadline on every call via context; no deadline = bug |
| Inbound HTTP | server read/write/idle timeouts set on the Gin (or Fiber) / uvicorn config |

Cancellation propagates: the request context reaches the lowest call. No
`context.Background()` mid-request, no `time.sleep` as synchronization.

## Retries

1. Idempotent operations only. Non-idempotent call needs retry → make it idempotent first (idempotency key), then retry.
2. Exponential backoff + jitter. Cap attempts (3–5) and total budget.
3. Retry only retryable failures: timeouts, 5xx, connection reset. Never 4xx.
4. Consumer retries exhausted → DLQ, not silent drop (events.md).

## What is NOT baseline

Circuit breakers, bulkheads, rate limiting, tracing backends, caching layers:
add when a trigger fires, with a `impulse:` marker until then. Baseline is the
floor, not the ceiling — YAGNI governs everything above this list.

Exception — known load: a committed number (a contract SLA, the measured
traffic of the system being replaced) is a trigger that has already fired;
capacity design for it is day-one work, not speculation.
