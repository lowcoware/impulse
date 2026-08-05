# Spec-driven development — the unit of work

## Why not sprints

A sprint time-boxes implementation effort. That's the wrong axis once an
agent implements a feature in minutes — the pacing element moved to review
and integration. 2025-2026 industry consensus (GitHub Spec Kit, AWS Kiro,
BMAD-METHOD): specs replace tickets as the primary artifact, and cadence
becomes **WIP-limited flow**, not calendar boxes.

1. "Sprint" survives only as an optional reporting grouping (for
   changelog/checkpoint rollups) — never as a scheduling constraint on when
   work starts or finishes.
2. The real limit is **how many specs are "active" at once** — cap it (2-3
   for a solo dev, scale with team size) so review doesn't drown.
3. A spec moves through states: `inbox` → `active` → `review` → `archive`.
   No state skips `review`, regardless of how fast implementation was.

## The pipeline

`constitution → specify → clarify → plan → tasks → implement → verify`

- **Constitution** (once per project, not per feature): the fixed
  constraints an agent must never violate — this project's canon is
  `impulse-backend`/`impulse-frontend`'s blessed stack + ladder + baseline; a PM
  spec doesn't re-derive these, it inherits them.
- **Specify**: what, for whom, why — see template below.
- **Clarify**: ask exactly what's ambiguous, once, per `conventions.md`'s
  ask-vs-don't-ask table — never a multi-question dump.
