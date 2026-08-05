[Русский](README.md) · **English**

# impulse

An anti-overengineering engineering skill suite for Claude Code — 22 skills
covering backend (Go-first microservices, Python where it earns it),
frontend (Vue 3 / Nuxt 4), diff review, technical debt, humanized writing,
docs, project management, legacy code, AI/RAG infrastructure, security,
devops, mobile, brainstorming, systematic debugging, and dependency
auditing. For engineers who want a ladder against speculative complexity,
not a framework: a non-negotiable day-one baseline, `impulse:` ceiling markers
in place of speculative code, and one-line diff review. Native to Claude
Code; portable to Cursor, Codex, and Antigravity CLI via the installer.

## Install

The primary path depends on the tool: Claude Code and Antigravity use their
own plugin systems; Cursor and Codex use `npx skills` (the open agent-skills
installer, vercel-labs/skills).

| CLI | Install (primary path) | Detail |
|---|---|---|
| Claude Code | plugin: `/plugin marketplace add lowcoware/impulse` then `/plugin install impulse@impulse` (adds hooks, statusline, modes) | `INSTALL.en.md` |
| Cursor | `npx skills add lowcoware/impulse -a cursor` | `INSTALL.en.md` |
| Codex | `npx skills add lowcoware/impulse -a codex` | `INSTALL.en.md` |
| Antigravity | plugin: `agy plugin install lowcoware/impulse` | `INSTALL.en.md` |
| OpenCode | `npx skills add lowcoware/impulse -a opencode` (or it already sees a Claude Code/Codex install) | `INSTALL.en.md` |
| Gemini CLI | extension: `gemini extensions install https://github.com/lowcoware/impulse` | `INSTALL.en.md` |
| Qwen Code | extension: `qwen extensions install https://github.com/lowcoware/impulse` | `INSTALL.en.md` |
| Goose | plugin: `goose plugin install https://github.com/lowcoware/impulse` (or it already sees a Claude Code/Codex install) | `INSTALL.en.md` |

`npx skills` also works for Claude Code / Antigravity, but drops the bare
skill level without the plugin wiring. No-npx alternative — the repo
installer, `node scripts/install.js --help`.

Hooks, the statusline badge, and `/impulse-*` activation commands are
Claude-Code-only — the other CLIs (and a bare copy) auto-attach the
same skill content by description; see `INSTALL.en.md` for what does and
doesn't port per target.

## Quickstart (Claude Code)

1. `/plugin marketplace add lowcoware/impulse` then `/plugin install impulse@impulse`.
2. Restart the session.
3. `/impulse-help`.

## Skills

All 22 skills and how to invoke them. The `/impulse-*` commands are Claude
Code; on other CLIs the same skills auto-attach by description. Live
one-screen card: `/impulse-help`.

