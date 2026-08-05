# Interface audit — the review sweep behind preflight

Distilled from vercel-labs/web-interface-guidelines (MIT, Vercel Labs) via
nexu-io/open-design's `web-design-guidelines` skill (Apache-2.0),
re-expressed for the impulse suite (Vue 3 / Nuxt 4 / Tailwind v4).

Role: preflight.md is the grep pass — one command, binary counts. THIS file
is the read-the-code sweep: rules a scanner can't judge because they need
context (is this button really a link? does this animation have an origin?).
Run it on changed components before delivery and during `/impulse-review`.
Findings use the terse `file:line` format (bottom of this file).

**Look at it like a human before running the checklist.** A pure
rule-by-rule pass can spend several rounds confirming contrast ratios and
viewport heights while a badge visibly overlaps a tab label or a form is
visibly broken — obvious to a first glance, invisible to a checklist that
never actually looks at the rendered page as a whole. Before section 1
below: look at a full render/screenshot and write down what a first-time
viewer would notice, in plain language, with zero mentions of contrast
ratios, WCAG criteria, or CSS selectors in this pass — that vocabulary
belongs to the structured sweep that follows, not this one. Then run the
numbered rules.

**Root cause over symptom.** When multiple findings trace to the same
underlying cause, collapse them into ONE finding that fixes the cause —
"increase max-height" or "add overflow:auto" patching a symptom is itself
a finding, not an accepted fix. Two mechanical tells worth checking by
hand every time: (a) an absolutely-positioned element inside a flex/grid
parent is out of that parent's layout flow and WILL collide with siblings
— the fix is joining the flow, not raising z-index; (b) a collapsible
element that still carries a fixed `max-height` in its EXPANDED state
is backwards (shrinking the umbrella instead of folding it) — the
expanded state should have no height ceiling, only the collapsed one
does.

## 0. Already policed elsewhere — pointer, don't re-derive

| Rule | Lives at |
|---|---|
| Em-dash in UI strings | preflight #1 |
| outline:none without focus-visible replacement | preflight #7, components.md §4 |
| Reduced motion present when animation exists | preflight #5, motion.md |
| Paste blocking | preflight #23 |
| Hand-rolled SVG icon paths | preflight #17, components.md §2 |
| `transition: all` / non-transform-opacity animation | motion-craft.md §7, motion.md ban table |
| Enter from `scale(0)` | motion-craft.md §4 |
| Interruptible animations (transitions over keyframes) | motion-craft.md §5 |
| hover / active / disabled / loading / error states | components.md §3, preflight #18 |
| Contrast numbers (body 4.5:1, large 3:1, placeholders count) | components.md §6, preflight #19 |
| Touch target >= 24px (44px comfortable) | components.md §4 |
| Label above input, error below, placeholder-as-label ban | components.md §6 |
| Long content: truncate / line-clamp / `min-width: 0` on flex children | components.md §5 harden |
| Empty state teaches; 0/1/1000 items | components.md §3, §5 |
| Virtualize large lists | components.md §5 harden |
| `Intl.*` for dates / numbers / plurals | components.md §5 harden |
| Unsaved-changes route guard | forms.md #4 |
| Inline field errors, server errors mapped per-field | forms.md #5, components.md §3 |
| Double submit = one request | components.md §3, §5 |
| `text-wrap: balance` / `pretty` | typography.md §1 |
| RTL logical properties | components.md §5 harden |

## 1. Accessibility

1. Icon-only buttons carry `aria-label`. Every form control has a `<label>`
   (or `aria-label` when a visible label is genuinely impossible).
2. `<button>` for actions, `<a>`/`<NuxtLink>` for navigation. A `<div>` or
   `<span>` with `@click` is always a finding — wrong element, not a style
   choice. Real links survive Cmd/Ctrl+click and middle-click.
3. Elements made interactive by hand also handle keyboard (`@keydown`) and
   are focusable — but rule 2 first: the native element gives this for free.
4. Every `<img>` has `alt` (or `alt=""` when decorative). Decorative icons
   get `aria-hidden="true"`.
5. Async updates the user must notice (toasts, validation results, save
   confirmations) announce via `aria-live="polite"`.
6. Semantic HTML before ARIA: `<button>`, `<a>`, `<label>`, `<table>`,
   `<nav>`. ARIA patches what semantics can't express, never replaces it.
7. Headings are hierarchical h1-h6 with no skipped levels; a skip link jumps
   to main content on page-level layouts.
8. Anchored headings get `scroll-margin-top` so in-page links don't land
   under a sticky nav.
8a. **Label in Name (WCAG 2.5.3).** When a control has visible text, its
    accessible name must contain that visible text verbatim (case-
    insensitive) as a substring — voice-control users (Voice Control,
    Dragon) speak the visible label to activate it, and a mismatched
    `aria-label` breaks that. `aria-label="Delete item from cart"` on a
    button reading "Delete" passes; `aria-label="Remove"` on the same
    button fails — the visible word isn't in the accessible name at all.
    Icon-only buttons with no visible text are exempt (rule 1 already
    covers them).

## 2. Focus

