# Gallery — vendored example artifacts

21 self-contained HTML files under `examples/` — the SECONDARY reference
for this skill: structure, density, and tone of each genre. The visual
system (colors, type, borders, accent) always comes from
`self-reference.html` — never from these files; they carry Anthropic's own
document design language, not this suite's. All are Anthropic's
"unreasonable effectiveness of HTML" sample gallery (Apache-2.0), plus one
architecture-diagram exemplar from plannotator/effective-html (MIT).
Vendored directly (not linked out) because the whole point is opening them
and matching structure and density — a pointer to a clone rotates its
content behind your back.

Open a file in a browser to see it render; the code is what to imitate, the
render is what to match.

## Index

| File | What it shows | Genre |
|---|---|---|
| 01-exploration-code-approaches.html | Debounced search, three approaches compared | general |
| 02-exploration-visual-designs.html | Empty state, four visual directions | general |
| 03-code-review-pr.html | PR review summary | pm-handoff |
| 04-code-understanding.html | How auth flows through a codebase | diagram |
| 05-design-system.html | Design system reference page | general |
| 06-component-variants.html | Component variant matrix | general |
| 07-prototype-animation.html | Micro-interaction prototype | general |
| 08-prototype-interaction.html | Drag-to-reorder prototype | general |
| 09-slide-deck.html | Weekly slide deck | plan |
| 10-svg-illustrations.html | Header illustrations in SVG | general |
| 11-status-report.html | Weekly engineering status report | pm-handoff |
| 12-incident-report.html | Incident report (INC-style) | pm-handoff |
| 13-flowchart-diagram.html | Annotated deploy-pipeline flowchart | diagram |
| 14-research-feature-explainer.html | How a feature works, explained | general |
| 15-research-concept-explainer.html | Interactive concept explainer (consistent hashing) | general |
| 16-implementation-plan.html | Implementation plan for a feature | plan |
| 17-pr-writeup.html | PR write-up / design rationale | pm-handoff |
| 18-editor-triage-board.html | Interactive triage board | general |
| 19-editor-feature-flags.html | Feature-flag editor UI | general |
| 20-editor-prompt-tuner.html | Prompt-tuning editor UI | general |
| 21-architecture-interactive.html | Full-screen pannable/zoomable architecture diagram, clickable nodes, animated request paths | diagram |

Genre column maps to `genres.md`'s three modes — use it to pick the closest
starting point, not as a hard category. The shared token/color/component
system underneath 20 of these 21 files is extracted in `palette.md` —
start there for the visual system, use this index to find the nearest
layout precedent.

## Sample-data honesty

Every example uses fictional data — the placeholder brand "Acme", made-up
metrics, invented PRs. Match the STRUCTURE and visual craft, never copy a
literal number or name into a real artifact (ai-tells.md's fake-precise-
numbers ban applies here exactly as it does anywhere else in impulse).