- **Plan**: how, at the architecture level — cites relevant ADRs
  (`adr.md`), names the services/files it touches (blast-radius estimate).
  Also assigns the Ship-Show-Ask review tier NOW (`review.md`) — tier is a
  function of risk/blast-radius, known at plan time, not of eventual diff
  size. **Every path named in the blast-radius estimate gets actually
  read (or `ls`'d) before it's declared** — a path assumed to exist from
  memory rather than checked is a real, documented failure mode (a
  planned file that turns out not to exist, or exists somewhere else).
- **Tasks**: decomposed into agent-executable units — see decompose-as-spec
  below.
- **Implement**: the agent's job, against the spec — not against a verbal
  summary of it. If the same plan produces several tasks in a row that
  run significantly over their expected effort, or several tasks in a
  row that surface dependencies the plan didn't name, that's a signal to
  stop and re-plan the REMAINING scope before continuing, not push
  through on the original plan — a plan quietly drifting off its own
  estimate is the thing to catch mid-execution, not just discover at
  Verify.
- **Verify**: acceptance criteria checked, the review tier assigned at Plan
  actually carried out (Ship merges, Show async-reviewed, Ask
  sync-reviewed), then archived. Two checks worth running here that
  "acceptance criteria checked" doesn't automatically cover:
  **reachability** — new code that's imported/called from nowhere real
  passes its own isolated test while doing nothing for the actual
  feature; a green test on unreached code is a false positive, not a
  pass — and **scope drift** — diff the plan's declared blast-radius
  against what actually changed, both directions (a declared-but-
  untouched file AND a touched-but-undeclared file are both worth a
  one-line note, even when the outcome is otherwise fine).

## Spec template

```markdown
# <Title>

## Context
Why this, why now. Cite the trigger — an incident, a request, a metric —
not "it would be nice."

## Non-Goals
What this spec explicitly does NOT cover. Cheap to write, expensive to
skip — this is what stops scope creep mid-implementation.

## Assumptions
What's taken as given (an API exists, a service is available). If an
assumption turns out false mid-implementation, that's a stop-and-ask
signal, not a silent workaround.

## Design Principles
Which existing conventions this spec leans on (blessed stack, ladder rung,
a specific ADR) — not re-explained, just cited.

## Data Model / Contract
Schema, event envelope, API shape — whatever this spec's boundary actually
is. Skip this section entirely if the spec touches no data contract.

## Runtime Behavior
What happens, step by step, including failure paths — not just the happy
path.

## Testing Strategy
What proves this is done: which test level (unit/integration/E2E) covers
which acceptance criterion. See `impulse-backend/references/testing.md`.

## Decision Log
Choices made *during* this spec's own drafting that aren't big enough for
a standalone ADR but are still worth recording — "considered X, went with
Y because Z." This is what makes the spec double as an audit trail later.

## Acceptance Criteria
Measurable, checkable — "returns 409 on duplicate" not "handles duplicates
well."
```

Non-Goals, Decision Log, and Acceptance Criteria are the three fields most
specs skip and most regret skipping — they're what lets a spec function as
a review artifact and a debugging trail six months later, not just an
implementation prompt.

### Acceptance Criteria — EARS syntax, not free prose

"Measurable, checkable" needs a grammar or it stays a judgment call.
EARS (Easy Approach to Requirements Syntax — the format both GitHub Spec
Kit and AWS Kiro converged on independently) gives five sentence shapes,
each recognizable on sight and each mapping to one test:

| Shape | Form | Covers |
|---|---|---|
| Ubiquitous | "The system shall X" | An invariant, always true |
| Event-driven | "When X, the system shall Y" | A trigger→response pair |
| State-driven | "While X, the system shall Y" | Behavior during an ongoing state |
| Optional feature | "Where X, the system shall Y" | Config-gated behavior |
| Unwanted behavior | "If X, then the system shall Y" | An error/failure path |

Rules: one AC = one condition + one outcome — split any AC joined by
"and" into two. No implementation details in an AC (no class name,
column name, library name — that's Plan's job, not Acceptance Criteria's).
Self-check: could a junior tester write a Given/When/Then test from this
line without asking a follow-up question? If not, it's not an AC yet.

**Open-questions escape hatch (`Q-NNN`).** When writing an AC would
require inventing an answer nobody's given, don't invent it — demote it
to a numbered open question (`Q-001: does "duplicate" mean same email,
or same email+org?`) instead of guessing and writing a confident-looking
AC on top of the guess. Resolved questions move to a "Resolved" section
with the answer and date, keeping the resolution history instead of
silently editing the AC in place. This is a lighter, more structured
version of what the Assumptions section already does implicitly — use
Q-NNN for anything specific enough to block writing a real AC, Assumptions
for broader context taken as given.

**Non-functional claims cap at SPEC-COMPLETE, never PASS, until measured
at runtime.** A latency/throughput/storage claim ("responds in under
200ms") can be structurally complete — stated, with a test method named
— without that being evidence it's actually TRUE. Self-review's
internal-consistency pass checks the AC is well-formed; it doesn't and
can't confirm the NFR itself holds. Mark such an AC `NEEDS-RUNTIME`
until an actual measurement confirms it, and don't let "the spec is
consistent" get silently read as "the performance target is met" —
those are different claims and conflating them is exactly the gap a
green checkmark papers over.

## Spec self-review — run before anyone else sees it

Four mechanical passes on the just-written spec, inline, no subagent:

1. **Placeholder scan** — banned phrases that defer the actual decision:
   "add appropriate error handling", "similar to task N — repeat",
   "handle edge cases", "as needed". Each one = a decision the implementer
   will make alone that the spec existed to make. Same failure mode, more
   commonly missed: a `Q-NNN` open question that never got resolved before
   the spec moved to `active`. A self-review pass can scroll right past
   one — where tooling allows it, a mechanical grep for `Q-NNN` markers
   blocking the `inbox → active` transition closes that gap harder than
   relying on the self-review catching it every time.
2. **Internal consistency** — does the Data Model match what Runtime
   Behavior describes; do Acceptance Criteria test things Non-Goals
   excluded.
3. **Scope check** — everything in the spec traceable to the stated goal;
   anything extra moves to Non-Goals or a new spec.
4. **Ambiguity check** — any sentence a hostile reader could implement two
   ways gets rewritten or a Decision Log entry.

Task right-sizing test: the smallest unit that carries its own test cycle
and is worth a fresh reviewer's gate. Smaller = slicing overhead; bigger =
the 400-line-diff gate (`review.md`) fires later anyway.

## Interviewing the requester — before writing the spec

When the ask is fuzzy, interview — but with mechanics, not vibes:

0. **Framing gate first — three specific, checkable defects, not a vague
   "is this a good idea" pass.** Solution-smuggling (the ask names a
   solution — "we need a dashboard" — instead of the actual problem —
   "managers can't see velocity"; if solution-smuggled, ask for the
   underlying problem before speccing the named solution). Zero stated
   success metric (how would anyone know this worked). Scope mixing 3+
   unrelated asks bundled into one request (splits into separate specs).
   One turn of pushback on any defect found, then proceed with the best
   available answer regardless of whether the pushback lands — this gate
   doesn't block indefinitely, it just makes sure the defect was named
   once before moving on.
1. **Open with a hypothesis + confidence number.** "My read: you want X
   for Y. Confidence ~40% — missing: who uses it, why now." Forces your
   uncertainty into the open and gives the user something to correct,
   which is faster than answering open questions.
2. One question at a time, each with your best guess attached — "Which
   store? (guess: Postgres, it's already there)" — a guess to correct
   beats a blank to fill.
3. **Want vs should-want probe** when answers feel performative: "если бы
   это не надо было никому обосновывать — что бы ты попросил?"
4. **Stop test:** can you predict the answers to your next three
   questions? → stop asking, restate (Outcome / User / Why now / Success
   / Constraint / **Out of scope**), get one confirmation, write the spec.

## Pre-mortem gate — before building at all

For a new product/feature (not a bugfix/refactor): one short pass BEFORE
the spec — is this worth building? Five questions, one line each: who
demonstrably wants it / why now / what's the money-or-retention path /
what kills it (riskiest assumption) / what's the cheapest evidence that
would settle that assumption. Output: build / delay-until-evidence / drop.
Ten minutes here beats a perfectly-specced thing nobody needed. Contested
call → `impulse-brainstorm`.

## Decompose-as-spec-type

Task granularity has no universal right size — too broad and an agent makes
architectural choices alone that should've been a human call; too narrow
and a human spends more time slicing than the agent saves. Resolve this by
making decomposition itself a spec:

1. A **decompose spec**'s only deliverable is a set of child specs, each
   independently implementable.
2. Review the decomposition once, before any child spec goes `active` —
   catching a bad slice here is cheap; catching it after three children are
   half-implemented is not.
3. A child spec that turns out too broad during implementation triggers a
   new decompose spec, not silent scope stretching inside the original.
4. **Anchor "too big" and "too small" to a countable proxy, not pure
   judgment.** AC count is the cheapest one: roughly <= 3 ACs reads small
   (maybe should merge with a sibling), 4-8 reads right-sized, > 8 (or
   >= 3 touched components) reads like it should split again. Not a hard
   rule to enforce mechanically — a proxy to sanity-check a slicing
   decision against, the same way `review.md`'s 400-line-diff number is a
   proxy for review effort, not a law of nature.
5. **Cross-Feature Contracts (CFC) for an invariant spanning multiple
   child specs.** A decompose spec sometimes produces children that must
   individually satisfy a shared constraint (all three services agree on
   one event schema; every child respects one rate limit). Tag it
   `CFC-N` in the parent decompose spec with: which child specs
   participate, what the contract actually states, the per-child
   acceptance criterion that proves compliance, and how it's enforced.
   Every participating child spec then carries a matching `[CFC-N]` tag
   on its own relevant AC — so "does every child actually honor the
   shared contract" is a thing you can check by grepping tags, not an
   implicit hope that nobody dropped it while implementing one child in
   isolation.

## What NOT to do

No mandatory two-document system (a full Implementation Plan AND a
separate Task Plan for one feature) — that's exactly the ceremony this
suite's anti-overengineering stance already rejects for code; it's the same
mistake in a PM costume. One spec, one lifecycle. File a decompose spec
only when a feature genuinely needs splitting, not as a default step.