| Skill | Command | For |
|---|---|---|
| impulse | `/impulse` | Universal router: describe a situation, it names the best-fit impulse skill to plug in and disambiguates the overlapping pairs |
| impulse-backend | `/impulse-backend [mode]` | Greenfield microservice backends, Go-first: ladder, day-one baseline, ceiling markers |
| impulse-frontend | `/impulse-frontend [mode]` | Vue 3 / Nuxt 4 / Tailwind v4: register split, AI-tells bans, GSAP/Lenis canon, DESIGN.md protocol |
| impulse-review | `/impulse-review` | Diff review: overengineering, baseline, seams, AI-typical bugs, architecture decay, AI-tells — one line per finding |
| impulse-debt | `/impulse-debt` | Harvest `impulse:` markers into a ledger, flag rot |
| impulse-humanizer | `/impulse-humanize` | Writes/rewrites text in the calibrated user voice, strips written AI-tells (also automatic during doc generation) |
| impulse-md-generator | `/impulse-md` | Formats docs as Obsidian Flavored Markdown — properties, wikilinks, callouts, zero plugins |
| impulse-artifact | `/impulse-artifact` | Self-contained HTML artifact generator: report/plan/diagram as one file, mandatory dark mode |
| impulse-wiki | `/impulse-wiki` | Maintains a project wiki in Obsidian: structure, MOCs, vault health, Canvas diagrams, Bases views, CLI |
| impulse-project-management | `/impulse-pm` | Spec-driven workflow, ADR lifecycle, review-cadence scaling, mechanical playbooks |
| impulse-legacy | `/impulse-legacy` | Existing/unfamiliar code: characterization tests, seams, blast-radius, Strangler Fig, agent read-before-write |
| impulse-ai | `/impulse-ai` | RAG/embeddings/Qdrant, LLM gateway, MCP server/tool design + security, Claude Code subagent conventions |
| impulse-security | `/impulse-security` | JWT/HMAC auth, secrets, IDOR/authz, layered rate limiting, CORS, Traefik edge hardening |
| impulse-devops | `/impulse-devops` | Compose multi-env, multi-stage Dockerfiles, GH Actions (pull_request_target footgun), Traefik ACME/TLS, blue-green on one VPS |
| impulse-mobile | `/impulse-mobile` | Flutter/React Native/native: platform-choice ladder, day-one mobile baseline, dispose/leak catalog, secrets-in-binary rule |
| impulse-brainstorm | `/impulse-brainstorm` | Hard-to-reverse decision: 3 real approaches, score vs named constraints, recommend + trip-wire → ADR |
| impulse-systematic-debug | `/impulse-debug` | Disciplined bug hunt: reproduce → bisect → hypothesis-log → smallest fix → regression test |
| impulse-dependency-audit | `/impulse-audit` | Vet a dep for CVEs/typosquat/protestware/install-hooks; lockfile+pin discipline |
| impulse-shrink | `/impulse-shrink` | Repo-wide over-engineering audit (not a diff): what to delete/replace with stdlib, ranked biggest cut first |
| impulse-clone | `/impulse-clone` | Website cloning as a discipline: recon-first, L1-L6 grading, Playwright harvest/mirror/diff scripts, fidelity audit |
| impulse-goal | `/impulse-goal` | Execution engine: after the PM phase, drives a plan through phases under one `/goal` — verify, 3-strike recovery, final audit against the plan |
| impulse-help | `/impulse-help` | One-screen card: skills, modes, config |

## Modes

