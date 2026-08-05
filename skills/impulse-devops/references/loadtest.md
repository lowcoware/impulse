# Load testing — find the ceiling before prod does

Tool: **k6** default (thresholds = CI gate, scenarios). vegeta for one-off
"is this endpoint OK" (`echo "GET url" | vegeta attack -rate=50
-duration=10s | vegeta report`). Locust only if the test needs your Python
app's own libs. JMeter/Gatling — no, JVM ops weight at this scale.

## Which tests, when — not all five routinely

| Type | When |
|---|---|
| Smoke (minimal VUs) | every arch change; PR-triggerable (2-5 min) |
| Load (expected traffic) | pre-launch, before any capacity-affecting release |
| Stress (ramp past expected → break) | before major release; refreshes the ceiling number |
| Soak (hours at steady) | monthly if you run pools/caches/sessions — catches leaks short tests can't |
| Spike (5-10x in seconds) | only before a real burst event (launch, marketing blast) |

## k6 craft

1. **Thresholds are the gate, checks are not.** `check()` only records a
   pass-rate — it never fails the run. Gate =
   `http_req_duration: ['p(95)<300']`, `http_req_failed: ['rate<0.001']` —
   non-zero exit fails CI directly. Thresholds on p95/p99, never average.
2. **Executor = the question.** "How many RPS can we sustain" →
   `constant-arrival-rate`/`ramping-arrival-rate` (open-loop). `ramping-vus`
   only for user-growth/soak shapes — VU-count executors let slow responses
   silently throttle offered load.
3. Randomized `sleep()` think-time between steps — no-think-time VUs hammer
   unrealistically.
4. Start thresholds from real SLOs, not invented numbers.

## Classic lies to avoid

1. **Generator on the target box** — you measure contention, not capacity.
   Separate machine; watch generator-side saturation too.
2. **localhost path** — hit the real ingress (Traefik + TLS), not the bare
   container port; proxy overhead and handshakes are part of capacity.
3. **Coordinated omission:** closed-loop generators (k6 default VU loop)
   wait for a response before the next request — the slow tail gets
   under-sampled and p99 looks better than reality. Arrival-rate executors
   fix it; cross-check with wrk2/vegeta if the SLA rides on p99.
4. **No warm-up** — first minutes are pools/caches filling. 2-5 min
   throwaway load before the measured window.
5. **Uniform-random test data** — prod is Zipfian; uniform keys hide the hot
   row/lock contention. And 10k rows behaves nothing like 50M — plans change
   with cardinality; test at realistic volume.
6. **Never load-test third-party APIs** — you'll get rate-banned. Mock them
   (stub container), test your integration layer.

## Interpreting

1. Plot throughput + p95/p99 vs offered load. The **knee** = throughput
   flattens while latency curves up. That's the ceiling — not where errors
   start. Rising p99 is the early warning, before throughput stalls.
2. Correlate the knee with Prometheus during the run
   (`impulse-backend/references/observability.md`): CPU → DB pool → goroutines → GC, in
   that order — whatever saturated first at the knee is the bottleneck.
3. **DB pool exhaustion is the usual first wall**, well before CPU or query
   time. Size the pool deliberately (`hardening-go.md` formula); `pgbench`
   isolates "DB is the ceiling" from "app is slow" — run it from a separate
   box.
4. **Write the number down:** "450 req/s at p95<300ms on 2vCPU/4GB, DB pool
   saturates first" — the service's documented ceiling, the regression
   baseline for the next stress run, and a `impulse:` marker's trigger data.

## CI wiring

Smoke on PR at most. Real load/stress: nightly cron or `workflow_dispatch`
pre-release gate (`ci.md`) — k6 threshold breach exits non-zero, fails the
job, no parsing needed. Staging that's under-provisioned vs prod lies —
match it or scale expectations explicitly.

Sources: grafana.com/docs/k6 (thresholds/executors), community.k6.io
coordinated-omission thread, github.com/giltene/wrk2, postgresql.org/docs
pgbench, radview.com load-generator saturation.
