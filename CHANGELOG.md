# Changelog

## [1.1.0] - 2026-08-15

- **CI/CD research round (4 parallel web-research agents: GH Actions
  advanced, GitLab CI, elite deploy practices, pipeline speed):**
  - `impulse-devops/references/ci.md` extended `DO-CI8`–`DO-CI15`:
    concurrency groups (cancel-in-progress on PR, never deploy),
    top-level `permissions: {}`, SHA-pinned third-party actions
    (tj-actions compromise) + actionlint/zizmor, `timeout-minutes`
    everywhere (6h default trap), the caching stack (setup-* built-ins,
    GOCACHE, buildx gha→registry, the cache-mount ephemeral-runner
    trap), 10-minute PR budget with fast-fail structure and sharding,
    runner economics (ARM ~37% cheaper, self-hosted never public),
    rulesets + merge-queue contention threshold.
  - **New `impulse-devops/references/gitlab-ci.md`** (`DO-GL1`–`DO-GL12`):
    `workflow:rules` duplicate-pipeline dedup, `rules:` over deprecated
    `only/except`, `needs:` DAG + `interruptible`, cache-vs-artifacts
    semantics, DinD buildx over archived kaniko, FASTZIP/GIT_DEPTH speed
    flags, `extends:`/`!reference`/components reuse, protected variables
    + protected refs, `id_tokens:` OIDC (CI_JOB_JWT removed 17.0), fork
    MR pipeline exposure, `environment:`+`resource_group:`+honest manual
    gates, SSH deploy/release/runner choice. Reference YAML skeleton
    included.
  - `deploy.md` gains "How elite teams ship": DORA 2024 elite numbers
    translated to the no-k8s bar, deploy≠release + feature-flag ladder
    with expiry discipline, Traefik-WRR canary feasibility with the
    honest low-traffic caveat + transferable auto-rollback thresholds,
    Friday-freeze cargo-cult callout, deploy annotations
    (Grafana/Sentry), elite anti-pattern list.
  - `shared/rule-spine.md`: 8 new DO-CI rows + 12-row DO-GL section;
    `check-sync.js` SPINE_PARITY tracks gitlab-ci.md; impulse-review's
    reference table loads gitlab-ci.md for `infra:` findings; devops
    description gains GitLab/speed/flag triggers.

