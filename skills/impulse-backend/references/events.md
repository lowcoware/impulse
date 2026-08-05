# Events — Kafka, outbox, DLQ, idempotency

Contract for every event that crosses a service boundary. Kafka via segmentio/kafka-go.

## 1. Naming

1. Domain events are past-tense facts, named by the owning domain.
2. Commands are not events. A topic full of imperatives = wrong design.

| wrong | right |
|---|---|
| `CreateOrder`, `SendEmail` | `OrderCreated`, `EmailSent` |
| `order-service-events` (bucket topic) | `orders.order_created` (one type or tight family per topic) |
| `DataChanged`, `Update` | `PaymentCaptured`, `UserRegistered` |

## 2. Schema first

1. Write the schema before the producer: proto for gRPC-adjacent, AsyncAPI (+ JSON Schema payload) for Kafka topics.
2. Schemas live in the owning service's `contracts/` dir. Consumers validate against the owner's schema — never re-declare it.
3. Evolve additively: add optional fields only. Rename/retype/remove = new `schema_version` (+ parallel topic if consumers lag). Never mutate a schema in place.
4. Compatibility mode = `FULL`, not the registry default `BACKWARD`. `BACKWARD` only protects a consumer reprocessing old data with a new schema — it does NOT protect an old, not-yet-deployed consumer against a producer that already shipped a new schema, which is the actual rollout order most services hit. `FULL` enforces both directions.
5. Every new field ships with an explicit default. "Additive" alone isn't safe: Avro reader/writer resolution needs a default to fill a field the old consumer's schema doesn't know about, and a consumer decoding with `DisallowUnknownFields` (Go) or `additionalProperties:false` (JSON Schema) rejects the message outright without one. Protobuf ignores unknown fields by default — safer here, but the default-value rule still holds for anything read as required.
6. Every event carries the envelope:

| Field | Rule |
|---|---|
| `event_id` | UUID, generated once at write time — the dedup key |
| `event_type` | past-tense name, matches schema |
| `schema_version` | integer, bump on breaking change |
| `aggregate_id` | id of the entity the fact is about — also the Kafka key |
| `occurred_at` | UTC, set by producer |
| `correlation_id` | propagated from the originating request (baseline rule) |

## 3. Idempotent consumers

1. Kafka is at-least-once. Every consumer handles the same event twice — no exceptions, no "we only send once" assumptions.
2. Dedup by `event_id`: `processed_events(event_id PK, processed_at)` in the consumer's own DB. Insert in the SAME transaction as the side effect; duplicate key = skip event, commit offset.
3. Redis `SETNX` dedup allowed only when the side effect is itself idempotent (cache warm, provider-deduped notification). Money/state → DB-transactional dedup only.
4. Handler = function of (event, current state). Reprocessing yields the same state.

## 4. Outbox

1. Required when the event crosses a service boundary with money or state at stake. Otherwise publish directly + `// impulse: direct publish, add outbox when money/state attaches to this event`.
2. Shape: business write + `outbox` insert in ONE transaction; relay worker polls unpublished rows, publishes to Kafka, sets `published_at`.
3. Table: `outbox(id, aggregate_type, aggregate_id, event_type, payload, created_at, published_at NULL)`.
4. Relay is at-least-once by design — consumers dedup (§3.2). Never "fix" duplicates on the producer side.

| wrong | right |
|---|---|
| Publish to Kafka inside the DB transaction | commit tx with outbox row, relay publishes after |
| Publish after commit, no outbox (dual write — crash loses the event) | outbox row in the same tx as the state change |

## 5. DLQ

1. Consumer retry: baseline retry rule applies. Full detail: `baseline.md`.
2. Exhausted → produce to `<topic>.dlq` with headers: original topic/partition/offset, error string, attempt count. Then commit offset and continue — never block a partition on one poison message.
3. Non-retryable errors (schema violation, permanent business reject) go to DLQ on attempt 1. Retrying a permanent failure is noise.
4. Classify by exception type, not by "the handler threw." A downstream timeout/5xx during a real outage is transient, not poison — DLQing every message during an outage floods the DLQ and manufactures a false "poison epidemic." Signal: failure spikes simultaneously across many *different* keys/messages → dependency outage, needs backoff/circuit breaker, not DLQ. Failure isolated to one specific message/key across retries → actual poison message.
5. DLQ needs an owner and depth/age alerting from day one, or it becomes a graveyard: added reactively after an incident, nobody triages it, and "replay everything" scripts recreate the original failure at larger scale. Replay is a deliberate reviewed action (canary-replay first), never an automated retry loop.
6. DLQ is alerted on (depth/age) and replayed by human decision — never auto-replayed in a loop.

