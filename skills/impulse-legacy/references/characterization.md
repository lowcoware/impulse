# Characterization tests, seams, and safe refactoring

Michael Feathers' *Working Effectively with Legacy Code* — the core
concepts, generalized to Go/Python/Vue.

## Characterization tests

A test that pins down what the code **actually does now** — even if it
looks wrong. Don't fix a suspected bug while characterizing; that's a
different task with a different name. The point is a safety net, not a
correctness statement.

1. Call the function/component with representative inputs.
2. Record the actual output — run it, don't guess. If it surprises you,
   that's useful information, not a reason to "fix" it yet.
3. Assert exactly that output. This test now fails if refactoring changes
   behavior, which is exactly its job.
4. Only after the characterization test exists and passes does refactoring
   start.

If a suspected bug surfaces during characterization: note it (a `impulse:`
marker or a filed task), keep characterizing the current — bugged —
behavior, and fix the bug as its own separate change with its own test.

## Seams

"A place where you can alter behavior without editing in that place"
(Feathers). Practical version: find an existing seam before reaching for
`Edit` to force testability.

| Seam type | Example |
|---|---|
| Object seam (Go/interfaces, JS/composables) | swap the concrete implementation via an existing interface/injected dependency |
| Preprocessing seam | a build flag, env var, or config toggle already changes behavior |
| Link seam | a different implementation gets linked/imported in test builds |

Try substitution WITHOUT adding a new interface first — same principle as
`impulse-backend/references/testing.md` §5: go-sqlmock swaps the driver,
miniredis swaps the server, httptest swaps the transport. Only introduce a
new seam (an interface that didn't exist) when no existing one works —
and even then, the narrow test-seam exception from `impulse-backend/
references/layout.md` applies, not a speculative one.

## Feathers' dependency-breaking techniques — names to recognize

Not exhaustive detail, just the concept names so an agent can look up the
specific technique when the situation matches:

- **Extract Interface** — pull an interface out of a concrete type so a
  test double can substitute for it.
- **Parameterize Constructor/Function** — pass a dependency in instead of
  constructing it internally, so a test can pass a fake.
- **Subclass and Override Method** — in OO code, override just the
  hard-to-test part in a test subclass.
- **Extract and Override Call** — pull a hard-to-test call (a network
  call, `time.Now()`) into its own method, override it in tests.

Each trades a small, behavior-preserving mechanical change for
testability. None of them change what the code does — if a "dependency
break" changes observable behavior, it wasn't one, it was an
undocumented refactor.

## Safe-refactor sequence

`characterize current behavior → add the missing test → THEN refactor with
the test as a tripwire.`

The reliable mistake: refactor first, verify only by manual poking
afterward. That's rewriting with the appearance of caution, not
refactoring — there's no tripwire, so a regression is caught by luck, not
by design.

## Golden-master / approval testing — when unit characterization is too slow

For complex output (a large JSON response, a rendered page, generated
code) where hand-writing individual assertions is impractical: capture the
full current output as a golden file, diff against it on every run.
**Anti-pattern**: blindly regenerating the golden file whenever the test
fails (`-update` as a reflex) turns it into a rubber stamp that checks "did
output change" instead of "is output correct" — the exact failure mode
`impulse-backend/references/testing.md` §8 already flags for AI-generated
tests. A golden-file diff gets read and understood before accepting it as
the new baseline, every time.

Note on empirical grounding: characterization testing's own literature is
descriptive of a widely-adopted practice, not a controlled before/after
study with a measured refactoring-defect-rate delta — the citation below
is the term's origin and modern reaffirmation, not a quantitative study
this file's claims rest on.
[Characterization test — Wikipedia](https://en.wikipedia.org/wiki/Characterization_test)
