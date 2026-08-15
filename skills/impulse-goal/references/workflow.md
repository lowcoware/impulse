# Workflow — Stages 0-7 (planner session)

Full detail for the planning half. SKILL.md is the router; this is the
substrate. The execution half (phase loop, audit, recovery) is
`execution.md` + the copied `PROTOCOL.md`.

## Stage 0 — Available context (memory + tools)

### Claim the run namespace (do this first, before any file write)

Every run gets its OWN subdir under `$IMPULSEGOAL_BASE` so two runs in one
working tree never clobber each other's STATE/ROADMAP/phases.

```bash
ACTIVE_RUNS=""
for s in "$IMPULSEGOAL_BASE"/*/STATE.md "$IMPULSEGOAL_BASE"/STATE.md; do
  [ -f "$s" ] || continue
  grep -Eqi 'status:\**[[:space:]]*complete[[:space:]]*$' "$s" && continue
  ACTIVE_RUNS="${ACTIVE_RUNS}$(dirname "$s")"$'\n'
done
printf 'Active runs in this tree:\n%s\n' "${ACTIVE_RUNS:-  (none)}"
```

- Fresh run (default): `IMPULSEGOAL_ROOT="$(bash "$IMPULSEGOAL_DIR/scripts/claim-run.sh" "$ARGUMENTS")"; export IMPULSEGOAL_ROOT` — `claim-run.sh` uses `mktemp -d`, so simultaneous starts get distinct dirs.
- Resume: an active run matches this task (STATE title ~ `$ARGUMENTS`, or user said resume) → set `IMPULSEGOAL_ROOT` to that dir, follow the resume path, do not re-plan. Ambiguous with several active → one `AskUserQuestion` which to resume or start fresh.

Coexistence notice (print it when ACTIVE_RUNS is non-empty and starting fresh): namespacing isolates the PLAN, not the build — two `/goal` executions in one tree still edit the same source files and clobber each other's code. For true parallel runs use a separate `git worktree`, or resume the existing run.

### Memory preload (impulse memory system)

