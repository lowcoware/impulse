# Tag catalog — what each tag finds

Loaded at the start of every sweep, together with
[`shared/rule-spine.md`](../../../shared/rule-spine.md). The quick lists here
are the hot subset, never the bar: a tag's real domain is its spine rows plus
its own catalog file. Anything found through the spine still reports under the
tag its spine row names.

## BE tags

| Tag | Finds |
|---|---|
| `over:` | ladder violation. Always carries the rung it broke — `over:yagni` `over:delete` `over:reuse` `over:stdlib` `over:native` `over:dep` `over:shrink`, one per spine row `BE-LD1`–`BE-LD6`. Name it, because the rung IS the fix; bare `over:` only says "too much". Stdlib/native answers: `impulse-backend/references/platform-native.md` |
| `baseline:` | a `BE-BL*` spine row missing. Hot subset: network call without timeout, no graceful shutdown, config not validated at boot, no /health or /metrics, migration edited instead of versioned. The full thirteen are the bar — walk the spine's BE rows, not this list |
| `seam:` | another service's internals imported, cross-service JOIN, event not schema-first or not past-tense, money/state crossing a boundary without outbox+DLQ or a `impulse:` marker |
| `test:` | seam without contract test, coverage below `coverageTarget`, non-deterministic test (real time/random), conditional logic in a test, skipped test, assert-less test — calls the function, asserts nothing on return or side-effect (mutation-check: flip a comparator, confirm the test then fails) |
| `resil:` | retry with no upper attempt limit or no retryable-status allowlist, backoff without jitter (thundering herd), retry on a non-idempotent op with no idempotency key, missing `event_id` dedup, no DLQ where required, topic used for a command needing exactly-one processing (should be a queue), ack/commit before the side effect is durably persisted, single consumer blocking horizontal scale |
| `bug:` | correctness bugs, AI-typical ones included — full catalog + fixes: `ai-bug-patterns-be.md`. Quick list: mutex/chan/slice struct field passed by value, mutation with no lock where a concurrent reader exists, channel with no consumer, TOCTOU, goroutine with no lifecycle (ctx/errgroup/WaitGroup), unbounded goroutine-per-item with no pool/semaphore, ignored error, outbox query missing `SELECT ... FOR UPDATE SKIP LOCKED` under multiple replicas, SQL by string concat, hardcoded secret, new endpoint missing auth middleware its siblings all have, resource looked up by user-supplied ID with no ownership check (`SE-M1` — IDOR, the most common real breach shape), `alg` taken from the token header or `aud`/`iss` unvalidated (`SE-M2`), upload validated by extension/Content-Type only, N+1 query, dep not resolvable against the blessed list. New public API/config schema exploitable through its "easy path": `api-misuse-resistance.md`. Depth behind an auth/secrets finding: `impulse-security/references/auth.md`, `authz.md`, `secrets.md` |
| `arch:` | decisions that compound into a killer over months, not today — full catalog: `ai-bug-patterns-be.md`. Quick list: new sync call in a chain now ≥3 hops deep in the hot path, partition/shard/cache key with foreseeable low cardinality and no salting, new service scoped to one CRUD endpoint or one function, fixed-TTL cache read on a known-hot key with no jitter, env-specific value hardcoded instead of sourced from config/IaC |

## FE tags

| Tag | Finds |
|---|---|
| `tell:` | banned default shipped — the scanner's `copy`/`layout` groups plus `t1`: em-dash in UI copy, AI-purple gradient, 3-equal-cards, centered-hero template, gradient text, nested cards, fake div screenshot, hand-rolled SVG icon, flex-percentage math (`FE-H14`), Elevate/Seamless/Unleash copy |
| `state:` | interactive element missing any of the 8 states, spinner where a skeleton belongs, empty state that teaches nothing, `outline:none` with no `:focus-visible` |
| `motion:` | `FE-H01`–`FE-H05` and `FE-H12`, plus the micro-craft catalog: animation on a keyboard or 100+-per-day action, `ease-in` on UI, `scale(0)` entrance, `transform-origin: center` on a trigger-anchored popover, keyframes on rapidly-triggered UI, ungated `:hover` motion, symmetric press/release timing — full trigger list + remedial hierarchy: `impulse-frontend/references/motion-craft.md` §10 |
| `token:` | raw value in a component, mismatch with DESIGN.md tokens, accent count > 1, radius off scale, second icon family imported, non-OKLCH color work (`FE-H09`), z-index off the semantic scale (`FE-H10`), ad-hoc container width (`FE-H16`) |
| `a11y:` | body contrast < 4.5:1 or large < 3:1, gray-on-colored, focus style missing, component test not using `getByRole`, custom `<div @click>` widget with no tabindex/role/keydown handler, modal with no focus trap or Escape-to-close, async status text with no `aria-live` region |
| `bug:` | AI-typical functional + security bugs — full catalog: `ai-bug-patterns-fe.md`. Quick list: destructured `reactive()`/`props` losing reactivity, watcher created off the sync setup call with no captured stop-handle, listener/interval/lib init with no paired cleanup, fetch with no AbortController (stale-response race), no cancellation on unmount or route change, browser-only API with no client-only guard in SSR, non-deterministic value in a template (hydration mismatch), `:key="index"` on a reorderable list, submit not guarded against double-click, async handler with no error handling, `v-html` unsanitized, dynamic href with unvalidated scheme, CSP loosened to unsafe-inline, JWT in localStorage, radius and border on different boxes (`t14`), the same big radius on nested containers, `useAsyncData` on a cached route fetching user data with no `private: true`, private runtimeConfig leaking to the client, new dep unchecked against `package.json` (`FE-H15`) or unpinned with an install script, class-gated invisibility that ships the section blank on headless render (`FE-H06`), text child of a flex/grid parent with no `min-width: 0` (`FE-H11`) |
| `perf:` | AI-typical Core Web Vitals / bundle regressions — full catalog: `ai-bug-patterns-fe.md`. Quick list: LCP element with `loading="lazy"`, image with no width/height (CLS), barrel import defeating tree-shaking, a whole icon collection instead of on-demand, heavy component imported synchronously behind a `v-if`/modal, `v-if` on a frequently-toggled element (should be `v-show`), deep watcher on a large reactive object, third-party script with no async/defer |

