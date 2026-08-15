# Dependencies

Ladder rungs 3-5: stdlib → platform primitive → blessed dep. Outside the list = one-line justification or no.

## Blessed stack

| Domain | Canon |
|---|---|
| Go | 1.23+ |
| Go HTTP | Gin — the canon, first choice. GoFiber v3 second. Not chi, not echo |
| Go DB | GORM; Squirrel + pgx raw SQL where the ORM fights you |
| Go logging | zap, structured JSON |
| Go config | viper; validate at startup or refuse to boot |
| Go Kafka | segmentio/kafka-go |
| Go RPC | gRPC + protobuf |
| Go WebSocket | gorilla/websocket |
| Go tests | testify, go-sqlmock, miniredis, testcontainers |
| Python | 3.14 — only where it earns it: ML/AI/embeddings, bots, parsers |
| Python HTTP | FastAPI + pydantic v2 + uvicorn |
| Python Telegram bot | aiogram v3, async — see "Telegram bots" in layout.md / boundaries.md |
| Storage | PostgreSQL (+PostGIS, pgvector), Redis, ClickHouse, Qdrant, Neo4j, MinIO, MongoDB |
| Edge | Traefik |
| Deploy | Docker Compose multi-env (dev / prod / observability) |
| CI/CD | GitHub Actions |
| Observability | Prometheus, Grafana, Loki, Alertmanager, Sentry |

Deploy story = Compose + Traefik. Full stop.

## New-dep rule

1. On the list → use it, zero justification.
2. Off the list → one line: what it does that stdlib + blessed + platform primitive can't. Can't write the line → don't add it.
3. Never pull a library for one function — write or copy the function.
4. Pin everything: lockfile committed (`go.sum` / `poetry.lock` or `uv.lock` / `package-lock.json` or `pnpm-lock.yaml` — whichever the repo uses, one, never both). CI runs `govulncheck` / `pip-audit`. Lockfile discipline detail: `../../impulse-dependency-audit/references/supply-chain.md`.

## Python tooling — modern stack, not legacy defaults

| Legacy | Use instead | Why |
|---|---|---|
| `pip install` / `pip freeze` | `uv add` / `uv remove` / `uv sync` | one tool for resolve+install+lock, no manual `pyproject.toml` dependency editing |
| Poetry | `uv` | faster resolver, simpler config, same lockfile discipline |
| `requirements.txt` | PEP 723 inline metadata (standalone scripts) / `pyproject.toml` (projects) | dependency declaration lives with the code it applies to |
| manual `source .venv/bin/activate` | `uv run <cmd>` | no stale-shell-forgot-to-activate class of bug |
| mypy / pyright | `ty` (Astral) | faster; same category of tool, not a different guarantee |
| `[project.optional-dependencies]` for dev tools | `[dependency-groups]` (PEP 735) | dev/test/docs deps don't leak into the installable package's dependency graph |
| pre-commit | `prek` | no Python runtime needed to run the hooks |

Never manage a virtualenv by hand once `uv` is in play — `uv run` resolves
and activates implicitly per-invocation; a hand-activated shell drifts from
the lockfile silently. (Re-expressed from trailofbits/skills `modern-python`,
CC BY-SA 4.0.)

## Platform primitive over app code (rung 4)

Before writing infrastructure code, ask: which platform already does this? Then check this table.

| Need | Use | Never hand-roll |
|---|---|---|
| Uniqueness | Postgres UNIQUE constraint | SELECT-then-INSERT check |
| Integrity, valid values | FK + CHECK constraints, enums | scattered app-level ifs |
| Atomic update | transaction, `UPDATE ... RETURNING` | read-modify-write in app |
| Cache with TTL | Redis SETEX / EXPIRE | map + janitor goroutine |
| Distributed lock | Redis SET NX PX | lock table + polling |
| Lightweight queue | Redis Streams | DB polling table (outbox is the exception) |
| CORS, compression, TLS | Traefik middleware at the edge | per-service middleware copies |
| Rate limit | layered: coarse per-IP at Traefik + per-user/per-key middleware in the app on unauthenticated write endpoints (`impulse-security/references/rate-limit.md` owns) | edge-only ("Traefik handles it") or hand-rolled counters |
| Per-key ordering | Kafka partition key | app-side sequence numbers |
| Consumer scaling | Kafka consumer groups | custom work distribution |
| Duplicate delivery | event_id dedup + committed offsets | bespoke dedup service |

Choosing the primitive with a known ceiling → mark it: `// impulse: <ceiling>, <upgrade trigger>` (see ladder.md).
