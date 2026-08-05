# Review process — how much to look at, and how hard to trust it

Not a bug catalog (see `ai-bug-patterns-be.md` and `ai-bug-patterns-fe.md` for
those) — this is
about the review ACT itself: how much diff one pass can actually cover, why a
polished diff is not evidence of correctness, and what an LLM reviewer (this
skill included) is and isn't good at.

## Size — defect detection collapses past ~400 lines

A SmartBear-documented Cisco Systems study is the field's reference point:
detection rate by review size — 1-100 lines ~87%, 101-300 ~78%, 301-600 ~65%,
601-1000 ~42%, 1000+ ~28%. Google's internal review data independently lands
on the same number: PRs under ~400 changed lines get materially better review
than larger ones. Speed matters too — defect density collapses above
~400-500 LOC/hour; a review that's fast AND thorough past that rate is not
happening, one of the two is fiction.
[SmartBear: Cisco peer-review study](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/) ·
[Propel Code: PR size vs review quality](https://www.propelcode.ai/blog/pr-size-impact-code-review-quality-data-study)

**Applies directly to impulse-review:** a diff over ~400 lines is not "the
same review, more of it" — it is a different task. Chunk it (see below)
rather than running one pass and reporting full confidence.

## Chunking a large (agent-scale) diff

Agent output routinely produces diffs no human-scale review process was
sized for. Two findings, both actionable:

**Structural features predict review effort better than reading the diff
does.** Added/deleted LOC, files-changed count, and change entropy predict
how much a diff will cost to review more accurately than its content does —
a "circuit breaker" triage built on these caught 69% of high-effort PRs
while only reading 20% of the review budget.
[Early-Stage Prediction of Review Effort in AI-Generated PRs, arXiv:2601.00753](https://arxiv.org/html/2601.00753)

**Risk-based triage, not uniform depth.** Classify by risk (touches auth/
money/public-contract/data-migration vs. not — same axis as
`intent-reconstruction.md`'s adaptive-depth rule) before deciding review
depth: low-risk + small + green tests → fast pass; high-risk or large or
boundary-crossing → full pass, reviewed first, not last.
[Codex KB: practical review strategies for agent output](https://codex.danielvaughan.com/2026/05/24/human-review-bottleneck-code-review-strategies-agent-output/)

For impulse-review specifically: on a diff this large, sample proportionally
across files/risk-classes rather than reviewing front-to-back and running out
of attention before the riskiest file. State which files got full depth vs.
a lighter pass — an unstated partial review reads as a complete one.

**When packing files into a token-limited pass, bundle related files as
one unit rather than ranking them independently by priority.** A naive
priority ranking (source > tests > docs) can separate a change from its
own test file if they rank differently, so the reviewer sees the
implementation without the test that exercises it. Keep a source file and
its test (or i18n/localization siblings) adjacent in the pack, not
scattered by independent rank.

**A cross-file dependency graph seeded into review context is a real
technique with a real, sometimes-null result — measure it, don't assume
it helps.** Computing the caller/test/type-use graph for touched code and
feeding it into review context can catch cross-file breakage a model
would otherwise miss — but on a well-named, well-typed codebase a capable
model often already infers the same breakage from names and types alone,
with no measured recall improvement from the extra graph. Worth it on
large monorepos or poorly-named code; worth checking whether it's earning
its cost before assuming it's free value everywhere.

**A finding whose line number drifted slightly off the diff hunk (a
common LLM-reviewer failure mode) gets re-anchored, not dropped to a
vague summary.** If the code at a nearby diff line matches what the
finding actually describes, snap the finding to that line rather than
either posting at the wrong line or falling back to an unlocated comment
— losing the file:line precision defeats the format's whole purpose
(`review-process.md`'s LLM-as-reviewer section: a vague finding with no
locatable failure scenario is the false-positive shape).

## When a review is too large for one pass — checkpoint, don't restart

A review scoped bigger than one context can finish (a whole-service audit,
a large security sweep against a long checklist) needs a resumable
mechanism, not a hope that it finishes before running out of room:

1. **Persist progress to a state file** as the review runs — `{commit,
   mode, ledger: {ruleId: {status, evidence}}}` shaped, or equivalent —
   so a review that runs out of context checkpoints where it stopped and
   resumes from there instead of restarting from zero.
2. **A coverage gate blocks "done."** Every applicable checklist item
   needs an explicit verdict (PASS / FAIL / N/A / DEFERRED) before the
   review reports complete — silently skipped items are indistinguishable
   from passed ones otherwise, which defeats the point of having a
   checklist at all.
3. **Findings need reachability, not just a pattern match.** A finding
   confirmed by actually reading the call path from an untrusted input to
   the vulnerable sink is real; a pattern that merely LOOKS dangerous in
   isolation, with no confirmed path a caller can actually reach, is a
   candidate to investigate — reporting it as a finding without the
   reachability check inflates false-positive rate and erodes trust in
   the next review's findings too.
4. **Re-verify the scope hasn't moved before final synthesis.** A long
   review has real duration — the diff being reviewed can legitimately
   change underneath it (new commits land, staging gets amended). Before
   producing the final report, re-check that the scope is still the same
   snapshot the review started against; if it moved, re-review the delta
   rather than silently reporting against a diff that no longer exists in
   that exact shape.
5. **Any pass that CAN fail silently needs its own status vocabulary,
   not a binary ran/didn't.** A secret scanner, a linter integration, a
   dependency check — each needs distinct states (`clean` / `found-and-
   handled` / `unavailable` / `failed-to-run` / `disabled`) so the report
   never conflates "ran and found nothing" with "didn't run." Claiming
   "scanned, clean" when the actual status is `unavailable` is a specific,
   checkable class of overclaiming.

## Before running checks — scope what actually needs checking

Two triage steps before the review passes themselves run, both aimed at
not wasting review attention on categories that can't apply to this diff:

1. **Detect diff shape/language before loading review lenses.** Load
   only the checks relevant to what's actually in the diff (bugs+security
   always; language- and architecture-specific lenses conditionally) —
   loading every possible check and filtering afterward burns context and
   adds noise a scoped pass wouldn't produce. A cheap triage pass (a
   smaller/faster model, or a quick regex-shape read) deciding WHICH
   specialist lenses are worth spawning is cheaper than always fanning
   out the full set.
2. **PR-type gates which categories apply.** A config-only PR skips
   React/complexity/naming checks; a test-only PR skips security/perf/
   a11y; a deletion-only PR (see below) skips normal correctness review
   almost entirely in favor of its own removal-specific checklist. Name
   the PR's type (Feature / Bugfix / Refactor / Test-only / Deletion-only
   / Migration / Config) before deciding which tags in the catalog even
   fire — this is a coarser, faster gate than per-file scoping and
   catches the case where an entire review dimension doesn't apply to
   this diff at all.

## Automation bias — polish is not correctness

Automation bias is a documented, general finding: operators reduce
monitoring of automated systems specifically under multi-task load — and
increased verification effort is the documented countermeasure, not more
trust in the system's own confidence.
[Parasuraman & Manzey: complacency and bias in automation use](https://dl.acm.org/doi/10.1007/s00146-025-02422-7)

Applied here: an AI-authored diff reads as confident and syntactically clean
whether or not it's correct — that's exactly the surface signal a reviewer's
habitual pattern-matching keys off. A well-formatted diff, plausible variable
names, and a clean diff view are not evidence of correctness; they are the
same signal a human-written diff gives when it's *also* wrong. Review the
diff you'd get from an intern who is extremely fluent and occasionally
confidently wrong — the fluency is not the risk signal, autopilot trust is.
This is the standing justification for `bug:`/`arch:` existing as an
explicit, separate pass instead of trusting "it reads fine."

**The same bias applies to the reviewer's own completion claims, not just
the diff being reviewed.** Two concrete, checkable rules: running a
command whose output was never actually inspected does not count as
verification — a green exit code alone is not evidence, since a command
can exit 0 while producing wrong output the caller never looked at. And
before reporting a review or task complete, re-check the actual "files
changed" list against the real working tree (signatures, arity, new-vs-
modified status) rather than reporting from memory of what was intended
— memory of the plan and the actual diff drift apart more often than
either party notices in the moment.

## LLM-as-reviewer — know the tool's own failure mode

impulse-review is itself run by an LLM. Its limits are the field's, not
special to this suite:

- **High false-positive rates are the dominant failure mode**, not missed
  bugs — some pipelines produce 7+ false positives per PR on average; one
   open-source security-report pipeline saw its confirmed-valid rate driven
  below 5% by AI-generated submissions, prompting maintainers to pause intake
  entirely.
  [StepSecurity-adjacent field data via arXiv:2601.18844](https://arxiv.org/pdf/2601.18844)
- Best measured LLM-reviewer setups still trade precision for recall or vice
  versa — no current setup clears both bars at once. Treat every `bug:`/
  `arch:` finding this skill emits the same way: state it as a claim with a
  concrete failure scenario, not as ground truth. If the failure scenario
  can't be stated concretely, the finding is probably a false positive.
- This is exactly why the format mandates `<file>:<line>: <SEV> <tag> <what>.
  <fix>.` — a vague finding with no locatable failure scenario is the
  false-positive shape the research above describes.

**If this catalog's own calibration is ever formally checked**, the
useful eval design has two distinct layers, kept separate: negative
scenarios (code that deliberately looks like it should trigger a tag but
must NOT — a false-positive trap) alongside the usual positive scenarios,
since most eval suites only test "does it catch the bug" and never
"does it stay quiet on fine code"; and a frozen benchmark of real
past findings, hand-graded once and reused only to regression-test
output formatting/parsing — kept deliberately separate from any
judgment-quality eval so a formatting regression and an actual judgment
regression never get conflated into one pass/fail signal.

## Finding lifecycle — from candidate to shipped, with nothing silently dropped

Everything above governs how much to review and how much to trust it.
This governs what happens to an individual candidate concern between
"noticed" and "shipped in the report":

1. **Reachability/viability is a distinct axis from valid/invalid.**
   A finding can be technically correct AND unreachable in the shipped
   configuration (gated behind `assert()`/`NDEBUG`, a debug-only path, a
   test fixture). Tag it explicitly — `VIABLE` / `NON_VIABLE` (confirmed
   unreachable) / `SAMPLE_OR_TEST` / `CONDITIONAL_VIABLE` (only under
   non-default config) — rather than collapsing "real bug" and
   "technically true but never executes" into one BLOCK.
2. **When a finding can't be re-verified, default to the SAFER status,
   never to silent deletion.** A file moved, a line shifted, a snapshot
   drifted — if viability can't be confirmed, keep the finding and flag
   it as unverified (`CONDITIONAL_VIABLE`-shaped) rather than dropping it
   as `NON_VIABLE`. The asymmetry matters: a false "this is fine, drop
   it" is unrecoverable; a false "keep this, flag it as uncertain" only
   costs a second look.
3. **Content-similarity match is not identity match — a regression is
   not a duplicate.** A new finding that matches a previously-RESOLVED
   finding by content (same bug pattern) but not by commit/snapshot
   identity is a possible regression (fixed once, reintroduced by a
   revert/rebase/bad merge) — tag it `POSSIBLE REGRESSION` and keep it
   active, never silently filtered as "already handled."
4. **Every candidate concern needs a visible final disposition, not just
   the ones that became findings.** Before the report is final, every
   concern noticed during review — including ones that didn't reach
   BLOCK/WARN status — appears SOMEWHERE: as a finding, a suggested
   verification, a stated review limitation, or an explicit "considered,
   low-confidence, not reported." A concern that vanishes with no visible
   fate is functionally the same failure as silently dropping a real bug.
5. **The reviewer's own bad output gets mechanically dropped, and the
   drop is visible.** A finding citing a file:line not actually in the
   diff, or a rule ID that doesn't exist in the project's own catalog, or
   below a confidence floor, gets filtered BEFORE the user sees it — and
   the filtered count is reported ("2 findings dropped: 1 off-diff, 1
   fabricated-rule-citation"), not silently absorbed. The user sees that
   filtering happened, not just a clean-looking report that might have
   been quietly edited down.
6. **A speculative "question" finding needs a concrete failure
   restatement before it's actionable, or it stays a note.** A finding is
   only promotable to a real BLOCK/WARN if it can be phrased as "if
   [condition] is true, [concrete failure] occurs, so [fix] is needed" —
   a vague "is this handled correctly?" that can't be restated this way
   moves to notes, never gets posted as an actionable finding.
7. **The positive/summary side of a review needs the same citation
   discipline as findings.** A "what's done well" note is only as
   trustworthy as the findings if it's held to the same bar — every
   positive claim cites a `file:line` or a named pattern actually visible
   in the diff. Generic praise ("clean code", "good naming," "handles
   edge cases well") with nothing to point at is fabrication on the
   positive side, exactly as ungrounded as a fabricated bug finding.
8. **State what was verified clean, not just what was found broken.**
   A "Non-Issues (explicitly verified)" section — what was actually
   checked and confirmed fine — distinguishes "I looked at the auth path
   and it's correct" from "I never looked at the auth path." Silence on a
   category currently reads as either; it shouldn't.

## Cross-model / cross-agent adversarial review

When review runs across more than one model or more than one independent
pass, reconciliation needs its own protocol — a naive "both flagged it,
keep both findings" merge loses the actual value of running two passes.

1. **Tag every finding by source**, and let agreement do real work:
   findings both passes independently surface are higher-confidence than
   either alone; findings only one pass surfaces need explicit
   adjudication (agree/disagree/uncertain, one-line reason) — never
   silently dropped, never silently rubber-stamped into the merged report.
2. **A genuine factual disagreement gets exactly ONE rebuttal round.**
   The challenged pass receives concrete counter-evidence and is asked to
   withdraw or hold-and-sharpen its position — framed as adjudication,
   not persuasion, specifically to guard against an LLM capitulating just
   because it was told it's wrong rather than because the counter-
   evidence actually holds.
3. **Asymmetric veto: a finding implying the REVIEWING pass's own prior
   output was wrong is never self-dismissed by that same pass.** The
   party least equipped to judge whether it made a mistake is the party
   that made it — verify with a non-LLM check (a test, a grep, a type
   checker) or escalate to a human instead of trusting self-assessment
   here specifically.
4. **Sampling-asymmetry awareness.** If one pass runs N specialist lenses
   and a second pass runs one general pass, "the second pass didn't flag
   it" is weak evidence, not confirmation — the two passes didn't sample
   the same space, so their disagreement rate isn't directly comparable.
5. **Degrade gracefully, never block, when the second model/pass is
   unavailable.** Proceed with the primary review alone and say so
   plainly in the output — a missing second opinion is a stated
   limitation, not a blocker on shipping the review at all.
6. **A cheaper same-thread alternative exists when a genuine second
   model isn't worth the cost.** Inject a falsification stance into the
   SAME reviewing thread after the initial pass, then run one explicit
   self-check turn hunting for gaps — downgrade uncertain findings, never
   silently delete them. Lighter than spinning up an independent
   adversarial pass; use it when the budget doesn't justify a real second
   opinion but "trust the first pass's confidence unexamined" still isn't
   good enough.
7. **When merging confidence scores from multiple passes, take the
   LOWER, never average or take the higher.** Optimistic aggregation
   (picking whichever pass was more confident) overstates certainty the
   passes didn't actually share.

## Tests passing is not "correct" — benchmark contamination as the cautionary case

SWE-bench, the field's reference agentic-coding benchmark, has documented
contamination and gaming: models reproducing memorized gold patches
verbatim, agents dropping a `conftest.py` that survives environment reset and
overwrites test outcomes via a pytest hook, and a large fraction of "hardest"
unsolved tasks turning out to have flawed test cases rather than unsolved
bugs. The field's own response was building a harder, less-contaminated
successor (SWE-bench Pro) rather than trusting the original scores.
[Position: coding benchmarks are misaligned with agentic SWE, arXiv:2606.17799](https://arxiv.org/pdf/2606.17799)

Applied here: "tests pass" is evidence, not proof. A diff can pass every
test and still not do what was asked (`intent-reconstruction.md`'s whole
premise) or pass tests that were shaped to make it pass (`test:`'s
same-pass-self-verification finding, `ai-bug-patterns-be.md`). Green CI on an
agent-authored diff earns the same scrutiny as green CI anywhere else — it
narrows the search space, it doesn't close the review.

## Test-quality addendum — over-mocked tests

A 2026 empirical study of coding-agent-generated tests found agents
systematically over-mock: tests pass but verify the mock's behavior, not the
system's. Companion finding: AI-generated suites reach high line coverage
while killing far fewer mutants than equivalent human-written suites —
coverage and fault-detection diverge specifically in agent-authored tests.
[Are Coding Agents Generating Over-Mocked Tests?, MSR'26](https://andrehora.github.io/pub/2026-msr-agents-over-mocked-tests.pdf)

Add to the `test:` tag's checklist alongside assert-less tests and same-pass
self-verification: a test suite that's all-green and high-coverage on an
agent-authored diff is a reason to spot-check for real assertions and real
mocked-vs-real boundaries, not a reason to skip that check.

## Reviewing a PR that already has state — dedup, re-review, and third-party comments

impulse-review is one-shot-per-diff by design (documented boundary). Three
capabilities extend that without contradicting it, for when a PR has
already had a prior round of review (human or bot) before this pass runs:

1. **Dedup against existing feedback before writing new findings.**
   When prior review comments (human, another bot) already exist on the
   PR, check them before generating new findings — write a new finding
   only if it adds material evidence, corrects outdated advice, or the
   prior comment no longer applies to the current diff. Otherwise, drop
   it or reduce it to a one-line "already flagged, agree" rather than
   re-stating the same concern as if it were new.
2. **Re-review (a second pass on an updated diff) uses a 4-state
   taxonomy: Resolved / Still open / Partially addressed / New findings.**
   A prior finding is marked Resolved ONLY when the code it pointed to is
   confirmed absent from the current diff — never inferred from a commit
   message claiming "fixed."
3. **Evaluating a specific existing comment is its own capability**,
   distinct from generating findings: given one comment (pasted,
   permalinked, or file+line+excerpt) from a human or another bot,
   produce a compact verdict — Worth addressing / Partially / Nitpick /
   Not warranted — checked against the CURRENT diff, not the diff the
   comment was written against, with an optional suggested reply if
   pushback is warranted. Different question than "is this diff correct"
   — it's "is this specific opinion about the diff correct."
4. **The PR description itself is a review dimension**, not just the
   diff. Flag it when it reads like a raw commit-log/iteration chronicle
   instead of a clean summary of the PR's net effect — escalate if it
   actively misleads a reader about what the diff does. A misleading
   description degrades every reviewer who reads it first, human or bot.

## Deletion-heavy diffs need their own checklist, not the normal one

A diff whose main content is removal doesn't fit "does the code do what
it claims" review — there's little new logic to check for correctness.
Instead:

1. Enumerate every deleted symbol and grep all references to it across
   the codebase.
2. Classify each: **Safe-to-remove** (zero external references) /
   **Needs-migration** (has consumers, the diff provides a path) /
   **Defer** (has consumers, no migration, not blocking) /
   **Dangerous** (removes an auth check or safety invariant — always a
   BLOCK regardless of the other classifications).
3. Completeness checklist: orphaned tests, orphaned types, now-unused
   dependencies, dead imports in files that imported the deleted module,
   barrel-file re-exports not cleaned up, a migration guide if it was a
   public API.

**No backward-compat scaffolding on brand-new code.** Code with zero
existing callers that ships with deprecated re-exports, a migration path,
or a feature flag for gradual rollout is its own named tell — flag it
explicitly ("this is new code with no existing callers, the compat layer
is unnecessary"), the same YAGNI stance `impulse-backend/references/ladder.md`
already holds, phrased for review output specifically.

## When to even suggest a refactor — a gate, not a reflex

Spotting a code smell isn't sufficient reason to recommend refactoring it
— check before suggesting:

- **Rule of Three** — don't flag the first duplication, only the third;
  refactoring on the first occurrence is premature abstraction in the
  making.
- **Change frequency** (`git log` on the file) — refactoring cold,
  rarely-touched code is pure cost with no future benefit to recoup it.
- **Blast radius cap** — more than ~5 callers means a tracked follow-up
  task, not an inline PR suggestion; a refactor that size doesn't belong
  bundled into review feedback on an unrelated diff.
- **Behavior-preservation requires existing test coverage** — no tests
  covering the path being refactored means "add tests first, in a
  separate change," not "refactor now and hope."
- **Wrong-abstraction check (Sandi Metz)** — duplication is cheaper than
  the wrong shared abstraction; if the "shared" code needs `if
  (isTypeA)`-style branches to serve both call sites, it was never really
  shared, and merging it back into duplicated form is the correct fix.

## Multi-agent failure taxonomy — cross-check for `arch:`/`bug:` gaps

MAST (1600+ annotated traces across 7 multi-agent frameworks, expert-
annotated, κ=0.88 inter-annotator agreement) found 14 distinct failure modes
in 3 clusters: **specification/system-design** (~42% — task
misinterpretation, ambiguous roles, poor decomposition, duplicate agent
roles, missing termination conditions), **inter-agent coordination
breakdown** (~37%), and **weak task verification** (~21%). Relevant to a
diff that itself implements multi-agent orchestration (a `impulse-goal`-style
pipeline, a custom subagent fleet): the dominant failure class is
specification quality, not inter-agent mechanics — a review of orchestration
code should scrutinize the task/role definitions and termination conditions
first, coordination logic second. This is a cross-check for gaps in this
skill's own `bug:`/`arch:` catalog on multi-agent code specifically, not a
new tag — file findings under existing tags.
[MAST: Why Do Multi-Agent LLM Systems Fail?, NeurIPS 2025](https://arxiv.org/abs/2503.13657)

## Design-to-API contract gap — before either side ships

A distinct pre-implementation check, not a code review: does the UI
design (Figma) actually match what the API contract (OpenAPI/Swagger)
provides, before either backend or frontend has built against a stale
assumption about the other. Neither `impulse-backend`'s API work nor
`impulse-frontend`'s `design-contract.md` catches this on its own —
each side reviews its own artifact, not the gap between the two.

Method: index the API spec compactly (method+path, fields, tags — not
the full spec text), then walk the design subflow-by-subflow (Sign up,
Checkout, ...), extracting per screen what it READS (fields/lists/
statuses shown), WRITES (actions available), and IMPLIES (an async/
error/empty state implies an endpoint that can fail or be slow, even if
no screen shows it directly). Match each UI need against the spec index
on a strictness scale — exact match, compatible-shape partial match,
related-resource gap, no-match gap — scored with a confidence float and
a one-sentence justification, never inflated to look more certain than
the evidence supports.

Two disciplined constraints worth keeping regardless of tooling:
**process one subflow at a time and flush detail from context after
each** (the same "don't load the whole design at once" discipline
`impulse-frontend/references/design-contract.md`'s Figma protocol already
enforces for a different reason); and **every finding cites the specific
node/endpoint actually inspected** — no claiming a mismatch exists
without pointing at the evidence.

## Company practice, 2026 snapshot

Google reports ~75% of new code is AI-authored; its internal guidance
respond by naming code review, security, and maintenance as the areas
needing more rigor, not less — the review step gets *more* attention as
authorship shifts to AI, not less. Corroborates this skill's entire premise.
[9to5google: Google's internal AI-coding guidance](https://9to5google.com/2025/06/30/google-engineers-ai-code/)

## Sources

- [SmartBear: Cisco peer-review study, 200-400 LOC / 400-500 LOC-per-hour thresholds](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/)
- [Propel Code: PR size vs review quality, Google 400-line data point](https://www.propelcode.ai/blog/pr-size-impact-code-review-quality-data-study)
- [Early-Stage Prediction of Review Effort in AI-Generated PRs, arXiv:2601.00753](https://arxiv.org/html/2601.00753)
- [Codex KB: review strategies for agent output, risk-based triage](https://codex.danielvaughan.com/2026/05/24/human-review-bottleneck-code-review-strategies-agent-output/)
- [Parasuraman & Manzey: complacency and bias in automation use](https://dl.acm.org/doi/10.1007/s00146-025-02422-7)
- [These Aren't the Reviews You're Looking For: how humans review AI-generated PRs, arXiv:2605.02273](https://arxiv.org/html/2605.02273v1)
- [Reducing False Positives in Static Bug Detection with LLMs, arXiv:2601.18844](https://arxiv.org/pdf/2601.18844)
- [Position: Coding Benchmarks Are Misaligned with Agentic SWE, arXiv:2606.17799](https://arxiv.org/pdf/2606.17799)
- [Are Coding Agents Generating Over-Mocked Tests?, MSR'26](https://andrehora.github.io/pub/2026-msr-agents-over-mocked-tests.pdf)
- [9to5google: Google's internal AI-coding guidance, 2025-06-30](https://9to5google.com/2025/06/30/google-engineers-ai-code/)
- [GitClear 2026: The Maintainability Gap](https://www.gitclear.com/the_ai_code_quality_maintainability_gap)
