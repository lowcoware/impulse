# Playbooks — mechanical procedures, one per trigger event

Each playbook fires on a specific event, does a fixed short sequence, and
stops. None of these decide architecture or write code — that's specs and
the coding skills. Template schemas: `templates.md`. Conventions
(citation discipline, severity triage, stdout/--apply) apply throughout,
not repeated per playbook.

## create-task

Trigger: new unit of work identified, too small to warrant a full spec, or
a spec's decompose step produced children.

1. Dedup-check against active tasks — cite the existing one instead of
   creating a duplicate.
2. Assign an ID per this project's scheme (prefix + number; ask once at
   `init` what prefix a project uses, then reuse it — never invent a
   different scheme mid-project).
3. Fill the task template (`templates.md`). Acceptance criteria must be
   measurable — "fix the bug" isn't one, "returns 404 not 500 on missing
   ID" is.
4. Out-of-scope section is mandatory, not optional — it's what stops scope
   creep during implementation as much as Non-Goals does for a spec.

## update-changelog

Trigger: any externally-visible change lands (per `impulse-backend/references/
git.md`'s "CHANGELOG for everything" rule — same convention, this playbook
is how a PM-level change, not just a code commit, gets one).

1. Map commit types to changelog sections per `impulse-backend/references/
   git.md`.
2. One line, consumer's viewpoint where one exists.
3. Lands in the same unit of work as the change — never a follow-up
   "update changelog" task filed separately.
4. Release cut: `[Unreleased]` → `## [X.Y.Z] - YYYY-MM-DD`; SemVer bump
   inference: `git.md`.

## weekly-checkpoint

Trigger: periodic (weekly by default, adjust per project rhythm).

1. Gather in parallel, not sequentially — separate subagents for: git
   activity since last checkpoint, open blockers/tech debt, external
   dependency health (any blessed dep with a known issue), compliance
   status (`/impulse-review` debt aggregate, `/impulse-debt` ledger).
2. Roll up into a traffic-light status (green/yellow/red) per area, not
   one project-wide number — a red backend and a green frontend is
   different information than "yellow overall."
3. Near a real deadline: an explicit GO/NO-GO checklist, not a status
   report — the checkpoint's job changes shape when a date is close.

## retrospective

Trigger: end of a work cycle (sprint-as-reporting-period, or a spec
cluster wrapping up) — **always runs, by default, not opt-in.** Skipping
it requires an explicit stated reason, never a silent default or "nobody
asked for one." For a genuinely unattended/autonomous cycle with no
human present to facilitate, still write a minimal record — an empty
findings list with an explicit `autonomous; no facilitator invoked`
marker — rather than either skipping the ritual or fabricating rich
content that wasn't actually observed. Same never-invent discipline
`conventions.md`'s citation rule already requires, applied to this
ritual's unattended-run edge case specifically.

1. Gather in parallel: planned vs. actual vs. discovered — three separate
   subagent passes, not one pass trying to remember all three.
