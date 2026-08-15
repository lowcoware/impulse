# Rule spine — builder rule ↔ detector ↔ review tag

The crosswalk `impulse-review` reads before a sweep. It MAPS; it never
restates — a rule's text lives in its Owner file, its detection in the
Detector column, and a review finding cites the ID.

Why it exists: review's tag tables were a hand-copied subset of the builder
skills' rules, so a rule added to a builder stayed unreviewed until someone
remembered to copy it across — silent drift with no tripwire. Whole domains
were unreachable too: a mobile or infra diff hit no tag set at all.
`node scripts/check-sync.js` now fails when an enumerated builder rule has no
row here, or a row cites a tag review doesn't define.

Direction of travel: **builder owns the rule → spine assigns the ID → review
fires the tag citing the ID → the author retires it** with `impulse-ok <id>`
(FE, in source) or a `impulse:` marker with an upgrade trigger (BE).

An ID is a citation, not a restatement: cite it, then read the Owner file for
the actual bar. A review finding that paraphrases a rule from memory instead
of citing its ID is how the drift started.

## Frontend — mechanical

`impulse-frontend/scripts/preflight.mjs` already carries ids and fixes:
`#N` = `impulse-frontend/references/preflight.md` row numbers, `tN` =
`impulse-frontend/references/ai-tells.md` bans. Review runs the scanner
rather than re-deriving those greps by hand, then maps each hit's `group`
to a tag:

| Scanner group | Review tag |
|---|---|
| `copy` | `tell:` |
| `color` | `token:` — except `t1` (AI-purple gradient), which is `tell:` |
| `layout` | `tell:` |
| `component` | `token:` — except `t14` (border dies at the corner), which is `bug:` |
| `motion` | `motion:` |
| `a11y` | `a11y:` |
| `perf` | `perf:` |
| `code` | `bug:` |

**Precedence: a judgment row beats the group table.** When a scanner id is the
Detector of an `FE-H*` row below, the row's tag wins — `#2`/`#3` (h-screen/dvh)
and `#4`/`#5` (scroll listener, reduced-motion) report as `motion:` per
`FE-H01`/`FE-H03`/`FE-H04`, `#15` as `token:` per `FE-H10`, `#19` as `a11y:`
per `FE-H07`, `#26` as `bug:` per `FE-H15` — regardless of the group the
scanner filed them under. The group table is the default for ids with no row
(`tN` bans, `#16` and friends). One violation, one tag.

Ids are preflight.md's own numbering — never renumber them here. A finding
citing `#15` has to be greppable in preflight.md and suppressible in source
as `impulse-ok 15`. Every scanner hit is a lead, not a verdict: preflight.md's
"How a grep lies" table is the false-positive filter, and applies to review
findings exactly as it applies to the author's own preflight run.

## Frontend — judgment

No scanner reaches these; they are read. This is where the coverage gaps
lived. Owner: `impulse-frontend/SKILL.md` § Hard technique rules.

| ID | Rule | Detector | Tag |
|---|---|---|---|
| FE-H01 | `min-h-[100dvh]`, never `h-screen` | `#2` + `#3` | `motion:` |
| FE-H02 | animate `transform`/`opacity` only | read | `motion:` |
| FE-H03 | `addEventListener('scroll')` banned | `#4` | `motion:` |
| FE-H04 | every animation ships a reduced-motion fallback | `#5` | `motion:` |
| FE-H05 | no bounce/elastic easing | `t7` | `motion:` |
| FE-H06 | reveals enhance an already-visible default | read | `bug:` |
| FE-H07 | contrast ≥4.5:1 body, ≥3:1 large | `#19` | `a11y:` |
| FE-H08 | no gray text on colored background | read | `a11y:` |
| FE-H09 | color work in OKLCH | read | `token:` |
| FE-H10 | semantic z-index scale, never 999 | `#15` | `token:` |
| FE-H11 | `min-width: 0` on flex/grid children holding text | read | `bug:` |
| FE-H12 | motion motivated in one sentence or dropped | read | `motion:` |
| FE-H13 | motion claimed = motion shown | read | `evid:` |
| FE-H14 | grid over flex-percentage math | `#25` | `tell:` |
| FE-H15 | new dep checked against `package.json` first | `#26` | `bug:` |
| FE-H16 | container width from one token | read | `token:` |

Register (`brand`/`product`, `impulse-frontend/references/registers.md`) is
not a rule row — it sets the bar the rows are judged at, and review reads it
the same way the builder declares it.

