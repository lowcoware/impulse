# AI bug patterns — backend `bug:`/`arch:` catalog

Not general bug-hunting. These are patterns AI-generated code produces
*systematically* — documented in academic studies, empirical corpus analysis,
and real incident writeups — because they're syntactically valid and
"look right" without the concurrent-access/lifecycle/failure-mode reasoning
a human reviewer applies by habit. Six of the entries below are confirmed
against this suite's own real project history, marked
**Seen in production**.

Frontend AI-bug/perf patterns: `ai-bug-patterns-fe.md`.

## Comment truth, not just comment style

A distinct check from anything else in this catalog: verify every factual
claim a new/changed comment or docstring makes against the code beneath
it — does the described parameter list match the actual signature, does
the described behavior match the actual logic, do referenced types/
functions actually exist, is an edge case claimed as "handled" actually
handled in the code as written. A comment can read perfectly (good
grammar, plausible-sounding claim) and still be factually wrong about
what the code does — that's a distinct failure from comment STYLE
(which `ai-tells.md`-adjacent copy checks in the frontend catalog cover)
and isn't caught by any correctness check that only reads the code
itself, since the comment's claim and the code's behavior have to be
compared against EACH OTHER, not each checked independently.

## BE — `bug:` (correctness, catchable from a diff)

### Concurrency

**Struct with a lock/channel/slice field passed by value.** A method on
`Publisher` (holding `sync.Mutex`, a `chan`, or a `sync.WaitGroup`) has a
value receiver, or the struct is copied into a goroutine/closure. The copy's
mutex is a different mutex — no mutual exclusion at all, silently.
*Fix:* pointer receiver, pass `*Publisher`.

**Mutation without a lock where a concurrent reader exists.** A method
writes to a shared map/slice/field; another method (called from a different
goroutine — an HTTP handler, a consumer loop) reads the same state with no
`RLock`/`Lock`. Passes single-threaded tests, races under load.
*Fix:* `-race` in CI catches this deterministically if the racing paths are
actually exercised together in a test — write one that does.

**Channel with no consumer.** A `select` sends on a channel with only a
`default:` branch and nothing ever reads it — data silently dropped, not
queued, not erred.
*Fix:* an explicit `for range ch` consumer, or return an error instead of
silently discarding.

**TOCTOU — read-then-write as two separate calls.** `GetRecent(id)` →
`if nil { Save(id) }` as two operations under concurrent access: two
callers can both see `nil` and both `Save`, creating a duplicate the
single-object model didn't expect.
*Fix:* one atomic operation under one lock (`GetOrCreate`), or a DB unique
constraint that makes the second write fail loudly instead of silently
duplicating.

**Goroutine with no lifecycle.** `go someFunc()` fired with no `context`,
no `errgroup`, no `WaitGroup` — on graceful shutdown the goroutine's result
(including its error) is simply dropped; the caller has no way to wait for
or cancel it.
*Fix:* propagate `ctx`, coordinate through `errgroup.WithContext` when the
result matters, or explicitly document the fire-and-forget with a `impulse:`
marker naming why it's safe to lose.

**Unbounded goroutine-per-item / goroutine-per-request.** A loop over an
incoming batch (Kafka message, HTTP payload, queue drain) spawns one
goroutine per item with no cap. Fine at low volume; under a burst (retry
storm, backfill job) goroutines pile up faster than they drain, each
holding a stack and often a blocked DB connection, until the process OOMs.
*Fix:* bounded worker pool or a semaphore (`make(chan struct{}, N)`).

**Seen in production:** RAG pipeline code lacked `errgroup` —
concurrent calls had no coordinated error handling or cancellation
propagation; fixed in the sprint-3 security/reliability wave.

**`context.With*` with no `defer cancel()` on the next line.** Leaks the
timer/goroutine behind it. *Fix:* `defer cancel()` immediately, no
exceptions. Full detail: `../../impulse-backend/references/hardening-go.md`.