9. `:focus-visible` over `:focus` — no focus ring flash on mouse click,
   full ring on keyboard.
10. Compound controls (input + button, search groups) use `:focus-within`
    so the group reads as one focused unit.

## 3. Forms

11. Inputs carry meaningful `name` + `autocomplete` (`email`, `current-
    password`, `postal-code`...). Correct `type` (`email`, `tel`, `url`,
    `number`) and `inputmode` — the mobile keyboard is part of the UI.
12. Labels are clickable: `for` attribute or wrapping the control.
    Checkbox/radio + label = one continuous hit target, no dead gap.
13. `spellcheck="false"` on emails, usernames, codes, tokens — red squiggles
    on an email address is noise.
14. Submit stays enabled until the request actually starts; in-flight =
    disabled + inline indicator (components.md §3). Never pre-disabled
    "until the form is valid" as the only affordance.
15. Placeholders show an example pattern and end with `…` — they are hints,
    never labels (components.md §6).
16. `autocomplete="off"` on non-auth fields that trigger password managers
    for no reason (search boxes, coupon codes).

## 4. Animation review

17. `transform-origin` matches the trigger: popover grows from its anchor,
    not center (motion-craft.md §4 — modals exempt).
18. SVG animation: transforms on a `<g>` wrapper with
    `transform-box: fill-box; transform-origin: center` — raw transforms on
    SVG children rotate around the canvas origin, not the element.
19. Loading affordances that outlive their state: a spinner still spinning
    after content arrived, a skeleton flashing for a 50ms response
    (components.md §3 loading-timing table decides).

## 5. Typography micro-rules

20. `…` (single ellipsis char), never `...`. Loading states end with it:
    "Loading…", "Saving…".
21. Curly quotes for prose in UI copy, straight quotes only in code.
22. Non-breaking space where a wrap breaks meaning: `10&nbsp;MB`,
    `⌘&nbsp;K`, two-word brand names.
23. `font-variant-numeric: tabular-nums` on number columns, counters,
    timers, any vertically compared digits (motion-craft.md §8 covers
    tickers; this rule covers static tables too).

## 6. Images

24. Explicit `width` + `height` (or `aspect-ratio`) on every `<img>` — no
    layout shift when it loads. `NuxtImg` gets the same props.
25. Below the fold: `loading="lazy"`. Above-fold hero/LCP image:
    `fetchpriority="high"`, never lazy.

## 7. Performance

26. No layout reads in hot paths: `getBoundingClientRect`, `offsetHeight`,
    `scrollTop` inside render/watch/rAF loops force sync layout. Batch
    reads, then writes — never interleave.
27. `<link rel="preconnect">` for CDN/font/asset origins actually used.
28. Critical fonts: `preload as="font"` + `font-display: swap` (or
    `@nuxt/fonts`, which handles both).
29. Long same-page sections below the fold: `content-visibility: auto` is
    the cheap win before reaching for virtualization.
30. Budget check stays preflight #27 (Core Web Vitals) — this section is
    the code-shape causes behind those numbers.

**Why these three numbers, not a vibe:** sites passing all three CWV
thresholds measurably see ~24% lower bounce rate; moving a site from
"poor" to "good" across a 40-engagement case-study set averaged an 11-19%
conversion-rate lift. Real single-site cases: Tokopedia +23% average
session duration after -55% LCP; Nykaa +28% organic traffic after -40%
LCP; iCook +10% ad revenue after -15% CLS. INP is the one to watch hardest
right now — it's the metric ~43% of sites still fail, more than LCP or
CLS.
[NitroPack: most important Core Web Vitals metrics in 2026](https://nitropack.io/blog/most-important-core-web-vitals-metrics/)

## 8. Navigation & state

31. URL reflects state: filters, tabs, pagination, expanded panels live in
    query params (`useRoute()`/`useRouter()` sync), so refresh, share, and
    back-button all work. `ref`-only UI state that a user would bookmark is
    a finding.
32. Destructive actions get a confirmation step or an undo window — never
    immediate and final.
33. `autofocus` sparingly: desktop only, single primary input per page
    (a login form yes, a filter field no) — on mobile it yanks the keyboard.
33a. SPA route changes restore scroll deliberately: forward navigation to a
    new route scrolls to top, back/forward navigation restores the scroll
    position the user left (`history.scrollRestoration = 'manual'` +
    save/restore keyed by path, or the router's built-in equivalent).
    Leaving the browser default on a client-routed app means back-button
    lands at a random mid-scroll position instead of where the user was.

## 9. Touch & safe areas

34. `touch-action: manipulation` on tappable controls — kills the 300ms
    double-tap-zoom delay.
35. `-webkit-tap-highlight-color` set deliberately (usually transparent,
    replaced by a real `:active` state — components.md §3).
36. Modals, drawers, sheets: `overscroll-behavior: contain` so inner scroll
    doesn't chain to the page.
37. During drag: text selection disabled, dragged elements `inert`
    (motion-craft.md §6 owns the gesture math; this is the DOM hygiene).
38. Full-bleed and fixed-bottom layouts pad with `env(safe-area-inset-*)`
    for notches and home indicators.
38a. A fixed/sticky bottom bar (mobile CTA bar, cookie banner, cart summary)
    needs the page's scrollable content to carry bottom padding equal to
    the bar's rendered height (plus safe-area inset) — otherwise the last
    section's content or a final CTA sits physically underneath the bar,
    unreachable and unreadable. Measure the bar's actual height (it varies
    with content/font-scaling), don't hardcode a guessed pixel value.

## 10. Dark mode & theming

39. `color-scheme: dark` on `<html>` for dark themes — fixes scrollbars,
    form controls, and UA defaults (surface values: tokens.md §5).
40. `<meta name="theme-color">` matches the page background per theme.
41. Native `<select>` gets explicit `background-color` and `color` — the
    Windows dark-mode dropdown is white-on-white otherwise.

## 11. i18n & formatting

42. `Intl.*` everything (pointer: components.md §5); language detected via
    `Accept-Language` / `navigator.languages`, never IP geolocation.
    Nuxt module wiring: seo-i18n.md.
43. `translate="no"` on brand names, code tokens, and identifiers — auto-
    translate garbles them otherwise.

## 12. Hydration safety (Nuxt/SSR)

44. Anything that differs server vs client — `Date.now()`, locale-dependent
    formatting, `window`/`localStorage` reads, random IDs — renders inside
    `<ClientOnly>`, `NuxtTime`, or `useId()`, never inline in SSR'd
    template output. A hydration-mismatch warning is a bug, not noise.
45. Inputs bind through `v-model` (or explicit `:value` + handler); a bound
    value with no way to change it is a dead control.

## 13. Copy in the UI

Copy register, banned phrases, CTA length: ai-tells.md §4 owns the taste
rules. This audit adds the mechanical three:

46. Numerals for counts ("8 deployments", not "eight").
47. Button labels name the action's object ("Save API key", not
    "Continue") — one label per intent page-wide (ai-tells.md §2).
