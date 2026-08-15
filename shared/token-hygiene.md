# Token hygiene — self-audit thresholds for the suite's own files

Applies to `shared/*.md`, every `skills/impulse-*/SKILL.md`, and every
`references/*.md` under them. `authoring.md` says how to WRITE a rule file;
this file says how to tell one has rotted into bloat, with numbers instead
of a feeling. Read this when auditing an existing file, not when drafting
a new one for the first time.

## Named anti-patterns

Each has a concrete trigger and a concrete fix — not "make it shorter."

- **The N-Skill Trap.** Every skill's frontmatter `description` is
  always-loaded context, paid on every turn regardless of whether that
  skill fires. A skill nobody invokes still taxes every session. Fix:
  `impulse-debt`-style periodic sweep — a skill with zero real invocations
  over a tracked period is a candidate for archiving out of `skills/`, not
  a candidate for a better description. Mirrors `authoring.md`'s existing
  "cut skills that don't get invoked" line — this file adds the trigger
  condition, not a new rule.
- **The Rule-File Novel — corrected after testing this file's own claim
  against the corpus.** The first draft of this entry capped `shared/*.md`
  at ~800 tokens. Empirically false: `node scripts/check-token-hygiene.js`
  against the real suite showed every single `shared/*.md` file exceeds
  it, including files with no redundancy (`subagents.md` ~5500 tokens,
  `rule-spine.md` ~3469). The reason: `shared/*.md` isn't always-loaded
  bulk either — it's a pointed-to protocol doc, same tier as a per-skill
  `references/*.md` file, just shared across more than one skill. The
  actually always-paid surface is narrower than either: every skill's
  frontmatter `description` (paid every turn regardless of trigger —
  `authoring.md`'s "Load accounting" section, enforced mechanically by
  `check-skills.js`'s router cap) and the compact ruleset injected by
  `hooks/impulse-instructions.js` on `SessionStart` (paid once per
  session when impulse is active). A deep `shared/*.md` or
  `references/*.md` file is fine on its own length — the failure mode
  this pattern actually names is a fact or instruction that SHOULD live
  in the on-demand layer leaking into the always-paid one (a bloated
  frontmatter description, or `impulse-instructions.js` growing past what
  a compact ruleset needs) — check those two surfaces specifically, not
  reference-file line counts.
- **The Unscoped Rule.** Applies to content actually injected
  unconditionally — a compact-ruleset entry in `impulse-instructions.js`,
  or a frontmatter description with no real trigger. A protocol doc
  (`shared/*.md`, any `references/*.md`) doesn't need its own internal
  fires/skips table to be "scoped" — being pointed to by name from a
  specific skill/section already is the trigger; forcing every deep
  reference doc to restate its own applicability (`context7.md`'s table
  makes sense there because context7 usage cuts across unrelated tasks
  and the ambiguity is real) is busywork, not hygiene.
- **The Duplication Sediment.** Same fact stated in two files that drift
  apart over time (`authoring.md`'s load-accounting section already names
  this as "duplication"). Concrete tell: grepping a fact's keyword returns
  more than one file that isn't a deliberate pointer ("see X for the full
  rule").

## Cheap-default, expensive-opt-in

Any reference doc that tells an agent to shell out to a CLI or API with
multiple output-verbosity modes: state the cheap mode as the default and
require a one-line reason to escalate to the expensive one. Example shape
(not a real flag in this suite yet, illustrative): "prefer `--summary` over
`--full`; escalate only when the summary didn't answer the question." A
tool that silently defaults to its most expensive mode is spending the
user's tokens on ceremony they didn't ask for.

## Compress-then-verify, never compress-and-trust

When a rule file or memory note is condensed for length, the compression
pass must not grade its own work. Two-step discipline:

1. Before touching the file, enumerate its atomic facts/rules/examples as a
   checklist (one line each).
2. After condensing, re-check the new text against that same checklist —
   every item still present, in substance, or the item's loss is called out
   explicitly. A silent drop is the failure mode, not a shorter file.

If the checklist can't be re-verified in the same pass (long file, no
budget to re-derive it), don't compress opportunistically — flag it as a
candidate for a dedicated pass instead. Cutting a rule nobody will notice
is missing until it's needed again is worse than leaving the file long.

## Never load raw bulk data into context

Applies to any skill or subagent touching logs, CSVs, large query results,
or many-file sweeps: process/filter/paginate outside the model's context
(a script, `grep -c` before `grep`, `--offset`/`--limit`) and return a
summary or a bounded slice, never the raw bulk. `authoring.md`'s script
rules already require "predictable output size" for scripts in `scripts/`
— this is the same discipline applied to ad-hoc Bash during a task, not
just checked-in tooling.

## Sources

Patterns re-expressed from third-party repos (no third-party rule text
reproduced) — see README Lineage.
