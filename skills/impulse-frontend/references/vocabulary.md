# Reference vocabulary — pattern names

A vocabulary, not a library: know these names to design with them in mind
and to talk about layout choices precisely. No code here — implementation
lives in motion.md (GSAP/motion-v skeletons), components.md (shadcn-vue),
ai-tells.md (what NOT to reach for by default).

## Hero paradigms
Asymmetric Split Hero (text one side, asset other) · Editorial Manifesto Hero
(large type, no asset) · Video/Media Mask Hero (type cut out over video) ·
Kinetic-Type Hero (animated type as the visual) · Curtain-Reveal Hero ·
Scroll-Pinned Hero.

## Navigation
Dock Magnification (edge nav, icons scale on hover) · Magnetic Button (pulls
toward cursor) · Gooey Menu · Dynamic Island (morphing status pill) ·
Contextual Radial Menu · Floating Speed Dial · Mega Menu Reveal
(full-screen, staggered content).

## Layout & grids
Bento Grid · Masonry · Chroma Grid (animating gradient borders) ·
Split-Screen Scroll · Sticky-Stack Sections (motion.md §5.2).

## Cards & containers
Parallax Tilt Card · Spotlight Border Card · Glassmorphism Panel ·
Holographic Foil Card · Tinder Swipe Stack · Morphing Modal.

## Scroll animation
Sticky Scroll Stack · Horizontal Scroll Hijack (motion.md §5.3) ·
Locomotive/Sequence Scroll · Zoom Parallax · Scroll Progress Path (SVG
line-draw) · Liquid Swipe Transition.

## Galleries & media
Dome Gallery (3D panoramic) · Coverflow Carousel · Drag-to-Pan Grid ·
Accordion Image Slider · Hover Image Trail · Glitch Effect Image.

## Typography & text
Kinetic Marquee (max 1/page — ai-tells.md) · Text Mask Reveal (type as
window to video) · Text Scramble (matrix-decode) · Circular Text Path ·
Gradient Stroke Animation · Kinetic Typography Grid (letters dodge cursor).

## Micro-interactions
Particle Explosion Button · Liquid Pull-to-Refresh · Skeleton Shimmer ·
Directional Hover-Aware Button (fill enters from cursor side) · Ripple Click
· Animated SVG Line Drawing · Mesh Gradient Background · Lens Blur Depth.

Every pattern above is gated by registers.md's dials and Design Read — none
fires automatically. Picking one still owes a one-sentence "what does this
communicate" per motion.md's motivation gate when it involves motion.

## Motion glossary — name the effect precisely

Reverse lookup for "как называется когда..." — the right term gets the
right result from a designer or a model (from emilkowalski/skills
animation-vocabulary, MIT, condensed). Terms not already named above:

- **Pop in** — entrance with slight overshoot, bounces into place (vs
  plain **Scale in** — grows from smaller, no overshoot).
- **Origin-aware animation** — element animates out of its trigger
  (popover growing from its button), not from its own center.
- **Crossfade** — one fades out as the other fades in, same spot ·
  **Morph** — one shape smoothly becomes another (Dynamic Island) ·
  **Shared element transition** — element travels and transforms from one
  position into another (thumbnail → card) · **Continuity transition** —
  any change that keeps before/after visually connected.
- **Layout animation** — size/position change animates instead of
  snapping. **Direction-aware transition** — forward slides one way, back
  slides the opposite, navigation gains a sense of direction.
- **Rubber-banding** — resistance + snap-back past a boundary (iOS
  overscroll feel) · **Momentum** — motion carrying velocity after a drag
  · **Interruptible animation** — redirectable mid-flight without
  finishing first.
- **Stagger** — items cascade with a small delay each · **Orchestration**
  — multiple animations timed to read as one motion.
- **Anticipation** — small wind-up opposite the move before it happens ·
  **Follow-through** — parts settle slightly after the main motion stops ·
  **Squash & stretch** — deformation conveying weight and speed.
- **Asymmetric easing** — accelerates and decelerates at different rates;
  feels more alive than a symmetric curve.
- **Perceptual duration** — when a spring FEELS finished, though it
  micro-settles underneath.
- **Text morph** — text animates character-by-character on change ·
  **Number ticker** — digits roll to a value (needs `tabular-nums`) ·
  **Line drawing** — SVG path draws itself in.
- **Scroll-driven animation** — progress tied to scroll position (vs
  **Scroll reveal** — one-shot entrance on viewport entry) · **View
  transition** — browser morphs between two states/pages, connecting
  shared elements.

## Style families — execution recipes

From yetone taste-skill minimalist/brutalist/soft protocol packs (MIT),
re-expressed. These are KNOWLEDGE of how named escape-families execute well,
not presets: reaching for one by reflex is exactly ai-tells.md #28. A family
is picked deliberately in the Design Read, named with a one-line why, and
rotated across projects. Where a recipe conflicts with impulse rules
(eyebrow cap, `transition-all` ban, em-dash, nested-cards), the impulse rule
wins — the recipes below are already filtered to comply.

### Minimalist editorial ("document-style", Notion-adjacent)

- Canvas: pure white or warm bone (`#F7F6F3`/`#FBFBFA`); body off-black
  `#111111`/`#2F3437`, secondary `#787774`, line-height 1.6.
