# GSAP plugins reference — ScrollTrigger + plugin catalog

Companion to `gsap-api.md` (core tween/timeline/utils/Nuxt loader lives
there). Same provenance: curated from the GSAP catalog skills in
nexu-io/open-design (Apache-2.0), wrapping GreenSock's official gsap-skills
(MIT; gsap.com/docs/v3). This is the API dictionary UNDER `motion.md` —
choreography rules, Lenis wiring, canonical skeletons, motivation gates,
and bans live there; this never overrides them.

## 1. ScrollTrigger

`gsap.registerPlugin(ScrollTrigger)` once before any use. In impulse, Lenis
drives ScrollTrigger through one shared rAF loop (motion.md 5.1) — do not
re-wire it here.

### 1.1 Config options

Attach as `scrollTrigger: { ... }` on a tween/timeline, or standalone
`ScrollTrigger.create({ ... })` (callbacks only). Shorthand
`scrollTrigger: '.selector'` sets only `trigger`.

| Option | Type | Meaning |
|---|---|---|
| `trigger` | sel/el | element whose position defines the range |
| `start` / `end` | str/num/fn | `"triggerPos viewportPos"`: `"top top"`, `"bottom 80%"`; number = absolute scroll px; `"+=300"` / `"+=100%"` relative to start; `"max"`; `"clamp(top bottom)"` (v3.12+) keeps within page bounds; function re-evaluated on refresh. Defaults `"top bottom"` / `"bottom top"` (`"top top"` when pinned) |
| `endTrigger` | sel/el | different element for `end` |
| `scrub` | bool/num | link progress to scroll; number = catch-up seconds (`scrub: 1` = smooth lag) |
| `toggleActions` | str | `"onEnter onLeave onEnterBack onLeaveBack"`, each of `play pause resume reset restart complete reverse none`. Default `"play none none none"` |
| `pin` | bool/sel/el | pin while active; `true` pins the trigger. Animate CHILDREN, never the pinned element itself |
| `pinSpacing` | bool/str | default `true` (spacer keeps layout); `false` or `"margin"` |
| `snap` | num/arr/fn/obj | `0.25` = increments; array = values; `"labels"`; `{ snapTo: 0.25, duration: 0.3, delay: 0.1, ease: 'power1.inOut' }` |
| `horizontal` | bool | horizontal scroller |
| `scroller` | sel/el | non-viewport scroll container |
| `containerAnimation` | tween/tl | trigger against fake-horizontal movement (1.4) |
| `toggleClass` | str/obj | `"active"` on trigger, or `{ targets, className }` |
| `once` | bool | kill trigger after first end-crossing |
| `id` | str | for `ScrollTrigger.getById(id)` |
| `refreshPriority` | num | refresh order when creation order is not page order (lower = first) |
| `invalidateOnRefresh` | bool | re-run function-based tween values on refresh |
| `markers` | bool/obj | dev only — never ships |

Callbacks: `onEnter onLeave onEnterBack onLeaveBack` (crossing start/end),
`onUpdate` (progress change), `onToggle` (isActive flip), `onRefresh`,
`onScrubComplete`. Each receives the instance: `self.progress`,
`self.direction`, `self.isActive`, `self.getVelocity()`.

### 1.2 batch() — viewport-entry groups

One ScrollTrigger per target, callbacks batched per interval — the
IntersectionObserver alternative when a stagger should bind the batch.
Callbacks receive `(targets, scrollTriggers)` arrays, not the instance.
No `trigger`, `scrub`, `snap`, `toggleActions`, `animation` in batch vars.

```js
ScrollTrigger.batch('.card', {
  interval: 0.1, batchMax: 4, // max collect seconds; max per batch (function ok, re-run on refresh)
  start: 'top 80%',
  onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, stagger: 0.1, overwrite: true }),
  onLeaveBack: (els) => gsap.set(els, { opacity: 0, y: 50, overwrite: true }),
})
```

### 1.3 scrollerProxy() — custom scroller integration

Only needed when a scroll library does NOT emit native scroll (Lenis
does — the `lenis.on('scroll', ScrollTrigger.update)` wiring in motion.md
5.1 suffices, no proxy). For transform-based scrollers:

