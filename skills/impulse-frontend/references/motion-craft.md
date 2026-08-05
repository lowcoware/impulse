# Motion craft — the value catalog

Distilled from Emil Kowalski's design-engineering skills (emilkowalski/skills,
MIT; animations.dev) + Apple's WWDC fluid-interfaces material from the same
suite, re-expressed for the impulse suite (Vue 3 / Nuxt 4 / motion-v / GSAP).

Role split: `motion.md` owns choreography — tool split, GSAP/Lenis skeletons,
reduced-motion wiring, technique bans. THIS file owns micro-craft — whether to
animate at all, the exact values, physicality, gestures, and the review
catalog. impulse-review's `motion:` tag cites values from here; never approximate
a value that appears here — copy it.

## 1. The gate — should this animate at all?

Sometimes the best animation is no animation. Every candidate passes four
questions IN ORDER; record which question kills a reject.

**1. Frequency — how often will a user see it?**

| Frequency | Verdict |
|---|---|
| 100+/day: keyboard shortcuts, command palette, core navigation | No animation. Ever. Keyboard-initiated = disqualifier, not a judgment call (Raycast has no open/close animation — correct) |
| Tens/day: hover states, list navigation, frequent toggles | Remove, or near-imperceptible only (fast, subtle) |
| Occasional: modals, drawers, toasts, settings | Standard animation |
| Rare/first-time: onboarding, empty states, success, celebration | The delight budget lives here — bounce, generous stagger, a longer beat are welcome ONLY here |

**2. Purpose — name it from this list, or reject:** feedback (press scale,
hold-to-confirm) · spatial consistency (toast exits the edge it entered;
panel grows from trigger) · state indication (morphing button, accordion) ·
preventing a jarring change (content that would teleport) · explanation
(marketing/onboarding only) · delight (rare tier only). "It looks cool" is
not on the list.

**3. Speed — fits the duration budget below?** A moment that only "works" as
a slow showy animation fails the gate.

**4. Function — does motion help or hinder HERE?** Decoration on data the
user is reading or acting on hinders: an animated line-draw on a functional
graph is worse than static. Mouse-tracking decor is fine on marketing,
wrong on a dashboard.

**Hard exclusion, not a judgment call:** trust-critical content never gets
fade/delay/entrance animation — error messages, auth failures, validation
messages, consent prompts, payment/pricing details, legal notices, and
destructive-action confirmations. An animated entrance delay on any of
these reads as (and functionally is) hiding information the user needs
immediately; this fails the gate regardless of how the four questions
above would otherwise score it.

**Rejected candidates are part of any motion proposal/audit output**: list
2-5 places considered and deliberately NOT animated, each with the gate
question that killed it. A proposal with no rejections is a wishlist.

## 2. Easing

Decision order: entering/exiting → `ease-out` (starts fast, responsive) ·
moving/morphing on screen → `ease-in-out` · hover/color → `ease` · constant
motion (marquee, progress) → `linear` · default → `ease-out`.

