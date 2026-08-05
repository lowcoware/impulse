# Genres — three modes, one skill

Pick the closest genre before opening the gallery. Each has a different
prose-to-visual ratio; picking the wrong one is the most common failure
mode (a diagram request that comes back prose-heavy, or a report that comes
back as a bare wall of text).

## General artifact

Default mode. A report, explainer, comparison, deck, or prototype that
isn't specifically a plan or a diagram. Review `gallery.md`'s "general"
rows for the nearest match, match style/density/tone — not a template to
fill in, a reference to calibrate against.

## Plan

A plan page: implementation plan, roadmap, weekly slide deck. Pragmatic and
simple over impressive. Keep the writing close to what the user actually
gave you — this is not the place to invent scope, restructure their intent,
or pad a short plan into a longer one because HTML has room. If the ask is
"clean up the grammar," clean up the grammar; don't turn it into a bigger
artifact than requested. Nearest gallery examples: 09, 16.

## Diagram

Full-screen, prose-light, built to make architecture or a system click
fast — not a report with a diagram in it. Nearest gallery examples: 04, 13,
21 (21 is the load-bearing exemplar: full-screen SVG stage, clickable
nodes, animated request paths).

Rules specific to this genre:

1. **Build the SVG with care.** Iterate on the diagram more than on
   anything else in the artifact — this genre's whole value is the
   diagram, not the surrounding chrome.
2. **Interactive when it earns it.** If the system has meaningful sequences
   (a request path, a state transition), make nodes clickable and animate
   the flow — don't leave it as a static picture when motion would make it
   click faster. Motivation gate still applies: name what the animation
   explains (impulse-frontend/motion-craft.md §1) — decoration for its own
   sake is still a `tell:` even in a one-off artifact. Concrete mechanics
   (flowing dashed connectors, traveling request dots, z-order, the SMIL
   reduced-motion gotcha): `animated-connectors.md`.
3. **Theme the SVG through CSS variables**, never hard-coded hex inside
   `<svg>` — see `dark-mode.md`. A diagram that ignores the toggle is a bug.
4. **Overlays are always dismissible and always reachable again.** Any
   panel that floats over the SVG stage (detail card, legend, filter) needs
   a visible close control AND must reopen when the user clicks the node or
   filter that triggers it. A floating panel with no close button
   permanently blocks the stage underneath it.
5. **Pan and zoom are almost always needed** — architecture diagrams exceed
   the screen. Full technique: `pan-zoom.md`.
6. **Component-type color coding, not per-node improvisation.** Pick one
   fill/stroke pair per component *type* (frontend, backend, database,
   external/cloud, security, message-bus) and reuse it for every node of
   that type — inventing a new color per box is what makes AI-generated
   diagrams look arbitrary. Security/trust boundaries get a dashed stroke,
   not a solid one, so the eye reads "boundary" instead of "component" on
   sight.
7. **Spacing has to be computed, not eyeballed.** Node overlap and
   legends colliding with boundary boxes are the #1 way a generated diagram
   reads as broken. Before placing anything: fix a minimum gap between
   stacked nodes (don't let two boxes closer than ~2/3 of a node's own
   height), and place the legend only after every boundary box's extent is
   known — legend top >= lowest boundary's bottom edge + a real margin, not
   "wherever fit". If a connector (bus/queue label) sits between two nodes,
   center it in the gap, don't let it touch either box.

Export-to-image is a common ask for this genre specifically (share a
diagram outside the chat) — pattern and copy-paste snippet: `export-toolbar.md`.
