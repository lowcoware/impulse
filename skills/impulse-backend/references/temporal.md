# Temporal — durable workflow orchestration (Go SDK)

Distilled from campoy/temporal-go-skill (harvested GitHub skill).
`jobs.md` covers cron/queue-shaped work (Redis Streams, `robfig/cron`);
this is a different class of problem — a multi-step process that must
survive process crashes, deploys, and hours-to-days-long waits, with
exactly-once semantics per step. Reach for Temporal only when that
durability need is real — a fire-and-forget background job doesn't need
it, `jobs.md` already covers that case cheaper.

## The core mental model — Workflow code gets REPLAYED

Temporal doesn't keep a workflow "running" continuously — it records an
event history and, on recovery (a crash, a deploy, a worker restart),
**replays the Workflow function from that history** to reconstruct state.
This one fact drives every rule below: anything non-deterministic inside
Workflow code produces a different result on replay than it did the first
time, and the replay silently diverges from history instead of erroring
clearly.

## Determinism — non-negotiable inside Workflow code

| Never (inside a Workflow function) | Use instead |
|---|---|
| `time.Now()` | `workflow.Now(ctx)` |
| `rand`, `uuid.New()` | `workflow.SideEffect(ctx, ...)` |
| raw goroutines (`go func() {...}`) | `workflow.Go(ctx, ...)` |
| raw channels | `workflow.Channel` |
| any direct I/O, network call, DB call | an Activity (see below) |

Anything that touches the outside world — a database, an HTTP call, disk
I/O — belongs in an **Activity**, not inline Workflow code. The Workflow
function is pure orchestration logic (decide what happens, in what
order); Activities are where side effects actually happen.

## Five non-negotiables for every Activity

1. **Explicit timeout.** The SDK refuses to schedule an Activity with no
   `StartToCloseTimeout` (or equivalent) set — there's no silent
   "runs forever" default to fall into.
2. **Explicit `MaximumAttempts`.** The retry policy default is
   *unlimited* retries — leaving it unset means a permanently-failing
   Activity retries forever, not "retries a reasonable number of times."
3. **Permanent failures marked non-retryable.** An error that will never
   succeed on retry (bad input, a 4xx from a downstream API) needs to be
   classified as non-retryable explicitly, or the unlimited-by-default
   retry policy above keeps hammering a call that can't succeed.
4. **Activities are idempotent.** Temporal's delivery guarantee is
   at-least-once — the same Activity can execute more than once for the
   same logical step (a retry after a timeout where the first attempt
   actually succeeded but the ack was lost). Same idempotency discipline
   as `events.md`'s consumer-side dedup, applied to Activities.
5. **`workflow.GetVersion` gates any change to the sequence of Workflow
   API calls** in code that has running (in-flight, not-yet-completed)
   Executions. A currently-executing workflow instance replays against
   ITS history, recorded against the OLD code — changing the call
   sequence without a version gate makes the replay diverge from what
   actually happened, and Temporal detects this as a non-determinism
   error, not a silent bug (fails loud, but still a production incident
   if unplanned).

## No automatic rollback — plan compensation explicitly

Temporal does **not** undo already-completed steps when a later step in
the same workflow fails — there's no implicit transaction wrapping the
whole workflow. A multi-step process where step 3 failing should undo
steps 1 and 2 needs an explicit Saga/compensation plan written into the
Workflow logic (each forward step paired with its own undo Activity,
invoked in reverse order on failure) — the orchestration engine gives you
durability and retry, not transactional rollback.

## Boundaries

Queue-shaped or schedule-shaped work that doesn't need multi-day
durability or exactly-once step semantics: `jobs.md` (Redis Streams,
`robfig/cron`) is the cheaper default — don't reach for Temporal
speculatively. This file is for the case where the durability/replay
guarantee is a real requirement, not a nice-to-have.
