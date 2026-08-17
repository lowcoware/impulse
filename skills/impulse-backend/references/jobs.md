# Background jobs, cron, workers

Queue-shaped and schedule-shaped work. Redis Streams is the blessed queue
primitive (`deps.md`); reuse `events.md` §3 idempotency, don't restate it.

1. **Every job handler is idempotent** — a job runs at least once, same
   dedup discipline as a Kafka consumer (dedup table or `SETNX`, sized to
   the side effect). Don't reach for Asynq/RabbitMQ unless volume/features
   outgrow Streams.
2. **The two-replicas-both-run-cron bug:** `robfig/cron` has no cluster
   awareness — scale a service to 2+ replicas and every schedule fires N
   times. Fix: leader election via `Redis SET NX PX <ttl>` before running
   the tick, or a single dedicated `cmd/worker` at `replicas: 1` for
   cron-shaped work. Streams consumer groups (which DO scale safely) are for
   queue-shaped work.
   ```go
   ok, _ := rdb.SetNX(ctx, "cron:daily-report:lock", 1, 55*time.Second).Result()
   if !ok { return } // another replica claimed this tick
   ```
3. **Layout:** `cmd/worker/main.go` as a separate binary from
   `cmd/<service>/main.go`, sharing `internal/service` — same composition-
   root discipline as `layout.md`.
4. **Graceful shutdown:** on SIGTERM stop `XREADGROUP`, let in-flight
   handlers finish, `XACK`, then exit — never kill mid-handler (duplicate/
   partial side effect on restart). Same drain rule as baseline.md.
5. A job that must not overlap itself (a long backfill) takes its own lock
   for the whole run, not just the tick — otherwise a slow run and the next
   scheduled fire collide.

Sources: [Redis job queue in Go](https://redis.io/docs/latest/develop/use-cases/job-queue/go/) ·
[robfig/cron replicated-service recommendation](https://github.com/robfig/cron/issues/417)

## Node.js: BullMQ production patterns

BullMQ (Redis-backed, `deps.md`) is the Node queue lib once Streams'
manual XREADGROUP wiring outgrows itself — full producer/consumer/worker
API, not just a client.

1. **Idempotency via job ID, not a separate dedup table.** Adding a job
   with a `jobId` that's already active/waiting is silently ignored (no
   error, no duplicate) — cheaper than the Streams dedup-table pattern
   above when the natural key (order ID, webhook event ID) is known at
   enqueue time. Caveat: once a job is removed (completed/failed and
   swept by retention, below), its ID is free to reuse — ID-based
   dedup only protects against duplicates while the job is still live in
   Redis, not against a resend days later. Reserved: no `:` in the ID
   (collides with Redis key namespacing), no purely-numeric ID (collides
   with BullMQ's auto-generated ID format).
2. **`removeOnComplete`/`removeOnFail` is the #1 footgun.** Default is
   unbounded retention — every finished job sits in Redis forever,
   memory grows without limit under real volume. Never leave it at
   default in production. Set both explicitly:
   ```ts
   { removeOnComplete: { age: 3600, count: 1000 }, removeOnFail: { age: 86400 } }
   ```
   `age` (seconds) + `count` together — count caps the set size during a
   burst even if `age` hasn't elapsed yet. Keep failed jobs longer than
   completed ones (failure forensics > success history); removal is
   lazy — it runs only when a new job finishes, not on a timer, so a
   quiet queue can still hold stale entries.
3. **Concurrency is per-`Worker` instance, not per-queue.** `new Worker(name, processor, { concurrency: N })` — default 1. Concurrency only buys
   anything for I/O-bound processors (DB/HTTP calls inside the job);
   CPU-bound work needs BullMQ's sandboxed processors (separate
   process), not a higher concurrency number. Multiple worker processes
   against the same queue add up — 3 workers × concurrency 10 = 30
   jobs in flight for that queue.
4. **Rate limiting is global per queue, not per worker.** `limiter: {
   max: 10, duration: 1000 }` on the Worker caps the QUEUE at 10
   jobs/sec total even with 10 workers attached — it's not 10/sec per
   worker. Per-group/per-tenant rate limiting (`groupKey`) was removed
   in BullMQ 3.0; there's no built-in per-customer limiter — throttle
   externally (separate queue per tenant, or `worker.rateLimit()` called
   manually from inside the processor) if that's a real requirement.
5. **No built-in dead-letter queue — BullMQ's own docs describe the
   pattern, not a feature.** `attempts` + backoff (`fixed` or
   `exponential`) handles automatic retry; once attempts are exhausted
   the job sits in the `failed` set (a de facto DLQ already). For a
   real DLQ (separate alerting/replay path), listen for the `failed`
   event, and on the last attempt copy the job into a second queue no
   worker consumes. Throw `UnrecoverableError` from the processor for
   errors retrying can never fix (bad payload, 4xx from a downstream
   API) — it skips remaining attempts and moves straight to failed
   instead of burning the full backoff schedule.
6. **Graceful shutdown: `await worker.close()` — not a fire-and-forget
   call.** It stops the worker claiming new jobs and waits for
   in-flight jobs to finish, but has NO built-in timeout — a job that
   never resolves blocks shutdown forever. Race it against your own
   deadline (`Promise.race([worker.close(), timeout(30_000)])`) in the
   SIGTERM handler; jobs still in flight when the process is
   force-killed anyway get marked stalled and picked up by another
   worker, same at-least-once contract as note 1's idempotency
   requirement.

Sources: [BullMQ: auto-removal of jobs](https://docs.bullmq.io/guide/queues/auto-removal-of-jobs) ·
[BullMQ: graceful shutdown](https://docs.bullmq.io/guide/workers/graceful-shutdown) ·
[BullMQ: concurrency](https://docs.bullmq.io/guide/workers/concurrency) ·
[BullMQ: rate limiting](https://docs.bullmq.io/guide/rate-limiting) ·
[BullMQ: job IDs](https://docs.bullmq.io/guide/jobs/job-ids) ·
[BullMQ: retrying failing jobs](https://docs.bullmq.io/guide/retrying-failing-jobs) ·
[BullMQ: stop retrying jobs (UnrecoverableError)](https://docs.bullmq.io/patterns/stop-retrying-jobs)
