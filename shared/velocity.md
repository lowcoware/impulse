# Agent-development velocity — what actually shortens time-to-merge

**TOP RULE:** rework cost, not generation speed, is the bottleneck —
every finding below optimizes for a clean first pass, not faster typing.
The unit is time from task framing to an accepted change in main. Read by
`impulse-goal` (the execution engine) and `impulse-project-management`
(spec-driven workflow) — this file is the evidence base both stand on.

## Rework, not generation, is the bottleneck

2026 field data converges on one number: generation is fast, acceptance
isn't. Reported first-pass acceptance on AI-generated code clusters well
below human baseline (32.7% vs. 84.4% in one benchmark; ~27-30% in another),
and crossing ~40% AI-authored code correlates with a 20-30% rise in rework.
The named mechanism (2025 DORA report, "verification tax"): reviewing code
that reads as correct costs the same scrutiny as code written from scratch —
so a team can ship faster and still be net slower once rework is counted.
This is *why* `impulse-review`'s existence is a velocity lever, not just a
quality one: cutting rework beats speeding up generation, because rework is
where the time is actually going.

**Applies to impulse:** don't optimize the generation step (already fast) —
optimize what makes a first pass acceptable. That's `impulse-review`'s
scope, and it's why `impulse-review/references/review-process.md` treats
"green CI" as evidence, not proof — accepting a diff that will bounce back
is slower than one clean pass.

## Spec quality pays for itself

GitHub's internal data on Spec Kit vs. ad-hoc prompting: an order-of-
magnitude fewer full "regenerate from scratch" cycles. AWS reports customer
cases where a 40-hour feature shipped in under 8 hours of human time when
authored spec-first. The mechanism matches the rework finding above: the
bottleneck isn't code generation, it's the review-and-rework loop that
follows when output drifts from intent — a spec is what keeps that loop from
firing in the first place.

**Applies to impulse:** validates `impulse-project-management`'s spec-driven
default over ad-hoc prompting directly. Time spent on the spec is not
overhead subtracted from "real work" — it's the cheapest place to catch a
misunderstanding, before code exists to be reworked.

## Codebase search — hybrid, not "build a vector index"

