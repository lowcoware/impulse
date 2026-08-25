---
name: impulse
description: "Universal entry point and router for the impulse suite. Describe a situation in plain words and it names the best-fit impulse skill(s) to plug in, disambiguating the overlapping pairs. Triggers: \"/impulse\", \"which impulse skill\", \"what impulse skill for this\", \"какой impulse скилл\", \"что из impulse подключить\", \"куда это по impulse\", \"impulse, помоги выбрать\", \"route this\", \"what should I use for\". Bare /impulse routes; /impulse blitz|medium|hardcore is the mode switch (handled by the hook), not this. A static one-screen card is /impulse-help; this one reads the situation and recommends."
---

# impulse — router

1. Read the user's words plus a quick repo check: `git status`, file tree,
   package manifest — those three only.
2. Match the situation to one row in the routing table below.
3. Exactly one clear match -> name it, give a one-line reason, proceed with
   it.
4. Two or more rows match, or none do -> stop and ask with
   `AskUserQuestion` instead of exploring further.
5. One-shot: change no modes, write no files.

## Output shape

```
Reading this as: <one-line situation>.
Best fit: <skill> — <one-line why>.
Alternative: <skill> if <condition>.   (only when a real fork exists)
```

Then: clear winner -> "Proceeding with <skill>." and follow that skill.
Genuine fork -> `AskUserQuestion` with the 2-3 candidates, one line each.

## Routing table

| Situation signal | Skill |
|---|---|
| Build/extend backend: service, endpoint, worker, consumer, Kafka, gRPC, migration, DB | impulse-backend |
| Build/extend web UI: component, landing, dashboard, form, tokens, browser animation | impulse-frontend |
| Build/extend mobile: Flutter, React Native, SwiftUI, Kotlin, native screen | impulse-mobile |
| AI infra: RAG, embeddings, Qdrant, LLM gateway, MCP server/tool | impulse-ai |
| Existing/unfamiliar code, refactor without tests, migration | impulse-legacy |
| Proactive security while writing: JWT, authz/IDOR, rate limit, CORS, secrets | impulse-security |
| Third-party dependency safety: CVE, supply chain, "safe to install?" | impulse-dependency-audit |
| Deploy/infra: Compose (default), k3s past the threshold, Dockerfile, GH Actions, Traefik/TLS, VPS | impulse-devops |
| Review a diff/PR for slop, baseline, AI-typical bugs | impulse-review |
| Repo-wide over-engineering cut-list (not a diff) | impulse-shrink |
| Harvest `impulse:` ceiling markers into a debt ledger | impulse-debt |
| An OBSERVED failure to explain: broken, failing test, regression, wrong output | impulse-systematic-debug |
| Not-yet-decided fork: which approach, tech choice, schema, boundaries | impulse-brainstorm |
| Plan work: spec, ADR, changelog, checkpoint, retro, triage, review cadence | impulse-project-management |
| Drive an existing plan to done autonomously, phase by phase | impulse-goal |
| Rewrite/generate text in the user's voice, strip AI tells | impulse-humanizer |
| Format a doc as Obsidian markdown (properties, callouts, wikilinks) | impulse-md-generator |
| Generate a standalone HTML report/plan/diagram, one shareable file | impulse-artifact |
| Maintain an Obsidian vault as a project wiki: structure, MOCs, vault health, Canvas/Bases | impulse-wiki |
| Clone/reverse-engineer a website (with a legitimate basis) | impulse-clone |
| Always-on rules, token economy, "why are rules already active", disable the core layer | impulse-core |
| Just want the reference card of skills/modes/tags | impulse-help |

## Disambiguation — the overlapping pairs

Where two skills look plausible, the fork is the value:

- **review vs systematic-debug vs shrink.** Observed failure (something IS
  broken) -> debug. A diff with no failure, checking quality/slop -> review.
  Whole repo, not a diff, hunting what to delete -> shrink. "Подгони под
  стандарты" / "review and fix" -> review sweeps and cites rule IDs, then the
  matching builder skill applies the fixes — two skills, one session.
- **brainstorm vs project-management.** Decision NOT yet made (weighing
  approaches) -> brainstorm. Decision made, now record/plan it (spec, ADR) ->
  pm.
- **project-management vs goal.** Writing the plan (spec/roadmap/ADR) -> pm.
  Autonomously executing a plan to completion (phase loop, audit) -> goal.
  Natural sequence: pm plans, goal drives.
- **security vs dependency-audit.** Vulnerability in OUR code (authn, IDOR,
  rate limiting, CORS) -> security. Risk in a THIRD-PARTY package (CVE,
  typosquat, install hook) -> dependency-audit.
- **frontend vs mobile.** Browser UI (Vue/Nuxt/Tailwind) -> frontend.
  Flutter/RN/SwiftUI/Kotlin screens -> mobile.
- **backend/frontend vs legacy.** Greenfield or code written this session ->
  backend/frontend. Existing/unfamiliar code needing characterization tests
  and blast-radius first -> legacy (then it hands back to the builder skill).
- **humanizer vs md-generator vs artifact vs wiki vs pm.**

  | Signal | Skill |
  |---|---|
  | Fix voice / remove AI-tells in existing prose | humanizer |
  | Format one note as Obsidian markdown | md-generator |
  | Produce one shareable standalone HTML file (report/plan/diagram) | artifact |
  | Decide where a note lives in the vault (structure/MOCs/Canvas) | wiki |
  | Decide what the doc should say, or whether it exists yet | pm |

  They often chain: pm decides content -> humanizer voices it ->
  md-generator formats it -> wiki places it.
- **review vs clone.** Judging code you have -> review. Rebuilding a site you
  don't have the source of -> clone.
- **frontend vs artifact.** App UI that lives in the codebase (routing,
  state, build step) -> frontend. One-off shareable HTML file (report, plan
  page, diagram) -> artifact. "Сделай страницу с планом" = artifact unless
  it's a page of the product.
- **devops vs security.** Getting Traefik/TLS/deploy RUNNING -> devops.
  HARDENING what runs (headers, rate limits, webhook signatures, CORS) ->
  security. Same words ("traefik", "tls") — the fork is stand-up vs harden.
- **backend vs legacy on "миграция".** DB/schema migration in code being
  built -> backend. Migrating/refactoring an existing codebase -> legacy.

## Modes and companions

- Modes (`blitz|medium|hardcore`) apply to backend and frontend only. `/impulse
  blitz` etc. is the mode switch (the hook handles it) — not this router.
- The `impulse-core` layer (engineering spine + token economy) is hook-injected
  every session independently of these modes — `stop impulse` leaves it on;
  `/impulse-core off` disables it durably.
- Off-charter asks route OUT of the suite, say so plainly:

  | Ask type | Route to |
  |---|---|
  | Offensive security / pentest / bug bounty | companion `claude-bughunter` |
  | Token-compressed chat mode | companion `caveman` |
  | Deep general web research | the host's research tooling |
  | Chart / dataviz | the host's dataviz skill |

## Boundaries

Recommends and routes; does not itself build, review, or write. Picks the
skill; that skill does the work. Not the static card — that's `impulse-help`.
Nothing here changes mode or state.
"stop impulse" / "normal mode": turn off the domain modes; the always-on
core layer stays (disable that with `/impulse-core off`).

## Before you answer

Confirm before giving the recommendation: checked the routing table for a
matching row? if two or more rows matched, used the disambiguation table
and `AskUserQuestion` if still tied? repo check limited to the three listed
commands, no subagent, no deeper exploration? changed no modes and wrote
no files?
