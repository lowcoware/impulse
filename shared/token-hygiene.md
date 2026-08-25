# Token hygiene — self-audit thresholds for the suite's own files

Applies to `shared/*.md`, every `skills/impulse-*/SKILL.md`, and every
`references/*.md` under them. `authoring.md` says how to WRITE a rule file;
this file says how to tell one has rotted into bloat, with numbers instead
of a feeling. Read this when auditing an existing file, not when drafting
a new one for the first time.

## Named anti-patterns

Each has a concrete trigger and a concrete fix — not "make it shorter."

- **The N-Skill Trap:** every skill's frontmatter `description` is
  always-loaded context, paid on every turn regardless of whether that
  skill fires — a skill nobody invokes still taxes every session.
  Fix: run an `impulse-debt`-style periodic sweep; a skill with zero real
  invocations over a tracked period is a candidate for archiving out of
  `skills/`, not a candidate for a better description. (Mirrors
  `authoring.md`'s existing "cut skills that don't get invoked" line —
  this file adds the trigger condition, not a new rule.)
- **The Rule-File Novel:** length limits do not apply to `shared/*.md` or
  `references/*.md` files — they are pointed-to protocol docs, not
  always-loaded bulk, so a deep single-topic file is fine at any length.
  The two surfaces that ARE always-paid, and worth auditing for bloat,
  are every skill's frontmatter `description` (paid every turn regardless
  of trigger — `authoring.md`'s "Load accounting" section, enforced by
  `check-skills.js`'s router cap) and the compact ruleset injected by
  `hooks/impulse-instructions.js` on `SessionStart` (paid once per
  session when impulse is active).
  Fix: when auditing for bloat, check only those two always-paid
  surfaces — a bloated frontmatter description, or
  `impulse-instructions.js` growing past what a compact ruleset needs —
  never a reference file's line count.
  Why: an earlier draft of this entry capped `shared/*.md` at ~800
  tokens; `node scripts/check-token-hygiene.js` against the real suite
  showed every single `shared/*.md` file exceeds it even with no
  redundancy, so the cap was dropped.
- **The Unscoped Rule:** a protocol doc (`shared/*.md`, any
  `references/*.md`) doesn't need its own internal fires/skips table to
  be "scoped" — being pointed to by name from a specific skill/section is
  already the trigger.
  Fix: only require a fires/skips table for content actually injected
  unconditionally (a compact-ruleset entry in `impulse-instructions.js`,
  or a frontmatter description with no real trigger). `context7.md`'s
  table is the correct exception: context7 usage cuts across unrelated
  tasks and the ambiguity there is real, so forcing every OTHER deep
  reference doc to restate its own applicability is busywork, not
  hygiene.
- **The Duplication Sediment:** the same fact stated in two files can
  drift apart over time (`authoring.md`'s load-accounting section already
  names this as "duplication").
  Fix: grep the fact's keyword; if more than one file matches and it
  isn't a deliberate pointer ("see X for the full rule"), merge into one
  file.

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
pass must not grade its own work:

1. Before touching the file, enumerate its atomic facts/rules/examples as
   a checklist (one line each).
2. After condensing, re-check the new text against that same checklist.
3. Every item still present in substance, or its loss called out
   explicitly — a silent drop is the failure mode, not a shorter file.
4. No budget to do steps 1-3 for this file right now: don't compress it.
   Leave it long and flag it as a pending compression candidate instead.
   Cutting a rule nobody will notice is missing until it's needed again
   is worse than leaving the file long.

## Filter bulk data outside context before returning it

Process, filter, or paginate logs, CSVs, large query results, and
many-file sweeps outside the model's context (a script, `grep -c` before
`grep`, `--offset`/`--limit`) and return only a summary or a bounded
slice. Applies to any skill or subagent touching this kind of data —
`authoring.md`'s script rules already require "predictable output size"
for scripts in `scripts/`; this is the same discipline applied to ad-hoc
Bash during a task, not just checked-in tooling. Raw bulk data reaching
context is the failure this catches.

## Before finishing an audit, check

1. Did you check only frontmatter descriptions and
   `hooks/impulse-instructions.js` for always-loaded bloat, not
   reference-file line counts?
2. Does every bullet flagged as a duplicate have a real second file,
   confirmed by grep, not just a guess?
3. If anything was compressed, was it re-checked against its original
   fact list?
4. Are fixes stated as actions to take, not just problems named?

## Sources

Patterns re-expressed from third-party repos (no third-party rule text
reproduced) — see README Lineage.
