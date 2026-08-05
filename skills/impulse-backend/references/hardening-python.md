# Hardening — Python (FastAPI / async / aiogram) production traps

`baseline.md` is the day-one minimum. This file is the layer above: Python
async patterns that pass tests, pass review at a glance, and take down a
service months later under real load. Every entry has a real incident or a
documented study behind it. Go equivalent: `hardening-go.md`.

## Blocking calls inside `async def`

1. `async def` doesn't make a function non-blocking — it only yields
   control at `await` points. A sync driver/SDK call inside an `async def`
   (old sync SQLAlchemy sessions, `psycopg2`, `requests`, sync `redis-py`,
   `time.sleep()`) stalls the *entire event loop*, every concurrent
   request on that worker, not just the caller.
2. Symptom signature: CPU sits at 50-60%, p95/p99 latency spikes to 1-3s,
   throughput plateaus despite rising concurrency — requests piling up
   behind the stalled loop, not a resource-exhaustion pattern.
3. Fix: async-native drivers at the trust boundary (asyncpg, httpx,
   `redis.asyncio`); anything irreducibly sync goes through
   `asyncio.to_thread` (I/O-bound) or a `ProcessPoolExecutor` (CPU-bound).
4. Detection: `PYTHONASYNCIODEBUG=1` logs any event-loop tick over 100ms
   with a traceback of the offending coroutine — cheap as a staging
   tripwire. [Case study: fixing FastAPI event-loop blocking](https://www.techbuddies.io/2026/01/10/case-study-fixing-fastapi-event-loop-blocking-in-a-high-traffic-api/)

## Pydantic v2

1. Defaults are **not validated by default** (`validate_default=False`) — a
   `Field(default=...)` with a real invariant needs `validate_default=True`
   explicitly, or the "validated" schema silently isn't, for that field.
2. `model_validate()` is the v2 replacement for `parse_obj`/`from_orm` —
   both gone in v2, any surviving usage is dead-migration debt.
   `model_validate_json()` skips a redundant Python-level `json.loads`
   before validation — flag manual `json.loads(x)` piped into
   `model_validate` on a hot request path.
3. `frozen=True` blocks reassigning top-level fields; nested `dict`/`list`
   fields stay mutable in place. Code treating a frozen model as deeply
   immutable is a bug waiting to happen.
4. `arbitrary_types_allowed=True` on a hot-path schema falls back to slow
   Python-level validation, losing v2's Rust-core speed advantage.

## asyncio task lifecycle

1. `asyncio.create_task(coro())` with no reference held can be garbage
   collected mid-flight — a confirmed CPython bug
   ([cpython#91887](https://github.com/python/cpython/issues/91887)), worse
   since 3.12. Keep a module-level `set()` of live tasks
   (`bg.add(task); task.add_done_callback(bg.discard)`), or use
   `asyncio.TaskGroup` (3.11+) for anything with a clear scope.
2. `gather(..., return_exceptions=False)` (the default) does NOT cancel
   sibling tasks on first failure — they keep running, results discarded.
   `return_exceptions=True` swallows exceptions into the results list
   silently unless explicitly inspected. `TaskGroup` cancels siblings on
   any failure and raises `ExceptionGroup` — prefer it when failures should
   be fail-fast; keep `gather(return_exceptions=True)` only when partial
   success is a valid outcome AND every exception is checked.
3. A background task's unhandled exception surfaces only via the event
   loop's default exception handler (one log line, easy to miss) — attach
   `add_done_callback` that checks `task.exception()`.

## GIL / CPU-bound work

Async gives concurrency, not parallelism. CPU-bound work (embeddings,
tokenization, inference) holds the GIL and starves the loop regardless of
`async`/`await`. A `ThreadPoolExecutor` doesn't help CPU-bound work — it
still serializes on the GIL. Use `ProcessPoolExecutor` (workers ≈ core
count) for real parallelism, or push heavy inference to a dedicated
worker/queue (Redis Streams — the blessed lightweight-queue primitive,
`deps.md`) rather than running it inline in the request path.

## Class design

1. A class with only `__init__` plus one other method is a function wearing
   a costume — collapse it to a plain function; whatever lived on `self`
   becomes an argument (Diederich, PyCon 2012).
2. No `@property` getter/setter pair before a real need beyond attribute
   access shows up (validation, a computed value, lazy load) — a plain
   attribute already does the job; wrapping it "for encapsulation" adds a
   layer nothing reads (PJ Eby).

## aiogram v3

1. `MemoryStorage` for FSM state loses everything on restart/redeploy —
   any `MemoryStorage()` in a prod config is a blocker. Use `RedisStorage`
   with `state_ttl`/`data_ttl`.
2. Only one poller per bot token — Telegram rejects concurrent
   `getUpdates`. Needs exponential backoff on network failure and must
   drain in-flight updates on SIGTERM before exit (baseline.md's graceful
   shutdown applies to the polling loop, not just HTTP).
3. Webhook mode: Telegram's 60s handler timeout means a handler doing slow
   synchronous work (a blocking DB call, a gRPC hop with no timeout) risks
   Telegram treating the update as failed and redelivering it.
4. Flood control isn't built in (removed from aiogram v3) — implement via
   middleware: catch `TelegramRetryAfter`, `await asyncio.sleep(e.retry_after)`,
   and prefer prevention (a Redis token bucket) over reactive retry, since
   over ~1 msg/sec to one chat triggers Telegram's own throttling.
5. Platform depth beyond aiogram — Mini App initData auth, webhook
   secret_token, broadcast pacing, token leakage, media limits:
   `telegram.md`. Stars payments: `payments.md`.

## Error handling and transaction boundaries

1. **Domain exceptions carry their own HTTP status, one global handler
   maps them.** A `DomainError` base class with a `status_code` class
   attribute (`UserNotFoundError.status_code = 404`); a single global
   exception handler reads `exc.status_code` off whatever domain
   exception was raised. Routes never catch or re-map domain errors
   themselves — the mapping lives in exactly one place, not scattered
   across every route that might raise. **Don't reach for a full
   Clean-Architecture layered rewrite to get this** — `layout.md`'s flat
   `routers/services/repositories` shape is the intentional stance; this
   pattern fits inside it without an onion-architecture/repository-ABC
   tree.
2. **Commit inside the session dependency, not in every service/repo.**
   `commit()` happens once, in the `async def get_session()` dependency's
   generator, after `yield` — reached only if no exception propagated out
   of the request. Services and repositories never call
   `commit`/`flush`/`rollback` directly; the transaction boundary is the
   request, and the dependency is where that boundary lives. Go's
   equivalent is in `hardening-go.md`'s transaction-boundaries section —
   this is the same idea, Python-shaped.

## Correlation-ID propagation — the Python mechanism

`observability.md` requires correlation-ID propagation as baseline; this
is the concrete Python mechanism, via `contextvars`:

1. **Set it in `@app.middleware("http")`, not a class-based
   `BaseHTTPMiddleware`.** The class-based approach can swallow exceptions
   and interferes with streaming responses — the function-decorator form
   doesn't have either problem.
2. **Context does NOT auto-propagate across `run_in_executor` or spawned-
   task boundaries.** A correlation ID set in the request context goes
   silently missing the moment work crosses into `loop.run_in_executor`
   or a separately-spawned task — exactly the async-fan-out case where
   tracing it matters most. Carry it explicitly:
   `ctx = contextvars.copy_context(); ctx.run(the_task_fn)` (or the
   executor-equivalent) rather than assuming ambient propagation.

## FastAPI `BackgroundTasks` — misuse boundary

`jobs.md` covers Redis Streams/cron for real queue/schedule work;
`BackgroundTasks` is FastAPI's own in-process primitive, commonly reached
for first, with a real misuse boundary:

1. **Never for long-running, critical, must-retry, or must-be-durable
   work** — a `BackgroundTasks` callback that dies with the worker
   process (deploy, crash, restart) has no retry and no record it ever
   ran. That's what `jobs.md`'s real queue is for.
2. **Never pass `Request`, a DB session, or an ORM object into the task**
   — pass IDs; let the task open its own session. The request-scoped
   session is gone by the time the background task actually executes.
3. **Persist domain state BEFORE triggering the task, not after** — the
   task should follow up on already-committed state, never be the thing
   that makes the state real.

Legitimate use: best-effort follow-ups where losing the occasional one is
acceptable (send a non-critical notification, invalidate a cache key,
fire a webhook the caller doesn't need to wait for).
