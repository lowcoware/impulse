# Blast-radius assessment — before touching unfamiliar code

The workflow `impulse-backend/references/ladder.md`'s "grep every caller"
rule already gestures at, expanded into the full sequence — independently
convergent with industry practice (Feathers, blast-radius tooling), not
just internal doctrine. Not just "feels more careful": organizations
running dependency-blind change processes report 8-12 breaking changes per
quarter with ~30% of API changes needing a rollback; organizations with
live dependency awareness (this six-step assessment IS that awareness,
done manually) report 0-1 breaking changes per quarter and ~5% rollbacks.
Timing matters as much as the method: blast-radius scoping belongs at the
START of the change process, before a migration or schema change is
approved — not as a post-incident retrospective activity, which is where
teams without this habit usually first encounter the concept.
[Sweep: what is impact analysis, practical guide](https://www.sweep.io/blog/what-is-impact-analysis-a-practical-guide)

## The six steps

1. **List changed symbols**, not files — the actual functions, exported
   types, routes, schema fields the change touches. A file can hold ten
   unrelated symbols; the blast radius is per-symbol.
2. **Grep every direct caller/importer** of each changed symbol. Not "look
   around the file" — an actual search across the whole repo (and every
   repo, in a polyrepo, if the symbol crosses a contract boundary).
3. **Walk one level deeper** — who calls the callers, and what test
   coverage actually exists on that path (not just "there's a test file
   for this module somewhere").
4. **Per dependent, ask**: what breaks if this throws? Changes shape?
   Returns null where it used to return a value? Gets slower?
5. **Classify the change**: easy/hard/impossible to roll back. A change
   behind a feature flag is easy; a schema migration already applied in
   production is hard; a message already published to Kafka is impossible.
6. **Size the review to the blast radius, not the diff size.** A
   three-line change to a widely-called function needs more scrutiny than
   a 200-line addition to a brand-new, uncalled module.

## Feature flags — capping exposure of a risky change

The standard way to limit blast radius on something genuinely risky: ship
dark (flag off, code deployed but inert) → enable for a slice (one
tenant, one percent, internal only) → monitor → expand. This pairs
naturally with `strangler-fig.md`'s gradual-routing idea — same mechanism,
different name depending on scale (one function vs. one whole service).

## Rollback classification, concretely

| Class | Example | Implication |
|---|---|---|
| Easy | Feature-flagged code path, unreleased | Revert the flag, done |
| Medium | Deployed code, no data shape change | Revert the deploy |
| Hard | Schema migration already applied | Needs a down-migration, may lose data written under the new shape |
| Impossible | Event already published, external system already notified | No technical rollback — only a compensating action forward |

Classify BEFORE making the change, not after something goes wrong — this
determines how much review/testing the change earns, same principle as
`impulse-project-management/references/review.md`'s Ship-Show-Ask tiering.

## Why this matters more for an agent than a human

A human working in unfamiliar code has ambient caution from knowing they
don't know the system. An agent's confidence doesn't naturally track its
actual understanding — a plausible-sounding diff can come from genuinely
tracing the blast radius or from pattern-matching what similar code
usually looks like, and those look identical in the output. The six-step
sequence above is the forcing function that makes the difference visible:
if step 2 (grep every caller) wasn't actually done, that's discoverable by
asking "show me the callers you checked," not by reading the diff's
confidence level.
