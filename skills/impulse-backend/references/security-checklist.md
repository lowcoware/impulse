# Security checklist — Go / FastAPI production hardening

Complements `hardening-go.md`/`hardening-python.md` (lifecycle/perf traps),
`ai-bug-patterns-be.md` (SQL injection, hardcoded secrets, missing auth
middleware, upload-by-extension), and `impulse-security` (JWT/cookie-flag/
CORS/edge already own that ground — not repeated here). This file is the
layer none of those cover: HTTP-server misconfiguration, framework-idiom
footguns, and the specific detection pattern to grep for each.

## Go (net/http)

| Rule | Insecure pattern | Detect | Fix |
|---|---|---|---|
| Server timeouts/`MaxHeaderBytes` set explicitly | `http.ListenAndServe(":8080", h)`, bare `&http.Server{}` | `ListenAndServe(`, `Server{` with no timeout fields | `ReadHeaderTimeout`/`ReadTimeout`/`WriteTimeout`/`IdleTimeout`/`MaxHeaderBytes` all set — zero-value means "no timeout" |
| Request body size bounded | `io.ReadAll(r.Body)` uncapped, `ParseMultipartForm` with no limit | `io.ReadAll(r.Body)`, `ParseMultipartForm(` | wrap with `http.MaxBytesReader(w, r.Body, max)` before parsing |
| `pprof`/`expvar` not public | blank `import _ "net/http/pprof"` on the public mux | `net/http/pprof`, `/debug/pprof`, `/debug/vars` | bind diagnostics to an internal-only listener, auth-gated |
| Forwarded-header trust explicit | `X-Forwarded-For`/`-Proto` read as client truth with no proxy-boundary check | `X-Forwarded-For`, `X-Forwarded-Proto`, `Real-IP` | accept forwarded headers only from a known proxy IP range; never derive "is HTTPS" or password-reset host from an unvalidated header |
| CSRF on cookie-auth state-changing routes | JSON endpoint mutates state, cookie-authenticated, no CSRF check | enumerate non-GET routes by auth mechanism | CSRF middleware, or bearer-token auth instead of ambient cookies. Cookie flag rules (Secure/HttpOnly/SameSite) are documented in `impulse-security/references/auth.md` for the refresh-token cookie — apply the same flags to any other session/auth cookie this endpoint sets, that file doesn't enumerate every cookie use case |
| `html/template` not `text/template` for HTML output | `text/template` building HTML, `template.HTML(userInput)` | `text/template`, `template.HTML(` | `html/template` only; never wrap untrusted data in a "trusted" template type |
| No SSTI | `template.New(...).Parse(r.FormValue(...))` | `.Parse(` traced to request-controlled input | never parse a template built from untrusted input; sandbox aggressively if genuinely required |
| Path traversal blocked | `http.ServeFile(w, r, r.URL.Query().Get("path"))`, `http.FileServer(http.Dir("."))` on project root | `ServeFile(`, `FileServer(`, `os.Open(filepath.Join(` | allowlist file IDs mapped server-side; enforce base-dir containment after `filepath.Clean` |
| SSRF blocked on outbound fetch | `http.Get(r.URL.Query().Get("url"))` | `http.Get(`, `client.Do(` with request-derived URL | allowlist hosts, block private/link-local/metadata IP ranges, restrict scheme to http/https, cap redirects. **DNS-rebinding gap**: allowlist-then-fetch as two separate steps (resolve to check, then let the HTTP client re-resolve on the real request) lets a malicious DNS answer flip between the check and the fetch — first resolution returns a public IP, second returns `169.254.169.254`. Resolve once, fetch by the resolved IP directly with the original Host header preserved, so a second DNS lookup can't happen at all |
| Outbound client has timeout + closes body | `http.DefaultClient`/`http.Get` with no timeout, missing `defer resp.Body.Close()` | `http.Get(`, `client := &http.Client{}` no `Timeout` | configured client timeout, `defer resp.Body.Close()` immediately after error check, `io.LimitReader` on untrusted response bodies |
| Open redirect blocked | `http.Redirect(w, r, r.URL.Query().Get("next"), ...)` unvalidated | `http.Redirect(` with request-derived location | allowlist internal paths, reject absolute URLs unless explicitly allowlisted |
| Crypto-grade randomness | `math/rand` for session/token/nonce generation | `math/rand`, `rand.Seed` near auth/session code | `crypto/rand` for anything security-sensitive, never `math/rand` |
| Constant-time secret comparison | `==` comparing tokens/MACs/API keys | `==` near token/MAC compare | `crypto/subtle.ConstantTimeCompare` or `hmac.Equal` |
| Race detector in CI | shared map/slice mutated from handlers, no `-race` in CI | missing `go test -race` | run `-race` in CI for any service with concurrent shared state; data races on auth/authorization state are security bugs, not just correctness bugs |

## FastAPI (Python)

