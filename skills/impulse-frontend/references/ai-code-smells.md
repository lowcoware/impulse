# ai-code-smells.md: architecture-level AI tells

ai-tells.md catalogs what a generated UI *looks* like. This file catalogs
what generated UI *is built like* underneath — the structural habits an LLM
falls into because it generates one file/prompt at a time with no persistent
view of the existing codebase. These don't show up in a screenshot; they show
up in a diff, and they compound silently across a project the same way visual
defaults compound across a page. Sourced against documented LLM-codegen
research (73% more implementation smells, 21% more design smells than human
baselines) and cross-project accessibility audits finding 300+ distinct a11y
defects across just six AI-built sites.
[Investigating the Smells of LLM-Generated Code](https://arxiv.org/html/2510.03029v1)
[AI-Generated UI Is Inaccessible By Default](https://frontendmasters.com/blog/ai-generated-ui-is-inaccessible-by-default/)

## 1. Component duplication instead of reuse

The single most common structural tell: a new `Button`/`Card`/`Modal`/`Badge`
gets hand-rolled per page with slightly different classes instead of
importing the one that already exists, because generation is local to the
current prompt, not aware of `components/`. This is `FE-H18` — hard rule,
every mode:

- **Before writing any new UI-primitive component** (button, card, modal,
  input, badge, dropdown, tooltip), grep `components/` for one that already
  does the job. Extend it with a prop/variant, or compose it — never
  hand-roll a visual duplicate with slightly different Tailwind classes.
- A repo with 3+ near-identical card/button implementations differing only
  in class strings is a `simplify:` finding, not a style choice — collapse to
  one component with variants (`variant="outline" | "ghost" | "solid"`).
- Same discipline for **repeated logic**, not just markup: a validation
  function, a currency formatter, a debounce wrapper written fresh in two
  different files is the same smell as a duplicated component — extract to
  `composables/` or `utils/` the first time it's about to be copied, not the
  third.

## 2. Mobile/desktop component forking — banned outright

`FE-H17`. AI-generated frontends default to building **separate component
trees per viewport** — `MobileNav.vue` + `DesktopNav.vue`, or a single
component that mounts one of two entirely different child trees behind a
`useMediaQuery`/`window.innerWidth` check — instead of one fluid component
that adapts via CSS. This is a real, named failure mode
("**Frankenstein layout**": recognizable parts individually correct, stitched
together in a way that doesn't structurally belong), not just a style
preference:
[Different component for same section for desktop and mobile — Adobe community](https://experienceleaguecommunities.adobe.com/adobe-experience-manager-sites-8/different-component-for-same-section-for-desktop-and-mobile-39487)

Why it's banned, not just discouraged:

- **The hidden variant still runs.** A `v-if`/viewport-gated component tree
  still mounts, executes its lifecycle hooks, fires its watchers/effects, and
  re-renders — behind `display:none` or simply unmounted-on-resize, it is
  never actually free. Two trees means twice the lifecycle cost and twice the
  bug surface (a fix applied to `DesktopNav.vue` and forgotten in
  `MobileNav.vue` is now a silent prod bug, not a hypothetical one).
- **It duplicates content instead of adapting it**, which is also an SEO/
  maintenance cost documented in the adaptive-vs-responsive literature
  (adaptive builds run measurably more expensive to maintain than a single
  responsive one because every content/copy change has to land in N places):
  [Responsive vs. Adaptive Design — UXPin](https://www.uxpin.com/studio/blog/responsive-vs-adaptive-design-whats-best-choice-designers/)
- **The fix is one component, fluid CSS.** Tailwind responsive prefixes
  (`md:`, `lg:`) and container queries (`@container`, Tailwind v4's `@sm`
  variants) adapt layout, spacing, and visibility *inside* one template.
  `v-if="isMobile"` swapping the whole subtree is the tell; `class="flex
  flex-col md:flex-row"` on one subtree is the fix.
- **The one legitimate exception**: genuinely different information
  architecture that can't be expressed as a CSS reflow of the same DOM (a
  hamburger drawer nav vs. a full inline navbar). Even then, keep it ONE
  component that internally branches its template on a breakpoint-driven
  `ref` — never two separately-authored root `.vue` files duplicating the
  nav's links/logic in parallel. If the two truly need independent markup,
  the shared links/state still live in one composable both consume — the
  duplication ban is about logic and content, template shape can differ.
- **Hardcoded breakpoint values instead of the token scale** (`768px` because
  it's the tutorial default, not because it's where *this* layout actually
  breaks) is the same smell one level down — pick the breakpoint by looking
  at where the content itself wraps badly, not by copying a round number.

Detection: `rg -n "MobileView\|DesktopView\|isMobile\|useMediaQuery" app/components`
— every hit is a lead. A component genuinely reading viewport state for a
*content* decision (load a lighter map tile set below 768px) is fine; one
driving which *component tree* mounts is the ban.

## 3. Logic placement

- **Business logic embedded directly in a component's `<script setup>`**
  (an API call inside a bare `watchEffect`, no composable) instead of
  `useFetch`/`useAsyncData` or an extracted composable
  (`composables.md`'s extraction criteria) — the shortest path to "it
  works" is rarely the right layer.
- **`watch`/`watchEffect` that updates the same state it reads** — the Vue
  analogue of the documented React "useEffect added just in case" tell: an
  effect that writes to a ref its own dependency array includes reintroduces
  itself every tick, seeding either an infinite loop or a subtle race. If a
  watcher writes to something it also watches, that's a `bug:` finding, not
  a style nit.
- **Manual `ref`/`reactive` state reimplementing what a form library already
  does** — 15 fields of hand-rolled `ref` + manual validation instead of
  vee-validate + Zod (forms.md) is a sign the agent defaulted to the most
  primitive tool available rather than the idiomatic one already blessed
  for this stack.

## 4. Tokens vs. magic numbers

Arbitrary Tailwind values (`bg-[#3b82f6]`, `mt-[13px]`, `w-[347px]`) sprinkled
through templates instead of referencing `@theme` tokens (tokens.md) — every
one is a value invented per-file because no token vocabulary was consulted.
Already partially caught mechanically (preflight #10 radius, #15 z-index);
extend the same suspicion to arbitrary spacing/color/width values showing up
outside a one-off, clearly justified case. A rebrand or spacing-scale change
that requires a global find-replace instead of one token edit is the
downstream cost of this smell, not a separate problem.

## 5. Accessibility defects specific to generated markup

These are the concrete, repeatedly-documented a11y misses in AI-generated UI
— cross-reference interface-audit.md §1 (they're the same rules); listed
here because they're disproportionately common in *generated* code
specifically, not just occasionally missed by hand:

- `<div>`/`<span>` with `@click` where `<button>`/`<a>` belongs (no implicit
  role, not focusable, no keyboard handler) — the single most-cited
  generated-code a11y defect across audits.
- Missing landmark regions (`<nav>`, `<main>`, `<aside>`) — screen-reader
  users lose region-jump navigation entirely.
- Custom dropdown/select/tab components missing the ARIA state attributes
  (`aria-expanded`, `aria-selected`, `aria-controls`) that make them behave
  like their native equivalents to assistive tech.
- Icon-only elements with neither `aria-hidden="true"` (decorative) nor an
  accessible name (functional) — a coin-flip default that generated code
  gets wrong close to half the time in published audits.
- A modal/overlay missing `role="dialog"`, `aria-modal="true"`, a focus trap,
  and an Escape handler — present-but-broken more often than fully absent,
  which makes it easy to miss on a skim.

Run interface-audit.md's full sweep on any AI-assisted diff, not just
hand-written ones — generated code is not exempt from the audit, it's the
category most likely to fail it.

## More tells (deep-research sweep)

ai-tells-extended.md's "Code & architecture", "Accessibility", and
"Performance" sections carry ~170 more specific, sourced tells beyond the
five categories above (testing anti-patterns, security-adjacent smells,
SEO/metadata gaps, token-system violations, CSS-file-patching hacks) — pull
it up when this file's five categories come up clean but something about
the diff still smells generated.

## Boundaries

- Visual/copy bans → ai-tells.md, extended catalog → ai-tells-extended.md.
  This file is architecture only.
- Mechanical checks that become greppable migrate to preflight.md.
- Component extraction criteria in detail → composables.md, components.md §8.
- Full a11y rule set → interface-audit.md §1 (this file cross-references,
  doesn't restate).
