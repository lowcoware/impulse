# JSON Canvas — .canvas files

From kepano/obsidian-skills (MIT, Steph Ango), re-expressed. Use for
architecture diagrams, flow maps, and visual project boards that live in
`/canvas/` per `structure.md`. Full worked examples (mind maps, project
boards, research canvases, flowcharts): `canvas-examples.md`.

## File shape

`{"nodes": [], "edges": []}` — [JSON Canvas Spec 1.0](https://jsoncanvas.org/spec/1.0/).
`nodes` order = z-index (first = bottom layer).

## Nodes

Every node: `id` (unique 16-char lowercase hex, e.g. `"6f0ad84f44ce9c17"`),
`type` (`text`/`file`/`link`/`group`), `x`/`y` (top-left corner, y increases
down, coordinates can be negative), `width`/`height`, optional `color`
(preset `"1"`-`"6"` or hex).

| Type | Extra field | Note |
|---|---|---|
| `text` | `text` (Markdown string) | Newlines are `\n` in the JSON string — literal `\\n` renders as the two characters `\` and `n`, not a break |
| `file` | `file` (path), optional `subpath` (`#heading`) | |
| `link` | `url` | |
| `group` | optional `label`, `background`, `backgroundStyle` (`cover`/`ratio`/`repeat`) | visual container; position children inside its bounds |

Sizing: small text 200-300x80-150, medium 300-450x150-300, large
400-600x300-500, file/link preview 300-500x200-400.

## Edges

`id`, `fromNode`, `toNode` (both must reference existing node ids),
optional `fromSide`/`toSide` (`top`/`right`/`bottom`/`left`),
`fromEnd`/`toEnd` (`none`/`arrow`, default `toEnd: arrow`), `color`,
`label`.

## Layout discipline

Space nodes 50-100px apart, 20-50px padding inside groups, align to a
10/20px grid.

## Workflow

1. Create/read the file, generate unique ids not colliding with existing
   nodes or edges.
2. Add nodes, then edges connecting them.
3. **Validate before calling it done**: every id unique across nodes AND
   edges; every `fromNode`/`toNode` resolves; required field present per
   type; `type`/`fromSide`/`toSide`/`fromEnd`/`toEnd` values are from the
   allowed sets; color is a `"1"`-`"6"` preset or valid hex; JSON parses.

## Boundary

A canvas is a visual artifact, not a note — `impulse-md-generator`'s syntax
rules don't apply inside it (its `text` nodes hold Markdown, but the file
itself is JSON). An architecture diagram meant as a standalone shareable
HTML file, not a vault artifact, is `impulse-artifact`'s diagram genre
instead — pick based on where it needs to live.
