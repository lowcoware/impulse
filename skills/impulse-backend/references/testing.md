# Testing — coverage gate, contracts, E2E, determinism

Tests ship in the same commit as the code. "Tests later" = untested.

## 1. Pyramid

| Level | Covers | Tools (Go / Python) | Volume |
|---|---|---|---|
| Unit | business logic: rules, branches, edge cases | `testing` + testify / pytest | most tests |
| Integration | repo vs real DB, producers/consumers vs real broker, migrations up+down | testcontainers; go-sqlmock, miniredis where containers are overkill (§5) | per adapter |
| Contract | every service seam: implementation ↔ schema | schema validation (§3) | one per seam |
| E2E | critical user flows end-to-end | Playwright | few, required |

CI on every PR: unit + integration + contract. Red at any level blocks merge.

## 2. Coverage gate

1. Target = `coverageTarget` from `~/.config/impulse/config.json` (default 80). Measured on business-logic packages: lines AND branches.
2. CI-gated: below target = merge blocked. No override flag, no mode exemption (blitz included).
3. Framework plumbing (routing, request parsing) doesn't count toward the number and gets no unit tests — integration covers it.
4. The target is a floor, not the goal: 80% with branch and edge cases beats 100% happy paths. A 100% mandate is ceremony — banned.
   *Why a floor, never a quality claim:* published studies on coverage-vs-
   defects correlation genuinely disagree — one industrial comparison found
   coverage negatively-and-significantly correlated with post-release
   defects at one company, positively-and-significantly at another, same
   methodology. Don't cite `coverageTarget` as evidence of low defect rates;
   it's a floor against untested code, nothing more. §9 (mutation testing)
   is where the actual verification signal lives.
   [ResearchGate: coverage's impact on bug density, mixed cross-project results](https://www.researchgate.net/publication/319980922_The_Impact_of_Coverage_on_Bug_Density_in_a_Large_Industrial_Software_Project)

## 3. Contract tests — schema-first, no Pact

1. The schema (proto / OpenAPI / AsyncAPI) IS the contract. No Pact, no broker, no consumer-driven ceremony.
2. Provider side: assert the running handler's requests/responses/events validate against its own published schema.
3. Consumer side: assert your client/handler parses fixtures generated from the OWNER's schema — never hand-written JSON that drifts.
4. Every seam gets one: each REST endpoint consumed, each gRPC method, each Kafka topic produced or consumed.
5. Goal: a breaking schema change breaks a test in-repo BEFORE deploy, not a partner service after.

## 4. E2E — required

1. Playwright, critical flows only: paths where failure costs money or users (signup, order, payment, core pipeline).
2. Required — not optional, not mode-gated. Critical flow without E2E = feature not done.
3. Don't E2E what a unit test proves. Keep the suite small enough to run on every merge to main.
4. Locators: `getByRole` → `getByLabel` → `getByText` → `getByTestId` only as an explicit fallback for third-party widgets (payment iframes, embedded maps) that expose no role/label — matches the component-test rule in `impulse-frontend/references/components.md`, Playwright's own guidance agrees.
5. Web-first assertions (`expect(locator).toBeVisible()`) only — they auto-retry until timeout. `waitForTimeout`/manual `sleep` in an E2E test = BLOCK on review; it's the single biggest source of flakiness, not a shortcut.
6. Isolation: each test seeds its own data via API/seed script, namespaced per worker (`testInfo.workerIndex`), never a shared fixture two tests both mutate. Transaction-rollback isolation is unsafe for real E2E (the app's own connection isn't the test's) — create-then-cleanup instead.
7. Fixtures inject Page Object instances for interaction organization; fixtures handle setup/teardown, POM classes organize locators/actions. Below ~10-15 tests on one page, skip POM — a plain test is clearer.
8. Visual regression (`toHaveScreenshot`) only where pixel fidelity is the actual requirement (brand/hero assets) — tune `maxDiffPixelRatio` per component, generate baselines in the same Docker image CI runs in (cross-OS font rendering is the #1 false-failure source), tag separately from the merge-blocking suite.
9. Network mocking: mock the long tail of error/edge states (500s, timeouts) that are hard to trigger against a real backend; hit the real backend for the actual critical-flow smoke tests — mocking those defeats the point of "end to end."
10. CI: retry cap at 2, not more — beyond that, retries mask real flakiness instead of absorbing legitimate async noise. Shard only once the suite exceeds ~2 minutes.

## 5. Integration: containers vs fakes

| Use | When |
|---|---|
| testcontainers (Postgres, Kafka, Redis) | the real engine's behavior is the thing under test: repo behavior, SQL dialect, migrations, consumer/producer wiring |
| go-sqlmock | driver-level branches: query built correctly, error paths, tx commit/rollback — no container needed |
| miniredis | Redis logic (TTL, SETNX, counters) without Docker |
| httptest / transport mock | HTTP clients to other services |

Rule: fake at the narrowest boundary that proves the behavior — container for engine behavior, mock for your code's branches.

## 6. Determinism

| wrong | right |
|---|---|
| `time.Now()` inside tested logic | inject clock (`now func() time.Time`) |
| bare `rand` / UUID generation in logic | inject source / generator |
| `time.Sleep` as synchronization | channel signal, fake clock, bounded poll with deadline |
| `t.Skip` to green the CI | fix the test or fix the code — skipping is banned |
| `if` / `for` logic in test body | table-driven cases, linear Arrange-Act-Assert |
| asserting internals (private state, call order) | assert observable behavior; refactors must not break tests |
| test depends on run order or shared state | each test seeds its own state (truncate / fresh schema) |
| fixtures from live env (host, real file, network) | `testdata/` fixtures, containers |

## 7. Interface-for-testability — the narrow exception

1. Default (layout.md): no interface until a second implementation exists.
2. Exception: a small consumer-side interface (≤5 methods) is allowed when it's the only way to substitute a dependency in tests (testify mock over a repo, seam around an external client).
3. Try substitution WITHOUT an interface first: go-sqlmock swaps the driver, miniredis swaps the server, httptest swaps the transport.
4. Define the interface in the consuming package. Zero `ports/` dirs, zero mirror-interface-per-struct.

## 8. Unit test craft

1. **Table-driven (Go):** self-contained cases (nothing shared/mutated across rows), names describe behavior ("empty input returns error", not "case1"), boundary rows always present (nil, zero, max, empty). With `t.Parallel()`: `tt := tt` before `t.Run`, or Go 1.22+ per-iteration scoping — the classic bug is every subtest silently running against the loop's last value.
2. **`parametrize` (pytest):** the Python equivalent; always pass `ids=` — default auto-ids on dict/object args are unreadable.
3. **When NOT to table-drive:** cases needing different setup/teardown or different assertions, not just different in/out — forcing that into one table with `if tc.needsX` branches is worse than separate test functions.
4. **Test doubles — don't mock what you don't own.** Mock at a seam you own (a repo interface, a thin adapter around a third-party client) — never mock a library's own type directly, or the mock silently drifts from the library's real behavior while the test keeps passing. Mocking too deep (internal collaborators, not I/O boundaries) makes tests assert call sequences instead of outcomes — a refactor with zero behavior change breaks them.
5. **`assert` vs `require` (testify):** `require` for a precondition the rest of the test depends on (nil-check, setup success) — continuing past a failed one just produces a confusing panic later. `assert` when independent mismatches should all surface in one run.
6. **Property-based testing** (`rapid`/`gopter` Go, `hypothesis` Python) earns its cost on pure functions, parsers/serializers, encode-decode invariants — exactly where boundary/off-by-one bugs cluster (`impulse-review`'s `bug:` catalog). Skip it for glue code or anything whose "property" is just one example — that's an example test wearing a property-test costume. Reach for it only when you can state the invariant in one sentence.

   Property catalog, weakest to strongest — pick the strongest one that
   actually applies, "no exception" alone is a floor not a goal:

   | Property | Formula | Fits |
   |---|---|---|
   | No exception | doesn't crash on valid input | baseline only, weak |
   | Invariant | property holds before/after | any transformation |
   | Idempotence | `f(f(x)) == f(x)` | normalize/sanitize/sort |
   | Roundtrip | `decode(encode(x)) == x` | serialization pairs |
   | Inverse | `f(g(x)) == x` | encrypt/decrypt, compress/decompress |
   | Oracle | `new_impl(x) == reference(x)` | refactors, optimization |

   Detection heuristic: any `encode`/`decode`, `serialize`/`deserialize`,
   `normalize`/`validate` pair, or pure function with a non-trivial input
   domain (strings, floats, nested structures) is a PBT candidate before
   it's an example-test candidate. Reject "example tests are good enough"
   for exactly these shapes — that's where PBT finds the edge case a
   human-picked example list misses. (Property catalog re-expressed from
   trailofbits/skills `property-based-testing`, CC BY-SA 4.0.)
7. **Golden-file/snapshot tests:** right tool for large structured output (JSON payloads, generated code) where an inline expected value is unreadable. Anti-pattern: blindly regenerating on every failure (`-update` as a reflex) turns the file into a rubber stamp that checks "did output change," not "is output correct" — the same failure shape as an assert-less test. Diffs get read at commit time, always.
8. **Behavior, not implementation:** assert the observable contract (return value, error, persisted state, side effect) — never private call order or unexported internals. A passing test that breaks on a pure refactor was testing the wrong thing.

## 9. Mutation testing — on-demand, not a gate

High line coverage can hide near-zero real verification: a documented case
hit 93% line coverage at a 59% mutation score, and this suite's own
`impulse-review`'s `ai-bug-patterns-be.md` found a 100%-covered function with
zero real assertions via exactly this technique. Mutation testing injects small
faults (comparator swaps, boundary flips, boolean negation) and checks
whether the suite actually notices.

**Not a CI gate.** A mandatory always-on mutation-testing pipeline is the
same ceremony the 100%-coverage ban already rejects, in a different
costume — slow, gameable, and mostly wasted on glue code. 100% mutation
score isn't a real target either: the equivalent-mutant problem
(semantically-identical mutants that can never be killed) makes it
mathematically unreachable; realistic targets in production sit around
60-80%.

Industry adoption is genuinely thin despite 50 years of existing since
introduction (computational cost is the usual blocker, not doubt about
effectiveness) — Google and Facebook both published production experience
reports on making it tractable at scale rather than a "should you bother"
debate. Where it has run at scale, results back the on-demand framing here:
one fintech case study found services with a higher mutation score measurably
less error-prone in production, not just "different from coverage" in theory.
[Google: practical mutation testing at scale](https://homes.cs.washington.edu/~rjust/publ/practical_mutation_testing_tse_2021.pdf) ·
[Facebook: what it would take to use mutation testing in industry](https://arxiv.org/pdf/2010.13464)

**Use it as a targeted, on-demand check** — right after AI generates tests
for a specific business-logic file, scoped to just that file, as the
automated version of "flip a comparator, confirm the test then fails"
(`ai-bug-patterns-be.md`'s `test:` tag). Not a merge blocker; a signal to
eyeball the survivors.

| Stack | Tool | Invocation |
|---|---|---|
| Go | `go-gremlins` | `gremlins unleash <path>` |
| Python | `mutmut` (over `cosmic-ray` — faster, simpler, sufficient at this scale) | `mutmut run --paths-to-mutate <file>` |
| TS/Vue | `StrykerJS` (`--incremental` mode) | `stryker run --mutate <file>` |

## 10. RED phase — write the failing test first

The cheapest guard against a test that proves nothing: see it fail for the
right reason *before* the code exists (or before the fix, when debugging).

1. **Write the test, run it, watch it fail.** A test that has never been red
   is unverified — an assert-less or wrong-target test passes green from birth
   and catches nothing (§9's 100%-covered-zero-assertion function is exactly
   this failure).
2. **Confirm it fails for the RIGHT reason** — the assertion you care about,
   not an import error or a typo'd fixture. A test that fails to compile isn't
   red, it's broken.
3. **Then make it pass with the minimum code.** Now green means something: the
   test exercised the path and the code satisfied it.
4. **This is mandatory for bug fixes** — the regression test from
   `impulse-systematic-debug` MUST fail on the un-fixed code first, or it doesn't
   prove the bug is fixed. It's the manual, always-on version of §9's mutation
   check.
5. **Not dogmatic full-TDD ceremony.** Not every line needs test-first. The
   rule is: any test you're relying on to catch a specific failure, you watch
   fail once. Especially AI-generated tests — the AI wrote green; you make it
   prove red.
