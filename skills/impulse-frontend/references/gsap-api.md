# GSAP API reference — raw surface lookup

Curated from the GSAP catalog skills in nexu-io/open-design (Apache-2.0),
which wrap GreenSock's official gsap-skills (MIT; gsap.com/docs/v3).
Re-expressed for the impulse suite: Vue 3 / Nuxt 4 framing. This is the API
dictionary UNDER `motion.md` — choreography rules, Lenis wiring, canonical
skeletons, motivation gates, and bans live there; this never overrides them.

## 1. Core tween API

| Method | Does |
|---|---|
| `gsap.to(targets, vars)` | current state → vars. Default choice |
| `gsap.from(targets, vars)` | vars → current state (entrances) |
| `gsap.fromTo(targets, fromVars, toVars)` | explicit both ends, no reads |
| `gsap.set(targets, vars)` | apply instantly (duration 0) |

Targets: selector string, element, ref, array, NodeList. Vars properties
always camelCase (`backgroundColor`, `rotationX`).

### 1.1 Common vars

| Var | Value |
|---|---|
| `duration` | seconds, default 0.5 |
| `delay` | seconds before start |
| `ease` | string ease (matrix below), default `"power1.out"` |
| `stagger` | number (s between) or `{ each: 0.1, from: "center" \| "random" \| "start" \| "end" \| "edges" \| index }` or `{ amount: 0.3, ... }` (total split across targets) |
| `repeat` | count, `-1` = infinite |
| `yoyo` | with repeat, alternates direction |
| `overwrite` | `false` (default), `true` (kill all active tweens of same targets), `"auto"` (kill only overlapping properties on first render) |
| `onStart` / `onUpdate` / `onComplete` | callbacks, scoped to the tween |
| `immediateRender` | see rule 1.4 |
| `clearProps` | `"x,scale"` / `"all"` — strip inline styles on complete so CSS takes over. Clearing ANY transform alias clears the whole transform |

### 1.2 Transform aliases — never tween the raw `transform` string

| GSAP property | CSS equivalent / note |
|---|---|
| `x`, `y`, `z` | translateX/Y/Z, default unit px |
| `xPercent`, `yPercent` | translate in % of self; works on SVG |
| `scale`, `scaleX`, `scaleY` | `scale` sets both axes |
| `rotation` | rotate, default deg (`"1.25rad"` ok) |
| `rotationX`, `rotationY` | 3D rotate (rotationZ = rotation) |
| `skewX`, `skewY` | skew, deg or rad string |
| `transformOrigin` | `"left top"`, `"50% 50%"` |
| `svgOrigin` | SVG only: origin in the SVG's GLOBAL coords (`"250 100"`) — shared pivot for several elements. Mutually exclusive with `transformOrigin` |

Aliases apply in fixed order (translate → scale → rotationX/Y → skew →
rotation), faster, cross-browser. CSS variables tween too: `"--hue": 180`.

1. `autoAlpha` over `opacity`: 0 also sets `visibility: hidden` (no
   invisible click-blockers); non-zero restores `inherit`.
2. Directional rotation suffix `_short` (shortest path) / `_cw` / `_ccw`:
   `rotation: "-170_short"`, `rotationX: "+=30_cw"`.
3. Relative values `"+=20"` `"-=30"` `"*=2"` `"/=2"` — against the value
   at first render.
4. Function values: `(i, target, targets) => i * 50`, called once per
   target at first render. Random strings, evaluated per target:
   `x: "random(-100, 100, 5)"` (min, max, snap),
   `backgroundColor: "random([red, blue, green])"`.

### 1.3 Ease matrix

```
base (= .out)     .in / .out / .inOut suffixes on every name
"none"            linear
"power1".."power4"  1 gentle → 4 steep (power1.out is the global default)
"sine" "circ" "expo"
"back"            overshoot, configurable: back.out(1.7)
"elastic"         spring, configurable: elastic.out(1, 0.3)
"bounce"
```

`motion.md` restricts which are allowed where (ease-out family for UI,
`"none"` for scrub); this is the raw vocabulary. Custom curves: CustomEase
plugin — `CustomEase.create("my", ".17,.67,.83,.67")` (cubic-bezier) or
normalized SVG path data for multi-point curves.

### 1.4 immediateRender stacking rule

`from()` / `fromTo()` default `immediateRender: true` — start state
applies at CREATION time (kills FOUC). When two or more from/fromTo
tweens target the SAME property of the SAME element, set
`immediateRender: false` on the later ones — otherwise the later tween's
start snapshot clobbers the first tween's end state; the animation skips.

### 1.5 Control, defaults, matchMedia

