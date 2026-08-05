# MOC: Reference

Navigation hub for the impulse suite's deep-dive wiki — start here, every
other page links back to this one.

## Orientation
- [[Home]] — what the suite is, current focus.
- [[Getting-Started]] — install it and run your first `/impulse-help`.

## System
- [[Architecture]] — how the 22 skills, `shared/`, and the three check
  scripts fit together, with a real excerpt from `check-skills.js`.

## Modules
- [[module-impulse-goal]] — the execution engine, with a real excerpt
  from `claim-run.sh`'s atomic run-directory claim.
- [[module-impulse-wiki]] — this skill itself, with a real excerpt from
  `gather_data.py`'s MOC-extraction logic.

## Decisions
- [[Decisions]] — the reference-artifact directive (ADR-001) as it landed,
  and what it changed.

Rebuild trigger: a new module page is added when a skill gains a
significantly new capability (not on every commit); `Decisions.md` gets
one new line per landed ADR.
