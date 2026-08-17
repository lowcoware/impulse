# Hardening — Node.js (Fastify / TypeScript) production traps

`baseline.md` is the day-one minimum. This file is the layer above:
Node/Fastify patterns that pass tests, pass review at a glance, and take
down a service months later under real load. Every entry has a real
incident or a documented footgun behind it. Go equivalent: `hardening-go.md`.
Python equivalent: `hardening-python.md`.

## Single-threaded event loop — the one fact everything else follows

Node runs your JS on ONE thread. `async`/`await` yields at I/O, not at
CPU work — a synchronous call anywhere in a request path stalls every
other in-flight request on that process, not just the caller.

1. Sync-suffixed stdlib calls (`fs.readFileSync`, `crypto.pbkdf2Sync`,
   `zlib.gzipSync`) on a request path block the whole process for their
   duration. `bcrypt.hashSync`/`compareSync` on a login endpoint is the
   classic version — a ~100ms hash stalls every concurrent request for
   100ms. Use the async variant (`fs.promises`, `crypto.pbkdf2`,
   `bcrypt.hash`) or push to a worker thread.
2. `JSON.parse`/`JSON.stringify` on a large payload, `Array.sort` on a
   large array, a hand-rolled regex over user input (ReDoS —
   `security-checklist.md` owns the pattern table) — all synchronous, all
   block proportional to input size. Cap payload size before parsing
   (Fastify's `bodyLimit`), don't trust "it's just JSON" to be cheap.
3. Symptom signature: identical to Python's GIL-stall case
   (`hardening-python.md`) — CPU pegs on one core, p99 spikes, throughput
   flatlines despite low CPU total across cores. `perf_hooks` /
   `--prof` or a flame graph over a load test finds the blocking call;
   `node --trace-sync-io` flags sync fs calls in production as a cheap
   tripwire.
4. Real parallelism for CPU-bound work (image processing, hashing,
   embedding-adjacent compute) is `worker_threads`, not more async — async
   buys concurrency during I/O waits, never parallelism during compute.
   Piscina is the blessed pool wrapper (`deps.md`) once a raw
   `new Worker()` per call stops being enough.

## Unhandled promise rejections

1. An `async` route handler that throws with nothing awaiting it, or a
   fire-and-forget `somePromise()` call with no `.catch`, produces an
   `unhandledRejection`. Since Node 15 the default behavior is to crash
   the process — not log-and-continue like Python's default event-loop
   exception handler. A single un-awaited promise in a rarely-hit branch
   can take the whole service down under the right input.
2. Fastify catches rejections thrown *inside* a registered route handler
   automatically and routes them to the error handler — this trap is
   specifically about promises started but not awaited/returned from
   inside a handler (background cache warm, unawaited audit-log write).
3. Fix: `void` a genuinely fire-and-forget call only after attaching
   `.catch(logger.error)` — a bare `void promise()` still crashes on
   rejection, `void` only suppresses the "unused promise" lint warning,
   it does not attach a handler.
4. Belt-and-suspenders: a top-level `process.on('unhandledRejection', ...)`
   that logs with full context and exits non-zero (fail fast, let the
   orchestrator restart) rather than limping in a corrupted state — never
   swallow-and-continue at that handler, it exists to make the crash
   loud and diagnosable, not to prevent it.

## Fastify schema validation

1. Every route gets a `schema` (JSON Schema via `schema: { body, querystring,
   params, response }`), not just for input validation — Fastify compiles
   the `response` schema into a fast serializer (`fast-json-stringify`),
   which is also how excessive-data-exposure gets closed at the framework
   level: fields not in the response schema are dropped, even if the
   handler returns them. A route with no response schema silently
   serializes whatever the handler returns, ORM internals included.
2. Prefer TypeBox (or Zod via `fastify-type-provider-zod`) over hand-written
   JSON Schema for the type inference — the request/reply types flow
   through to the handler, mismatches are a compile error, not a runtime
   surprise.
3. AJV (Fastify's validator) coerces types by default (`"123"` → `123`
   for a `number` field) — fine for query strings, a footgun if a body
   field's type is meant to be strict; set `coerceTypes: false` per-schema
   where exact typing matters (money fields, IDs).

## Fastify v5 — host binding

`fastify.listen()` defaults to `host: '127.0.0.1'` — loopback only. Behind
a reverse proxy (Traefik/Nginx) in its own container, that binds a socket
the proxy container can't reach: the process reports "listening" and
healthchecks pass locally, but every proxied request gets connection-
refused with no application-side error to grep for. Set `host: '0.0.0.0'`
explicitly for any containerized deploy — never rely on the default.
[Fastify v5 migration guide](https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/)

## Fastify plugin encapsulation

1. Fastify's plugin system is encapsulated by default — decorators,
   hooks, and config registered inside a plugin do NOT leak to sibling
   plugins or the parent instance unless wrapped in `fastify-plugin`.
   This is a feature (prevents one route group from polluting another),
   but a decorator added inside a plugin and expected to be visible in
   `main.ts` is the single most common Fastify-newcomer bug.
2. Decorate at the composition root (`fastify.decorate('db', pool)`) for
   anything every route needs; use plain plugin-local scope for anything
   that shouldn't leak. Reaching for `fastify-plugin` on everything
   defeats the isolation and turns every plugin into global state.
3. Register order matters for hooks (`onRequest`, `preHandler`, etc.) —
   they run in registration order, not alphabetical or by route
   specificity. A rate-limit or auth `preHandler` registered after the
   route it's meant to guard doesn't guard it.

## Correlation-ID propagation — the Node mechanism

`observability.md` requires correlation-ID propagation as baseline; Node's
mechanism is `AsyncLocalStorage` (`node:async_hooks`), the equivalent of
Python's `contextvars` (`hardening-python.md`) or Go's `context.Context`.

1. Set it in an `onRequest` hook: read/generate the ID, `als.run(id, () =>
   done())` so every subsequent hook and the handler runs inside that
   context. Pull it in the logger's `mixin` option so every `pino` log
   line carries it without threading it through every function signature.
2. Same crossing-boundary gap as Python's `contextvars`: a callback
   scheduled via `setImmediate`/`setTimeout`, or a job handed to a worker
   thread, does NOT automatically carry the `AsyncLocalStorage` context —
   `AsyncLocalStorage` propagates across `await` and Promise chains, but a
   worker-thread boundary is a real thread boundary and needs the ID
   passed explicitly in the message payload.

## Logging — pino, not `console.log`

1. `console.log` is unstructured, synchronous on Windows/TTY targets, and
   has no level filtering — baseline.md's structured-JSON-logs requirement
   is `pino` on the Node side (Go: zap, Python: structlog/stdlib+JSON
   formatter). Fastify ships pino as its built-in logger — use
   `fastify.log`, don't bolt on a second logger.
2. `pino` is fast specifically because serialization happens off the main
   thread via a worker (`pino/file` transport, or `pino-pretty` in dev
   only — never pipe through `pino-pretty` in production, it's a sync
   dev-convenience formatter that defeats the async-transport speed win).
3. Never log the full request/response body by default — request bodies
   routinely carry passwords/tokens/PII. Fastify's `redact` option (built
   on pino's redaction) strips named paths (`req.headers.authorization`)
   before the log line is ever serialized, not after.

## Streams and backpressure

1. `stream.write(chunk)` returns `false` when the internal buffer is
   above `highWaterMark` — code that ignores the return value and keeps
   writing anyway grows the buffer unbounded (a slow HTTP client behind a
   fast producer is the classic case: a large file/report streamed to a
   client on a bad connection backs up in process memory).
2. `pipeline()` (`stream/promises`), not manual `.pipe()` chains — manual
   piping doesn't propagate errors or clean up (destroy) the other
   streams in the chain when one errors, leaking file descriptors/sockets
   under any mid-stream failure. `pipeline` does both automatically.

## Error handling and transaction boundaries

1. **Domain errors carry their own HTTP status, one `setErrorHandler`
   maps them** — the same shape as Python's domain-exception pattern
   (`hardening-python.md`) and Go's error-handling ladder (`layout.md`).
   A `DomainError` base class with a `statusCode` property; Fastify's
   `fastify.setErrorHandler((err, req, reply) => ...)` reads it off
   whatever domain error was thrown. Routes never catch and re-map their
   own errors.
2. **Transaction boundary lives at the request/use-case level, not
   scattered `BEGIN`/`COMMIT` calls per repository method** — whichever
   query builder/ORM is in use (Drizzle, Prisma, Kysely), open the
   transaction once per request/command in the service layer, pass the
   transaction handle down; repositories never open their own.
3. A `try/catch` around an `await` that only re-throws the same error
   adds nothing but stack noise — catch only where you either translate
   the error (infra → domain) or need to run cleanup (`finally` usually
   does the cleanup case better).

## `npm`/`pnpm` supply-chain and CI hygiene

1. `npm ci` / `pnpm install --frozen-lockfile` in CI and Docker builds,
   never `npm install` — `install` can silently update the lockfile
   against `package.json` ranges; `ci`/`--frozen-lockfile` fails loud
   on drift instead of shipping an unreviewed version bump.
2. `postinstall` scripts run arbitrary code for every transitive
   dependency at install time — this is the actual delivery mechanism
   for most npm supply-chain compromises (event-stream 2018, and the
   recurring pattern since). `npm ci --ignore-scripts` in CI/build
   images where nothing in the dependency tree has a legitimate build
   step that needs it; audit anything that does.
3. Pin exact versions for anything security-sensitive (auth, crypto,
   payment SDKs) rather than trusting semver ranges — a compromised
   patch release under `^1.2.3` installs silently on the next `npm ci`
   if the lockfile isn't the thing pinning it. Full supply-chain
   lockfile discipline: `impulse-dependency-audit/references/supply-chain.md`.

## TypeScript-specific footguns

1. `tsconfig.json` without `strict: true` (or, piecemeal, without
   `noUncheckedIndexedAccess`) types `arr[i]` as the element type, not
   `T | undefined`, even when `i` is out of bounds — an out-of-range
   index silently reads as valid-typed `undefined` reaching downstream
   code that assumes a real value. Turn it on rather than sprinkling
   manual bounds checks defensively.
2. `as` casts and `!` non-null assertions bypass the type checker at
   exactly the place a real mismatch would otherwise be caught — each one
   is a claim "I know better than inference here"; a cast/assertion with
   no comment justifying why is a review flag, not a style nit.
3. Validate at the trust boundary with the SAME schema that produces the
   TypeScript type (TypeBox/Zod), not a hand-written `interface` — a type
   annotation is compile-time only and enforces nothing at runtime; an
   `interface` describing the shape of unvalidated `request.body` is a
   lie the compiler can't check.
