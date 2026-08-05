# Pan and zoom — the SVG diagram technique

Architecture diagrams almost always exceed the screen. This is the vanilla-
JS technique the diagram genre uses — no library, works inside a single
HTML file.

## Structure

Wrap all SVG contents in one group and drive its `transform` attribute:

```html
<svg id="stage" width="100%" height="100%">
  <g id="svg-content">
    <!-- all diagram content lives here -->
  </g>
</svg>
```

```js
let scale = 1, tx = 0, ty = 0;
const content = document.getElementById('svg-content');

function applyTransform() {
  content.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`);
}
```

## Pan — 1:1, not scaled

Track the pointer delta and apply it directly to `tx`/`ty` in SVG-space.

```
Do NOT divide the mouse delta by scale.
```

Dividing by scale is the single most common bug here: it makes dragging
feel sluggish exactly when the user has zoomed in to look closely — the
one moment precise tracking matters most. The pointer and the content must
move together 1:1 regardless of zoom level.

## Zoom — anchored at the cursor

Zooming must keep the SVG point under the cursor fixed, not the canvas
center — otherwise every zoom step drifts the thing the user was looking
at out from under their cursor.

```js
function zoomAt(cursorX, cursorY, factor) {
  // point in SVG-space under the cursor, before the zoom
  const svgX = (cursorX - tx) / scale;
  const svgY = (cursorY - ty) / scale;
  scale *= factor;
  // re-solve tx/ty so that svgX/svgY still lands under the cursor
  tx = cursorX - svgX * scale;
  ty = cursorY - svgY * scale;
  applyTransform();
}
```

## Suppressing spurious clicks after a drag

A drag that ends exactly over a node must not also fire that node's click
handler — that's the #1 diagram-feels-janky report. Track movement and
gate the click:

1. On pointer-down, record the start position and set `dragging = false`.
2. On pointer-move, if the cumulative movement exceeds a ~5px threshold,
   set `dragging = true`.
3. Attach a capture-phase, one-shot listener that calls
   `stopPropagation()` on the next `click` event ONLY when `dragging` was
   true — so a real click (no drag) still reaches the node handler
   normally.

## Feedback the user needs

- `cursor: grab` at rest, `cursor: grabbing` while dragging.
- A zoom-level indicator (e.g. "142%") — users lose track of scale fast on
  a large diagram.
- A reset-to-100% button — the recovery move when a user zooms/pans
  themselves into a corner they can't find their way back from.

## Performance on genuinely large diagrams

The structure above (one `<g>` wrapping all content) is already the first
optimization — it avoids the group-creation cost some libraries pay per
frame. Beyond that, cheapest-first:

1. `will-change: transform` on the content group during active pan/zoom —
   promotes it to its own compositor layer so the browser doesn't have to
   repaint the rest of the page each frame; remove it once interaction
   settles (leaving it on permanently costs memory for no benefit at rest).
2. If node count runs into the thousands: cull what's outside the current
   viewport rather than transforming every element every frame — filter to
   elements within the zoomed/panned bounds before touching the DOM, not
   after.
3. If SVG genuinely can't keep up even after the above (tens of thousands
   of nodes): Canvas is the honest escape hatch — it trades away SVG's
   per-element DOM/CSS/accessibility hooks for raw rendering throughput.
   Don't reach for it prophylactically; this genre's diagrams (architecture,
   plans) rarely have the node count where SVG is the actual bottleneck.

[W3C SVG WG: performance in panning & zooming](https://www.w3.org/Graphics/SVG/WG/wiki/Proposals/Performance_in_panning_&_zooming)

## Dismissible overlays (genre rule, restated here because it interacts with pan/zoom)

A detail panel or legend floating over the pannable stage needs its own
close control, independent of the stage's pan/zoom gestures — a user
dragging the background to pan must not accidentally drag or dismiss an
open panel. Keep overlay interaction and stage interaction on separate
event targets.