2. Specificity is mandatory. "Everyone did great" is not a retro finding;
   a named cause and effect is ("the payment spec blocked on an
   undocumented Traefik middleware quirk, cost 2 days").
3. Action items get IDs and must be traced into the next cycle's plan —
   an action item that isn't picked up next cycle is a retro that didn't
   close the loop, which makes the whole ritual theater.
4. **A failure that generalizes gets promoted past a one-off action
   item.** Most retro findings are specific to one cycle and stay as
   action items. When a finding names a REASONING error, not just an
   outcome ("the agent assumed the migration was additive without
   checking" — the causal mistake, not just "the migration broke prod"),
   and it's the kind of mistake that could recur on unrelated work, write
   it as a standing negative constraint ("never assume a migration is
   additive without checking for existing NOT NULL columns") in the
   project's constitution/conventions doc, not just as an action item
   that expires once addressed. A negative constraint gets consulted
   before future proposals, the same way `adr.md`'s governed-code check
   works — a one-off action item doesn't get re-checked once closed.
5. Two distinct artifact types come out of a retro, not one blended note:
   a **narrative handover** (this cycle's session record — append-only,
   never edited, kept even after superseded, since the reasoning behind a
   past decision is worth more than just its latest restatement) and a
   **tagged lesson** (a durable, reusable pattern — "this quirk always
   bites X," "this tool always needs Y" — searchable and re-affirmable:
   when a lesson proves true again, note the reaffirmation rather than
   writing a near-duplicate lesson). Blending them into one note makes
   the durable pattern hard to find later inside a pile of one-off
   session summaries.
   **Where they live — one home each, never both.** If the project runs
   the `shared/memory.md` tier convention, the handover IS the Tier 2
   session entry and the lesson IS a Tier 3 note — do not also write them
   as separate docs-tree files. Without the memory convention, both go in
   the project's docs tree as this playbook's artifacts. Either way the
   content exists ONCE; the other location at most points to it (the
   duplication-sediment rule in `shared/token-hygiene.md`, applied here).

## triage-incoming-request

Trigger: any inbound request that doesn't already have an obvious home —
the front door for everything else in this skill.

| Request looks like | Route to |
|---|---|
| A defect in shipped behavior | create-task (bug) |
| A new capability | spec-driven.md (new spec) |
| "Should we do X or Y architecturally" | adr.md, if blast radius is real |
| "What's the status of X" | weekly-checkpoint's last output, or a fresh status pull |
| A complaint about process/quality | retrospective's next occurrence, or immediate escalation if urgent |
| A partner/external update | update-changelog if user-visible, else a task |

Classify in-scope vs. deferred explicitly — a deferred item goes to
post-launch-roadmap, not silently dropped.

## post-launch-roadmap

Trigger: periodic, or after a major milestone ships.

1. Aggregate deferred scope from three sources: ADRs' Consequences
   sections naming future work, specs' Non-Goals sections, and triage's
   deferred pile.
2. Organize into time-boxed rounds, each with an owner, dependencies, and
   the concrete artifact that closes it (a spec, an ADR, a task) — a
   roadmap item with no artifact attached is a wish, not a plan.
3. This is explicitly project-agnostic — the original mechanism was tied
   to one project's launch deadline; generalize the trigger to "after any
   major milestone," not a fixed calendar date.

## resolve-pr-feedback

Trigger: a PR has review comments, merge conflicts, failing checks, or needs
a monitored follow-up. From nexu-io/open-design pr-feedback-quality-gate
(Apache-2.0), re-expressed.

1. Inspect PR state first: comments, reviews, mergeability, checks, local
   worktree status. Unrelated local changes stay out of the PR.
2. Dirty/behind/shared main checkout → isolated worktree for the fix.
3. Smallest safe fix. Preserve the original bug invariant and any newer
   upstream structure merged from main.
4. Validate narrow-first: the touched surface's own check, then the repo's
   required gates.
5. Before push: read-only cross-review of the staged diff (reviewer agent
   forbidden to edit files or run git write commands).
6. Cross-review is EVIDENCE, not authority: accept only findings grounded
   in the diff, repo rules, or validation results; downgrade style
   preferences and scope expansion, record the reason in one line each.
7. Accepted blockers → fix, revalidate, re-review. Push only at zero
   accepted blockers.
8. Monitoring cadence: active review/failing checks — check often; clean
   and waiting — ~12h; merged — daily lightweight CI/regression watch,
   no more code changes unless asked.

## research-synthesis

Trigger: messy qualitative evidence (interviews, tickets, surveys, NPS,
sales notes, analytics) needs to become a product/design decision. From
nexu-io/open-design research-decision-room (Apache-2.0), re-expressed —
the discipline, not their HTML artifact.

1. Ledger every piece of evidence with source type (interview / usability /
   support / survey / analytics / sales / field note / stakeholder — the
   last is context, not user evidence) and strength: strong = repeated
   across independent sources, directly observed, or metric+qualitative
   agree; medium = specific but single-source; weak = anecdotal,
   secondhand, or missing context.
2. Theme confidence is NOT the average of source strengths — ask: explains
   observed behavior? repeats across source types/segments? plausible
   alternative explanation? falsifiable by a small experiment? High /
   Medium / Low accordingly.
3. Score opportunities 1-5 on evidence strength, user pain, business
   leverage, implementation risk. The total starts the conversation, never
   ends it.
4. Integrity rules (the impulse part): never invent quotes, counts, or
   metrics; label every inference as inference; a gap in evidence is
   stated as a gap, and "what evidence would change this decision" goes in
   the memo.
5. Output: decision memo (spec-driven.md shape) + experiment queue; each
   Low-confidence theme routes to discovery, not roadmap.

## write-executor-plan

Trigger: an audit/review produced findings the user selected for fixing,
and execution is being handed to another agent (often a cheaper model).
Pattern from emilkowalski/skills improve-animations (MIT), re-expressed.

1. One plan per finding, `plans/NNN-short-slug.md` (monotonic numbering;
   respect existing plans). Template: `templates.md`.
2. Write for the WEAKEST executor — zero context, zero taste. Never "the
   easing we discussed": exact file paths, current code verbatim, exact
   target values, one repo exemplar to imitate. Judgment spends on the
   plan; execution should need none.
3. Stamp the current commit (`git rev-parse --short HEAD`). Drift rule
   goes in every plan: if the code found doesn't match the plan, STOP and
   report — never improvise.
4. Verification is two-part, both required: mechanical (exact commands +
   expected outcome) and a product check the executor or reviewing human
   performs on the running artifact — for UI motion that's a feel check
   (slow motion, reduced-motion toggle); for backend, hitting the endpoint
   / running the consumer. Mechanically correct and still wrong is a real
   state; the plan must say what to look at.
5. Finish by creating/updating `plans/README.md`: table of plans (number,
   title, severity, status), recommended execution order, dependencies.

## ship-gate

Trigger: a unit of work is about to be claimed "done." From
tsilly07/ironclad (MIT), re-expressed.

1. Write a sign-off artifact, one per task:
   `docs/ironclad/sign-offs/YYYY-MM-DD-<task>-shipgate.md` (adjust the path
   to the project's own convention if `impulse-project-management` already
   has a status-artifact location — don't create a second one).
2. Six evidence categories, each a checkbox with a one-line citation (file,
   command, or test run) — not a bare checkmark:
   - Acceptance criteria met (cite the criterion + what satisfies it)
   - Tests run and passing (cite the command + result, not "tests pass")
   - No new debt markers without a tracking entry (`impulse-debt` ledger)
   - Changelog entry landed (`update-changelog`, same unit of work)
   - Out-of-scope items from the task template stayed out
   - Reviewer/self-review pass completed, findings resolved or triaged
3. Any unchecked box blocks the "done" claim — the gate exists to make an
   unverified "done" visible before it's said out loud, not to be filled
   in after the fact from memory.
4. A gate that can't be filled honestly (no test run happened, no reviewer
   looked) is a signal to do that work, not to check the box anyway —
   same never-invent discipline as `research-synthesis`'s integrity rules.

## reconcile-plans

Trigger: periodic, or before executing from a `plans/` directory that
predates recent work.

1. Re-check every non-DONE plan against current code at its cited
   file:line.
2. Already fixed → mark DONE. Still valid but drifted → refresh the code
   excerpts, line numbers, and commit stamp. Invalidated by a newer
   decision → retire it with one line naming the decision.
3. Update `plans/README.md` status column. Same rot discipline as
   impulse-debt's marker scan — a stale plan is worse than no plan, because
   an executor will faithfully apply it.
