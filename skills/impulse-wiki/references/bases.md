# Obsidian Bases — .base files

From kepano/obsidian-skills (MIT, Steph Ango), re-expressed. Database-like
views over vault notes — filters, formulas, table/cards/list/map views.
Use for `/bases/` per `structure.md`: an open-ADRs view, an active-specs
board, a task tracker over playbook outputs. Full function catalog:
`bases-functions.md`.

## Workflow

1. Create the `.base` file — valid YAML.
2. `filters` — which notes appear (tag/folder/property/date), applies to
   all views unless a view sets its own.
3. `formulas` (optional) — computed properties, referenced as `formula.X`.
4. One or more `views` (`table`/`cards`/`list`/`map`), `order` listing
   which properties show.
5. **Validate**: valid YAML, every `formula.X` used has a matching
   `formulas.X` entry, quoting rules below respected.
6. Open in Obsidian — a YAML error at this step means re-check quoting.

## Schema skeleton

```yaml
filters:
  and:
    - 'status == "active"'
    - not: ['file.hasTag("archived")']
formulas:
  days_until_due: 'if(due, (date(due) - today()).days, "")'
properties:
  formula.days_until_due:
    displayName: "Days Until Due"
summaries:
  custom_name: 'values.mean().round(3)'
views:
  - type: table
    name: "View Name"
    limit: 10
    groupBy: { property: status, direction: ASC }
    order: [file.name, status, formula.days_until_due]
    summaries: { status: Unique }
```

## Filters

Single string, or a recursive object with exactly one key (`and`/`or`/
`not`) holding a list — nest freely. Operators: `== != > < >= <=` and
`&& || !`.

## Properties

Three namespaces: note properties (`author` or `note.author`, from
frontmatter), file properties (`file.name`/`file.path`/`file.mtime`/
`file.tags`/`file.backlinks`/...), formula properties (`formula.X`). `this`
= the base file itself in the main area, the embedding file when embedded,
the active file in the sidebar. A property name with a space or special
character can't follow dot notation — use bracket form instead:
`note["Due Date"]`, never a backtick-quoted name.

## Formula gotchas (the actual failure modes)

1. **Date subtraction returns a `Duration`, not a number.** `Duration`
   supports `.days`/`.hours`/`.minutes`/`.seconds`/`.milliseconds` but NOT
   `.round()`/`.floor()`/`.ceil()` directly — access a numeric field
   first, THEN round it: `(date(due) - today()).days.round(0)`, never
   `((date(due) - today()) / 86400000).round(0)`.
2. **Guard every optional property with `if()`.** `(date(due_date) -
   today()).days` crashes when `due_date` is empty on some notes;
   `if(due_date, (date(due_date) - today()).days, "")` doesn't.
3. **Every `formula.X` referenced anywhere must be defined in
   `formulas`.** An undefined reference fails silently, not loudly — the
   symptom is a blank column, not an error.

## YAML quoting (the actual failure modes)

Strings containing `: { } [ ] , & * # ? | - < > = ! % @` \`\`\` need
quotes. A formula containing double quotes gets wrapped in single quotes —
`'if(done, "Yes", "No")'`, never double-quoting a string that itself
contains double quotes.

## Views

`table` (default, `summaries` per column), `cards` (`order` should lead
with an image/cover property), `list` (minimal), `map` (needs a
`coordinates` property per note — `"lat, lng"` string or a `[lat, lng]`
list, not separate `lat`/`lng` properties — plus the Maps community
plugin; note this dependency to the user before building one).

Built-in named summaries for `table` columns (`summaries: { prop: Name }`,
type-gated — not every name applies to every property): all types get
`Empty`/`Filled`/`Unique`; numbers add `Sum`/`Average`/`Min`/`Max`/`Median`/
`Range`/`Stddev`; dates add `Earliest`/`Latest`/`Range`; checkboxes add
`Checked`/`Unchecked`.

## Embedding

`![[MyBase.base]]` in a Markdown note, or `![[MyBase.base#View Name]]` for
one specific view — the natural way a MOC (`moc.md`) surfaces a live query
instead of a hand-maintained list.

## Boundary

A Base is a live query, never a place to duplicate data that already lives
in frontmatter elsewhere — if the answer is "filter existing notes," build
a Base; if it's "record a new fact," that's a property on the note itself
(`impulse-md-generator`'s territory).
