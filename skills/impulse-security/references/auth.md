# Authentication — JWT and HMAC guest sessions

## JWT access/refresh architecture

1. **Refresh token rotation is baseline, not a hardening option** (RFC
   9700, Jan 2025 OAuth Security BCP): every `/refresh` call issues a NEW
   refresh token and invalidates the old one. No persistent, long-lived
   refresh token that survives multiple refresh calls unchanged.
2. **Reuse of an already-rotated-away token is a theft signal, not an
   idempotent retry.** Store refresh tokens as a family (family_id +
   chain index). A presented token that's already been rotated past →
   revoke the ENTIRE family, killing the legitimate session too — the cost
   of a false positive is a re-login, the cost of missing real reuse is a
   silent session hijack. A short grace window (~30s) absorbs concurrent
   legitimate refresh races (multiple tabs) without disabling detection.
3. **Lifetimes:** access token 5-15 minutes, refresh token 7-14 days with
   rotation. An access token `exp` computed more than an hour out is the
   single most common "fix it later" tech debt — flag it on sight.
4. **Storage** (matches `impulse-frontend`'s token-storage finding): access
   token in memory only, refresh token in `httpOnly; Secure;
   SameSite=Strict` cookie. Never localStorage for either.

## Algorithm confusion — the #1 library-level mistake

A JWT library that reads `alg` from the untrusted token header and
dispatches verification accordingly lets an attacker switch `RS256`→`HS256`
and sign with the server's own *public* key used as the HMAC secret, or
set `alg: none` to strip the signature entirely.

**The fix is one hardcoded/allowlisted value, checked out-of-band from the
token:**

| Language | Wrong | Right |
|---|---|---|
| Go (golang-jwt/v5) | bare `jwt.Parse(token, keyFunc)` | `jwt.Parse(token, keyFunc, jwt.WithValidMethods([]string{"RS256"}))` |
| Python (PyJWT) | `jwt.decode(token, key)` | `jwt.decode(token, key, algorithms=["RS256"])` — the allowlist is mandatory, not optional |

Real-world confirmed instances of this exact bug class: CVE-2024-54150
(cjwt), CVE-2015-9235 (jsonwebtoken). Not a theoretical attack.

## Claims validation — signature-valid ≠ valid for this request

Decoding a token and confirming its signature is not the whole check.
Separately verify, every time:

- `exp` (and `nbf` if used) — many libraries don't check these by default
  unless explicitly configured; assuming "the library validates
  everything" is the gap.
- `aud` — the token was actually minted for THIS service, not a sibling
  one that happens to share a signing key.
- `iss` — the token came from the expected issuer.

Reviewable tell: a decode call whose result is used directly with no
follow-up check of `aud`/`iss` against expected constants.

## HMAC-signed guest sessions

For unauthenticated users who still need tamper-evident, non-forgeable
state (a guest cart, a guest checkout flow):

1. **Payload**: random (not sequential/enumerable) guest ID, issued-at,
   expiry, and a purpose/scope tag — so a guest-cart token can't be
   replayed as a guest-checkout token for a different purpose.
2. **HMAC-SHA256 over the canonical serialized payload**, base64url
   encoded. Secret never appears in the payload itself.
3. **Expiry enforced payload-side, on every verify** — not just via cookie
   `Max-Age`, which is client-controlled and spoofable. If the verification
   function checks `hmac.Equal(sig, expected)` but never checks an
   embedded `exp` field, an intercepted-but-otherwise-valid cookie replays
   indefinitely.
4. **Secret strength: ≥32 bytes (256 bits) of CSPRNG-generated entropy** —
   same bar as a JWT secret, and the exact real bug already found in this
   suite's own project history (`impulse-review/references/ai-bug-patterns-be.md`'s
   "Seen in production" JWT-secret-length finding applies verbatim to
   HMAC guest-session secrets too). A short/predictable secret is
   brute-forceable offline the moment one valid (payload, signature) pair
   leaks — e.g., via logs.
5. **Rotate the token on privilege escalation** — when a guest converts to
   an authenticated user, invalidate the old guest token rather than
   trusting the client-supplied guest ID going forward.

## Explicit logout revocation — the gap rotation-family invalidation doesn't cover

Refresh-token-family invalidation (above) catches theft-via-reuse, but a
user who explicitly logs out needs their CURRENT, not-yet-reused access
token to stop working immediately — rotation alone doesn't do that, since
the token hasn't been reused yet. Maintain a revoked-`jti` set (Redis, TTL
matching the token's own remaining lifetime so entries self-expire — no
unbounded growth) and check it on every request alongside signature/exp/
aud/iss. This is the standard 2026 pattern precisely because short-lived
access tokens (5-15 min, already this file's own number) make the
revocation-list small and cheap: it only ever needs to hold tokens issued
in the last 15 minutes.
[Token lifetime best practices 2026 — access/refresh/session tokens](https://guptadeepak.com/ciam-compass/guides/token-lifetime-best-practices/)

## Webhook signature verification — the same HMAC mistake, inbound

An inbound webhook (payment provider, CI, SaaS integration) is verified
the same way as the guest-session HMAC above, with two additions specific
to a THIRD PARTY signing the payload, not this service:

1. **Constant-time comparison, always** — `hmac.Equal`/`crypto/subtle` or
   the language equivalent, never `==`/string equality. A naive comparison
   returns false at the first mismatched byte, so response timing leaks
   how many leading bytes were correct — a real, exploitable timing
   side-channel, not a theoretical one.
2. **Sign the timestamp WITH the body, reject stale timestamps.** Stripe's
   shape: the signed string is `${timestamp}.${body}`, not just `${body}`,
   and the receiver rejects anything outside a 5-10 minute tolerance
   window. Without this, a captured valid (signature, body) pair replays
   forever — signature validity alone never expires on its own.
3. **Hash the raw request bytes**, not a re-serialized/parsed-then-
   re-encoded version — whitespace/key-order differences between the raw
   payload and any re-serialization break the signature even when the
   logical content is identical, which shows up as intermittent false
   verification failures, not a clean pass/fail.
[Webhook security guide: HMAC signatures and replay protection](https://www.hooklistener.com/learn/webhook-security-fundamentals)
