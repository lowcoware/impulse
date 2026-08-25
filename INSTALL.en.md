[Русский](INSTALL.md) · **English**

# Install — impulse across CLIs

This suite is authored as native `SKILL.md` + `references/*.md` — the
agentskills.io format. Every CLI below speaks this format **natively**, so
installing skills is file placement, not conversion.

There's no single universal install path — each platform has its own,
because the native mechanisms are genuinely different: Claude Code uses a
marketplace plugin with hooks; Cursor uses `.mdc` rules with `alwaysApply`;
Codex uses `hooks.json` with per-turn injection via `UserPromptSubmit`;
Antigravity uses a plugin bundle with `rules/`; Gemini CLI/Qwen Code/Goose
have their own `extensions install`/`plugin install`; OpenCode/Kilo Code
use `AGENTS.md`/an `instructions` array in config. Below, each platform
gets its own section, leading with its own native method first. A
cross-platform skill installer (`npx skills` / `scripts/install.js`)
exists and works, but it's a **fallback**, not the primary path — it
places only the bare skill level, without a given platform's machinery
(hooks, always-on ruleset injection, and so on); the "Cross-platform
fallback" section sits at the bottom of the file, after every platform
section.

Some platforms read a neighboring tool's directories natively, with zero
extra steps, if the suite is already installed for another tool in the
same project or home directory — this is noted in each platform's section
where it applies (OpenCode, Goose, and Gemini CLI read `.claude/skills/`
and/or `.agents/skills/`).

## Update

**Verified:** 2026-07-18. Source: `code.claude.com/docs/en/plugin-marketplaces`,
`vercel-labs/skills` README.

One thing to know first: this repo's history is intentionally a **single
commit, force-pushed on every release**. A plain `git pull` in a clone will
therefore fail with non-fast-forward. Update a clone with:

```
git fetch origin && git reset --hard origin/main
```

Per install path:

**Claude Code native plugin (marketplace):**

```
/plugin marketplace update impulse
/plugin update impulse@impulse
```

Restart the session, verify with `/impulse-help`. Details:

- Marketplace added from **GitHub**: the refresh pulls the repo; because of
  the force-pushed history the pull fails non-fast-forward and Claude Code
  falls back to re-cloning from scratch — that's expected and fine, the
  manual commands above are the reliable path.
- Marketplace added from a **local path** (the install commands in the
  Claude Code section use one): update the local clone first (`git fetch`
  + `reset --hard` above), then run the two `/plugin` commands.
- Update detection keys on `version` in `.claude-plugin/plugin.json` — if
  the version you already have matches, `/plugin update` **skips the
  plugin even when file contents changed**. Releases of this suite bump
  that version; if yours seems stuck, check whether the version actually
  changed upstream, and as a last resort `/plugin uninstall
  impulse@impulse` + `/plugin install impulse@impulse`.

**Via `npx skills`:**

```
npx skills update        # update all installed skills (interactive scope prompt)
npx skills update -y     # non-interactive, auto-detects scope
npx skills update impulse-backend impulse-frontend   # only specific skills
```

Re-running `npx skills add lowcoware/impulse -a <agent>` also refreshes
to the latest state.

**Gemini CLI extension:** `gemini extensions update impulse` (or
`--all`). Updates pull from the install source; if the force-pushed
history trips it up, `gemini extensions uninstall impulse` + a fresh
install is the clean path.

**Qwen Code extension:** `qwen extensions update impulse` — Qwen Code
keeps a copy of the extension, so GitHub changes don't arrive without an
update.

