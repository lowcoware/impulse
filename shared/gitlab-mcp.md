# GitLab MCP — talking to GitLab directly, not via CLI/API scripting

For a project hosted on GitLab: `@zereight/mcp-gitlab` gives the agent
direct tool calls over the GitLab API (issues, MRs, pipelines, repo files,
wikis) instead of hand-rolling `curl`/`glab` invocations per task. Same
class of tool as Context7 (`shared/context7.md`) — optional, not bundled,
one shared doc every impulse-* skill points to instead of repeating setup.

## Requires setup — say so once if missing

Not installed by default. If the project is on GitLab and no
`mcp__gitlab__*`-style tool is in the available set: tell the user once
("GitLab MCP не подключён — работаю через `glab`/`curl` вместо прямых
вызовов" or equivalent), then fall back to CLI/API calls. Never assume it's
there because the remote is a GitLab URL — check the tool list.

## Install

```bash
# global (recommended if used across multiple projects)
npm install -g @zereight/mcp-gitlab

# or pinned via npx, no global install
npx -y @zereight/mcp-gitlab@latest
```
Requires Node.js >=18, npm >=9. Homebrew alternative: `brew tap
zereight/gitlab-mcp https://github.com/zereight/gitlab-mcp && brew install
zereight/gitlab-mcp/zereight-mcp-gitlab`.

Register with Claude Code:
```bash
claude mcp add gitlab -- npx -y @zereight/mcp-gitlab \
  --token=<personal-access-token> \
  --api-url=https://gitlab.example.com/api/v4
```
`--api-url` defaults to `https://gitlab.com/api/v4` — set it explicitly
for a self-hosted instance, this is the most common misconfiguration
(pointing at gitlab.com when the actual project lives on a private
instance). Token needs `api` scope at minimum; scope it to the narrowest
role (Reporter/Developer) the task actually needs, not Owner/Maintainer by
default — same least-privilege reasoning as any other API credential
(`impulse-security/references/secrets.md`).

## When to reach for it vs. `glab`/raw API calls

| Fires | Skips |
|---|---|
| Reading/writing issues, MRs, MR comments, pipeline status, repo file
  content — structured, repeated calls in one session | A one-off `git
  push`/`git clone` — plain git, no MCP needed |
| The task needs GitLab-specific state (MR approval rules, CI variables,
  protected branches) that isn't in the local checkout | Content already
  available locally (the repo's own files, already-cloned history) |
| Cross-referencing multiple GitLab objects (this MR's linked issues, this
  pipeline's jobs) — one MCP call beats several `curl` round-trips | A
  single well-known REST call the agent would get right in one `curl`
  anyway — MCP overhead isn't free, don't reach for it reflexively |

## Boundary

- Doesn't replace `impulse-devops/references/ci.md`'s GitHub Actions
  guidance — that file is GitHub-specific; a GitLab CI/CD pipeline (`.gitlab-ci.yml`)
  has its own syntax and this MCP server doesn't abstract that away, it
  just gives read/write access to the pipeline objects.
- Same token-hygiene rule as any GitLab PAT: never let it land in a
  committed file, log line, or this MCP server's own config if that config
  is checked into the repo — `--token` on the CLI or an env var, not a
  tracked `.mcp.json`.
- Business/project-management workflow (which playbook fires on an
  incoming MR, review conventions) stays `impulse-project-management`'s
  job — this file only covers the tool's setup and reach.
