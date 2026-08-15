---
name: impulse-legacy
description: >
  Use when TOUCHING existing code you didn't write this session — mirror
  of impulse-backend/impulse-frontend for existing/unfamiliar code:
  characterization tests, blast-radius assessment, seams, Strangler Fig
  for migration, read-before-write agent protocol. Go/Python + Vue/Nuxt.
  Triggers: "/impulse-legacy", "рефакторинг без тестов", "легаси код", "не
  понимаю этот код", "безопасно поменять", "как это отрефакторить",
  "чужой код", "старый код", "старый проект", "нет тестов",
  "unfamiliar codebase", "inherited codebase", "old code", "refactor
  safely", "strangler fig", "incremental migration".
---

# impulse-legacy

`impulse-backend`/`impulse-frontend` assume you're building something new. This
skill assumes the opposite: the code already exists, you didn't write it,
and you don't yet know what it actually does — only what it's supposed to
do. **Legacy code = code without tests**, full stop (Feathers) — age and
ugliness are irrelevant to that definition; a beautiful function written
yesterday with no test is legacy the moment someone else has to change it
blind.

## The one rule everything else follows

**Understand before you touch, prove you understood before you refactor.**
A confident agent editing code it hasn't actually traced is the single
biggest source of legacy-code incidents — worse than a cautious human,
because confidence doesn't correlate with correctness here. Concretely
(steps are IDs `LG-R1`–`LG-R3`, tagged for review in
[`shared/rule-spine.md`](../../shared/rule-spine.md)):

1. Read the function/module fully before editing it.
2. State what you believe it does, its callers, and what you might break —
   in the chat response, before the diff. This is a forcing function, not
   ceremony: writing it down surfaces wrong assumptions while they're still
   cheap to correct.
3. If there's no test pinning current behavior, write one FIRST (a
   characterization test — records what the code does now, not what it
   should do) — then refactor with that test as a tripwire.

Full detail on each step: `references/characterization.md` (tests/seams),
`references/blast-radius.md` (assessment before editing),
`references/agent-protocol.md` (the read-analyze-explain-propose-stop loop itself).

## Safe-refactor sequence — the one order that actually works

`characterize current behavior → get a test in place (any test, even a
golden-master) → refactor in small steps with the test as tripwire.`

The reliably wrong order — refactor first, "test" only by manual poking
afterward — is rewriting with extra steps, not refactoring. If you catch
yourself about to change structure before a test exists, stop.

## Boy Scout Rule — bounded, not open season (`LG-B1`)

"Leave it better than you found it" applies **only inside the file/function
already being touched for the actual task** — rename a bad local var, fix
an obvious local smell you already had to read anyway. Cleanup that expands
the diff to files/functions the agent hasn't already characterized gets
split into its own separate task, never bundled with a behavior change —
mixing the two makes a diff unreviewable and risks a bug in code nobody
was actually trying to change.

## Incremental modernization — Strangler Fig (`LG-S1`)

For migrating a whole module/service, not one function: route/facade in
front of old + new, shift traffic gradually, and — the step everyone
skips — **explicitly track deletion of the old path as its own task**, not
an implied someday. A migration that reaches 90% traffic on the new path
and stops there isn't done; it's now two systems forever. Full pattern,
failure mode, and real rewrite case studies (Netscape's 3-year freeze,
what the successful rewrites did differently): `references/strangler-fig.md`.

## References — load on demand

| File | Covers | Load when |
|---|---|---|
| references/characterization.md | characterization tests, seams, Feathers' dependency-breaking techniques, safe-refactor sequence detail | any refactor of untested code |
| references/blast-radius.md | 6-step assessment workflow, feature-flag exposure limiting, grep-every-caller discipline | before any edit in unfamiliar code |
| references/strangler-fig.md | incremental migration pattern, classic failure mode, real rewrite case studies | migrating/replacing a whole module or service |
| references/agent-protocol.md | the read→analyze→explain→propose→stop loop, comprehension-debt, why agents specifically fail here differently than humans | working in any codebase the agent didn't write this session |
| [../../shared/rule-spine.md](../../shared/rule-spine.md) | builder↔review crosswalk — `LG-R1`–`LG-R3`, `LG-B1`, `LG-S1` and the `legacy:` tag that reports them | asking which review tag catches one of these, or adding a rule here |

## Boundaries

- Once characterized and tested, `impulse-backend`/`impulse-frontend`'s ladder
  and baseline apply normally to the new code — this skill governs the
  transition, not a permanent different ruleset.
- Correctness bugs found while characterizing → note them, don't silently
  fix them mid-characterization (a characterization test documents CURRENT
  behavior, bugs included; fixing during pinning defeats the point).
  Separate task for the actual bug fix.
- Architecture-decay findings (`impulse-review`'s `arch:` tag) apply the same
  way here as in greenfield code — legacy status doesn't exempt a hot
  partition key from being flagged. Violations of the rules on THIS page get
  their own tag in review: `legacy:`, fired only on pre-existing code.
- "stop impulse" / "normal mode": revert to default behavior.
