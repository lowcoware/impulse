# Pre-code gate — constraint discovery before implementation

Source: distilled from a harvested GitHub skill (anantbhandarkar/make-it-right,
the `mir-backend` generic pillar). Complements ladder.md (how much code to
build) and baseline.md (what always ships) with a different axis: for
backend work that's genuinely risky, this is the discipline that runs
BEFORE any code — not a complexity-scaling decision, a correctness-discovery
one. LLMs writing backend code fail less at syntax than at knowing which
constraints were never stated; this file is the process that surfaces them
before they ship as silent bugs.

## 1. When this gate applies

Not every task. Tick every box that applies to the task at hand:

| If the task… | These become mandatory to nail down before coding |
|---|---|
| Changes persistent state (write/update/delete) | Transactional correctness, idempotency |
| Touches money, inventory, credits, quotas | Invariants, concurrency behavior, exactly-vs-at-least-once |
| Spans more than one table or more than one service | Transaction boundaries, partial-failure handling, consistency model |
| Runs under concurrency or has retries | Race conditions, idempotency, locking strategy |
| Is multi-tenant | Tenant isolation, row scoping, noisy-neighbor risk |
| Calls an external dependency (payment, email, queue) | Partial failure, timeouts, circuit breaking, idempotency keys |
| Has a lifecycle (states/transitions) | State-machine completeness — which transitions are valid, which must be rejected |
| Stores PII or regulated data | Retention, deletion, audit trail |
| Deploys against existing prod data | Migration safety, backward compatibility |

**Zero boxes ticked** → this is a pure-compute or read-only task. Skip the
gate, code directly. Don't run a risk register for a CSV parser — the gate
exists for the failure modes above, not as ceremony for its own sake.

## 2. The sequence, in order

Skipping ahead — writing code before step 4 is confirmed — is the one
failure this file exists to prevent. Each step produces a written artifact,
not just a mental pass.

1. **Restate real intent.** Not the literal task text — what has to become
   true in the world. "Build an order endpoint" restates as "accept money
   for goods such that we never charge twice and never oversell." If the
   restatement diverges from the literal ask, surface that gap now, before
   any design.
2. **Surface the unknowns, don't invent them.** For each ticked box in the
   table above, identify the 2-4 highest-leverage open questions — the
   ones whose answer most changes the implementation. Ask the user
   directly, each question with 2-4 concrete options and one marked as
   the recommended default. Never more than 4 questions in one round —
   a long question wall gets defaults picked blindly, which is
   indistinguishable from not asking at all.
3. **Write the Assumption Ledger.** Every answer (and every default
   accepted by silence) becomes an explicit, numbered, written list —
   this is the artifact that kills confident hallucination later:
   ```
   ASSUMPTIONS (confirm before I write code):
    1. Orders are immutable after FULFILLED.
    2. Payment provider supports idempotency keys; pass one per charge.
    3. Inventory reservations expire after 15 min; expiry releases stock.
    4. Email send failure must NOT roll back the order (fire async, at-least-once).
   ```
   Get explicit confirmation on this list before proceeding — don't pass
   this step on silence.
4. **Declare invariants and failure modes.** What must always be true
   (`inventory.available >= 0` at all times, including after reservation
   expiry), the state machine if one exists (enumerate valid transitions
   AND explicitly name the invalid ones — AI defaults to generating CRUD;
   production needs a state machine that rejects `FULFILLED → PENDING`),
   and for every external dependency and multi-step write: what happens
   if this half-succeeds?
5. **Risk register.** A table: Risk | Severity | Likelihood | Mitigation |
   Decided?. Anything Critical/High left undecided is a blocker — resolve
   before design sign-off, don't carry it into implementation as a "we'll
   handle it later."
6. **Design sign-off before code.** State explicitly: transaction
   boundaries (exactly which operations are in one tx and which aren't,
   and why), consistency guarantees (strong where, eventual where),
   the idempotency mechanism (the actual key, where it's stored, its
   TTL), the observability plan (correlation ID propagation, which
   structured-log events, which business metrics — baseline.md already
   requires these exist, this step is deciding WHAT they are for this
   feature specifically), and the migration plan if touching existing
   data. Get approval before writing implementation code.

## 3. Anti-patterns this gate exists to prevent

| Don't | Why it bites |
|---|---|
| Write code before the Assumption Ledger is confirmed | Every unconfirmed assumption ships as a confident hallucination |
| Ask 10+ clarifying questions in one round | User picks defaults blindly — looks like consent, isn't |
| Add retries without deduplication | Production is at-least-once, not exactly-once — duplicate charges/emails |
| Generate CRUD for something that's actually a state machine | Invalid and concurrent transitions corrupt lifecycle state |
| Assume the happy path for external dependencies | "What if the cache is down but the DB is up?" is the question that pages someone |
| Write a migration as if the table is empty | Prod has rows — `ADD COLUMN NOT NULL` with no default locks/breaks on populated tables |
| Leave a Critical/High risk "pending" past design sign-off | An undecided critical risk is a decision deferred to a production incident |

## Boundaries

This decides WHETHER a piece of risky backend work has enough discovered
constraints to code safely — it doesn't decide how much code to build once
those constraints are known (ladder.md), what always ships regardless of
feature (baseline.md), or how to review code that's already written
(impulse-review). Run this gate once per state-changing flow — a task
spanning several independent flows (orders AND refunds AND subscriptions)
gets one pass per flow, not one mega-plan that hides the seams between them.
