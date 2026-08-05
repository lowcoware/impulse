# Templates — schema only, fill don't invent

Spec and ADR templates live in their own files (`spec-driven.md`,
`adr.md`) since they're the two most-used artifacts and benefit from
inline context. Everything else is here. All of these are content
structure — `impulse-md-generator` decides the actual Markdown formatting
(properties, callouts, wikilinks) when rendering.

## Task

```markdown
# <ID>: <title>

## Context
Why this task exists — link the spec/ADR/incident that spawned it if any.

## Deliverable
What "done" produces, concretely.

## Acceptance criteria
Measurable. Not "works correctly" — "returns 409 on duplicate submission."

## Out of scope
Explicit — what this task does NOT include, even if adjacent.

## Links
Related spec / ADR / prior task
```

## Executor plan (write-executor-plan playbook)

```markdown
# NNN — <short imperative title>

- Status: TODO | DONE | RETIRED
- Commit: <git rev-parse --short HEAD at write time>
- Severity: HIGH | MEDIUM | LOW
- Estimated scope: <n files, rough size>

## Problem
What's wrong, where, why it matters. Every location as path:line,
current code quoted verbatim.

## Target
The exact end state — every value spelled out. Never "use a nicer X".

## Repo conventions to follow
Where tokens/config live + one exemplar file:line that already does it
right, for the executor to imitate.

## Steps
1. One concrete edit per step: file, what changes, resulting code.

## Boundaries
Do NOT touch <out of scope>. No new dependencies. Code doesn't match the
plan (drift since the commit stamp) → STOP and report, don't improvise.

## Verification
- Mechanical: exact commands + expected outcome.
- Product check: run it, trigger <interaction>, confirm <observable>.
- Done when: <machine- or eye-checkable criteria>.
```

## Checkpoint (traffic-light rollup)

```markdown
# Checkpoint — <date>

## Status by area
| Area | Status | Note |
|---|---|---|
| (green/yellow/red per area, not one project-wide number) |

## Highlights
What shipped since last checkpoint.

## Open blockers
| Blocker | Owner | Since |

## New debt
New `impulse:` markers / ADR-consequence follow-ups since last checkpoint.

## GO/NO-GO
Only when a real deadline is close — omit this section otherwise.
```

## Retrospective

```markdown
# Retro — <cycle>

## Planned vs actual vs discovered
Three explicit subsections, not one merged narrative.

## Went well / went poorly
Specific, named cause-and-effect — not vibes.

## Systemic blockers
Patterns across multiple items, not one-off complaints.

## Action items
| ID | Action | Owner | Traced into next cycle? |
```

## Roadmap round

```markdown
# Roadmap — <period>

## Round 1 / 2 / 3
Each: theme, owner, dependencies, the artifact that closes it (spec/ADR/task).

## Principles
The prioritization logic behind the ordering, one paragraph.
```

## Whole-service review report

```markdown
# Service review — <service> — <date>

## Findings by layer
Contracts / Data / Security / Tests / Docs — each layer's findings with
BLOCK/WARN/INFO severity (`conventions.md`).

## Verdict
`net: -<N> findings possible` or `Lean. Ship.` — same format as
`/impulse-review`'s per-diff verdict, at service scale.
```

## Triage response

```markdown
Classified as: <bug|spec|ADR|status-check|process|partner-update>
Routed to: <playbook/skill>
In scope now / deferred to roadmap: <which, and why>
```

## Completion digest (optional, for a spec worth cross-referencing later)

For a spec substantial enough that a future search ("did we already
decide how we handle X") should be able to find it — not every spec
needs one, this is for the ones worth being findable independent of
reading the whole spec again. Written after the spec archives, distinct
from the spec itself and from an ADR:

```markdown
# <spec-id> digest

## Tags
Keywords a future search would actually use — not the spec's title
restated, the concepts it touches.

## What was built
One paragraph, plain terms.

## Rejected alternatives
What else was considered and why it lost — not just the chosen path.
This is what makes the digest useful for "didn't we already try X" six
months later.

## Rules established
Any durable "we do X this way now" that came out of this spec, worth
knowing without re-reading the whole thing.

## Related
Other specs/ADRs this connects to.
```

**Deviation note** — if implementation diverged from the approved plan
during the work (not big enough for a standalone ADR, but a real
departure worth recording), it belongs in the spec's own Decision Log
(`spec-driven.md`) at the time it happened — the digest above summarizes
after the fact, it isn't where a live deviation gets first recorded.