**Goose plugin:** `goose plugin update impulse`; or install once with
`goose plugin install --auto-update <url>` and Goose checks for updates
itself before loading plugin skills (an update replaces the installed
copy wholesale, so the force-pushed history doesn't bother it).

**Repo installer (`scripts/install.js`):** update the clone, re-run the
same install command — it's idempotent and overwrites this suite's own
folders in place, never touching siblings:

```
git fetch origin && git reset --hard origin/main
node scripts/install.js --target=<t> [--scope=user] --apply
```

**Manual copy:** re-run the same copy commands from the target's "Manual
fallback" — same overwrite-in-place semantics.

## What never ports to any target but Claude Code's native plugin

The suite has three layers: **content** (routers + references — installs
everywhere), the **always-on core layer** (`impulse-core`: engineering
discipline, verification, token economy — this ports to 8 of the 9
harnesses through each one's own native mechanism; that platform's
section spells out exactly how: hooks on Claude Code/Codex/Cursor, a
static rules file/`AGENTS.md` on the rest), and **mode machinery**,
available only in the Claude Code plugin: a mode flag on `SessionStart`,
the full `impulse-backend`/`impulse-frontend` dynamics (blitz/hardcore)
on `UserPromptSubmit`, propagation to `SubagentStart`, a mode badge in
the statusline, and `/impulse-backend [mode]` / `/impulse-frontend
[mode]` as a *stateful mode switch*. This machinery is wired through the
`hooks` block in `.claude-plugin/plugin.json` and only loads when the
suite is installed as a **native plugin** (the marketplace path) — no
other target has it, regardless of whether that target has its own core
layer.

What does work everywhere, including a bare skill copy with no core
layer: any CLI's own router still attaches a skill by matching your
prompt against its frontmatter `description` (the same trigger phrases
each SKILL.md lists). There's no `blitz`/`medium`/`hardcore` mode flag
outside the Claude Code plugin, but naming the mode in your prompt gets
the same effect — e.g. "review this Go service in hardcore mode" still
pulls in `impulse-backend`'s hardcore guidance, it's just not tracked as
session state or shown on a statusline.

## Claude Code

**Verified:** 2026-07-04. Source: `code.claude.com/docs/en/plugins-reference`,
`/plugin-marketplaces`, `/skills`.

**Prerequisites:** Claude Code CLI installed.

**Via `npx skills`:** `npx skills add lowcoware/impulse -a claude-code` — the
bare level (no hooks/statusline/modes; for those use the native plugin below).

**Install — native plugin (primary path):**

```
/plugin marketplace add <path-to-this-repo>
/plugin install impulse@impulse
```

This is the only path that wires hooks, the statusline badge, and the
`/impulse-backend [mode]` / `/impulse-frontend [mode]` mode switch. Restart the
session; verify with `/impulse-help`.

**Install — installer (bare skill copy):**

```
node scripts/install.js --target=claude --apply
```

Project scope by default (`.claude/skills/` under the current directory —
pass `--project-dir=PATH` to target a different project); add
`--scope=user` to install into `~/.claude/skills/` instead (available to
every project, no per-project trust dialog).

**After restart, expect:** all 23 skills listed under Claude Code's skills
(project scope shows a one-time trust dialog; user scope does not); each
still triggers on its own description whenever your prompt matches, same as
the plugin path. No hooks, no statusline badge, no stateful mode switch (see
above).

**Manual fallback** (no Node, or you'd rather see the commands):

```
robocopy skills <project>\.claude\skills /E
robocopy shared <project>\.claude\impulse-shared /E
```

(POSIX equivalent: `cp -r skills/. <project>/.claude/skills/` and
`cp -r shared/. <project>/.claude/impulse-shared/`.)

**Uninstall:**

```
node scripts/install.js --target=claude --apply --uninstall
```

Native plugin: `/plugin uninstall impulse@impulse`. Manual: delete
`<project>\.claude\skills\impulse-*` and `<project>\.claude\impulse-shared\`.

## Cursor

**Verified:** 2026-08-26. Source: `docs.cursor.com/docs/rules`,
`docs.cursor.com/docs/agent/hooks` (hooks are BETA, added in Cursor 1.7,
October 2025).

The IDE and the CLI share the same rules engine (`.cursor/rules/`,
`AGENTS.md`) — the section below is unified for both surfaces, with
CLI-specific differences called out separately.

**Prerequisites:** Cursor (IDE or CLI) with `.cursor/rules/` support —
this is baseline functionality, nothing extra to enable. The optional
hooks part needs Cursor 1.7+, and Agent Skills needs to be enabled for
the skills themselves (see below).

### impulse-core: the persistent layer (primary path)

Cursor reads `.mdc` files from `.cursor/rules/` (project root, nesting
allowed) — YAML frontmatter plus a markdown body. The `alwaysApply: true`
field injects the rule into **every** session unconditionally;
`description`/`globs` don't come into play in this mode. Of every
documented rule-delivery mechanism, this is the most reliable one — it
works identically in the IDE and the CLI.

**Install — one command (project scope):**

```
cp cursor-plugin/rules/impulse-core.mdc .cursor/rules/impulse-core.mdc
```

The rule attaches on the next session — a restart isn't required for the
CLI; the IDE sometimes needs the chat reopened.

**On global/user scope:** a separate `~/.cursor/rules/` directory that
Cursor is guaranteed to pick up as user-level `alwaysApply` rules for
every project is **not confirmed** by the documentation — Cursor only
offers User Rules through the settings UI (Settings → Rules), with no
documented on-disk file path. So this install method is
**project-level only**: copy `impulse-core.mdc` into every project where
you want the persistent layer. If you want the same rules across all
projects at once, paste the text into Settings → Rules by hand through
the UI — that's a separate, non-file mechanism this installer doesn't
touch.

`AGENTS.md` at the project root is also picked up automatically and
stacks with `.cursor/rules/` (additively, not instead of) — if the
project already has an `AGENTS.md`, `impulse-core.mdc` doesn't conflict
with it, the two just add up.

The legacy single `.cursorrules` file still loads, but it's absent from
the current documentation as a supported mechanism — don't use it for a
new install.

**Uninstall:**

```
rm .cursor/rules/impulse-core.mdc
```

### Skills (23 total) — a separate mechanism

impulse-core (this section) and the skills themselves are independent
installs — set up both. Skills:

```
npx skills add lowcoware/impulse -a cursor
```

(or `node scripts/install.js --target=cursor --apply` — the offline
fallback, more in the "Cross-platform fallback" section below). The
command reuses `.claude/skills/` (Cursor reads this directory directly,
natively, for compatibility — there's no separate `.cursor/skills/` copy,
and none is needed).

**Correction to an earlier phrasing:** elsewhere in this document, other
targets are described as having "no hooks" — that's no longer true for
Cursor, it does have hooks now (see the next section, BETA status).

### hooks.json — optional per-session reinforcement (BETA)

Cursor 1.7+ supports `hooks.json` (`.cursor/hooks.json` for project
scope, or `~/.cursor/hooks.json` for user/global scope — this path is
confirmed by the documentation, unlike User Rules above). The
`sessionStart` hook can return an `additional_context` field, which the
agent folds into the conversation.

**An important CLI caveat:** `sessionStart` is confirmed to fire in both
the IDE and the CLI. But `beforeSubmitPrompt` — the only hook that
resembles a "real" per-turn trigger (firing on every message rather than
once per session) — is, by Cursor's own confirmation on their forum,
**unreliable in CLI non-interactive mode**. So `hooks.json` here gives
only a one-time boost at session start, not per-turn injection — the
primary always-on mechanism stays `.mdc` with `alwaysApply: true` above;
hooks supplement it, they don't replace it.

**Install (project scope):**

```
cp cursor-plugin/hooks/hooks.json .cursor/hooks.json
cp cursor-plugin/hooks/impulse-inject.js .cursor/impulse-inject.js
```

`impulse-inject.js` is self-contained — the same ruleset text is baked
in, with no external dependency on the rest of the repo. To disable: set
`IMPULSE_CORE=0` in the session environment (the hook fails openly, with
no `additional_context`), or just delete both files.

**Uninstall:**

```
rm .cursor/hooks.json .cursor/impulse-inject.js
```

### Summary

- `.mdc` + `alwaysApply: true` — install this always, it's the primary
  mechanism, project-level, high confidence.
- `hooks.json` — install it optionally, as a session-start boost, BETA,
  not a replacement for `.mdc`.
- Skills — a separate install, see the `npx skills` note above.

## Codex

**Verified:** skills — 2026-07-04 (sources unchanged:
`developers.openai.com/codex/skills`, `/codex/guides/agents-md`,
`/codex/config-reference`, `github.com/openai/skills`). The hooks
mechanism and IDE unification — a research pass on 2026-08-26, sources
`learn.chatgpt.com/docs/hooks` (direct hooks documentation, high
confidence) and `/codex/config-reference` (`developer_instructions`); see
the confidence level for each point in the text below.

**Prerequisites:** the OpenAI Codex CLI, and/or its IDE extension (VS
Code, JetBrains) — both use the same configuration system (`config.toml`,
`AGENTS.md`, hooks); the official docs say directly that "Codex agents in
the app inherit the same configuration as the IDE extension and CLI." So
one section covers both, with one caveat about hooks in the IDE — see
below.

**Skills:** `npx skills add lowcoware/impulse -a codex` or `node
scripts/install.js --target=codex --apply` (project scope
`.agents/skills/`, user scope `~/.agents/skills/`). Codex hard-enforces
frontmatter caps, and the installer validates them **before** copying
anything: `name` ≤ 64 characters, kebab-case, matching the skill's
directory name; `description` ≤ 1024 characters — a violation is
reported by name and fails the run (exit code 2) rather than being
silently truncated. See "Validation findings" below for the suite's
current result (clean). Manual fallback: `robocopy skills
<project>\.agents\skills /E` + `robocopy shared
<project>\.agents\impulse-shared /E`. Uninstall: `node scripts/install.js
--target=codex --apply --uninstall`.

**New — `impulse-core` via hooks (primary path for the master layer):**

Beyond skills and `AGENTS.md`, Codex has a separate hooks system:
`SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`,
`PreCompact`/`PostCompact`, `PreToolUse`, `PostToolUse`,
`SubagentStart`/`SubagentStop`. `UserPromptSubmit` is a real per-turn
hook: it fires before **every** turn, unlike `AGENTS.md`, which is
concatenated (root -> cwd, 32 KiB cap) once at session start and never
re-read. The `SessionStart`, `SubagentStart`, and `UserPromptSubmit`
hooks can print arbitrary text to stdout — Codex adds it as this turn's
extra "developer context" (or the hook can return JSON with an
`additionalContext` field; the default cap is ~2500 tokens, configurable
via `additionalContextLimit`). `codex-plugin/impulse-core/inject-core.js`
is exactly that script: it prints the master-layer ruleset to stdout and
exits with code 0, no dependencies.

Hooks sit behind the `features.hooks` feature flag (off by default) and
are configured via a `hooks.json` file (or an inline `[hooks]` table in
`config.toml`) at one of these paths: `~/.codex/hooks.json`,
`~/.codex/config.toml`, `<repo>/.codex/hooks.json`,
`<repo>/.codex/config.toml`. For the project-local layer
(`<repo>/.codex/...`), Codex needs to trust `.codex/` as a directory —
usually confirmed via an interactive prompt the first time Codex runs in
that project. The global layer (`~/.codex/...`, used below as the
primary path) doesn't need that — it's Codex's own home directory, not
an untrusted project directory.

Install (global scope, the simplest path):

```
mkdir -p ~/.codex
cp -r codex-plugin/impulse-core ~/.codex/impulse-core
```

`hooks.json` from `codex-plugin/impulse-core/` isn't its final location —
it's the content you need to place (or merge) into one of the discovery
paths above. If `~/.codex/hooks.json` doesn't already exist:

```
cp ~/.codex/impulse-core/hooks.json ~/.codex/hooks.json
```

If the file already exists and has other hooks in it, don't overwrite it
— instead, add the `SessionStart` and `UserPromptSubmit` entries from
`codex-plugin/impulse-core/hooks.json` into the matching arrays by hand
(the structure is a list of objects with `hooks: [{type: "command",
command: "..."}]`, as in the source file). The command in both hooks is
`node "$HOME/.codex/impulse-core/inject-core.js"`; if your `CODEX_HOME`
is overridden (not `~/.codex`), or you're installing at project scope,
adjust the path for your case before copying.

Turn on the flag — add this to `~/.codex/config.toml`:

```toml
[features]
hooks = true
```

**Verify after install:** `node ~/.codex/impulse-core/inject-core.js`
should print the ruleset to stdout with no errors (this checks the
script itself, outside Codex). To verify the hook is actually wired up,
start a new Codex session and ask directly, e.g. "what impulse-core
rules are currently active": the answer should quote specific points
(the ladder, verification, token economy), not vague generalities — if
it does, the `UserPromptSubmit` hook fired and will re-inject on every
turn.

**Uninstall:**

```
rm -rf ~/.codex/impulse-core
```

and manually remove the `SessionStart`/`UserPromptSubmit` entries
pointing at `impulse-core/inject-core.js` from `~/.codex/hooks.json` (or
delete the whole file if it had nothing else of yours in it).

**A simpler, static alternative — `developer_instructions`:**

`config.toml` supports a string field `developer_instructions`, which
"injects additional developer instructions into the session" — no
feature flag, no hooks plumbing. The catch: it's static, set once at
session start (like `AGENTS.md`), not on every turn — if per-turn
injection isn't critical, this is the simpler path:

```toml
developer_instructions = """
<ruleset text from codex-plugin/impulse-core/inject-core.js — the same text the
hooks path above injects, copied by hand>
"""
```

The ruleset text is deliberately not duplicated directly in this file —
there's a single source of truth,
`codex-plugin/impulse-core/inject-core.js`, kept in sync by
`scripts/check-sync.js`.

**Open question — hooks parity in the IDE extension:** the official
documentation confirms the IDE extension (VS Code, JetBrains) uses the
same configuration system as the CLI, but does NOT explicitly confirm
that hook events (in particular `UserPromptSubmit`) fire in IDE sessions
identically to the CLI — as of this research pass this stays
unconfirmed, not deliberately disproven. If you're installing this
specifically for the IDE extension, verify empirically with the same
"what impulse-core rules are currently active" question in an IDE
session; if the hook doesn't fire, `developer_instructions` (the static
alternative above) is a working fallback, since it's part of
`config.toml`, which the IDE definitely reads.

**What doesn't port:** `AGENTS.md` stays Codex's separate,
core-supported context-injection mechanism (concatenated root -> leaf,
32 KiB default cap) — the hooks path above neither replaces it nor
generates one; if you want the suite's guidance force-loaded rather than
routed, add your own pointer line to your project's `AGENTS.md` by hand,
same as before. Same as every other non-Claude-Code target: only the
core layer (`impulse-core`) injects always-on — mode-aware
`impulse-backend`/`impulse-frontend` dynamics (blitz/hardcore) aren't
ported here yet (see `shared/multi-harness-robustness.md`);
`/impulse-core off` as a durable command is a Claude-Code-specific
config file and doesn't work as-is here.

## Antigravity

**Verified:** 2026-08-24, but treat it as **young and volatile** —
Antigravity's own skill path has already been renamed once during its
public life (`.agent/` -> `.agents/`), and the current paths should be
treated as "likely stable, not frozen." Before relying on this for
anything beyond the current release, re-check `antigravity.google/docs/skills`
(also `/docs/rules-workflows`, `/docs/plugins`, `/docs/cli/plugins`,
`/docs/cli/gcli-migration`). `.agent/` (singular) is supported as a
back-compat alias if you find an older install using it.

**Four surfaces, one engine.** "Google Antigravity" isn't a single
product — it's one shared engine under three consumer-facing surfaces
plus a developer SDK (the SDK is an embedding library, not an install
target, and isn't covered here):

- **Antigravity IDE** — an editor with an agent built in, project/workspace scope.
- **Antigravity 2.0** — a standalone desktop app (released ~May 19,
  2026), agent-first, not tied to an IDE or a specific repo.
- **Antigravity CLI (`agy`)** — a terminal client, the same engine.

All three read the same rules-and-plugins convention — `.agents/rules/`
(workspace), `~/.gemini/GEMINI.md` (global), `AGENTS.md` (project root or
home dir, a shared cross-tool file read alongside `.agents/rules`) —
this isn't an IDE-specific feature, it's a workspace/global-scoped
mechanism of the engine itself. Of the three surfaces, plugin bundles
(`agy plugin install`) are documented only for the CLI; the IDE and 2.0
pick up the same bundle if it's placed at one of the paths below, but the
commands for managing it (`plugin list/enable/disable`) are
CLI-specific.

**Prerequisites:** any of the three surfaces — Antigravity IDE,
Antigravity 2.0 (desktop), or Antigravity CLI (`agy`). The plugin
fallbacks in this section target the CLI; for the IDE/2.0, see the
manual file-placement block below.

**Install — Antigravity plugin (primary path, CLI):**

The Antigravity CLI installs plugins with:

```
agy plugin install lowcoware/impulse
```

Alongside: `agy plugin list` shows what's installed, `agy plugin enable
impulse`/`agy plugin disable impulse` toggle it without deleting, `agy
plugin uninstall impulse` removes it. The suite is packaged as a plugin
bundle (`plugin.json` at the root plus a `skills/` folder — Antigravity
reads `skills/<name>/SKILL.md`), so it installs as-is.

If your CLI build wants a full URL, use `agy plugin install
https://github.com/lowcoware/impulse`. A manual fallback without the
command — drop the bundle into the plugins directory and the CLI picks
it up on startup:

- workspace: `.agents/plugins/impulse/` at your workspace root;
- global: `~/.gemini/antigravity-cli/plugins/impulse/` (on some builds,
  `~/.gemini/config/plugins/impulse/`).

```
git clone https://github.com/lowcoware/impulse .agents/plugins/impulse
```

Confirm the `agy plugin install` argument format and the exact plugins
directory against `antigravity.google/docs/cli/plugins` — the interface
is young (see the warning above).

**Rules (`rules/impulse-core.md`) — new in this revision.** The bundle
now carries `rules/impulse-core.md` at its root, alongside `skills/`.
For the CLI that means: the same `agy plugin install lowcoware/impulse`
that installs the skills also places this file — no extra step needed,
it's automatically part of the plugin install already described above.

For the IDE and Antigravity 2.0, the `agy plugin` commands aren't
available — you need to place the file by hand at one of the paths the
engine reads as rules:

```
robocopy rules <project>\.agents\rules /E
```

(or copy `rules\impulse-core.md` directly into `.agents/rules/` of your
workspace; globally, append its text to `~/.gemini/GEMINI.md`, or place
it as `AGENTS.md` at the project/home root).

**Important — "Always On" activation isn't automatic.** The Antigravity
rule-file format supports four activation modes: Manual, Always On,
Model Decision, Glob — but the exact frontmatter YAML field name that
sets Always On programmatically wasn't confirmed by the documentation as
of this research. `rules/impulse-core.md` ships **without** frontmatter,
to avoid guessing at the schema. After installing (through any surface —
IDE, 2.0, CLI), open the Rules UI/picker for your workspace and manually
set this file's mode to **Always On** — otherwise the rule won't attach
on every turn.

**Hooks (`hooks.json`) — documented, but don't rely on them for
always-on behavior.** Antigravity has a documented hooks system with
three categories (Inspect, Decide, Transform) — see
`antigravity.google/docs/plugins/`, `/docs/cli/plugins/`. Per an
independent forum report (August 2026, unconfirmed by Google), hooks in
practice fire **only in the CLI**: a controlled test on Antigravity IDE
2.1.1 and Antigravity 2.0 desktop 2.5.0 produced zero hook invocations,
even though the documentation describes hooks as available on all
surfaces. The exact hook event names (in the vein of
PreToolUse/PostToolUse) come from that forum thread's title, not from an
official schema. This bundle deliberately does **not** ship a
`hooks.json` — it's a possible future improvement for the CLI, not a
current rule-delivery mechanism; don't rely on hooks for anything beyond
the CLI yet.

**Install — skills without the plugin wrapper (alternative):**

`npx skills add lowcoware/impulse -a antigravity`, or
`node scripts/install.js --target=antigravity --apply`.

Project scope installs to `.agents/skills/<skill>/` — **the same
directory Codex uses at project scope.** If you've already run
`--target=codex --apply` in this project, that install already covers
Antigravity too — the installer detects and reports this rather than
duplicating anything. `--scope=user` installs to
`~/.gemini/config/skills/<skill>/`, which is Antigravity-specific (not
shared with Codex). This install path does not place
`rules/impulse-core.md` — with it, place the rules by hand using the
block above.

Antigravity shares the same base skill spec as Codex, so the installer
applies the same `name`/`description` validation described in the Codex
section above.

**After restart, expect:** all 23 skills available, auto-attaching by
description (across all three surfaces — IDE, 2.0, CLI). If installed
via `agy plugin install`, `rules/impulse-core.md` is also in place at the
plugin bundle's root — turn on Always On for it via the Rules UI, as
described above. `.agents/rules/*.md` (workspace) / `~/.gemini/GEMINI.md`
(global) and `AGENTS.md` are Antigravity's shared rule-injection paths
(12,000-character cap per file); the installer doesn't generate them
when installing without the plugin wrapper.

**Manual fallback:**

```
robocopy skills <project>\.agents\skills /E
robocopy shared <project>\.agents\impulse-shared /E
```

(user scope: `%USERPROFILE%\.gemini\config\skills\`,
`%USERPROFILE%\.gemini\config\impulse-shared\`; global rules — via
`~/.gemini/GEMINI.md`, see above.)

**Uninstall:**

```
node scripts/install.js --target=antigravity --apply --uninstall
```

Plus, if the rules were installed by hand, remove
`rules/impulse-core.md` (or its copy/inclusion) from `.agents/rules/`,
`~/.gemini/GEMINI.md`, or `AGENTS.md`.

## OpenCode

**Verified:** 2026-07-18. Source: `opencode.ai/docs/skills`, `/docs/plugins`,
`/docs/config`; the `opencode` target in `vercel-labs/skills`
(`github.com/vercel-labs/skills` README, Supported Agents table).

**Prerequisites:** OpenCode CLI with the `skill` tool enabled (on by
default; restrictable via `permission.skill` in `opencode.json`).

**OpenCode has no native `/plugin` command and no GUI/TUI installer** —
unlike Claude Code (`/plugin marketplace add` + `/plugin install`) or
Antigravity (`agy plugin install`). The only officially supported paths
are: an npm package listed in the `plugin` array of `opencode.json`, or
plugin files placed in `.opencode/plugins/` / `~/.config/opencode/plugins/`
(auto-loaded at startup). Unofficial third-party skill-marketplace tools
(`opencode-marketplace` and similar) exist, but those are community
wrappers, not a vendor feature — deliberately left out of this section,
which sticks to paths from OpenCode's own docs.

**Key difference from the other four targets:** OpenCode doesn't route by
`description` at the prompt level — it has a dedicated `skill` tool
instead. The agent sees a list of available skills (name + description)
and decides itself to call `skill({ name: "impulse-frontend" })` when a
description fits the task. Same effect (the skill attaches when relevant),
different mechanism (an explicit tool call, not a system-prompt injection).

**OpenCode reads `.claude/skills/` and `.agents/skills/` natively, at both
project AND user/global scope** — on top of its own `.opencode/skills/`
(project) and `~/.config/opencode/skills/` (global). If the suite is
already installed for Claude Code (`.claude/skills/`) or for
Codex/Antigravity (`.agents/skills/`) in the same project or home
directory, OpenCode **already sees all 23 skills, zero extra steps.**
What follows is the path for OpenCode running on its own, without the
others.

**Via `npx skills` (primary path for a clean OpenCode-only install):**
`npx skills add lowcoware/impulse -a opencode`.

**Install — one command:**

```
node scripts/install.js --target=opencode --apply
```

Project scope installs to `.agents/skills/<skill>/` — the same directory
Codex/Antigravity use at project scope (if either is already installed
here, the installer detects and reports this rather than duplicating).
`--scope=user` installs to `~/.config/opencode/skills/<skill>/`, which is
OpenCode-specific — not shared with Codex/Antigravity.

Frontmatter caps are the same spec as Codex/Antigravity: `name` ≤ 64
characters, kebab-case, equal to the skill's directory name; `description`
≤ 1024 characters. The installer validates with the same code path used
for Codex — the suite already passes clean (see "Validation findings"
below).

**After restart, expect:** all 23 skills available through the `skill`
tool — `skill list` (or your client's equivalent) shows all 23 names with
their descriptions. Attachment happens via an explicit tool call from the
agent, not prompt auto-routing (see the difference above). There's no
event hook for chat injection on every turn (the plugin hook
`experimental.chat.system.transform` doesn't currently work — mutations
from a plugin are silently dropped before reaching the LLM, see GitHub
issues `#17100`, `#17637`, `#27401` in the former `sst/opencode`, now
`anomalyco/opencode`), no statusline, no stateful mode switch — see "What
never ports" above. OpenCode does still have a persistent system-prompt
injection — not via hooks, but via `AGENTS.md`/`instructions`, see the
subsection below.

### impulse-core always-on delivery

impulse-core (the suite's engine layer: engineering discipline,
verification, token economy — see `skills/impulse-core/`) rides on hooks
in Claude Code, which OpenCode doesn't have and isn't expected to get in
working form any time soon (see above on the broken
`experimental.chat.system.transform`). OpenCode has its own native,
working mechanism for this instead — not a hook, but unconditional
loading of a file into the system prompt at session start:

- **`AGENTS.md`** — OpenCode looks for it, walking up from the current
  directory to the project root, plus separately reads a global
  `~/.config/opencode/AGENTS.md`. Both are read unconditionally at the
  start of every session and land in the system prompt — this is
  OpenCode's working always-on channel.
- **`instructions` in `opencode.json`** — an additive array of
  paths/globs/URLs; each file's content is appended to the same
  system-prompt block that `AGENTS.md` fills. This is the right way to
  wire in a file that isn't literally named `AGENTS.md` — such as this
  suite's file.

This suite's file: `opencode/IMPULSE-CORE.md` (at the root of the
`impulse` repo). Two ways to wire it in:

**(a) Via `instructions` in `opencode.json`** — the path is written
relative to `opencode.json`'s own location:

```json
{
  "instructions": ["opencode/IMPULSE-CORE.md"]
}
```

- **Project scope:** if the `impulse` repo is cloned directly at the
  project root (or as a git submodule), the path
  `opencode/IMPULSE-CORE.md` in the project's `opencode.json`
  (`<project>/opencode.json`) works as-is. If the suite's repo lives
  elsewhere, give a path to it relative to the project's
  `opencode.json` (e.g. `../impulse/opencode/IMPULSE-CORE.md`) or an
  absolute path.
- **Global scope** (`~/.config/opencode/opencode.json`, applies to
  every project on the machine): a relative path here is resolved from
  `~/.config/opencode/`, so the simplest option is an absolute path to
  the file in your cloned repo
  (`C:\Users\<user>\Projects\impulse\opencode\IMPULSE-CORE.md` on
  Windows, `/home/<user>/impulse/opencode/IMPULSE-CORE.md` on
  Linux/macOS), or copy the file next to `opencode.json` and reference
  it locally.

**(b) Simpler for most people — paste the content into your own
`AGENTS.md`.** No `opencode.json` edit needed: take the text of
`opencode/IMPULSE-CORE.md` (after the opening paragraph, starting at the
`## impulse-core active — always-on engineering + token discipline`
heading and running to the end) and append it to your `AGENTS.md` — the
project version (`<project>/AGENTS.md`) for one project, or the global
version (`~/.config/opencode/AGENTS.md`) for every session on the
machine. If that `AGENTS.md` already has its own project instructions,
impulse-core just gets appended below them — both blocks are read
together.

Both paths give an identical result: impulse-core's rules end up in the
system prompt of every OpenCode session unconditionally, with no plugin
hooks involved. Domain modes (impulse-backend, impulse-frontend, etc.)
still attach through the `skill` tool, as described above — the
always-on layer doesn't replace or auto-enable them.

## Kilo Code

**Verified:** 2026-08-26. Source: the `Kilo-Org/kilocode` GitHub docs
(`docs/features/custom-instructions` — `kilo.jsonc`'s `instructions`
array, the `.kilo/rules/` convention, global `~/.config/kilo/kilo.jsonc`,
fetched directly) and `kilo.ai` (a 2026 rebrand from `kilocode.ai`; "v7"
was rewritten on the OpenCode engine, with a new standalone `kilo` CLI
alongside the VS Code extension). The skills path below is an
**extrapolation**, not verified directly against Kilo Code — see the
flag in that section.

**A note on this version's age:** "v7" is the OpenCode-engine rewrite
released mid-2026, so as of this check it's a few months old. The config
names and paths here are taken from Kilo Code's official docs as of the
verification date above — if your release is noticeably newer, re-check
`kilo.ai/docs` before installing: an engine that itself recently went
through a rewrite can have its config schema shift faster than a settled
target like Claude Code.

**Prerequisites:** the Kilo Code VS Code extension (v7+) and/or the
standalone `kilo` CLI — both install through `kilo.ai`, with the
specific install/update commands living there (not reproduced here, to
avoid duplicating something the vendor changes faster than this
document). The suite doesn't have a scripted `--target=kilo` in
`scripts/install.js` yet — the install below is manual, like Hermes
Agent's (see its section).

This is the **first install of the suite for Kilo Code** — this section
didn't exist before. What follows covers only the current (v7)
always-on mechanism. The legacy path (a `.kilocoderules` file,
`.kilocode/rules/*.md`) still works in Kilo Code via auto-migration into
the same `instructions` array, but there's no reason to target it: it
exists for backward compatibility with installs that predate v7, and
this install has no such history.

**Install — skills (flag: this path is not directly confirmed for Kilo
Code):**

Kilo Code v7 is built on the OpenCode engine, and so it natively reads
`AGENTS.md` (and `CLAUDE.md`) from the project root with zero config
steps — that part is directly confirmed (see Source above). But exactly
*where Kilo Code places and looks for skills* is something Kilo-Org's
official docs didn't state explicitly as of this check. OpenCode itself
(see its section in this document) natively reads `.claude/skills/` and
`.agents/skills/` at project and user scope through a separate
tool-based mechanism (`skill({ name: ... })`, not a system injection by
`description`). Since Kilo Code is the same engine, `.agents/skills/` is
a plausible candidate by analogy, but **this is an assumption, not a
fact verified against Kilo Code specifically.**

The practical route: if Codex, Antigravity, or OpenCode itself is
already installed in the same project (or home directory), skills are
already sitting in `.agents/skills/` — try Kilo Code with zero extra
steps and ask the agent inside Kilo Code directly ("what skills do you
see"). If the list comes back empty, fall back manually to the same
directory (see below) — it will either get picked up by analogy with
OpenCode, or not get picked up at all, in which case the only confirmed
channel for this target is the `.kilo/rules/` file below plus the native
`AGENTS.md`, which Kilo Code definitely reads.

```
robocopy skills <project>\.agents\skills /E
robocopy shared <project>\.agents\impulse-shared /E
```

**Install — the master layer (always-on `impulse-core`), the headline
feature of this install:**

```
mkdir "<project>\.kilo\rules" 2>$null
copy kilo-plugin\rules\impulse-core.md "<project>\.kilo\rules\impulse-core.md"
```

`kilo.jsonc` at the project root (or `.kilo/kilo.jsonc`) should contain
`.kilo/rules/*.md` in its `instructions` array — that's the default glob
for the idiomatic rules directory, but check your own `kilo.jsonc`: if it
already has `instructions` without a wildcard pattern covering this
directory, add the path explicitly:

```jsonc
{
  "instructions": [".kilo/rules/impulse-core.md"]
}
```

This is a directly confirmed (not extrapolated) always-on mechanism:
global `instructions` load first, then project ones, and both are
concatenated into the system prompt **on every turn** — not once per
session. `hooks/impulse-instructions.js`'s `coreRuleset()` and
`kilo-plugin/rules/impulse-core.md` carry the same ruleset text;
`scripts/check-sync.js` checks that.

Kilo Code's plugin/hooks system (`chat.message`,
`experimental.chat.system.transform`) exists, but it's the same OpenCode
chat-hook layer that's flagged as unreliable in OpenCode itself (see its
section) — the suite deliberately stays away from it here; the static
file in `.kilo/rules/` is more reliable and already confirmed as
always-on.