```js
ScrollTrigger.scrollerProxy(document.body, {
  scrollTop(value) { // with arg = setter, without = getter
    return arguments.length ? (scroller.scrollTop = value) : scroller.scrollTop
  },
  getBoundingClientRect: () => ({ top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }),
  pinType: 'transform', // 'fixed' if pins jitter, 'transform' if pins don't stick
})
scroller.addListener(ScrollTrigger.update) // MANDATORY: sync on every scroller update
```

### 1.4 containerAnimation — triggers inside fake horizontal scroll

The pin + `x` tween itself is skeleton 5.3 in `motion.md`. To fire
triggers based on HORIZONTAL position inside that pan, point them at the
horizontal tween:

```js
gsap.to('.nested-el', { y: 100, scrollTrigger: {
  containerAnimation: scrollTween, // the horizontal x-tween from motion.md 5.3
  trigger: '.nested-wrapper', start: 'left center', // horizontal semantics
  toggleActions: 'play none none reset' } })
```

1. The container tween MUST use `ease: 'none'` or scroll and position
   desync. Pinning and snapping are unavailable on containerAnimation
   triggers. Animate a child, never the trigger element itself.

### 1.5 Refresh and cleanup

2. `ScrollTrigger.refresh()` after any DOM/layout change that moves
   trigger positions — async content, images, fonts
   (`document.fonts.ready`), `nextTick()` after data loads. Viewport
   resize is auto (debounced 200ms); dynamic content is NOT.
3. Create triggers in page order (top to bottom) or set `refreshPriority`
   — refresh runs in creation order; wrong order corrupts pin spacing.
4. Cleanup in Vue = `ctx.revert()` (motion.md rule 8). Escape hatches:
   `ScrollTrigger.getAll().forEach(t => t.kill())`,
   `ScrollTrigger.getById('my-id')?.kill()`.

### 1.6 Do not

- ScrollTrigger on a child tween of a timeline — top-level tween or the
  timeline constructor only.
- `scrub` and `toggleActions` on the same trigger — scrub wins; pick one.
- Non-`"none"` ease on a containerAnimation tween.
- `markers: true` in production.
- Skipping `refresh()` after async content lands.

## 2. Plugins

Licensing (post-Webflow acquisition): EVERY plugin is free, commercial use
included. Club GSAP is gone — SplitText, MorphSVG, and the rest ship in
the public `gsap` npm package (`import { SplitText } from 'gsap/SplitText'`).
Never generate an `.npmrc` with a GreenSock token or point at
`npm.greensock.com` — stale guidance. `gsap.registerPlugin(X, Y)` once per
plugin before first use (app level or the Nuxt lazy-plugin composable in
`gsap-api.md` §4, not per component render).

| Plugin | Job | Core call / config |
|---|---|---|
| ScrollToPlugin | animate scroll position | `gsap.to(window, { scrollTo: { y: '#section', offsetY: 50 } })`; `y: 'max'` for bottom. Through Lenis prefer `$lenis?.scrollTo()` (motion.md 5.1) |
| ScrollSmoother | GSAP's smooth scroll (`#smooth-wrapper > #smooth-content` DOM contract) | impulse uses Lenis instead — listed for recognition only |
| Flip | animate between layout states (FLIP) | `const s = Flip.getState('.item')` → mutate DOM → `Flip.from(s, { duration: 0.5, ease: 'power2.inOut', absolute: false, nested: false, scale: true, simple: false })` |
| Draggable | drag/spin/throw | `Draggable.create('.box', { type: 'x,y' \| 'rotation' \| 'scroll', bounds: '#container' \| { minX, maxX, minY, maxY }, inertia: true, edgeResistance: 0.8, onDragStart/onDrag/onDragEnd, onThrowUpdate/onThrowComplete })` |
| InertiaPlugin | momentum for Draggable, or standalone glide | `InertiaPlugin.track('.box', 'x')` then `gsap.to(obj, { inertia: { x: 'auto' } })` continues current velocity to rest |
| Observer | normalized pointer/wheel/touch gestures without scroll position | `Observer.create({ target, type: 'touch,pointer' \| 'wheel', tolerance: 10, onUp/onDown/onLeft/onRight })` |
| ScrambleTextPlugin | glitch-reveal text | `gsap.to('.text', { duration: 1, scrambleText: { text: 'New message', chars: '01', revealDelay: 0.5 } })` |
| DrawSVGPlugin | stroke draw/erase via dashoffset | value = VISIBLE SEGMENT `"start end"`: `gsap.from('#path', { drawSVG: 0 })` draws in; `"20% 80%"` = middle only. Element needs `stroke` + `stroke-width`. Stroke only, never fill; prefer single-segment paths. `DrawSVGPlugin.getLength(el)` |
| MotionPathPlugin | move element along SVG path | `gsap.to('.dot', { motionPath: { path: '#path', align: '#path', alignOrigin: [0.5, 0.5], autoRotate: true, curviness: 1 } })`. MotionPathHelper = dev-time visual tuner |
| Physics2DPlugin / PhysicsPropsPlugin | simple physics | `physics2D: { velocity: 250, angle: 80, gravity: 500 }`; `physicsProps: { x: { velocity: 100 }, y: { velocity: -50, acceleration: 200 } }` |
| EasePack / CustomWiggle / CustomBounce | SlowMo, RoughEase, ExpoScaleEase; wiggle/shake; configurable bounce | register, then use the ease name in tweens |
| GSDevTools | timeline scrubber UI | `GSDevTools.create({ animation: tl })` — dev only, never ships |

