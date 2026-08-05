# Telegram platform — Mini Apps auth, webhooks, limits, media

Production depth beyond `hardening-python.md`'s aiogram section (poller
uniqueness, 60s webhook timeout, flood-control middleware live there — not
repeated here). Bot layout: `layout.md`.

## Mini App initData validation — the auth trust boundary

initData is the Mini App's credential. Validate SERVER-side, always.

1. **The scheme (exact):** `secret = HMAC_SHA256(key="WebAppData",
   msg=bot_token)`; data-check-string = all fields except `hash`, sorted
   alphabetically, joined as `key=value\n`; expected =
   `HMAC_SHA256(secret, dcs).hex()`. Compare with `hmac.compare_digest`
   (Go: `hmac.Equal`) — never `==`.
2. **Check `auth_date` freshness.** Telegram publishes no TTL — pick one
   (~1h common) and reject older. Skipped check = stolen initData replays
   forever.
3. **Client-side-only validation = no validation.** The classic bug: verify
   in the Mini App JS, backend trusts the parsed user blindly.
4. **Login Widget is a DIFFERENT scheme.** Website login uses
   `secret = SHA256(bot_token)` — single hash, no "WebAppData" constant.
   Same dcs shape, different secret derivation. Mixing the two = every
   validation silently fails (or worse, you copy the weaker one).
5. **Third-party Ed25519 scheme** (validate without owning the bot token):
   exclude `hash`+`signature`, prepend `"{bot_id}:WebAppData\n"`, verify
   against Telegram's published Ed25519 public key. For when a service that
   isn't the bot needs to trust initData.
6. **Session flow:** frontend sends raw initData once (`Authorization: tma
   <initData>` convention) → backend validates → issues its own short-lived
   session token. Per-request re-validation is also fine (HMAC is cheap) —
   pick one, don't mix.

```python
def verify(init_data: str, bot_token: str) -> bool:
    parsed = dict(parse_qsl(init_data))
    hash_ = parsed.pop("hash", None)
    dcs = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calc = hmac.new(secret, dcs.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(calc, hash_ or "") \
        and (time.time() - int(parsed["auth_date"])) < 3600
```

## Webhook vs polling

1. Polling = one process per token, fine to start. Webhook when you need
   throughput or the bot must not miss updates during redeploys.
2. Webhook endpoint is PUBLIC — set `secret_token` on `setWebhook`, verify
   the `X-Telegram-Bot-Api-Secret-Token` header on every delivery (aiogram
   `SimpleRequestHandler(..., secret_token=...)` does it). Plus firewall/
   proxy allowlist — header alone is defense, not the only layer.
3. `allowed_updates` whitelist (`["message","callback_query"]`) — cuts
   payload volume and dead dispatch. `max_connections` (default 40) caps
   concurrent load on your box.
4. **Failed-delivery reality:** Telegram retries with backoff, buffers
   updates ~24h, then DROPS them; after sustained failure it stops posting
   until you `setWebhook` again. Extended downtime = permanent message
   loss — alert on webhook-error growth (`getWebhookInfo`).

## Rate limits + broadcast

1. Reality: ~30 msg/s global, ~1 msg/s sustained per chat, ~20 msg/min per
   group. On 429 sleep exactly `retry_after`, then retry — hammering through
   429s is what escalates throttling.
2. **Broadcast to N thousand users = queue + pacing worker.** Push user IDs
   to Redis/queue, worker sends at ≤25/s, catches `TelegramRetryAfter` →
   requeue with delay. Never a tight `for` loop over users. Track blocked
   users (403) and stop sending to them — user complaints, not rate limits,
   are what get bots restricted.
3. Bots can't message a user who never started them — broadcast lists are
   opt-in by construction; don't fight it.
4. `callback_data` hard cap = 64 BYTES — encode an ID and look the rest up
   server-side; stuffing state into it truncates silently on long values.

## Token leakage

1. Public-repo scans find 1000+ live bot tokens; with webhook unset a leaked
   token gives `getUpdates` — the attacker reads the pending queue (OTPs,
   support messages) and can SEND as the bot (phishing with your identity).
2. Token = prod secret: env/secrets tier (`impulse-security/references/secrets.md`), never
   in logs (OpenClaw CVE-2026-27003 was exactly token-in-logs), never in
   error traces. Scannable shape for pre-commit/secret-scanners:
   `\d{8,10}:[A-Za-z0-9_-]{35}`. Compromise → BotFather `/revoke`
   immediately, then redeploy.

## Media

1. **`file_id` is reusable** — store it, resend by id, never re-upload the
   same file. Bot-scoped: one bot's file_id is useless to another.
2. Cloud Bot API caps: 20MB download (`getFile`) / 50MB upload. Bigger →
   self-host local Bot API server (tdlib/telegram-bot-api): 2GB both ways,
   `getFile` returns a local path, webhooks may be plain HTTP.
3. Don't proxy media through your app when MinIO presigned covers it
   (`stores-minio.md`) — same bandwidth-bottleneck rule.

Sources: core.telegram.org/bots/api + /widgets/login,
docs.telegram-mini-apps.com/platform/init-data, docs.aiogram.dev
(middlewares/webhook/storages), gramio.dev/rate-limits,
gitguardian.com/remediation/telegram-bot-token, GHSA-chf7-jq6g-qrwv.
