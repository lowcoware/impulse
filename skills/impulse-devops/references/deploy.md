# Deploy — zero-downtime on Compose, and when that stops being the answer

The DORA/Accelerate benchmarks this file's defaults implicitly target:
elite performers deploy on demand, lead time under a day, change failure
rate near 5%. The mechanisms below (rolling restart, blue-green, health-
gated rollback) exist because hitting those numbers on a single VPS
without Kubernetes requires the same discipline Kubernetes gives you for
free — below the threshold in the next section, nothing here is
VPS-specific compromise, it's the same target by different means.
[Taskade: DORA metrics explained, 2026 benchmarks](https://www.taskade.com/blog/dora-metrics-explained)

## Compose is the default, not a lifetime ban on Kubernetes

Revised position: "Kubernetes is never used" is wrong. What's true is
narrower — Compose wins below a threshold, and past it the cost of NOT
having orchestration exceeds the cost of running it. The threshold is
numbers, not a vibe:

- more than one machine in prod, or a requirement to survive a machine
  dying
- more than ~10 services in one environment
- deploys more often than once a day, with zero-downtime no longer
  optional

Below that line, Compose is not a compromise — it does local/single-node
deploy faster and simpler than any cluster, and stays the dev-environment
answer forever regardless of what prod runs.

**Past the line, k3s is canon, not full Kubernetes.** One binary under
100MB, one systemd unit, `curl … | sh` to a working node in a minute — the
jump is "install one more service," not "operate a cluster." It ships
Traefik as its default ingress, so the edge/TLS knowledge in this skill
transfers directly (Compose labels → `IngressRoute`, not a rewrite from
scratch); single-node storage is SQLite, multi-node is embedded etcd, so
there's no separate etcd cluster to stand up first. What it buys that
Compose structurally cannot: health-gated rolling update, automatic
reschedule of a service when a node dies, replicas across nodes, secrets
as an RBAC'd resource, node drain for maintenance without downtime,
resource limits with eviction. (Docker Swarm was considered as a
lower-cost middle step — same daemon, same file format, gets you
rolling-update/replicas/rollback without a new system — and rejected: it's
effectively frozen upstream, and the operational knowledge doesn't
transfer anywhere past Swarm itself. Paying once for k3s beats paying
for Swarm and then a cluster anyway.)

Real costs past the line, so this isn't a free upgrade: manifests replace
the compose file and Helm/Kustomize become mandatory almost immediately
(bare YAML duplicated per environment doesn't scale); network debugging
gains a Service/CNI/CoreDNS hop, so "name doesn't resolve" goes from a
10-minute check to an evening; **Kubernetes `Secret` is base64, not
encryption** — anyone with namespace + etcd-backup access reads it in
plaintext, so SOPS/sealed-secrets/an external manager becomes mandatory
where Compose's file-mounted `secrets:` was already adequate
(`impulse-security/references/secrets.md`); backups gain a second
required object — an etcd snapshot or the SQLite file — with the same
proven-restore bar as `backup.md` already sets for the database; and a
single k3s node is convenience and forward-prep, not HA — a node dying is
still a product outage until there's a second node.

This skill's Compose rules (`compose.md`, `ci.md`, `cert-tls.md`) stop
being the deploy mechanism once the threshold is crossed, but don't stop
being useful — dev still runs Compose, and Traefik/CI/backup discipline
transfers in spirit even where the YAML shape changes. Manifest/Helm/
kubectl mechanics for the far side of the threshold are covered in
`k3s.md`: Helm/Kustomize/raw-manifest choice, manifest hygiene (probes,
resource limits, PodDisruptionBudget, securityContext, NetworkPolicy),
how this skill's health/shutdown/logging baseline maps onto k8s
primitives, k3s-specific datastore/Traefik/ServiceLB/air-gap behavior,
and GitOps (ArgoCD/Flux) as the delivery mechanism.

1. **Never `docker compose down && up -d` as a deploy script.** It drops all
   containers before starting new ones — a guaranteed downtime window even
   for a one-line change.
2. **Rolling restart:** `docker compose up -d --no-deps --build <service>`;
   Traefik's healthcheck on the container keeps the old instance in rotation
   until the new one passes. The single-VPS approximation of zero-downtime.
3. **Blue-green on one VPS:** two service names (`api-blue`/`api-green`)
   behind one Traefik router; bring up the idle color, wait for health, flip
   the router's target label, then stop the old color. Full pre-cutover
   smoke-test; rollback = flip the label back — the old color was never
   touched, so it's atomic, not a redeploy. Real cost: double resource
   footprint for the overlap window (a single VPS needs headroom for two
   full app instances, briefly) — rolling restart (step 2) stays operationally
   lighter but leans harder on rollout discipline (health checks actually
   gating traffic) since there's no untouched old environment to flip back to.
   [Unleash: blue-green vs rolling, infra cost vs rollback speed](https://www.getunleash.io/blog/blue-green-deployment-vs-rolling-deployment)
4. **Migration ordering:** DB migrations run BEFORE new app containers start,
   and must be additive-only per deploy (expand-contract,
   `impulse-backend/references/hardening-go.md`) — old and new app code both run
   against the same schema during the cutover window.
5. **Rollback = redeploy the last-known-good image tag** (pin in `.env`/
   compose, `up -d` again), not `git revert` + rebuild — a rebuild is slow
   and can pull a different dependency snapshot than what was actually
   running.

## How elite teams ship — what transfers to one VPS

DORA 2024 numbers, concrete: elites deploy on demand (multiple/day), lead
time <1 day, change failure rate ~5%, failed-deploy recovery <1 hour —
182x the deploy frequency and 2,293x the recovery speed of low
performers. The achievable no-k8s version: merge → prod same day, <1 in
20 deploys needs fixing, rollback in minutes — all reachable with the
mechanics above. What the reports correlate with elite: small batches
(work completable in hours-days — the cheapest lever, nothing to buy),
loosely coupled architecture, robust automated tests. 2025 caveat:
AI-generated code volume tempts big batches; throughput up + failure
rate up is a warning, not a win.

- **Deploy ≠ release.** Deployment is the engineering event, release the
  business event — a feature flag dormant-wraps unfinished code so trunk
  is always shippable (trunk-based: branches live <1 day, <3 active).
  Flag ladder, first rung that holds: env-var/config boolean (enough
  until per-user targeting or non-deploy toggling is needed) → DB-backed
  flag table → self-hosted flag service (Unleash/Flagsmith in Compose)
  only at percentage rollouts / a UI need. Every rung keeps the expiry
  discipline: flags get an owner + expiration at creation, release flags
  die within ~30-40 days; kill switches are the one permanent class.
  Flag debt compounds silently otherwise.
- **Canary on one VPS: feasible, often not meaningful.** Traefik weighted
  round-robin splits traffic between old/new containers by label-declared
  weights — works. Honest caveat: at single-VPS traffic volume a 5%
  canary sees too few requests to be statistically meaningful; staging
  with prod parity + a short monitored prod bake usually beats it. The
  transferable part of auto-rollback (Flagger-style): a post-deploy CI
  step watching error rate/p99 for N minutes and flipping Traefik back —
  the thresholds (error rate +1pp, p99 +20%) transfer verbatim, the
  controller doesn't.
- **Friday freezes are mostly cargo cult.** DORA data: deploy frequency
  correlates with LOWER change-failure rate; a freeze batches Friday work
  into a riskier Monday. A freeze is a symptom of weak rollback
  confidence — fix rollback (step 5 above), keep "deploy only when
  someone's around for 30 min after" instead.
- **Mark every deploy in the observability stack.** One curl to Grafana's
  annotation API + `sentry-cli releases` in the deploy script — under
  incident pressure nobody correlates timestamps by hand. Pairs with:
  the author deploys their own change and watches the dashboards they
  just annotated.
- **Anti-patterns elite teams left behind:** long-lived release branches,
  manual QA sign-off on every deploy (a human gate is a queue, not a
  safety net), snowflake deploy scripts outside version control,
  big-batch "release days", freezes as a rollback substitute.

Sources: [blue-green on Compose+Traefik](https://lours.me/posts/compose-tip-015-blue-green-deployments/) ·
expand-contract: `impulse-backend/references/hardening-go.md` ·
[DORA 2024 report](https://dora.dev/research/2024/dora-report/) ·
[DORA: trunk-based development](https://dora.dev/capabilities/trunk-based-development/) ·
[DORA: small batches](https://dora.dev/capabilities/working-in-small-batches/) ·
[Unleash: flag best practices](https://docs.getunleash.io/guides/feature-flag-best-practices) ·
[Traefik canary via WRR](https://iximiuz.com/en/posts/traefik-canary-deployments-with-weighted-load-balancing/) ·
[charity.wtf on Friday freezes](https://charity.wtf/p/friday-deploy-freezes-are-exactly-like-murdering-puppies) ·
[Shopify merge queue](https://shopify.engineering/introducing-the-merge-queue)
