# Execution — the phase loop (inside the single `/goal` session)

What the agent does after the user pastes `/goal`. The canonical copy the
executor reads is the run's `PROTOCOL.md` (this run's namespaced copy);
this reference is the readable version of the same loop. The `/goal`
session has ZERO context from the planner — everything it needs is on disk.

## Phase loop (repeat until IMPULSEGOAL_RUN_COMPLETE)

1. Read `<run-root>/STATE.md` → current phase N.
2. Read `<run-root>/phases/phase-N.md` → full work spec.
3. Print `IMPULSEGOAL_PHASE_START` block with values from the spec.
4. Do the work — invoking the impulse skills named in the spec (impulse-backend / impulse-frontend / impulse-review / etc.) as the quality bar. Run mandatory commands; surface evidence into the transcript.
5. Print `IMPULSEGOAL_PHASE_VERIFY`: every criterion `pass|fail` + engineering checks + cleanliness checks. Cleanliness = grep `bash <run-root>/repo-state.sh added-lines <Baseline ref>` (complete added/new lines since baseline, including uncommitted + untracked) for: stack debug prints (`console.log`/`print(`/`fmt.Println`...), session `TODO|FIXME|XXX` introduced this run, dead imports. Non-zero → treated like a failed criterion (3-strike) unless the spec declares `Cleanliness override:`. impulse-specific: a `impulse:` ceiling marker WITH an upgrade trigger is legitimate and never counts as a TODO stub; a bare `TODO` does.
6. Memory writeback check — anything non-obvious learned? Write a memory file under the detected MEM_DIR (impulse frontmatter: `name`/`description`/`metadata.type`), link it in `MEMORY.md`, print `MEMORY_SAVED: <name>` (or `MEMORY_SAVED: none`).
7. Print `IMPULSEGOAL_PHASE_DONE`, update STATE (phase N complete, Current phase = N+1, append events line).
8. User-interrupt check — new user message since last turn → pause at this phase boundary, address it, ask before resuming.
9. N < total → loop for N+1. N == total → do NOT complete yet; run the Final Audit, then complete.

## Final audit (before completion)

Per-phase VERIFY blocks are self-reports; a later phase can silently break an earlier one. The audit re-validates against the ORIGINAL `ROADMAP.md`, not the run's self-reports. Runs once after the last phase; gaps → focused fix spec → re-run; cap 3 rounds, then `AUDIT_HANDOFF`.