### 2.1 SplitText — key config

`SplitText.create(target, vars)` → instance with `chars`, `words`,
`lines`, `masks`. Restore via `split.revert()` or let `gsap.context` revert.

| Option | Meaning |
|---|---|
| `type` | `"chars"`, `"words"`, `"lines"` comma-combined — split ONLY what animates (perf) |
| `mask` | `"lines" \| "words" \| "chars"` — wraps each unit in `overflow: clip` for reveal effects |
| `autoSplit` | re-split on font load / width change; create the animation INSIDE `onSplit()` and RETURN it for auto cleanup + progress sync |
| `onSplit(self)` | runs on each (re-)split; return the tween/timeline |
| `charsClass` / `wordsClass` / `linesClass` | class per unit; `"line++"` appends an index |
| `aria` | `"auto"` (default: aria-label on parent, aria-hidden on pieces), `"hidden"`, `"none"` |
| `smartWrap` | chars-only splits: nowrap-wrap words to stop mid-word breaks |
| `ignore` | selector to leave unsplit (`"sup"`) |
| `reduceWhiteSpace` | default `true`; v3.13+ honors line breaks / `<pre>` |

Tips: split after `document.fonts.ready` (or `autoSplit`); CSS
`font-kerning: none; text-rendering: optimizeSpeed;` stops kerning shift
on char splits; avoid `text-wrap: balance`; no SVG text support.

### 2.2 MorphSVG — key config

Morphs path `d` data; point counts need not match. `<path>`, `<polyline>`,
`<polygon>`; convert primitives first with
`MorphSVGPlugin.convertToPath('circle, rect, ellipse, line')`. Shorthand
`morphSVG: '#lightning'`; object form for config:

| Option | Meaning |
|---|---|
| `shape` | required — selector, element, or raw path string |
| `type` | `"linear"` (default) or `"rotational"` (angle/length interpolation, fixes kinks) |
| `shapeIndex` | point-mapping offset when the morph crosses over/inverts; `"log"` once to print the auto value; array for multi-segment paths |
| `map` | segment matching: `"size"` (default) / `"position"` / `"complexity"` |
| `smooth` (v3.14+) | added smoothing points: number, `"auto"`, or `{ points, redraw, persist }` — for jagged morphs |
| `origin` | rotational pivot, `"50% 50%"` default |
| `precompile` | precomputed path arrays (`"log"` once, paste) — fixes slow FIRST frame only, not mid-tween jank |

## Boundaries

- Core tween/timeline API, ease matrix, gsap.utils, Nuxt lazy-plugin
  loader → `gsap-api.md`.
- Choreography, tool split (GSAP vs motion-v), Lenis wiring, canonical
  pin/scrub skeletons, motivation gates, technique bans → `motion.md`.
- Whether to animate at all, exact durations/eases/springs, gesture
  physics, review catalog → `motion-craft.md`.
- This file → raw ScrollTrigger + plugin API lookup only: signatures,
  option tables, config values. It never grants permission motion.md denies.
