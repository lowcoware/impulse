# Git & changelog

Conventional Commits + Keep a Changelog 1.1.0. Changelog entry in the SAME commit as the change — for every change.

## Commit format

```
<type>(<scope>): <subject>

<body — what and why, never how>

<footer — Task: X, Fixes: #N, BREAKING CHANGE: ...>
```

| Field | Rule |
|---|---|
| type | feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert |
| scope | service or module, lowercase English, optional but wanted: `feat(orders):`, `chore(deps):` |
| subject | English, imperative ("add", not "added"), header ≤72 chars, lowercase first letter, no trailing period |
| body | only when the subject isn't enough: what + why. Never how — that's the diff |
| breaking | `!` after scope AND a `BREAKING CHANGE:` footer — both, every time |

1. One commit = one logical unit. Feature and unrelated refactor = two commits.
2. Every commit leaves the repo working: compiles, affected tests green.
3. Code + tests + doc updates + CHANGELOG entry travel in that one commit.

## CHANGELOG.md — for everything

Root of repo, Keep a Changelog 1.1.0, SemVer. Rule: ченджлог для всего — EVERY change gets an entry, refactors/tests/CI included ("user-visible only" filter is dropped). Section headers follow `docstringLang`.

| Commit | `[Unreleased]` section (ru / en) |
|---|---|
| feat | Добавлено / Added |
| fix | Исправлено / Fixed |
| vulnerability or security-motivated change | Безопасность / Security |
| deprecation | Устарело / Deprecated |
| removal | Удалено / Removed |
| everything else | Изменено / Changed |

1. Entry = one human-readable line, from the consumer's viewpoint where one exists; otherwise name the internal change plainly.
2. Same commit as the change. Not a follow-up commit, not "before release".
3. Release: `[Unreleased]` → `## [X.Y.Z] - YYYY-MM-DD`, drop empty sections, update compare links, commit `chore(release): X.Y.Z`, `git tag -a vX.Y.Z`.
4. SemVer: any BREAKING → MAJOR, any feat → MINOR, else PATCH. Pre-1.0: breaking allowed in MINOR.
5. Yanked release → keep the section, append `[YANKED]`.

## Bans

| Ban | Instead |
|---|---|
| `--no-verify` (or any hook bypass) | hook failed → fix the cause, always |
| force-push to main | revert commit |
| emoji in commit messages | plain text |
| `fix` / `update` / `wip` subjects | say what changed |
| secrets in any commit | leaked → rotate the secret NOW, then clean history |
| process phrasing ("as requested", "per user") | describe the change itself |
| committing over a dirty tree | resolve or stash first, explicitly |

## Hygiene

1. New repo: `git init` before the first line of code; `.gitignore`, `.gitattributes`, `README.md`, `CHANGELOG.md` in commit #1.
2. Existing repo: `git status` + `git pull --ff-only` before touching anything.
3. Branches: `<type>/<kebab-description>`, English, short-lived, rebase on main, delete after merge.
4. Never commit: `.env`, build artifacts, `node_modules/`, caches, logs, debug prints.