## Backend

Owner: `impulse-backend/references/baseline.md` (whitelist rows) and
`impulse-backend/references/ladder.md` (rungs). No scanner exists — the
Detector column names what to look for.

| ID | Rule | Detector | Tag |
|---|---|---|---|
| BE-BL01 | `/health/live` + `/health/ready`, ready 503s on a dead dependency | both routes registered | `baseline:` |
| BE-BL02 | graceful shutdown on SIGTERM, drain in order | signal handler + drain deadline | `baseline:` |
| BE-BL03 | structured JSON logs with `correlation_id`/`trace_id` propagated | ids on outbound calls and published events | `baseline:` |
| BE-BL04 | Prometheus `/metrics`: latency, RPS, error rate per handler | endpoint + per-handler labels | `baseline:` |
| BE-BL05 | versioned migrations from #1, never hand-edited | migration file added, not modified | `baseline:` |
| BE-BL06 | typed config validated at boot, invalid = refuse to start | no `os.Getenv` outside config load | `baseline:` |
| BE-BL07 | timeout on EVERY network call | per-call deadline; `http.DefaultClient` banned | `baseline:` |
| BE-BL08 | idempotent consumers, dedup by `event_id` | dedup before side effects | `resil:` |
| BE-BL09 | `.env.example` complete; multi-stage non-root Dockerfile | `USER` set, every var listed | `baseline:` |
| BE-BL10 | retries: exp backoff + jitter, capped, idempotent only | jitter present, attempt cap, retryable allowlist | `resil:` |
| BE-BL11 | outbox + DLQ when money/state crosses a boundary | outbox, or `impulse:` marker with trigger | `seam:` |
| BE-BL12 | backups automated + restore-drilled + named owner | drill evidence, owner named | `baseline:` |
| BE-BL13 | money path: staged rollout + kill-switch + second reviewer | gate exists before first money deploy | `baseline:` |
| BE-LD1 | YAGNI-skip speculative need | speculative abstraction, one-impl interface, unused knob | `over:yagni` / `over:delete` |
| BE-LD2 | reuse within this service; cross-service = contracts only | duplicated block, imported foreign internals | `over:reuse` / `seam:` |
| BE-LD3 | stdlib does it → use it | hand-rolled stdlib equivalent | `over:stdlib` |
| BE-LD4 | platform primitive over app code | app-level check a constraint/primitive covers | `over:native` |
| BE-LD5 | blessed dep, or one-line justification | dep outside `references/deps.md` | `over:dep` |
| BE-LD6 | can it be one line? | same logic, materially fewer lines | `over:shrink` |
| BE-LD7 | only then: the minimum code that works | the floor — no tag, nothing below it | — |
| BE-EV1 | verified = shown: no green claimed without output | "tests pass" with no pasted result | `evid:` |

Carve-outs (`impulse-backend/references/ladder.md`) are the inverse of a
row: trust-boundary validation, data-loss-preventing error handling, security,
the baseline, anything explicitly requested. They SUPPRESS an `over:` finding —
code kept because it is a carve-out is not over-engineering, and review saying
otherwise is the false positive.

## Mobile

Owner: `impulse-mobile/SKILL.md` (§ Platform-choice ladder, § Day-one mobile
baseline). The AI-typical mobile bug catalog is review-side, like the BE/FE
ones — `impulse-mobile/references/hardening-mobile.md`, no IDs.

| ID | Rule | Detector | Tag |
|---|---|---|---|
| MO-LD1 | cross-platform (Flutter) unless a rung below forces otherwise | native code where a bridge would do | `over:` |
| MO-LD2 | React Native when the team and app are already React-shaped | framework choice unjustified against the team's stack | `over:` |
| MO-LD3 | drop to native for ONE feature via a channel, not a rewrite | full native module for a bridgeable need | `over:` |
| MO-LD4 | full native only when most of the app is that one feature | native rewrite scoped past the feature that forced it | `over:` |
| MO-BL01 | crash reporting wired from build #1 | Sentry/Crashlytics init present | `baseline:` |
| MO-BL02 | release signing + auto-incremented build number in CI | never hand-incremented | `baseline:` |
| MO-BL03 | timeout on every network call | same rule as `BE-BL07` | `baseline:` |
| MO-BL04 | dispose discipline: every subscription/controller/listener paired | opened with no teardown — the #1 mobile leak | `bug:` |
| MO-BL05 | phased rollout with a crash-rate halt threshold | rollout config + halt threshold present | `baseline:` |
| MO-BL06 | no secret in the app binary — it is public | literal key/token in Dart/Swift/Kotlin source or assets | `bug:` |

