---
name: impulse-debt
description: >
  Harvest every "impulse:" ceiling marker into one debt ledger so deferrals get
  tracked instead of forgotten. Flags rot: markers without an upgrade trigger.
  One-shot report. Triggers: "/impulse-debt", "debt scan", "show debt ledger",
  "тех долг", "покажи долг", "что мы отложили", "маркеры", "ceiling markers",
  "tech debt", "technical debt", "what did we defer".
---

Every deliberate impulse simplification carries a marker naming its ceiling and
upgrade trigger:

`// impulse: <ceiling>, <upgrade trigger>` (Go/TS) · `# impulse: ...` (Python)
(example: impulse-backend references/ladder.md)

This skill collects all markers into one ledger so a deferral can't quietly
become permanent.

## Run

`node "${CLAUDE_PLUGIN_ROOT}/scripts/impulse-debt.js"` from the repo root.

Script unavailable → fallback scan:
`grep -rnE '(#|//) ?impulse:' . --exclude-dir={node_modules,.git,dist,build,.nuxt,.output}`

## Interpret

One row per marker (columns as the script prints them):

| Column | Meaning |
|---|---|
| LOCATION | file:line where the shortcut lives |
| CEILING | the limit the simplification holds until |
| TRIGGER | the condition that forces the upgrade (`(none)` if absent) |
| AGE | git-age — how long the marker has existed |
| FLAG | `ROT` / `STALE` / both / `-` |

## Rot flags

1. No trigger named → flag `ROT`. A marker without an upgrade trigger is not
   debt, it's decay. Fix: add a trigger or delete the shortcut's excuse.
2. git-age > 6 months → flag `STALE`. Check whether the trigger already fired.

An `impulse:` marker is a deliberate carve-out by construction — it always
lands in Fowler's technical debt quadrant's Deliberate column, never
Inadvertent. The column that matters for triage is Prudent vs Reckless: a
marker with a real ceiling and trigger is Deliberate-Prudent ("we know the
limit, we'll act when it's hit"); a marker with no trigger (already flagged
`ROT` above) has degraded into Deliberate-Reckless — the "we know this is
bad and left no way to know when to fix it" case, which is exactly why a
trigger-less marker is decay rather than tracked debt, not just a formatting
gap.

Research on self-admitted technical debt (SATD) comments — the academic
name for exactly this marker pattern — found roughly 46.7% of TODO-style
comments in open-source repos are low-quality: ambiguous, missing the
information a future reader needs to act on them. A `ROT`-flagged
`impulse:` marker is this same failure mode caught mechanically instead of
left for a human to notice years later.

A marker can carry both flags. Whether a trigger's metric is actually measured
(e.g. a named p95 with no `/metrics` on that path) is a human call — the
scanner has no deps and can't inspect other services, so read the trigger and
judge it yourself.

## Output

Ledger table, one row per marker, sorted by location (same-file rows land
together) — `LOCATION | CEILING | TRIGGER | AGE | FLAG` — then a one-line
verdict:

`<N> marker(s), <M> rot, <K> stale.`

Nothing found: `No impulse: markers found. Clean.`

## Boundaries

Reads and reports only, changes nothing. Persist only when asked → write
`IMPULSE-DEBT.md` at repo root. One-shot: no mode change, no flag files.
