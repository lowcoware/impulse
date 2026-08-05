# Vault structure — a project wiki, not a personal PKM

Personal-knowledge-management vault advice (PARA, Zettelkasten-for-life,
daily-notes-as-inbox) targets one person's whole life. A PROJECT wiki has a
different shape: its taxonomy mirrors what impulse-project-management already
produces, so the vault becomes the browsable surface over artifacts that
already exist — never a second place to invent structure.

## Folder taxonomy

```
/specs/          — one file per spec-driven.md unit of work, current + archived
/adrs/           — ADR-NNN files, adr.md's numbering/lifecycle owns these
/playbooks/      — mechanical playbook outputs (checkpoints, retros, triage logs)
/reference/      — living technical reference: architecture, conventions, runbooks
/glossary/       — Glossary.md (capture-and-atomize.md), domain terminology
/canvas/         — .canvas files: architecture diagrams, flow maps
/bases/          — .base files: database views over the above (open tasks, ADR status)
/inbox/          — fleeting capture, triaged out within the session that created it
_MOC_*.md        — Maps of Content, one per folder/domain, at vault root or per-folder
```

This is a starting taxonomy, not a mandate — a project with its own
established structure keeps it; this shape is what to reach for on a fresh
vault, same spirit as impulse-frontend's DESIGN.md defaults.

## Where content comes from

This skill never invents WHAT goes in the vault — same non-negotiable
impulse-md-generator already holds. Content sources, one per folder:

| Folder | Fed by |
|---|---|
| `/specs/` | impulse-project-management's spec-driven.md |
| `/adrs/` | impulse-project-management's adr.md |
| `/playbooks/` | impulse-project-management's playbooks.md outputs |
| `/reference/` | whatever the project's impulse-backend/impulse-frontend/impulse-devops work produces as durable reference |
| `/canvas/`, `/bases/` | this skill's own canvas.md / bases.md — the one place THIS skill originates content, because a diagram or a database view IS the deliverable, not a record of one |

Formatting (wikilinks, callouts, properties) is `impulse-md-generator`'s job on
every file this skill touches — this skill decides WHERE a note lives and
HOW it connects to the rest of the vault, not its Markdown syntax.

## MOC hierarchy

One `_MOC_<domain>.md` per top-level folder, plus one root `_MOC_Project.md`
linking to each domain MOC. A MOC that just lists filenames is a folder
listing wearing a costume — group by sub-topic, one annotated line per note
(what it covers, not just its title). Full build workflow: `moc.md`.

Rebuild a MOC when its folder's file count changes materially (a handful of
new specs, not every single one) — a MOC rebuilt on every file add is
churn; a MOC stale for months is dead weight. `vault-health.md`'s stats
script reports file counts per folder as the trigger signal.

## Boundaries

WHAT gets written and WHEN: `impulse-project-management`. HOW a note is
formatted: `impulse-md-generator`. WHERE it lives and how the vault connects:
here.
