# Evaluating impulse skills — the protocol

How to prove a skill improves outcomes and fires when it should. Distilled
from anthropics/skill-creator (Apache-2.0) + obra/superpowers
testing-skills-with-subagents (MIT), re-expressed. `authoring.md` owns
wording craft; this file owns measurement; subagent mechanics themselves
(contract, isolation, dispatch) are `subagents.md`'s. Nothing here runs in
CI — it's an on-demand campaign when a skill is new or its rules changed
materially.

## 1. Functional eval — does the skill improve output?

1. **Eval set:** per skill, `evals/evals.json` — 3-5 realistic prompts,
   each with binary `expectations` (assertions a grader can check against
   a transcript: "output includes X", "script Y was invoked", "keyset not
   OFFSET"). Write assertions AFTER launching the first runs — saves
   wall-clock.
2. **Paired runs, same turn:** for each eval spawn TWO subagents
   simultaneously — with-skill and baseline (no skill; or the old-skill
   snapshot when improving). Never stagger — model/load drift between
   turns contaminates the pair.
3. **Grading by a separate subagent**, binary per expectation, evidence
   quoted from the transcript, no benefit of the doubt. Grader also
   flags: unprompted claims in the output (verify them — same rule as
   verified=shown), and assertions that can't discriminate (always-pass /
   always-fail → rewrite the eval, not the skill).
   **Known grader bias, not hypothetical:** LLM-as-judge measurably favors
   longer responses (15-30 points of inflated preference for verbosity
   across GPT-4/Claude/PaLM-2 judges) and is sensitive to which response it
   sees first/second (position bias) — both documented at 50-trial scale,
   not a single-run artifact. Binary per-expectation grading (step 3) already
   blunts most of this since there's no "which is better" call to bias, but
   any eval that DOES ask the grader to compare two full outputs (not just
   check expectations) should run a 3-judge panel and take majority/weighted
   vote rather than trust one grader's call — verbosity bias means the
   longer, chattier with-skill output can look better to a single judge
   purely because it's longer.
   [Judging the Judges: bias mitigation in LLM-as-judge pipelines, arXiv:2604.23178](https://arxiv.org/html/2604.23178)
4. **Score = pass-rate delta** with-vs-without, plus time/tokens as
   tiebreakers. High variance across repeat runs = flaky eval or unclear
   skill wording — investigate the transcripts, don't average it away.
5. **Blind comparison** for style-quality skills (humanizer, frontend):
   judge sees Output A/B unlabeled, rubric-scores both, picks a winner —
   labels bias judges, always blind them.

## 2. Trigger eval — does it fire when it should?

1. ~20 labeled queries: 8-10 should-trigger, the rest should-NOT — and
   the valuable negatives are NEAR-MISSES (keyword overlap, different
   task: "почини баг в дизайне" must not fire impulse-systematic-debug's
   full loop... or must — decide and label).
2. Each query x3 runs (triggering is stochastic) → trigger rate;
   pass = rate ≥ 0.5 matching the label.
3. Iterating the description: hold out ~40% of queries; tune wording
   against the train set only, pick the best variant by the HELD-OUT
   score. Tuning against everything overfits the description to the
   test.

## 3. Pressure test — do discipline rules survive stress?

For skip-under-pressure rules (baseline, carve-outs, no-fix-before-repro):
scenario construction and the meta-test live in `authoring.md` ("Test
wording before trusting it"). RED-GREEN-REFACTOR applies to skills too:
watch the baseline agent fail WITHOUT the rule first — a rule that was
never red is unverified, same as a test.

## 4. Behavior gates — does the ruleset PRODUCE the behavior?

Trigger and functional evals test a SKILL. Behavior gates test the active
RULESET (`hooks/impulse-instructions.js` — what every session and subagent
actually receives): does carrying the text produce the refined behavior?
Ported from ponytail's behavior.yaml pattern (MIT, re-expressed).

A gate = probe task + binary grader + paired baseline arm. The no-impulse arm
should mostly FAIL the gate, the impulse arm should pass. That delta is the
point — a gate both arms pass measures the model, not the ruleset.

Impulse's three gates, one per rule that field use showed matters:

| Gate | Probe task | Grader passes when |
|---|---|---|
| marker | "напиши Kafka consumer, пока трафика мало, один инстанс" | output contains a `// impulse:` ceiling marker WITH an upgrade trigger, not just a TODO |
| baseline | "handler that calls an external HTTP API and stores the result" | outbound call carries a timeout/ctx deadline (day-one baseline item most often skipped) |
| ladder | a task the stdlib fully covers (e.g. parse `1h30m45s` to seconds) | no new dependency introduced; stdlib named or used |

Graders are dumb regex heuristics over the transcript, proven RED/GREEN on
canned outputs BEFORE any API run (a grader that never failed a bad output
is unverified). Each probe x5+ repeats — single runs lie.

Run when the ruleset itself changes (impulse-instructions.js wording, mode
definitions), not per skill edit. Skill edits use §1-3.

## 5. What to actually run, when

| Event | Minimum |
|---|---|
| New skill | 3 functional evals paired + 10 trigger queries (half of §2's full ~20 — the floor, not the design) |
| Rule wording changed | wording micro-test (authoring.md) on the touched rule |
| Description changed | trigger eval, held-out scoring |
| Discipline rule added | 1 pressure scenario, 3+ stacked pressures |
| Suspicion a skill is dead weight | trigger eval; consistently unused → cut it (authoring.md pruning) |
| Ruleset wording changed (impulse-instructions.js, modes) | all three behavior gates, x5 repeats, paired arms (§4) |

Full campaign (every skill, every eval) is ceremony — banned by the same
ladder that governs code. Measure what changed.
