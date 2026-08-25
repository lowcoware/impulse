# Verification layer — sourcing and design

**This file is background/citations only.** It explains why the five
verification bullets in `impulse-core`'s Layer 2 exist. It does not add,
soften, or replace any rule — the bullets themselves are binding as
stated in the always-on ruleset, independent of anything below.

`impulse-core`'s Layer 2 targets two failure categories that survive an
otherwise-correct plan and hit every model on the roster, not just weak
ones: hallucinated facts/APIs, and confident claims that turn out
unverified. Companion to `shared/multi-harness-robustness.md` (which
covers delivery mechanics and negation-phrasing); this file covers *why
these specific five bullets* and what's rigorous evidence vs. reasonable
inference.

## Per-bullet sourcing

**"Match the actual spec, not just the example given."** Restating the
general rule before coding is the best-supported response to a
documented failure mode: code-generation models measurably overfit to the
literal example in a prompt instead of generalizing the spec. Treat the
restatement as the working mitigation, not a guarantee — no single
benchmarked one-line fix exists for this beyond it.
Evidence: RTL-generation studies show models passing the original example
while failing a reworded version of the identical spec (specification
misalignment) —
[A Deep Dive Into LLM Code Generation Mistakes](https://arxiv.org/html/2411.01414v1),
[Fixing LLMs' Specification Misunderstanding](https://arxiv.org/html/arXiv:2309.16120)

**"Verify every function/API call... before shipping it."** Do this check
anyway — it's a cheap, worthwhile first pass. Bounded limit: self-detection
of a model's own hallucinated facts caps out around ~58% (GPT-3.5+CoT), and
a model that hallucinated an API *because it didn't know the real one*
often can't catch that by re-checking itself — that gap needs an actual
compiler/type-checker/test run, this bullet just catches the cheaper cases
first (where the model DOES know better and just didn't check).
Evidence: `CodeHalu` taxonomizes this exact failure class and uses
execution-based verification for that reason, not self-report —
[Can LLMs Detect Their Own Hallucinations?](https://arxiv.org/html/2511.11087v1),
[CodeHalu](https://arxiv.org/html/2405.00253)

**"An ambiguous requirement gets a direct question, not a silent
assumption."** Phrased as an explicit check ("gets a direct question")
rather than a vague "ask if unsure," because the source finding is
specifically that a standing vague instruction doesn't close this gap —
an explicit judgment step does better.
Evidence: models *can* correctly judge a query as ambiguous when
explicitly asked to assess it as a judgment, but in normal task flow they
overwhelmingly answer/code directly instead of asking — recognition and
behavior are decoupled —
[Knowing but Not Showing](https://arxiv.org/html/2605.25284v1)

**"Check zero/empty/null/negative/boundary inputs... before calling
code done."** Explicit boundary/edge-case enumeration measurably improves
coverage — treat this as a measured effect, not folklore, even though the
closest available evidence is test-gen-shaped rather than
general-coding-shaped.
Evidence: 5x more correct generations, +26% relative coverage in one
benchmark —
[Code-Aware Prompting / SymPrompt](https://arxiv.org/abs/2402.00097)

**"A claim of 'done'/'works'/'passes' needs the actual output shown."**
Showing raw output is the direct, obvious countermeasure to a
well-evidenced problem — sound inference, even though no controlled
study benchmarks it specifically as the fix for a coding agent.
Evidence: autonomous research agents "claim success despite clear
experimental failures"; a separate 25-model study found LLM self-reports
don't predict actual behavior or human-rated output quality; sycophancy
research shows models fabricate convincing supporting "evidence" to
match what they expect the user wants to hear even when they possess
contrary knowledge —
[Why LLMs Aren't Scientists Yet](https://arxiv.org/pdf/2601.03315),
[Self-Report-Behavior Gap Across 25 Models](https://arxiv.org/pdf/2606.09843),
[Sycophancy and false medical information](https://pmc.ncbi.nlm.nih.gov/articles/PMC12534679/)

## Rejected approaches (historical record only, not part of the ruleset)

**Chain-of-Verification (CoVe) / Self-Refine as a full technique.**
Rejected because both are multi-step iterative protocols (draft, generate
independent verification questions, answer them separately from the
draft's context, revise), not a one-line instruction — running that full
loop on every turn would violate the always-paid-surface budget this
layer has to respect (see `impulse-core/SKILL.md`'s Boundaries): every
session/subagent spawn pays for whatever's in `coreRuleset()`, so a
heavyweight per-turn protocol isn't free the way it would be as an opt-in
workflow step. The five bullets above are the compressed, load-bearing
instructions distilled from this research, not the full protocol — do
not implement CoVe/Self-Refine as a loop based on this note.
Evidence: CoVe: 0.39->0.48 F1 on list QA; Self-Refine: ~20% avg gain
across 7 tasks including code —
[Chain-of-Verification](https://arxiv.org/abs/2309.11495),
[Self-Refine](https://arxiv.org/abs/2303.17651)

**Resource-lifecycle checks (open/close, goroutine/task leaks).**
Rejected from this file specifically because they are language/domain-
specific rather than a universal reasoning pattern — kept in the domain
hardening files instead, consistent with core's existing boundary ("core
carries the essence... a rule needing more than two lines belongs in a
domain skill"). Still real and enforced: see
`impulse-backend/references/ai-tells-extended.md` for the sourced
catalog.

## Interaction with `multi-harness-robustness.md`'s findings

Every bullet here is phrased as a positive imperative, none as a
negation chain — same reasoning as the rest of `coreRuleset()`'s
rewrite: compound negation is a measured failure mode that's worse on
open-weight models, so keeping these affirmative isn't a weak-model
concession, it's the right phrasing for every model reading this layer.
