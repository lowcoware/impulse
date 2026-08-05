---
name: impulse-systematic-debug
description: "Disciplined bug hunting instead of changing code at random — use whenever there is an OBSERVED failure to explain: \"this is broken\", failing or flaky test, heisenbug, prod incident cause-finding, regression, \"worked yesterday\", wrong output. Triggers: \"/impulse-debug\", \"debug\", \"bug\", \"broken\", \"not working\", \"почини баг\", \"найди баг\", \"баг\", \"не работает\", \"сломалось\", \"почему падает\", \"плавающий баг\", \"отладка\". Inspecting a diff with no observed failure = impulse-review."
---

# impulse-systematic-debug

Random edits until it works is not debugging — it's gambling that leaves the
real cause live. This skill enforces a loop: no fix until you can reproduce and
have named the cause. Output is a fix + a proof it fixed the named cause, not
"seems fine now."

## The loop — do not skip steps

1. **Reproduce.** A reliable repro is the whole game. Nail down the exact
   inputs/state/timing that trigger it. Can't reproduce → the job right now is
   building a repro (add logging, shrink inputs), NOT guessing a fix.
2. **Observe, don't assume.** Read the actual error/stack/logs. Quote them
   exact. The bug is almost never where you first think — confirm with data.
3. **Bisect the search space.** Halve it each step: `git bisect` for "worked
   yesterday", binary-search the pipeline for "where does the value go wrong",
   comment-halve for "which line". Turn N suspects into log₂N checks.
4. **Hypothesize explicitly.** Write the hypothesis before testing it: "I
   think X because Y; if true, changing Z shows W." Keep a running log — a
   killed hypothesis is progress, not waste.
5. **Smallest fix at the root.** Fix the cause, not the symptom. No drive-by
   refactor, no "while I'm here." One bug, one minimal change.
6. **Prove it.** Re-run the repro → gone. Add a regression test that FAILS
   without the fix (RED first — see `impulse-backend/references/testing.md`). "Can't
   repro anymore" without a test is not proof.

Techniques per bug class (heisenbug, flaky test, race, leak, works-on-my-
machine, prod-only): `references/techniques.md`.

## Hard rules

1. **No fix before repro.** If you can't trigger it on demand, you can't know
   you fixed it. Building the repro IS the work. The repro's bar: one command,
   deterministic, fast, agent-runnable, ALREADY RUN at least once — until that
   exists, hypothesis work hasn't started.
2. **Read the error before touching code.** Quote it exact. Guessing past the
   stack trace wastes the cheapest clue you have.
3. **One change at a time.** Batch edits hide which one worked and add new
   bugs. Change, test, keep or revert.
4. **Name the cause in one sentence** before fixing. Can't name it → you're
   symptom-patching; keep bisecting.
5. **Every fix ships a regression test** that fails without it. Non-negotiable
   for anything that reached a human.
6. **Revert your debug scaffolding.** Temp logs/prints/sleeps come out before
   the fix ships. Tag every scaffold line with one session marker
   (`[DEBUG-a4f2]`) — cleanup becomes one grep instead of a memory test.
7. **Three failed fixes = stop fixing, question the architecture.** At that
   point it's not a failed hypothesis — the component's design is likely
   wrong for the problem. Escalate to `impulse-brainstorm`/an ADR instead of a
   fourth patch.
8. **Debug spiral (conversation-level, distinct from rule 7's fix-level
   trigger — from ayghri/i-have-adhd, MIT):** if the last three turns were
   all "still broken," stop iterating on code entirely. Don't try a fourth
   variation — name the assumption most likely wrong, out loud, and ask the
   user ONE diagnostic question. Guessing faster is not the fix for
   guessing wrong; rule 7 fires on failed fixes to the same bug, this one
   fires on the conversation pattern regardless of whether each attempt
   counted as a distinct "fix."

## Boundaries

- Unfamiliar/legacy code where you don't yet understand the system →
  `impulse-legacy` first (characterization tests, blast radius), then debug.
- Live prod incident (mitigate-first, then RCA) → `impulse-devops`
  incident-response section; this skill owns the RCA/cause-finding half.
- Test-writing craft (flakiness roots, RED phase) →
  `impulse-backend/references/testing.md`.
- "stop impulse" / "normal mode": revert to default behavior.
