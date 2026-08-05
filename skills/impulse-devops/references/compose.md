# Docker Compose — multi-env

1. **Layout:** base `docker-compose.yml` + `docker-compose.prod.yml` override
   + `docker-compose.observability.yml` overlay, combined via
   `-f base -f prod -f observability`. Later files merge into earlier (arrays
   concat, scalars replace) — verify the result with `docker compose config`
   before trusting it.
2. **One `env_file:` per service per env** (`.env.dev`, `.env.prod`), never
   one shared `.env` sourced by both. **Env-drift trap:** the root `.env`
   only feeds `${VAR}` interpolation *inside* the compose file, not the
   container — `env_file:` is what injects into the container, and a var in
   dev's file but missing from prod's silently resolves to empty (no error),
   not a failure. Precedence: `environment:` > shell env > `env_file:` >
   image default.
3. **Secrets** via top-level `secrets:` (file source) mounted at
   `/run/secrets/<name>`, never `environment:` for credentials — env vars
   leak via `docker inspect`, process listing, and crash logs; secret files
   don't. App reads the path via a `*_FILE` convention. Which tier (Compose
   secret vs SOPS vs manager) → `impulse-security/references/secrets.md`.
4. **`depends_on: {condition: service_healthy}`** on every DB/cache
   dependency, backed by a real `healthcheck:` (`pg_isready`, not `sleep`).
   Plain `depends_on` waits only for "started," not "ready" — the classic
   race where the app connects to Postgres before it accepts connections.
   Set `start_period` on slow-booting services or `retries` exhausts during
   normal cold start and Compose marks it permanently unhealthy.
5. Named volumes + named networks declared explicitly, never anonymous —
   anonymous volumes survive `docker compose down` and orphan silently
   (`decay.md`). Connect the observability overlay via a shared
   `external: true` network so neither stack owns the other's lifecycle.

```yaml
# docker-compose.prod.yml
services:
  api:
    env_file: .env.prod
    secrets: [db_password]
    depends_on:
      db: {condition: service_healthy}
  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 30s
secrets:
  db_password:
    file: ./secrets/db_password.txt   # 0400, gitignored, never committed
```

Sources: [Compose multi-file merge](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/) ·
[Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/) ·
[Compose startup order / healthcheck](https://docs.docker.com/compose/how-tos/startup-order/)