Detect the memory dir (`$PWD/.impulse/memory` — the suite's own tier convention, `shared/memory.md`, checked FIRST — then `$HOME/.claude/projects/*/memory`, `$HOME/.claude/memory`, `$PWD/.claude/memory`, `$IMPULSEGOAL_ROOT/memory`), read the index (`index.md` for `.impulse/memory`, `MEMORY.md` for the others), then selectively read the individual memory files relevant to the task (user role, feedback on stack/domain, related project memories). Don't dump them all — `.impulse/memory` follows shared/memory.md's read discipline: index first, grep filenames, open only the matched file. Capture applicable hits in `$IMPULSEGOAL_ROOT/applied-memories.md` (one line each: name, why-applicable, what-it-changes); surface in Stage 1 as "Applied from memory:" so the user can correct anything stale. Same memory frontmatter impulse uses everywhere: `name` / `description` / `metadata.type`.

### Tool + skill discovery

Detect, don't assume — hosts differ (Claude Code vs Codex, MCP sets). Context7 (`resolve-library-id` present?), WebSearch/WebFetch (listed?). The IMPULSE SUITE is the quality bar: note which impulse skills each phase will invoke (impulse-backend / impulse-frontend / impulse-review / impulse-security / impulse-devops / impulse-mobile...) in `$IMPULSEGOAL_ROOT/applied-skills.md`. Write detected tools to `$IMPULSEGOAL_ROOT/tools.md`.

### Impulse mode for the run

If the user set a impulse mode (blitz/medium/hardcore) or one is active, record it in STATE and bake it into phase specs — hardcore phases front-load architecture, blitz drops plan prose but keeps baseline+tests. Default medium.

### Resume detection

Resolved to resume → read that run's `$IMPULSEGOAL_ROOT/STATE.md`. Status IN_PROGRESS / READY_TO_DISPATCH / BLOCKED with a phase pending → do NOT re-plan; print "Resuming from phase N" and jump to Stage 6 (review existing artifacts) or Stage 7 (dispatch) on confirm.

## Stage 1 — Intake & clarifying questions

Echo the task in one sentence, classify (tags combine): greenfield (new project / empty tree), brownfield (existing repo), bugfix, refactor, ui.

Calibrate question count to context. If impulse-pm already produced a spec/ROADMAP for this task, INTAKE IS MOSTLY DONE — read those artifacts, ask only what they leave open, skip to Stage 4/5 reusing the decomposition.

Greenfield — walk the category checklist, eliminate what memory/prompt answered, ask the rest in `AskUserQuestion` batches of up to 4 until every material gap is filled: target platform/surface, stack/framework, design direction (feeds impulse-frontend registers), integration anchors (auth/db/payments/hosting), scope cut-line, primary audience, perf/scale (only if non-trivial), data-model anchors (only if implied). Lead each batch with the highest-leverage forks. Anti-patterns: don't plan around silent assumptions for a whole category; don't pad questions memory already answers; don't ask micro-details (naming, copy, palette specifics) — those go to Stage 6 as correctable assumptions.

Brownfield — 0-2 questions, one batch: scope cut-line, compatibility surface, which existing pattern to extend when ambiguous. Recon answers the rest. Most well-described brownfield asks zero.

Both modes: lead with "Applied from memory:" / "From your prompt:"; zero questions is a win — say so and move on; never ask what you can responsibly assume.

## Stage 2 — Recon (parallel)

Brownfield: `detect-stack.sh > context.md`, `summarize-repo.sh > repo-map.md`. Greenfield: `detect-env.sh > context.md`. Read outputs, print a 5-line summary (stack, package manager, build/test/lint commands, notable modules, risky areas) — proof you understood the codebase before planning.

## Stage 3 — Deep think

Required regardless of tools: top-3 risks (most likely to break, hardest to undo, easiest to miss), non-obvious ordering dependencies, apply memory hits from `applied-memories.md`. Optional if available: Context7 for third-party SDK docs (don't plan against stale APIs; if absent, plan against training-cutoff and flag it), WebSearch for pattern consensus. Write `$IMPULSEGOAL_ROOT/THINKING.md` (1-2 pages): Goals, Constraints, Risks, Dependencies, Open Questions (assumed), Memory hits, Tools/skills relied on. Bar: `planning-depth.md`.

## Stage 4 — Decompose into phases

As many phases as the task needs, no fixed cap — derived, not chosen. Slicing rules: `phase-design.md`. Each phase: name (5 words, action-first), why (1 sentence), deliverables (concrete files/features), acceptance criteria (5-10 measurable), mandatory commands (build/typecheck/lint/test), evidence required (what to print), dependencies (explicit phase numbers). The LAST phase is always Polish & Harden — and it runs impulse-review + preflight (frontend) or the impulse-review tag sweep (backend) as its enforced gate, not a hand-wave.

## Stage 5 — Write roadmap + phase specs

Under `$IMPULSEGOAL_ROOT/`: `ROADMAP.md` (template), `STATE.md` (live progress, template), `phases/phase-N.md` (one spec per phase, any length — read from disk, no char budget). Each spec carries the marker block:

```
IMPULSEGOAL_PHASE_START
Phase: <N> of <total> — <name>
Task: <one-line>
Mandatory commands: <list>
Acceptance criteria: <count>
Evidence required: <list>
Depends on phases: <list or "none">
```

Validate each: `bash $IMPULSEGOAL_DIR/scripts/validate-phase.sh "$IMPULSEGOAL_ROOT/phases/phase-N.md"`.

## Stage 6 — Plan review & confirmation (hard gate)

The chain runs unsupervised once started — this is the last cheap correction point. Skipping it is a bug.

Stage 6a self-critique (one turn, three questions): falsifiability (every criterion a yes/no test, not "works"/"good"/"ready"), phase atomicity (any phase secretly two units — name contains "and", deliverables don't share a verify gate), weakest dependency (where a partial failure cascades worst). Clean → record `Self-critique: clean.`; findings → list 1-3, rewrite offending criteria in-place in the affected `phase-N.md` + `ROADMAP.md`, re-run `validate-phase.sh`, surface the rewrites. Honesty check: this pass produces findings or a clean verdict per run — if it always says clean, it's theater.

Stage 6b summary: scannable print — phase count, applied-memory hits, phase list with one-line deliverables (last = Polish & Harden), stack/pm/commands, key assumptions (correct any wrong), top-3 risks + mitigations, self-critique result, artifact paths. Then `AskUserQuestion` header "Start chain?", 4 concrete options: Start now / Adjust an assumption / Tweak a phase / Restructure phases. Any revision → second question to pin exactly what, apply, update ROADMAP+THINKING+STATE+specs, re-validate, re-show, ask again. Loop until "Start now" or abort. Never dispatch on silence.

## Stage 6.5 — Pre-flight smoke check

After "Start now", before printing `/goal`: union the mandatory commands across all specs, dedupe, run each once. All green → append `Pre-flight green` to STATE, print `PREFLIGHT_GREEN`, proceed. Any red → append `Pre-flight red`, print `PREFLIGHT_RED` (failing cmd, exit code, last ~5 lines), re-show Stage 6 with a revised 4-option menu where "Skip pre-flight, dispatch anyway" replaces "Start now" (the user may know the baseline is intentionally broken — phase 1's job is to fix it). Catches a baseline already red before phase 1, which would otherwise thrash the 3-strike loop.

## Stage 7 — Hand off the `/goal` dispatch (one paste)

Slash commands fire only from USER input — agent text is never parsed as a command. So this is an honest one-paste handoff, not auto-dispatch.

1. Update STATE: `Status: READY_TO_DISPATCH`, `Current phase: 1`, capture `Baseline ref:` = `git rev-parse HEAD 2>/dev/null || echo "no-git"` (the audit diffs deliverables against this).
2. Copy the run manual + comparison helper into the namespace:
   ```bash
   sed "s#{{RUN_ROOT}}#$IMPULSEGOAL_ROOT#g" "$IMPULSEGOAL_DIR/templates/PROTOCOL.md" > "$IMPULSEGOAL_ROOT/PROTOCOL.md"
   cp "$IMPULSEGOAL_DIR/scripts/repo-state.sh" "$IMPULSEGOAL_ROOT/repo-state.sh"
   ```
3. Verify each `phases/phase-N.md` exists; `validate-phase.sh` on each.
4. Print a fenced block with the ready-to-paste `/goal` line, substituting the LITERAL `$IMPULSEGOAL_ROOT` for every `<run-root>` (the pasted line must contain the real dir). Condition short, measurable, well under the 4000-char `/goal` limit — full shape in `goal-format.md`.
5. Follow with exactly: "Paste the `/goal` line above into your input to dispatch the chain. From there it runs autonomously until IMPULSEGOAL_RUN_COMPLETE."
6. Stop. The planner ends here. The user's paste begins the autonomous run in a fresh `/goal` session that reads PROTOCOL/ROADMAP/STATE + phase specs from disk (zero context from the planner — by design) and runs the loop in `execution.md`.

## Deviations

Tiny task (<1h, single file): say it doesn't need impulse-goal, suggest just doing it (or a plain impulse skill). User pushes back on a phase during intake: collapse, re-plan, continue. Mid-run interruption: update the affected `phase-N.md`, `validate-phase.sh`, ask the user to resume (re-dispatch the same `/goal` or say continue) — no restart from phase 1.
