---
name: impulse-md-generator
description: >
  Formats generated Markdown as valid Obsidian Flavored Markdown:
  properties/frontmatter, wikilinks, callouts, embeds, tags, Mermaid,
  footnotes. Core Obsidian only, zero plugin dependency. Governs HOW a doc
  is formatted, not WHAT gets written or WHETHER a doc-tree exists. Voice
  from impulse-humanizer. Triggers: "/impulse-md", "оформи в obsidian", "сделай
  отчёт в md", "красиво оформи документ", "obsidian формат", "obsidian
  markdown".
---

# impulse-md-generator

Formatting layer, not a documentation-policy layer. This skill answers "how
do I write this note so it renders well in Obsidian" — it never answers
"should this note exist" or "what folder structure does this project need."
Those questions belong to whoever called this skill.

## Boundary — read this before generating anything

- impulse-backend's `docs.md` bans forced `docs/` trees, «Связи» sections, C4
  diagrams, glossary files. This skill doesn't relax that ban — if the
  caller wants a minimal README, format a minimal README beautifully. Don't
  pad it into a doc-tree because callouts and wikilinks are available.
- ADR/report/retro cadence, WHEN a doc gets written, WHERE it lives — owned
  by impulse-project-management. This skill formats what impulse-project-management
  decides to write.
- Voice — never this skill's job. Call `impulse-humanizer` (its trigger #2 is
  exactly this: automatic inside doc generation). This skill formats
  structure; impulse-humanizer supplies the words.

## Workflow

1. **Confirm doc type** (ADR / service README / status report / runbook /
   ad-hoc note) → pick the property schema and section skeleton from
   `references/doc-types.md`. No matching type → plain structured Markdown,
   properties still apply (title, tags at minimum).
2. **Frontmatter first.** Properties block is the very first thing in the
   file, no blank line above it. See `references/properties.md`.
3. **Write content** with standard Markdown structure, Obsidian syntax where
   it earns its place — see `references/style.md` for when a callout beats
   plain text and when Mermaid beats prose.
4. **Link, don't duplicate.** A fact that lives in another note gets a
   `[[wikilink]]`, not copy-pasted. External URLs get plain `[text](url)`.
5. **Voice pass.** Hand the draft to impulse-humanizer (or apply its
   `references/voice-profile.md` inline) before calling it done — genre
   level per `impulse-humanizer/references/genre-calibration.md`'s impulse-suite
   section.
6. **Verify structurally** — frontmatter parses as YAML, every `[[wikilink]]`
   target is spelled the way the target note is actually named, callout
   syntax has no space before `[!type]`.

## Core syntax — quick reference

Full detail in `references/syntax.md`, `references/callouts.md`,
`references/embeds.md`. The essentials:

| What | Syntax | Note |
|---|---|---|
| Internal link | `[[Note Name]]` / `[[Note#Heading]]` / `[[Note\|Display]]` | Obsidian tracks renames; use for anything inside the vault |
| External link | `[text](url)` | Never wikilink an external URL |
| Embed | `![[Note]]` / `![[image.png\|300]]` | `!` prefix pulls content inline, stays live-updated |
| Callout | `> [!type] Title` | icon+color box; see the type table, don't invent types |
| Tag | `#tag`, `#nested/tag` | inline or in frontmatter `tags:` — not a substitute for a real property |
| Highlight | `==text==` | Obsidian-only, sparingly — a highlighted paragraph highlights nothing |
| Comment | `%%hidden%%` | hidden in reading view; for editor-only notes, not secrets |
| Footnote | `text[^1]` + `[^1]: note` | for asides that would break the paragraph's flow |
| Math | `$inline$` / `$$block$$` | MathJax, standard LaTeX |
| Diagram | ` ```mermaid ` fenced block | native render, no plugin. See `references/style.md` for when it's worth the lines |

## Properties — the one mandatory habit

Every generated note gets frontmatter: at minimum `title`, `tags`. Doc-type
schemas add more (`references/doc-types.md`). This isn't decoration — a
vault with consistent properties gets Obsidian's core **Bases** feature for
free: a filterable/sortable table view over notes, zero query language,
zero plugin install, built entirely from properties this skill already
writes. Don't build a Bases file speculatively (ladder rung 1 — nobody asked
for a dashboard yet); do keep properties consistent so one costs nothing to
add later.

## Zero plugin dependency

No Dataview query blocks, no Templater syntax, no community-plugin-only
features. Everything in this skill renders in a stock Obsidian install.
`Bases` (mentioned above) is the one exception worth knowing about — it
shipped as a **core** plugin, not a community one, so it doesn't violate
this rule.

## References — load on demand

| File | Covers | Load when |
|---|---|---|
| references/syntax.md | full core syntax: wikilinks, tags, comments, highlight, math, Mermaid, footnotes | any generation task, first read |
| references/properties.md | property types, YAML rules, shared property vocabulary (per-doc-type frontmatter schemas live in doc-types.md) | writing frontmatter |
| references/callouts.md | full callout type table, aliases, nesting, foldable syntax | deciding which callout type fits |
| references/embeds.md | note/image/PDF/audio/block embeds, sizing | pulling content from another note |
| references/doc-types.md | ADR / service README / status report / runbook templates: property schema + section skeleton (ADR skeleton is owned by impulse-project-management/adr.md) | starting a new doc of a known type |
| references/style.md | when a callout beats plain text, when Mermaid earns its lines, wikilink/folder conventions, MOC pattern | any judgment call on "should I use X here" |
| references/showcase.md | one file exercising every syntax element in this skill — all 13 callout types, every wikilink/embed form, tags, comments, highlight, math, Mermaid, footnotes, GFM tables/checklists. Doubles as this skill's own self-generated reference artifact (properties + syntax written by this skill's own rules, not hand-templated) — the reference-artifact directive is already satisfied here, not a gap | open in Obsidian to sanity-check rendering, or as a lookup when unsure a construct is spelled right |

## Adjacent skills

Same content-vs-format split, different delivery shape: an ongoing note in
an Obsidian vault is this skill's job; a standalone shareable single-file
HTML document (report, plan, diagram) is `impulse-artifact`'s. Where a note
LIVES, how it connects to the rest of the vault, MOCs, vault health, Canvas,
and Bases are `impulse-wiki`'s job — this skill formats the one note in front
of it, impulse-wiki maintains the vault it lives in.

## Lineage

Core syntax reference adapted from [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) (MIT, Steph Ango / Obsidian). Doc-type schemas and style rules are original to impulse-suite.