`ease-in` on UI is ALWAYS a finding — it starts slow, delaying the exact
moment the user watches most; `ease-out` at 200ms feels faster than
`ease-in` at 200ms. Built-in CSS easings are too weak for deliberate motion —
use strong custom curves as tokens:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);      /* strong ease-out for UI */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* strong in-out for on-screen movement */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* iOS-like drawer curve */
```

(impulse's existing entrance default `cubic-bezier(0.16, 1, 0.3, 1)` stays
canon — same family.) Don't hand-roll curves: easing.dev / easings.co.

## 3. Duration budgets

| Element | Duration |
|---|---|
| Button press feedback | 100-160ms |
| Tooltips, small popovers | 125-200ms |
| Dropdowns, selects | 150-250ms |
| Modals, drawers | 200-500ms |
| Marketing / explanatory | can be longer |

UI stays under 300ms. Perceived performance is real: a 180ms dropdown feels
more responsive than a 400ms one; a faster-spinning spinner makes the same
load feel shorter; instant tooltips after the first make a whole toolbar
feel faster.

## 4. Physicality

1. **Never `scale(0)`.** Nothing in the real world appears from nothing —
   enter from `scale(0.9-0.97)` + `opacity: 0`.
2. **Origin-aware popovers.** Popover/dropdown/tooltip scales from its
   trigger, not center: `transform-origin: var(--reka-popover-content-transform-origin)`
   (reka-ui exposes the same CSS-var pattern as Radix). **Modals are
   exempt** — centered in the viewport, `center` is correct; don't report it.
3. **Press feedback on every pressable element:** `:active { transform:
   scale(0.97) }`, `transition: transform 160ms var(--ease-out)`. Subtle
   range 0.95-0.98. `scale()` scales children too (text, icons) — that's a
   feature here.
4. **Tooltips: delay the first, instant the rest.** Once one tooltip is
   open, adjacent ones open with zero delay and zero animation.
5. **Enter/exit on the same path.** In-from-right / out-the-bottom reads as
   disconnected. Mirror the easing on reversible transitions.

## 5. Interruptibility

1. CSS **transitions** retarget from the current state mid-flight;
   **keyframes restart from zero**. Anything triggered rapidly or reversible
   (toasts stacking, toggles, expand/collapse) uses transitions or springs —
   keyframes there is a finding.
2. Entry without JS: `@starting-style` (fallback: `data-mounted` set in
   `onMounted`).
3. **Springs** for gesture-driven and "alive" motion — they carry velocity
   through interruption. Apple-style config is the recommended mental model:
   `{ type: 'spring', duration: 0.5, bounce: 0.2 }`. Default damping 1.0
   (no overshoot); bounce 0.1-0.3 ONLY when the gesture carried momentum
   (a flick, a release) — overshoot on a menu that faded in is wrong.
   Apple's shipped values: move/reposition damping 1.0 response 0.4 ·
   rotation 0.8/0.4 · drawer/sheet 0.8/0.3.
4. **Interrupt from the presentation value.** New animation starts from the
   live on-screen transform, never the logical target — otherwise a visible
   jump. Decompose 2D motion into independent X and Y springs.
5. **Asymmetric timing.** Deliberate phases slow (hold-to-delete: 2s
   linear fill), system responses snap (release: 200ms ease-out). Symmetric
   press-and-release timing is a finding.

## 6. Gestures & drag

1. **1:1 tracking.** Content glued to the pointer, respecting the grab
   offset (grabbing a drawer's middle must not snap it to center). Pointer
   Events + `setPointerCapture` so tracking survives leaving bounds.
2. **Velocity dismissal.** Don't require crossing a distance threshold:
   `Math.abs(distance)/elapsedMs > ~0.11` dismisses regardless of distance —
   a flick is enough. Track a short position/timestamp history for release
   velocity.
3. **Velocity handoff.** The post-release spring starts at the finger's
   exact velocity (pass raw px/s to motion-v's `velocity`) — the seam
   between drag and animation disappears.
4. **Momentum projection.** Snap to the target nearest the PROJECTED rest
   point, not the release point:
   `project(v) = (v/1000) * d / (1 - d)`, `d ≈ 0.998` (0.99 snappier).
   This is the scroll-deceleration form, what Vaul/Embla ship — not the
   physics-textbook `v²/2a`.
5. **Rubber-band at boundaries**, never hard stops:
   `(overshoot * dim * c) / (dim + c * |overshoot|)`, `c ≈ 0.55`. Real
   things slow before they stop.
6. **Multi-touch protection:** ignore extra touch points once a drag began
   (`if (isDragging) return`) — prevents jumps on finger switch.
7. ~10px hysteresis before committing to a drag direction; respond on
   pointer-DOWN (highlight instantly), commit on pointer-up, allow
   cancel-by-dragging-away.

## 7. Performance traps

1. `transform` + `opacity` only (motion.md ban table) — and `transition:
   all` animates unintended properties off-GPU: always a finding.
2. **CSS-variable recalc storm:** driving a child's transform via
   `setProperty('--x', ...)` on a parent recalcs styles for ALL children.
   Set `transform` directly on the element.
3. **motion-v / Motion shorthands (`x`, `y`, `scale`) are NOT
   hardware-accelerated** — main-thread rAF, drops frames under load. For
   motion that runs while the page is busy, animate the full transform
   string: `animate={{ transform: 'translateX(100px)' }}`.
4. **CSS beats JS under load** — CSS/WAAPI run off the main thread. CSS for
   predetermined motion; JS/springs for dynamic, interruptible,
   gesture-driven.
5. **WAAPI** = JS control with CSS performance, no library:
   `el.animate([...], { duration, fill: 'forwards', easing })`.
6. Transition-time `filter: blur()` under 20px — heavy blur is expensive,
   especially Safari.

## 8. Polish moves

1. **Blur masks imperfect crossfades.** When two states visibly
   double-expose during a crossfade, `filter: blur(2px)` during the
   transition blends them into one perceived transformation.
2. **clip-path is an animation tool:** `inset(t r b l)` eats in from each
   side. Reveals (`inset(0 0 100% 0)` → 0), hold-to-delete overlay fill,
   comparison sliders (clip the top image at drag position), seamless tab
   color transitions (duplicate the tab list, style the copy active, clip
   to the active tab, animate the clip — timing individual color
   transitions can never match it).
3. **translate percentages** are relative to the element's own size —
   `translateY(100%)` hides any drawer regardless of height (how
   Sonner/Vaul position). Prefer over hardcoded px.
4. **Stagger** group entrances 30-80ms/item (motion.md's 30-60ms band
   sits inside this); decorative — never block interaction; page users see
   occasionally only.
5. **Number tickers / timers: `tabular-nums`** or digits shift as they
   change.
6. **Cohesion.** Motion matches the component's personality — playful can
   bounce, a dashboard stays crisp; one bouncy component in a crisp app is
   a finding. Five hand-typed near-identical cubic-beziers = consolidation
   finding: curves and durations live as tokens. Opacity+height in
   entering/exiting lists is trial and error — no formula, adjust until it
   feels right.

## 9. Accessibility

1. Reduced motion = fewer and GENTLER, not zero: keep opacity/color
   transitions that aid comprehension, drop movement (motion.md wiring).
2. **Hover motion gated:** `@media (hover: hover) and (pointer: fine)` —
   touch devices fire hover on tap, causing false positives.
3. `prefers-reduced-transparency: reduce` → translucent surfaces go
   frosty/solid (raise opacity, drop blur). `prefers-contrast: more` →
   near-solid backgrounds + defined border.
4. Avoid slow looping oscillations near 0.2 Hz (one cycle per ~5s) and
   abrupt brightness jumps; ease dark↔light theme changes.
5. WCAG hard floors: <= 3 flashes per second (2.3.1, Level A); any motion
   longer than 5s gets a pause/stop control (2.2.2). Carousels auto-cycle
   3-5 rounds then stop; reward/celebration animations play ONCE, never
   loop; ambient motion cancels on route change. **The 5s floor is a legal
   minimum, not a safety guarantee** — there's no reliable duration below
   which vestibular motion is provably safe for everyone, since sensitivity
   varies by condition (persistent postural-perceptual dizziness patients
   show measurably lower vestibulo-perceptual thresholds than healthy
   controls in clinical testing). Parallax and any scroll-linked
   background-moves-at-a-different-rate-than-foreground effect is the
   worst-tolerated pattern specifically — treat it as needing
   `prefers-reduced-motion` coverage even when technically under 5s, not
   just the obvious long loops.
   [web.dev: animation and motion accessibility](https://web.dev/learn/accessibility/motion)

## 10. Review protocol (impulse-review `motion:` findings)

Escalation triggers — flag on sight: `transition: all` · `scale(0)` or
pure-fade entrance with no initial transform · `ease-in` on UI ·
animation on a keyboard/100+-per-day action · UI duration >300ms with no
stated reason · `transform-origin: center` on a trigger-anchored popover ·
keyframes on rapidly-triggered UI · layout-property animation · motion-v
shorthand props on busy pages · parent CSS-var driving child transforms ·
missing reduced-motion on movement · ungated `:hover` motion · symmetric
press/release timing · everything-at-once entrance where a stagger belongs.

Remedial hierarchy — propose the earliest applicable fix:
1. delete the animation (high-frequency / purposeless / keyboard)
2. reduce it (shorter, smaller, fewer properties)
3. fix the easing (`ease-in` → strong ease-out token)
4. fix origin/physicality (`scale(0)` → 0.95+opacity; trigger origin)
5. make it interruptible (keyframes → transitions/springs)
6. move it to the GPU (layout props → transform; shorthand → full string)
7. asymmetric timing (slow the deliberate phase, snap the response)
8. polish (blur mask, stagger, `@starting-style`, spring)
9. a11y + cohesion (reduced-motion, hover gate, personality match)

Settled decisions stay settled: a documented deliberate motion tradeoff
(comment, design doc, DESIGN.md) is noted, not re-reported.

## 11. Debugging feel

Feel can be mechanically correct and still wrong — when unsure, don't guess:
slow motion (2-5x duration or DevTools Animations panel playback) checks
crossfade cleanliness, easing abruptness, origin, property sync ·
frame-by-frame stepping reveals timing drift between coordinated properties ·
gestures verified on real hardware (phone via dev-server IP + remote
devtools), not simulators · fresh eyes next day catch what development
blindness hid.

## Boundaries

Choreography, skeletons, tool split, reduced-motion wiring: `motion.md`.
What's banned by default: `ai-tells.md`. Naming an effect: `vocabulary.md`
glossary. This file is the value catalog — cite it, copy values exactly.
