# Strangler Fig — incremental modernization

## The pattern

A facade/router sits in front of both the old implementation and the new
one. Traffic shifts gradually — by route, by tenant, by percentage — from
old to new. Unlike a big-bang rewrite, the system stays shippable and
rollback-able at every point during the migration, not just at the start
and end.

## Early velocity predicts success — a numbers-backed reason to start small

Analysis of 41 enterprise strangler projects (2022-2025) found 68% stalled
before 90 days, never replacing their first monolith component at all —
and projects extracting under 5% of monolith functionality in the first 90
days had a 92% failure rate. Concrete implication for picking the first
component to strangle: the risk isn't choosing the wrong one, it's
choosing one too large to actually land inside the window where momentum
still exists — pick the smallest component that proves the pattern works,
not the most impactful one. A named counter-failure:
TSB Bank's 2018 attempt at a single-event big-bang migration of 5.2M
customer accounts (the alternative to strangling incrementally) locked out
1.9M customers, exposed fraud risk, and cost ~£330M plus a £48.65M
regulatory fine — the sharpest available number for what "just cut over"
costs when it goes wrong at real scale.
[Security Boulevard: Strangler Fig pattern, 2026 data on stalled migrations](https://securityboulevard.com/2026/07/the-strangler-fig-pattern-how-to-modernize-legacy-systems-without-a-big-bang-rewrite/)

## The classic failure mode — elimination never happens

Teams reliably stop at ~90% traffic shifted and declare victory. The old
implementation, the routing facade, and any dual-write reconciliation code
all keep living — forever — because deleting the last 10% feels
low-priority once the visible pain is gone. Net result: maintenance cost
roughly doubles (two systems, one facade) instead of dropping to the new
system's cost alone. New features also keep landing in the old system
under deadline pressure, since "we're migrating" becomes a permanent
state, not a phase.

**The fix is procedural, not technical**: a strangler migration isn't
"done" when the facade routes to new — it's done when the old path and the
facade are both deleted. Track deletion as its own explicit task from the
start, with its own acceptance criterion, not an implied follow-up nobody
owns.

## When to reach for it vs. a smaller change

Strangler Fig is for module/service-scale migrations — replacing a whole
subsystem, not refactoring one function (that's `characterization.md`'s
job) and not the six-step assessment for one risky change
(`blast-radius.md`'s job). If the change fits in one PR reviewed in one
sitting, this pattern is overkill; reach for it when a single PR genuinely
can't hold the whole change safely.

## Rewrite case studies — what worked, what didn't

**Netscape (Navigator 5/6)**: the canonical failure. Froze feature work for
roughly three years to do a full rewrite from scratch instead of an
incremental migration; shipped late, shipped broken, lost the browser war
to IE while frozen. The lesson isn't "never rewrite" — it's that freezing
the *shippable* product for a multi-year rewrite has a real, often fatal,
opportunity cost.

**What the successful rewrites did differently** (a documented survey of
six cases — Basecamp, Visual Studio → VS Code, Gmail → Inbox, FogBugz →
Trello, FreshBooks → BillSpring, alongside the Netscape failure): every
success
shipped the rewrite as a **separate, coexisting product** rather than
freezing or replacing the original outright — the rewrite earned its
users gradually, the same underlying logic as Strangler Fig's
coexist-don't-cut-over principle, just applied at product scale instead of
route scale.

## Practical checklist for this project's stack

1. Facade lives at the edge (Traefik routing rule, or an application-level
   router) — not duplicated per-service.
2. Dual-write reconciliation (if data moves between old and new storage)
   gets its own idempotency/dedup treatment — same rules as
   `impulse-backend/references/events.md`'s idempotent-consumer section, this
   is structurally the same problem.
3. A monitoring signal exists to prove the new path is actually correct
   before shifting more traffic — not just "no errors," but behavior
   parity on a sample.
4. The deletion task is filed at the START of the migration, with the
   traffic-percentage threshold that triggers it named explicitly — not
   "when we get around to it."
