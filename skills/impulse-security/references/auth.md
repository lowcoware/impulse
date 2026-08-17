# Authentication — JWT and HMAC guest sessions

## Passkey (WebAuthn) as the primary login, not a 2FA add-on

For internal tools where the team controls enrollment, passkey-only login
(no password at all) removes password brute-force, password phishing, and
email-based recovery-as-weak-link in one move — the cheapest large
security win available for internal panels. Reference implementation:
Pocket ID (`go-webauthn/webauthn` + `go-jose/v4` for the JWKS/signing
side, Go, certified OIDC), small enough to read end-to-end to see how
token issuance, the JWKS endpoint, and discovery actually fit together —
more useful for understanding this file's JWT rules than a generic
article. Don't build a self-hosted IdP or protocol implementation from
scratch: `go-webauthn/webauthn` (WebAuthn), `go-oidc`/`go-jose` (OIDC/JWT)
on the Go side cover it; for a full IdP with SSO in front of
already-deployed services, see `edge.md`'s `forwardAuth` pattern
(Authelia/authentik) instead of hand-rolling auth into each service.

### Ceremony flow — four calls, two round trips

`go-webauthn/webauthn` exposes registration and login each as a
begin/finish pair; the "ceremony" is just: server hands the browser a
challenge, `navigator.credentials.create()`/`.get()` runs in-browser
against the authenticator, the signed result comes back for verification.

1. `BeginRegistration(user)` → server-generated random challenge + RP info,
   sent to the browser as `PublicKeyCredentialCreationOptions`.
2. Browser calls `navigator.credentials.create(...)`; the authenticator
   (Touch ID, Windows Hello, security key, phone) signs the challenge and
   returns an attestation object + the new public key.
3. `FinishRegistration(user, response)` → verifies the challenge, origin,
   and (if requested) attestation, then hands back a `webauthn.Credential`
   to persist.
4. `BeginLogin(user)` / `FinishLogin(user, response)` mirror the same
   shape for authentication, verifying the assertion signature against
   the stored public key and checking the signature counter.

### RP ID — the pitfall that breaks logins silently

RP ID must be the bare effective domain, no scheme, no port:
`RPID: "example.com"`, `RPOrigins: []string{"https://example.com"}`. A
credential registered under one RP ID never validates under another — the
common failure is setting RP ID to `login.example.com` in dev and
`example.com` in prod, which silently invalidates every credential on
promotion. RP ID must be a registrable domain suffix of the origin: given
origin `https://login.example.com`, valid RP IDs are `login.example.com`
and `example.com`, but not `m.login.example.com` (not a suffix relation)
and not a public suffix like `com`. Pick the broadest RP ID your topology
allows (`example.com`, not a subdomain) up front — narrowing it later
orphans every existing credential.

### Attestation — default to none for internal tools

Attestation conveyance (`none` / `indirect` / `direct` / `enterprise`)
answers "prove this is a genuine YubiKey/Titan/etc.", not "prove this is
the right user" — that's what the signature counter and stored public key
already do. For internal tools where you don't need device-model
provenance, request `none`: it skips a privacy-prompting browser dialog,
avoids running an attestation-format-specific verifier (packed, TPM,
Android SafetyNet/Key, FIDO-U2F, Apple anonymous — one per authenticator
vendor), and is what `go-webauthn` recommends absent a specific compliance
need for device attestation.

### Credential storage schema

Persist the `webauthn.Credential` struct go-webauthn hands back on
registration, not just the public key: credential ID, public key (COSE
format), attestation type, transport hints (`usb`/`nfc`/`ble`/`internal`/
`hybrid`), and — critically — the authenticator's signature counter and
clone-warning flag. Verify and update the signature counter on every
login: a counter that doesn't increase from the last stored value signals
a cloned authenticator (cloned secure-element dump) and should hard-fail
the login, not just warn.

### Discoverable credentials, platform vs roaming, and hybrid/cross-device

- **Discoverable (resident) credentials** let login start with no
  username field at all — the authenticator itself lists which accounts
  it holds a credential for. Enable this (`ResidentKey: "required"` or
  `"preferred"` in the registration options) for a real usernameless flow;
  without it the browser still needs a username to look up which
  credential to challenge.
- **Platform authenticators** (Touch ID, Windows Hello, Android
  fingerprint) are bound to one device and can't be moved off it.
  **Roaming authenticators** (USB/NFC/BLE security keys) work across
  devices by design. Registering only a platform authenticator without a
  second credential is a lockout risk the moment that device is lost.
- **Cross-device / hybrid** (the QR-code flow, formerly "caBLE"): a user
  on a machine with no passkey of their own scans a QR code with a phone
  that holds one, and the phone authenticates over a Bluetooth-brokered
  channel. This is negotiated entirely by the browser/OS — nothing
  server-side to implement — but it's the reason RP ID and origin
  validation must be exactly right; a mismatched RP ID breaks the hybrid
  flow with an opaque browser-side failure, not a server error to debug
  against.

### Fallback and recovery — passkey-only still needs an escape hatch

Passkey-only removes passwords, not the "I lost every enrolled device"
case. Standard shape: require **at least two** enrolled credentials
(covers "lost my laptop" without covering "lost everything"), plus a set
of one-time recovery codes generated at enrollment, shown once, stored
hashed server-side exactly like a password would be. Recovery-code
redemption should re-trigger credential enrollment before the session is
treated as fully trusted, not silently restore full access on a stale
device fingerprint.

## OIDC login must bind to an existing account only on verified email

A third-party OIDC login (Google/GitHub/etc.) that auto-links to an
existing account by email match, without confirming that email is
verified on both sides, lets an attacker register the victim's email with
an arbitrary IdP and take over the existing account — no password guess
needed. Real case: Kaneo shipped exactly this account-takeover shape.
Rule: OIDC-to-existing-account linking requires a confirmed/verified
email on the incoming assertion, checked explicitly, not inferred from
"the IdP returned an email field."

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
4. **Storage:** access token in memory only, refresh token in `httpOnly;
   Secure; SameSite=Strict` cookie. Never localStorage for either — XSS
   reads localStorage; it cannot read an httpOnly cookie. This rule binds
   the frontend consuming the tokens too, whichever skill built it.

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
(cjwt), CVE-2015-9235 (jsonwebtoken). Not a theoretical attack. Newest
addition to the pattern: **CVE-2026-29000** (pac4j-jwt, CVSS 10.0) — the
`JwtAuthenticator` fails to validate the cryptographic signature on
encrypted (JWE) tokens, letting an attacker forge admin tokens from
nothing but the server's own RSA *public* key, the same public-key-as-
trust-anchor confusion as the RS256→HS256 case above, just on the
encryption path instead of the signing path. Fixed in 4.5.9+/5.7.9+/6.3.3+.
A second, distinct library bug in the same 2026 window: **CVE-2026-32597**
(PyJWT < 2.12.0) — the library doesn't enforce RFC 7515 §4.1.11's `crit`
header requirement, so a token declaring critical extensions PyJWT doesn't
understand gets accepted instead of rejected. Pin PyJWT ≥2.12.0.

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
