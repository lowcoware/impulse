# Subagents — configuration, scope, orchestration, and when they're worth it

**Load-bearing rule, stated once here and again in the closing checklist:**
every delegation message states WHY the task matters, in the same message
as WHAT to do — not as a separate step.

Canonical owner for subagent policy across the suite. Was scattered across
13 files with no owner (research-checklist finding, 2026-07-24) — this file
absorbs the general-purpose content that had settled under
`impulse-ai/references/subagents.md` for historical reasons plus new
research-backed additions. `impulse-ai` keeps only what's genuinely
AI-infrastructure-specific (RAG/MCP-facing agent patterns) and points here
for everything else. The mention sites (`impulse-project-management`,
`impulse-brainstorm/references/panel.md`, `shared/evals.md`,
`impulse-md-generator/references/style.md`) point here; `impulse-help`
mentions subagents only as part of impulse-ai's one-line card description,
which needs no pointer. Sweep completed 2026-08-05.

## Custom subagent vs. general-purpose

Build a custom subagent type only when the same worker — same
instructions, same tool scope — gets spawned repeatedly. A one-off
research/exploration task uses `general-purpose` or `Explore`; building a
bespoke subagent type for a single use is the ladder's
no-unrequested-abstraction rule applied to agent design.

## The four-element system-prompt contract

Every subagent prompt needs all four, or drift follows:

1. **Objective** — what this subagent is actually trying to accomplish.
2. **Output format** — what shape the final message should take (raw
   data for a research subagent, not a human-facing summary — the caller
   parses it).
3. **Tool/source guidance** — which tools it should reach for, in what
   order, for the task at hand.
4. **Task boundaries** — what's explicitly out of scope, so the subagent
   doesn't wander into adjacent work the caller didn't ask for.

Missing any one of the four is a documented drift source in Anthropic's
own multi-agent research-system writeup — not a stylistic nicety. Current
(2026) Claude Code docs describe subagents in the same shape — independent
session, own context window, own tool list, optional isolation strategy —
the contract hasn't drifted since this was first written.

### The per-dispatch message is a second contract

The four elements above shape WHO the subagent is; they're stable across
dispatches. What changes per dispatch is the task, and it carries its own
three-part shape:

1. **Goal** — the end state, phrased as a condition that is either met or
   not ("every authenticated endpoint and its auth method is identified"),
   never as an activity ("look at the endpoints").
2. **Context** — why this is being asked, what decision it feeds. This is
   the structural enforcement of the state-the-why rule below: a field that
   is visibly empty is harder to skip than a paragraph you forgot to write.
3. **Instructions** — the constraints and the method, where the task needs
   one.

Prose briefs drop the middle element silently. A three-field object doesn't.

## Context isolation — the exact failure mode, not a vague caveat

A subagent receives ONLY: its own system prompt, the delegation task
message, the project's agent-instructions file and memory hierarchy, a
git-status snapshot, and any skills
named in its `skills` field. Every intermediate step — every file it read,
every command it ran, every line of test output — stays inside its context
and never reaches the parent. Only the final message returns.

**Consequence for `hooks/impulse-subagent.js`:** it re-injects the impulse
RULESET into every subagent (SessionStart doesn't reach Task-spawned
subagents), but it cannot re-inject the TASK's own motivating context — that
lives only in whatever the parent wrote into the delegation prompt. A
delegation that states WHAT but not WHY produces a summary shaped by an
incomplete picture of the goal — the single most commonly reported subagent
failure in the field, and it's a prompt-authoring problem, not a
impulse-config one. State the why in the same message as the what, always.

## Tool restriction — safety and scope in one mechanism

Narrow the subagent's tool list to the minimum the task needs. This is
simultaneously a safety boundary (a read-only research subagent literally
can't `Write`) and a scope-enforcement mechanism (a subagent without the
`Agent` tool can't spawn its own children, which is the right default
unless nested orchestration is specifically intended — nesting is supported
up to 5 levels, but each level adds cost and drift risk, opt in
deliberately, not by omission). Independent empirical grounding: tool
*availability itself*, not task content, is the variable that produces
unsafe behavior in agent-safety studies — a prompt that produces a compliant
refusal text-only produces a real violation once an executable tool exists
to act on it. Scoping isn't just tidiness; it's the actual containment
boundary.