| Rule | Insecure pattern | Detect | Fix |
|---|---|---|---|
| No mass assignment | `payload = await request.json(); Model(**payload)` or `db.update(**payload)` unfiltered | `await request.json()`, `Model(**payload)` on a write endpoint | explicit Pydantic model with allowlisted fields, reject unknown fields on write endpoints |
| No excessive data exposure | `return user` where `user` is the ORM instance (leaks `password_hash`, `is_admin`, internal columns) | endpoint returns an ORM object directly, no `response_model` | separate "create input" / "db" / "public output" schemas — never reuse the DB model as the response model |
| OpenAPI/docs not exposed in prod | `/docs`, `/redoc`, `/openapi.json` reachable in production with no auth | default FastAPI docs routes still mounted | disable or auth-gate interactive docs outside dev |
| Debug/reload off in prod | `uvicorn ... --reload`, `debug=True` in a production entrypoint | `--reload`, `reload=True`, `DEBUG=True` in Docker CMD/Procfile | stable prod server config, reload only for local dev |
| Auth enforced via dependencies consistently | a new route added with no `Depends(get_current_user)`-equivalent while siblings all have one | pattern-consistency check across a router group | same auth dependency chain as sibling routes in the same router |
| JWT strict + no secrets inside | JWT decoded with algorithm/issuer/audience unchecked, or JWT payload carries sensitive data | `jwt.decode(` with missing `algorithms=`/`audience=` | rule text owned by `impulse-security/references/auth.md` (algorithm confusion, claims validation) — this row is the grep detector only |
| Host header validated | no `TrustedHostMiddleware`, app trusts `Host` header for URL generation | absence of trusted-host middleware | `TrustedHostMiddleware` or equivalent allowlist in production |
| WebSocket endpoints authenticated | `@app.websocket(...)` accepts and processes messages with no auth check | `@app.websocket`/`websocket_endpoint` with no auth before sensitive operations | require auth during handshake, validate `Origin` for browser clients, rate-limit connections/messages |
| Request/multipart size bounded | no request or multipart size limit at app or edge | absent size-limit config | enforce at both edge (proxy) and app layer — DoS via memory/CPU exhaustion is a documented Starlette/python-multipart advisory class |

## Cross-framework: GraphQL-specific hardening

A REST-shaped security checklist misses failure modes specific to a
single flexible query endpoint:

- **Introspection disabled in production** (or gated to operator-only
  access) — leaving it on hands an attacker the full schema for free.
- **Query depth limit (~10) AND cost/complexity analysis, both** — depth
  alone doesn't stop a shallow-but-wide query (many expensive fields at
  one level) from being just as costly as a deep one. This is distinct
  from `rate-limit.md`'s alias/batching-abuse coverage, which addresses
  request-COUNT evasion via aliasing — this is about a single request's
  query SHAPE being unboundedly expensive.
- **Field-level authorization, not just endpoint-level.** GraphQL's BOLA
  equivalent happens per-field: a resolver for `User.email` being public
  doesn't mean the sibling resolver for `User.phone` inherits that
  same access — each field needs its own authz check, since a single
  query can request many fields with different sensitivity in one call.
- **Persisted queries (APQ) allowlisting for first-party clients**, with
  arbitrary ad-hoc queries reserved for trusted partners only — an
  open GraphQL endpoint accepting any query shape from any caller has a
  much larger attack surface than one that only executes pre-registered
  query hashes.

## Cross-framework: ReDoS (regex catastrophic backtracking, CWE-1333)

A regex with nested quantifiers or overlapping alternation
(`^([a-zA-Z0-9]+)*@`, `^(a+)+$`, `^(.*a){10}`) hangs on adversarial input
via catastrophic backtracking — a DoS vector, not just a performance
nit, whenever the pattern runs against user-controlled input (email
validation, username rules, any "validate this string" regex on a
request path). Python (`re`), JS (native regex), and most PCRE-family
engines are vulnerable; **Go's `regexp` (RE2) is immune by design** — RE2
guarantees linear-time matching and structurally cannot backtrack, so
this specific rule doesn't apply to Go code, only Python/FastAPI paths
and any regex touching request-controlled input. Fixes for the
vulnerable engines: possessive quantifiers/atomic groups (the `regex`
library, not stdlib `re`), an explicit timeout wrapped around the match
call, or — cheapest and most portable — bound the input length before it
ever reaches the regex.

## Cross-framework: required negative-path tests for any auth-guarded endpoint

"Test the error cases" without an enumerated list is exactly the kind of
vague guidance that lets a real gap (algorithm-confusion attacks,
revoked-user-still-accepted) get silently skipped. Every JWT/auth-guarded
endpoint gets a dedicated negative test for each of: missing token,
malformed token, invalid signature, wrong algorithm (the classic
`alg: none` / RS256-to-HS256 confusion attack), expired token, disabled
or revoked user, missing role/scope, and insufficient-permission access
to a resource the caller doesn't own. Missing even one of these from a
new auth-guarded endpoint's test suite is a review finding, not an
acceptable gap to "add later."

## Cross-framework: ID enumeration and the decrypt oracle

Applies regardless of Go/FastAPI/anything else — never return a real
sequential/plaintext primary key in an API response; a monotonic ID
exposes the internal ID space to enumeration (scrape every order, guess
every user). Encrypt or otherwise opaque-ify IDs at the response
boundary. The paired trap: when a client-supplied encrypted/opaque ID
fails to decrypt, respond with the exact same generic "not found" used
for a valid-but-missing ID — never a distinguishable error (a different
status code, a "malformed ID" message, a stack trace). A response that
tells the difference between "well-formed but missing" and "couldn't
decrypt" turns the encryption layer into an oracle an attacker can batch-
probe to learn about the ID space it was supposed to hide.

## Sources

Re-expressed from openai/skills `security-best-practices` (Apache-2.0) —
the upstream Go and FastAPI security-spec reference files, normative rule
IDs and detection patterns condensed into table form; full rule IDs and
OWASP cheat-sheet citations live in the upstream source if deeper
justification is needed.
