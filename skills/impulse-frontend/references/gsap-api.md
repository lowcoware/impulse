# GSAP API reference — raw surface lookup

Curated from the GSAP catalog skills in nexu-io/open-design (Apache-2.0),
which wrap GreenSock's official gsap-skills (MIT; gsap.com/docs/v3).
Re-expressed for the impulse suite: Vue 3 / Nuxt 4 framing. This is the API
dictionary UNDER `motion.md` — choreography rules, Lenis wiring, canonical
skeletons, motivation gates, and bans live there; this never overrides them.
ScrollTrigger and the plugin catalog (SplitText, MorphSVG, Draggable, Flip,
etc.) are in the companion file `gsap-plugins.md`.

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

## 3. gsap.utils

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

## 4. Nuxt lazy-plugin composable

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

- ScrollTrigger config/callbacks, batch(), scrollerProxy(),
  containerAnimation, and the plugin catalog (SplitText, MorphSVG,
  Draggable, Flip, etc.) → `gsap-plugins.md`.
- Choreography, tool split (GSAP vs motion-v), Lenis wiring, canonical
  pin/scrub skeletons, motivation gates, technique bans → `motion.md`.
- Whether to animate at all, exact durations/eases/springs, gesture
  physics, review catalog → `motion-craft.md`.
- This file → raw core-API lookup only: tween/timeline signatures, option
  tables, utils, Nuxt loader. It never grants permission motion.md denies.