Where that allowlist is declared: § Dispatch artifacts below. It was an open
item in the first pass of this file and is no longer one.

## When a subagent is worth its cost — two thresholds, both required

1. **Task size** — long enough (field's rough marker: >2 minutes of work)
   that the fixed cost of an isolated context is amortized.
2. **Separability** (parallel subagents specifically) — the file/data sets
   they touch don't overlap. Two agents assigned the same file isn't
   parallelism, it's a scheduled merge conflict.

This is the same shape already gating `impulse-brainstorm/references/panel.md`'s
subagent fan-out (reversal-cost + anchoring) — that gate answers "worth it
for THIS decision," this answers "worth it for THIS task shape." Both apply
together.

Cost tradeoff, stated plainly: multi-agent orchestration runs 10-15x the
token cost of one agent doing the same work sequentially (Anthropic's own
research-system numbers). It buys parallelism and context isolation, not
cheapness — reach for it when the task is genuinely parallelizable or needs
isolated context, never as a default posture for any multi-step task.

## Parallel subagents editing files — worktree isolation, and what still breaks

Standard mitigation: one git worktree per agent, automated verification
(tests/lints, not a manual diff scan) gating any merge. Two failure classes
survive worktree isolation and are worth naming because they're silent:

- **Duplicated implementations** — two isolated branches independently solve
  the same sub-problem because they had no way to share the decision
  mid-flight. Near-identical helpers with slightly different names.
- **Semantic contradiction** — each branch is locally correct, passes its
  own tests; the two together break at integration because nothing checked
  the combination. Textual merge succeeds; behavior doesn't.

Neither is caught by "no merge conflicts" — both need an integration-level
check after the merge, not just before it.

When agents share ONE working tree instead (worktrees not available, or the
task is too small to justify them), separability stops being a precondition you
checked once and has to become a runtime declaration: each agent states the
paths it will touch before starting, and an overlap is refused rather than
merged later. This is weaker than worktree isolation and is the fallback, not
the recommendation — it only catches conflicts the agents were honest about.

## Dispatch artifacts — the role prompt is a file, not a paragraph

A role that gets dispatched more than once stops being prose the orchestrator
retypes and becomes a checked-in template beside the skill, filled at dispatch
from placeholders. Three things follow, and they're the reason to bother:

1. **Per-role declaration lives in the file's frontmatter**, not in the
   orchestrator's head: `model`, reasoning effort, and the tool allowlist § Tool
   restriction argues for. A role whose read-only-ness matters declares
   `tools: read, bash` in the same place its prompt lives, so the two can't
   drift apart.
2. **Model is a required field, never an omission.** An unset model silently
   inherits the session's — which is the most expensive one in play. A mechanical
   worker that inherits a frontier model costs frontier money for boilerplate,
   and nothing in the output says so.
3. **Briefs are built by script, not pasted.**
   a. The orchestrator never retypes task material into a prompt — a
      script builds the brief instead. The saving is on the
      ORCHESTRATOR's side; the worker was always going to read it.
   b. Use a `task-brief` script to extract one task's text from the plan
      into a file.
   c. Use a `review-package` script to assemble the commit list, diff
      stat, and net diff with context into a file.
   d. Build the diff against the task's recorded base commit, never
      `HEAD~1` — a multi-commit task diffed against `HEAD~1` only shows
      its last commit.
   e. Name each review-package output file by its commit range, so a
      re-review after fixes reads a fresh file instead of a stale one.

Template placeholders are `[BRACKETED]` and load-bearing: an unfilled one that
reaches a worker is a defect, and it's greppable before dispatch precisely
because it's a template.

## Orchestration patterns

- **Gather-then-synthesize**: fan out parallel subagents to gather context
  BEFORE any generative/writing step starts. Used throughout
  `impulse-project-management`'s playbooks (checkpoint, retro, triage) —
  draft-first-fact-check-after is the wrong order for the same
  reason it's wrong in `impulse-legacy`'s characterize-before-refactor rule.
- **Layer-sharded**: decompose one large review/analysis into N
  independent, non-overlapping subagent passes (by architectural layer, by
  file domain, by concern) that can't interfere with each other and finish
  in the time of the slowest shard, not the sum. Used by
  `impulse-project-management/references/review.md`'s whole-service audit.
- **Redundant panel with an agreement matrix**: N workers over the SAME input
  with independent briefs, then a `concern × worker` boolean matrix before any
  synthesis. The matrix is the point — it turns "several reviewers flagged
  this" from an assertion into something countable, and it exposes the concern
  only one worker raised, which is where both the false positive and the
  sharpest finding live. Give workers opaque labels, not roles, so the
  synthesizer can't weight by reputation; reserve one slot for a deliberately
  hostile critic so a converging panel isn't just a comfortable one.
  **This is not a contradiction of `impulse-brainstorm/references/panel.md`'s
  rule that identical briefs make the panel theater** — that rule governs
  GENERATING options, where convergence means wasted spend. Here the workers
  judge one fixed artifact and independence IS the product: agreement measured
  across independent looks is evidence, agreement engineered by handing out
  opposing constraints is not. Diverge the brief when producing candidates,
  hold it fixed when verifying one.
- **Subagents report only to the lead agent — every hop direct.** The
  orchestrator-worker pattern is the only supported shape: the lead agent
  plans, delegates in parallel, subagents report back to the lead, not to
  each other.

## Durable orchestration — surviving compaction and interruption

A long multi-agent workflow that lives only in the context window dies at
the first compaction. Mechanics that survive:

1. **State on disk, not in context.** A `state.json` + numbered per-phase
   output files (`NN-phase.md`); every phase RE-READS the prior phase's file
   instead of trusting window memory. Resume-after-interruption comes free.
2. **Progress ledger** the orchestrator appends to after every completed
   unit — after a compaction the next turn reads the ledger and continues,
   no re-derivation.
3. **Explicit checkpoints** at phase boundaries: stop, show the phase
   result, get approval before the next fan-out — long workflows drift
   worst exactly where nobody is looking.
4. **Multi-session projects: map with a fog line.** The plan document holds
   tickets (precisely phrased questions/tasks) and FOG — areas you can't yet
   phrase precisely. The test for promoting fog to a ticket is precision of
   the QUESTION, not answerability. One ticket resolved per session;
   decisions-so-far accrete on the map, not in memory.

## Handoff discipline — orchestrator ↔ worker

1. Hand workers file paths to read, never a pasted context block that
   goes stale the moment the file changes.
2. Worker replies use exactly one fixed status: DONE / DONE_WITH_CONCERNS
   / BLOCKED / NEEDS_CONTEXT. Free-prose status forces the orchestrator
   to interpret; a contract doesn't.
3. Escalating (BLOCKED/NEEDS_CONTEXT) is expected, not penalized — use it
   when: the architecture has several valid answers, the task needs code
   beyond what was handed over, the plan doesn't fit reality once read,
   or you're reading file after file without converging. A vocabulary
   with no stated permission to stop collapses to DONE, because a worker
   with no licence to stop reads "report status" as "report success."
4. Never let the orchestrator pre-frame a diff as fine before a reviewer
   sees it — forward it with no "this looks fine" framing attached.
5. A worker's stated rationale is a claim, not a severity discount —
   "the plan said to do it this way" never downgrades a defect; the
   plan's author doesn't grade its own work.
6. Write the full report (evidence, test output, concerns) to a file;
   keep the final message to ~15 lines pointing at it — lean orchestrator
   context without losing the evidence trail.
7. On a review round-trip, resume the worker and append a fix report to
   that same file (what changed, which covering tests ran, the command,
   its output) — a second report file loses the thread. The reviewer
   will not re-run tests on the worker's behalf, so the worker's report
   IS the test evidence; a claim with no pasted output is unverified no
   matter how confident it reads.
8. Batch fix dispatches: one worker fixing N related findings beats N
   workers fixing one each — shared context loads once.
9. Pick a worker model by turn count, not sticker price: a stronger
   model that finishes in 2 turns is usually cheaper than a weak one
   that thrashes for 8.

**Enforce read-only with hooks, not prompt convention.** An audit/review
subagent whose non-destructiveness matters gets a `PreToolUse` hook
hard-blocking Write/Edit/Bash — the harness guarantees what the prompt
only requests. When Bash stays allowed with a command blocklist, treat
that blocklist as incomplete until it unwraps interpreters first: check
inside `sh -c`, `python -c`, `node -e`, piped-to-shell input, and
`env X=y sh -c` for the real command, then re-apply the blocklist to what's
inside — the wrapper bypass is the standard hole. Prefer a read-only
permissions profile (allow Read/Glob/Grep, deny the rest) over a Bash
blocklist whenever the task doesn't need Bash at all — no hook code
needed.

## ReAct / self-reflection — diminishing returns, not free improvement

Reflection (agent critiques its own prior attempt, retries) helps, but not
unboundedly: returns diminish sharply past 3-5 reflection attempts,
especially when the verifier signal itself is noisy — more attempts on a
weak feedback signal doesn't compound, it just burns budget. A documented
case (WebShop benchmark): a full reflection loop improved accuracy from
33% to 35% — one additional task solved for a full extra pass's cost. Pure
ReAct (interleaved reason-then-act, no reflection) is fine for short,
well-specified tasks but compounds errors on long-horizon or ambiguous
ones — reflection is the fix for exactly that failure mode, not a general
quality multiplier to bolt onto every agent call.
*Applies here:* cap reflection/retry loops at a small fixed number (3-5),
not "keep retrying until it works" — past that point, the fix is a better
verifier signal or a different decomposition, not more attempts.
[Reflection in AI agents: how self-improvement actually works, 2026](https://stackviv.ai/blog/reflection-ai-agents-self-improvement)

## Model/effort per subagent

Pick a worker model by task type, not a complexity guess — per-task cost
isn't reliably predictable up front (agentic runs on nominally the same
task have varied by an order of magnitude in total tokens in published
benchmarks), so type is the more reliable signal:

1. Mechanical work (file navigation, boilerplate edits, format
   conversion) -> cheapest/fastest tier.
2. Judgment work (architecture review, ambiguous requirements, synthesis
   across sources) -> the same tier the orchestrator is running on.
3. Unsure which bucket -> tier up, not down; a cheap-tier worker that
   needs a retry pass often costs more than one clean frontier pass.

Whichever tier is picked, write it into the role's frontmatter `model`
field (§ Dispatch artifacts) — never leave it unset.

## Evaluating tool-selection behavior, not just tool implementation

Testing whether an agent picks the *right* tool and uses it *correctly* is a
different test than unit-testing the tool's own implementation. Evaluate at
three levels:

1. **End-to-end** (black box) — did the task succeed.
2. **Trajectory-level** — was the tool-call sequence sensible (no redundant
   calls, no wrong-tool selection, reasonable retry behavior on failure).
3. **Component-level** — was any single tool call's arguments/result correct
   in isolation.

Practical technique: have the agent emit its reasoning before each tool call
(interleaved thinking), then read the transcripts specifically looking for
where it got "stumped or confused" — that's where a tool description or
granularity choice needs revision, found empirically rather than guessed.

## Observability

No specific measured methodology found for "did this subagent spend its
context well." Qualitatively: ties to the injection-size meter already
built into `hooks/impulse-config.js` — every subagent spawn pays the
ruleset injection cost, now visible per spawn. Extending observability past
that is unresolved — flagged, not solved.

## `IMPULSE_SUBAGENT_MATCHER` default — still unresolved

The hook's default is inject-into-every-subagent; scoping to specific agent
types is opt-in via an env var. No data surfaced in this research pass that
directly measures the cost/benefit of flipping that default (inject-only-
into-code-writing-agents). Leaving the default as-is rather than guessing —
this is exactly the kind of change that should follow a measurement, not
precede one.

## Return a summary, not the transcript

Return the worker's final summary message only — that's the design (§
Context isolation above), not an accident. A subagent's full transcript
(every tool call, every intermediate read) can run tens of thousands of
tokens; pulling it into the parent's context defeats the isolation §
Context isolation exists to provide, and risks forcing a mid-conversation
compaction on its own. If the summary is insufficient, dispatch a
narrower follow-up task to get more detail — don't reach for the
transcript.

## Delegation as context isolation — a sizing test, not just a scope call

When a question requires sweeping many files but the answer itself is
small ("where is X configured?", "which modules import Y?"), delegating
to a subagent and keeping only its conclusion is worth it specifically
when tokens-to-explore is much greater than tokens-of-the-answer — the
sweep happens in the subagent's context and is discarded with it, instead
of the parent paying for every file it took to find the answer. This is
the same § "When a subagent is worth its cost" gate restated as a quick
in-the-moment test for the exploratory case specifically, not a separate
rule.

## Structure before content — narrow the read before you make it

Before a subagent (or the orchestrator) `Read`s a full file to answer a
narrow question, prefer a cheaper narrowing pass first: a signature/symbol
scan (`grep -n '^\(func\|class\|def\)'` or equivalent for the language), a
directory tree, or a targeted `grep` with bounded context lines — then
escalate to a full read only if the narrow pass didn't resolve the
question. Same shape as `impulse-legacy`'s characterize-before-refactor
gate, applied to file reads specifically: don't pay for the whole body
when the question only needed the shape.

## Before you finish a dispatch

1. Does the subagent's system prompt contain all four of: Objective,
   Output format, Tool/source guidance, Task boundaries?
2. Does the per-dispatch message contain Goal, Context (the why), and
   Instructions as three separate fields?
3. Is `model` set explicitly in the role's frontmatter, never left to
   inherit?
4. Is the tool list narrowed to only what this task needs?
5. If this is a review/audit worker, is destructive access blocked by a
   hook or permissions profile, not just by the prompt asking nicely?
6. Does the worker's final message point at a report file rather than
   pasting the transcript inline?

Restated: every delegation message states WHY the task matters, in the
same message as WHAT to do.

## Sources

- [Claude Code docs: subagents](https://code.claude.com/docs/en/sub-agents)
- [XDA: Claude Code sub-agent context-window collapse](https://www.xda-developers.com/ignored-claude-code-sub-agents-context-window-collapsing/)
- [wmedia: why sub-agents return incomplete results](https://wmedia.es/en/tips/claude-code-subagent-context-loss)
- [Totalum: Claude Code subagents 2026 production playbook — tool scoping](https://www.totalum.app/blog/claude-code-subagents-totalum)
- [Agent-safety study: tool availability and compliance violation shift](https://arxiv.org/pdf/2507.06134)
- [Augment Code: multi-agent production requirements — 2-minute/separability threshold, duplicated-implementation and semantic-contradiction failure classes](https://www.augmentcode.com/guides/multi-agent-ai-production-requirements)
- [Ivern AI: agent cost benchmark, token-variance data](https://ivern.ai/blog/ai-agent-cost-benchmark-report-2026)

Patterns re-expressed from third-party repos (no third-party rule text
reproduced) — see README Lineage:

- [obra/superpowers (MIT)](https://github.com/obra/superpowers) — dispatch
  artifacts: role-prompt templates as files, `task-brief`/`review-package`
  builders, required-model field, escalation permission with named triggers,
  the resume-and-append fix-report cycle
- [melihmucuk/pi-crew (MIT)](https://github.com/melihmucuk/pi-crew) —
  goal/context/instructions dispatch object, per-role model/effort/tool
  frontmatter
- [AlexWortega/ai-peer-review-skill (MIT)](https://github.com/AlexWortega/ai-peer-review-skill)
  — redundant panel with opaque worker labels, reserved hostile-critic slot,
  the concern × worker agreement matrix
- [rokoss21/swarm-iosm (MIT)](https://github.com/rokoss21/swarm-iosm) —
  declared touch-sets as the shared-working-tree fallback for separability