Tween instance: `pause() play() reverse() restart() kill() progress(0.5)
time(0.2)`. Project-wide: `gsap.defaults({ duration: 0.6, ease: 'power2.out' })`.
`gsap.matchMedia()` — responsive + reduced-motion setup, auto-reverted
when the query stops matching:

```js
const mm = gsap.matchMedia()
mm.add({ isDesktop: '(min-width: 800px)', reduceMotion: '(prefers-reduced-motion: reduce)' },
  (ctx) => {
    const { isDesktop, reduceMotion } = ctx.conditions
    gsap.to('.box', { rotation: isDesktop ? 360 : 180, duration: reduceMotion ? 0 : 2 })
  }, rootEl) // optional 3rd arg scopes selectors; onUnmounted: mm.revert()
```

5. Do NOT nest `gsap.context()` inside matchMedia — it creates one
   internally; `mm.revert()` is the only cleanup. Components keep the impulse
   standard `gsap.context` + `ctx.revert()` (motion.md rule 8); matchMedia
   is for breakpoint-forked setups.

## 2. Timeline

```js
const tl = gsap.timeline({ defaults: { duration: 0.5, ease: 'power2.out' } })
tl.to('.a', { x: 100 }).to('.b', { y: 50 }, '<').to('.c', { opacity: 0 }, '+=0.2')
```

Constructor options: `paused`, `repeat`, `yoyo`, `defaults` (inherited by
every child tween), `onStart/onUpdate/onComplete`, `scrollTrigger`.
Timeline duration derives from children. Prefer timelines over chaining
tweens with `delay`.

### 2.1 Position parameter (third argument)

| Syntax | Placement |
|---|---|
| omitted | append after previous animation ends (default) |
| `1` | absolute: at 1s |
| `"+=0.5"` / `"-=0.2"` | 0.5s after / 0.2s before end of timeline |
| `"<"` | at the START of the most recently added animation |
| `">"` | at the END of the most recently added animation |
| `"<0.2"` | 0.2s after previous animation's start |
| `"label"` / `"label+=0.3"` | at label / 0.3s after it |

### 2.2 Labels, nesting, playback

Labels: `tl.addLabel('intro', 0)` then position tweens at `'intro'`;
`tl.play('outro')` seeks; `tl.tweenFromTo('intro', 'outro')` returns a
linear tween of the playhead between labels. Nesting:
`master.add(childTl, 0)` — compose scenes from child timelines. Playback
mirrors tween control (1.5). ScrollTrigger goes on the TIMELINE, never on
a child tween.

## 3. ScrollTrigger

`gsap.registerPlugin(ScrollTrigger)` once before any use. In impulse, Lenis
drives ScrollTrigger through one shared rAF loop (motion.md 5.1) — do not
re-wire it here.

### 3.1 Config options

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
| `containerAnimation` | tween/tl | trigger against fake-horizontal movement (3.4) |
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

### 3.2 batch() — viewport-entry groups

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

### 3.3 scrollerProxy() — custom scroller integration

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

### 3.4 containerAnimation — triggers inside fake horizontal scroll

The pin + `x` tween itself is skeleton 5.3 in `motion.md`. To fire
triggers based on HORIZONTAL position inside that pan, point them at the
horizontal tween:

```js
gsap.to('.nested-el', { y: 100, scrollTrigger: {
  containerAnimation: scrollTween, // the horizontal x-tween from motion.md 5.3
  trigger: '.nested-wrapper', start: 'left center', // horizontal semantics
  toggleActions: 'play none none reset' } })
```

6. The container tween MUST use `ease: 'none'` or scroll and position
   desync. Pinning and snapping are unavailable on containerAnimation
   triggers. Animate a child, never the trigger element itself.

### 3.5 Refresh and cleanup

7. `ScrollTrigger.refresh()` after any DOM/layout change that moves
   trigger positions — async content, images, fonts
   (`document.fonts.ready`), `nextTick()` after data loads. Viewport
   resize is auto (debounced 200ms); dynamic content is NOT.
8. Create triggers in page order (top to bottom) or set `refreshPriority`
   — refresh runs in creation order; wrong order corrupts pin spacing.
9. Cleanup in Vue = `ctx.revert()` (motion.md rule 8). Escape hatches:
   `ScrollTrigger.getAll().forEach(t => t.kill())`,
   `ScrollTrigger.getById('my-id')?.kill()`.

### 3.6 Do not

- ScrollTrigger on a child tween of a timeline — top-level tween or the
  timeline constructor only.
- `scrub` and `toggleActions` on the same trigger — scrub wins; pick one.
- Non-`"none"` ease on a containerAnimation tween.
- `markers: true` in production.
- Skipping `refresh()` after async content lands.