## Infra

Owner: `impulse-devops/references/compose.md`, `dockerfile.md`, `ci.md`,
`gitlab-ci.md` — each a numbered list, in that order. Diff-visible in
Compose files, Dockerfiles, and workflow/pipeline YAML, which no builder's
tag set previously reached.

| ID | Rule | Detector | Tag |
|---|---|---|---|
| DO-CO1 | base + override compose layout, merge verified | `docker compose config` not trusted blind | `infra:` |
| DO-CO2 | one `env_file:` per service per env, never a shared `.env` | var in one env's file, missing from another — resolves empty, no error | `infra:` |
| DO-CO3 | credentials via top-level `secrets:`, never `environment:` | env var holding a credential | `infra:` |
| DO-CO4 | `depends_on: {condition: service_healthy}` + a real healthcheck | plain `depends_on`, or a `sleep`-based check | `infra:` |
| DO-CO5 | named volumes and networks declared, never anonymous | anonymous volume — orphans silently on `down` | `infra:` |
| DO-DF1 | dependency manifests copied and installed before `COPY . .` | source-first COPY invalidating the dep layer | `infra:` |
| DO-DF2 | base images pinned by digest, not just tag | `FROM` with no `@sha256:` | `infra:` |
| DO-DF3 | non-root `USER` in the final stage | no `USER`, or root at runtime | `infra:` |
| DO-DF4 | Alpine vs distroless chosen deliberately | distroless taken before logs/metrics are solid | `infra:` |
| DO-DF5 | `.dockerignore` covers `.git`, `.env*`, `*.pem`, `*.key` | missing or incomplete — secrets bake into a layer | `infra:` |
| DO-CI1 | trusted and untrusted split: test on `pull_request`, deploy on `push` | secrets reachable from a PR-triggered job | `infra:` |
| DO-CI2 | `pull_request_target` never checks out or runs fork code | checkout of `head.sha` in a secret-bearing job | `bug:` |
| DO-CI3 | health gate after deploy, job fails if it never returns 200 | "deploy succeeded" meaning only "container started" | `infra:` |
| DO-CI4 | SSH deploy: dedicated key, environment gate, pinned `known_hosts` | blind `ssh-keyscan`, or a personal key | `infra:` |
| DO-CI5 | cache keyed on a lockfile hash, never `github.sha` | SHA-keyed cache — never hits | `infra:` |
| DO-CI6 | untrusted event fields routed through `env:`, not interpolated into `run:` | `${{ github.event.* }}` inside a shell line | `bug:` |
| DO-CI7 | a job's GH Environment has protection rules that actually exist | empty reviewer list — the job hangs forever, no error | `infra:` |
| DO-CI8 | concurrency group with cancel-in-progress on PR workflows, never on deploy | no `concurrency:` block, or one on a deploy workflow | `infra:` |
| DO-CI9 | `permissions: {}` at top level, per-job grants | workflow with no `permissions:` — default token is read-write | `infra:` |
| DO-CI10 | third-party actions pinned to full commit SHA | `uses:` with a tag/branch ref on a non-org action | `bug:` |
| DO-CI11 | `timeout-minutes` on every job | job with no timeout — 6h default | `infra:` |
| DO-CI12 | setup-* built-in cache; GOCACHE persisted; buildx gha/registry cache; cache-mounts persisted or not relied on | hand-rolled `node_modules` cache, no Docker build cache, cache-mount assumed durable | `infra:` |
| DO-CI13 | PR feedback under 10 min: fast-fail lint jobs, paths filters, heavy suites off PR, shard past ~5 min | one monolithic job, E2E on every PR | `infra:` |
| DO-CI14 | ARM runners for arch-agnostic jobs; self-hosted never on public repos | self-hosted runner attached to a public repo | `bug:` |
| DO-CI15 | rulesets over classic branch protection; merge queue only at real contention | merge queue on a two-dev repo, or no required checks at all | `infra:` |
| DO-GL1 | `workflow:rules` suppresses duplicate branch+MR pipelines | push to an MR branch spawning two pipelines | `infra:` |
| DO-GL2 | `rules:` only — never `only/except`, never mixed | `only:`/`except:` in any job | `infra:` |
| DO-GL3 | `needs:` where it shortens the critical path; `interruptible: true` default | artificial stage waits, stale pipelines running to completion | `infra:` |
| DO-GL4 | cache for dependency stores, artifacts for build outputs, lockfile-keyed | build output passed via cache, or a static cache key | `infra:` |
| DO-GL5 | image builds via DinD buildx (registry cache) or buildah — kaniko is archived | kaniko executor anywhere in the pipeline | `infra:` |
| DO-GL6 | FASTZIP + fastest compression + `GIT_DEPTH: "1"` on build-only jobs | default clone depth and compression on a heavy pipeline | `infra:` |
| DO-GL7 | `extends:`/`!reference` + `default:` block; components over templates | YAML anchors across include files, new code built on legacy templates | `infra:` |
| DO-GL8 | protected variables AND protected deploying refs, masking treated as cosmetic | deploy secret readable from an unprotected branch | `bug:` |
| DO-GL9 | `id_tokens:` OIDC — `CI_JOB_JWT*` is removed | any `CI_JOB_JWT` reference | `bug:` |
| DO-GL10 | fork MR pipelines never run with parent-project variables unreviewed | fork-pipelines-in-parent enabled with no diff review | `bug:` |
| DO-GL11 | deploy jobs carry `environment:` + `resource_group:`; manual gate = `when: manual` + `allow_failure: false` | concurrent SSH deploys possible, or a skippable manual gate | `infra:` |
| DO-GL12 | SSH deploy with pinned `known_hosts` + health gate; self-hosted docker-executor runner; `release:` on tags | blind ssh-keyscan, shell executor for untrusted code, free-tier minutes assumed infinite | `infra:` |

