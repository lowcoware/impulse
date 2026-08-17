---
name: impulse-devops
description: >
  Deploy/infra: Docker Compose default, k3s canon past a stated
  scale/HA/deploy-frequency threshold (deploy.md decides which; k3s.md
  covers manifest/GitOps once past it). Multi-env Compose, multi-stage
  Dockerfiles, GitHub Actions + GitLab CI/CD with SSH auto-deploy,
  Traefik TLS automation, zero-downtime on a single VPS, pipeline speed
  engineering, DORA/trunk-based shipping, feature-flag ladder. Covers
  env-drift, Compose secrets, cache-breaking COPY order,
  pull_request_target secret exfiltration, fork MR pipeline exposure,
  ACME rate limits, blue-green, volume/cert decay. Triggers:
  "/impulse-devops", "docker compose", "dockerfile", "github actions",
  "gitlab ci", "гитлаб", ".gitlab-ci.yml", "ci/cd", "деплой", "докер",
  "traefik", "ssl/tls сертификат", "zero-downtime", "откат деплоя",
  "пайплайн", "ускорить ci", "feature flag", "фича-флаг", "k3s",
  "kubernetes", "кубернетес".
---

# impulse-devops

Deploy and infra for the blessed stack: Docker Compose multi-env + Traefik +
GitHub Actions. **Kubernetes is not banned — it's gated by a threshold.**
Below it (single prod machine, ≤10 services/env, less-than-daily deploys
without a hard zero-downtime requirement) Compose is canon and this skill
is the whole answer. Past it, **k3s** is canon for prod (`deploy.md` —
"Compose default, k3s past the threshold"); this skill still owns dev
Compose and the Traefik/CI knowledge that carries over, and `k3s.md`
covers the manifest/Helm/kubectl mechanics for the far side of the
threshold. Same anti-overengineering, incident-cited style as impulse-backend.
This skill is the "how to ship it" layer under `impulse-backend`'s baseline
and `observability.md`.

## The one principle

Config that isn't in git, and infra that isn't pruned, both rot silently
until they're an incident. Every rule here pushes config into version control
and makes drift/decay visible before it bites.

## References — load on demand

| File | Covers | Load when |
|---|---|---|
| references/compose.md | multi-env layout, `secrets:`, healthcheck `depends_on`, env-drift trap, digest-pinned images — numbered rules are IDs `DO-CO1`–`DO-CO7` | writing/reviewing Compose files |
| references/dockerfile.md | multi-stage Go/Python, non-root, cache-order, `.dockerignore`, digest pins — IDs `DO-DF1`–`DO-DF5` | writing a Dockerfile |
| references/ci.md | build/test/lint gate, SSH auto-deploy + server-access model comparison, health gate, `pull_request_target` exfil, concurrency groups, SHA-pinned actions, caching stack, 10-min PR budget, runner economics, security-scan stack (trivy/trufflehog/hadolint/lychee), Semgrep diff-aware SAST gate with SARIF + nosemgrep discipline — IDs `DO-CI1`–`DO-CI17` | GitHub Actions workflow |
| references/gitlab-ci.md | `workflow:rules` dedup, `rules:`/`needs:`/`interruptible`, cache-vs-artifacts, DinD buildx (kaniko dead), protected/OIDC variables, fork MR exposure, `resource_group` + manual gates, SSH deploy — IDs `DO-GL1`–`DO-GL12` | GitLab CI pipeline (`.gitlab-ci.yml`) |
| [../../shared/rule-spine.md](../../shared/rule-spine.md) | builder↔review crosswalk: every `DO-*` rule → its detector → the impulse-review tag (`infra:`, or `bug:` for the two security ones) | adding or renumbering a rule in the three files above |
| ../../shared/gitlab-mcp.md | `@zereight/mcp-gitlab` setup, when to use it vs `glab`/raw API | project hosted on GitLab, no MCP tool in the available set yet |
| references/cert-tls.md | Traefik ACME resolvers, challenge types, rate limits, renewal-failure alerting | edge TLS / cert automation |
| references/deploy.md | rolling restart, blue-green on one VPS, migration ordering, rollback, DORA benchmarks, deploy-vs-release + flag ladder, canary honesty, deploy annotations | deploying / a deploy script / shipping-process question |
| references/k3s.md | Helm/Kustomize/raw-manifest decision, manifest hygiene (probes, resource limits, PDB, securityContext, NetworkPolicy), baseline→k8s-primitive mapping, k3s datastore/Traefik/ServiceLB/air-gap specifics, GitOps (ArgoCD/Flux) delivery | past the k3s threshold and writing/reviewing actual manifests |
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
