[Русский](CONTRIBUTING.md) · **English**

# Contributing to impulse

Same voice as the skills: terse, verb-level, no marketing language, no
emoji, no unverified claims.

## Add a skill

1. Directory name = skill name: `skills/<skill-name>/SKILL.md`, kebab-case.
2. Frontmatter — agentskills.io spec, only these keys allowed: `name`,
   `description`, `license`, `allowed-tools`, `metadata`, `compatibility`.
   - `name`: <=64 chars, kebab-case, NFKC-normalized, must equal the
     directory name exactly.
   - `description`: <=1024 chars, no angle brackets, **triggers only** —
     state WHEN the skill fires, never a summary of what it does. A
     workflow-summarizing description previously made an agent follow the
     summary and skip a required step; the body owns behavior, the
     description owns routing (`shared/authoring.md`, "Description =
     triggers only"). Keep triggers pushy and bilingual (RU+EN) where the
     rest of the suite does.
3. Router `SKILL.md` <=150 lines — hard cap, enforced by
   `check-skills.js`. Reference files target ~120 lines; split by domain
   before one file outgrows a sitting.
4. Match the rule's form to its failure mode before writing it:
   prohibition (naming the exact rationalization) for skip-under-pressure
   failures, positive recipe/template for shape failures. Don't mix the
   two — `shared/authoring.md` documents an A/B result where a prohibition
   worded against a shape failure produced more of the unwanted output
   than no guidance at all.
5. Cross-references: `references/x.md` within the same skill, or
   `skill-name/references/x.md` / `../../skill-name/references/x.md`
   across skills — both forms resolve. A bare `x.md` mention (no slash)
   must match a real filename somewhere in the suite, or it needs adding
   to the illustrative allowlist in `check-skills.js`.

## External sources

Adapting a pattern from outside this repo: re-express it in the suite's
own words — never paste tuned third-party rule text verbatim — confirm
the source's license actually permits redistribution, and add a row to
README's Lineage table naming what was taken. See `shared/authoring.md`,
"Lineage hygiene."

## No unverified citations

A claim that names something specific — a CVE ID, a library's actual
behavior, a benchmark number, a real incident — must trace to a source
you checked yourself. Can't verify it? Mark it UNVERIFIED and leave it out
of shipped content; don't attach a plausible-looking citation to make a
rule sound more authoritative than it is. This suite's own research pass
already caught and excluded two fabricated citations before they shipped
— the bar is real, not aspirational.

## Before opening a PR

Run all three linters; all three must pass (this is also the CI gate,
`.github/workflows/lint.yml`):

```
node scripts/check-skills.js && node scripts/check-sync.js && node scripts/impulse-debt.js
```

- `check-skills.js` — frontmatter schema, name/dir match, size caps,
  broken router links, cross-reference integrity between reference files.
- `check-sync.js` — catches two kinds of drift. Between
  `hooks/impulse-instructions.js`'s compact rulesets and the SKILL.md sections
  they summarize; and between the builder skills' rules and impulse-review's
  tags — every enumerated rule (frontend hard rules, backend and mobile
  baseline/ladder, the devops numbered references, legacy's steps, security's
  two mistakes) needs a row in `shared/rule-spine.md`, and every tag the spine
  routes to must be defined in impulse-review. A rule with no spine row is
  invisible to review, so the linter fails. `--verbose` prints the per-domain
  counts. Run it after editing either side.
- `impulse-debt.js` — reports `impulse:` ceiling markers repo-wide. A marker
  with no upgrade trigger is rot, not debt — fix it before you ship.

Also required:

- No pictographic emoji anywhere in the diff — code, docs, commit
  messages. CI greps for it across the repo.
- Add an entry to `CHANGELOG.md` under the current version — it is the
  project's single running record.

## Discipline rules and evals

Full eval campaigns are on-demand, not a per-PR requirement
(`shared/evals.md` §4 — running everything on every change is the same
ceremony the ladder forbids in code). But match the minimum to what you
touched:

- Added or reworded a rule a model could skip under pressure ("just ship
  it," time pressure, sunk cost)? Read `shared/authoring.md`'s
  wording-test section; for a genuinely load-bearing discipline rule, run
  one pressure test per `shared/evals.md` §3 — confirm it fails RED
  without the rule, then passes GREEN with it.
- Changed a skill's `description` (routing)? Run a trigger eval per the
  `shared/evals.md` §2 protocol — a labeled query set with near-miss
  negatives and a holdout split (§2.3).
- New skill? `shared/evals.md` §4's table gives the floor: 3 paired
  functional evals plus half a trigger set.

## Review

PRs are read against the same anti-overengineering ladder the suite
teaches (`skills/impulse-backend/references/ladder.md`) — a new skill or
rule earns its line the way a new abstraction earns its line in code.
