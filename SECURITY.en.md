[Русский](SECURITY.md) · **English**

# Security Policy

## Scope

impulse is developer tooling, not a network service: Markdown skill files
plus a handful of local Node.js hooks (`hooks/`) and lint scripts
(`scripts/`) that run inside your own Claude Code / Cursor / Codex /
Antigravity session. Nothing here runs a server, calls out to a
impulse-controlled endpoint, or collects telemetry.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting, not a public issue: open a
Security Advisory from the repo's Security tab, or go directly to
`github.com/lowcoware/impulse/security/advisories/new`. Advisories stay
private until a fix ships.

In scope: anything that makes a hook execute unintended code, read or
exfiltrate data outside the current workspace, or affect a session beyond
its own repo. Include which hook/script, your CLI + OS, and a minimal
repro if you have one.

## Hook posture: never block

Every hook (`hooks/impulse-activate.js`, `hooks/impulse-mode-tracker.js`,
`hooks/impulse-subagent.js`) is written to silent-fail: a missing config
file, a non-git directory, a space in the path, or an unexpected error,
and the hook no-ops instead of throwing. A broken hook must never block
your session. If you hit a case where a hook blocks, hangs, or stops
Claude Code from proceeding, that's a bug — file it as a normal issue
unless it's also an injection or exfiltration concern, in which case use
the advisory channel above.

## No secrets in the repo

Nothing under `skills/`, `hooks/`, `scripts/`, or `shared/` should ever
contain a live credential, API key, or token, including as an "example."
If you find one, report it through the advisory channel so it can be
scrubbed from git history before disclosure — a follow-up commit alone
does not remove it from history.

## Supported versions

Latest tagged release only. This is a skill suite, not a service — there
is no LTS branch.
