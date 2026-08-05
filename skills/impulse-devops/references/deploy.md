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

Sources: [blue-green on Compose+Traefik](https://lours.me/posts/compose-tip-015-blue-green-deployments/) ·
expand-contract: `impulse-backend/references/hardening-go.md`
