# Secrets management — small-team, Docker Compose scale

Full Vault-tier complexity is overkill below roughly 5 services. The
pragmatic middle ground, cheapest to most robust:

| Tier | Fits when | Notes |
|---|---|---|
| `.env` + `.gitignore` | Local dev only | Never production — this is the floor, not a deployment strategy |
| Docker Compose native `secrets:` | Solo/small-team prod baseline | File-mounted, not env-var — env vars leak via `/proc/<pid>/environ` and process listing; file mounts don't |
| SOPS (age/PGP-encrypted, committed to git) | Best middle ground for this project's scale | Git-native, auditable diffs on secret *changes* (not values), no extra running service to operate |
| A lightweight self-hosted manager (e.g. Infisical) | Once rotation-on-schedule and an audit trail actually matter | Itself just another Compose service — don't reach for it before the simpler tiers prove insufficient |

Pick the tier the project's actual scale justifies — jumping straight to a
secrets-manager service for a 2-service solo project is the ladder's
over-engineering direction, same mistake as ABAC-by-default in
`authz.md`.

## Rotation — the reality check

Docker Compose has no built-in rotation mechanism. An application must
either re-read a `*_FILE`-mounted secret on a signal, or be restarted, to
pick up a rotated value. **Stale-credential bugs "after rotation" are
almost always a missed restart/reload step, not a design flaw** — the
secret store updated, the running container didn't.

Reviewable rule: any rotation runbook or script must include an explicit
forced container recreate (`docker compose up -d --force-recreate
<service>`, or equivalent), not just a secret-store write. A rotation
procedure that stops at "update the value in SOPS" is incomplete.

## Detection isn't the bottleneck — remediation is

Scale check on why this file's rules matter, not a scare number for its
own sake: GitGuardian's 2026 report on billions of scanned public commits
found 29M new hardcoded secrets in 2025 alone (34% up year over year), and
— the more important number — 64% of secrets leaked in 2022 were STILL
active in 2026. Scanning tools already catch these; almost nobody rotates
what gets caught. The rule in this file that actually addresses the real
gap is the rotation-runbook one below (a forced restart, not just a
secret-store write) — detection without a completed rotation path is
documentation, not security. Separately relevant to this suite's own
`bug:` catalog: AI-assisted commits showed roughly double the baseline
secret-leak rate of all public commits (3.2% vs. 1.5%) — the exact failure
`impulse-review/references/ai-bug-patterns-be.md`'s hardcoded-secret
finding exists to catch in review before the commit lands, not after.
[The State of Secrets Sprawl 2026, GitGuardian](https://www.gitguardian.com/state-of-secrets-sprawl-report-2026)

## What never changes regardless of tier

1. No secret literal in code, ever — including "just an example"/seed
   data (`impulse-review/references/ai-bug-patterns-be.md`'s hardcoded-secret
   finding).
2. Minimum entropy bar: ≥32 bytes CSPRNG-generated for any HMAC/JWT
   signing secret (`auth.md`) — regardless of which storage tier holds it.
3. `.env.example` in the repo documents which vars exist and their
   meaning, never real values (`impulse-backend`'s day-one baseline already
   requires `.env.example`; this is the same file, same rule, from the
   security angle).