**Global scope:** only the `~/.config/kilo/kilo.jsonc` file itself, with
the same `instructions` array, is directly confirmed — the docs don't
confirm a separate global rules directory equivalent to `.kilo/rules/`
at user scope. To have `impulse-core.md` attach from any project, not
just the current one, put the file anywhere stable (e.g.
`~/.config/kilo/rules/impulse-core.md`) and reference it from the global
`kilo.jsonc` with an explicit path:

```jsonc
{
  "instructions": ["~/.config/kilo/rules/impulse-core.md"]
}
```

**After restart, expect:** a new Kilo Code session (VS Code extension or
`kilo` CLI) should quote specific impulse-core points (the ladder,
verification, token economy), not vague generalities, when asked
directly — "what impulse-core rules are currently active." If it quotes
them, the `instructions` array really did pick up the file. `AGENTS.md`
at the repo root is picked up separately, with no extra check needed —
it's a native OpenCode-engine feature, not tied to `kilo.jsonc`.

**Manual fallback:** the same as above — the commands above are already
manual, there's no scripted installer for this target yet.

**Uninstall:**

```
del "<project>\.kilo\rules\impulse-core.md"
```

(and revert the `instructions` edit in `kilo.jsonc` if you added the
path explicitly). Skills — delete `.agents\skills` and
`.agents\impulse-shared` if they were installed only for Kilo Code and no
other target in this project uses them.

