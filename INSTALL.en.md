[Русский](INSTALL.md) · **English**

# Install — impulse across CLIs

This suite is authored as native `SKILL.md` + `references/*.md` — the
agentskills.io format. That format is spoken **natively** by every CLI
below, so installing is placement, not conversion: both `npx skills` and
the repo's `scripts/install.js` just copy `skills/*/` (router + references)
into whichever CLI's extension directory you target, nothing is rewritten
or translated.

The primary path depends on the tool: **Claude Code** and **Antigravity**
use their own plugin systems (the Claude Code marketplace plugin and the
Antigravity plugin bundle, sections below); **Cursor**, **Codex**, and
**OpenCode** use `npx skills`. **Gemini CLI**, **Qwen Code**, and
**Goose** have their own plugin systems too, and all three install the
suite straight from the GitHub repo in one command: `gemini extensions
install`, `qwen extensions install` (reads Claude plugins directly), and
`goose plugin install` — sections below. OpenCode has a third path too,
often the shortest one: if the suite is already installed for Claude Code
or Codex/Antigravity in the same project or home directory, OpenCode reads
`.claude/skills/` and `.agents/skills/` natively at both scopes and
**already sees it, zero extra steps** (OpenCode section below). The same
zero-step effect exists on **Goose** (reads both `.agents/skills/` and
`.claude/skills/`) and **Gemini CLI** (reads `.agents/skills/` as an
alias) — see their sections.

## Install via npx skills (primary path for Cursor and Codex)

For Claude Code and Antigravity the plugin system gives a native install —
and on Claude Code also hooks, statusline, and modes; `npx skills` works for
them too but drops the bare skill level without the plugin wiring.

`npx skills` is the open agent-skills installer (vercel-labs/skills): it
pulls skills from a GitHub repo into your tool's directory — GitHub is the
registry instead of npm. The suite is already in the native agentskills.io
format, so it installs as-is — no manifest needed, all 22 skills are
auto-discovered (verified 2026-07-04: `npx skills add lowcoware/impulse --list`
finds all 16).

One command per tool:

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

All at once — list the targets with multiple `-a` flags (or `--all`,
every skill into every detected
agent). It
installs into the project by default; `-g` installs into your user
directory, global to all projects. Also handy: `-y` (non-interactive, for
CI), `--list` (show skills, install nothing), `-s <skill>` (only specific
ones, e.g. `-s impulse-backend -s impulse-frontend`).

Where it lands: `claude-code` → `.claude/skills/`, `cursor` / `codex` /
`opencode` → `.agents/skills/` at project scope (Cursor and OpenCode both
read `.claude/skills/` and `.agents/skills/` natively — neither writes its
own separate copy). At user/global scope `opencode` has its own path:
`~/.config/opencode/skills/` — see the OpenCode section. `gemini-cli` →
`.agents/skills/` (project) / `~/.gemini/skills/` (`-g`); `qwen-code` →
`.qwen/skills/` / `~/.qwen/skills/`; `goose` → `.goose/skills/` /
`~/.config/goose/skills/` — for Goose these are legacy paths, still read,
but the recommended standard is `.agents/skills/` (see the Goose
section). Verify
Antigravity's path on the spot — the interface is young and has moved
already (see the Antigravity section below).

