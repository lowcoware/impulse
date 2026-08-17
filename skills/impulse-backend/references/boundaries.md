# Boundaries — service borders and data ownership

## 1. Draw boundaries by business capability

1. One service = one business capability with its data, rules, and lifecycle.
2. Name the capability as one noun phrase with no "and". Can't → that's two services, or half of one.

| wrong boundary | right boundary |
|---|---|
| "database service", "cache service" (technical layer) | orders, catalog, payments, notifications |
| one service per DB table | service per capability; tables follow the capability |
| "auth UI service" (screen slice) | user service owning identity end-to-end |

## 2. Anti-nanoservice

Too-small services = distributed monolith: monolith coupling plus network failure modes. Merge on any signal:

| Signal | Action |
|---|---|
| Two services always change in the same PR | merge them |
| One user request → sync chain of ≥3 services | redraw boundaries |
| Service owns no data — only orchestrates/transforms | fold into its caller |
| Service is one function or one endpoint | it's a package, not a service |
| Two services share a DB or tables | merge, or split the data for real |

Greenfield default: fewer services than you think. Splitting on a named trigger later beats un-merging a mesh.
Real-world reversal, not a hypothetical: Prime Video's video-quality
monitoring team moved a component from distributed microservices/serverless
back to one monolithic process (in-memory data passing instead of an S3
intermediate store) and cut infra cost by 90% at their scale — published as
their own case study, not third-party speculation, and specifically about a
service that had been split without the boundary criteria in section 1
actually being met.
[devclass: Amazon Prime Video microservices-to-monolith case study, 90% cost cut](https://devclass.com/2023/05/05/reduce-costs-by-90-by-moving-from-microservices-to-monolith-amazon-internal-case-study-raises-eyebrows/)

**One image, several entrypoints** — the middle ground before reaching for
separate services: one codebase/image, different processes started with
different commands (`api`, `worker`, `scheduled-maintenance`), scaled
independently (`--scale svc-api=3`). Cheaper than splitting into real
services and doesn't block scaling the hot part separately — reach for an
actually separate service only when a part needs its own release cadence,
its own SLA, or a different trust level (sandboxing rule in
`Design-decisions`-equivalent judgment calls), not just independent
scaling.

## 3. Data ownership

1. Each service owns its DB (or schema). No other service gets credentials to it.
2. Cross-service JOIN = banned. Foreign data: owner's API (sync) or event-driven read model (async).
3. Read model = local projection updated from the owner's events. Staleness is accepted AND named — write the window in the README ("catalog data ≤30s stale").
4. 2PC / distributed transactions = banned. Multi-service writes → saga: local tx per service, events between, compensating tx for rollback. Publish via outbox (events.md §4).
5. Eventual consistency is the default across boundaries. Name it; never fake strong consistency with sync call chains.

## 4. Modular-monolith fallback

Allowed when: solo/duo team, MVP horizon, boundaries still fuzzy, trivial load. Not a soft default — it ships with mandatory protection.

### Anti-abandon protection — BOTH required, or the fallback is a violation

**(a) Name the split trigger.** Concrete and measurable, recorded at decision time:

1. README section `## Split triggers` + `// impulse: modular monolith, split <module> when <trigger>` at each module root.
2. good: "extract billing when a second team touches it", "split orders when deploy cadence diverges", "split when orders p95 > 300ms at sustained load".
3. bad: "later", "when we grow", "if needed" — not triggers. impulse-review flags the fallback; impulse-debt flags the trigger-less marker as rot.

**(b) Module = future service.** All four, mechanically checkable:

1. Module owns its schema. Zero cross-module table access, zero cross-module FKs.
2. Zero cross-module imports except contract types (one shared `contracts` package).
3. Modules talk via events or narrow interfaces — the same seams a network would force.
4. Extraction test: pulling the module out = move code + swap transport. If extraction needs a rewrite, the protection already failed — fix the coupling now, not at split time.

Day-one baseline still applies to the monolith process: health, metrics, graceful shutdown, migrations, config validation.

## 5. Telegram bots — always their own service

A Telegram bot never lives inside another service's process or repo. Own service, thin adapter, gRPC-only — zero DB access, zero imports of another service's internals. Full detail (tree + rules): `layout.md` "Python: Telegram bot (aiogram v3)".

## 6. Choosing: microservices vs modular monolith

| Microservices when | Modular monolith when |
|---|---|
| ≥2 separable capabilities with different load/reliability/release needs | prototype or MVP, months-scale horizon |
| Isolated failure required (one part down ≠ all down) | one-two devs, CI/CD + observability not yet in place |
| Stack split earns it (Go API + Python ML) | small system, no growth signals |
| Multi-year lifecycle, team > 1 | in doubt — doubt defaults to monolith WITH §4 protection |