A mode (`blitz|medium|hardcore`) is a speed/strictness switch — only
backend and frontend take one. Every other skill in the table above just
runs on its command, no mode. blitz = fastest excellent attempt; medium =
full ruleset (default); hardcore = architecture first (boundaries,
contracts, every seam's failure modes before code).

Activate: `/impulse-backend [blitz|medium|hardcore]`, `/impulse-frontend [blitz|medium|hardcore]`.
Deactivate: `stop impulse` (or `normal mode`). Config:
`~/.config/impulse/config.json` (`defaultMode`, `docstringLang`,
`coverageTarget`) — full reference card: `/impulse-help`.

## Usage across CLIs

How you invoke skills depends on the tool: in Claude Code (plugin) —
`/impulse-*` slash commands plus modes, hooks, and a statusline; in Cursor /
Codex / Antigravity and a bare Claude Code copy, the same skills attach by
description and you name the mode in the prompt. Full per-tool guide —
`USAGE.en.md`, per-tool install — `INSTALL.en.md`.

| CLI | Invoke by | Commands / modes |
|---|---|---|
| Claude Code (plugin) | `/impulse-*` or describing the task | commands, modes, hooks, statusline |
| Claude Code (copy) | describing the task | none — mode by words |
| Cursor | describing the task | none — mode by words |
| Codex | describing the task (+ `AGENTS.md`) | none — mode by words |
| Antigravity | describing the task (+ rules) | none — mode by words |

## Linters

`node scripts/check-skills.js && node scripts/check-sync.js && node scripts/impulse-debt.js`
— frontmatter schema, size caps, cross-reference integrity, and
compact-ruleset drift. Same three gate CI (`.github/workflows/lint.yml`) on
every push and PR.

## Companion skills

impulse covers anti-overengineering engineering. Worth installing alongside it,
each owning something impulse deliberately does not duplicate:

- **caveman** — [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman).
  A compressed-communication mode: the agent drops filler and answers tight,
  keeping code, commands, and errors byte-for-byte exact. impulse borrows its
  thinking-compression style, but the communication mode itself lives in
  caveman — install it to save output tokens on every reply.
- **claude-bughunter** — [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter).
  Offensive security: bug bounty and external red-team, 48 hunt-skills built
  from disclosed reports plus M365/Okta/vCenter attack matrices. impulse-security
  and impulse-dependency-audit own the DEFENSIVE, build-time side; bughunter owns
  the offensive side. Install it when the work is an authorized pentest or bug
  bounty, not development.
- **agent-reach** — [Panniantong/Agent-Reach](https://github.com/Panniantong/Agent-Reach).
  Internet access for the agent: a router across 15 platforms (Twitter,
  Reddit, YouTube, Xiaohongshu, Bilibili, LinkedIn, and more), multi-backend,
  cookie-based access, video transcription. impulse is about engineering code,
  not fetching content from the web — install it when the agent needs to
  research/read the internet, not write code.
- **i-have-adhd** — [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd).
  Output shaped for an ADHD reader: lead with the action, numbered steps,
  state restated every turn, concrete time estimates, no preamble or "hope
  this helps." Same class as caveman — an overlay on response style, not
  engineering; impulse pulled its debug-spiral trigger (impulse-systematic-debug)
  and pre-send checklist (shared/communication.md), but the full mode lives
  here.
- **obsidian-mind** — [breferrari/obsidian-mind](https://github.com/breferrari/obsidian-mind).
  A whole Obsidian vault as the agent's long-term memory: lifecycle hooks
  (SessionStart context injection, per-message classification, write-time
  frontmatter/wikilink validation), nine subagents for heavy vault operations,
  and a graph-first note discipline. It vendors
  [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)
  (obsidian-markdown, obsidian-bases, json-canvas, obsidian-cli, defuddle) plus
  its own mermaid/excalidraw/qmd skills, and installs via
  [shardmind](https://github.com/breferrari/shardmind). impulse-wiki and
  impulse-md-generator own the project-wiki discipline and Obsidian FORMATTING
  of generated docs; obsidian-mind owns the personal-vault SYSTEM around them —
  install it when the vault is the memory, not just an output format.
- **GitLab MCP** — [zereight/gitlab-mcp](https://github.com/zereight/gitlab-mcp)
  (`@zereight/mcp-gitlab` on npm). Not a skill, an MCP server: gives the
  agent direct tool calls over the GitLab API (issues, MRs, pipelines, repo
  files) instead of hand-rolled `curl`/`glab` invocations. Setup and
  boundary: `shared/gitlab-mcp.md`. Install it when the project is
  GitLab-hosted and the work touches MRs/issues/pipelines repeatedly in one
  session — a one-off `git push` never needed it.

## More

- Using it in Claude Code / Cursor / Codex / Antigravity: `USAGE.en.md`
- Per-CLI install: `INSTALL.en.md`
- Contributing a skill or fix: `CONTRIBUTING.en.md`
- Reporting a vulnerability: `SECURITY.en.md`
- Change history: `CHANGELOG.md`

## Lineage

| Source | Taken |
|---|---|
| ponytail | anti-overengineering ladder, ceiling-marker debt convention, one-line review format, never-block hook pattern |
| taste-skill | AI-tells catalog, GSAP/ScrollTrigger/Lenis motion canon, mechanical preflight |
| kepano/obsidian-skills (MIT, Steph Ango) | impulse-wiki's Canvas + Bases + CLI vault-operation references |
| tpitsunov/obsidian-skills (MIT) | impulse-wiki's vault-health scripts (orphan/broken-link/stats/ToC), MOC builder, capture/glossary/tagging/atomization workflows |
| adriangrant/Obsidian-SKILLS (MIT) | impulse-wiki's CLI environment footguns (Linux sandbox, Snap) |
| ayghri/i-have-adhd (MIT) | impulse-systematic-debug's debug-spiral trigger, shared/communication.md's pre-send checklist |
| plannotator/effective-html (MIT) | impulse-artifact genre split (general/plan/diagram), dark-mode pattern, SVG pan/zoom technique |
| Anthropic html-effectiveness sample gallery (Apache-2.0) | impulse-artifact's vendored 21-file example gallery (`examples/`) + the shared token/component palette extracted from it (`palette.md`) |
| impeccable | brand/product register split, 8-state components, harden checklist |
| humanizer | impulse-humanizer skill — 3-layer AI-tell model, forked and recalibrated to one specific user voice |
| caveman (installed plugin) | thinking-compression style, manifest/hooks wiring ground truth |
| awesome-design-md | per-project DESIGN.md protocol, Linear dark surface-ladder reference |
| designer-skills | terse-checklist file format |
| kepano/obsidian-skills (MIT, Steph Ango) | impulse-md-generator's core Obsidian syntax reference (wikilinks, properties, callouts, embeds) |
| React Native docs (MIT) / Expo docs (MIT) / pmndrs/zustand (MIT) | impulse-mobile `react-native.md` — New Arch mandate, FlatList perf rules, Expo Router default, listener-leak pattern |
| Flutter docs (CC BY 4.0) / riverpod.dev (underlying repo MIT) / Android Developers docs (Apache-2.0) | impulse-mobile `flutter.md` + `native.md` — Riverpod/const-rebuild, context.mounted bug, dispose discipline, Compose/StateFlow |
| dart.dev linter-rules (CC BY 4.0 docs) / Solido/awesome-flutter (CC0-1.0) | impulse-mobile `flutter.md` — `use_build_context_synchronously` linter citation, curated Flutter package/pattern reference |
| PatrickJS/awesome-cursorrules (CC0) / HackTricks (CC BY-NC 4.0) | impulse-mobile cross-cutting — cursor-rule mobile patterns, WebView/deep-link attack surface (patterns re-expressed, no verbatim) |
| open-source skill corpus (anthropics/skills — mixed: Apache-2.0 skills + source-available components, mechanisms re-expressed, no files copied; obra/superpowers, wshobson/agents — MIT) | mechanisms harvested, not files copied: RED-phase test authoring, redacted-handoff adversarial review, numeric escalation gates, structured find→verify review shape; second pass: form-to-failure authoring rule, claim→evidence table, 3-failed-fixes→architecture gate, durable orchestration (state-on-disk, status vocabulary, batch dispatch), spec self-review + pre-mortem, YAGNI-pushback, PG identity/NOT VALID/FK-index rules, GH Actions script-injection env-indirection, Reader Test, MCP annotation defaults + DNS-rebinding |
| davila7/claude-code-templates (MIT) | hook-enforced read-only auditor pattern, dated-refreshable threat-intel convention, GH Actions env-indirection corroboration |
| addyosmani/agent-skills (MIT) | perf metric-honesty rule (static = "potential", measured = cited), font/INP/bfcache perf-catalog entries |
| agentskills/agentskills spec (CC BY 4.0) | normative frontmatter schema behind scripts/check-skills.js (name/dir match, 64/1024 caps, allowed keys) |
| ibelick/ui-skills (ui-skills.com) | motion-performance ladder re-expressed: blur ≤8px one-shot, ≤200ms interaction feedback, no scroll polling, standing-will-change ban, paste-block ban |
| mattpocock/skills (MIT) | seam-counting + deletion test, 3-condition lean ADRs, tight-loop debug gate + DEBUG-tag, standards-vs-spec review axes, throwaway-prototype settle, grounding ledger + format arguments, opposing-constraint divergence, fog-vs-ticket, GLOSSARY authoring axioms (no-op test, completion criteria, leading words, load accounting) |
| deep second pass (anthropics eval harness, obra tests/, wshobson plugin-eval + SLO skill, davila7 hooks) | shared/evals.md protocol (paired evals, trigger holdout, pressure tests), interview mechanics (confidence opener, want-vs-should-want, stop test), SLO burn-rate alerting (14.4x/6x), WCAG 2.2 target size, interpreter-unwrap hook bypass class, TG token regex + callback_data 64B, hook-as-gate examples |
| SPEC-14 research corpus — 66 verified sources | citations folded into the ladder, baseline, and stack refs |
| alibaba/open-code-review (Apache-2.0) | impulse-review's ai-bug-patterns-be.md Python general-correctness section (mutable defaults, bare except, is-vs-==, lazy logging, eval/pickle/yaml.load) |
| openai/skills (Apache-2.0) | impulse-backend's security-checklist.md (Go net/http + FastAPI hardening rules), impulse-ai's mcp-server.md pagination/response-format conventions |
| trailofbits/skills (CC BY-SA 4.0, mechanisms re-expressed, no text copied) | impulse-review's api-misuse-resistance.md (sharp-edges pit-of-success doctrine) + differential-review adaptive-depth framing in SKILL.md, impulse-backend's testing.md property catalog + deps.md modern-python tooling table, impulse-dependency-audit's supply-chain.md dependency-health-risk section |
| qdrant/skills (Apache-2.0) | impulse-ai's qdrant.md multitenancy + memory-optimization + embedding-model-migration sections |
| redis/agent-skills (MIT, Redis Inc.) | impulse-backend's new stores-redis.md |
| s3onghyun/otelcol-doctor (Apache-2.0) | impulse-backend's new otel-collector.md |
| zuoyebang/aiweave (Apache-2.0) | impulse-backend's hardening-go.md worker-pool-sizing section (Little's Law, pool invariants) |
| phuryn/pm-skills (MIT) | impulse-review's boundary-crossing-mismatch filter in the Intent reconstruction section |
| yetone/kill-ai-slop (Apache-2.0) | impulse-frontend's preflight.mjs scanner + rules.ru.mjs (RU slop lexicon) + scanner tests, ai-tells bans 30-35, motion transition-all/hover-scale bans, tokens spacing-by-relationship, typography display rule, ai-bug-patterns-fe corner-geometry entries, FP table + `impulse-ok` escape hatch, redesign de-slop ordering |
| emilkowalski/skills (MIT) | impulse-frontend's motion-craft.md (4-question gate, easing/duration/spring catalog, gesture formulas, review protocol), motion tag expansion, settled-decisions principle, data-not-instructions convention (impulse-review/impulse-shrink/impulse-legacy), motion glossary in vocabulary.md, Sonner toast principles in components.md, tracking-by-size in typography.md, write-executor-plan + reconcile-plans playbooks in impulse-pm |
| nexu-io/open-design (Apache-2.0) | impulse-frontend's template-catalog.md (115 shapes) + brand-systems-catalog.md (153 brand packages), vendored in full under design-templates/ + design-systems/, ux-laws.md (29 laws) + rtl-i18n-ui.md (21 rules), gsap-api.md (385-line API reference), interface-audit.md (48 Vercel WIG rules), design-contract.md, forms/components/tokens/typography/motion-craft deltas incl. WCAG large-text threshold fix, impulse-clone (18th skill: recon-first, L1-L6 grades, 12 Playwright scripts, ethics boundaries), export bugs in ai-bug-patterns-fe, humanizer lint mode, prompt-templates pointer, resolve-pr-feedback + research-synthesis PM playbooks |
| robzilla1738/supergoal (MIT) | impulse-goal (19th skill) — autonomous execution engine: SKILL.md router, workflow.md (stages 0-7), execution.md (loop/audit/recovery), planning-depth/phase-design/goal-format/repo-state-comparison, 4 templates, 6 scripts; renamed SUPERGOAL_→IMPULSEGOAL_, /supergoal→/impulse-goal |

## License

MIT — see `LICENSE`. `LICENSE` also enumerates the third-party sources in
the Lineage table above, grouped by license class.
