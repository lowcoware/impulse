# Techniques by bug class

Each: the tell → the technique. Match the tool to the bug, don't brute-force.

## Regression ("worked yesterday / last release")

`git bisect start / bad / good <ref>` → it binary-searches commits, you mark
each `good`/`bad`, it names the culprit commit in log₂N steps. Automate with
`git bisect run <test-script>` (script exits 0=good, non-zero=bad). Beats
reading the whole diff. This isn't specific to commits — it's Zeller's
general delta-debugging principle (ddmin): given any set of "deltas"
(commits, config flags, input bytes, env vars) where a failure depends on
some subset, binary-partition and test each half to discard what's
irrelevant. `git bisect` is one instance; the "Works on my machine" section
below and pipeline-value bisection above are the same algorithm applied to
different delta types — recognize the pattern once, reuse it everywhere a
failure depends on an unknown subset of a larger set.
[Wikipedia: delta debugging](https://en.wikipedia.org/wiki/Delta_debugging)

## Value goes wrong somewhere in a pipeline

Binary-search the data flow, not the code. Log the value at the midpoint of the
pipeline: correct there → bug is downstream; wrong → upstream. Halve again.
Two-three probes localize it faster than reading every stage.

## Heisenbug (vanishes when observed)

The act of observing changes timing/optimization. Causes: uninitialized memory,
race, compiler opt, debugger serializing threads. Technique: log to a buffer
flushed later (not synchronous stdout that adds a sync point); add asserts on
invariants rather than prints; check for reliance on undefined
init-order/uninitialized state. On Linux, prefer a record-and-replay debugger
(`rr`, 10K+ stars, originated at Mozilla for Firefox, now used on Chrome/QEMU/
LibreOffice) over repeated print-and-rerun when the bug won't reproduce
reliably: `rr record <cmd>` captures one execution deterministically,
`rr replay` re-runs the SAME recorded trace under gdb with reverse-execution
(`reverse-next`, `reverse-continue`) and hardware watchpoints — turns "add a
print, hope it repros again" into "step backward from the crash in the exact
run that crashed."
[rr-debugger/rr](https://github.com/rr-debugger/rr)

## Flaky test (passes/fails on same code)

Almost always one of: shared state between tests, real time
(`time.Now`/`sleep`), test-ordering dependence, real network, or a race.
Technique: run the single test in a loop (`go test -run X -count=100`,
`pytest ... -p no:randomly` vs forced random order) to force the failure, then
isolate. Test passes alone but fails in the suite → bisect the test ORDER
(run halves of the suite before it) to find the polluter test that leaks
state. Fix roots — inject the clock, isolate data per test, await conditions
not durations. Cross-ref `impulse-backend/references/testing.md`. Scale
check: Google's own CI reported ~16% of 4.2M test cases as flaky at some
point; Microsoft found 26% of build failures traced to flaky tests — this
is common enough that "just rerun it" is a documented anti-pattern, not a
reasonable triage default. Root-cause weighting to guide where to look
first: concurrency/async mismanagement and test-order dependency dominate
across studies (one language-specific study found order-dependency alone
responsible for 59% of flakes) — check those two before reaching for
"probably network flakiness."
[Microsoft Research: root-causing flaky tests at industrial scale](https://www.microsoft.com/en-us/research/wp-content/uploads/2019/11/LamETAL19RootFinder.pdf)

## Race / concurrency

Run the race detector — `go test -race`, `go run -race`; Python: `PYTHONASYNCIODEBUG=1`
+ audit shared mutable state across `await`/goroutines. The detector finds the
data race even when it isn't currently crashing. Never "fix" a race with a
`sleep` — that hides it. Where to look first, not a blind audit: a
large-scale empirical study found 97% of non-deadlock concurrency bugs fit
just two patterns — atomicity violation and order violation — and 66%
involve only ONE shared variable, 96% involve no more than two threads.
Most real concurrency bugs are simpler than "complex interleaving" makes
them sound; check single-variable atomicity/ordering first before assuming
a multi-thread interaction is the cause.
[Learning from Mistakes: real-world concurrency bug characteristics](https://www.researchgate.net/publication/220938937_Learning_from_mistakes_A_comprehensive_study_on_real_world_concurrency_bug_characteristics)

## Memory leak / growth

Watch RSS over time; if it climbs monotonically, snapshot the heap at two
points and diff. Go: `pprof` heap profile (`go tool pprof`), look for growing
allocation sites. Python: `tracemalloc` snapshot-diff. Node: two heap snapshots
in devtools, compare retained. Usual cause: unbounded cache, un-cancelled
goroutine/task, listener never removed (see mobile/frontend leak catalogs).

## "Works on my machine" / prod-only

Difference is environment, not code. Enumerate deltas: env vars, versions
(lockfile drift), data volume/shape, timezone/locale, filesystem case
sensitivity, CPU count (concurrency), network latency. Reproduce in a container
matching prod (this is why `impulse-devops` pins digests). Binary-search the env
deltas the same way you'd bisect code.

## Rubber-duck / explain-to-reconstruct

Before deep tooling: state out loud (or in the hypothesis log) what each line
is SUPPOSED to do vs what the data shows. The mismatch is usually the bug. This
is the same reconstruct-intent move as impulse-review's redacted handoff, turned
inward.

## Hardening the fix — defense in depth

Root cause found and fixed → decide consciously how many layers guard
against recurrence: (1) validation at the entry point, (2) the
business-logic invariant itself, (3) an environment guard (config/startup
check), (4) debug instrumentation that names the failure fast next time.
Not every bug earns all four — a money/data-loss bug does, a cosmetic one
gets the fix + regression test and nothing more (ladder applies).

Note: git bisect / race-detector / heap-diff are standard tool behaviors;
techniques synthesized from general debugging practice (defense-in-depth
framing re-expressed from obra/superpowers, MIT), no source copied.
