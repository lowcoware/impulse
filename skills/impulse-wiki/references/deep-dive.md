# Deep-dive wiki — the team's single source of truth, not an index

A MOC (`moc.md`) is a map: it tells you a note exists and points at it. A
deep-dive wiki is the destination those links point TO — full pages a new
teammate, a stakeholder, or future-you can open and actually learn the
project from: what it is, why it's built this way, how to run it, and what
the real code looks like. This is what most open-source projects mean by
"the wiki" (see the well-regarded examples below) — not a note-taking
habit, a product surface the whole team reads and feeds.

## When this applies

- The vault is meant to be the team's shared home base — specs, decisions,
  and "what is this project" all flow into it over the project's life, not
  just this skill's own MOC/health passes.
- Someone new (a teammate, a stakeholder, a future maintainer) needs to be
  able to open it and understand the project without asking anyone.
- The vault will likely be **hosted somewhere** (see Hosting below) — so
  page design and readability matter, not just internal linking.

If the ask is "just build me an index of what's in this folder," that's
`moc.md`, not this.

## Page set (starting shape, `/reference/` folder per `structure.md`)

| Page | Contains |
|---|---|
| `Home.md` | One paragraph: what the project is and why it exists. "Current focus" line (which spec/phase is active). Links to every other page below. |
| `Getting-Started.md` | Real, copy-pasteable setup: clone command, install command, run command, first thing to try. Every command here must actually work — verify, don't guess. |
| `Architecture.md` | The system in prose + one diagram (`canvas.md`, or a `impulse-artifact` diagram embedded/linked if it needs to live outside the vault too). Names the real modules/services and how they talk to each other. |
| One page per module/domain | What it's for, its real public entry points, and a **verbatim code excerpt** (not a paraphrase) showing the shape a contributor will actually touch. |
| `Decisions.md` | Not a duplicate of `/adrs/` — a short annotated feed linking to each ADR as it lands, so "why did we do X" is answerable from one page without hunting folders. |
| `Glossary.md` | Already owned by `capture-and-atomize.md` — link it from `Home.md`, don't duplicate it here. |

## The non-negotiable: code excerpts are copied, never reconstructed

Every code block on a module page is copied verbatim from the actual
source file, with a `file:line` citation next to it. Never paraphrase a
function from memory and present it as the real implementation — that's
exactly the fabrication failure `impulse-clone`'s evidence-honesty rule
exists to catch, and it applies here for the same reason: a wiki reader
trusts the page is what the code actually does. If the real source can't
be read (private dependency, generated file, whatever), say so on the page
instead of inventing a plausible-looking snippet.

Pull excerpts short — the smallest slice that shows the real shape (one
function, one config block), not a whole file pasted in. A page that's
90% pasted source stopped being a wiki page and became a second copy of
the repo.

## Feeding the wiki as the project moves

- New spec merged (`spec-driven.md`) → one line added to `Home.md`'s
  "current focus," plus the relevant module page's excerpt refreshed if
  the change touched what that page shows.
- New ADR (`adr.md`) → one annotated line added to `Decisions.md`.
- New module / major refactor → new module page, or an existing one's
  excerpt re-pulled from the changed source.
- This is incremental upkeep, not a scheduled full rebuild — same
  rebuild-trigger philosophy as `moc.md`: rebuild what materially changed,
  not everything on every commit.

## Design bar, if this will be hosted

A wiki meant to be opened by the whole team (and possibly outside
stakeholders) is read, not just searched — density and navigability matter
the way they do for any document, same bar `impulse-artifact` holds
single-file HTML deliverables to: no wall-of-text pages, one clear nav
path from `Home.md` to everything else, headings that let a reader scan
before committing to read.

## Hosting an Obsidian vault as a real website

Obsidian's own paid option is Publish (~$8/month, official, zero setup).
The actively-maintained free/self-hosted alternative most projects reach
for is **Quartz** (jackyzha0/quartz) — a static-site generator built
specifically for Obsidian-flavored Markdown (wikilinks, callouts,
frontmatter) that compiles a vault (or a folder of it) into a fast,
searchable static site with backlinks and a graph view, deployable to
GitHub Pages, Vercel, or Netlify for free. Practical notes:

- Point Quartz at the `/reference/` folder (plus `Home.md`,
  `Glossary.md`) rather than the whole vault — `/inbox/`, `/playbooks/`,
  and working `/specs/` drafts are usually internal, not what a published
  site should expose.
- Every published page needs real frontmatter (`title`, `description`) —
  `impulse-md-generator`'s job, not this skill's; a page missing it
  still builds, just with a worse nav/preview.
- A vault with unresolved `[[wikilinks]]` to notes that don't exist yet
  builds fine locally but ships broken links on the public site —
  `vault-health.md`'s broken-link check is what this skill runs before any
  publish.

Sources: [What is a GitHub Wiki and how do you use it? — freeCodeCamp](https://www.freecodecamp.org/news/what-is-github-wiki-and-how-do-you-use-it/), [4 ways to host Obsidian online — XDA Developers](https://www.xda-developers.com/ways-host-obsidian-online/), [Obsidian Publish](https://publish.obsidian.md/)

## Boundaries

Deciding WHAT a spec/ADR says: `impulse-project-management`, unchanged.
Per-note Markdown syntax: `impulse-md-generator`, unchanged. This
workflow only decides how the durable `/reference/` pages are shaped and
kept current — it does not replace `moc.md` (a deep-dive page set still
gets indexed by a MOC once it exists) or `vault-health.md` (still the gate
before publishing).
