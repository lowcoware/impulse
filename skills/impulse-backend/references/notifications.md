# Notifications — TG-first, email when it must

## Channel decision

1. **Telegram first** where the user already has the bot: instant, free,
   interactive, zero deliverability risk. Broadcast mechanics + rate
   limits: `telegram.md`.
2. **Email required** for: receipts/invoices (durable off-platform record),
   password reset on email auth, legal notices, users outside the bot.
   TG-centric default: email default-OFF for non-critical types, ON only
   for legally/functionally required ones.
3. **Centralize the transport, not the content.** One module/service owns
   provider creds, retries, suppression list, rate limits; owning services
   keep their templates. Every-service-sends-its-own-SMTP = no unified
   suppression, no single reputation owner — the anti-pattern.

## Provider (2026)

Resend for DX at low volume (3k free/mo) → Postmark when inbox placement
becomes a MEASURED problem (best deliverability, enforces transactional/
marketing split) → SES only when volume cost forces it and someone owns
deliverability. **Self-hosted SMTP = no**: Gmail/Microsoft hard-reject at
SMTP level now, VPS IP pools are pre-flagged on Spamhaus. RU-billing
reality: provider signup/billing may need a foreign-issued card — verify
per provider before committing (sanctions rails, not provider policy).

## Deliverability non-optionals

1. **SPF** (DNS: who may send) + **DKIM** (signature: content untampered,
   domain-tied) + **DMARC** (policy on failure + alignment). All three,
   day one of the sending domain.
2. DMARC progression: `p=none` (monitor reports) → `quarantine` → `reject`.
   Never start at reject blind.
3. Gmail/Yahoo bulk rules (2024+, tightened since): 5k+/day → DMARC
   mandatory, aligned SPF+DKIM, complaint rate <0.3%, RFC 8058 one-click
   unsubscribe on marketing (transactional exempt).
4. **Separate subdomains**: `mail.example.com` transactional,
   `news.example.com` marketing — own DNS records each. Marketing
   complaints must not take password-resets down with them. Don't
   over-fragment at tiny volume though — no history = no reputation.
5. New domain: 7-14 days idle, then ramp gradually. Shared ESP pools skip
   most warm-up — one reason NOT to rush to a dedicated IP.

## Sending craft

1. **Never send in the request path.** Outbox/queue → worker calls the ESP.
   Same transactional-outbox pattern as `events.md` — "DB committed, email
   lost" is the same bug class.
2. **Idempotent send:** dedup key per logical send (Resend supports
   `Idempotency-Key` natively); worker checks before dispatch. Retry ≠
   double-send.
3. **Bounce/complaint webhooks are mandatory wiring:** hard bounce or
   complaint → suppression list immediately, never send again; soft bounce
   → backoff, suppress after N. Sending into bounces is the fastest
   reputation kill.
4. Templates: versioned, central store; Go `html/template` (auto-escapes) /
   Jinja2 autoescape — never string concat. Always `multipart/alternative`
   with a plain-text part.

## Review catches (`bug:`)

1. SMTP/ESP call inside the HTTP handler — blocks response on provider
   latency. → queue.
2. User content unescaped into HTML email or headers — HTML/CRLF injection
   sent from YOUR domain.
3. Marketing mislabeled "transactional" to dodge the unsubscribe link —
   check the message type, not the label.
4. No plain-text MIME part.

## Multi-channel patterns

Engine order: resolve per-user/per-type/per-channel prefs → filter opt-outs
→ quiet-hours hold (security/reset bypasses) → per-user rate limit → digest
batch ("10 new comments", not 10 messages) → dispatch via the central send
path. Preference check happens BEFORE fan-out.

Sources: resend.com/docs idempotency, postmarkapp.com bounce guides,
mailgun suppression docs, dmarcian.com Gmail/Yahoo requirements,
powerdmarc.com self-hosting reality, semgrep.dev email-injection writeup,
microservices.io transactional-outbox.