- **Five-pass error hunt + upgrade round (4 parallel auditors: JS code,
  cross-reference facts, routing quality, improvement backlog):**
  - **Parser bug, pre-existing, all 3 copies** (`check-skills.js`,
    `install.js`, `check-token-hygiene.js`): the folded-description regex's
    `\s*` consumed the newline, so every `>-`/`>` skill description was
    parsed as its FIRST LINE only — length caps and trigger checks ran
    against a fragment. Regex restricted to horizontal whitespace; folded
    collection now stops at the first unindented line instead of splitting
    mid-prose at any `word:`.
  - Hook hardening: statusline core-detection now real-JSON-parses config
    via node (grep false-matched nested/string `"core": false`, byte-cap
    missed the key in grown configs); PowerShell statusline uses a strict
    boolean check; `impulse-subagent.js` no longer `process.exit(0)`s
    right after a pipe write (Windows truncation) and strips BOM before
    parsing `agent_type`; flag/config writes are atomic (tmp+rename);
    `/impulse-backend blitz please` (trailing words) now works; the
    deactivation confirm skips the meter.
  - `MARKER_RE` (+`--`) now matches SQL comments — `.sql` in SCAN_EXT was
    dead; `impulse-debt.js` lowercases extensions (parity with the
    write-time hook); BOM-strip + error handling in `check-versions.js` /
    `bump-version.js`; `install.js` treats a stray skills/ dir as a
    per-skill failure, not a run abort.
  - New `scripts/check-anchors.js` (CI gate): resolves all `§ Heading`
    cross-references against real headings (fuzzy prefix, numbered/letter
    labels and vendored template packs skipped).
  - `check-skills.js`: descriptions must carry a trigger surface
    ("Triggers:"/`Use when`); CI adds check-anchors, advisory
    check-token-hygiene, and new `hooks/impulse-instructions.test.mjs`
    payload tests (`node --test`).
  - Core ruleset +2 lines (mirrored in impulse-core SKILL.md, 2 new sync
    anchors): stop-at-done, no drive-by edits — re-expressed from
    caveman's verify-and-stop / surgical-patch (already in Lineage).
  - `impulse-goal` now speaks `shared/memory.md`: `.impulse/memory/`
    checked first in Stage 0 preload; run end writes the Tier 2
    fixed-field session entry instead of a parallel memory home.
    `impulse-systematic-debug` persists cross-session hypothesis logs the
    same way. `hardening-go.md` zero-downtime migrations gains
    rollback-before-forward and contract-separately-authorized rules
    (re-expressed from caveman's migration skill).
  - Routing: impulse-goal description de-workflowed (documented bug
    class: agent follows the summary, skips the body); trigger surface
    widened for core/shrink/legacy/debt/artifact/ai/mobile; router gains
    frontend-vs-artifact, devops-vs-security, backend-vs-legacy-migration
    disambiguation pairs; frontend's overbroad one-word triggers
    qualified.
  - Fact fixes: `subagents.md` no longer cites a nonexistent
    sprint-planning playbook; USAGE.md/USAGE.en.md config lists gain
    `core`.

- **New always-on master layer `impulse-core`**: `coreRuleset()` in
  `hooks/impulse-instructions.js` (engineering spine + token economy)
  injects on every `SessionStart` and `SubagentStart` with or without a
  domain mode — caveman-style persistence for the suite's two universal
  disciplines. Readable owner: `skills/impulse-core/SKILL.md`. Switches:
  `/impulse-core on|off` (durable via config `"core"` key), env
  `IMPULSE_CORE=0`; `stop impulse` now turns off domain modes only.
  Statusline shows `[IMPULSE:CORE]` when no domain mode is active
  (bash + PowerShell). `impulse-validate-write.js` marker rot-check now
  runs whenever core is on, not only under a domain mode. Five new
  `check-sync.js` anchors pin `coreRuleset()` to the SKILL.md.
- Manifest descriptions: stale "22 skills" count dropped (authoring.md
  no-counts rule), core layer named.
- **Five-auditor conflict/wiring audit applied across the suite**:
  - Secrets delivery conflict resolved: `impulse-backend/references/
    baseline.md` now defers the delivery mechanism to `impulse-security/
    references/secrets.md` (env = local-dev floor only) instead of
    "secrets via env" flat.
  - Rate limiting conflict resolved: `deps.md`'s platform-primitive table
    now splits coarse edge (Traefik) from mandatory per-user/per-key app
    middleware (`impulse-security/references/rate-limit.md` owns).
  - JWT rule ownership: backend `security-checklist.md` row is now
    detector-only, rule text owned by security `auth.md`; `auth.md`'s
    dangling "impulse-frontend token-storage finding" citation replaced
    with the standalone rule.
  - Theme/bounce scope notes: `impulse-artifact` names its dark-mode
    override of frontend's per-project theme rule; `impulse-mobile`
    cross-cutting states frontend's no-bounce ban is web-only.
  - Retro artifacts one-home rule: pm `playbooks.md` retrospective +
    `shared/memory.md` both state handover/lesson live in EITHER memory
    tiers or the docs tree, never both.
  - Router + help updated for impulse-core (routing row, off-semantics,
    config key, `[IMPULSE:CORE]` badge, `/impulse <mode>` documented);
    shrink's tag pointer fixed to `impulse-review/references/tags.md`;
    goal's reference table row repaired.
  - Wiring: backend SKILL.md gained a pre-done self-check line (baseline
    done-when + carve-outs); `shared/subagents.md` pointers added to
    brainstorm, shrink, goal, review's process doc.
  - Hook fixes: `/impulse <mode>` with no active domain now reports
    instead of silently discarding the mode; `/impulse-core on|off`
    reports config-write failure; resume path re-injects the core
    ruleset (it may have been enabled mid-previous-session);
    `authoring.md`'s ~120-line reference target marked as drafting
    target, not audit threshold.

- New `shared/token-hygiene.md`: named anti-patterns (N-Skill Trap,
  Rule-File Novel, Unscoped Rule, Duplication Sediment) with numeric
  thresholds, cheap-default/expensive-opt-in convention, compress-then-
  verify checklist gate, never-load-raw-bulk-data rule.
- New `shared/memory.md`: tiered (index/session/notes) cross-session
  project memory convention — 50-line index cap, append-only session log,
  redact-before-write, progressive index-then-detail read order. No DB,
  no daemon.
- `authoring.md`: reference-link load-condition annotation, filler-file
  ban, gating-language phrase bank, self-audit-before-shipping step.
- `subagents.md`: no-raw-transcript rule, structure-before-content read
  ordering.
- `context7.md`: REST-transport alternative to the MCP server, with
  honest trade-off (loses structured resolution, drops the standing MCP
  schema cost).
- `impulse-project-management/references/playbooks.md`: new `ship-gate`
  playbook — six-category evidence table gating any "done" claim.
- README: cavemem added to Скиллы-компаньоны; Lineage table extended for
  all of the above.
- Round 2: `memory.md` corrected/extended — native Claude Code `MEMORY.md`
  platform cap (200 lines/25KB) cited, orphan-link check, recall
  discipline (verify a Tier 3 fact against current repo state before
  acting on it).
- Round 2: `token-hygiene.md`'s Rule-File Novel and Unscoped Rule entries
  corrected after `scripts/check-token-hygiene.js` was run against the
  real suite and falsified the original ~800-token/`shared/*.md` framing
  (every real file exceeded it — the always-paid surface is narrower:
  skill descriptions + the compact ruleset, not on-demand protocol docs).
- New `scripts/check-token-hygiene.js`: advisory (non-gating) report —
  skill-description char count vs. cap, `impulse-instructions.js` line
  count, Jaccard word-overlap duplication across `shared/*.md` +
  `references/*.md`.
- `scripts/check-skills.js`: `BARE_MD_ALLOWLIST` extended for new
  illustrative filenames introduced by the above (`index.md`,
  `YYYY-MM-DD-slug.md`, `shipgate.md`, `QUICKSTART.md`,
  `INSTALL_NOTES.md`, `requests.md`).
- Round 3: `velocity.md` — new search-escalation ladder, re-read/path-
  spelling waste patterns, session-hygiene rules (batch calls, don't
  re-poll unchanged state, scratch-file discipline), prompt-cache TTL
  section with measured 54/36/10% cache-read/cache-write/output cost
  breakdown.
- Round 3: `subagents.md` — delegate-when-explore-much-greater-than-answer
  sizing test for the exploratory-delegation case.
- Round 3: `memory.md` — Tier 2 session-log fixed-field entry shape
  (Goal/State/Decisions/Files/Validation/Risks/Next).
- Three-round search/integrate cycle complete (`references/token-economy-
  skills/`: 12 round-1 clones + 7 round-2 + 2 round-3, plus targeted API
  pulls where a full clone would have vendored an oversized registry
  mirror). Non-applicable candidates (LLMLingua-2 local compression,
  skills-as-mcp, skillkit's static budget routing, near-duplicate memory
  skills) explicitly rejected with reasons in-session rather than forced
  into the suite.

## 1.0.6

- impulse-artifact: `self-reference.html` is now the canonical visual
  baseline for every artifact (workflow step 2); the vendored Anthropic
  gallery is demoted to secondary (structure/density/tone only) and
  `palette.md` to component-pattern fallback. Fixes artifacts coming out
  in Anthropic-corpus style instead of the suite's own.

## 1.0.5

- Suite renamed to **impulse**. History starts here.