2026 consensus is not semantic-beats-grep or the reverse. Semantic/vector
search measurably helps on large-codebase INTENT queries (~12.5% accuracy
gain, ~40% fewer tokens at equal retrieval quality in one study) — but
collapses to near-zero on short keyword queries ("auth flow", "handle
error"), which is exactly where grep/ripgrep wins outright: exact strings,
logs, unindexed code, zero setup cost.

**Resolves the obsidian-mind/QMD question from the research checklist:**
building a impulse-wide semantic index is NOT a blanket recommendation — the
data says give the agent both tools and let it pick per query shape, not
replace one with the other. Whether a *specific project* wants its own
semantic index is a per-project tooling decision (already the model
Read/Grep/Glob + optional MCP search follows) — impulse should not mandate
either direction suite-wide.

## Context engineering over longer prompts

The field's own diagnosis, independent of impulse: most agent failures are
context failures, not model failures — the wrong files, missing tool
definitions, the wrong slice of history at the wrong turn, not a wording
problem. "Biggest context window" is not the winning strategy; most
carefully engineered context is. This is exactly the design impulse's hooks
already implement (source-aware injection, tiered loading, injection-size
meter) — the research validates the existing direction rather than
prescribing a new one.

Two concrete, still-current-in-2026 failure shapes behind that diagnosis:
- **Lost-in-the-middle:** accuracy is highest when the relevant fact sits
  at the start or end of the input and drops by 30%+ when it's buried in
  the middle, confirmed across 17 long-context models in one multi-needle
  benchmark, none of which escaped the pattern.
- **Context rot:** a distinct, separate effect where accuracy declines as
  input grows even when the needed evidence is fixed and favorably
  placed (one controlled study: 0.92 -> 0.68 reasoning accuracy as input
  grew from a few hundred to three thousand tokens).

RULE: neither is fixed by a bigger window; both are why front-loading the
ruleset and keeping the injected payload small (the meter) is the correct
lever, not context-window size.
Evidence:
[Lost-in-the-middle still real in 2026, RULER multi-needle results](https://dev.to/gabrielanhaia/lost-in-the-middle-is-still-real-in-2026-even-on-1m-token-models-2ehj) ·
[Context rot: why long-context LLMs degrade](https://www.tmls.nyc/research/context-rot-mechanistic)

## Parallelism — a size-and-separability threshold, not a default

- Parallelize only when BOTH hold: each task takes >2 minutes, AND the
  tasks touch a clearly separable file set. Below that, coordination
  overhead eats the gain.
- Watch for two silent failure modes beyond textual merge conflicts:
  **duplicated implementations** (parallel branches independently build
  the same helper because they couldn't share the decision), and
  **semantic contradictions** (each branch is locally correct,
  composition breaks at runtime — passes review, fails in integration).
- Mitigate with git-worktree isolation per agent plus automated
  verification gating the merge — never a manual scan for conflicts
  after the fact.

**Applies to impulse:** the same threshold now gates `impulse-brainstorm`'s
subagent fan-out (`references/panel.md`) — that gate was reversal-cost-based
("one-way door + anchoring"); this data adds the orthogonal size/separability
axis. Both must hold for a subagent fan-out to be worth its cost, not either.
Full mechanics: `shared/subagents.md`.

## Prompt caching — real, and time-sensitive to configure right

Cache hits: 60-90% cheaper, 30-80% faster (prefill is usually the slow
part of a request). Cache TTLs have gotten shorter over time — a
60-minute default dropping to 5 minutes was one documented 2026 change —
check the configured TTL before assuming it's long; a session or hook
built assuming the old TTL silently pays 30-60% more with no code change.

RULE: put static content (system prompt, ruleset, reference docs) before
dynamic content in every prompt — caching matches a prefix, and the
moment it diverges, everything after stops being cached.

Applies to impulse: this is already this suite's own architecture
(`hooks/impulse-instructions.js` emits static ruleset text) — the finding
confirms the shape, not a change.

## Search and read discipline — escalate, never start broad

A concrete ladder, not a principle to interpret per task: known file → read
just that file (offset/limit range if large) → the specific neighbor
(caller/callee/sibling actually needed) → targeted `grep` with a
constrained path/pattern and a result cap → repo-wide search, last resort,
still pattern-constrained. Never run a command with genuinely unbounded
output (recursive listing, `git log` with no `-n`, full verbose test logs)
without a limit already attached — add the cap before running it, not
after reading a flood.

Two measured waste patterns worth naming because they're easy to miss in
the moment:

- **Re-reading a file that hasn't changed.** An edit's result already
  confirms the file's new state — re-reading it afterward pays for content
  already known. Read again only if an external process (formatter,
  linter, generator) touched it after the edit. Read-then-edit-then-read
  on one file is the most common shape of this waste.
- **Path-spelling drift defeats your own "already read this" tracking.**
  `C:\Dev\x`, `C:\dev\x`, and `/c/dev/x` name the same file with different
  strings — any recall or dedup keyed on the string misses the match.
  Normalize to the one spelling the repo/tooling already uses and keep it
  byte-identical for the rest of the session.

## Session hygiene — batch, don't repeat, don't re-poll unchanged state

- Batch independent tool calls into one round instead of issuing them
  serially — round-trips cost turns, not just tokens.
- Reference an earlier conclusion instead of re-deriving it.
- Capture a value that won't change within the session (an auth token, a
  config lookup, a build ID) once, reuse it — re-issuing an identical call
  re-pays for its whole output every time.
- Observe once after acting, not repeatedly on unchanged state — polling a
  surface (a log tail, a page, a status) that hasn't moved since the last
  check is pure waste, not diligence.
- A long output worth keeping goes to a scratch file, read back
  selectively — write or append once; rewriting the same scratch file
  every few turns re-pays for it each time.
- A task that has genuinely outgrown the session (a second repo, a third
  unrelated ticket) gets split, not trimmed harder — no amount of
  in-session compaction beats not carrying an oversized prefix in the
  first place.

## Prompt-cache TTL — verify which one is live before pacing around it

Two TTLs exist across providers and a session runs on whichever is
configured — a short one (cache write costs more, expires fast) or a long
one (cache write costs less per read, stays warm longer). Match wakeup
pacing to the TTL actually configured for this session: treat the cache
as unaffected until the TTL is confirmed short, since pacing wakeups to
"beat" an expiry on a long-TTL session is wasted effort — the context
stays warm regardless. Match any scheduled follow-up to what's actually
being waited on, not a guessed cache clock. Keep stable content
(instructions, references) early in every prompt, volatile content late —
the general form of the caching rule above, restated as a session-hygiene
habit, not just a hook-authoring one.

**Where the cost concentrates, when measured.** One real multi-day audit
attributed spend roughly 54% cache-read (driven by turn count × context
size in a single long session), 36% cache-write (driven by cold-starting
subagents/workflows — each pays for its own prefix from zero), 10% output
generation. The fix for each is different and doesn't transfer: a long
solo session that's cache-read-heavy needs splitting (§ session hygiene
above); a wide subagent fan-out that's cache-write-heavy needs fewer,
warmer agents or passing findings in rather than re-deriving them per
agent (`subagents.md`'s handoff discipline). Diagnose which shape a
session actually has before reaching for either fix — cache *hit rate*
alone is a poor signal, since a session can sit at 90%+ hit rate and still
be dominated by read volume.

## Model routing — real savings, with an unpriced tail risk

Organizations report 30-70% cost cuts from routing cheap tasks to cheap
models. The documented caveat matters more than the headline: a task routed
to a cheap model that needs 3-4 retry passes plus human cleanup can cost MORE
than one clean frontier-model pass — and task cost is not reliably
predictable in advance (one benchmark saw the same nominal task vary up to
30x in total tokens across agentic runs).

RULE:
1. Route by task TYPE: file navigation/mechanical edits -> cheap model;
   architecture/ambiguous specs -> frontier model.
2. Do not route by a guessed complexity score — type, not estimated
   difficulty, decides the model.
3. Keep a budget guard active regardless of which model is routed to; a
   cheap-model task can still blow past its expected cost on retries.

## Feedback loop speed — the thresholds are human, and still apply

The Doherty threshold and its refinements:
- 1.0 second: ceiling for uninterrupted flow.
- 10 seconds: attention limit before context-switching cost kicks in.
- 10 minutes: focus-loss threshold, ~23 minutes to recover.

No agent-specific version of this threshold was found — but a human
still reviews the agent's output, so a slow test/lint loop taxes the
human half of the cycle exactly as it always did.

RULE: keep the agent's local test/lint loop in the seconds-to-low-
single-digit-minutes range; anything crossing the 10-minute mark breaks
flow the same way it always did, agent or not.

**Applies to impulse:** `impulse-goal`'s phase loop and any verify step
should treat its own test/lint runtime as a first-class design constraint,
not an afterthought — a phase that waits on a slow suite pays this tax on
every iteration, not once.

## Batching vs. interactive checkpoints — no clean answer, stated honestly

No study directly compared "long autonomous run" vs. "short runs with human
checkpoints" on time-to-accepted-result. What the field does say: fully
autonomous is good for well-scoped, low-error-consequence work; a poorly
designed human-checkpoint system (too many approvals) can be SLOWER than
doing the work manually — the win from checkpointing isn't automatic, it
depends on checkpoint density matching the actual error consequence.

Decision rule for checkpoint density, picked from the task's actual blast
radius rather than defaulting to either extreme:
1. Low consequence (reversible, low-blast-radius change) -> run fully
   autonomous, no checkpoint.
2. Medium consequence (touches shared code, hard to review diff) ->
   checkpoint once before merge.
3. High consequence (data migration, security, prod config) -> checkpoint
   at each major step.

## Tools over reasoning — has a number now

Deterministic tools (calculators, schema validators, code-execution
sandboxes) return the same result for the same input, are cacheable
indefinitely, and are the right choice whenever the task has one. The
reliability gap is concrete: LLM tool-call sequences can diverge run to
run even at temperature zero, and agent failures are compositional — every
individual step can look locally correct and the run still ends up wrong,
because the reasoning connecting the steps was the actual point of failure.
One concrete technique with a measured number: predicting the next likely
tool call from usage patterns instead of a full reasoning pass cuts
inference cost up to 30% while holding task-completion rate.

**Applies to impulse:** confirms the existing `scripts/`-as-black-boxes rule
(`shared/authoring.md`) isn't just a style preference — every task reducible
to a deterministic script should be one, because the alternative isn't just
slower, it's a different, harder-to-bound failure mode (compositional
reasoning drift vs. a script's fixed behavior).

## Metrics — rework rate is now a first-class signal

DORA's 2025 report added "rework rate" (unplanned fixes pushed to
production) as a fifth core metric specifically because AI-authored code
broke the original four-metric picture — deploy frequency and lead time can
both improve while quality silently degrades.

RULE: report impulse's impact using rework rate (or its proxy here:
`impulse-review` BLOCK count that reaches main anyway, if that's ever
measurable) as the primary metric, with output volume/deploy frequency
only as secondary context — that's the metric that would actually
validate or falsify this suite's central claim.

**Use DORA and SPACE together; build a third metric only if both leave a
real gap unaddressed.** DORA answers "how well does the team deliver" —
it's blind to where the actual time goes: one 2026 analysis found DORA
metrics miss the ~47% of developer time spent in communication/
coordination entirely, and roughly half of developers report losing 10+
hours a week to organizational friction DORA has no way to see. SPACE
(Satisfaction, Performance, Activity, Communication, Efficiency) is the
complementary lens for exactly that blind spot — reach for it when DORA
numbers look fine but something still feels wrong. A bespoke
"productivity score" built from whatever's easy to log (lines of code,
commit count, ticket velocity) is the ladder's over-engineering direction
applied to metrics.
Evidence:
[Swarmia: comparing DORA, SPACE, and DX Core 4](https://www.swarmia.com/blog/comparing-developer-productivity-frameworks/)

## Before you apply any of this

Re-check against the highest-impact rules in this file: are you
optimizing for a clean first pass, not faster generation (top rule)? Is
the spec settled before code exists to be reworked? Does your search
follow the escalation ladder with an explicit output cap? Are independent
tool calls batched and stable values cached once per session? Is
checkpoint density picked from the task's actual blast radius, not a
default?

## Sources

- [Faros AI: 2026 AI Engineering Report — acceptance/rework data](https://www.faros.ai/blog/ai-acceleration-whiplash-takeaways)
- [SoftwareSeni: AI code productivity paradox, 41% generated / 27-30% accepted](https://www.softwareseni.com/the-ai-code-productivity-paradox-41-percent-generated-but-only-27-percent-accepted/)
- [Plandek: DORA vs SPACE in AI-enabled engineering, rework rate as 5th metric](https://plandek.com/blog/dora-vs-space)
- [GitHub Spec Kit / AWS Kiro spec-driven case data](https://zeroshot.ghost.io/spec-driven-development-with-ai-coding-agents/)
- [StartupHub.ai: Claude Code semantic search vs grep benchmarking](https://www.startuphub.ai/ai-news/ai-research/2026/claude-code-benchmarking-semantic-search-vs-grep)
- [Is Grep All You Need? agentic search study](https://arxiv.org/html/2605.15184v1)
- [Sourcegraph: context engineering guide, "most agent failures are context failures"](https://sourcegraph.com/blog/context-engineering)
- [Augment Code: multi-agent production requirements, 2-minute/separable-files threshold](https://www.augmentcode.com/guides/multi-agent-ai-production-requirements)
- [AI Magicx: Claude prompt caching cost/latency data](https://www.aimagicx.com/blog/prompt-caching-claude-api-cost-optimization-2026)
- [dev.to: Claude prompt-cache TTL change and its cost impact](https://dev.to/whoffagents/claude-prompt-caching-in-2026-the-5-minute-ttl-change-thats-costing-you-money-4363)
- [Digital Applied: LLM model routing 2026, cost/quality tradeoffs](https://www.digitalapplied.com/blog/llm-model-routing-2026-cost-quality-optimization-engineering-guide)
- [Ivern AI: agent cost benchmark, SWE-bench 30x token variance](https://ivern.ai/blog/ai-agent-cost-benchmark-report-2026)
- [NetworkPerspective: DevEx book, feedback-loop thresholds](https://www.networkperspective.io/devex-book/test-efficiency-fast-reliable-tests)
- [MindStudio: human-in-the-loop checkpoints, when they slow things down](https://www.mindstudio.ai/blog/human-in-the-loop-checkpoints-ai-agents)
- [Zylos Research: tool-augmented LLM agent production architecture, compositional failure + tool-usage-inertia cost data](https://zylos.ai/research/2026-04-16-tool-augmented-llm-agents-production-architecture/)
