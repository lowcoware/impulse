---
name: impulse-goal
description: "Autonomous execution engine of the impulse suite: plan deeply, then drive a software task to done without babysitting — after impulse-project-management writes specs, or standalone from a prompt. Use when the user wants depth plus follow-through to completion. Triggers: /impulse-goal, plan and ship X, autonomous build, drive it to done, don't stop until it's done, I don't want to babysit this, доведи до конца, автономная сборка, запусти исполнение, не хочу нянчить, гони до готового. Works on Claude Code and Codex. From robzilla1738/supergoal (MIT)."
---

# impulse-goal

From robzilla1738/supergoal (MIT), absorbed as the impulse suite's execution
engine. Plan deeply, then auto-execute under a single `/goal` until the task
is verifiably complete across every phase.

Two entry points:
- **After impulse-project-management** — impulse-pm wrote the spec / ROADMAP; this
  skill reads those artifacts, reuses the decomposition, and drives them to
  done. The natural next step past planning.
- **Standalone** — from a prompt, it runs the full intake, recon, decompose
  itself.

The impulse suite is the quality bar INSIDE each phase: phases invoke
impulse-backend / impulse-frontend / impulse-review / impulse-security / etc., and the
final Polish-and-Harden phase runs impulse-review + preflight as its enforced
gate. "Perfect" is never a stopping condition — falsifiable criteria are.

## Pipeline

| Stage | Does | Detail |
|---|---|---|
| 0 | Available context: claim run namespace, preload impulse memory, detect tools + which impulse skills each phase uses, resume any active run | `references/workflow.md` |
| 1 | Intake: restate, classify, ask only real gaps (greenfield walks the category checklist in batches of 4; brownfield 0-2; a impulse-pm plan means near-zero) | workflow.md |
| 2 | Recon: parallel codebase + env scan, 5-line summary | workflow.md |
| 3 | Deep think: top-3 risks, ordering deps, memory hits, optional Context7/WebSearch to THINKING.md | `references/planning-depth.md` |
| 4 | Decompose: as many phases as the task needs, last is always Polish and Harden | `references/phase-design.md` |
| 5 | Write ROADMAP + STATE + one `phase-N.md` spec per phase, validate each | workflow.md |
| 6 | Plan review (hard gate): self-critique pass, scannable summary, one confirmation with concrete revision options; pre-flight smoke check | workflow.md |
| 7 | Hand off ONE ready-to-paste `/goal` line; stop | workflow.md + `references/goal-format.md` |

Two human gates only — clarifying gaps (Stage 1) and plan review (Stage 6).
Everything between and after runs autonomously.

## The single-`/goal` shape

`/goal` on Claude Code and Codex takes a short END-STATE condition, not a
task body. A per-turn evaluator checks it against the transcript and
auto-continues until it holds. One `/goal` covers the whole run: phase work
lives in files the executor reads from disk; the condition is "all phases
done, audit clean, `IMPULSEGOAL_RUN_COMPLETE` printed." Slash commands fire
only from USER input, so Stage 7 is an honest one-paste handoff, never an
auto-dispatch. The execution loop, final audit, and 3-strike recovery that
run inside that `/goal` session are in `references/execution.md` (canonical
copy: the run's `PROTOCOL.md`).

## Locate the skill + claim the run

```bash
IMPULSEGOAL_DIR=$(dirname "$(ls -1 \
  "$HOME/.claude/skills/impulse-goal/SKILL.md" \
  "$PWD/.claude/skills/impulse-goal/SKILL.md" \
  2>/dev/null | head -n1)")
export IMPULSEGOAL_DIR
# $IMPULSEGOAL_BASE holds ALL runs; each run claims its own namespaced subdir
# ($IMPULSEGOAL_ROOT) in Stage 0 so two runs in one tree never clobber.
export IMPULSEGOAL_BASE="${IMPULSEGOAL_BASE:-.impulse-goal}"
mkdir -p "$IMPULSEGOAL_BASE"
```

Then follow Stage 0 in `references/workflow.md` to claim `$IMPULSEGOAL_ROOT`
(via `scripts/claim-run.sh`) before writing any artifact. Skill assets live
under `$IMPULSEGOAL_DIR`; all run artifacts under `$IMPULSEGOAL_ROOT`.

## Operating principles (read every run)

- One `/goal`, short condition. Long content lives in files on disk.
- Frictionless: memory + prompt + recon + any impulse-pm plan answer most
  questions. Zero clarifying questions on a well-described task is a win.
- Adapt to available tools. Detect Context7 / WebSearch / MCPs / impulse
  skills; degrade gracefully; never hard-require a tool that may be absent.
- Memory is load-bearing (impulse memory system): preload Stage 0, surface as
  "Applied from memory:" in Stage 1, write back at every phase boundary.
- "Perfect" is not a stopping condition — criteria are. Translate every
  "perfect" into observable, falsifiable checks.
- The loop self-heals: auto-retry once, then a fix spec inline, then
  escalate. Don't stop on first failure.
- The evaluator only sees the transcript — phase specs require the agent to
  surface START, commands, evidence, VERIFY, DONE into the conversation.
- Each phase is independently shippable in spirit; Polish-and-Harden is
  mandatory (that is where impulse-review + preflight enforce "every aspect").
- The final audit re-verifies against the ORIGINAL ROADMAP, not the run's
  own self-reports.

## References

| File | Covers |
|---|---|
| references/workflow.md | Stages 0-7 in full — the planner session |
| references/execution.md | phase loop, final audit, 3-strike recovery, memory writeback — the `/goal` session |
| references/planning-depth.md | the bar a plan clears to deserve autonomous execution |
| references/phase-design.md | how to slice phases that auto-chain cleanly |
| references/goal-format.md | what `/goal` is on Claude Code + Codex, the single-`/goal` shape, transcript blocks |
| references/repo-state-comparison.md | complete-working-tree vs baseline comparison strategy (audit + cleanliness) |
| ../../shared/velocity.md | why the execution engine is shaped this way — rework dominates over generation speed, spec quality vs. iteration count, when parallel phases pay off |
| references/self-reference.md | self-generated reference artifact — a real ROADMAP + STATE pair, built by this skill's own templates; load when checking whether current ROADMAP/STATE output still matches this skill's own baseline |
| ../../shared/subagents.md | subagent dispatch contract, handoff discipline, durable orchestration — load when fanning out parallel recon or phase workers |

## Scripts

`claim-run.sh` (atomic per-run dir) · `detect-stack.sh` / `detect-env.sh` /
`summarize-repo.sh` (recon) · `validate-phase.sh` (spec marker check) ·
`repo-state.sh` (working-tree vs baseline; copied into the run dir at
Stage 7).

## Templates

`ROADMAP.md` (phase plan) · `STATE.md` (live progress) · `phase-goal.txt`
(phase spec skeleton) · `PROTOCOL.md` (execution loop, copied to
`<run-root>/PROTOCOL.md` at dispatch with `{{RUN_ROOT}}` substituted).

## Boundaries

Planning artifacts (spec, ADR, playbooks, review cadence) are
impulse-project-management's job — impulse-goal consumes a impulse-pm plan or makes
its own, then DRIVES it; it does not replace the PM skill. Deploy/release is
impulse-devops. Diff review inside a phase is impulse-review. Very small tasks
(under an hour, single file) do not need the machinery — say so.
"stop impulse" / "normal mode": revert to default behavior.