## Mobile tags

Mobile borrows the BE tag set rather than inventing one — the failures are the
same shapes on a different runtime. Full AI-typical mobile catalog:
`impulse-mobile/references/hardening-mobile.md`.

| Tag | Finds on a `.dart`/`.swift`/`.kt`/RN diff |
|---|---|
| `over:` | platform-choice ladder violation, `MO-LD1`–`MO-LD4`: native code where a bridge would do, a full native rewrite scoped past the one feature that forced it |
| `baseline:` | a `MO-BL*` row missing: crash reporting not wired, release signing or build-number increment done by hand, network call with no timeout, phased rollout with no crash-rate halt threshold |
| `bug:` | dispose discipline broken — subscription/controller/listener/observer opened with no paired teardown (`MO-BL04`, the #1 mobile leak); secret literal in the binary (`MO-BL06` — an app binary is public); plus the hardening catalog: main-thread blocking, BuildContext across an async gap, list-perf collapse, lifecycle misuse, Keychain/biometric misuse |
| `perf:` · `state:` · `a11y:` · `evid:` | as defined above — the runtime differs, the bar doesn't |

## `infra:` — Compose, Dockerfile, CI

Config that rots silently until it's an incident. Rows `DO-CO*` (Compose),
`DO-DF*` (Dockerfile), `DO-CI*` (GitHub Actions); owners under
`impulse-devops/references/`. Quick list: credential in `environment:`
instead of top-level `secrets:`, plain `depends_on` with no healthcheck
condition, anonymous volume, `FROM` with no digest pin, missing non-root
`USER`, `.dockerignore` that doesn't cover `.git`/`.env*`/keys, source-first
`COPY` invalidating the dependency layer, deploy with no health gate, cache
keyed on `github.sha`, a GH Environment whose reviewer list is empty.

Two CI rows are security findings, not hygiene, and report as `bug:`:
`pull_request_target` checking out fork code in a secret-bearing job
(`DO-CI2` — documented real exfiltrations), and an untrusted
`${{ github.event.* }}` field interpolated straight into a `run:` line
(`DO-CI6` — script injection).

## `legacy:` — existing code, not this session's

Fires only when the diff edits code that predates the session (or that the
author didn't write). Rows `LG-R1`–`LG-R3`, `LG-B1`, `LG-S1`; owner
`impulse-legacy/SKILL.md`. Finds: structure changed before any test pinned
the current behavior, an edit whose callers were never grepped, no stated
understanding preceding a change to unfamiliar code, Boy Scout cleanup
sprawling into files the task never needed and bundled with a behavior change,
a Strangler Fig migration that shifted traffic with no task tracking deletion
of the old path.

Greenfield code written this session is out of scope for this tag — that's
`over:`/`test:` territory. Legacy status never exempts an `arch:` finding.

## `evid:` — every domain

Green claimed with no output behind it (`BE-EV1`, `FE-H13`): "tests pass",
"builds", "works", "motion ships" — in the diff description, a commit message,
or a code comment, with nothing pasted.

Claim → required evidence:

| Claim | Evidence that satisfies it |
|---|---|
| "regression test works" | seen red THEN green, not green once |
| "bug fixed" | the repro re-run clean |
| "tests pass" / "builds" | the actual run output |
| "motion works" | the behavior shown, or the animation dropped to clean static |
| "the agent finished" | the diff exists, not the agent's own report |

Unrunnable is fine and says "not run" plainly. Implied green is the finding.
Same axis as the skill's metric honesty on `perf:` — a measured claim cites
its source or isn't a number.
