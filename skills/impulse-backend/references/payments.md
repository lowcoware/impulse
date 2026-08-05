# Payments — webhooks, idempotency, money, Stars/YooKassa

Money is a carve-out (`ladder.md`): nothing here gets simplified away.
RU-specific providers (T-Bank/Sber/СБП, Platega/WATA/Lava и др., 54-ФЗ):
`payments-ru.md`.

## Webhook handling — the trust boundary

1. **Verify the signature with the provider SDK**, never hand-rolled.
   Hand-rolls ship real CVEs: Paddle timing side-channel (Ruby `==` compare),
   CVE-2026-47212 (Symfony Twilio handler never read the HMAC header at all),
   CVE-2025-53548 (Clerk SDK: insufficient verification — accepted events lacking signatures).
2. **Raw body bytes for the HMAC** — framework JSON middleware re-serializes
   and breaks the signature. Capture before any parser.
3. Reject events older than ~300s (replay window). Rotating the signing
   secret → accept old+new during cutover or you drop live events.
4. **At-least-once + out-of-order is the contract.** Stripe retries 72h,
   YooKassa 24h, CryptoBot 17 attempts/3 days. Dedup on `event_id` with a
   UNIQUE constraint; guard transitions with a state machine that rejects
   backward moves (`pending` after `succeeded` = ignore).
5. **Dedup record + business side effect in ONE transaction** — separate
   writes + crash between = double fulfillment on retry.
6. Handler: verify → enqueue → 200 immediately. Slow work (email, delivery)
   in the worker, not inline — provider retry storms punish slow handlers.
7. **Webhook is the source of truth; redirect/`return_url` is UI only.**
   Real bypass: backend marked orders Confirmed on a hand-crafted POST to
   `/success` with $0 paid. The redirect handler reads and displays — never
   mutates to "paid".
8. **Recompute the amount server-side** from cart/DB. Client-supplied price
   in the charge payload = classic price-tampering, rich bug-bounty genre.

## Idempotency keys on charge creation

1. Key generated at the ORIGINATING call site (client/order id), sent on
   EVERY mutating payment request. Server-regenerated key after a timeout
   retry bypasses dedup entirely — the whole point lost.
2. Timeout after the request reached the provider → retry with the SAME
   key → provider returns the cached first result. Charged once.
3. Provider keys expire (~24h Stripe) — idempotency is a retry-window
   guard, not a permanent lock.

## Money representation

1. **int64 minor units** (1050 = $10.50). Float = banned everywhere in the
   pipeline, including one JSON round-trip through a float field.
2. Fractional-cent precision (FX, tax) → `NUMERIC` in PG,
   `shopspring/decimal` (Go), `decimal.Decimal` (Python).
3. Amount + currency code travel together across every boundary — bare int
   invites cross-currency arithmetic.

## Business-logic abuse — distinct from input-trust

The "never trust a client-sent price/plan" rule elsewhere in this file is
about input TRUST; this is about state ABUSE via a sequence of
individually legitimate-looking actions. Check for, at minimum: negative
amounts accepted anywhere in a discount/refund path, unbounded
coupon/discount stacking (no cap on how many promo codes apply to one
order), restarting an already-consumed free trial (a new trial keyed off
something the user controls — a new email, a re-signup — instead of an
identity that survives account deletion/recreation), self-referral loops
(referring an account the same person controls), and coupon reuse across
multiple accounts controlled by the same actor. None of these look like
an attack in a request log — each individual action is a normal API
call — the abuse is only visible in the sequence/aggregate.

## Ledger, not status column

1. Append-only payment events; mutable `status` on the order row is a
   derived projection (fold over events), rebuildable. Corrections = new
   compensating entries, never row edits.
2. **Reconcile on schedule** against the provider's payout/report API —
   webhooks alone drift (timing, fragmentation, missed deliveries). A cron
   comparing ledger vs provider report is the day-two must.

## Telegram payments

1. **Stars (XTR) is MANDATORY for digital goods in bots.**
   `provider_token=""`, one `LabeledPrice`, currency `XTR`. Physical goods =
   classic provider-token flow (YooKassa/Stripe via BotFather) — different
   code path, don't conflate.
2. **`pre_checkout_query` = 10-second hard window.** Answer fast, inventory
   check inline, everything slow after `successful_payment`.
3. Dedup key = `telegram_payment_charge_id` (treat `successful_payment`
   like any webhook — defensively). `payload` carries your order id for
   correlation but is client-replayable — never auth by payload alone.
4. Refund: `refundStarPayment(user_id, charge_id)`; handle
   `CHARGE_ALREADY_REFUNDED` — safe against double-refund.
5. aiogram ≥3.7: `@router.pre_checkout_query()` +
   `@router.message(F.successful_payment)`.

## YooKassa / CryptoBot (RU rails)

1. YooKassa: `Idempotence-Key` header REQUIRED on every POST/DELETE (≤64
   chars). **No webhook signature** — verification = source-IP allowlist +
   fetch-before-process: on notification call `GET /payments/{id}` and
   trust THAT, not the body. Respond 200 or it retries 24h.
2. YooKassa `return_url` is UI-only across all confirmation flows
   (redirect/widget/QR) — same rule 7 above.
3. CryptoBot (Crypto Pay API): the de-facto TG crypto rail (USDT/TON …).
   Verify `crypto-pay-api-signature` against raw body via SDK helper +
   secret path segment in the webhook URL as depth.

## Keys and modes

1. Payment keys = top-tier secrets (`impulse-security/references/secrets.md`). Leaked
   Stripe keys get scraped from public repos in minutes (GHSA-x3m6-5hmf-5x3w);
   provider does NOT auto-block a leaked key — rotate immediately.
2. Test/live keys are non-interchangeable and live in separate env paths
   per environment. Never one `.env` for staging+prod.
3. Hosted checkout (Stripe Checkout / YooKassa widget) keeps you in PCI
   SAQ A — never touch raw card data; that's the whole design constraint.

Sources: docs.stripe.com webhooks + idempotent_requests, stripe.com/blog/
idempotency, brandur.org/idempotency-keys, moderntreasury.com (floats,
ledger), core.telegram.org/bots/payments-stars, mastergroosha aiogram-3
payments guide, yookassa.ru/developers webhooks, help.send.tg Crypto Pay,
svix.com webhook-ordering, CVE-2025-53548 / CVE-2026-47212.
