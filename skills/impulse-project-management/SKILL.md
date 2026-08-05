---
name: impulse-project-management
description: "PM for AI-agent-driven dev: spec-driven workflow (not sprints), ADR lifecycle, mechanical playbooks (task/changelog/checkpoint/retro/triage), whole-service review scaling. Triggers: \"/impulse-pm\", \"новая задача\", \"напиши спеку\", \"write the spec\", \"заведи ADR\", \"запиши решение как ADR\", \"спланируй\", \"ретро\", \"чекпойнт\", \"обнови ченджлог\", \"ревью сервиса целиком\", \"что в бэклоге\", \"новый спринт\". Choosing between approaches when the decision is NOT yet made = impulse-brainstorm."
---

# impulse-project-management

PM for a world where implementation is cheap and review is the bottleneck.
Built by generalizing a real project's PM skill — the mechanisms below are
proven, not theoretical: layer-sharded review, severity-gated debt
aggregation, triage-as-front-door routing all shipped and worked before
being generalized here.

## Repo scope — auto-detect

| Signal | Mode |
|---|---|
| One `.git` at cwd, no workspace file | Single-repo |
| A workspace/monorepo file (`pnpm-workspace.yaml`, `go.work`, `nx.json`) | Monorepo — one PM surface, many packages |
| A parent folder holding several sibling `.git` repos, no single workspace file | Polyrepo — shared `services-catalog`, cross-repo ADRs/tasks |

Ambiguous → ask once, don't guess (`conventions.md`'s interactive protocol).

## The unit of work is a spec, not a sprint

Traditional sprints time-box *implementation effort* — the wrong axis once
an agent implements a feature in minutes and review takes hours. The unit
here is a **spec**: written before code, an agent implements directly from
it, a review gate decides done. Full pipeline, spec template, and the
WIP-limited flow that replaces sprint cadence: `references/spec-driven.md`.

## Review is the bottleneck — treat it as the scarce resource

Real 2025-2026 data: AI-assisted teams ship far more PRs but review time
per PR rose ~91%, and AI-generated code carries materially more defects
(~45% of samples introduced an OWASP Top-10 issue in one security
benchmark). This skill's
whole review-scaling apparatus — diff-size gates, Ship-Show-Ask tiering,
intent reconstruction over line-by-line diffing, layer-sharded whole-service
review — exists because of this, not as ceremony. Detail:
`references/review.md`. Diff-level correctness/security review itself stays
`/code-review`'s job; this skill decides *when* and *how much* review a
change needs, and owns the whole-service spec/architecture review mode
impulse-review explicitly excludes from its own one-shot-per-diff scope.
A repo-wide over-engineering cut-list (delete/stdlib/native, no spec
questions) is impulse-shrink's job, not a review cadence decision.

## ADRs — decision authority stays human, research can be agent's

An ADR gets written when a decision has real blast radius (cross-service
contract, data ownership, dependency swap) — before implementation when
foreseeable, drafted by agent research, but **accepted only by explicit
human sign-off**, even when the agent wrote the whole first draft. Full
lifecycle, numbering, supersede chain, and the "propagate the decision"
checklist: `references/adr.md`.

## Mechanical playbooks

Task creation, changelog updates, weekly checkpoints, retrospectives,
incoming-request triage, post-launch roadmap — each a fixed, small
"when X happens, do Y" procedure. Full playbooks: `references/playbooks.md`.
Template schemas (headers only, fill don't invent): `references/templates.md`.

## Cross-cutting conventions — apply everywhere in this skill

Config resolution (env > config file > default), stdout-by-default with
`--apply`-gated writes, ask-vs-don't-ask tables, BLOCK/WARN/INFO severity
triage, and the citation discipline (never invent an ID/ADR number/service
name — cite file:line or ask) all live in `references/conventions.md` and
apply to every playbook and command below, not repeated per-file.

## References — load on demand

| File | Covers | Load when |
|---|---|---|
| references/spec-driven.md | spec pipeline, spec template, decompose-as-spec-type, WIP-limited flow | starting new work, planning |
| references/review.md | diff-size gates, Ship-Show-Ask tiers, intent reconstruction, whole-service layer-sharded review | any review decision |
| references/adr.md | ADR lifecycle, numbering, supersede, propagate-the-decision checklist | architecture decision with real blast radius |
| references/playbooks.md | create-task, update-changelog, weekly-checkpoint, retrospective, triage-incoming-request, post-launch-roadmap | one of these events happens |
| references/templates.md | schema for every artifact this skill writes | filling any artifact |
| references/conventions.md | config resolution, stdout/--apply, ask-vs-don't-ask, severity triage, citation discipline, subagent orchestration patterns | every invocation, cross-cutting |
| references/self-reference.md | self-generated reference artifact — a real ADR (ADR-001), built by this skill's own adr.md template, documenting the reference-artifact directive itself | checking whether current ADR output still matches this skill's own baseline |
| ../../shared/velocity.md | why spec-driven work pays for itself — rework/acceptance-rate data, spec-quality-vs-iterations evidence | justifying spec-first over ad-hoc prompting |
| ../../shared/gitlab-mcp.md | `@zereight/mcp-gitlab` setup, when to use it vs `glab`/raw API | reviewing/triaging MRs and issues on a GitLab-hosted project |
| ../../shared/subagents.md | subagent contract, orchestration patterns, handoff discipline — canonical owner | any PM playbook fanning out subagents |

## Handoff to execution

This skill PLANS. To autonomously DRIVE a plan to done — decompose into
verifiable phases, run them under one self-continuing `/goal` with per-phase
verify, 3-strike recovery, and a final audit against this plan — hand off to
`impulse-goal`. A spec/ROADMAP written here is exactly what impulse-goal consumes
as its Stage 1 input; it reuses the decomposition instead of re-asking.
Planning is here; the execution engine is there.

## Boundaries

- Correctness/security/perf/AI-typical-bug review on a diff → `/impulse-review`. This skill decides review *cadence and scale* (Ship-Show-Ask tier, whole-service audit), not line-level findings.
- Autonomously executing a plan to completion (phase loop, retry, audit) → `impulse-goal`. This skill writes the plan; impulse-goal drives it.
- Doc formatting (Obsidian syntax, properties, callouts) → `impulse-md-generator`; this skill decides *what* gets written, that skill decides *how* it's formatted.
- A status report / retro / incident write-up / plan meant to ship as a standalone shareable HTML file rather than an Obsidian note → `impulse-artifact`. Same split: this skill decides what it says, impulse-artifact decides how it renders.
- Maintaining the Obsidian vault this skill's specs/ADRs/playbooks live in — folder taxonomy, MOCs, vault health, Canvas/Bases → `impulse-wiki`. This skill decides what gets written; impulse-wiki decides where it lives and keeps the vault navigable.
- Prose voice on any generated doc → `impulse-humanizer`'s automatic doc-generation trigger — reports/ADRs/retros read like a person wrote them.
- Architecture-decay patterns *inside a diff* (hot partition keys, sync chains, nanoservices) → `impulse-review`'s `arch:` tag; this skill's ADR practice governs the *decision record*, not the pattern-catching.
- Never invents facts. Ask or cite. `--apply` required before any file write; stdout is the default.
