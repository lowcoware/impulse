# ADR lifecycle — for agent-drafted, human-decided architecture

## When an ADR is warranted

A decision earns an ADR when it has real blast radius: a cross-service
contract, data ownership, a dependency swap affecting more than one
service, a decision future work will assume without re-litigating. Not
warranted: implementation details reversible in one PR, anything already
covered by an existing ADR (record a supersede instead of a new one), a
decision the ladder/baseline already makes for you (those aren't decisions,
they're defaults).

Sharper 3-condition test — write one only when ALL three hold: hard to
reverse, surprising without context, the result of a real trade-off. And
an ADR can be 1-3 sentences — the template below is a ceiling, not a
form to fill; a lean ADR that gets written beats a thorough one that
doesn't. Grounding for the lean-over-thorough bias: an action-research
study found ADRs measurably improved team cooperation once adopted, but
also found industrial adoption stays inconsistent specifically because
of the tension between documentation overhead and agile pace — the
lighter the format, the more likely it survives contact with a real
sprint. Where teams do run ADR discussions, keeping them to 30-45 minutes
max is the reported sweet spot; longer sessions are where ADR practice
tends to die from friction, not from the decisions being unimportant.
[TechTarget: ADR best practices](https://www.techtarget.com/searchapparchitecture/tip/4-best-practices-for-creating-architecture-decision-records)

## Who writes what — the human/agent split

1. **Agent drafts.** Given a decision that needs one, the agent researches
   the codebase for the actual alternatives, scans for constraints, and
   writes a full first-draft ADR — Context, Decision, Alternatives,
   Consequences.
2. **Human decides.** The ADR is marked `accepted` only on explicit human
   sign-off — never auto-accepted because the agent wrote a confident
   draft. This is the one place in this skill where "the agent is
   confident" is explicitly not sufficient.
3. **Agent enforces afterward.** Once accepted, an agent touching code the
   ADR governs checks it first (`Consult before touching governed code`,
   below) — the ADR becomes a constraint the agent respects, not just a
   record it wrote once.

## Before vs after implementation

Write it *before* implementation when the decision is foreseeable at plan
time (the spec's Plan stage already names it). Write it *after*, but before
merge, when the decision emerged during implementation and wasn't
foreseen — never skip it because implementation is already done; an
undocumented decision an agent made mid-implementation is exactly the
"agent silently violates unstated architecture" failure mode this whole
practice exists to prevent.

## Consult before touching governed code

Before an agent edits a file/module an ADR explicitly governs (named
services, named patterns, named boundaries), it checks the active ADR
index first — a binary consistent/violates check collapses several
genuinely different situations into one, so classify the change instead:

- **Correction.** The implementation doesn't actually match an existing
  ADR (a bug — the code drifted, the decision didn't). Fix the code; the
  ADR doesn't change.
- **Refinement.** Consistent with a past decision, adds detail or
  observability without changing the underlying judgment. Note it
  against the existing ADR (a one-line addendum), no new record needed.
- **Conflict.** Contradicts a past decision made deliberately in the
  other direction. Never silently overwrite — Chesterton's Fence
  applies: don't tear down a decision until you understand why it was
  made. Stop, cite the conflicting ADR's ID, escalate to the human.
- **New requirement.** Genuinely uncovered territory, nothing on record
  either way. Proceed, and flag it for a new ADR per the "when an ADR is
  warranted" test above.
- **Rejected — again.** Already considered and rejected once (or
  violates a still-accepted decision by construction). Reject again,
  **citing the original ADR as evidence** — a bare "no" doesn't prevent
  the same request resurfacing next month with nothing on file to point
  at. This is the case a binary check most often gets wrong: it either
  silently re-litigates a settled question, or blocks with no paper
  trail explaining why.

The two splits a binary check can't express: Correction vs. New
requirement (the ADR already covers this and the code hasn't caught up,
vs. genuinely new ground), and Conflict vs. Rejected (conflicts with a
*different* past decision and needs human judgment, vs. *this exact
request* was already litigated and doesn't need re-deciding, just
re-citing).

**The failure mode this whole step exists to prevent is forgetting to
check at all** — an agent that doesn't remember a file is ADR-governed
never runs the classification above. Where the ADR index supports it,
prefer a reverse lookup (given this file/module, what governs it?) over
relying on the agent recalling which files are governed — a query
removes the "did I remember to check" step entirely instead of asking
the agent to remember it every time. Keep any such lookup scoped to
*direct* governance only (an ADR naming this exact file/module) — don't
infer transitive governance (an ADR about a dependency of this file)
automatically; that inference is exactly the kind of judgment call that
belongs to the human-decides step, not a mechanical index.

## Template

```markdown
# ADR-<NNN>: <decision, as a noun phrase>

## Status
proposed | accepted | rejected | superseded by ADR-<NNN>

## Context
What's forcing this — an incident, a constraint, a scaling number. Not
"as the system grows in complexity."

## Decision
Stated flatly, one paragraph.

## Alternatives considered
Each alternative, one line: what it was, why it lost. Not an essay per
option.

## Consequences
The honest tradeoff — what this costs, not just what it buys. An ADR that
only lists benefits reads like marketing, not a decision record.

## Links
Depends-on / Used-by / Related specs / External sources
```

Formatting/rendering (properties, wikilinks between ADRs, callouts) is
`impulse-md-generator`'s job — this template is content structure only.

**Where tooling supports it, prefer mechanically-owned mechanics over
convention-owned ones** — number assignment, status field, frontmatter,
and index entries generated by a script/CLI rather than hand-typed by the
agent. The agent's job is the prose (Context, Decision, Alternatives,
Consequences) — the judgment call; the deterministic fields around it
are exactly the kind of thing that drifts when left to convention
(a duplicate number, a status typo, an index that falls out of sync).
Not a requirement to build tooling for this — a hand-maintained ADR set
with careful numbering discipline works fine at small scale — but when a
project already has the tooling, let it own the mechanics and keep the
agent's attention on the parts a script can't judge.

## Numbering and supersede

Sequential, project-scoped (`ADR-014`), never reused even for a rejected
ADR — a rejected ADR stays in the index as a record that the option was
considered, marked `rejected`, not deleted.

A later ADR relating to an earlier one uses one of three typed relations,
not a single generic "supersedes" — the type is the information a reader
needs to know whether the old ADR still applies at all:

- **Supersede** — the old decision fully expires; the new one replaces it
  outright. `status: superseded by ADR-NNN` on the old one.
- **Amend** — a partial revision; the old ADR stays live for everything
  it didn't change. Cite the amendment in the old ADR's Links, don't mark
  it superseded (that would wrongly suggest the whole thing is void).
- **Exception** — a conscious, bounded carve-out from a general rule for
  one specific case; the general rule stays fully live everywhere else.
  Never marked superseded — an exception ADR that gets filed as a
  supersede reads as "the rule changed" when it didn't.

**Retrofit check when a rule itself changes:** when an ADR amends or
supersedes a broad governing principle (not a narrow local decision),
diff the existing ADR set against the new rule and attach a note listing
which prior-accepted ADRs now read as violations of it. An agent treats
old accepted ADRs as few-shot examples of "how we decide here" — an
unflagged violation left in the record gets silently reproduced the next
time a similar decision comes up.

## Decision-set integrity — health checks on the ADR set as a whole

Everything above is per-ADR lifecycle. A set of ADRs also has health
properties as a WHOLE that per-ADR review doesn't catch:

- **Provenance integrity.** An ADR's Links section citing an ADR ID or
  source file that doesn't actually exist is a fabricated-provenance
  bug, not a formatting nit — it means a future reader (human or agent)
  trusts a citation that leads nowhere. Worth a periodic mechanical
  check (grep every cited ADR-NNN/file path against what's actually on
  disk) rather than assuming citations stay valid forever.
- **Staleness.** An `accepted` ADR whose governed code has moved
  significantly in git since the decision was recorded may no longer
  reflect what's actually true — flag it for re-confirmation rather than
  leaving it silently stale. When re-confirmed, record the
  re-confirmation date explicitly (don't just silently re-date the
  original ADR) so staleness re-triggers on the NEXT change instead of
  being permanently suppressed by one acknowledgment.
- **Anchoring rate.** What fraction of `accepted` ADRs actually cite a
  real, still-existing code path in their Links, versus how many are
  pure prose with nothing concrete backing them? A set trending toward
  low anchoring is a set drifting away from the code it's supposed to
  govern — worth surfacing as a number during a periodic ADR-set review,
  not just judging each ADR individually.

## Propagate the decision

Accepting an ADR isn't the end of the work. A short, explicit checklist
runs immediately after acceptance:

1. Does any existing doc (service README, another ADR's Consequences)
   need a one-line update to stay consistent?
2. Does the change belong in the day's changelog entry
   (`playbooks.md`'s update-changelog)?
3. Is there code already violating the new decision that now needs a
   tracked cleanup task — not a silent, unplanned refactor bundled into an
   unrelated diff?

Skipping this step is how an ADR becomes true on paper and false in the
codebase within a month.