48. Error copy contains the next step, not just the diagnosis
    (components.md §3 error state).

## 14. WCAG 2.2 additions — not yet covered above

WCAG 2.2 added 9 success criteria over 2.1 (2 Level A, 4 AA, 3 AAA);
Redundant Entry (forms.md rule 6) and Target Size Minimum (tokens.md's
24px touch-target floor) are already this suite's own rules — these four
aren't yet checked anywhere in this file:

49. **Focus Not Obscured (2.2 AA).** A sticky header/footer/cookie banner
    must never fully cover the currently-focused element when tabbing
    through the page — check any fixed-position overlay against keyboard
    focus, not just mouse hover.
50. **Dragging Movements (2.2 AA).** Any drag-only interaction (reorder
    list, slider, drag-to-dismiss) needs a single-pointer alternative
    (buttons, tap-to-select-then-tap-target) — dragging must never be the
    ONLY way to complete the action.
51. **Consistent Help (2.2 A).** If a help link/chat-widget/contact
    mechanism appears on multiple pages, its relative position in the
    navigation order stays the same page to page — don't let it move
    around the layout between routes.
52. **Accessible Authentication Minimum (2.2 AA).** Login must not require
    a cognitive test (solve a puzzle, transcribe a CAPTCHA, remember then
    re-type something) with no alternative — password managers/paste and
    a non-puzzle 2FA path (SMS/email code, not "type these distorted
    letters") satisfy this; blocking paste into a password field is
    itself a fail here, not just a UX nit.

[Level Access: WCAG 2.2 compliance checklist](https://www.levelaccess.com/blog/wcag-2-2-aa-summary-and-checklist-for-website-owners/)

## 15. Flag-on-sight list

`user-scalable=no` / `maximum-scale=1` (zoom disabling — always a finding,
no override) · `<div @click>` navigation · `<img>` without dimensions ·
`v-for` over a large array with no pagination/virtualization plan ·
`autofocus` with no justification · hardcoded date/number formatting ·
input without label · icon button without `aria-label` · straight `...` in
rendered copy.

## Output format

Group by file, `file:line`, one line per finding, no preamble, no praise.
State the issue; add the fix only when non-obvious. Clean file = `pass`.

```text
## app/components/PricingCard.vue
app/components/PricingCard.vue:42 - icon button missing aria-label
app/components/PricingCard.vue:18 - div with @click -> button
app/components/PricingCard.vue:55 - "..." -> "…"
## app/components/Modal.vue
app/components/Modal.vue:12 - missing overscroll-behavior: contain
## app/components/Badge.vue
pass
```

Every finding is a lead, not a verdict — same discipline as preflight's
"How a grep lies": open the file, confirm, then count it. A defended hit
gets a `impulse-ok` pin (preflight.md).

## Boundaries

- Mechanical grep subset (counts, one-command checks) = preflight.md —
  anything here that becomes expressible as a grep migrates there.
- This file is the human/agent review sweep: judgment calls a scanner
  can't make, run per-component and inside `/impulse-review`.
- What's banned as a design default = ai-tells.md. Motion values =
  motion-craft.md. State/a11y/harden detail = components.md.