**What doesn't port:** the same as every other non-Claude-Code target —
Claude Code's hooks, the statusline, `/impulse-core off` as a durable
command (a Claude-Code-specific config file) don't work as-is.
Mode-aware `impulse-backend`/`impulse-frontend` dynamics (blitz/hardcore)
aren't ported here — only the core layer is always active, the same
limitation as the `GEMINI.md` adapter and Hermes Agent, and for the same
reason: there's no confirmed per-turn hook channel on this engine to
hang mode-aware behavior off of (the plugin chat-hook layer exists, but
it's flagged as unreliable — see above). `impulse: static core-only
delivery for Kilo Code, revisit if a confirmed reliable OpenCode-engine
chat hook lands.`

## Gemini CLI

**Verified:** 2026-08-05. Source: `geminicli.com/docs/cli/skills`,
`/docs/extensions/reference`, `github.com/google-gemini/gemini-cli`
(`docs/cli/skills.md`); the `gemini-cli` target in `vercel-labs/skills`.

**Prerequisites:** Gemini CLI with Agent Skills enabled — on by default
on recent stable releases; on older preview builds toggle
`experimental.skills` via `/settings` (search for "Skills").

**Install — Gemini CLI extension (primary path):**

```
gemini extensions install https://github.com/lowcoware/impulse
```

The suite ships a `gemini-extension.json` at the repo root, and Gemini
CLI extensions pick up a `skills/` folder automatically — the bundle
lands in `~/.gemini/extensions/impulse/` with all 23 skills. Alongside:
`gemini extensions list`, `disable impulse` / `enable impulse` (disable
takes `--scope user|workspace`), `uninstall impulse`. The upside of
this path: one-command updates (see "Update") and the whole bundle is
cloned, `shared/` included — cross-skill links resolve, same as the
native Claude Code plugin.

**Install — standalone skills (alternative):**
`gemini skills install <repo-url>` installs skills from a git repo
(`--scope user|workspace`; `--consent` skips the security confirmation
prompt). Or `npx skills add lowcoware/impulse -a gemini-cli` — lands in
`.agents/skills/` (project) / `~/.gemini/skills/` (global, `-g`).

**Zero-step case, same as OpenCode:** Gemini CLI reads
`.agents/skills/` (workspace) and `~/.agents/skills/` (user) as aliases
of its own `.gemini/skills/` / `~/.gemini/skills/`, with the alias
taking precedence. If the suite is already installed for
Codex/Antigravity/OpenCode at project scope (e.g. via `node
scripts/install.js --target=codex --apply`), Gemini CLI **already sees
all 23 skills, zero extra steps.**

**After restart, expect:** `/skills list` shows every skill
(`/skills reload` re-scans without a restart, `/skills disable|enable
<name>` toggles one). The attachment mechanism is closer to OpenCode
than to Claude Code's router: skill names and descriptions are injected
into the prompt, the model calls the `activate_skill` tool itself, and
Gemini CLI asks for user consent before the full SKILL.md is disclosed.
No hooks, statusline, or mode state — see "What never ports" above.

**Manual fallback:**

```
robocopy skills <project>\.agents\skills /E
robocopy shared <project>\.agents\impulse-shared /E
```

(same project-scope path as Codex/Antigravity/OpenCode; user scope —
`%USERPROFILE%\.agents\skills\`.)

**Uninstall:** `gemini extensions uninstall impulse`; bare copies —
delete `impulse-*` from the relevant skills directory.

## Qwen Code

**Verified:** 2026-08-05. Source:
`qwenlm.github.io/qwen-code-docs/en/users/features/skills`,
`/en/users/extension/introduction`; the `qwen-code` target in
`vercel-labs/skills`.

**Prerequisites:** Qwen Code CLI.

**Install — Qwen Code extension (primary path):**

Qwen Code installs Claude Code plugins and Gemini extensions directly,
auto-converting at install time:

```
qwen extensions install https://github.com/lowcoware/impulse
```

This repo is simultaneously a Claude marketplace with one plugin and a
Gemini extension; Qwen Code understands both formats. Converting the
Claude plugin translates the manifest into `qwen-extension.json` and
the skills into Qwen's format; hooks do not carry over (same as every
non-Claude target — see "What never ports"). Installs to user scope by
default (`~/.qwen/extensions/`); `--scope project` limits it to the
current workspace. Manage via the interactive `/extensions` manager
(three tabs, hot-reload without restarting) or `qwen extensions
list|disable|enable|uninstall`.

**Install — skills without the wrapper (alternative):**
`npx skills add lowcoware/impulse -a qwen-code` — lands in
`.qwen/skills/` (project) / `~/.qwen/skills/` (global, `-g`). Note:
unlike Gemini CLI, OpenCode, and Goose, Qwen Code does **not** read
`.claude/skills/` or `.agents/skills/` — an install for a neighboring
CLI doesn't cover it; it needs its own copy.

**After restart, expect:** all 23 skills in `/skills` (the interactive
panel). Attachment is twofold: the model picks up a skill by
description on its own (like Claude Code's router), and every skill is
also explicitly invocable as a slash command `/<skill-name>` — e.g.
`/impulse-backend`. Qwen Code has no Codex-style frontmatter caps;
`name` must match `/^[\p{L}\p{N}_:.-]+$/u` — every suite name passes.

**Manual fallback:**

```
robocopy skills <project>\.qwen\skills /E
robocopy shared <project>\.qwen\impulse-shared /E
```

(user scope: `%USERPROFILE%\.qwen\skills\`.)

**Uninstall:** `qwen extensions uninstall impulse`; bare copies —
delete `impulse-*` from `.qwen/skills/`.

## Goose

**Verified:** 2026-08-05. Source: `block.github.io/goose` —
`docs/guides/context-engineering/using-skills`, `.../plugins`,
`docs/mcp/skills-mcp`; the `goose` target in `vercel-labs/skills`.

**Prerequisites:** Goose v1.25+ (CLI or Desktop) — skills there are
loaded by the built-in Skills platform extension, enabled by default.
In v1.16–1.24 it was a separate `skills` extension (enabled via
`goose configure` -> Toggle Extensions); before that, no skills.

**Zero-step case, same as OpenCode:** Goose's recommended standard is
`.agents/skills/` (project) and `~/.agents/skills/` (global), plus
backward compatibility with `.claude/skills/`, `~/.claude/skills/`, and
`.goose/skills/`. If the suite is already installed for Claude Code,
Codex, Antigravity, or OpenCode — Goose **already sees all 23 skills,
zero extra steps.** What follows is the clean-install path.

**Install — Goose plugin (primary path for a clean install):**

```
goose plugin install https://github.com/lowcoware/impulse
```

Goose's Open Plugins format — `plugin.json` at the root plus a
`skills/` folder — is exactly how the suite is already packaged (the
same bundle Antigravity installs). The plugin lands in
`~/.agents/plugins/impulse/` wholesale, `shared/` included (cross-skill
links resolve). The `--auto-update` install flag makes Goose check for
updates itself before loading plugin skills. Disable without deleting —
`"disabledPlugins": ["impulse"]` in `~/.config/goose/settings.json`.

Two format notes: Goose namespaces Open Plugin skills with the plugin
name — `impulse:impulse-backend` and so on; use the full name when
invoking explicitly (skills from a bare copy in `.agents/skills/` carry
no prefix). And the suite ships no Goose hooks (`hooks/hooks.json`) —
Goose ignores the `hooks/` folder of Claude machinery; nothing from it
will execute.

**Install — bare copy (alternative):**
`npx skills add lowcoware/impulse -a goose` lands in `.goose/skills/`
(project) / `~/.config/goose/skills/` (global) — legacy paths Goose
still reads, but the recommended standard is `.agents/skills/`:
`node scripts/install.js --target=codex --apply` (project scope) or
`cp -r skills/. ~/.agents/skills/` (global).

**After restart, expect:** `goose skills list` (or `/skills` in a CLI
session) shows all 23 skills; attachment happens when your request
matches a description, or on an explicit ask ("use the impulse-backend
skill"). No hooks, statusline, or mode state — see "What never ports"
above.

**Manual fallback:**

```
robocopy skills %USERPROFILE%\.agents\skills /E
robocopy shared %USERPROFILE%\.agents\impulse-shared /E
```

(project scope: `<project>\.agents\skills\` — the same path as
Codex/Antigravity/OpenCode.)

**Uninstall:** plugin — delete `~/.agents/plugins/impulse/` (`goose
plugin` has no uninstall subcommand; to disable without deleting, use
`disabledPlugins` above); bare copies — delete `impulse-*` from the
relevant skills directory.

## Hermes Agent

**Verified:** 2026-08-20. Source: `github.com/NousResearch/hermes-agent`,
`hermes-agent.nousresearch.com/docs` — specifically
`developer-guide/plugins` (the plugin schema, `pre_llm_call`),
`developer-guide/creating-skills` (the skill schema),
`user-guide/features/hooks` (gateway hooks — not what's needed here, see
below).

**Prerequisites:** Hermes Agent installed —
`curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash` or
`pip install hermes-agent`.

Hermes isn't a fork of Gemini CLI or Claude Code and isn't directly
compatible with their plugin/extension format: it has its own YAML
plugin manifest (`plugin.yaml` + a Python `register(ctx)`), and its own
`SKILL.md` schema (frontmatter with `metadata.hermes`, nested as
`category/skill-identifier/` rather than the suite's flat
`skill-name/`). There's no single "install the whole repo in one line"
command for Hermes — a declarative manifest at the level of
`gemini-extension.json`/`plugin.json` that Hermes itself would pick up
wholesale wasn't found in its documentation (this was checked
deliberately, not just assumed). The install is two separate steps.

**Install — the master layer (always-on `impulse-core`):**

```
cp -r hermes-plugin/impulse-core ~/.hermes/plugins/impulse-core
```

This isn't a bare copy of Claude Code's hooks machinery —
`hermes-plugin/impulse-core/` is a plugin written specifically for
Hermes (`plugin.yaml` + `__init__.py`) that, via `pre_llm_call` (the
only Hermes hook whose return value actually reaches the context — the
other gateway hooks are purely for side effects like logging), injects
the same ruleset as `hooks/impulse-instructions.js`'s `coreRuleset()`
into the **user message of every turn** — even more reliable than the
static `GEMINI.md` used by Gemini CLI/Qwen Code, because it re-injects
every time, not once per session. `scripts/check-sync.js` keeps this
file's text in sync with the other three surfaces (the hook,
`impulse-core/SKILL.md`, `GEMINI.md`).

**Install — skills:**

Hermes' schema expects `skills/<category>/<skill-name>/SKILL.md` (two
levels), while the suite is flat — `skills/<skill-name>/SKILL.md` (one
level). Put everything under a single `impulse` category:

```
mkdir -p ~/.hermes/skills/impulse
cp -r skills/*/ ~/.hermes/skills/impulse/
```

The extra Hermes-specific frontmatter fields (`version`,
`metadata.hermes.tags`/`category`) aren't required for basic operation
(every `SKILL.md` already has `name` + `description`) — adding them is
an optional improvement for better discoverability through `hermes
skills browse`, not done here to keep the change footprint under
control.

**Verify after install:** `hermes skills list` should show every suite
skill under the `impulse` category. To verify the master layer actually
injects, ask the agent a direct question like "what impulse-core rules
are currently active" in a new session: the answer should quote specific
points (the ladder, verification, token economy), not vague
generalities — if it does, the `pre_llm_call` hook fired.

**Uninstall:**

```
rm -rf ~/.hermes/plugins/impulse-core ~/.hermes/skills/impulse
```

**What doesn't port:** the same as every other non-Claude-Code target —
Claude Code's hooks, the statusline, `/impulse-core off` as a durable
command (a Claude-Code-specific config file) don't work as-is. Plus,
specific to Hermes: only the core layer (`impulse-core`) injects
always-on — mode-aware `impulse-backend`/`impulse-frontend` dynamics
(blitz/hardcore) aren't ported here yet, the same limitation as the
`GEMINI.md` adapter, and for the same reason (see
`shared/multi-harness-robustness.md`) — Hermes could theoretically go
further than the other adapters, thanks to `pre_llm_call`'s per-turn
(not per-session) invocation, but that's separate work, not verified
here.

## Cross-platform fallback

Everything above is the native path for a specific platform. This is
the fallback: useful for offline mode without npx, for a platform with
no plugin system of its own, or when you need one uniform
dry-run/uninstall across an arbitrary set of targets at once. It places
only the skills' **content** (SKILL.md + `references/`) — a given
platform's machinery (hooks, always-on ruleset injection, statusline,
modes) is not carried by this fallback; for that, see the relevant
platform's section above.

**`npx skills`** — the open agent-skills installer (vercel-labs/skills):
it pulls skills from a GitHub repo into your tool's directory, GitHub
standing in for an npm registry. The suite is already in the native
agentskills.io format, so no manifest is needed and every skill is
auto-discovered (verified 2026-07-04: `npx skills add lowcoware/impulse
--list` finds all of them).

```
npx skills add lowcoware/impulse -a claude-code    # Claude Code
npx skills add lowcoware/impulse -a cursor         # Cursor
npx skills add lowcoware/impulse -a codex          # Codex
npx skills add lowcoware/impulse -a antigravity    # Antigravity
npx skills add lowcoware/impulse -a opencode       # OpenCode
npx skills add lowcoware/impulse -a gemini-cli     # Gemini CLI
npx skills add lowcoware/impulse -a qwen-code      # Qwen Code
npx skills add lowcoware/impulse -a goose          # Goose
```

All at once — chain several `-a` flags (or `--all`, every skill into
every detected agent). It installs into the project by default; `-g`
installs globally, into your user directory. Also useful: `-y`
(non-interactive, for CI), `--list` (show skills, install nothing), `-s
<skill>` (only specific ones, e.g. `-s impulse-backend -s
impulse-frontend`).

Where it lands: `claude-code` → `.claude/skills/`, `cursor` / `codex` /
`opencode` → `.agents/skills/` at project scope (Cursor and OpenCode
both read `.claude/skills/` and `.agents/skills/` natively — neither
creates its own separate copy). At user/global scope, `opencode` has its
own path: `~/.config/opencode/skills/`. `gemini-cli` → `.agents/skills/`
(project) / `~/.gemini/skills/` (`-g`); `qwen-code` → `.qwen/skills/` /
`~/.qwen/skills/`; `goose` → `.goose/skills/` /
`~/.config/goose/skills/` — for Goose these are legacy paths that are
still read, but the recommended standard is `.agents/skills/`. Verify
Antigravity's paths on the spot — the interface is young and has
already moved.

The skills installer also doesn't place `shared/*.md` files —
cross-skill links depend on those, more in the "Shared files and
cross-skill links" section below.

**The repo installer (`scripts/install.js`)** — for when you need
offline mode without npx, an exact copy plan up front (dry-run), or a
symmetric `--uninstall`:

```
node scripts/install.js --target=claude|cursor|codex|antigravity|opencode \
  [--scope=project|user] [--project-dir=PATH] [--apply] [--uninstall]
```

Default (no `--apply`) is a **dry-run**: it prints the exact copy plan
(source -> destination, one line per file) and writes nothing to disk.
`--apply` executes it; it's idempotent, so a repeated `--apply`
overwrites the suite's own folders in place and doesn't touch sibling
files or other skills/plugins in the same directory. `--uninstall`
(together with `--apply`) removes exactly what the matching install
created. Full option list: `node scripts/install.js --help`.

Per-target formats are verified **2026-07-04** against each vendor's
own docs — these interfaces move fast; before installing on a
materially newer CLI release, re-check the source linked in that
platform's section.

## Shared files and cross-skill links

`shared/authoring.md`, `shared/communication.md`, `shared/evals.md`, and
`shared/context7.md` are copied alongside the skills into a `impulse-shared/`
folder at each target's root (`.claude/impulse-shared/`, `.agents/impulse-shared/`,
`~/.gemini/config/impulse-shared/`, `~/.config/opencode/impulse-shared/` on
OpenCode's user scope — at project scope OpenCode shares `.agents/impulse-shared/`
with Codex/Antigravity). Several skills also link to *other*
skills' `references/*.md` by relative path (e.g. `impulse-frontend` pointing at
a `impulse-backend` reference). This installer places files; it does not
rewrite links. Inside Claude Code's native plugin, those links resolve
because the whole suite installs as one tree. Everywhere else — bare copies
on any target — a deep cross-skill link may not resolve to a file on disk.
That's an accepted degradation, not a bug: the links are pointers for a
human or an agent to go find the referenced guidance, not hard imports the
skill depends on to function. Building a link-rewriting engine to fix this
was considered and rejected as overengineering for a documentation
cross-reference.

## Validation findings (current suite, checked 2026-07-04)

All 23 skills pass the Codex/Antigravity/OpenCode frontmatter caps this
installer enforces (one shared spec, validated with one code path for all
three): every `name` is ≤ 64 characters and matches its directory exactly;
every `description` is ≤ 1024 characters. Zero violations found — this
installer's validator is defense-in-depth against a future skill breaking
the cap, not a fix for one that's currently broken (`scripts/check-skills.js`
already enforces the same two caps suite-wide in CI).

## Compatibility matrix

| | Claude Code | Cursor | Codex | Antigravity | OpenCode | Kilo Code | Gemini CLI | Qwen Code | Goose | Hermes Agent |
|---|---|---|---|---|---|---|---|---|---|---|
| SKILL.md native | yes (origin format) | yes | yes | yes | yes | no data (extrapolated from the OpenCode engine, see the Kilo Code section) | yes | yes | yes | yes, but its own schema (`metadata.hermes`) and nested `category/skill-name/`, not flat |
| This installer's target directory | `.claude/skills/` | `.claude/skills/` (alias) | `.agents/skills/` | `.agents/skills/` (project, = codex) / `~/.gemini/config/skills/` (user) | `.agents/skills/` (project, = codex) / `~/.config/opencode/skills/` (user) | no target of its own; manual fallback to `.agents/skills/` (unconfirmed) | no target of its own; project scope is covered by `--target=codex` | no target of its own; `npx skills -a qwen-code` -> `.qwen/skills/` | no target of its own; project scope is covered by `--target=codex` | no target of its own; manual copy into `~/.hermes/skills/impulse/` (section above) |
| Native plugin system | `/plugin install` (marketplace) | no | no | `agy plugin install` (CLI) | no | no | `gemini extensions install` | `qwen extensions install` (understands Claude plugins and Gemini extensions) | `goose plugin install` (Open Plugins) | `~/.hermes/plugins/<name>/` (`plugin.yaml`+`register(ctx)`), no single-command whole-repo install |
| references/*.md as-is | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| `impulse-core` always-on delivery | plugin: hooks (`SessionStart`/`UserPromptSubmit`) | `.mdc` `alwaysApply: true` (primary) + `hooks.json` `sessionStart` (BETA, supplemental) | `hooks.json` `UserPromptSubmit` — real per-turn (behind the `features.hooks` flag) | static `rules/impulse-core.md`, Always On activated by hand via the UI | `AGENTS.md` / `opencode.json` `instructions` (unconditional at session start) | `.kilo/rules/` via `kilo.jsonc` `instructions` (on every turn, not one-shot) | `GEMINI.md` (`contextFileName`, once per session) | `GEMINI.md` (same mechanism, Qwen Code is a Gemini CLI fork) | no (the core layer isn't delivered here) | `pre_llm_call` plugin, per-turn (not per-session) |
| Mode flag `/impulse-*` (blitz/hardcore) + statusline | plugin only | no | no | no | no | no | no | no | no | no |
| How a skill attaches | router by description | router by description | router by description | router by description | explicit tool call `skill({name})`, agent decides by description | no data (likely the same tool-call mechanism as OpenCode — unconfirmed) | model calls the `activate_skill` tool + user consent | router by description + explicit slash command `/<skill>` | router by description | 3-tier progressive disclosure: `skills_list()` -> `skill_view(name)` -> `skill_view(name, path)` |
| Natively reads other targets' directories | — | `.claude/skills/` | — | — | `.claude/skills/` AND `.agents/skills/`, project+user | no data | `.agents/skills/` (alias), project+user | — | `.agents/skills/` AND `.claude/skills/` (+ legacy `.goose/skills/`), project+user | not checked — no data |