## 4. Plugins

Licensing (post-Webflow acquisition): EVERY plugin is free, commercial use
included. Club GSAP is gone — SplitText, MorphSVG, and the rest ship in
the public `gsap` npm package (`import { SplitText } from 'gsap/SplitText'`).
Never generate an `.npmrc` with a GreenSock token or point at
`npm.greensock.com` — stale guidance. `gsap.registerPlugin(X, Y)` once per
plugin before first use (app level or section 6, not per component render).

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

### 4.1 SplitText — key config

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

### 4.2 MorphSVG — key config

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

## 5. gsap.utils

Pure helpers, no registration. Function-form idiom: omit the LAST
argument (the value) and the util returns a reusable function — build
once, call per frame/event: `const c = gsap.utils.clamp(0, 100); c(150)`
→ 100. Exception: `random()` takes `true` as last arg for the fn form.

| Util | Signature → result |
|---|---|
| `clamp(min, max, v?)` | constrain to range |
| `mapRange(inMin, inMax, outMin, outMax, v?)` | `mapRange(0, 1, 0, 360, 0.5)` → 180 |
| `normalize(min, max, v?)` | range → 0-1 |
| `interpolate(start, end, p?)` | lerp numbers, colors, matching-key objects |
| `snap(inc \| array, v?)` | nearest multiple or nearest array value; in tweens: `snap: { x: 20 }` |
| `random(min, max, snapInc?, returnFn?)` / `random(array, returnFn?)` | number or array pick; `true` last = reusable fn |
| `distribute({ base, amount \| each, from, grid, axis, ease })` | returns `(i, target, targets) => value` — spread a value across targets (`from: 'center' \| 'edges' \| 'random' \| [0.25, 0.75]`, `grid: [rows, cols] \| 'auto'`); pass directly as a tween var |
| `wrap(min, max, v?)` / `wrapYoyo(...)` | cycle into range / bounce at ends — infinite loops, marquee math |
| `splitColor(color, hsl?)` | `[r, g, b(, a)]`; `true` → `[h, s, l(, a)]`; hex/rgb/hsl/named |
| `getUnit(v)` / `unitize(v, unit)` | `"px"` off `"100px"` / append unit if missing — mapRange and friends are number-only |
| `toArray(v, scope?)` | selector/NodeList/element → real array |
| `selector(scopeEl)` | scoped query fn: `const q = gsap.utils.selector(rootEl); gsap.to(q('.box'), ...)` |
| `pipe(f1, f2, ...)` | compose left-to-right: normalize → mapRange → snap chains |

## 6. Nuxt lazy-plugin composable

Typed plugin loader from GreenSock's official Nuxt example. Eager-load
only what every page needs (ScrollTrigger); heavy one-route plugins load
on demand and stay out of the entry bundle.

```ts
// composables/useGSAP.ts
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const pluginMap = { // extend with any gsap/* plugin the project uses
  Draggable: () => import('gsap/Draggable'),
  Flip: () => import('gsap/Flip'),
  InertiaPlugin: () => import('gsap/InertiaPlugin'),
  MorphSVGPlugin: () => import('gsap/MorphSVGPlugin'),
  SplitText: () => import('gsap/SplitText'),
  CustomEase: () => import('gsap/CustomEase'),
} as const

type PluginMap = typeof pluginMap
type LoadablePlugin = keyof PluginMap
type PluginModule<K extends LoadablePlugin> = Awaited<ReturnType<PluginMap[K]>>
type PluginExport<K extends LoadablePlugin> = PluginModule<K>[K & keyof PluginModule<K>]

export default function useGSAP() {
  gsap.registerPlugin(ScrollTrigger) // eager: used app-wide

  async function lazyLoadPlugin<K extends LoadablePlugin>(plugin: K): Promise<PluginExport<K>> {
    const p = ((await pluginMap[plugin]()) as any)[plugin]
    gsap.registerPlugin(p)
    return p
  }

  return { gsap, ScrollTrigger, lazyLoadPlugin }
}
```

Usage — the loaded export is fully typed:
`const SplitText = await lazyLoadPlugin('SplitText')` inside `onMounted`,
animation built inside `gsap.context` per motion.md rule 8. Keep
`pluginMap` to plugins actually used — each entry is a code-split chunk.

## Boundaries

- Choreography, tool split (GSAP vs motion-v), Lenis wiring, canonical
  pin/scrub skeletons, motivation gates, technique bans → `motion.md`.
- Whether to animate at all, exact durations/eases/springs, gesture
  physics, review catalog → `motion-craft.md`.
- This file → raw API lookup only: signatures, option tables, config
  values. It never grants permission motion.md denies.
