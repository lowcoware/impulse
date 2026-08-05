# animated-connectors.md: flowing lines and traveling dots in inline SVG

Source: extracted from csthink/dashmotion (harvested GitHub skill), the
concrete mechanics behind genres.md's "animate the flow when it earns it"
rule for the Diagram genre — a request path, a data flow, a state
transition. Two contracts, both pure SVG/CSS, no JS animation library.

## Contract 1 — flowing dashed connector (`stroke-dashoffset`)

```css
.flow { stroke-dasharray: 5 5; animation: dashmove 0.75s linear infinite; }
@keyframes dashmove { to { stroke-dashoffset: -10; } }
```

- **The offset delta MUST equal one full dasharray period** (`5 5` sums to
  10, so the keyframe target is exactly `-10`) — any other delta and the
  loop visibly seams/jumps every cycle instead of reading as continuous.
  A connector that overrides the dasharray inline (e.g. an async edge at
  `2 4`, period 6) needs its OWN keyframes at `-6`, not the shared one.
- **Negative offset flows in the path's drawing direction** — always author
  the connector's `d` from source to target, never target-to-source, or
  the flow visually runs backwards from what the arrowhead shows.
- **Speed reads as meaning, not decoration.** 0.6-0.9s reads as "electric
  current / active"; slower than ~1.5s reads as broken/stalled, not calm.

## Contract 2 — traveling dot (`<animateMotion>`)

```svg
<circle r="3.5" class="dot" fill="#34d399">
  <animateMotion dur="2s" repeatCount="indefinite"
    path="M400 178 L400 204 L170 204 L170 222"/>
</circle>
```

- `path` reuses the connector's own `d` **verbatim** — the dot rides
  exactly on the line it represents. A dot path that spans two separate
  connectors sails straight through whatever component sits between them;
  split it into chained per-hop dots instead (`begin="prevDot.end"` or an
  explicit staggered delay).
- The circle carries no `cx`/`cy` — `animateMotion` positions it entirely.
- **3-6 dots total per diagram, semantically placed** — fan-outs, merges,
  the one request path that matters. Never one dot per edge; that's
  decoration, not signal (motivation gate, genres.md rule 2).
- In an architecture diagram a dot IS a request/message in flight — route
  it along a realistic end-to-end journey, not an arbitrary edge.

## Z-order (paint sequence)

`grid background → connectors → dots → nodes`. Nodes painted last mask
where a connector line ends underneath them, and a traveling dot visually
"arrives" and vanishes into the node instead of sliding on top of it — get
this order wrong and lines poke past node edges, dots slide over node fills
instead of disappearing into them.

Connector endpoints stop ~4px short of the node's edge so an arrowhead
doesn't visually pierce the border. Every connector `<path>` needs
`fill="none"` explicit (or a `<g fill="none">` ancestor) — SVG's default
fill is black, and an unfilled L-shaped path with no fill override renders
as a giant black polygon, not a line.

## Arrowhead that inherits its line's color

```svg
<marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
  <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</marker>
```

One shared `<marker>` definition, `context-stroke` picks up whichever
line's color references it — no need for a differently-colored marker per
connector type.

## Reduced motion — SMIL needs its own handling

`prefers-reduced-motion` as a CSS media query stops the CSS-driven
`stroke-dashoffset` animation, but **SMIL (`<animateMotion>`) ignores CSS
media queries entirely** — a dot on a `prefers-reduced-motion: reduce`
system keeps moving unless handled explicitly. Two pieces, both required:

```js
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.dot').forEach(el => el.remove());
}
```

Wrap the CSS flow animation in `@media (prefers-reduced-motion: no-preference) { .flow { animation: ...; } }`
so it's opt-in, and remove `.dot` elements via script since no CSS
mechanism reaches SMIL. Pair with a visible pause toggle
(`animation-play-state: paused` on the CSS side, `svg.pauseAnimations()` /
`svg.unpauseAnimations()` on the SMIL side) — motion the user didn't ask
to keep looping forever is the same failure whether it's CSS or SMIL.

## Verifying the result — don't eyeball it

Overlap, a connector routed through a box, and a broken dash-loop seam are
all easy to miss by reading the code or even a screenshot at a glance.
Where feasible, check the actual numbers instead of assuming: every
same-row pair's `x + width + gap <= next.x`, every rail's `y` against the
rects it crosses, and the dash-loop math above (offset delta = dasharray
period, exactly). A boundary box's contents fit with real padding, not a
value that happens to look close in the viewBox.
