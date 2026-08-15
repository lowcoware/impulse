# Deploy — zero-downtime on Compose (no k8s)

The DORA/Accelerate benchmarks this file's defaults implicitly target:
elite performers deploy on demand, lead time under a day, change failure
rate near 5%. The mechanisms below (rolling restart, blue-green, health-
gated rollback) exist because hitting those numbers on a single VPS
without Kubernetes requires the same discipline Kubernetes gives you for
free — nothing here is VPS-specific compromise, it's the same target by
different means.
[Taskade: DORA metrics explained, 2026 benchmarks](https://www.taskade.com/blog/dora-metrics-explained)

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
