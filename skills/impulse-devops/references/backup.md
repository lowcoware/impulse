# Backup / DR — Compose on VPS

An untested backup is a hope, not a backup. Canonical incident: GitLab 2017 —
five backup mechanisms (pg_dump→S3, replication, Azure snapshots, LVM,
manual), only a stale 6h LVM snapshot was usable. pg_dump silently failed for
WEEKS (client 9.2 vs server 9.6, error never alerted), alert emails were
dropped by DMARC. Root cause across all five: never restore-tested, never
monitored for silence.

Not an isolated horror story: industry-wide, 82% of disaster-recovery
setups are never tested, and among the ones that ARE tested, restore
attempts still only meet the desired outcome roughly 61% of the time — the
gap between "a backup exists" and "the backup actually restores" is the
default state, not the exception. Organizations that skip testing entirely
find out the hard way: 30-40% of never-tested orgs discover the failure
only during a real disaster, when there's no second chance. This is the
actual argument for the restore-drill rule below being non-negotiable
rather than a nice-to-have — the base rate of untested backups quietly
failing is high enough that "we have backups" and "we can recover" are
different claims until proven otherwise.
[Kaseya: why untested backups fail, industry statistics](https://www.kaseya.com/blog/backup-testing/)

## RPO/RTO first — numbers before tools

Write them down; schedule follows from RPO, method from RTO.

| Tier | Data | RPO / RTO | Method |
|---|---|---|---|
| 1 | revenue/state Postgres | 15min-4h / 1-4h | WAL-G/pgBackRest continuous archiving |
| 2 | analytics (ClickHouse/Mongo) | 4-24h / same-day | nightly dump |
| 3 | rebuildable (Redis cache, Qdrant index from source) | rebuild, don't restore | none — document the rebuild path |

## Postgres

1. **pg_dump is enough** up to ~50-100GB / RPO ≥ 1h: cron + `docker exec`.
   Need PITR or RPO < 1h → WAL-G (simplest to S3) / pgBackRest.
2. **Version-mismatch silent failure** (the GitLab bug): pg_dump client major
   < server major fails the job quietly. Pin the backup image to the same
   major as the DB image.
3. Restore drill monthly (Tier1): spin scratch `postgres:X` container,
   restore latest dump, `SELECT count(*)` on 2-3 key tables vs baseline,
   boot the app against it and hit `/health/ready` — "app boots" beats
   "pg_restore exited 0". Tear down.

## Per-store

| Store | Method | Trap |
|---|---|---|
| Redis | RDB/AOF — only if it holds sessions/state | pure cache → skip backup, rebuild cold |
| ClickHouse | native `BACKUP ... TO S3/Disk` (22.8+); Altinity clickhouse-backup for incremental | |
| MongoDB | mongodump; FS snapshot when dump time outgrows RPO | |
| Qdrant | snapshot API per collection → push file offsite | rebuildable from source data? Tier 3, skip |
| MinIO | `mc mirror` cron to second S3 endpoint | mirror drops version history — `mc replicate` if versioning matters; versioning+object-lock = ransomware guard |
| Neo4j | Community = OFFLINE only: `neo4j-admin database dump` with DB stopped | online backup is Enterprise-only — plan the downtime window |

## The live-volume trap

File-level backup (restic/tar) of a RUNNING database volume captures torn
mid-transaction writes → restores corrupt. Order of preference:

1. Dump first (pg_dump/mongodump/CH BACKUP/neo4j dump) → restic backs up the
   dump file.
2. Stop container → snapshot volume → start (fine for small RPO-tolerant).
3. FS snapshot (LVM/ZFS) — crash-consistent, OK for journaled engines only.

Label-driven tooling does this right: `offen/docker-volume-backup` with
`archive-pre` dump hook / `stop-during-backup` label. Static-asset volumes
(non-DB) are safe live.

## 3-2-1 + encryption

1. Three copies: live volume, local dump, encrypted offsite (B2/Wasabi/
   Hetzner Storage Box/second-VPS MinIO).
2. Client-side encryption before upload: restic (AES-256 built in) or
   `age -r <pubkey>` for single dump files. Provider never sees plaintext.
3. Retention: `restic forget --keep-daily 7 --keep-weekly 5
   --keep-monthly 12`; run `--prune` weekly, not per-backup (expensive,
   locks the repo).
4. Backup container lives in the same compose file (shared network/volumes),
   pushes OFFSITE — "same compose" must not mean "same disk".

## Monitor for absence, not just failure

1. **Dead-man's switch:** a cron that stops running produces zero errors.
   `backup.sh && curl -fsS -m 10 --retry 5 https://hc-ping.com/<uuid>` —
   healthchecks.io/Uptime Kuma alerts when the ping DOESN'T arrive.
2. **Size anomaly:** new backup <50% or >200% of rolling average = silent
   truncation (disk full mid-dump) or corruption. Alert on it.
3. **Verify the alert channel itself** — GitLab's backup alerts were eaten
   by DMARC. Test the path quarterly.

Sources: about.gitlab.com 2017 postmortem, restic/pgBackRest/ClickHouse/
Qdrant/Neo4j/MinIO official docs, offen/docker-volume-backup,
healthchecks.io/docs.
