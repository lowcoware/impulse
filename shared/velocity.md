# Agent-development velocity — what actually shortens time-to-merge

Not about typing faster. The unit is time from task framing to an accepted
change in main. Read by `impulse-goal` (the execution engine) and
`impulse-project-management` (spec-driven workflow) — this file is the
evidence base both stand on.

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
**lost-in-the-middle** — accuracy is highest when the relevant fact sits at
the start or end of the input and drops by 30%+ when it's buried in the
middle, confirmed across 17 long-context models in one multi-needle
benchmark, none of which escaped the pattern — and **context rot** — a
distinct, separate effect where accuracy declines as input grows even when
the needed evidence is fixed and favorably placed (one controlled study: 0.92
→ 0.68 reasoning accuracy as input grew from a few hundred to three thousand
tokens). Neither is fixed by a bigger window; both are why front-loading the
ruleset and keeping the injected payload small (the meter) is the correct
lever, not context-window size.
[Lost-in-the-middle still real in 2026, RULER multi-needle results](https://dev.to/gabrielanhaia/lost-in-the-middle-is-still-real-in-2026-even-on-1m-token-models-2ehj) ·
[Context rot: why long-context LLMs degrade](https://www.tmls.nyc/research/context-rot-mechanistic)

## Parallelism — a size-and-separability threshold, not a default

Parallel agents pay off specifically when: each task takes >2 minutes AND
operates on a clearly separable file set. Below that, coordination overhead
eats the gain. Two failure modes beyond textual merge conflicts, worth
naming because they're silent: **duplicated implementations** (parallel
branches independently build the same helper because they couldn't share the
decision), and **semantic contradictions** (each branch is locally correct,
composition breaks at runtime — passes review, fails in integration).
Standard mitigation: git-worktree isolation per agent + automated
verification gating the merge, never a manual scan for conflicts after the
fact.

**Applies to impulse:** the same threshold now gates `impulse-brainstorm`'s
subagent fan-out (`references/panel.md`) — that gate was reversal-cost-based
("one-way door + anchoring"); this data adds the orthogonal size/separability
axis. Both must hold for a subagent fan-out to be worth its cost, not either.
Full mechanics: `shared/subagents.md`.

## Prompt caching — real, and time-sensitive to configure right

Confirmed savings: 60-90% lower cost on cache hits, 30-80% lower latency
(prefill is usually the slow part of a request). The one operational trap:
providers have moved cache TTLs shorter over time (a 60-minute default
dropping to 5 minutes was one documented 2026 change) — a session or hook
built assuming the old TTL silently pays 30-60% more without any code
change. *Practical rule:* put static content (system prompt, ruleset,
reference docs) before dynamic content in every prompt — caching matches a
prefix, and the moment it diverges, everything after stops being cached.
This is already this suite's own architecture (`hooks/impulse-instructions.js`
emits static ruleset text) — the finding confirms the shape, not a change.

## Model routing — real savings, with an unpriced tail risk

Organizations report 30-70% cost cuts from routing cheap tasks to cheap
models. The documented caveat matters more than the headline: a task routed
to a cheap model that needs 3-4 retry passes plus human cleanup can cost MORE
than one clean frontier-model pass — and task cost is not reliably
predictable in advance (one benchmark saw the same nominal task vary up to
30x in total tokens across agentic runs). *Practical rule:* route by task
TYPE (file navigation, mechanical edits → cheap; architecture, ambiguous
specs → frontier), not by a guessed complexity score, and keep a budget
guard rather than assuming the cheap path stays cheap.

## Feedback loop speed — the thresholds are human, and still apply

The Doherty threshold and its refinements: 1.0 second is the ceiling for
uninterrupted flow, 10 seconds is the attention limit before context-
switching cost kicks in, and losing focus past the 10-minute mark costs
~23 minutes to recover. No agent-specific version of this threshold was
found — but a human still reviews the agent's output, so a slow test/lint
loop taxes the human half of the cycle exactly as it always did. Practical
target teams converge on: seconds to low single-digit minutes for the
loop an agent iterates against locally; anything crossing into
coffee-break territory (the old 10-minute mark) breaks the same flow state
it always broke, agent or not.

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
depends on checkpoint density matching the actual error consequence. This
isn't resolved by a single number; the honest answer is "depends on the
task's error cost," not "batching wins" or "checkpoints win."

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
both improve while quality silently degrades. Do not report impulse's impact
via output volume or deploy frequency alone; rework rate (or its proxy here:
`impulse-review` BLOCK count that reaches main anyway, if that's ever
measurable) is the metric that would actually validate or falsify this
suite's central claim.

**Don't stop at DORA, and don't invent a custom productivity score
instead.** DORA answers "how well does the team deliver" — it's blind to
where the actual time goes: one 2026 analysis found DORA metrics miss the
~47% of developer time spent in communication/coordination entirely, and
roughly half of developers report losing 10+ hours a week to
organizational friction DORA has no way to see. SPACE (Satisfaction,
Performance, Activity, Communication, Efficiency) is the complementary
lens for exactly that blind spot — reach for it when DORA numbers look
fine but something still feels wrong, not as a DORA replacement. Neither
framework is a license to build a bespoke "productivity score" from
whatever's easy to log (lines of code, commit count, ticket velocity) —
that's the ladder's over-engineering direction applied to metrics: use
the two established frameworks together before inventing a third.
[Swarmia: comparing DORA, SPACE, and DX Core 4](https://www.swarmia.com/blog/comparing-developer-productivity-frameworks/)

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
