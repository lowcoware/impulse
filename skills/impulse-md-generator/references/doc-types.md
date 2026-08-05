# Doc types — property schema + section skeleton per kind

Structure only. For what the prose inside each section should sound like,
see `impulse-humanizer/references/before-after-library.md` (examples #9 ADR,
#10 service README) and its `genre-calibration.md` impulse-suite section.

## ADR (architecture decision record)

**Property schema:**

```yaml
---
title: "ADR-014: event-driven communication between services"
type: adr
status: accepted   # proposed | accepted | rejected | superseded
date: 2026-01-15
service: "[[orders]]"
tags:
  - adr
related:
  - "[[ADR-009]]"
---
```

**Skeleton:** owned by `impulse-project-management/references/adr.md` (its
Context / Decision / Alternatives considered / Consequences sections) —
don't restate it here. Obsidian-rendering specifics this skill adds on top:
render each rejected alternative as a `[!failure]` callout, `status` lives
in the frontmatter property above (not a body section), and keep the
`## Links` section (Depends-on / Used-by / Related) from adr.md's template.

Ownership boundary: WHEN an ADR gets written and WHERE the ADR index lives
is impulse-project-management's call, not this skill's — this skill only
formats one it's told to write.

## Service README

**Property schema:**

```yaml
---
title: orders
type: service
status: active
tags:
  - service
---
```

**Skeleton:** matches impulse-backend's `docs.md` "Service docs — the whole
list" exactly — this skill formats it, doesn't expand it.

```markdown
# orders

<2-3 sentences: what it does>

## Run

<actual command>

## Owns / talks to

<data ownership, event topics produced/consumed — see impulse-backend boundaries.md>

## Config

| Var | Required | Default | Meaning |
|---|---|---|---|

## What it doesn't do

<explicit non-scope — the strongest signal of an honest service doc>
```

No `## Связи`, no C4 diagram, no glossary section — impulse-backend's ban on
doc ceremony holds here too. A Mermaid sequence diagram is fine if the
service's request flow genuinely needs one (`style.md`), not as a default
section.

## Status report / weekly update

**Property schema:**

```yaml
---
title: "Week 2026-W03"
type: report
date: 2026-01-19
tags:
  - report
related:
  - "[[orders]]"
  - "[[ADR-014]]"
---
```

**Skeleton:** loosest of the four — this is closest to the user's own
register (impulse-humanizer level 4). Don't force sections that have nothing
in them this week.

```markdown
# Week 2026-W03

<what shipped, in the user's own voice — see genre-calibration.md level 4>

> [!todo] Open
> <anything genuinely still open — skip this callout if nothing's open>

## Blockers

<only if real; delete the section if empty, don't write "none">
```

## Runbook

**Property schema:**

```yaml
---
title: "Runbook: orders DB failover"
type: runbook
service: "[[orders]]"
tags:
  - runbook
---
```

**Skeleton:**

```markdown
# Runbook: <specific scenario, not "orders operations">

> [!danger] Before you run this
> <irreversible-action warning, if any step is irreversible — omit if none>

## When this applies

<the actual trigger condition, specific>

## Steps

1. <numbered, imperative, one action per step>

## Verify

<how to confirm it worked — a command, a dashboard, a log line>
```

## Ad-hoc note (no matching type)

Minimum viable frontmatter — `title`, `tags` — then plain structured
Markdown. Don't force one of the four schemas above onto content that
doesn't fit it; a mismatched schema is worse than no schema.
