# Motion — GSAP / ScrollTrigger / Lenis / motion-v (Vue 3, Nuxt 4)

This file owns choreography. Micro-craft — whether to animate at all
(4-question gate), exact easing/duration/spring values, gesture physics,
review triggers — lives in `motion-craft.md`; run its gate before any
animation earns code here.

## 1. Tool split (binary)
| Job | Tool |
|---|---|
| Pin, scrub, horizontal pan, sticky stack, cross-section scroll timelines | GSAP + ScrollTrigger (+ Lenis) |
| Enter/leave reveals, hover/press physics, in-view stagger | motion-v |
| Smooth scroll | Lenis — ONE app-wide instance (skeleton 5.1) |

1. No pin, no scrub, no cross-element timeline → no GSAP. Use motion-v. Never both libraries on one element.
2. GSAP, Lenis, pin/scrub = brand register only. Product register: 150-250ms micro-transitions, zero page-load choreography, zero scroll-hijack.

## 2. Motivation gates

3. Motion must be motivated. Name what it communicates — hierarchy, storytelling, feedback, or state transition — in one sentence. Can't → drop the animation. "Looked cool" is not an answer.
4. Motion claimed, motion shown. Choreography ships working: no cut-off ScrollTriggers, no jumpy enters, no missing cleanup. Can't finish in scope → drop to static, ship clean.

## 3. Numbers

| Class | Duration | Use |
|---|---|---|
| Micro | 50-100ms | button/toggle state change |
| Short | 150-250ms | tooltips, fades, hovers, in-place transitions — product-register ceiling for element-level motion |
| Medium | 250-400ms | modals/overlays entering, page transitions — the one product-register exception to the 150-250ms ceiling (a modal is a larger spatial move than an element transition; brand uses it freely) |
| Long | 400-700ms | brand choreography only |

| Easing | When |
|---|---|
| ease-out — default `cubic-bezier(0.16, 1, 0.3, 1)` | entering elements, reveals |
| ease-in | exiting elements |
| ease-in-out | position moves |
| linear / `ease: 'none'` | scrub tweens and progress bars ONLY |

5. Stagger 30-60ms per item (`delay: i * 0.06`), most important element first, total sequence <700ms. Ease-out family only: zero bounce, zero elastic, zero back-overshoot.

## 4. Reduced motion (mandatory)

6. Every motion composable/component checks `usePreferredReducedMotion()` (VueUse) and bails to static — baked into every skeleton below. Missing check = not done.
7. CSS animations live behind `@media (prefers-reduced-motion: no-preference)`. Under reduce: infinite loops, parallax, pin/scrub, magnetic physics collapse to static; opacity fades may stay.

## 5. Canonical skeletons

8. Every GSAP composable: `gsap.context` scoped to root el, built in `onMounted`, `ctx.revert()` in `onUnmounted`. Missing revert = leaked triggers after route change = bug.
9. `start: 'top top'` on every pinned section. `'top center'` / `'top 80%'` fires mid-scroll instead of pinning — the #1 broken-choreography cause.