- Structure: `1px solid #EAEAEA` (or `rgba(0,0,0,0.06)`) on EVERY border and
  divider — one hairline value, held. Radius crisp: 8-12px cap.
- Type: geometric/system sans with character for UI; text serif for hero
  headings and quotes only (typography.md serif discipline still applies);
  mono for code/kbd/meta.
- Accents: exclusively washed-out pastels as small surfaces — pale red
  `#FDEBEC`/text `#9F2F2D`, pale blue `#E1F3FE`/`#1F6C9F`, pale green
  `#EDF3EC`/`#346538`, pale yellow `#FBF3DB`/`#956400`. Tags, inline-code
  backgrounds, tiny icon chips. Never sections, never heroes.
- Components: CTA solid `#111111` on white, radius 4-6px, no shadow, hover
  `#333333` + `active:scale-[0.98]`; FAQ accordions strip all boxes,
  `border-bottom` only, plain `+`/`-` toggle; shortcuts as real `<kbd>` keys
  (1px border, 4px radius, bone background, mono).
- Depth without noise: full-width imagery at very low opacity, warm radial
  light spots at `opacity: 0.03`, warm grain overlay `opacity: 0.04` on
  photos to pull them into the palette. Photography desaturated, warm.
- Motion: invisible-feeling — fade-up `translateY(12px)` over 600ms
  ease-out-expo via IntersectionObserver, stagger 80ms, hover shadow shift
  to `0 2px 8px rgba(0,0,0,0.04)` max.

### Industrial brutalist (Swiss print / tactical telemetry)

Pick ONE mode per project, never mix substrates:

| | Swiss Industrial Print | Tactical Telemetry |
|---|---|---|
| Substrate | `#F4F4F0`/`#EAE8E3` matte paper | `#0A0A0A`/`#121212` dead CRT, never `#000` |
| Ink | `#050505`-`#111111` carbon | `#EAEAEA` phosphor |
| Accent | hazard red `#E61919`/`#FF2A2A` — the ONLY accent | same red; terminal green `#4AF626` on at most ONE element with real state |

- Macro type: heavy neo-grotesque, `clamp(4rem, 10vw, 15rem)`, tracking
  -0.03 to -0.06em, leading 0.85-0.95, uppercase. Micro type: mono
  10-14px, tracking +0.05-0.1em, uppercase — all metadata/nav/IDs.
- Layout: blueprint grid, visible compartmentalization — `display: grid;
  gap: 1px` with contrasting parent background makes razor dividing lines
  free; full-width rules segregate zones; bimodal density (packed mono data
  vs vast negative space around macro type). Radius: zero, everywhere.
- Symbology: ASCII framing `[ LIKE THIS ]`, `>>>`, `///`; (r)/(c)/(tm)
  marks as structural geometry; crosshairs at grid intersections. Real
  content only — decorative random strings fall to ai-tells fake-precise.
- Texture: halftone/1-bit dither on images (`mix-blend-mode: multiply` +
  SVG dot pattern), CRT scanlines via `repeating-linear-gradient` on
  telemetry mode, one global low-opacity noise layer (fixed,
  `pointer-events-none` — motion.md DOM-cost rule).
- Semantics: `<data>`, `<samp>`, `<kbd>`, `<output>`, `<dl>` — the rigidity
  is also markup.

### Soft premium ("Apple-esque / Linear-tier" haptic)

Three vibe lanes — pick one: Ethereal Glass (OLED black `#050505`, subtle
mesh-gradient orbs, vantablack cards + `backdrop-blur` + white/10 hairlines,
wide grotesk) · Editorial Luxury (warm cream `#FDFBF7`/sage/espresso,
variable serif display, film-grain `opacity-[0.03]`) · Soft Structuralism
(silver-grey/white, massive bold grotesk, ultra-diffuse ambient shadows).

- **Double-bezel nesting** (the one sanctioned nested-container move —
  it's the concentric-radius math from ai-bug-patterns-fe done on purpose):
  outer shell `bg-black/5` + `ring-1 ring-black/5` + `p-1.5` +
  `rounded-[2rem]`; inner core with own surface, inner highlight
  `shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]`, radius
  `calc(2rem - 0.375rem)`. Machined hardware, not a card in a card — two
  layers max, the shell is a frame, not a surface with its own content.
- Island nav: floating glass pill detached from top (`mt-6 mx-auto w-max
  rounded-full`), hamburger lines morph to X, menu expands to full-screen
  `backdrop-blur-3xl` overlay, links stagger up from `translate-y-12`.
- Button-in-button: trailing arrow icon sits in its own circular chip
  (`w-8 h-8 rounded-full bg-black/5`) flush with the pill's inner padding;
  hover translates the chip diagonally 1px, `active:scale-[0.98]`.
- Rhythm: macro-whitespace doubled (`py-24`-`py-40`), custom bezier
  `cubic-bezier(0.32, 0.72, 0, 1)` 700ms on named properties (never
  `transition-all` — motion.md), entry fade-up `translate-y-16` + one-shot
  small blur resolving over 800ms.
- Guards that stay on: eyebrow-pill before every heading = ai-tells eyebrow
  cap still applies; `backdrop-blur` only on fixed/sticky layers; grain on
  a fixed `pointer-events-none` layer only.
