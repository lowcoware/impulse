# Panel — rubric, anti-patterns, example

## Scoring rubric

Score each approach 1-3 (or −/~/+) against ONLY the constraints that dominate
this decision. Don't score all of them every time — pick the 3-5 that matter.

| Constraint | Ask |
|---|---|
| Reversal cost | How expensive to undo once shipped and data exists? |
| Hot-path cost | Network hops / allocs / round-trips on the common request |
| Consistency need | Does this data tolerate eventual, or need strong? |
| Operational load | New moving part to run/monitor/back up? |
| Team fit | Does the blessed stack (`impulse-backend` references/deps.md) already do this? |
| Failure blast | When it breaks, what's the radius? |
| Ceiling | At what scale does it stop working (the `impulse:` marker)? |

Weight by the frame. A latency-dominated decision weights hot-path over
operational load; a two-person-team decision weights team-fit over ceiling.

## Divergence angles (pick 3 distinct)

- **Simplest-that-works** — least code, least infra, ship today.
- **Scale-first** — what you'd build if load were 100× (usually the trap; name
  its cost so the ceiling is explicit, not to pick it).
- **Boring-proven** — the dull option the industry already trusts.
- **Constraint-inverted** — flip the dominant constraint: if latency drives it,
  what if consistency did? Surfaces hidden assumptions.

Three flavors of one idea (Postgres / Postgres+cache / Postgres+read-replica)
is NOT divergence — that's one approach with tuning knobs.

### Subagents — one-way doors only

Default is **one context**: generate the three approaches inline. A subagent
per approach costs a full context copy each, plus the impulse ruleset re-injected
into every one of them (the SessionStart hook does not reach subagents, so
`impulse-subagent.js` re-pays it per spawn). Three agents to compare three
paragraphs is the panel eating more than the decision is worth.

General subagent-worth-it thresholds (task size, separability, orchestration
mechanics beyond this skill's specific gate): `../../shared/subagents.md`.

Spend subagents only when BOTH hold: the decision is a genuine one-way door
(schema with data in it, service split, protocol), AND you have caught yourself
anchoring — the inline attempts keep converging on the option you already
wanted. That is what isolated context actually buys: independence, not volume.

When you do spawn them, give each an OPPOSING constraint ("minimize the
interface" / "maximize flexibility" / "optimize the most common caller"), not
the same neutral brief three times — identical briefs converge on the same
answer and the panel becomes theater at triple the price.

## When the panel can't settle it — throwaway prototype

Two approaches score even and the disagreement is empirical ("will this
feel laggy", "does this state machine cover the flows") → stop arguing,
spend an hour on a THROWAWAY: logic question → a terminal-driven
state-machine sketch; UI question → variants behind a `?variant=` switch,
dev-env only. Rules: it never merges, it proves exactly one contested
point, the winner gets rebuilt properly. An hour of throwaway beats a day
of panel prose when the question is empirical.

## Anti-patterns

- **Anchoring** — generating alternatives to justify the one you already want.
  Fix: write the failure mode of your favorite FIRST. Grounded in an actual
  measured technique, not just intuition: Klein's premortem (imagine the
  decision has already failed, generate reasons why) measurably increased
  identification of failure reasons by ~30% over a standard planning
  review — same mechanism as "write the failure mode first," formalized.
  A second, independent lever when one favorite still dominates the
  panel: assign each divergence angle to a different reviewer/subagent
  (already this file's own "give each an OPPOSING constraint" rule above)
  — red-teaming from a genuinely different vantage point is what prevents
  one person's/one pass's anchor from quietly deciding all three
  "alternatives."
  [ResearchGate: the premortem technique](https://www.researchgate.net/publication/318013212_The_Premortem_Technique)
- **Analysis paralysis** — paneling a two-way-door decision. Fix: the reversal-
  cost gate. Cheap to undo → skip the panel.
- **False symmetry** — forcing 3 when 1 obviously wins. Fix: say so, cite the
  ladder, stop.
- **Vibe scoring** — "elegant", "clean", "modern". Fix: every cell is a number
  or a concrete fact. This is also why the panel format exists at all: the
  structured-multi-criteria discipline this file enforces (named
  constraints, explicit weighting, scored not vibed) is the same shape as
  MCDA (multi-criteria decision analysis) — literature on MCDA vs.
  intuitive first-idea choice finds structured criteria weighting reduces
  gut-feel bias and groupthink specifically, and that criteria QUALITY
  (how thoroughly they're defined) is what drives output quality, not the
  scoring math itself. Sloppy criteria run through a rigorous-looking
  table is still vibe scoring wearing a table's clothes.
  [Government Analysis Function: introductory guide to MCDA](https://analysisfunction.civilservice.gov.uk/policy-store/an-introductory-guide-to-mcda/)
- **Survey ending** — presenting 3 options, no pick. Fix: rule 4, one choice +
  trip-wire.

## Vocabulary (precision for the "vibe scoring" trap above)

- **Simple vs easy** — no interleaved concerns vs merely familiar; easy
  isn't simple (Hickey).
- **Essential vs accidental** — inherent to the problem vs introduced by
  tooling/process; only essential complexity earns a carve-out (Brooks).
- **Deep vs shallow module** — simple interface hiding real work, vs an
  interface about as complex as what it hides (Ousterhout).

## Worked example (compressed)

Frame: *inter-service comms for the new bot backend; constraint = it's one
Python bot + one Go core, low volume now, team of one.*

| | REST/JSON | gRPC | Kafka events |
|---|---|---|---|
| Reversal | + easy | ~ proto lock-in | − schema+topic lock-in |
| Hot-path | ~ | + binary/HTTP2 | − async, not req/resp |
| Op load | + none | ~ buf/codegen | − broker to run |
| Team fit | + | + (stack canon) | + (stack canon) |
| Ceiling | strict-typing pain | fits to mid-scale | needed only for fan-out |

Synthesis: **gRPC.** Stack already blesses it, binary contract fits bot↔core
req/resp, codegen cost is one-time. Kafka is the ceiling marker — adopt when a
third consumer needs the same event, not before. Trip-wire: if the bot ever
needs to *broadcast* state to N services, revisit → events. → ADR.

Note: rubric/angles are general decision-analysis method, not copied from any
one source; synthesized from common architecture-decision practice.