One note on level: `npx skills` installs skill content (SKILL.md + each
skill's `references/`) — the same bare level as a `scripts/install.js` copy.
It does not carry hooks, the statusline badge, the stateful mode switch, or
the `/impulse-*` commands; those come only from the native Claude Code plugin
(below). The skills installer also doesn't place `shared/*.md` — cross-skill
links depend on those, see "Shared files and cross-skill links".

## Repo installer (alternative)

If you want an offline path without npx, the exact copy plan up front
(dry-run), or a symmetric `--uninstall`, the repo ships its own installer.
Run `node scripts/install.js --help` for the full CLI surface. Short version:

```
node scripts/install.js --target=claude|cursor|codex|antigravity|opencode \
  [--scope=project|user] [--project-dir=PATH] [--apply] [--uninstall]
```

Default (no `--apply`) is **dry-run**: it prints the exact copy plan
(source -> destination, one line per file) and writes nothing. Add `--apply`
to execute. It's idempotent — re-running `--apply` overwrites this suite's
own folders in place — and it never touches sibling files or other
skills/plugins already present in the same directory. `--uninstall` (with
`--apply`) removes exactly what the matching install created.

Per-target formats below are verified **2026-07-04** against each vendor's
own docs. These interfaces move fast and
sit past this suite's knowledge cutoff — re-check the source URL before
trusting an install on a materially newer CLI release.

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
- Marketplace added from a **local path** (the install commands in the Claude
  Code section use one): update the local clone first (`git fetch` +
  `reset --hard` above), then run the two `/plugin` commands.
- Update detection keys on `version` in `.claude-plugin/plugin.json` — if
  the version you already have matches, `/plugin update` **skips the plugin
  even when file contents changed**. Releases of this suite bump that
  version; if yours seems stuck, check whether the version actually changed
  upstream, and as a last resort `/plugin uninstall impulse@impulse` +
  `/plugin install impulse@impulse`.

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

**Repo installer (`scripts/install.js`):** update the clone, re-run the same
install command — it's idempotent and overwrites this suite's own folders in
place, never touching siblings:

```
git fetch origin && git reset --hard origin/main
node scripts/install.js --target=<t> [--scope=user] --apply
```

**Manual copy:** re-run the same copy commands from the target's "Manual
fallback" — same overwrite-in-place semantics.

## What never ports, on any target but Claude Code's native plugin

The impulse suite has two layers: the **content** (routers + references — this
is what installs everywhere) and Claude-Code-plugin-only **machinery**:
hooks (`SessionStart` mode flag, `UserPromptSubmit` ruleset injection,
`SubagentStart` propagation), the statusline mode badge, and `/impulse-backend
[mode]` / `/impulse-frontend [mode]` as a *stateful mode switch*. That machinery
is wired through `.claude-plugin/plugin.json`'s `hooks` block and only loads
when the suite is installed as a **native plugin** (marketplace path) — it
does not exist for a bare skill-folder copy, on Claude Code or anywhere else.

What *does* still work everywhere, including a bare copy: every CLI's own
router still auto-attaches a skill by matching your prompt against that
skill's frontmatter `description` (the trigger phrases each SKILL.md lists).
There's no `blitz`/`medium`/`hardcore` mode flag outside the plugin, but you
get the same effect by naming the mode in your prompt — e.g. "review this
Go service in hardcore mode" still reads `impulse-backend`'s hardcore guidance,
it's just not tracked as session state or shown on a statusline.

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

**After restart, expect:** all 22 skills listed under Claude Code's skills
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

**Verified:** 2026-07-04. Source: `cursor.com/docs/context/rules`,
`/context/skills`.

**Prerequisites:** Cursor with Agent Skills enabled.

**Via `npx skills` (primary path):** `npx skills add lowcoware/impulse -a cursor`.

Cursor reads `.claude/skills/` **directly, natively, for compatibility** — no
separate `.cursor/skills/` copy exists or is needed. `--target=cursor` is an
alias: it verifies/creates the exact same `.claude/skills/` tree
`--target=claude` does.

**Install — one command:**

```
node scripts/install.js --target=cursor --apply
```

(`--scope=user` for `~/.claude/skills/`, global to all your Cursor projects.)

**Native alternative:** if you'd rather use Cursor's own skills directory
instead of the shared `.claude/skills/` path, point the same source tree at
`.cursor/skills/` (project) or `~/.cursor/skills/` (user) by hand — the
installer does not offer this as a separate target because it would just be
a second, redundant copy of files Cursor already reads.

**After restart, expect:** the same 22 skills, auto-attached by description
(Cursor's Agent-Requested rule type) or by explicit invocation. No hooks, no
statusline, no mode-flag state — see "What never ports" above.

**Manual fallback:** identical to Claude Code's manual fallback above — same
destination directory.

**Uninstall:**

```
node scripts/install.js --target=cursor --apply --uninstall
```

## Codex CLI

**Verified:** 2026-07-04 for the core mechanism. Source:
`developers.openai.com/codex/skills`, `/codex/guides/agents-md`,
`/codex/config-reference`, `github.com/openai/skills`. (Its
plugins-system field-name detail is single-source in the research pass —
treat only the `.agents/skills/` placement + frontmatter caps below as
confirmed.)

**Prerequisites:** OpenAI Codex CLI with skills support.

**Via `npx skills` (primary path):** `npx skills add lowcoware/impulse -a codex`.

**Install — one command:**

```
node scripts/install.js --target=codex --apply
```

Project scope installs to `.agents/skills/<skill>/` under the current
directory (Codex resolves this from your repo root); `--scope=user` installs
to `~/.agents/skills/`.

Codex enforces hard frontmatter caps this installer validates **before**
copying anything: `name` ≤ 64 characters, lowercase letters/digits with
single hyphens (no leading/trailing hyphen), and equal to the skill's
directory name; `description` ≤ 1024 characters. A violation is reported by name and
fails the run (exit code 2) rather than being silently truncated — see
"Validation findings" below for this suite's current result (clean).

**After restart, expect:** all 22 skills available under Codex's own skill
listing, auto-attached by description. `AGENTS.md` is Codex's separate,
core-supported context-injection mechanism (concatenated root -> leaf, 32 KiB
default cap) — this installer does not generate one; if you want the suite's
guidance force-loaded rather than routed, add your own pointer line to your
project's `AGENTS.md` by hand.

**Manual fallback:**

```
robocopy skills <project>\.agents\skills /E
robocopy shared <project>\.agents\impulse-shared /E
```

**Uninstall:**

```
node scripts/install.js --target=codex --apply --uninstall
```

## Antigravity

**Verified:** 2026-07-04, but treat as **young and volatile** — Antigravity's
own skill path has already been renamed once (`.agent/` -> `.agents/`)
during its public life, and the current paths should be treated as
"likely-stable-not-frozen." Re-verify against
`antigravity.google/docs/skills` (also `/docs/rules-workflows`, `/docs/plugins`,
`/docs/cli/gcli-migration`) before relying on this for anything but the
current release. `.agent/` (singular) is honored as a back-compat alias if
you find an older install using it.

**Prerequisites:** Google Antigravity CLI.

**Install — Antigravity plugin (primary path):**

The Antigravity CLI installs plugins by command:

```
agy plugin install lowcoware/impulse
```

Alongside: `agy plugin list` shows what's installed; `agy plugin enable impulse`
/ `agy plugin disable impulse` toggle it without deleting; `agy plugin uninstall
impulse` removes it. The suite is packaged as a plugin bundle (`plugin.json` at
the repo root plus the `skills/` folder — Antigravity reads
`skills/<name>/SKILL.md`), so it installs as-is.

If your CLI build wants a full URL, use `agy plugin install
https://github.com/lowcoware/impulse`. Manual fallback without the command —
drop the bundle into Antigravity's plugins directory and it's picked up on
startup:

- workspace: `.agents/plugins/impulse/` at your workspace root;
- global: `~/.gemini/antigravity-cli/plugins/impulse/` (on some builds,
  `~/.gemini/config/plugins/impulse/`).

```
git clone https://github.com/lowcoware/impulse .agents/plugins/impulse
```

Confirm the `agy plugin install` source-argument format and the exact
plugins directory against `antigravity.google/docs/cli/plugins` — the
interface is young (see the warning above). The Antigravity plugin ships the
same 22 skills; the impulse hooks, modes, and statusline are
Claude-Code-plugin-only, and the suite ships no Antigravity-specific
`hooks.json`/`rules`.

**Install — skills without the plugin wrapper (alternative):**

`npx skills add lowcoware/impulse -a antigravity`, or
`node scripts/install.js --target=antigravity --apply`.

Project scope installs to `.agents/skills/<skill>/` — **the same directory
Codex uses at project scope.** If you've already run
`--target=codex --apply` in this project, that install already satisfies
Antigravity too; the installer detects and reports this rather than
duplicating anything. `--scope=user` installs to
`~/.gemini/config/skills/<skill>/`, which is Antigravity-specific (not
shared with Codex).

Antigravity shares the same underlying skill spec as Codex, so this
installer applies the same `name`/`description` validation described in the
Codex section above.

**After restart, expect:** all 22 skills available, auto-attached by
description. `.agents/rules/*.md` (workspace) / `~/.gemini/GEMINI.md`
(global) and `AGENTS.md` are Antigravity's separate rule-injection paths
(capped at 12000 chars) — not generated by this installer.

**Manual fallback:**

```
robocopy skills <project>\.agents\skills /E
robocopy shared <project>\.agents\impulse-shared /E
```

(user scope: `%USERPROFILE%\.gemini\config\skills\` and
`%USERPROFILE%\.gemini\config\impulse-shared\`.)

**Uninstall:**

```
node scripts/install.js --target=antigravity --apply --uninstall
```

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
directory, OpenCode **already sees all 22 skills, zero extra steps.** What
follows is the path for OpenCode running on its own, without the others.

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

**After restart, expect:** all 22 skills available through the `skill`
tool — `skill list` (or your client's equivalent) shows all 16 names with
their descriptions. Attachment happens via an explicit tool call from the
agent, not prompt auto-routing (see the difference above). No hooks, no
statusline, no stateful mode switch — see "What never ports" above.

**Manual fallback:**

```
robocopy skills <project>\.agents\skills /E
robocopy shared <project>\.agents\impulse-shared /E
```

(user scope: `%USERPROFILE%\.config\opencode\skills` and
`%USERPROFILE%\.config\opencode\impulse-shared`.)

**Uninstall:**

```
node scripts/install.js --target=opencode --apply --uninstall
```

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
lands in `~/.gemini/extensions/impulse/` with all 22 skills. Alongside:
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
all 22 skills, zero extra steps.**

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

**After restart, expect:** all 22 skills in `/skills` (the interactive
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
Codex, Antigravity, or OpenCode — Goose **already sees all 22 skills,
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
session) shows all 22 skills; attachment happens when your request
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

All 22 skills pass the Codex/Antigravity/OpenCode frontmatter caps this
installer enforces (one shared spec, validated with one code path for all
three): every `name` is ≤ 64 characters and matches its directory exactly;
every `description` is ≤ 1024 characters. Zero violations found — this
installer's validator is defense-in-depth against future skills breaking
the cap, not a fix for a currently-broken one (`scripts/check-skills.js`
already enforces the same two caps suite-wide in CI).

## Compatibility matrix

| | Claude Code | Cursor | Codex | Antigravity | OpenCode | Gemini CLI | Qwen Code | Goose |
|---|---|---|---|---|---|---|---|---|
| SKILL.md native | yes (origin format) | yes | yes | yes | yes | yes | yes | yes |
| This installer's target dir | `.claude/skills/` | `.claude/skills/` (alias) | `.agents/skills/` | `.agents/skills/` (project, = codex) / `~/.gemini/config/skills/` (user) | `.agents/skills/` (project, = codex) / `~/.config/opencode/skills/` (user) | no target of its own; project covered by `--target=codex` | no target of its own; `npx skills -a qwen-code` -> `.qwen/skills/` | no target of its own; project covered by `--target=codex` |
| Native plugin system | `/plugin install` (marketplace) | no | no | `agy plugin install` | no | `gemini extensions install` | `qwen extensions install` (reads Claude plugins and Gemini extensions) | `goose plugin install` (Open Plugins) |
| references/*.md as-is | yes | yes | yes | yes | yes | yes | yes | yes |
| Hooks / statusline / mode-flag `/impulse-*` | plugin-only | no | no | no | no | no | no | no |
| How a skill attaches | router by description | router by description | router by description | router by description | explicit tool call `skill({name})`, agent decides by description | model calls the `activate_skill` tool + user consent | router by description + explicit slash command `/<skill>` | router by description |
| Natively reads other targets' directories | — | `.claude/skills/` | — | — | `.claude/skills/` AND `.agents/skills/`, both project+user | `.agents/skills/` (alias), project+user | — | `.agents/skills/` AND `.claude/skills/` (+ legacy `.goose/skills/`), project+user |
