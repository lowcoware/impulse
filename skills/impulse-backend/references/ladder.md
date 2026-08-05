# The ladder — full rules

Stop at the first rung that holds. Two rungs work → take the higher one and
move on. The first lazy solution that works is the right one — once you
actually know what the change has to touch.

Scope: deployable, rollbackable services. Safety-critical / no-rollback code
inverts the brevity defaults (NASA Power of Ten: bounded loops, assertions,
no dynamic alloc) — this ladder does not apply there.

Why lazy-first is safe: most changes are two-way doors — reversible, so decide
fast and stay minimal (Bezos). The carve-outs below are the one-way doors. An
omitted feature can be added once understood; a feature shipped before it is
understood can rarely be removed (Hoare).

## Rungs

| # | Rung | Rule |
|---|---|---|
| 1 | YAGNI-skip | Speculative need = skip it, say so in one line. Exception: baseline items and carve-outs are never skipped. |
| 2 | Reuse in-service | A helper, type, or pattern already in THIS service → reuse it. Look before you write. |
| 3 | Stdlib | Stdlib does it → use it. Two stdlib options, same size → take the one correct on edge cases. |
| 4 | Platform primitive | Postgres constraint over app-level check. Redis primitive (SETNX, INCR, TTL, streams) over hand-rolled cache/lock. Traefik middleware over app middleware. Kafka semantics (keys, offsets, consumer groups) over custom dedup. |
| 5 | Blessed dep | Already-blessed dependency solves it → use it. New dep outside the blessed list (deps.md) = justify in one line or don't add it. |
| 6 | One line | Can it be one line? One line. |
| 7 | Minimum code | Only then: the minimum code that works. |

## Rung 2 across services — the hard line

- Cross-service reuse = contracts/schemas ONLY: proto, OpenAPI, AsyncAPI.
- Never import another service's internals. Not its models, not its utils.
- Shared lib requires BOTH: 3rd duplication AND leaf-stable code (pure, no service-specific deps). One of the two = not yet.
- Copy-paste between services is often correct. Name it in the output line, don't hide it.

## Rules

- No unrequested abstractions: no interface with one implementation (single testability exception — see layout.md), no factory for one product, no config key for a value that never changes. Seam-counting: one adapter = hypothetical seam, two adapters = real one — introduce the interface at two. Two counts here because the contract's shape arrives from outside (an external system defines it); extracting shared code from similar blocks you author waits for the Rule of Three — duplication is cheaper than the wrong abstraction, abstract at the third occurrence (Metz; Fowler/Roberts).
- Deletion test for a suspect module: imagine deleting it — if the complexity vanishes with it, it was a pass-through layer, not a module. Delete.
- No scaffolding "for later" — later can scaffold for itself. Scaling groundwork = ceiling marker, not code.
- Deletion over addition. Boring over clever — clever is what someone decodes at 3am.
- Fewest files possible. Shortest working diff wins — but only once you understand the problem.
- Complex request? Ship the lazy version and question it in the same response: "Did X; Y covers it. Need full X? Say so." Never stall on an answer you can default.
- User insists on the full version → build it, no re-arguing.
- New dep beyond the blessed list costs an innovation token — a team holds a handful; spend one only when blessed tools structurally can't, never for elegance (McKinley).
- Rewrites double the risk: v2 is where every idea sidetracked from v1 wants back in (Brooks' second-system effect). Apply the ladder harder on a rewrite than on greenfield.
- YAGNI prices capabilities, not changeability: it assumes tests and malleable code, and never excuses skipping a simplifying refactor (Fowler, Beck).
- Non-obvious rationale gets a one-line why-comment — code can't carry the why (Ousterhout). `impulse:` markers cover skips; why-comments cover decisions.
- A quantitative "engineering fact" (10x developers, exponential cost-of-change) justifies process only after its primary source checks out — most don't survive the trace (Bossavit).

## Bug fix = root cause, not symptom

A report names a symptom. Before you edit, grep every caller of the function you're about to touch.

The lazy fix IS the root-cause fix: one guard in the shared function beats a guard in every caller. Patching only the path the ticket names leaves every sibling caller still broken — fix it once, where all callers route through.

## Never lazy about understanding

The ladder shortens the solution, never the reading. Trace every file the
change touches, the actual flow end to end, THEN pick a rung. A small diff in
the wrong place is a second bug dressed up as efficiency.

## Carve-outs — never simplified away

| Carve-out | Meaning |
|---|---|
| Trust-boundary input validation | Every payload crossing a trust boundary (HTTP body, Kafka message, external API response) is validated before use. |
| Error handling preventing data loss | Any path where a swallowed error loses a write, an event, or money gets full handling. |
| Security | Authn/authz checks, secret handling, injection surfaces — never trimmed for brevity. |
| Day-one baseline | Every item in baseline.md ships regardless of task size or mode. |
| Explicitly requested | User asked for it by name → build it in full. |

Carve-outs are not mode-gated. Blitz skips narration, never these.

## Ceiling markers

The scaling-groundwork mechanism. Replaces speculative code entirely.

Syntax: `// impulse: <ceiling>, <upgrade trigger>` (Go/TS) / `# impulse: <ceiling>, <upgrade trigger>` (Python).

| Rule | Check |
|---|---|
| Every deliberate simplification with a known ceiling gets a marker | shortcut shipped without marker = violation |
| Marker names the ceiling (what breaks) AND the trigger (measurable condition to upgrade) | marker without trigger = rot, impulse-debt flags it |
| Trigger is observable: a metric, a count, a latency, a duplication event | "when needed" / "if it grows" = not a trigger |
| No marker on code that has no known ceiling | markers are for shortcuts, not decoration |

Examples:

```go
// impulse: global mutex, switch to per-account locks when p95 > 50ms
// impulse: sync publish, move to outbox when this event starts carrying money/state
// impulse: full table scan, add index when orders > 100k rows
```

bad: `// impulse: naive cache` — no trigger, rot.
good: `# impulse: in-process cache, move to Redis when second replica appears`

## Output pattern

Code first. Then at most three short lines: what was skipped, when to add it.

Pattern: `[code] → skipped: [X], add when [Y].`

- If the explanation is longer than the code, delete the explanation — every paragraph defending a simplification is complexity smuggled back as prose.
- Explanation the user explicitly asked for (report, walkthrough) is not debt — give it in full.
- Skips land in the output line AND as `impulse:` markers in code. Chat line is for the user; marker is for impulse-debt.

## Sources

Inline names cite a verified 66-source corpus:
Fowler, Brooks, Hoare, Knuth-in-context, Metz, Ousterhout, Hickey,
Gall, McKinley, Bossavit, Holzmann; Segment / Prime Video / istiod / Uber
monolith cases; GitLab / Knight / Cloudflare postmortems. No rule above rests
on an unchecked claim.
