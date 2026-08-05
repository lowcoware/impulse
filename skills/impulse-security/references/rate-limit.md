# Rate limiting — layered, keyed right, applied everywhere it matters

## Layered, not either/or

Edge (Traefik, `edge.md`) does coarse per-IP token-bucket throttling —
cheap, blocks obvious floods. Application layer adds per-user/per-API-key
limiting on top, because per-IP alone has two failure modes: false
positives (NAT'd legitimate users sharing one IP) and false negatives
(trivially defeated by proxy rotation). Key by identity where available
(`user_id` or API key), fall back to IP only for genuinely unauthenticated
routes.

## Algorithm choice

Sliding-window-counter is the pragmatic default: fixed-window allows a 2x
burst right at the window boundary (max requests at the end of window N,
then immediately max again at the start of window N+1); sliding-log is
memory-heavy at scale. Token bucket (Traefik's own default, `edge.md`) is
fine at the edge layer specifically. Real production precedent for both
choices, not just theory: Cloudflare runs sliding-window-counter at the
edge (their own reported case: absorbed a 400,000 req/sec single-domain
attack without service degradation) — it's the only approach that pairs
O(1) memory with near-exact accuracy and a smoothed boundary at that
scale. Stripe runs token bucket (GCRA internally) for its own API limits
specifically because bucket allows the bursty batch/retry-storm traffic
shape a payment API's own clients actually produce — the two companies
picked different algorithms because their traffic shapes differ, not
because one algorithm is simply better.
[Digital Applied: API rate-limiting strategies, 2026 engineering reference](https://www.digitalapplied.com/blog/api-rate-limiting-strategies-2026-engineering-reference)

## The mistake that recurs: forgetting the endpoints attackers actually target

Teams reliably rate-limit `/login` and forget `/password-reset`,
`/resend-verification`, `/refresh`, and guest-session-issue endpoints —
exactly the ones with no CAPTCHA and high abuse value (account
enumeration, OTP brute force, mass guest-session minting for downstream
abuse). Documented on HackerOne repeatedly as a real, paid bug class:
missing rate limit on password-reset flows specifically.

**Reviewable rule: every unauthenticated POST/PUT endpoint needs an
explicit rate-limit annotation or middleware application.** Absence should
fail review by default — don't special-case "obviously sensitive"
endpoints as the only ones that need it; the omission pattern is exactly
on the endpoints that don't look sensitive at a glance.

## Bypass techniques worth testing for

1. **Header spoofing** — a rate limiter that trusts a client-supplied
   `X-Forwarded-For` instead of the proxy-verified peer IP lets an
   attacker set an arbitrary header value to reset their own bucket on
   every request. Verify the limiter's IP source matches Traefik's actual
   forwarding depth config (`edge.md`).
2. **GraphQL alias/batching abuse** — one HTTP request containing N
   logical operations (via GraphQL aliasing) evades a request-count-based
   limiter entirely, since the limiter sees "1 request." Any GraphQL
   surface needs query-cost/complexity limiting, not request counting.
