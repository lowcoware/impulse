# Capacity estimation — back-of-the-envelope, before committing to a component

Source: distilled from proyecto26/system-design-skills (harvested GitHub
skill). ladder.md decides how much CODE to build for a given feature; this
file decides whether the chosen component can actually carry the load —
a feasibility check, not precision math. Skip this entirely when the
answer obviously doesn't change any decision (a 50-user internal tool
doesn't need a QPS estimate before picking Postgres).

## The method

1. **Traffic**: `QPS = DAU × actions-per-user-per-day ÷ 86,400` (seconds/day).
   Peak QPS ≈ 2× average for a typical diurnal pattern — size for peak,
   not average.
2. **Storage**: `bytes-per-record × records-per-day × retention-days` =
   total storage. Watch the base-10 (marketing GB/TB, powers of 1000) vs
   base-2 (actual disk/memory, powers of 1024) distinction — conflating
   them silently under-sizes by ~7% per order of magnitude, compounding
   at scale.
3. **Servers**: `peak QPS ÷ sustainable requests-per-second-per-server`.
   Get the per-server number from an actual load test when one exists;
   these reference points are the fallback when it doesn't:

| Component | Rough sustainable rate |
|---|---|
| Single RDBMS node | ~1,000 QPS |
| KV store (Redis-class) | ~10,000 QPS |
| Cache server | ~100k-1M QPS |
| One CPU core, simple request | ~1,000 req/s |

## Precision discipline

This is a feasibility check, not an engineering spec — round aggressively
(99,987 ÷ 9.1 → 100,000 ÷ 10) and state the estimate as an order of
magnitude, not a false-precision number. The question being answered is
"does this architecture survive contact with real load," not "what is
the exact server count" — a number precise to 3 significant figures from
inputs that were themselves guesses is manufactured precision, not rigor.

## When NOT to estimate

Don't estimate what won't change a decision — same YAGNI spirit as
ladder.md's whole stance. If the answer is obviously "yes this handles
it" or "no this obviously doesn't scale to that" without doing the math,
skip the arithmetic and say so. Reach for this method specifically when:
a new component choice is genuinely uncertain at the traffic level named
in the brief, a scaling question comes up in review ("will this hold at
10x"), or a capacity claim is being made in a design doc that should be
checkable rather than asserted.

## Boundaries

This estimates whether a chosen component/architecture can carry
projected load — it doesn't decide whether the load justifies building
toward that scale at all (ladder.md's ceiling-marker discipline: build
for today's real numbers, mark the ceiling, escalate when actually hit,
not speculatively). Once a real bottleneck is suspected in a running
system rather than estimated ahead of one, the USE Method
(observability.md) is the diagnostic tool, not this one.
