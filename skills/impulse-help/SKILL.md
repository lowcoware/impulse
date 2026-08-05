---
name: impulse-help
description: >
  One-screen reference card for the impulse suite: skills, modes, ceiling-marker
  syntax, review tags, config keys, mode-switch commands. One-shot display,
  changes nothing. Triggers: "/impulse-help", "impulse help", "справка impulse",
  "что умеет impulse", "как включить impulse", "impulse commands".
---

Display this card when invoked. One-shot: do NOT change mode, write flag
files, or persist anything.

# impulse — reference card

## Skills

| Skill | Trigger | Does |
|---|---|---|
| impulse | `/impulse` | Router: describe a situation, it recommends which skill(s) to plug in and splits the overlapping pairs |
| impulse-backend | `/impulse-backend [mode]` | Greenfield microservice backends, Go-first: ladder + day-one baseline + ceiling markers |
| impulse-frontend | `/impulse-frontend [mode]` | Vue 3 / Nuxt 4 / Tailwind v4: register split, AI-tells bans, GSAP/Lenis canon, DESIGN.md protocol |
| impulse-review | `/impulse-review` | Diff review: overengineering + baseline + seams + AI-typical bugs + architecture-decay + AI-tells. One line per finding |
| impulse-debt | `/impulse-debt` | Harvest `impulse:` markers into a ledger, flag rot |
| impulse-humanizer | `/impulse-humanize` (chat) or automatic in doc generation | Rewrites/generates text in the calibrated user voice; strips AI writing-tells |
| impulse-md-generator | `/impulse-md` | Formats generated docs as Obsidian Flavored Markdown — properties, wikilinks, callouts, zero plugin dependency |
| impulse-artifact | `/impulse-artifact` | Self-contained HTML artifact: report/plan/diagram as one file, mandatory dark mode, gallery-calibrated |
| impulse-wiki | `/impulse-wiki` | Maintains an Obsidian project wiki: structure, MOCs, vault health, Canvas, Bases, CLI automation |
| impulse-project-management | `/impulse-pm` | Spec-driven workflow, ADR lifecycle, review-cadence scaling, mechanical playbooks (task/changelog/checkpoint/retro/triage) |
| impulse-legacy | `/impulse-legacy` | Existing/unfamiliar code: characterization tests, seams, blast-radius assessment, Strangler Fig, agent read-before-write protocol |
| impulse-ai | `/impulse-ai` | RAG/embeddings/Qdrant, LLM gateway, MCP server/tool design + security, Claude Code subagent conventions |
| impulse-security | `/impulse-security` | JWT/HMAC auth, secrets management, IDOR/authz, layered rate limiting, CORS, Traefik edge hardening |
| impulse-devops | `/impulse-devops` | Compose multi-env, multi-stage Dockerfiles, GH Actions (pull_request_target footgun), Traefik ACME/TLS, blue-green on one VPS, infra decay |
| impulse-mobile | `/impulse-mobile` | Flutter/React Native/native: platform-choice ladder, day-one mobile baseline, dispose/leak catalog, secrets-in-binary rule |
| impulse-brainstorm | `/impulse-brainstorm` | Hard-to-reverse design decision: 3 real approaches, score vs named constraints, recommend + trip-wire → ADR |
| impulse-systematic-debug | `/impulse-debug` | Disciplined bug hunt: reproduce → bisect → hypothesis-log → smallest fix → regression test |
| impulse-dependency-audit | `/impulse-audit` | Vet a dep for CVEs/typosquat/protestware/install-hooks; lockfile+pin discipline; supply-chain incidents |
| impulse-shrink | `/impulse-shrink` | Repo-wide over-engineering audit: delete/inline/stdlib list, ranked biggest cut first |
| impulse-clone | `/impulse-clone` | Website cloning: recon-first, L1-L6 grading, Playwright harvest/mirror/diff scripts, fidelity audit |
| impulse-goal | `/impulse-goal` | Execution engine: drives a plan through phases under one `/goal` — verify, 3-strike recovery, final audit vs the plan |
| impulse-help | `/impulse-help` | This card |

## Modes

| Mode | What changes |
|---|---|
| blitz | Fastest excellent attempt. No plan prose, no alternatives talk. Baseline + carve-outs + tests still mandatory |
| medium | Default. Full ruleset as written |
| hardcore | Architecture mode: boundaries, contracts, failure modes of every seam BEFORE code. Analysis in thinking + short chat summary, never documents |

Switch: `/impulse-backend blitz`, `/impulse-frontend hardcore`. Off: `stop impulse` / `normal mode`.
Statusline badge: `[IMPULSE:BE:BLITZ]`, `[IMPULSE:FE]`, `[IMPULSE:BE+FE:HARDCORE]`.

## Ceiling marker

`// impulse: <ceiling>, <upgrade trigger>` (Go/TS) · `# impulse: ...` (Python)
(example: impulse-backend references/ladder.md)
No trigger = rot; /impulse-debt flags it.

## Review tags

BE: `over:` `baseline:` `seam:` `test:` `resil:` `bug:` `arch:` — FE: `tell:` `state:` `motion:` `token:` `a11y:` `bug:` `perf:`
Mobile: `over:` `baseline:` `bug:` `perf:` `state:` `a11y:` — Infra: `infra:` `bug:` — Every domain: `evid:`; `legacy:` on pre-existing code
Findings cite a rule ID from `shared/rule-spine.md`: `bug:[FE-H06]`, `infra:[DO-CO3]`.
Severity: BLOCK / WARN / INFO. Clean verdict: `Lean. Ship.`

## Config

| Key | Where | Values |
|---|---|---|
| defaultMode | `~/.config/impulse/config.json` | blitz / medium (default) / hardcore |
| docstringLang | same | ru / en — default owned by impulse-backend docs.md |
| coverageTarget | same | number — default owned by impulse-backend testing.md |

Resolution: `IMPULSE_DEFAULT_MODE` env > config file > medium.
Flag file: `~/.claude/.impulse-active` — `{"backend":true,"frontend":false,"mode":"medium"}`.
