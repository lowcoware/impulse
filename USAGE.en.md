[Русский](USAGE.md) · **English**

# Usage — impulse across CLIs

Installation lives in `INSTALL.en.md`; this file is about driving the
suite once it's installed. The full skill list and their commands are in
`README.en.md` or via `/impulse-help`.

## How it works everywhere

A skill attaches two ways:

1. **By description.** The CLI's own router matches your prompt against the
   skill's triggers and pulls in the right one. Works everywhere — in any
   of the four CLIs, even a bare folder copy.
2. **By slash command `/impulse-*`.** Claude Code only, and only when the
   suite is installed as a native plugin. The other CLIs have no suite
   slash commands.

A mode (`blitz|medium|hardcore`) is a separate mechanic on top of a skill,
present only on `impulse-backend` and `impulse-frontend` and only in the Claude
Code plugin. Outside the plugin there's no mode flag, but you get the same
effect by naming the mode in the prompt: "review this Go service in
hardcore mode" still reads `impulse-backend`'s hardcore guidance, just without
state tracking or a statusline badge.

## Claude Code

The native plugin is the richest path: slash commands, hooks, a statusline
badge, a stateful mode switch.

- Invoke a skill: by command (`/impulse-review`, `/impulse-security`) or just
  describe the task — description auto-attach works too.
- Mode: `/impulse-backend hardcore`, `/impulse-frontend blitz`. Turn off with
  `stop impulse` or `normal mode`.
- The statusline shows state: `[IMPULSE:BE:BLITZ]`, `[IMPULSE:FE]`,
  `[IMPULSE:BE+FE:HARDCORE]`.
- Defaults — `~/.config/impulse/config.json` (`defaultMode`, `docstringLang`,
  `coverageTarget`, `core`).

Bare copy (no plugin, installed via `scripts/install.js`): only
description auto-attach works. No commands, no hooks, no mode flag — name
the mode in the prompt instead.

## Cursor

Cursor reads `.claude/skills/` natively. Skills attach by description
(Cursor's Agent-Requested rule type) or explicit mention. No suite slash
commands, no mode flag.

How to invoke: describe the task so the right trigger fires — "review this
Go diff for overengineering" pulls in `impulse-review`, "build a Nuxt page,
hardcore mode" pulls in `impulse-frontend` with an architecture-first pass
(mode by words).

## Codex CLI

Installs to `.agents/skills/`. Attaches by description. No slash commands.

If you want a skill's guidance force-loaded instead of routed by prompt,
add a pointer line to your project's `AGENTS.md` — that's Codex's separate,
core context-injection mechanism (concatenated root -> leaf, 32 KiB default
cap).

## Antigravity

Installs to `.agents/skills/` — the same path Codex uses at project scope.
Attaches by description. No slash commands. For force-injecting rules, use
`.agents/rules/*.md` (workspace) or `~/.gemini/GEMINI.md` (global) and
`AGENTS.md` (12000-char cap).

## What ports and what doesn't

| | Claude Code (plugin) | Claude Code (copy) | Cursor | Codex | Antigravity |
|---|---|---|---|---|---|
| Description auto-attach | yes | yes | yes | yes | yes |
| Slash commands `/impulse-*` | yes | no | no | no | no |
| Mode blitz/medium/hardcore | yes | no (by words) | no (by words) | no (by words) | no (by words) |
| Hooks | yes | no | no | no | no |
| Statusline badge | yes | no | no | no | no |

Install details and per-target paths — `INSTALL.en.md`.
