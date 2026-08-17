# Edge security — Traefik

Traefik is the blessed edge (`impulse-backend/references/deps.md`): "rate
limit, CORS, compression, TLS: Traefik middleware at the edge, never
per-service middleware copies." This file is the how.

## Rate limiting

```yaml
http:
  middlewares:
    api-ratelimit:
      rateLimit: { average: 100, burst: 50, period: 1s, sourceCriterion: { ipStrategy: { depth: 1 } } }
    auth-ratelimit:
      rateLimit: { average: 5, burst: 10, period: 1m }
```

General API: ~50-200 req/s/IP, burst roughly equal to average. Auth/login/
OTP/password-reset endpoints (`rate-limit.md`'s forgotten-endpoints list):
per-minute granularity, far stricter — brute-force protection needs a
different time scale than general throttling.

**Misconfigurations to flag:**
1. No `sourceCriterion.ipStrategy` behind a proxy/CDN → all traffic buckets
   under the load balancer's IP, rate limiting becomes effectively global.
2. Wrong `depth`/`excludedIPs` so `X-Forwarded-For` is trusted from an
   untrusted hop — an attacker sets the header themselves and resets their
   own bucket every request.
3. `average: 0` left by accident (Traefik docs: 0 = unlimited).
4. Rate limit applied to one entrypoint, a second entrypoint bypasses it
   entirely.

## CORS and security headers

**Never** `accessControlAllowOriginList: ["*"]` with
`accessControlAllowCredentials: true`. Browsers reject that exact
combination — but the real-world exploit isn't the wildcard, it's the
"fix": code (usually backend, not Traefik) that **reflects the request's
`Origin` header back verbatim** to satisfy the browser check while still
accepting any origin. This passes the browser's check and is functionally
worse than the wildcard, since it looks locked-down. Documented real case:
Glances REST API shipped `allow_origins=["*"]` + `allow_credentials=True`;
Starlette's CORS middleware reflected Origin, enabling credentialed
cross-site theft of monitoring data. Not an isolated incident: large-scale
academic measurement of real-world CORS deployments found the spec itself
poorly understood across both browsers and web frameworks, producing
exactly this class of silent misconfiguration at scale — treat "reflects
Origin to satisfy the browser" as a pattern to actively grep for, not a
one-off bug.
[USENIX Security: empirical study of CORS specs and real-world deployment](https://www.usenix.org/system/files/conference/usenixsecurity18/sec18-chen.pdf)

**Reviewable tell**: CORS config that sets `AllowOrigin` from
`r.Header.Get("Origin")` without checking it against an allowlist — must
be an explicit list of known frontend origins (dev + prod Nuxt domains),
never a blanket echo.

**A second, distinct failure mode: CORS set at more than one layer.**
Traefik is the blessed layer for CORS per the rule above — but a service
that ALSO sets its own `Access-Control-Allow-Origin` (framework default
middleware left enabled, or a leftover from before the edge migration)
produces duplicate or conflicting headers, which browsers reject outright
regardless of whether either individual value was correct. Pick exactly
one authoritative layer — Traefik when the service sits behind it, the
service only when genuinely unproxied — and verify every other layer
stays silent. If a dual-layer topology is genuinely unavoidable, strip
the upstream header explicitly rather than letting both pass through
(`header_down -Access-Control-Allow-Origin` in Caddy-shaped configs,
`proxy_hide_header` in Nginx-shaped ones — the Traefik-equivalent
middleware for this is stripping the backend's own CORS headers before
Traefik adds its own).

Default security-headers middleware, baked in at the edge, not per-service:

```yaml
secure-headers:
  headers:
    stsSeconds: 31536000
    stsIncludeSubdomains: true
    stsPreload: true
    contentTypeNosniff: true
    frameDeny: true
    referrerPolicy: "strict-origin-when-cross-origin"
    contentSecurityPolicy: "default-src 'self'; frame-ancestors 'self'"
```

## TLS and certificate management

1. `tls.options.default.minVersion: VersionTLS12` (TLS 1.3 preferred).
   Confirm a named `tls.options` block exists and routers reference it —
   an unconfigured router silently falls back to `default`, which may be
   more permissive than intended.
2. Prefer TLSChallenge or DNSChallenge over HTTPChallenge — the HTTP
   challenge's ~50s window was exploitable for a slowloris-style DoS
   (CVE-2023-47124, patched 2.10.6/3.0.0-beta5).
3. **Renewal failing silently is the real operational risk** — Traefik
   keeps serving the old (expiring/expired) cert with no default
   alerting. Monitor cert expiry externally (an uptime check hitting the
   actual TLS handshake), don't trust Traefik's own logs to surface this.

## DDoS/abuse — realistic ceiling for this scale

Layer `inFlightReq` (concurrent-connection cap per source) alongside
`rateLimit`, plus a `buffering` middleware with `maxRequestBodyBytes` to
reject oversized bodies and mitigate slow-body/slowloris attacks.

**Be honest about the ceiling**: this stack stops app-layer floods and
single-box slowloris. It does NOT stop volumetric L3/L4 floods — a
sufficiently large UDP flood saturates the network interface before
Traefik ever sees the packets. That needs upstream protection (host/CDN
DDoS filtering), not more Traefik config. Treat edge middleware as
defense-in-depth, not the complete answer.

## `forwardAuth` — SSO in front of a service that has no auth of its own

Traefik's `forwardAuth` middleware sends every request to an
auth-decision service first; a non-2xx response short-circuits the
request before it reaches the backend. This is the way to put
authentication in front of an internal panel/tool that doesn't implement
its own — closing it without touching its code. Two real
implementations of the pattern: **Authelia** running as a dedicated
`forwardAuth` target (CEL-based access rules, `authz.md`), and
**authentik's outpost** (a small Go reverse-proxy component deployed
specifically for this — checks the session, injects identity headers).
Same shape either way: Traefik asks "let this through?", the outpost/
Authelia instance answers, only Traefik enforces. Reach for this before
adding ad hoc auth middleware inside a service that was never designed to
have any.

## WAF at the edge — Coraza + OWASP Core Rule Set

Where it sits: in front of Traefik's own middlewares, or as a Traefik
middleware itself — request path is client → WAF inspection → Traefik
routing/TLS/rate-limit/CORS → backend. Coraza is a **library** (Go), not a
standalone product: "Coraza is a library at its core, with many
integrations to deploy on-premise Web Application Firewall instances."
[corazawaf/coraza README](https://github.com/corazawaf/coraza/blob/main/README.md)
It ships ModSecurity-SecLang-compatible and is "100% compatible with the
OWASP Core Rule Set v4" — the rules aren't Coraza's own, they're the
community-maintained [OWASP CRS](https://coreruleset.org) loaded into the
engine, covering SQLi, XSS, PHP/Java code injection, HTTPoxy, Shellshock,
scanner/bot detection.

**Deployment shape** — pick the integration matching the existing edge,
maintained by the Coraza project itself:
- [coraza-caddy](https://github.com/corazawaf/coraza-caddy) — Caddy reverse-proxy plugin (stable)
- [coraza-proxy-wasm](https://github.com/corazawaf/coraza-proxy-wasm) — proxy-wasm extension for Envoy-class proxies (stable)
- [coraza-spoa](https://github.com/corazawaf/coraza-spoa) — HAProxy SPOE filter (experimental)
- Traefik: a native Coraza WAF middleware exists in Traefik Hub / Traefik's
  own middleware reference — same "inspect before route" position relative
  to the rest of this file's Traefik middlewares (rate limit, CORS,
  security headers) as the Caddy/HAProxy integrations above.
- No official nginx-native plugin — `libcoraza` (C library binding) is
  listed experimental for that path.

**Rollout: detection mode before blocking mode.** Coraza's `SecRuleEngine`
directive takes `On | Off | DetectionOnly` — `DetectionOnly` "process[es]
rules but never executes any disruptive actions (block, deny, drop, allow,
proxy and redirect)."
[Coraza SecLang directives](https://www.coraza.io/docs/seclang/directives/)
Set it first, log what CRS would have blocked without blocking it, so a
first rollout doesn't take down legitimate traffic on CRS false positives
before the ruleset is tuned to this app's actual traffic shape. Only flip
to `On` after a detection-mode observation window shows the false-positive
rate is acceptable — a WAF's false positives are an availability outage,
not just noise, so the log-first step earns its cost before anything gets
denied.

## Gateway-vs-custom-code boundary

Traefik-as-gateway is sufficient for: token validation, rate limiting,
request-size/shape checks, TLS termination, header hardening, basic
routing/canary. Custom gateway code is justified only for domain-specific
object-level authorization (`authz.md` — does *this* caller own *this*
resource, which needs app data Traefik doesn't have). Building custom
rate-limiters, custom CORS handling, or custom retry/circuit-breaking
per-service when Traefik middleware already covers it is the ladder's
rung-4 violation (platform primitive over app code) applied to edge
config specifically.

## Webhook security (Telegram bots, payment providers)

- **Telegram**: set `secret_token` on `setWebhook`, verify constant-time
  against `X-Telegram-Bot-Api-Secret-Token` on every request. Confirm no
  header-stripping middleware sits between Traefik and the bot service.
  IP allowlisting alone is weaker/unofficial for Telegram — the secret
  token is the primary control.
- **Stripe-style HMAC signatures**: verify against the raw, unparsed
  request body — any body-buffering/transformation middleware (in Traefik
  or an app-side JSON parser) that mutates bytes before verification
  breaks the signature check. Reject stale signature timestamps (replay
  protection). Provider IP ranges rotate — treat IP allowlisting as
  advisory only, never fail closed on a stale IP list alone; fail open to
  the signature check.

## Documented Traefik CVEs — cite these, not hypotheticals

| CVE | Impact | Fixed |
|---|---|---|
| CVE-2025-66491 | experimental ingress-nginx provider silently disabled TLS cert verification for ~5 months — `Verify=On` semantically turned TLS off | v3.6.3 |
| CVE-2024-45410 (CVSS 9.8) | HTTP/1.1 hop-by-hop header abuse let attackers strip/manipulate Traefik-injected headers (`X-Forwarded-Host`/`Port`) via the `Connection` header | 2.11.9 / 3.1.3 |
| CVE-2025-54386 | path traversal in Traefik's plugin ZIP install → arbitrary file overwrite/RCE (relevant if using community plugins) | 2.11.28 / 3.4.5 / 3.5.0 |
| CVE-2023-47124 | HTTPChallenge slowloris-style DoS | 2.10.6 / 3.0.0-beta5 |

Run a version check against this table whenever reviewing a Traefik
upgrade/pin decision — a stale pin sitting below one of these fix versions
is a BLOCK, not a WARN.
