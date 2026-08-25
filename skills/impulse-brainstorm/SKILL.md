---
name: impulse-brainstorm
description: "Structured pick-an-approach session before writing code — use BEFORE committing to the first idea on any hard-to-reverse fork: tech choice, data-model shape, sync-vs-async, monolith-vs-split, schema, service boundaries. Triggers: \"/impulse-brainstorm\", \"how should I build X\", \"which approach\", \"design decision\", \"накидай варианты\", \"как лучше сделать\", \"какой подход\", \"выбор архитектуры\", \"развилка\". Bare \"варианты\" / \"trade-off\" are NOT triggers — too common in ordinary talk; the fork has to be named. Deciding between approaches = here; recording an already-made decision as ADR or turning it into a spec = impulse-project-management."
---

# impulse-brainstorm

Beat the first-idea trap. When a decision is hard to reverse (schema, service
boundary, protocol, data flow), one attempt-then-iterate loses to a short
panel of independent approaches scored against the actual constraints. This is
a thinking discipline, not a code skill — output is a decision, not a diff.
The one rule that carries the rest: three genuinely different approaches,
scored against named constraints, land as ONE recommendation — never a
survey with no pick.

## When it fires

- Fork with a **hard-to-reverse cost**: DB schema, service split, sync/async,
  transport (REST/gRPC/events), storage engine, auth model.
- The obvious first answer is one of several and you can't yet say why it wins.

Skip the panel for reversible one-liners, or forks the ladder already answers
(YAGNI → reuse → stdlib → platform-primitive → dep) — cheap-to-change → just
build it.

## The loop

1. **Frame** — one sentence: the decision + the hard constraint that dominates
   it (latency? consistency? team size? reversal cost?). No frame → no panel.
2. **Diverge** — generate **3 genuinely different** approaches from distinct
   angles (e.g. simplest-that-works / scale-first / boring-proven). Not three
   flavors of the same idea. Each gets: mechanism, what it's good at, its
   failure mode, its `impulse:` ceiling (when it stops scaling).
3. **Score** — table each approach against the constraints that actually
   matter for THIS decision (see `references/panel.md` for the rubric). Score
   the constraints, not vibes. Call ties ties.
4. **Synthesize** — pick the winner, graft the best idea from a runner-up if
   it's free, name what would flip the choice (the trip-wire). One paragraph.
5. **Land** — if the decision is architectural, it becomes an ADR
   (`impulse-project-management/references/adr.md`). Otherwise a `impulse:` marker.

Full rubric, anti-patterns, worked example: `references/panel.md`.

**Fork is specifically "should we rewrite/replace X with [language/tool/
runtime]"** (not a general architecture fork) → run `references/rewrite-decision.md`
instead of the generic Diverge/Score above — it's a specialization tuned
for the hype-vs-nostalgia bias this exact fork shape tends to carry.

## Hard rules

1. **Three real alternatives or it's not a panel.** One idea dressed three
   ways is theater — say "obvious, just build it" instead and skip the ritual.
2. **Score against named constraints**, never adjectives. "Cleaner" is not a
   score; "1 fewer network hop on the hot path" is.
3. **Every approach ships its failure mode + ceiling.** An approach with no
   downside is an approach you don't understand yet.
4. **Recommend, don't survey.** End with ONE choice and the trip-wire that
   flips it. A menu with no pick is a dodge.
5. **Match effort to reversal cost.** Two-way-door decision → one line, move
   on. One-way-door → full panel. Reserve the full panel for decisions a
   `git revert` can't undo.
6. **The panel runs in ONE context.** Three approaches are three paragraphs,
   not three agents. Spawn a subagent per approach only on a genuine one-way
   door where the inline attempts keep converging on the option you already
   wanted — each spawn copies the context and re-pays the ruleset injection.
   See `references/panel.md`; dispatch mechanics (brief contract, handoff):
   `../../shared/subagents.md`.

## Boundaries

- The decision's *implementation* → the relevant build skill (impulse-backend /
  impulse-frontend / impulse-ai / impulse-mobile).
- Architectural output → ADR via `impulse-project-management`.
- This skill picks what to write; code stays with the build skills.
- "stop impulse" / "normal mode": revert to default behavior.

## Before you finish

- Are there three genuinely different approaches, not one idea dressed three ways?
- Is each approach scored against named constraints, not adjectives?
- Does every approach carry a stated failure mode and `impulse:` ceiling?
- Does the output end with ONE recommendation and a trip-wire, not a menu?
- Was the effort matched to reversal cost (no full panel for a two-way door)?

The load-bearing rule, once more: three real alternatives, scored against
named constraints, landing as one recommendation — never a survey.
