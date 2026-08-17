---
name: impulse-artifact
description: "Generate a self-contained, single-file HTML artifact — a report, plan, comparison, prototype, or full-screen interactive diagram — calibrated against a curated example gallery. Mandatory dark mode. Not a Vue/Nuxt app: a one-off shareable document. Triggers: \"/impulse-artifact\", \"make an HTML report\", \"visualize this architecture\", \"html diagram\", \"turn this into a plan page\", \"self-contained html\", \"one-file html artifact\", \"сделай html отчёт\", \"визуализируй архитектуру\", \"html диаграмма\", \"сделай план в html\", \"визуальный артефакт\", \"покажи схему архитектуры\", \"инфографика\", \"infographic\", \"one-pager\", \"интерактивный отчёт\", \"сделай красивую страницу с результатами\", \"оформи как презентацию\". From plannotator/effective-html (MIT) + Anthropic's html-effectiveness example gallery (Apache-2.0)."
---

# impulse-artifact

The artifact-generation counterpart to `impulse-md-generator`: that skill
formats structured Markdown for Obsidian; this one renders a single
self-contained HTML file for anything meant to be opened as a document —
a report, plan, comparison, prototype, or diagram — not a production Vue
app. If the deliverable needs routing, state management, or a build step,
it's impulse-frontend's job, not this skill's.

## Workflow

1. **Pick a genre** — general / plan / diagram. `references/genres.md`.
2. **Calibrate the visual system against `references/self-reference.html`
   first** — it is the canonical baseline for every artifact this skill
   ships: Apple restraint + lowcoware DNA (warm near-black canvas, one red
   accent, thin borders, bold display headline with italic accent word,
   glow-blob card detail; dark is the canonical mode). Inherit its tokens
   and hierarchy — do NOT start from the vendored gallery's palette.
   The gallery (`references/gallery.md`, 21 files in `examples/`) is the
   secondary reference: use it for structure, density, and tone of the
   chosen genre — not for colors or type. `references/palette.md`
   documents the Anthropic-corpus tokens the gallery converges on — a
   fallback for component patterns (dot/pill/delta) where
   self-reference.html is silent, never an override of it.
3. **Content already decided elsewhere?** A calling skill (impulse-pm,
   impulse-review, impulse-debt, impulse-goal) usually supplies WHAT the artifact
   says — this skill only decides HOW it renders. `references/handoff.md`.
4. **Dark mode, always** — CSS variables, toggle, `localStorage`,
   apply-before-paint script. Non-negotiable on every artifact, every
   genre. `references/dark-mode.md`. This deliberately overrides
   `impulse-frontend`'s theme-is-a-per-project-decision rule — for
   standalone single-file documents only, never for product UI.
5. **Diagram genre only** — pan/zoom technique, dismissible overlays,
   motivated interactivity. `references/pan-zoom.md`.
6. **Ship as one file.** No build step, no external dependencies beyond
   what the browser ships natively — the whole point is "open this file
   and it works." The one narrow exception: `export-toolbar.md`'s
   pinned+SRI CDN scripts, and only when the user actually wants
   export-outside-the-chat — never bring in a CDN dependency for anything
   else (charting libraries included: hand-build the SVG per this skill's
   own techniques rather than reaching for D3/Chart.js/etc.). A
   ` ```mermaid ` fence (or `<pre class="mermaid">` in HTML) is not a CDN
   dependency — Artifacts renders it natively, no script tag involved —
   but reach for it only on a simple static structural diagram; the
   diagram genre's pan/zoom, clickable nodes, and animated request paths
   (`pan-zoom.md`, `animated-connectors.md`) need hand-built SVG, which
   mermaid's output can't give you.

## What this is not

Not a template-fill exercise — the gallery teaches calibration (how much
prose, how dense, what tone), not fields to substitute. A diagram request
that comes back prose-heavy, or a report that comes back as a bare wall of
text, means the wrong genre was picked in step 1.

## References

| File | Covers | Load when |
|---|---|---|
| references/genres.md | the three genres and their rules | every task, first read — pick the genre |
| references/gallery.md | index of all 21 vendored examples, genre-tagged | secondary reference — structure/density/tone of the chosen genre, never the visual system |
| references/palette.md | Anthropic-corpus token set (colors, type scale, radius, dot/pill/delta component patterns), dark variant | fallback for component patterns where self-reference.html is silent |
| references/dark-mode.md | the four mandatory dark-mode pieces + reference implementation | every artifact |
| references/pan-zoom.md | SVG pan/zoom technique: 1:1 pan, cursor-anchored zoom, click-after-drag suppression | diagram genre |
| references/animated-connectors.md | flowing dashed connectors, traveling request dots, z-order, SMIL reduced-motion handling | diagram genre, a request/data-flow sequence needs animating |
| references/export-toolbar.md | copy/PNG/PDF export pattern (html2canvas + jsPDF, pinned + SRI), collapsed toolbar UI | user wants the artifact shareable outside the chat (diagram, dashboard, prototype) |
| references/handoff.md | where an artifact request comes from (impulse-pm/review/debt/goal), the content-vs-format contract | the request originates from another impulse skill's output |
| references/self-reference.html | the canonical visual baseline — Apple restraint + lowcoware DNA (impulse-frontend/references/design-systems), general+plan+diagram genre techniques in one file | every task, before writing markup — the visual system every artifact inherits; also regenerate and diff when the rules above change |

## Boundaries

- Content policy (should this document exist, what cadence, what it says)
  stays with the calling skill — impulse-project-management for specs/retros/
  status reports, impulse-review for findings. This skill formats; it never
  decides.
- Ongoing notes that live in an Obsidian vault → `impulse-md-generator`, not
  this skill. This skill is for a standalone shareable file.
- A production Vue/Nuxt surface (routing, state, a real app) →
  `impulse-frontend`. This skill is for a one-off document.
- Visual quality bar (banned defaults, one accent, no fake-precise numbers)
  is `impulse-frontend/references/ai-tells.md` — a smaller surface than a full
  app, but the same discipline; see `dark-mode.md`'s note on this.
- Voice on generated prose → `impulse-humanizer`, same automatic-trigger
  pattern impulse-md-generator uses.
- **CSP is a real deployment constraint this skill can't design around.**
  A single-file artifact leans entirely on inline `<script>`/`<style>` —
  the exact pattern a real Content-Security-Policy exists to restrict, since
  inline JS is one of the most common XSS vectors. If the artifact ever
  gets served through infrastructure enforcing a strict CSP (an internal
  wiki, a doc portal, anywhere adding a `script-src`/`default-src`
  directive), inline scripts silently stop executing unless that
  infrastructure adds a matching nonce/hash — which a static single file
  can't provide for itself, and a hash breaks the moment the script's
  whitespace changes on the next edit. This skill has no lever to pull
  here; if the artifact needs to survive a strict-CSP host, that's a
  hosting-side decision (nonce injection, or serving as a sandboxed
  `iframe`) outside this skill's scope — flag it, don't silently assume
  the artifact will just run wherever it's opened.
- "stop impulse" / "normal mode": revert to default behavior.

## Lineage

Genre split (general/plan/diagram) and the dark-mode + pan-zoom techniques
are plannotator/effective-html (MIT). The 21-file example gallery under
`examples/` is Anthropic's own "unreasonable effectiveness of HTML" sample
set (Apache-2.0), vendored directly — plus one interactive architecture
exemplar from plannotator/effective-html (MIT). `handoff.md` and the
ai-tells/humanizer integration are original to the impulse suite.