1. Print `AUDIT_START` (round, phase count, criteria count, deduped mandatory commands).
2. Re-read `ROADMAP.md` — pull every phase's criteria fresh; don't trust prior VERIFY.
3. Phase completeness: every phase 1..N has a `IMPULSEGOAL_PHASE_DONE`? Surface missing.
4. Re-run aggregated mandatory commands once each; last ~10 lines + exit code; non-zero → `AUDIT_GAP`.
5. Spot-check verifiable criteria (file exists / function exported / config set / no debug prints) via `ls`/`grep`/`cat`; non-deterministic ones (screenshot, manual smoke) → `trust-prior-verify`. This split is load-bearing, not a convenience shortcut: self-verification research finds it structurally cannot catch errors the model makes CONSISTENTLY (the same blind spot that produced the output reproduces in the check), and verifying a claim requires roughly the same capability as generating it — a model that got something subtly wrong is not reliably the model that will notice. That's exactly why `ls`/`grep`/`cat` deterministic checks (step 5) exist as a separate, tool-based gate rather than "ask the model if it's done," and why non-deterministic criteria get flagged `trust-prior-verify` and surfaced in the coverage warning below instead of silently marked verified — an unstated task-duration effect makes this matter more on long runs: doubling a task's duration has been measured to roughly quadruple its failure rate, so a long phase chain leans on this gate more, not less, as it grows.
   [Zylos: long-running AI agents and task decomposition, 2026](https://zylos.ai/research/2026-01-16-long-running-ai-agents)
5b. Deliverable check: for each `**Deliverables:**` bullet naming a path/glob, `bash <run-root>/repo-state.sh deliverable <Baseline ref> "<path>"` — checks the complete working tree (committed+staged+unstaged+deleted) + untracked separately; `missing` → `AUDIT_GAP: phase <N> deliverable "<bullet>" not present`. Ground-truth: catches "said done but didn't ship" even with no commit. Strategy: `repo-state-comparison.md`.
6. Print `AUDIT_VERIFY`: per-phase DONE status, each command's exit code, each criterion `pass|fail|trust-prior-verify` with evidence, deliverables `present|missing`.
7. Gaps → `AUDIT_GAPS`, write `<run-root>/phases/audit-fix-<round>.md` (only failing criteria, original VERIFY as gate, no scope creep), execute inline (same 3-strike protocol). Success → round+1 loop. 3rd-round failure → `AUDIT_HANDOFF` (full gap history + suggested move), STATE `BLOCKED`, stop.
8. Clean → compute `audit coverage = re_verified / (re_verified + trust_prior)`, print `AUDIT_COMPLETE` (phases verified, commands clean, criteria pass/trust-prior, deliverables present/missing, coverage %), then `IMPULSEGOAL_RUN_COMPLETE` (5-line summary). If `trust_prior / (re_verified + trust_prior) > 30%`, prepend `Warning — audit coverage: X re-verified, Y trust-prior (Z%). Eyeball UI/UX before merging.`

The audit is the difference between "every phase passed its own self-report" and "the final state matches the plan I originally approved." That is the bar.

## Failure recovery (3-strike)

First failure of a criterion: print `FAILURE_PROBE` (what failed, what tried, root-cause hypothesis), append to STATE failure log, auto-retry the same phase once with the probe injected — don't advance.

Second failure: print `FAILURE_ESCALATE`, write a focused fix spec `<run-root>/phases/phase-N.fix.md` (only the failing criterion, no scope creep), execute inline (same `/goal`, no new dispatch); on success re-run the phase VERIFY, on pass advance.

Third failure: print `FAILURE_HANDOFF` (failing criterion, full probe history, three things tried, suggested next move), STATE `BLOCKED`, user takes the wheel — stop attempting, surface clearly.

Recovers flaky envs, typos, missed deps automatically; only real blockers escalate.

## Memory writeback rules

Future runs start smarter because past runs wrote what they learned. At each phase boundary ask: would a future impulse-goal run on a similar task benefit from knowing this? Worth saving: an undocumented library API quirk, a user preference confirmed this run, a project-level fact (auth lives in `lib/auth/` not `app/api/auth/`), a failure pattern + fix. Standard impulse memory frontmatter; link from `MEMORY.md`; print `MEMORY_SAVED:`. At the final phase, always write a `project_<slug>` memory (location, stack, status, ROADMAP link) so future runs on the same project start current. Never save secrets, transient task details, ephemeral state.

## Transcript markers (the evaluator only sees the transcript)

`IMPULSEGOAL_PHASE_START` / `IMPULSEGOAL_PHASE_VERIFY` / `IMPULSEGOAL_PHASE_DONE` · `MEMORY_SAVED` · `AUDIT_START` / `AUDIT_VERIFY` / `AUDIT_GAPS` / `AUDIT_COMPLETE` / `AUDIT_HANDOFF` · `IMPULSEGOAL_RUN_COMPLETE` · `FAILURE_PROBE` / `FAILURE_ESCALATE` / `FAILURE_HANDOFF`. The `/goal` end-state: `IMPULSEGOAL_RUN_COMPLETE` preceded by `AUDIT_COMPLETE` and one `IMPULSEGOAL_PHASE_DONE` per phase, no `FAILURE_HANDOFF` or `AUDIT_HANDOFF`. Don't rename these without reworking the end-state condition string in `goal-format.md`.
