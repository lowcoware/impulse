# Infra decay — Compose scale

Infra that isn't actively pruned accumulates cruft invisible until it's an
incident. Same philosophy as `impulse-ai/references/qdrant.md`'s decay section:
scheduled, inspected cleanup — never a blind `-a --volumes -f` reflex.

| Decay mode | Symptom | Fix |
|---|---|---|
| Orphaned named volumes (renamed/removed services) | disk fills silently, many unattached in `docker volume ls` | scheduled `docker volume prune` AFTER manual inspection — never blind on a host with stateful containers |
| Anonymous volumes on stopped hot-spare containers | `docker system prune -a --volumes` deletes data a stopped container still needs | never run `--volumes` on prod without confirming zero stopped containers hold live state (documented case: a prune extended a prod outage by destroying volumes mid-incident) |
| Image bloat from unpinned rebuilds | `docker system df` shows reclaimable GBs, CI disk fills | multi-stage builds + scheduled `docker image prune -f` (not `-a`) |
| Cert-expiry blind spot | renewal silently fails, noticed at browser warning | days-to-expiry alerting, not renewal-log-error alerting (`cert-tls.md`) |
| `.env` drift between dev/prod | works dev, breaks prod (or vice versa) | commit `.env.example`, diff its key set (not values) against both real files in CI |

Volumes are never auto-pruned — Docker won't destroy data by default, which
is exactly why they accumulate. The fix is a reviewed schedule, not a
reflex flag.

Source: [Docker pruning docs](https://docs.docker.com/engine/manage-resources/pruning/)
