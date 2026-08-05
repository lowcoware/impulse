# Incident response — prod is down

When prod breaks, the order is fixed: **stop the bleeding, then find the
cause.** Debugging a live outage before mitigating it costs users while you
theorize. This is the ops half; the cause-finding half is
`impulse-systematic-debug`.

## The loop

1. **Declare.** Name it an incident out loud (even solo — it changes your
   mode from "poking" to "restoring"). Note start time; pick one owner if more
   than one person.
2. **Assess blast radius.** Who/what is affected, how badly (down vs degraded),
   since when. Check the dashboards the baseline requires
   (`impulse-backend/references/observability.md`) — error rate, latency, saturation.
3. **Mitigate FIRST, fix later.** Restore service by the fastest safe lever,
   even if it's not the root fix:
   - **Roll back** the last deploy — the #1 cause of "worked an hour ago."
     Blue-green makes this instant (`deploy.md`). This is the default first
     move.
   - **Feature-flag off** the suspect path if rollback isn't clean.
   - **Scale/restart** if it's saturation or a leak buying you time.
   - **Shed load** (rate-limit, disable a nonessential consumer) if overloaded.
4. **Communicate.** Short, factual status: what's affected, that you're on it,
   next update time. Even an internal one-liner beats silence.
5. **Stabilize, confirm recovery.** Watch the metrics return to baseline
   before standing down. "Deploy went out" ≠ "recovered" — confirm on the
   dashboard.
6. **RCA after, not during.** Once stable, hand to `impulse-systematic-debug`:
   reproduce, bisect (often `git bisect` across the deploys since it was
   healthy), name the cause, land the real fix + regression test.
7. **Blameless post-mortem** for anything user-facing: timeline, root cause,
   what made detection/mitigation slow, concrete action items with owners.
   Blame the system/process gap, never the person — that's how you learn
   instead of hide.

## Hard rules

1. **Mitigate before you diagnose.** Rollback/flag-off first; understand it
   after users are served. The one exception: a mitigation that could corrupt
   data (a half-run migration) — there, stop and think.
2. **One owner during an active incident.** Two people both "fixing" prod
   collide. Coordinate.
3. **Change one thing at a time even under pressure** — panic-batching makes
   it worse and hides which lever worked.
4. **Never skip the post-mortem for a user-facing outage.** An incident with
   no action items will recur verbatim.
5. **The regression test is part of "done."** Same rule as
   `impulse-systematic-debug` — an incident with no test to catch its recurrence
   isn't closed.

## Prep that makes this survivable (do before the incident)

- Rollback is one command and rehearsed (`deploy.md` blue-green).
- Dashboards + alerts exist and are trusted (`observability.md`) — you can't
  assess a blast radius you can't see.
- `impulse:` runbook notes on known-fragile paths: what breaks, what the lever is.
- Cert-expiry and disk/volume alerts fire *before* they cause the outage
  (`decay.md`) — the cheapest incident is the one that never fires.

Note: mitigate-first + blameless post-mortem are standard SRE practice,
summarized in own words; no source text copied.
