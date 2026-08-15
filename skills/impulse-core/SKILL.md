---
name: impulse-core
description: >-
  Always-on master layer of the impulse suite: engineering spine
  (anti-overengineering ladder essence, carve-outs, ceiling markers) +
  token economy (search escalation, narrow reads, batching, delegation
  test, memory protocol). Injected automatically every session and every
  subagent by the plugin hooks — this skill is the readable owner of those
  rules and the switch documentation. Fires for questions about the
  always-on layer or requests to disable it. Triggers: "/impulse-core",
  "impulse core", "what is always on", "what rules are active", "какие
  правила активны", "почему правила уже активны", "отключи impulse",
  "impulse off", "disable impulse", "выключи core", "как отключить
  постоянные правила impulse", "почему ты экономишь токены", "token
  discipline rules", "правила экономии токенов".
---

# impulse-core — the always-on master layer

Unlike every other impulse skill, this one does not wait to be invoked.
The plugin's hooks inject its compact ruleset on every `SessionStart` and
every `SubagentStart`, domain modes on or off — the way the caveman
plugin's mode survives every turn. What's injected lives in
`hooks/impulse-instructions.js` (`coreRuleset()`); this file is the full
readable version and the single place the switch semantics are documented.
`scripts/check-sync.js` trips if the two drift.

## Why a master layer exists

The suite's two universal disciplines fail exactly when nobody remembered
to activate a mode: over-engineering happens on the "quick script" nobody
ran `/impulse-backend` for, and token waste happens in the exploratory
session before any domain was chosen. Rules that only hold when a flag is
set aren't a baseline — they're a feature someone has to remember. Core
is the remembering.

## Layer 1 — engineering spine

The distilled, domain-neutral form of the ladder (full version with
blessed-dep lists and the day-one baseline: `impulse-backend`; register
system: `impulse-frontend`):

- Stop at the first rung that holds: YAGNI-skip -> reuse in-service ->
  stdlib -> platform primitive -> blessed dep -> one line -> minimum code
  that works.
- Carve-outs never simplified away: trust-boundary input validation,
  error handling that prevents data loss, security, anything explicitly
  requested — and with a domain mode active, its day-one baseline joins
  this list (`impulse-backend/references/baseline.md`).
- Every deliberate ceiling gets a marker: `// impulse: <ceiling>,
  <upgrade trigger>` (`#` in Python). A marker with no trigger is rot —
  `hooks/impulse-validate-write.js` flags it at write time, `/impulse-debt`
  harvests the ledger.
- No unrequested abstraction, no speculative config, no framework where a
  function does.
- **Stop at done.** Acceptance criteria pass — stop. Polish, cleanup, or
  extra tests after the pass are unrequested work unless the user asked.
- **No drive-by edits.** Change only what the task owns; unrelated
  behavior and the user's own edits stay untouched — an improvement
  nobody asked for in a file the task didn't own is a regression risk
  with no requirement backing it.

## Layer 2 — token economy

Distilled from `shared/velocity.md` and `shared/token-hygiene.md` (both
carry the evidence and the full versions):

- **Search escalation** — known file -> its neighbor -> scoped grep
  (path + pattern + result cap) -> repo-wide last. Never a command with
  unbounded output; cap before running, not after reading a flood.
- **Narrow reads** — offset/limit on large files; structure scan
  (tree/signatures/targeted grep) before a full read; never re-read a
  file after your own edit confirmed its state, unless an external
  process (formatter, linter, generator) touched it since.
- **Batch and don't repeat** — independent tool calls go in one round;
  never re-poll unchanged state; a stable value (auth token, config,
  build ID) is fetched once per session and reused.
- **Scratch files** — long output worth keeping goes to a scratch file
  once, read back selectively; rewriting the same scratch file every few
  turns re-pays for it each time.
- **Delegation test** — a many-file sweep with a small answer is a
  subagent job when tokens-to-explore far exceeds tokens-of-answer; the
  subagent returns a summary, never a raw transcript
  (`shared/subagents.md`).
- **Memory protocol** — a project with `.impulse/memory/` follows
  `shared/memory.md`: index first, full text on demand, verify a stored
  fact against current repo state before acting on it.

## Switches

| Action | Command | Scope |
|---|---|---|
| Disable core | `/impulse-core off` | Durable (`~/.config/impulse/config.json`, `"core": false`) |
| Re-enable | `/impulse-core on` | Durable, takes effect next session start |
| Session/env off | `IMPULSE_CORE=0` | That environment only |
| Domain modes off | `stop impulse` / `normal mode` | Domain flags only — core stays on |

Core-only sessions show `[IMPULSE:CORE]` in the statusline; with a domain
mode active the domain badge wins and the injection header carries
`core: on`.

## Boundaries

- Core carries the essence, never the detail: mode blocks
  (blitz/hardcore), blessed-dep lists, register rules, and review tags
  stay in their domain skills. If a rule needs more than two lines here,
  it belongs in a domain skill or `shared/` with a pointer.
- This skill changes no files and runs no commands — it is documentation
  plus the switch protocol; the hooks do the injecting.
- Additions to `coreRuleset()` are paid on EVERY session and EVERY
  subagent spawn — the injection meter prices it. New line: justify
  against `shared/token-hygiene.md`'s always-paid-surface rule first.
