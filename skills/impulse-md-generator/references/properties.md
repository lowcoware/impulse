# Properties (frontmatter) — reference

YAML frontmatter at the very start of the file — no blank line above it, no
content before it.

```yaml
---
title: My Note Title
date: 2026-01-15
tags:
  - project
  - important
aliases:
  - My Note
  - Alternative Name
status: in-progress
rating: 4.5
completed: false
due: 2026-02-01T14:30:00
---
```

## Property types

| Type | Example |
|---|---|
| Text | `title: My Title` |
| Number | `rating: 4.5` |
| Checkbox | `completed: true` |
| Date | `date: 2026-01-15` |
| Date & time | `due: 2026-01-15T14:30:00` |
| List | `tags: [one, two]` or a YAML block list |
| Link | `related: "[[Other Note]]"` — quote it, `[[` unquoted breaks YAML |

## Default (Obsidian-recognized) properties

- `tags` — searchable, shown in the tag pane and graph view.
- `aliases` — alternative names; `[[wikilinks]]` to any alias resolve to this note.
- `cssclasses` — CSS classes applied to the note, only relevant if the vault has custom styling.

## Impulse-suite property vocabulary — keep it consistent

Every doc-type schema in `doc-types.md` reuses these same property names.
Consistency here is what makes Bases (SKILL.md's note) actually useful
later — a table view that mixes `status`/`state`/`stage` across different
doc types because each was named differently is a table view that can't
filter on anything.

| Property | Values | Used by |
|---|---|---|
| `title` | text | every doc type |
| `type` | `adr` \| `service` \| `report` \| `runbook` | every doc type — lets a Base filter by kind |
| `tags` | list | every doc type |
| `status` | `draft` \| `active` \| `deprecated` (ADR: `proposed` \| `accepted` \| `rejected` \| `superseded`) | ADR, service |
| `date` | `YYYY-MM-DD` | every doc type — creation/decision date |
| `service` | `[[Service Name]]` link | ADR, report — which service this concerns |
| `related` | list of `[[wikilinks]]` | ADR, report — cross-references |

Don't invent a new property name for a concept an existing one already
covers — check this table before adding a frontmatter key.

## Tags — syntax rules

```markdown
#tag
#nested/tag
#tag-with-dashes
#tag_with_underscores
```

Allowed: letters (any language), numbers (not as the first character),
underscores, hyphens, forward slashes for nesting. Same tag works inline in
prose or in the `tags:` list — see `syntax.md`'s Tags section for when to
use which.