**`context.Background()` swapped in inside a spawned goroutine.** Disconnects
the goroutine from cancellation — it parks on `ctx.Done()` forever. *Fix:*
forward the live request context. Full detail:
`../../impulse-backend/references/hardening-go.md`.

**gRPC client call built on `context.Background()`/`context.TODO()`
instead of forwarding the inbound handler's `ctx`.** Silently breaks
deadline propagation for that hop and everything downstream of it. *Fix:*
forward the inbound `ctx`. Full detail:
`../../impulse-backend/references/hardening-go.md`.

**Goroutine spawned inside a handler with no recover of its own.** A panic
in a spawned goroutine does not propagate to the parent — it kills the
whole process. *Fix:* every spawned goroutine that can panic needs its own
`recover()`. Full detail: `../../impulse-backend/references/hardening-go.md`.

### Async runtime (Python)

**`async def` handler containing a blocking call with zero `await`s.** A
sync DB driver, `requests`, or `time.sleep()` inside an `async def` stalls
the entire event loop — every concurrent request on that worker, not just
the caller. Signature: CPU at 50-60%, p95/p99 spiking into seconds,
throughput flat despite rising concurrency.
*Fix:* async-native driver, or `asyncio.to_thread`/`ProcessPoolExecutor`
for anything irreducibly sync. Full detail:
`../../impulse-backend/references/hardening-python.md`.

