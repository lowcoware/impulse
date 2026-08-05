# "Should we rewrite/adopt X?" — a specialization of the panel loop

Source: distilled from xiaotonng/why-not-rust (harvested GitHub skill). The
main loop (SKILL.md) generates 3 approaches and scores them; this file is
for the specific recurring fork of "should we rewrite this component in
[language/framework/runtime]" or "should we adopt [new tool] to replace
what we have" — a one-way-door decision that keeps surfacing with hype-
driven or nostalgia-driven bias baked into the framing before any panel
even starts. Run this instead of (not in addition to) a generic 3-way
panel when the fork is specifically this shape.

## 1. Name the requirement, not the language preference

State the actual gap first: an SLO miss, a cost problem, a safety/
correctness requirement, or a distribution/deployment constraint —
never "X is more modern" or "the team wants to learn Y." If the honest
answer is "no concrete gap, just preference," that's the verdict already;
don't run the rest of the framework to arrive somewhere it already is.

## 2. Compare like-with-like — isolate the actual cause

The proposed rewrite usually bundles several changes at once: a language
switch AND an algorithm change AND a different DB access pattern AND a
different runtime. Separate them. A rewrite that "proves" a 10x win but
also switched from an O(n²) algorithm to O(n log n) proved the algorithm
change, not the language. Attribute the win to its real cause before it
becomes evidence for the language.

## 3. Smallest sufficient reversible step, in this order

Prefer the earliest option in this list that actually meets the named
requirement — don't skip ahead to a full rewrite because it's the
exciting option:

1. Stay (tune the existing implementation — often sufficient)
2. Adopt an existing library/tool inside the current stack
3. Extract just the hot-path kernel into the new language, keep
   everything else as-is
4. Replace one component fully
5. Full migration (last resort, highest cost, hardest to reverse)

## 4. Four proof gates — all must pass, not just the loudest one

- **G1 — Requirement met.** The proposed change actually closes the
  named gap from step 1, measured, not asserted.
- **G2 — Causality is real.** The improvement traces to the
  language/tool itself, not to the redesign that happened alongside it
  (step 2's isolation).
- **G3 — Economics favor the smallest option.** A bigger step than
  necessary (step 3) needs its own justification, not just "since we're
  in there anyway."
- **G4 — Delivery and reversibility.** Can this ship incrementally? Can
  it be rolled back if it's wrong? A migration with no rollback path
  needs a much higher confidence bar to justify at all.

## 5. Ceiling check — reject targets above the physical limit

Before accepting a performance target as the justification, check it
against Amdahl's Law given the hot-path fraction: if the claimed
bottleneck is only 20% of total time, no rewrite of that 20% delivers
more than a 1.25x overall speedup regardless of language, and a target
above that ceiling is unreachable by construction — the target itself is
wrong, not the implementation.

## 6. Symmetric challenge — bias-check both directions

Explicitly interrogate BOTH the migration-hype case ("is this genuinely
warranted or just exciting") AND the status-quo-comfort case ("are we
keeping this because it's actually fine, or because rewriting is scary")
with the same rigor. A framework that only challenges the exciting option
just launders confirmation bias toward staying put, and vice versa.

## 7. Verdict — four parts, explicit DEFER-MEASURE when evidence is missing

State: authorization (whose call is this), scope (what's actually in/out
of the change), confidence (how strong is the evidence from the gates
above), robustness (what happens if an assumption is wrong). When the
evidence needed for a gate genuinely doesn't exist yet — no profiling
data, no load test — the honest verdict is **DEFER-MEASURE** (go get the
missing evidence before deciding), not a guessed yes/no dressed up as a
confident recommendation.

## Boundaries

This replaces the generic 3-way panel (SKILL.md's Diverge/Score) for this
specific fork shape — don't run both. The implementation once decided
still goes through the normal build skill (impulse-backend/
impulse-frontend/etc.); this file only covers reaching the decision.
