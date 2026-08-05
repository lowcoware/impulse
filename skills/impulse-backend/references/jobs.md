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
