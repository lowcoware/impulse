# Privacy / PII engineering

Engineering practice, not legal advice. GDPR + RU 152-ФЗ awareness for a
RU+international user base.

## PII in logs — the #1 leak

1. **The leak is upstream of your crypto.** Facebook 2019 (plaintext
   passwords in internal logs since 2012, searchable by ~20k employees,
   €91M fine) and Twitter 2018 (passwords logged BEFORE the bcrypt step,
   336M users) were both debug/telemetry paths running before
   hashing/redaction. Audit log calls that sit before the crypto, not
   after.
2. Go/zap: redact at the TYPE level — `zapcore.ObjectMarshaler` on
   PII-carrying structs, omit/hash in `MarshalLogObject`. Encoder-level
   redaction misses `.With()` fields; `zap.Any`/`%+v` struct dumps are the
   review catch. Never build long-lived child loggers `.With(email)`.
3. Python: `logging.Filter` / structlog PROCESSOR (works on the dict
   pre-render) — not post-hoc regex on rendered strings.
4. Sensitive-by-default in logs: emails, phones, tokens/JWTs, raw request
   bodies, session IDs, **IPs** (GDPR: PII per CJEU Breyer), **TG user_id +
   username + names**. TG user_id is a stable permanent identifier — and
   high-cardinality: PII + label-explosion double-hit in Loki/Prometheus
   (`observability.md`).

## PII in Kafka events

Events are immutable and replayed — PII produced into a topic lives there
past any "delete".

1. **Default: reference-by-ID.** Event carries `user_id`; consumer fetches
   fresh PII from the owning service at read time.
2. PII must ride the payload → **crypto-shredding**: per-user DEK encrypts
   PII fields, KEK in the secrets tier wraps DEKs; erasure = destroy the
   DEK — event stays, becomes unreadable. The GDPR-erasure answer for
   append-only logs.
3. Short `retention.ms` on raw PII-bearing topics, long retention only on
   derived/aggregate topics with no PII. Compaction tombstones exist but
   are eventual, not an SLA.
4. Erasure fan-out: `user.deletion.requested` event → each consuming
   service runs its own cleanup. No central delete-everything god-service.

## Schema minimization

1. Split `users` (id, role, settings) from `users_pii` (email, phone,
   name). Most queries, replicas, analytics, and backups never touch PII.
2. Column encryption: pgcrypto when DB-admin trust is fine; app-level
   (encrypt before it reaches PG) when even DBAs must not read — cost:
   no server-side index/search on that column; add a deterministic
   `email_hash` column for equality lookups.
3. Don't collect "just in case" — every PII column is a future breach line
   item.

## Right-to-delete

1. Soft delete does NOT satisfy erasure. Practical pattern: kill
   sessions → irreversibly **anonymize in place** (null/hash the PII
   columns, keep the row + non-identifying aggregates for accounting).
   Cheaper and safer than cascading hard delete across FKs.
2. Backups: you can't scrub one user from old backups at sane cost —
   **retention-based expiry IS the designed answer** (30-90 days, then
   deletion catches up). Say so in the privacy policy.
3. TG bots are on the hook for access/deletion requests within 30 days
   (Telegram bot ToS). Build the delete-my-data path before it's needed.

## Retention as code

Explicit table `{table/topic: TTL, rationale}` in config, enforced by
infra where possible (Kafka `retention.ms`, Loki compactor per-stream
limits) over app-cron — infra config survives app bugs. Typical: raw
events 30d, app logs 14-30d, audit 1y, users_pii until deletion request.

**152-ФЗ one-liner:** RU citizens' PII must have its PRIMARY
record/storage in a DB physically in Russia (cross-border copies after,
with conditions). Engineering implication: RU-region primary for the
users_pii-equivalent — server location is a compliance decision, not just
a latency one.

## Access

1. Least-privilege roles: `svc_app` gets NO grants on PII columns it
   doesn't need. PG trap: table-level GRANT + column-level REVOKE does
   NOT work — grant column-level from the start.
2. Audit PII reads (who/when/which row) separately from app logs —
   pgaudit or an app-level audit table. Turn on before the incident.
3. **Prod dump → staging = incident.** Anonymize BEFORE the dump leaves
   prod (`postgresql_anonymizer` declarative masking / gonymizer).
   Deterministic masking (same input → same masked value everywhere) or
   joins break in staging.

Sources: krebsonsecurity.com Facebook 2019, bleepingcomputer Twitter 2018,
conduktor.io crypto-shredding, opencredo Kafka-GDPR, postgresql.org
encryption-options + GRANT docs, postgresql-anonymizer docs, securiti.ai
152-FZ, telegram.org/tos/bots, CJEU C-582/14.
