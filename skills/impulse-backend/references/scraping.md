# Scraping / anti-bot — production patterns

Go/Python scraping infra: chromedp/go-rod, tls-client (bogdanfinn),
Selenium/Playwright, proxy pools (`deps.md`). Core principle, same as the
ladder: **match evasion effort to the target's actual defenses** — a site
with no bot manager needs none of the machinery below.

## Authorized-targets discipline (professional practice, not moralizing)

One line, load-bearing for your own liability: scope to targets you're
authorized to hit, check robots.txt + ToS before building around them, and
know that logged-out public data and logged-in/ToS-accepted data are
materially different legal postures (Meta v. Bright Data 2024 upheld
logged-out public scraping as not barred by ToS; hiQ v. LinkedIn ultimately
went the other way once accepted user-agreement terms were in play; EU adds
GDPR exposure for personal data — Clearview fined €30.5M). This is risk
management for legit freelance/product work, not a refusal.

## TLS fingerprinting

1. A plain Go `net/http` / Python `requests` client emits a static,
   non-randomized JA3/JA4 ClientHello (fixed cipher/extension order) that's
   instantly distinguishable from a real browser — and since Chrome
   randomized its extension order (2023-01-20), a *fixed* order is itself
   the tell. Cloudflare/Akamai/AWS WAF cross-check JA4 against the claimed
   User-Agent: UA says Chrome, JA4 says Go stdlib → instant flag.
2. Reach for tls-client (bogdanfinn, wraps uTLS to mimic named browser
   profiles) or curl-impersonate **only when the target actually checks** —
   403s a plain client immediately, sits behind Cloudflare/Akamai/DataDome/
   Kasada, or is an auth/payment flow. Internal APIs, unprotected sites,
   IP-only rate-limiters → plain `http.Client` + sane headers, cheaper to
   maintain.
3. It's an arms race, not a solved problem: no impersonation profile stays
   valid forever (post-quantum TLS extensions are already shifting
   fingerprints in 2026). Pin the tls-client version, expect to bump the
   profile periodically, treat "the bypass stopped working" as scheduled
   maintenance, not a bug.
4. TLS spoofing is necessary-not-sufficient against layered systems — the
   handshake terminates client-to-origin regardless of proxy, so identical
   TLS across rotated proxies still links sessions; and JS-challenge/
   behavioral layers (DataDome mouse-path scoring, Kasada) aren't touched by
   TLS evasion at all.

## Headless browsers

1. Reach for a browser ONLY when content is client-side JS-rendered. Check
   first: does `curl` + view-source show the data, or an empty shell + XHR?
   If the data is in an XHR/API response, hit that endpoint directly —
   parsing JSON is ~10-30x faster and ~10-20x cheaper than a Chromium
   process (100-500MB RSS each).
2. **Unclosed `browser`/`context`/`page` = the #1 leak.** Real, documented:
   chromedp #552 (websocket-vs-cancel race leaks the run goroutine, pins the
   Browser forever), #1441 (~60KB/s heap growth → 1.5GB+), go-rod #181
   (66GB of orphaned `user-data-dir` temp profiles), #865 (zombie Chrome
   survives `Close()`+`Kill()` — needs OS-level reaping), #748
   (`HijackRequests` leaks even after page close). Rule: every
   `NewContext`/`NewPage` gets a deferred `Close`/`Cancel` in the same
   scope — no "close it later."
3. One-browser-per-request doesn't scale (process spawn is the expensive
   part). Warm pool of long-lived browsers + disposable contexts/pages per
   task (Playwright's one-Browser-many-BrowserContexts model; Apify
   browser-pool *retires* rather than kills — stops assigning, drains
   in-flight, force-kills only on timeout). Cap contexts-per-browser
   (~15-20) and recycle — Chromium leaks over long uptime regardless.
