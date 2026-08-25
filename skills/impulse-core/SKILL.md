---
name: impulse-core
description: >-
  Always-on master layer of the impulse suite: engineering spine
  (anti-overengineering ladder essence, carve-outs, ceiling markers) +
  verification (spec-vs-example, hallucinated-API check, ambiguity,
  edge cases, claim-needs-evidence) + token economy (search escalation,
  narrow reads, batching, delegation test, memory protocol). Injected
  automatically every session and every
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
  requested. With a domain mode active, also preserve its day-one baseline
  (`impulse-backend/references/baseline.md`) — a separate sentence, not an
  exception buried inside the base list.
- Every deliberate ceiling gets a marker: `// impulse: <ceiling>,
  <upgrade trigger>` (`#` in Python) — e.g. `// impulse: in-memory cache,
  move to Redis past one instance.` A marker with no trigger is rot —
  `hooks/impulse-validate-write.js` flags it at write time, `/impulse-debt`
  harvests the ledger.
- Build exactly what's requested, in its plainest working form: a
  function beats a framework, nothing speculative (extra config,
  unrequested abstraction) ships alongside it.
- **Stop at done.** Acceptance criteria pass — stop. Ship that: polish,
  cleanup, or extra tests after the pass wait for the user to ask.
- **Touch only files the task owns; treat any drive-by edit as out of
  scope.** Everything else, including the user's own edits, stays exactly
  as found — an improvement nobody asked for in a file the task didn't
  own is a regression risk with no requirement backing it.

## Layer 2 — verification

Targets the two documented failure modes that survive an otherwise-good
plan: hallucinated facts/APIs and confident-but-unverified claims. Detail
and sourcing: `shared/verification-layer.md`.

- Match the actual spec, not just the example given — restate the
  general rule in one line before coding when the request includes a
  worked example.
- Verify every function, method, or API call against something actually
  seen this session (an import, a doc, existing code) before shipping
  it. An unfamiliar name that sounds plausible is a guess, not a fact.
- An ambiguous requirement gets a direct question, not a silent
  assumption.
- Check zero/empty/null/negative/boundary inputs before calling code
  done — each is handled or explicitly out of scope.
- A claim of "done"/"works"/"passes" needs the actual output shown. A
  claim with no evidence is a guess wearing a fact's clothes.

## Layer 3 — token economy

Distilled from `shared/velocity.md` and `shared/token-hygiene.md` (both
carry the evidence and the full versions):

- **Search escalation** — known file -> its neighbor -> scoped grep
  (path + pattern + result cap) -> repo-wide last.
- **Output cap** — always pass an explicit bound before running a
  search or log command: `git log` with `-n`, a bounded grep, never an
  unbounded recursive listing or full verbose log.
- **Narrow reads** — offset/limit on large files; structure scan
  (tree/signatures/targeted grep) before a full read. Trust your own
  edit's result; re-read only when an external process (formatter,
  linter, generator) touched the file since.
- **Batch and cache** — independent tool calls go in one round; a
  stable value (auth token, config, build ID) is fetched once per
  session and reused.
- **Assume state is current** — treat a fetched value as unchanged
  unless something could plausibly have changed it since.
- **Scratch files** — long output worth keeping goes to a scratch file
  once, read back selectively; rewriting the same scratch file every few
  turns re-pays for it each time.
- **Delegation test** — delegate to a subagent when a sweep needs
  reading more than 5 files or skimming more than 2000 lines to produce
  an answer under a few hundred words: tokens-to-explore far exceeds
  tokens-of-answer. The subagent always returns a condensed summary
  (`shared/subagents.md`). `impulse: the 5-file/2000-line threshold is a
  reasoned placeholder, not measured — revisit once real over/under-
  delegation cases are observed in practice.`
- **Memory protocol** — a project with `.impulse/memory/` follows
  `shared/memory.md`: index first, full text on demand, verify a stored
  fact against current repo state before acting on it.

## Before you finish

Re-check the draft output against Layer 1/2's own bullets before
finishing: touched only files this task owns? every non-trivial
API/function call verified against something seen this session? every
done/works/passes claim backed by shown output? Fix any "no" before
finishing — this is the same restatement injected at the end of the
compact ruleset every turn (`hooks/impulse-instructions.js`).

## Delivery across harnesses

Claude Code gets this via plugin hooks. Gemini CLI/Qwen Code get
`GEMINI.md` (`contextFileName`). Hermes Agent gets
`hermes-plugin/impulse-core/` (a real Hermes plugin, re-injects every
turn via `pre_llm_call`) — install guide: `INSTALL.md` § Hermes Agent.
All copies are `check-sync.js`-locked to this file. Wording (affirmative
imperatives over negation chains) is tuned against sourced findings on
why weaker models drop compound-negation instructions — research:
`shared/multi-harness-robustness.md`.

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
