# Obsidian CLI — vault operations from the shell

From kepano/obsidian-skills + adriangrant/Obsidian-SKILLS (both MIT),
re-expressed. Requires Obsidian open with the target vault. Plugin/theme
DEVELOPMENT workflows (reload-and-screenshot dev loops, DOM inspection) are
out of scope here — that's Obsidian plugin authoring, a different domain
than maintaining a project wiki's content.

## Syntax

Parameters take a value: `obsidian create name="My Note" content="Hello"`.
Flags are boolean switches: `obsidian create name="X" silent overwrite`.
Multiline content: `\n` for newline, `\t` for tab. `obsidian help` is
always current — check it for the full command list rather than trusting
a stale example.

## Targeting

File: `file=<name>` (resolves like a wikilink) or `path=<path>` (exact,
from vault root) — omit both to target the active file. Vault: `vault=
<name>` as the first parameter targets a non-default vault; otherwise the
most recently focused vault is used.

## Common operations

```bash
obsidian read file="My Note"
obsidian create name="New Note" content="# Hello" template="Template" silent
obsidian append file="My Note" content="New line"
obsidian search query="search term" limit=10
obsidian property:set name="status" value="done" file="My Note"
obsidian tags sort=count counts
obsidian backlinks file="My Note"
obsidian daily:append content="- [ ] New task"
```

`--copy` on any command copies output to clipboard. `silent` prevents the
file from opening. `total` on list commands returns a count instead of the
full list — cheaper when only the count is needed (pairs with
`vault-health.md`'s stats workflow when the bundled script doesn't cover
a specific query).

## Environment footguns

Linux, `Trace/breakpoint trap (core dumped)` on newer distros (Ubuntu
23.10+): add `--no-sandbox` — `obsidian help --no-sandbox`. Obsidian
installed via Snap: the plain `obsidian <command>` binary may launch a new
GUI window instead of attaching to the running instance — invoke through
`snap run obsidian <command>` instead.

## Boundary

This is the mechanical vault-CRUD surface — use it to script an operation
`vault-health.md`'s bundled Python scripts don't cover, or to drive
`obsidian daily:*`/`obsidian tasks`/`obsidian property:*` directly instead
of hand-editing frontmatter. Deciding vault STRUCTURE is `structure.md`'s
job; this is just the tool to execute the decision.