4. Detection beyond TLS: `navigator.webdriver`, injected `cdc_*` vars,
   missing `navigator.plugins`/`window.chrome`, canvas/WebGL hash differing
   headless-Linux vs headed. Stealth patches (puppeteer-extra's 17 evasion
   modules) cover basic-to-mid detectors, do NOT alter TLS/network
   fingerprint or beat behavioral scoring. Reach for CDP-minimal tools
   (nodriver, selenium-driverless) only against proven advanced bot
   management, not by default.

## Proxy pools

1. Datacenter: cheap, fast, easy to blocklist wholesale (noisy neighbors on
   a shared /24 — one flagged IP burns the range). Fine for low-defense
   targets. Residential/mobile: look like real users, expensive, only worth
   it against real anti-bot investment — don't default to residential.
2. Rotate per-request for broad stateless crawls; **sticky sessions** (same
   IP N minutes — Bright Data defaults 10min, extendable to 30) for
   stateful flows (login, pagination, cart) — rotating mid-session is more
   anomalous than not rotating.
3. Track per-proxy health (success rate, latency, consecutive failures) in
   Redis; auto-eject on repeated 403/429/timeout, re-admit on recovery
   (Scrapoxy/easy_proxies do this). Behavior beats count — a small pool
   used with realistic pacing outlasts a huge one hit arrhythmically.
4. Enforce a per-proxy rate ceiling independent of the global pool rate, so
   partial outages don't concentrate load on the survivors and re-trigger
   per-IP limits. Cap concurrent requests per proxy IP at ~1-5.

## Rate-limit yourself

Throttle proactively with jitter — first bans usually come from too-regular
rhythm, not raw volume. On 429: honor `Retry-After` if present (RFC 9110:
delay-seconds or HTTP-date form), else jittered exp backoff (1s/2s/4s...)
capped. On 403: back off harder, treat as a burned identity (new IP/UA/
challenge), not a transient — don't hot-loop retries against a block.
Conservative default for an unknown target: single-digit req/min per
identity, scale up only after observing tolerance. Getting the whole pool
banned — or triggering the target's DDoS mitigation and blocking your
office's shared IP range (a real reported incident) — is the cost of
skipping this.

## AI-typical scraping bugs — reviewer checklist

- **Selector fails silently.** A drifted selector returns nil/empty, not an
  error — job exits 0, data silently missing. Ficstar (1B+ price points/mo):
  "a silent error rate of just 2%... becomes a massive business loss." Fix:
  validate extracted fields (non-empty, expected type), fail loud on
  mismatch — never let empty-but-200 pass as success.
- **No retry on transient failure** — one dead proxy kills the item. Fix:
  bounded retry + backoff, distinguish transient (timeout, reset, 5xx) from
  terminal (404, malformed).
- **One malformed page kills the batch** — unhandled parse exception aborts
  the run. Fix: per-item isolation, catch/log/skip, route the bad record to
  a DLQ and continue (same DLQ discipline as `events.md` §5) — degrade,
  don't crash.
- **Unbounded concurrency** — goroutine-per-item with no cap DoSes the
  target and guarantees a ban (same foot-gun as `ai-bug-patterns-be.md`'s
  unbounded-goroutine, victim is the target here). Fix: worker pool or
  semaphore sized below what the target/pool absorbs.
- **Credentials in code** — proxy-auth (`user:pass@host`), API keys, session
  cookies hardcoded or logged plaintext (crash dumps capture env). Fix:
  secrets manager, redact from logs (`hardening-go.md` logging rule).

## Robustness / monitoring

Job-level "didn't crash" is a weak signal. Track **per-target extraction
success rate** (required fields non-empty, schema matches) as the leading
indicator — success collapses per-target, not uniformly (benchmarks: some
sites ~99%, Shein ~22%, G2 ~37% across providers), so a global average
hides a target that's silently near-zero. Alert on retry-rate creep and
error-rate-by-target before hard failures — rising retries precede outright
blocking (usually means the site changed layout or started blocking).
