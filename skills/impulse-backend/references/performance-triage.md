# Performance triage — making an already-slow path fast without guessing

Distilled from wwwazzz/optimize-data-heavy-skill (harvested GitHub skill).
`capacity-estimation.md` decides BEFORE building whether a component can
carry projected load; `observability.md`'s USE Method diagnoses WHICH
system resource is saturated during an incident. This file is the third
piece: a specific, already-identified slow path (an endpoint, a page, a
job) that needs to actually get fast, cross-layer (DB/cache/payload/
render), without guessing at the cause.

## 1. Measure cold AND warm, always both — never just one

A single latency number hides which fix actually applies:

- **Big gap between cold and warm** → caching or singleflight is the
  right lever; the underlying work is fine, it's just being repeated
  unnecessarily.
- **Flat, slow warm number** → the per-request work itself is the
  problem; adding a cache in front of it caches a slow answer, it
  doesn't make the answer faster.

Real cited case worth internalizing: an endpoint already had
scan-caching in front of it, but was caching 76MB of data to serve a
17KB response. Measuring only "is there a cache" (yes) missed the actual
bug; measuring the ACTUAL cold and warm numbers (and what each one was
doing) revealed it. Measure the current state, not the assumed one.

## 2. Fix-strategy ladder — cheapest rung first, same spirit as ladder.md

Reach for the highest applicable rung before the next one down. Skipping
straight to "add an index" (rung 5) before checking whether the work is
even necessary (rungs 1-3) is the same premature-complexity mistake
`ladder.md` names for feature scope, applied to performance work:

1. **Don't do the work** — eliminate it, precompute it, cache it (or
   `caching.md`'s immutable-data-recompute case: it never needed
   recomputing at all).
2. **Do it once and share it** — memoize, singleflight, cache the
   COMPUTATION itself, not just the final response shape.
3. **Do less of it** — push aggregation into the database, cap/paginate
   what actually gets computed or returned.
4. **Do it in the right place** — SQL doing set-based work beats the
   same logic re-implemented in application code row by row.
5. **Do it faster** — an index, a better algorithm. The first
   reach-for-first-instinct fix, but the LAST rung to try.
6. **Do it off the critical path** — a background job, deferred/async
   work, if the result doesn't need to be synchronous.
7. **Send/render less** — trim the payload/DOM/response shape itself,
   the last resort when the work genuinely can't be reduced further.

## 3. A regression guard that can't fail isn't a guard

Cited real mistake: a test asserting on a field (`date`) that happened to
be identical across both seed rows in the test fixture — it passed
whether or not the actual bug was present, which is **worse than no
test**, since it manufactures false confidence that the fix is protected.
Before trusting any regression guard: remove the fix, confirm the test
actually goes red, restore the fix, confirm it goes green again. A test
with real, non-trivial assertions that still can't fail on the bug it
claims to guard is a distinct, subtler failure mode from `testing.md`'s
already-covered assert-less test — this one has assertions, they're just
not discriminating.

## Boundaries

Sizing a component BEFORE it's built: `capacity-estimation.md`. Diagnosing
which system resource is bottlenecked during an active incident:
`observability.md`'s USE Method. This file is for the case in between —
a specific path is already known to be slow, and the question is which
fix actually addresses the real cause.
