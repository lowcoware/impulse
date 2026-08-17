---
name: impulse-wiki
description: "Maintain a whole Obsidian vault as a project wiki — structure/taxonomy, Maps of Content, vault health (orphan detection, broken-link healing, stats, TOC), Canvas diagrams, Bases views, CLI vault automation, and a multi-page team wiki (Home/Getting-Started/Architecture/module pages with code, hostable via Quartz). Not per-note syntax formatting (impulse-md-generator), not deciding what gets written (impulse-project-management) — decides WHERE things live and keeps the vault connected/healthy as it grows. Triggers: \"/impulse-wiki\", \"веди вики проекта\", \"создай вики\", \"team wiki\", \"onboarding wiki\", \"vault health\", \"maintain the wiki\", \"построй MOC\", \"найди сироты\", \"почини битые ссылки\", \"canvas диаграмма\", \"obsidian base\", \"vault stats\", \"структура вольта\". From kepano/obsidian-skills (MIT) + tpitsunov/obsidian-skills (MIT) + adriangrant/Obsidian-SKILLS (MIT)."
---

# impulse-wiki

The vault-lifecycle counterpart to `impulse-md-generator`: that skill formats
ONE note's syntax; this skill maintains the WHOLE vault as a connected,
navigable project wiki — structure, cross-linking, health, and Obsidian's
richer file types (Canvas, Bases).

## Division of labor (read before doing anything)

| Question | Owner |
|---|---|
| Should this document exist? What does it say? When does it get written? | `impulse-project-management` |
| How is this note's Markdown formatted (wikilinks, callouts, properties)? | `impulse-md-generator` |
| Where does it live? How does it connect to the rest of the vault? Is the vault healthy? | **this skill** |

Never invents content — same non-negotiable impulse-md-generator holds. A
canvas or a Base is the one exception: the diagram or the query IS the
deliverable this skill originates, not a record of something decided
elsewhere.

## Workflow

1. **New project, or first time this skill touches the vault** →
   `references/structure.md` for the folder taxonomy and how it maps to
   impulse-project-management's outputs.
2. **Building or updating an index note** → `references/moc.md`.
3. **Health check, orphan/broken-link cleanup, stats, ToC** →
   `references/vault-health.md` — script-first, deterministic.
4. **Architecture/flow diagram as a vault artifact** →
   `references/canvas.md` (`.canvas` files — different from
   `impulse-artifact`'s standalone-HTML diagrams; pick by where it needs to
   live).
5. **Database-like view over notes** (open ADRs, active specs, a task
   board) → `references/bases.md` (`.base` files).
6. **Shell automation against a running vault** → `references/cli.md`.
7. **Inbox triage, glossary, tagging, splitting an oversized doc** →
   `references/capture-and-atomize.md`.
8. **A team-facing wiki the whole project reads and feeds — specs,
   decisions, onboarding, possibly hosted publicly** →
   `references/deep-dive.md`: real multi-page site (Home, Getting Started,
   Architecture, per-module pages with verbatim code excerpts, a
   Decisions feed), not a single index note.

## Locate the skill (for script invocation)

```bash
IMPULSEWIKI_DIR=$(dirname "$(ls -1 \
  "$HOME/.claude/skills/impulse-wiki/SKILL.md" \
  "$PWD/.claude/skills/impulse-wiki/SKILL.md" \
  2>/dev/null | head -n1)")
export IMPULSEWIKI_DIR
```

Every bundled script in `scripts/` is invoked as `python3
$IMPULSEWIKI_DIR/scripts/<name>.py <args>` — see the reference file for each
operation for exact arguments.

## References

| File | Covers | Load when |
|---|---|---|
| references/structure.md | vault folder taxonomy for a PROJECT (not personal PKM), content-source mapping to impulse-pm | starting on a new vault, or deciding where something belongs |
| references/moc.md | building/rebuilding a Map of Content index note | any MOC task |
| references/vault-health.md | orphan detection, broken-link healing, stats, ToC generation — all script-backed | vault maintenance, periodic health check |
| references/canvas.md | `.canvas` file schema, node/edge types, validation | architecture/flow diagram as a vault artifact |
| references/canvas-examples.md | full worked canvas examples (mind map, project board, research, flowchart) | need a concrete starting shape |
| references/bases.md | `.base` file schema, filters, formulas, views, the actual failure modes (Duration math, YAML quoting, undefined formula refs) | any database-view-over-notes task |
| references/bases-functions.md | full function catalog (Date/String/Number/List/File/Link/Object/RegExp) | writing a non-trivial formula |
| references/cli.md | vault-CRUD shell commands, environment footguns (Linux sandbox, Snap) | scripting a vault operation from the shell |
| references/capture-and-atomize.md | inbox triage, glossary building, tagging, zettel atomization of oversized docs | organizing raw/oversized material into the vault's shape |
| references/deep-dive.md | team-facing multi-page wiki (Home, Getting Started, Architecture, module pages with verbatim code, Decisions feed), plus hosting a vault as a real static site | the wiki is meant to be the whole team's shared home base, not just an internal index |
| references/self-reference.md | self-generated reference artifact — a real multi-file deep-dive wiki (`references/self-reference/`) built by this skill's own deep-dive.md workflow, documenting the suite itself with verbatim code excerpts | checking whether current deep-dive output still matches this skill's own baseline |

## Scripts

`find_orphans.py` · `heal_links.py` · `generate_toc.py` · `vault_stats.py`
· `gather_data.py` (MOC data extraction) · `atomizer.py` (lossless
paragraph-level document splitting). Each documented with exact invocation
in its owning reference file above.

## Boundaries

- Obsidian PLUGIN or THEME development (writing `.js`/`.css` that extends
  Obsidian itself) is a different domain entirely — out of scope. This
  skill maintains a vault's CONTENT, not Obsidian's codebase.
- Personal life-PKM workflows (daily journaling ritual, personal
  Zettelkasten ideation, social-media clipping/transcription) are out of
  scope — this skill's taxonomy and health operations are calibrated for a
  PROJECT wiki, not a personal second brain.
- A diagram meant to ship as a standalone shareable HTML file (not a vault
  artifact) → `impulse-artifact`'s diagram genre, not `canvas.md`.
- "stop impulse" / "normal mode": revert to default behavior.