## 6. Rebalancing

1. Cooperative-sticky assignor (`CooperativeStickyAssignor`, Kafka 2.4+), not the implicit-eager `Range`/`RoundRobin` default. Eager revokes *every* partition across *every* consumer on any membership change; cooperative-sticky reassigns only the partitions that actually moved. On a group with 5+ instances, eager is a latent throughput cliff on every deploy/scale event.
2. Static membership (`group.instance.id` set) so a pod bounce within the session timeout doesn't trigger a rebalance at all — a rolling deploy without it can cascade: each restart wave triggers a rebalance before the previous one settles, and a documented case (100 consumer pods, 25 concurrent restarts permitted) turned into 45 minutes of near-total processing outage before the rollout was paused. [Rebalance storms](https://www.michal-drozd.com/en/blog/kafka-consumer-rebalance-storm/)
3. `session.timeout.ms`/`max.poll.interval.ms` sized against real handler latency, not defaults — too tight creates a feedback loop: slow rebalance → missed heartbeat → coordinator marks the consumer dead → triggers another rebalance → repeat.
4. A rebalance interrupting a consumer before it commits an offset is exactly why idempotent consumers (§3) aren't optional even with cooperative-sticky — reprocessing after a rebalance is normal, not a bug.

## 7. Exactly-once — scope reality check

Kafka's EOS (idempotent producer + transactions + `isolation.level=read_committed`) guarantees exactly-once **within the Kafka cluster only**. It does NOT make an external side effect (a payment API call, a write to a non-transactional external DB) inside the same handler exactly-once — that side effect still needs its own idempotency per §3, same as any at-least-once consumer. Flag any diff that adds an external call inside a transactional producer/consumer and treats "it's EOS" as covering it. Second trap: reusing one `transactional.id` across multiple producer instances (naive horizontal scaling) fences the older instance — its in-flight transaction aborts, looking like an unexplained data-loss bug rather than a config mistake. Cost (2-5ms latency, 10-20% throughput) is why EOS stays scoped to money/state topics per §4, at-least-once + dedup everywhere else.

## 8. Consumer lag as a leading indicator

| Pattern | Means | Action |
|---|---|---|
| Steady, small, recovers to ~0 | Healthy | None |
| Sawtooth (rises then resets) | Usually benign — batch/checkpoint interval, periodic GC, a rebalance loop | Watch whether the trough stops touching zero over successive cycles — that's the transition point |
| Monotonic climb | Consumption rate structurally below production — undersized group, handler regression, or a hot partition (see `impulse-review`'s `arch:` hot-partition-key finding) | Fix now, don't wait for a full backlog |

A per-message synchronous external call/DB write inside the poll loop, on a
topic with known-growing volume, is exactly the diff that turns tolerable
sawtooth into monotonic climb once volume crosses a threshold — batch-fetch
and batch-write instead of an N+1-shaped per-message loop.

## 9. kafka-go specifics

| Concern | Rule |
|---|---|
| Keys | `Message.Key = aggregate_id`, writer `Balancer: &kafka.Hash{}` — ordering guaranteed per aggregate, nothing more |
| Acks | `RequiredAcks: kafka.RequireAll` on state/money topics |
| Consumer group | one `GroupID` per service, = service name; scale = more instances in the same group, never a second group for the same job |
| Offsets | `FetchMessage` → process → dedup insert → `CommitMessages`. Never `ReadMessage` with a GroupID — it commits before you processed = silent loss |
| Timeouts | context with deadline on every Fetch/Write/Commit — Kafka gets no exemption from the every-network-call rule |
| Shutdown | SIGTERM → stop fetching, finish in-flight, `reader.Close()` / `writer.Close()` (baseline drain) |
| Ordering | never assume cross-partition or cross-topic order; handlers tolerate reorder |
| Dedup plumbing | don't hand-roll partition/offset bookkeeping — consumer groups + `event_id` dedup already cover it (ladder: platform primitive) |