### 5.1 Lenis + ScrollTrigger wiring — `plugins/lenis.client.ts`
```ts
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
export default defineNuxtPlugin(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return { provide: { lenis: undefined } } // reduced motion: no smooth-scroll instance — every $lenis call site must optional-chain
  }
  gsap.registerPlugin(ScrollTrigger)
  const lenis = new Lenis()
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000)) // one rAF loop: GSAP ticker drives Lenis
  gsap.ticker.lagSmoothing(0)
  return { provide: { lenis } }
})
```
`$lenis` is `undefined` under reduced motion by design — every consumer calls `$lenis?.scrollTo(...)` with a native `scrollIntoView` fallback, never `$lenis.scrollTo(...)` unguarded.
### 5.2 Sticky stack — `composables/useStickyStack.ts` (cards: `.stack-card sticky top-0 min-h-[100dvh]` children of `root`)
```ts
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
export function useStickyStack(root: Ref<HTMLElement | null>) {
  const reduce = usePreferredReducedMotion()
  let ctx: gsap.Context | undefined
  onMounted(() => {
    if (reduce.value === 'reduce' || !root.value) return
    gsap.registerPlugin(ScrollTrigger)
    ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>('.stack-card')
      cards.forEach((card, i) => {
        if (i === cards.length - 1) return
        ScrollTrigger.create({ trigger: card, start: 'top top', // pin at viewport top — never 'top center'
          endTrigger: cards.at(-1)!, end: 'top top', pin: true, pinSpacing: false })
        gsap.to(card, { scale: 0.92, opacity: 0.55, ease: 'none', scrollTrigger: {
          trigger: cards[i + 1], start: 'top bottom', end: 'top top', scrub: true } }) // next card drives shrink
      })
    }, root.value)
  })
  onUnmounted(() => ctx?.revert())
}
```
### 5.3 Horizontal pan — `composables/useHorizontalPan.ts` (imports as 5.2; wrap: `overflow-hidden`, track: `flex h-[100dvh] items-center`)
```ts
export function useHorizontalPan(wrap: Ref<HTMLElement | null>, track: Ref<HTMLElement | null>) {
  const reduce = usePreferredReducedMotion()
  let ctx: gsap.Context | undefined
  onMounted(() => {
    if (reduce.value === 'reduce' || !wrap.value || !track.value) return
    gsap.registerPlugin(ScrollTrigger)
    ctx = gsap.context(() => {
      const distance = track.value!.scrollWidth - window.innerWidth
      gsap.to(track.value, { x: -distance, ease: 'none', scrollTrigger: {
        trigger: wrap.value, start: 'top top', end: () => `+=${distance}`, // scroll length = horizontal travel
        pin: true, scrub: 1, invalidateOnRefresh: true } })
    }, wrap.value)
  })
  onUnmounted(() => ctx?.revert())
}
```
### 5.4 Simple reveal — motion-v, not GSAP
```vue
<motion.li v-for="(item, i) in items" :key="item"
  :initial="reduce === 'reduce' ? false : { opacity: 0, y: 24 }"
  :while-in-view="{ opacity: 1, y: 0 }" :in-view-options="{ once: true, amount: 0.3 }"
  :transition="{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }">{{ item }}</motion.li>
```
`import { motion } from 'motion-v'`, `reduce = usePreferredReducedMotion()`. For feature lists, logo walls, grids — save GSAP for real pin/scrub work.

## 6. Technique bans (grep = 0)
| Banned | Use instead |
|---|---|
| `addEventListener('scroll'` anywhere | ScrollTrigger, Lenis scroll event, IntersectionObserver |
| `scrollTop`/`scrollY` read per frame (polling) | same — scroll-linked motion via ScrollTrigger/Scroll Timelines/IO, never manual position reads |
| `ref`/`reactive` written every scroll or rAF frame | GSAP tweens / motion-v values — continuous motion stays outside Vue reactivity |
| Animating `top` `left` `width` `height` `margin` | `transform` + `opacity` only |
| `transition-all` | name the properties that carry the state change (`transition-colors`, `transition-opacity`) — animating everything is the absence of deciding what means something |
| `hover:scale-*` / `hover:-translate-y-*` / bounce ease on cards, buttons, images | hover feedback is a surface shift (background, border, opacity), 120-200ms standard ease — the card is not growing, and the user already knows the cursor is on it. Spring physics only for things that genuinely move through space (a drawer sliding in) |
| Animating `filter: blur()` / `backdrop-filter` continuously or on large surfaces | blur animation ≤8px, one-shot only, small elements only — paint cost scales with area |
| Content invisible until JS reveals it | reveal enhances an already-visible default |
| `will-change` sprinkled "for perf" | only on elements that actually tween, removed after — a standing `will-change` costs a compositor layer forever |
| Second marquee on a page | max one; other sections get a different layout |

Interaction-feedback ceiling: response to a click/tap/toggle lands ≤200ms
or it reads as lag — reveals/entrances may be slower, feedback may not.
Animating a layout change: FLIP (measure first/last once, animate the
delta via transform; batch reads before writes) — never tween
width/height per frame.
