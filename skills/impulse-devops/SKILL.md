---
name: impulse-devops
description: >
  Deploy/infra for stacks WITHOUT Kubernetes: Docker Compose multi-env,
  multi-stage Dockerfiles, GitHub Actions CI/CD with SSH auto-deploy,
  Traefik edge/TLS cert automation, zero-downtime on a single VPS. Covers
  env-drift, Compose secrets, cache-breaking COPY order,
  pull_request_target secret exfiltration, ACME rate limits, blue-green,
  volume/cert decay. Triggers: "/impulse-devops", "docker compose", "dockerfile",
  "github actions", "ci/cd", "деплой", "докер", "traefik", "ssl/tls
  сертификат", "zero-downtime", "откат деплоя", "пайплайн", "без кубернетеса".
---

# impulse-devops

Deploy and infra for the blessed stack: Docker Compose multi-env + Traefik +
GitHub Actions, no Kubernetes (banned). Same
anti-overengineering, incident-cited style as impulse-backend. This skill is the
"how to ship it" layer under `impulse-backend`'s baseline and `observability.md`.

## The one principle

Config that isn't in git, and infra that isn't pruned, both rot silently
until they're an incident. Every rule here pushes config into version control
and makes drift/decay visible before it bites.

## References — load on demand

| File | Covers | Load when |
|---|---|---|
| references/compose.md | multi-env layout, `secrets:`, healthcheck `depends_on`, env-drift trap — numbered rules are IDs `DO-CO1`–`DO-CO5` | writing/reviewing Compose files |
| references/dockerfile.md | multi-stage Go/Python, non-root, cache-order, `.dockerignore`, digest pins — IDs `DO-DF1`–`DO-DF5` | writing a Dockerfile |
| references/ci.md | build/test/lint gate, SSH auto-deploy, health gate, `pull_request_target` exfil footgun — IDs `DO-CI1`–`DO-CI7` | GitHub Actions workflow |
| [../../shared/rule-spine.md](../../shared/rule-spine.md) | builder↔review crosswalk: every `DO-*` rule → its detector → the impulse-review tag (`infra:`, or `bug:` for the two security ones) | adding or renumbering a rule in the three files above |
| ../../shared/gitlab-mcp.md | `@zereight/mcp-gitlab` setup, when to use it vs `glab`/raw API | project hosted on GitLab, no MCP tool in the available set yet |
| references/cert-tls.md | Traefik ACME resolvers, challenge types, rate limits, renewal-failure alerting | edge TLS / cert automation |
| references/deploy.md | rolling restart, blue-green on one VPS, migration ordering, rollback | deploying / a deploy script |
| references/decay.md | orphaned volumes, image bloat, cert-expiry blind spots, `.env` drift | periodic infra hygiene |
| references/incident.md | prod outage: mitigate-first (rollback/flag), blast-radius, RCA handoff, blameless post-mortem | prod is down or degraded |
| references/backup.md | RPO/RTO tiers, pg_dump vs WAL-G, restore drills, per-store methods, live-volume trap, dead-man's-switch monitoring | setting up or auditing backups |
| references/loadtest.md | k6 thresholds/executors, coordinated omission, finding the knee, DB-pool-first bottleneck, CI wiring | load testing / capacity question |
| [../../shared/context7.md](../../shared/context7.md) | Traefik label/ACME/GH Actions syntax before writing against it — version drift past training cutoff | unfamiliar Traefik middleware or Actions syntax |

## Boundaries

- Secret *storage* tiers (`.env` → Compose `secrets:` → SOPS → manager) →
  `impulse-security/references/secrets.md`. This skill owns the *wiring flow*
  (GH secret → container), that one owns which tier for which sensitivity.
- Traefik rate-limit/CORS/header middleware + Traefik CVEs →
  `impulse-security/references/edge.md`. This skill owns cert automation +
  routing labels.
- Observability stack wiring → `impulse-backend/references/observability.md`.
- Reviewing a Compose/Dockerfile/workflow diff → `impulse-review`'s `infra:`
  tag, which cites the `DO-*` IDs back to the three references here.
- Zero-downtime DB migration mechanics → `impulse-backend/references/hardening-go.md`
  (expand-contract); this skill owns the deploy-ordering around it.
- "stop impulse" / "normal mode": revert to default behavior.
