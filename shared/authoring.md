# Authoring impulse skills — craft notes

Read before writing or editing any SKILL.md / reference. Distilled from
tested practice (obra/superpowers writing-skills, anthropics/skills
skill-creator — MIT, re-expressed) + this suite's own conventions.

## Match the form to the failure

Classify HOW the model fails before choosing how to write the rule:

| Failure mode | Right form | Wrong form |
|---|---|---|
| Skips a step under pressure ("just this once") | Prohibition + the exact rationalization it will use, named | Gentle recipe |
| Output has the wrong SHAPE (structure, tone, layout) | Positive recipe/template showing the target | Prohibition list |

Documented A/B result (this suite's own, no external citation found for the
specific claim): prohibition-worded guidance on a shaping problem produced
MORE of the unwanted output than no guidance. Ban-tables (ai-tells) work
because those are skip/temptation failures; templates (Design Read, spec
template) work because those are shape failures. Don't mix the forms.

External research adds a narrower, general-purpose data point that's
consistent with this but not identical: LLMs find affirming "yes" harder
than "no" (a training-corpus frequency artifact), and industry practice
recommends positive framing ("use real data") over negative ("don't use
mock data") to dodge the Pink Elephant problem — negating a concept doesn't
suppress it, it re-activates it. This argues FOR positive framing as the
general default, same direction as this file's shape-failure row; it does
NOT contradict the skip/temptation row, because naming the exact
rationalization ("just this once") is doing something different — killing a
specific known excuse, not describing an unknown target shape. Both claims
can be true; they answer different questions.
[Yes is Harder than No: framing effects in LLMs, ACM CIKM 2026](https://dl.acm.org/doi/10.1145/3746252.3761350)

## Description = triggers only

The frontmatter `description` states WHEN to fire — never a workflow
summary. Documented bug: a description summarizing "does one review
between tasks" made the agent follow the summary and skip the second
review the body required. Body owns behavior; description owns routing.
Keep triggers pushy (models undertrigger), RU+EN, no angle brackets,
≤1024 chars.

## Write-correctness laws

From breferrari/obsidian-mind (MIT), re-expressed. Each law exists because its
absence caused real correction work. They govern any durable written artifact —
a SKILL.md, a reference, a generated doc, an ADR.

1. **Single-source status.** A volatile fact (version, count, released/blocked,
   date) lives in exactly ONE place. Everything else links to it and never
   restates it. *Why: one wrong status hardened into ~8 downstream notes and
   had to be swept out by hand.*
2. **Correction-sweep protocol.** When a fact is corrected, grep for every
   restatement and fix them all in the same pass. A correction notice on top of
   a doc whose body still says the wrong thing is NOT a correction — the next
   session re-absorbs the error from the body.
3. **Mark inference.** Anything not verified against source (code, repo,
   primary doc, the person) carries `(TBC)` / `(unverified)` / `(inferred)`.
   Never state inference bare.
4. **Date-stamp volatile facts.** Counts, versions, tool maturity, org shape:
   write "as of YYYY-MM-DD" so staleness is self-evident instead of silent.
5. **No counts in instruction files.** Hardcoded counts ("22 skills", "four
   companions") rot silently — describe, don't count. Where a count must exist,
   generate it. *Observed here: the README companion list said "four things"
   and went stale the moment a fifth was added.*

## Size discipline

Router SKILL.md ≤150 lines (our cap; spec ideal is <500 — we're stricter).
References ~120 lines as a DRAFTING target — split by domain when a file
outgrows one sitting. Not a rot threshold to audit against: a shipped
reference legitimately deep on one topic is fine at any length
(`token-hygiene.md`'s corrected Rule-File Novel entry owns that
distinction — the always-paid surface is what gets the hard numbers). Scripts in `scripts/` are black boxes — invoked, never loaded
into context; a reference that walks through an algorithm step-by-step
should usually be a script instead.

Script rules for agent use: zero interactive prompts (hard requirement —
a prompt hangs the agent), `--help` is the primary doc, results to
stdout / diagnostics to stderr, meaningful exit codes, `--dry-run` on
anything destructive, and predictable output size (summarize by default,
`--offset`/`--output file` when output can blow past harness truncation).

Two more cut/keep heuristics: the cut test — "would the agent get this
wrong WITHOUT the line?" (sharper phrasing of no-op); and prefer
reasoning-form rules ("X because Y") over bare ALWAYS/NEVER — the model
generalizes the reason to cases the directive didn't enumerate.
Environment-specific gotchas (facts that defy assumption) stay INLINE in
SKILL.md, not in a reference — they're exactly what won't be looked up.

## Test wording before trusting it

Changed a rule's wording? Cheap check before shipping: run the scenario on
a fresh context WITH the rule and WITHOUT (control), few reps, read the
outputs yourself — don't just count keyword hits. High variance between
reps = the wording is unclear, not the model. `node scripts/check-skills.js`
lints the mechanical layer (frontmatter schema, caps).

For discipline rules (the skip-under-pressure kind), test under PRESSURE,
not in the classroom: force an explicit A/B/C choice (never "what would
you do"), concrete stakes (file paths, money, deadlines), 3+ stacked
pressures (time + sunk cost + authority), no easy outs. Then meta-test the
failure: ask the agent "how should the rule have been written so the right
option was the only acceptable one" — the answer sorts into
strengthen-the-principle / add-the-missing-sentence / reorganize. Framing
that measurably raises compliance: authority (cite the incident) +
commitment (make the agent state the plan first) — not politeness.

## The no-op test

Every rule line: does it change behavior vs what the model does by
DEFAULT? "Be thorough" = no-op (already thorough-ish); "every modified
model accounted for" = binds. A line can be relevant and still be a no-op
— you pay context for zero steering. Model-relative: settle disagreement
by running the skill, not by debate.

## Completion criteria — two independent axes

1. **Clarity** — can the agent tell done from not-done? A vague bound
   ("understanding reached") invites premature completion: attention slips
   to being done. Sharp bound first — it's local and cheap; hide
   later steps only if the criterion is irreducibly fuzzy AND the rush is
   observed, and hiding only works across a real context boundary
   (subagent dispatch), not an inline mention.
2. **Demand** — how much the criterion requires. This is what drives
   exhaustive legwork, and it binds flat reference too: "every rule
   applied" gives a checklist-skill its coverage bar without any steps.

## Leading words

A pretrained concept-token ("tracer bullets", "fog of war", "relentless")
recruits the model's priors free — one word anchors a behavior region that
a made-up term needs paragraphs to define. Grade leading words with the
no-op test: too weak to beat the default ("be thorough") → stronger word,
not more sentences. Description wording = the leading words you actually
type when you want the skill.

## Load accounting + pruning

Description = permanent per-turn context cost — that's the real price of
model-invocation, weigh it per skill. Three distinct fat-failures: sprawl
(length itself), duplication (one meaning, two homes — change one, forget
the other), sediment (stale layers nobody dares remove). And the hard
lesson from a good author's changelog: cut skills that don't get invoked,
however well-written.

## Reference links carry their own load condition

Every `references/*.md` link inside a SKILL.md body states, inline, WHEN
to load it — not just its filename. `[Pull Requests](references/pull-
requests.md) — load for PR inspection, changed-file completeness, review
comments, checkout, review, or merge` lets the agent skip a load it
already knows doesn't apply, instead of opening the file to find out. A
bare filename list forces a load-to-check; an annotated one doesn't.

## Filler files to never create

Don't create `README.md`, `QUICKSTART.md`, `CHANGELOG.md`, or
`INSTALL_NOTES.md` inside a skill directory unless the skill is explicitly
about authoring/installing something — `SKILL.md` plus `references/` is
the complete surface. A skill-local README nobody reads is pure token
weight with no routing value; the suite-level `README.md`/`CHANGELOG.md`
already own that role.

## Gating language — reusable phrase bank

For the skip/temptation row of the form-to-failure table above, don't
reinvent gate wording per skill — reuse the phrasing pattern:

- `Do NOT continue until all required inputs are collected.`
- `If validation fails, report the failure, identify the cause, and stop.`

Consistent gate phrasing across skills means an agent that has learned to
respect the pattern in one skill respects it everywhere, instead of
re-parsing a novel formulation each time.

## Self-audit before shipping a rule file

`node scripts/check-skills.js` lints the mechanical layer; it does not
score token economy. Before shipping a new/edited `shared/*.md` or
`references/*.md`, check it against `token-hygiene.md`'s named
anti-patterns by hand — no fact duplicated elsewhere, a fires/skips table
if the rule is genuinely conditional across unrelated tasks. Treat a file
that fails its own hygiene check as unshipped, the same way a router over
150 lines is. `node scripts/check-token-hygiene.js` mechanizes the two
parts of this that ARE reliably checkable from repo state — the
always-paid surface (skill description char count, `impulse-
instructions.js` size) and cross-file word-overlap duplication — run it
before shipping; it's advisory (never fails CI), read its output.

## Lineage hygiene

Every externally-sourced pattern: re-express in our words, attribute in
README Lineage, never paste verbatim from tuned third-party rule text.