**`asyncio.create_task()` with no reference held.** The task can be
garbage-collected mid-execution — a confirmed CPython bug
([#91887](https://github.com/python/cpython/issues/91887)), worse since
3.12. *Fix:* keep it in a module-level set with a `done_callback`, or use
`asyncio.TaskGroup`. Full detail:
`../../impulse-backend/references/hardening-python.md`.

**`gather(...)` used where sibling cancellation or exception visibility was
actually wanted.** Default `gather` doesn't cancel siblings on first
failure and doesn't surface exceptions unless explicitly checked —
`return_exceptions=True` silently swallows them into the results list.
*Fix:* `asyncio.TaskGroup` (3.11+) when failures should be fail-fast — it
cancels siblings and raises `ExceptionGroup`; keep
`gather(return_exceptions=True)` only when partial success is valid AND
every result is checked for an exception. Full detail:
`../../impulse-backend/references/hardening-python.md`.

### Python general correctness (non-async)

**Mutable default argument.** `def f(x=[])` / `def f(x={})` — the default
object is created once at function-definition time and shared across every
call that doesn't pass its own value; a mutation in one call leaks into the
next. LLMs reproduce this pattern from training data at a measurable rate
because it's syntactically clean and passes a single-call test.
*Fix:* default to `None`, build the value inside the function body.

**Bare `except:` (or bare `except Exception:` wider than the guarded call).**
Swallows `KeyboardInterrupt`/`SystemExit` too, or masks failures from lines
the `try` didn't need to cover. *Fix:* narrow to the exception types the
guarded call actually raises; never a silent `pass` with no log/re-raise.
Don't just flag the block as "too broad" — name what it hides: list every
specific error type this catch would swallow beyond the one it's
intended for (a `NullPointerException` alongside the intended `IOException`,
a `KeyError` alongside the intended `ValueError`). An enumerated list of
hidden failure modes is a more actionable finding than "this catch is
too wide."

**`is`/`is not` against a literal (string, number, tuple).** Relies on
CPython's implementation-specific interning rather than value equality —
works by accident on short strings/small ints in CPython, breaks silently
on longer values or other interpreters. *Fix:* `==`/`!=` for value
comparison; reserve `is` for `None`/singleton/sentinel identity checks.

**Eagerly-formatted f-string passed to `logging`.** `logging.info(f"...")`
builds the string even when the log level is disabled, defeating lazy
formatting. *Fix:* `logging.info("%s", value)`.

**Deserializing untrusted input with `eval`/`exec`/`pickle`/`marshal`/
`yaml.load` (no `SafeLoader`).** Arbitrary code execution on attacker-
controlled bytes — same class as SQL string concatenation above, just a
different trust boundary. *Fix:* `json`, `ast.literal_eval`, or
`yaml.safe_load`; `subprocess` with `shell=True` on unsanitized input is
the shell-injection sibling of this — pass an argument list instead.

### Error handling

**Ignored error/return value.** `_ = err`, a bool success flag discarded,
a mutation's row-count/rows-affected never checked. The call "succeeded" in
the sense that it ran, but nothing confirms the effect actually happened.
*Fix:* every error gets named — logged, wrapped, or returned. `impulse-backend`'s
own error-handling ladder (`layout.md`) already bans this; `bug:` is what
catches it when it slips through in review.

**Failure-untruthfulness.** Caught error still allows the function to
return a success shape — `200`, `nil` error, an empty-but-otherwise-valid
struct — instead of propagating the failure. A 2026 matched-control audit
of AI-agent-generated code (955 AI files vs. 955 human files, same tasks)
found this as a *systematic* cross-file pattern, not random noise — AI
code degrades quietly where human code tends to fail loudly.
[AIRA audit, arXiv:2604.17587](https://arxiv.org/pdf/2604.17587)

### Trust boundary / injection

Why these specific entries, not a generic OWASP sweep: cross-model CWE
studies on LLM-generated code converge on the same short list — missing
input validation, SQL/command injection (CWE-89/78), hardcoded credentials
(CWE-798), unrestricted upload (CWE-434), unchecked return values — as the
dominant classes, with prevalence 12-65% depending on task/language/model.
The entries below target exactly this list; a full OWASP Top-10 sweep is
`/code-review`'s job, not this skill's.
[Pearce et al., Asleep at the Keyboard, arXiv:2108.09293](https://arxiv.org/abs/2108.09293) ·
[LLM-generated code security literature review, arXiv:2412.15004](https://arxiv.org/pdf/2412.15004)

**SQL/query built by string concatenation.** Any query assembled with
`+`/`fmt.Sprintf`/f-string interpolation instead of a parameterized
statement or query builder placeholder.
*Fix:* parameterized query, always — this is also `ladder.md`'s carve-out
("trust-boundary input validation... never trimmed"), `bug:` is the review-time
catch.

**Hardcoded secret literal.** A key/token/password as a literal string,
including in "just an example" or seed/fixture code — LLMs reproduce this
pattern from training data even when a secure alternative (env var) is
available in the same file's context. Not a marginal effect: GitGuardian's
2026 report found AI-assisted commits leak secrets at roughly double the
rate of the all-public-commit baseline (3.2% vs. 1.5%) — this is the
review-time catch for exactly that gap, before the commit lands, not after
(remediation detail and full numbers: `impulse-security/references/secrets.md`).
[TruffleSecurity: LLMs are teaching developers to hardcode API keys](https://trufflesecurity.com/blog/llms-are-teaching-developers-to-hardcode-api-keys) ·
[GitGuardian: State of Secrets Sprawl 2026](https://www.gitguardian.com/state-of-secrets-sprawl-report-2026)

**New endpoint with no auth middleware, siblings all have one.** AI adds
business logic and wires the route but forgets the auth layer — a
pattern-consistency check catches it: does this handler use the same
middleware chain as its neighbors in the same router group?

**Seen in production:** the media service originally had no
auth on its endpoints, and JWT-secret length was never validated at boot
(fixed to enforce ≥32 bytes) — both caught in the sprint-3 fix wave, both
exactly this pattern.

**Upload validated by extension/Content-Type only, not actual bytes.** A
file-upload handler checks `filename.endsWith('.png')` or the
client-supplied `Content-Type` header — both attacker-controlled, neither
proves the file's actual content.
*Fix:* MIME sniffing via magic bytes on the actual payload.

**Seen in production:** media uploads previously had no
magic-bytes validation — content-type spoofing was possible until the
sprint-3 fix.

### Data access

**Outbox/relay query without `SELECT ... FOR UPDATE SKIP LOCKED` under
multiple replicas.** A relay worker polling unpublished outbox rows without
row-level locking — when the service runs more than one replica (the normal
case in production), two replicas can pick up and publish the same row,
double-publishing the event downstream.
*Fix:* `SELECT ... FOR UPDATE SKIP LOCKED` so each replica claims disjoint rows.

**Seen in production:** exactly this bug — the outbox worker
didn't use `SKIP LOCKED`, replicas could double-publish; fixed in sprint 3,
now a mandatory check in the project's own service-review checklist.

**Loop containing a per-iteration DB call (N+1).** A list is fetched, then
a query runs inside the loop for each item's related data.
*Fix:* batch-fetch (`WHERE id = ANY($1)`) or a join, outside the loop.

**DB pool created with no explicit `MaxOpenConns`/pgxpool `MaxConns`.**
Effectively unbounded (or absurdly low on the driver default) — a ticking
outage, not a tuning nice-to-have. *Fix:* set it explicitly. Full sizing
detail: `../../impulse-backend/references/hardening-go.md`.

**Kafka transactional producer's `transactional.id` reused across multiple
instances.** Naive horizontal scaling — the newer instance fences the
older one, whose in-flight transaction aborts. Looks like unexplained data
loss, is actually a config collision.

**Dependency not resolvable against the blessed list or a real registry.**
LLMs invent plausible-but-nonexistent package names at measurable rates
(5-22% depending on model, across 576K sampled generations) — and
attackers pre-register the hallucinated names ("slopsquatting"). Any new
import in a diff that isn't on `deps.md`'s blessed list AND isn't verifiably
real on the actual package registry is a `bug:`, not just an `over:`.
[Package hallucination study, arXiv:2406.10279 / 2026 replication arXiv:2605.17062](https://arxiv.org/pdf/2605.17062)

### Tests (cross-reference — lives under the `test:` tag, not `bug:`)

**Assert-less test.** The test calls the function under test and checks
nothing about its return value or side effect — 100% line coverage,
zero actual verification. A mutation-testing pass on AI-written code found
exactly this: a function fully "covered" by an E2E test that never
asserted on the result, 13 mutants survived undetected.
[Habr: mutation testing on AI-generated code and tests](https://habr.com/ru/companies/otus/articles/1048504/)
*Fix:* flip a comparator, run tests — survives = coverage theater.
Full detail: `../../impulse-backend/references/testing.md` §9.

**Same-pass self-verification.** The same generation pass wrote both the
logic and its test — the test's expected values can encode the
implementation's own bug (an off-by-one billing-tier boundary baked into
both). Treat passing tests as low-signal on business-rule boundaries when
code and test came from one pass; an independent author or oracle for
expected values is worth asking for.

**Over-mocked test.** An agent-authored test suite that's all-green and
high-coverage but mocks the boundary it's supposed to be verifying — a 2026
empirical study of coding-agent test generation found this systematic:
agent-written suites reach high line coverage while killing far fewer
mutants than equivalent human-written suites, because the mock, not the
system, is what's being asserted against.
*Fix:* spot-check that the assertion touches real behavior at the boundary
that matters, not the mock's own return value. Full framing (why "all green"
undersells the risk on agent-authored code specifically):
`../references/review-process.md`.
[Are Coding Agents Generating Over-Mocked Tests?, MSR'26](https://andrehora.github.io/pub/2026-msr-agents-over-mocked-tests.pdf)

**Missing test needs a named, stated exemption — not just silence.** A
diff with no new test is only acceptable when it falls into a named
exemption category (config-only change, dependency/version bump, a
constant-or-flag-default change, pure data/copy) AND the PR states which
category and why — an unstated absence still gets flagged as missing,
even if it would have qualified for an exemption had one been named. The
inverse holds too: a new test on a change that qualifies as exempt is
itself worth a note — unwarranted test scaffolding on a config-only
change is scope creep, not diligence.

## BE — `arch:` (decisions that compound over months, not today)

**Agent-authored fix scoped to the reported symptom, blind to its
cross-repo callers.** 2026 field data: an agent PR's actual blast radius
runs wider per line-of-intent than an equivalent human change, because
agents optimize for local correctness and don't see the cross-repo
dependency graph a human would grep before touching a shared symbol — a
hand-maintained regression suite sized around human-scoped PRs
systematically misses these inter-agent interactions. As of mid-2026, no
mainstream coding assistant resolves this automatically, deterministically,
org-wide — it's still a review-time catch. *Fix:* for any diff touching a
shared/exported symbol, treat `impulse-legacy/references/blast-radius.md`'s
six-step assessment as mandatory, not optional-for-unfamiliar-code-only —
"the agent wrote it, so it must already know the callers" is exactly the
assumption this data contradicts.
[Riftmap: AI agent blast radius, 2026 data](https://riftmap.dev/blog/ai-doesnt-understand-blast-radius/)

**New sync call added to an already-deep chain.** A diff adds one more
synchronous gRPC/HTTP hop to a request path that's already calling through
2+ services. Two synchronous hops in a hot path is a smell; three or more
is a redesign trigger — one slow link (a DB lock, a GC pause) now stalls
every hop behind it, and retries at each level multiply load on the
already-struggling service (a retry storm).
[OneUptime: retry storms in microservices](https://oneuptime.com/blog/post/2026-01-24-retry-storm-microservices/view)

**Partition/shard/cache key with foreseeable low cardinality.** A Kafka
partition key, a shard key, or a cache key derived from a low-cardinality
field (`tenant_id` with a few whale tenants, `country`, a status enum) with
no salting. Looks evenly distributed against synthetic dev/staging data;
real-world power-law skew (one tenant = most of the traffic) saturates one
partition while others idle — consumer lag balloons only for that key,
invisible until a peak event turns it into a full pipeline backlog.
[AutoMQ: hot partitions in Kafka — a documented tenant_id skew incident](https://www.automq.com/blog/hot-partitions-in-kafka-detection-mitigation-architecture-choices)

**Consumer group still on the eager (eager-`Range`/`RoundRobin`) assignor
as the group scales past a handful of instances.** Harmless at 2-3
consumers; on a large group, every membership change (deploy, scale event)
revokes and reassigns *every* partition across *every* consumer instead of
just the ones that moved — each deploy becomes a throughput cliff that gets
worse as the group grows. Switch to `CooperativeStickyAssignor` before the
group is large, not after the first bad deploy. Detail: `events.md` §6.

**Schema migration landing in the same PR/deploy as the code that depends
on it.** During a rolling deploy, old and new binaries run against the
same schema simultaneously (N/N-1). A migration that renames/drops a
column or adds a non-nullable constraint with no default, shipped in the
same deploy as code assuming the new shape, breaks whichever version isn't
written for that exact schema state — even though each half looks correct
reviewed alone. *Fix:* expand/backfill/contract across separate deploys.
Detail: `../../impulse-backend/references/hardening-go.md`.

**New service scoped to one CRUD endpoint or one function.** The
nanoservice trap — each one is a small win short-term; the network-call
overhead and operational cost (deploy, on-call, observability surface)
compound linearly with service count until it exceeds team capacity.
Cross-reference: `impulse-backend/references/boundaries.md`'s anti-nanoservice
table already blocks the merge-signal version of this; `arch:` is the
review-time catch for a *newly proposed* nanoservice before it ships.
[Segment: Goodbye Microservices — reversed course after exploding defect
rate and falling velocity](https://www.twilio.com/en-us/blog/developers/best-practices/goodbye-microservices)

**Services split along file/CRUD lines with no domain or ownership boundary
behind the split ("networked monolith").** Splitting buys the network-call
tax (latency, partial failure, deploy/on-call surface) without buying the
isolation splitting is supposed to buy, because nothing was actually
decoupled — one bug traced through 50 services across 12 teams before
regrouping into domain-owned services cut integration time 3 days to 3
hours (Uber DOMA). *Fix:* group by domain/ownership before splitting by file.
[Uber: Domain-Oriented Microservice Architecture](https://www.uber.com/en-NL/blog/microservice-architecture/)

**Many services sharing one unisolated piece of infra ("shared-infra blast
radius").** A scale-up misconfiguration on one shared Cassandra cluster
cascaded into an outage across every dependent service bank-wide (Monzo
2019). Service count isn't the only proliferation risk — infra shared
without a blast-radius boundary turns one ordinary change into a
company-wide incident.
[Monzo: Why Monzo wasn't working on July 29th](https://monzo.com/blog/2019/09/08/why-monzo-wasnt-working-on-july-29th)

**Fixed-TTL cache read on a known-hot key, no jitter.** Synchronized
expiry across many cached entries (or many replicas caching the same key)
means simultaneous mass expiry under load — every request misses cache at
once and hammers the DB together (cache stampede / thundering herd on
hot-key expiry).
[Redis: how to tame the thundering herd](https://redis.io/blog/how-to-tame-the-thundering-herd-problem/)
*Fix:* jittered TTL, or a mutex/singleflight around the cache-miss fetch so
only one request repopulates.

**Duplicated block that should call an existing function (churn signal),
seen at rising rate specifically in AI-assisted commits.** This is the
`over:reuse` rung's evidence base, updated: a 2026 follow-up (623M changes,
2023-2026) found within-commit copy/paste up 41%, duplicated-block commits
up roughly 10x over two years, and cross-file function calls (the reuse
signal) down 35% — 2024 was the first year on record where copy/paste
exceeded refactored ("moved") code. Code churn itself rose from a 3.3%
pre-AI baseline to 7.1%. *Fix:* same as `over:reuse` — call the existing
function, don't duplicate the block; flag it even when the duplicate
"looks fine" in isolation, since the decay is cross-commit, not visible in
one diff.
[GitClear 2026: the maintainability gap](https://www.gitclear.com/the_ai_code_quality_maintainability_gap)

**Env-specific value hardcoded instead of sourced from config/IaC.** A
manual edit that only exists in one environment's running config, with no
corresponding commit. Invisible day one; over months, staging stops
resembling prod, tests give false confidence, and outages happen only
where nobody's watching.
[IBM: configuration drift](https://www.ibm.com/think/topics/configuration-drift)

## Sources

- [alibaba/open-code-review (Apache-2.0): system review-rule prompts, Python correctness checklist](https://github.com/alibaba/open-code-review)
- [GitClear 2025: 211M-line, 5-year code-quality trend study](https://www.gitclear.com/ai_assistant_code_quality_2025_research)
- [GitClear 2026: the maintainability gap, 623M changes 2023-2026](https://www.gitclear.com/the_ai_code_quality_maintainability_gap)
- [Stanford/Codex security study — Copilot users wrote more insecure code, more confidently](https://techcrunch.com/2022/12/28/code-generating-ai-can-introduce-security-vulnerabilities-study-finds/)
- [AIRA silent-failure audit, matched-control 955 AI vs 955 human files](https://arxiv.org/pdf/2604.17587)
- [Are Coding Agents Generating Over-Mocked Tests?, MSR'26](https://andrehora.github.io/pub/2026-msr-agents-over-mocked-tests.pdf)
- [Pearce et al., Asleep at the Keyboard, arXiv:2108.09293](https://arxiv.org/abs/2108.09293)
- [LLM-generated code security, systematic literature review, arXiv:2412.15004](https://arxiv.org/pdf/2412.15004)
- [Riftmap: AI agent blast radius, 2026 data](https://riftmap.dev/blog/ai-doesnt-understand-blast-radius/)
- [Package hallucination baseline, 576K generations across 16 LLMs](https://arxiv.org/pdf/2605.17062)
- [Habr: Go concurrency/memory code-review case study](https://habr.com/ru/articles/1031010/)
- [Habr (OzonBank): retry/timeout anti-patterns with formulas](https://habr.com/ru/companies/ozonbank/articles/1027142/)
- [Habr (Otus): 5 queue mistakes causing duplicates/loss](https://habr.com/ru/companies/otus/articles/1031284/)
- [Habr (Otus): mutation testing on AI-generated code+tests](https://habr.com/ru/companies/otus/articles/1048504/)
