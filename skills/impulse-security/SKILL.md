---
name: impulse-security
description: >
  Proactive backend security patterns for Go/Python microservices: JWT
  access/refresh architecture, HMAC-signed guest sessions, secrets
  management at small-team scale, RBAC/IDOR authorization, layered rate
  limiting, CORS, and Traefik edge hardening (headers, TLS, DDoS ceiling,
  webhook signature verification). Builds security in at write time —
  general/deep security audit stays /code-review or /security-review.
  Triggers: "/impulse-security", "authn", "authz", "JWT", "секьюрити",
  "безопасность", "IDOR", "rate limit", "CORS", "секреты", "webhook
  подпись".
---

# impulse-security

Same day-one-baseline stance as `impulse-backend`, applied to auth/authz/
secrets/edge — build it in when the code is written, don't wait for a
security pass to bolt it on. Every rule below traces to a real,
documented incident or a current (2025-2026) spec/RFC, not a generic
OWASP paraphrase.

## Scope split — read this first

| Layer | Owns |
|---|---|
| Application auth (JWT, HMAC guest sessions, IDOR/authz) | `references/auth.md`, `references/authz.md` |
| Secrets at rest and rotation | `references/secrets.md` |
| Rate limiting (app + edge) | `references/rate-limit.md` |
| Edge/infra (Traefik: CORS, headers, TLS, DDoS, webhooks) | `references/edge.md` |
| PII/privacy (log redaction, PII-in-Kafka, right-to-delete, 152-ФЗ) | `references/privacy.md` |

`impulse-review`'s `bug:` tag already catches the AI-typical instances of some
of these (hardcoded secrets, missing auth middleware, upload validation) —
this skill is the deeper reference those findings point to, and the
proactive-build-time layer for everything not yet diff-visible.

## The two mistakes that recur most — IDs `SE-M1`, `SE-M2`

Both are diff-visible, so both carry a impulse-review tag via
[`shared/rule-spine.md`](../../shared/rule-spine.md).

1. **Auth without authz.** A token can be perfectly valid, verified,
   unexpired — and the endpoint still leaks another user's data if the
   query isn't scoped by the authenticated principal. This is IDOR, the
   single most common real-world API breach pattern in 2023-2026
   (Peloton, T-Mobile — both named cases, `authz.md`). Authenticating a
   request and authorizing what it can touch are two different checks;
   neither one substitutes for the other.
2. **Config that trusts the token to say what it is.** JWT algorithm
   confusion (accepting whatever `alg` the token header claims instead of
   hardcoding the expected one), a weak HMAC secret, missing `aud`/`iss`
   validation — all let an attacker-controlled input decide how it gets
   verified. `references/auth.md` has the exact code-level tell for each.

## References — load on demand

| File | Covers | Load when |
|---|---|---|
| references/auth.md | JWT access/refresh rotation+reuse-detection, algorithm confusion, claims validation, HMAC guest-session design | any token-issuing or token-verifying code |
| references/authz.md | RBAC vs ABAC, IDOR — the code-level tell, Peloton/T-Mobile case studies | any resource lookup by user-supplied ID |
| references/secrets.md | small-team secrets tiers (.env → Compose secrets → SOPS → lightweight manager), rotation reality check | choosing/reviewing secrets storage |
| references/rate-limit.md | layered rate limiting, sliding window, the endpoints teams forget, GraphQL batching bypass | any new unauthenticated endpoint |
| references/edge.md | Traefik rate-limit/CORS/headers config, TLS/cert management, realistic DDoS ceiling, webhook signature verification, real Traefik CVEs | edge/infra config changes |
| [../../shared/rule-spine.md](../../shared/rule-spine.md) | builder↔review crosswalk — `SE-M1`/`SE-M2` and the `bug:` tag that reports them | asking which review tag catches a security mistake, or adding a third one |
| references/privacy.md | PII log-redaction (zap/structlog), PII-in-Kafka (reference-by-ID, crypto-shredding), schema minimization, right-to-delete, retention-as-code, 152-ФЗ localization, prod-dump masking | logging user data, PII in events/schema, deletion requests, staging data |

## Boundaries

- This skill governs proactive, build-time security patterns. A full
  security audit, penetration-test-style review, or anything needing deep
  threat modeling → `/security-review` or `/code-review`.
- AI-typical security bugs already caught in a diff → `/impulse-review`'s
  `bug:` tag (hardcoded secrets, SQL injection, missing auth wiring, upload
  validation, IDOR and token-verification confusion via `SE-M1`/`SE-M2`) —
  this skill is the deeper explanation those findings cite, not a duplicate
  check.
- MCP-server-specific security (tool poisoning, OAuth 2.1 for MCP,
  agentic-loop cost guardrails) → `impulse-ai/references/mcp-security.md` —
  different trust-boundary shape, doesn't belong here.
- "stop impulse" / "normal mode": revert to default behavior.