## Security

Owner: `impulse-security/SKILL.md` § The two mistakes that recur most. The
skill's deeper references are where a finding points, not more spine rows.

| ID | Rule | Detector | Tag |
|---|---|---|---|
| SE-M1 | authz, not just authn: scope the query by the authenticated principal | resource looked up by user-supplied ID with no ownership check (IDOR) | `bug:` |
| SE-M2 | never let the token say how it gets verified | `alg` taken from the header, weak HMAC secret, `aud`/`iss` unvalidated | `bug:` |

## Legacy

Owner: `impulse-legacy/SKILL.md`. These are process rules, but each one
fails visibly in a diff, which is what earns them a row.

| ID | Rule | Detector | Tag |
|---|---|---|---|
| LG-R1 | read the function/module fully before editing it | edit touching code whose callers were never grepped | `legacy:` |
| LG-R2 | state believed behavior, callers, and blast radius before the diff | no stated understanding preceding a change to unfamiliar code | `legacy:` |
| LG-R3 | no test pinning current behavior → write a characterization test FIRST | structure changed before any test existed | `legacy:` |
| LG-B1 | Boy Scout cleanup stays inside the file/function already touched | cleanup in files the task never needed, bundled with a behavior change | `legacy:` |
| LG-S1 | a Strangler Fig migration tracks deletion of the old path as a task | traffic shifted, no deletion task — two systems forever | `legacy:` |

## AI infra — no rows, by design

`impulse-ai` declares no ruleset of its own: it inherits the backend baseline
and ladder unconditionally, so its diffs are judged against `BE-*` rows. Its
domain material (RAG chunking, embedding versioning, LLM-gateway isolation,
MCP trust boundaries) is prose and case detail, not an enumerated rule list —
review reaches it through the reference table, not through spine IDs. Should
any of it harden into a numbered list, it gets rows here like everything else.

## Adding a rule

1. Write it in the Owner file — that stays the single source of its text.
2. Add one row here: ID, ≤8-word summary, detector, tag.
3. If no existing tag fits, add the tag to `impulse-review/references/tags.md`
   first — a row citing an undefined tag fails `check-sync.js`.
4. Mechanical and FE? Add the detector to `preflight.mjs` too, so the author
   catches it before review does. Review is the backstop, not the first pass.

Parity is enforced only where the owner declares an enumerated list (the
frontend hard rules, the BE/MO baselines and ladders, the devops numbered
references, legacy's three steps, security's two mistakes) — `check-sync.js`
counts those and fails on a mismatch. A single standalone rule (`LG-B1`,
`LG-S1`) has a row but nothing to count it against; adding one is a judgment
call the linter can't make for you.
