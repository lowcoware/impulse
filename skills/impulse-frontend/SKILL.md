---
name: impulse-frontend
description: "Vue 3 / Nuxt 4 / Tailwind v4 WEB frontend — UI, components, landing pages, dashboards, admin panels, forms, design tokens, animation in the browser. Triggers EN: UI, frontend, component, landing, dashboard, hero, web animation, motion, UI design, web page layout, Nuxt, Vue, Tailwind, GSAP. Triggers RU: фронт, фронтенд, интерфейс, лендинг, дашборд, компонент, анимация, вёрстка, дизайн интерфейса, страница сайта, форма. UI in Flutter / React Native / SwiftUI / Kotlin — routes to impulse-mobile. A one-off shareable HTML report/plan/diagram file — routes to impulse-artifact, not here."
---

# impulse-frontend

ACTIVE EVERY RESPONSE. No drift back to over-building or AI-default design. Still active if unsure. Off only: `stop impulse` / `normal mode`.

## Register split — declare before building

Every UI task runs in exactly one register. Full split, permissions, bans: [references/registers.md](references/registers.md).

| Register | When | Bar |
|---|---|---|
| `brand` | design IS the product: landings, heroes, marketing, portfolio | distinctiveness — "how was this made?", never "which AI made this?" |
| `product` | design SERVES the task: dashboards, admin, app UI, forms | earned familiarity — tool disappears into the task |

Before any code, output one line — the Design Read:

`Design Read: <page kind> for <audience>, <vibe>, register: <brand|product>[, source: external-authority (<origin>)]`

Ambiguous brief → exactly ONE clarifying question, never a dump. Can infer → don't ask, declare and build.

**External design authority.** When the brief explicitly names an outside
design as the spec — the customer's Figma, provided mockups, "переезд дизайна",
"по макету", pixel-perfect port — the design is a CONTRACT, not a reference:
reproduce it, don't improve it. The aesthetic bans (ai-tells, token taste
rules) yield to the authored design; the hard floors (a11y contrast, reduced
motion, perf, security) do NOT yield — but a conflict between a floor and the
mockup is surfaced to the user as a named question BEFORE the change, never
applied silently. Every deviation from the source, floor-driven or technical,
goes into a deviations ledger the user signs off. DESIGN.md records
`authority: external` so review judges the diff by fidelity, not taste.
Full protocol: `references/design-contract.md` § Design-as-authority.

## Modes

Active mode from `~/.claude/.impulse-active`, fallback `medium`. Presets are the coarse tool; registers.md also has numeric `VARIANCE`/`MOTION`/`DENSITY` dials for finer-grained brand-register calibration.

| Mode | Behavior |
|---|---|
| `blitz` | Clean static, minimal motion, ship fast. No alternatives discussion, no plan prose. Hard rules + preflight still fully apply. |
| `medium` | Default. Register defaults, full ruleset as written. |
| `hardcore` | brand: full choreography (GSAP/Lenis pin/scrub, per-section art direction). product: full harden pass (all states, edge inputs, i18n). |

## Stack canon

Nuxt 4 · Vue 3 Composition · Tailwind v4 (`@theme` tokens) · Pinia (client state) · `useFetch`/`useAsyncData` (server state) · VueUse · shadcn-vue · Phosphor icons (`@phosphor-icons/vue`, one family per project, lucide dropped) · GSAP + ScrollTrigger + Lenis for pin/scrub/scroll choreography · motion-v for simple reveals. GSAP lives in composables: `gsap.context` + `onUnmounted` cleanup — skeletons in motion.md.

Design explicitly doesn't matter (internal tool, admin CRUD, throwaway prototype) → Frappe UI instead of shadcn-vue, batteries-included. Never mixed with shadcn-vue on the same surface: components.md §0.

## Hard technique rules — every task, every mode

IDs `FE-H01`–`FE-H16` follow this numbering. [`shared/rule-spine.md`](../../shared/rule-spine.md) maps each to its detector and the impulse-review tag that catches it — add a rule here, add its row there, or review never learns about it.

1. `min-h-[100dvh]`, never `h-screen`.
2. Animate `transform`/`opacity` only. Never top/left/width/height.
3. `window.addEventListener('scroll')` banned. ScrollTrigger / Lenis / IntersectionObserver exist.
4. Every animation ships a `prefers-reduced-motion: reduce` fallback. No exceptions.
5. No bounce/elastic easing. Ease-out for entrances; full easing table (exits = ease-in, moves = ease-in-out) in references/motion.md.
6. Reveals enhance an already-visible default. Class-gated invisibility = section ships blank on headless render.
7. Contrast: body ≥4.5:1 (placeholders included), large text ≥3:1.
8. Gray text on colored background banned — use a darker shade of the bg's own hue.
9. Color work in OKLCH.
10. Semantic z-index scale (dropdown → sticky → backdrop → modal → toast → tooltip). Never 999.
11. `min-width: 0` on flex/grid children that hold text.
12. Motion motivated: can't say why in one sentence → drop it.
13. Motion claimed = motion shown: can't ship working motion → drop to static, ship clean.
14. Grid over flex-percentage-math. `w-[calc(33%-1rem)]` banned — `grid grid-cols-*` instead.
15. New dependency → check `package.json` first, output the install command before importing. Never assume a library exists.
16. Container width from one token (`max-w-7xl mx-auto` or DESIGN.md's own max-width) — never ad-hoc per page.

## References — read what the task needs

| File | When |
|---|---|
| [references/registers.md](references/registers.md) | every task — register pick, Design Read, dials, presets × modes |
| [references/ai-tells.md](references/ai-tells.md) | any visual or copy output — full ban catalog |
| [references/typography.md](references/typography.md) | picking a font or headline treatment — serif discipline, pairings, emphasis |
| [references/images.md](references/images.md) | any visual asset slot — image-gen priority, real logos, no-fake-screenshot recipes |
| [references/image-pipeline.md](references/image-pipeline.md) | image-gen tool available + visually important task — generate section references BEFORE code, extraction checklists, logo concept methods |
| [references/template-catalog.md](references/template-catalog.md) | brief matches a packaged shape (deck/prototype/wireframe/dashboard/video) — map of open-design templates and the usage protocol |
| [references/brand-systems-catalog.md](references/brand-systems-catalog.md) | brief says "like <brand>" or names an aesthetic family — map of 153 open-design brand packages (DESIGN.md + tokens.css each) |
| [references/brand-extraction.md](references/brand-extraction.md) | named brand isn't in the 153-package catalog — extraction pipeline (live URL/codebase/screenshots) to build the evidence fresh |
| [references/content.md](references/content.md) | long lists, spec sheets, quotes, or copy self-audit — positive recipes past a ban |
| [references/vocabulary.md](references/vocabulary.md) | picking a hero/nav/scroll/card pattern — names to design with |
| [references/redesign.md](references/redesign.md) | modernizing an existing brand/design (not unfamiliar code — that's impulse-legacy) |
| [references/components.md](references/components.md) | product UI — shadcn-vue, 8 states, harden list, a11y numbers |
| [references/motion.md](references/motion.md) | any animation — GSAP/Lenis Vue composable skeletons, motion-v split |
| [references/motion-craft.md](references/motion-craft.md) | animation micro-craft — should-it-animate gate, exact easing/duration/spring values, gesture physics, motion review catalog |
| [references/gsap-api.md](references/gsap-api.md) | writing GSAP against the raw core API — tween/timeline option tables, ease matrix, gsap.utils, Nuxt lazy-plugin loader |
| [references/gsap-plugins.md](references/gsap-plugins.md) | GSAP ScrollTrigger config/callbacks/batch/scrollerProxy, and the plugin catalog (SplitText/MorphSVG/Flip/Draggable/Observer/etc) |
| [references/tokens.md](references/tokens.md) | tokens/theming — DESIGN.md protocol, `@theme`, dark surface ladder, Lila Rule |
| [references/preflight.md](references/preflight.md) | before delivering ANY UI — mechanical checks, one unticked = not done |
| [references/interface-audit.md](references/interface-audit.md) | reviewing a component/page beyond the greps — 55 checkable interface rules (a11y, hydration, touch/safe-area, i18n, dark-mode) with file:line output |
| [references/design-contract.md](references/design-contract.md) | vague taste input ("like X", screenshots, adjectives) — evidence contract producing the project DESIGN.md, keep/change/do-not-copy boundary + brief-to-tokens resolver |
| [references/reference-mining.md](references/reference-mining.md) | combining 2+ vendored sources on request, or greenfield brand-register work with no reference named — pick one structure + one token system + one motion voice, audit-trail the mix, real-brand identity boundary |
| [references/reference-critique.md](references/reference-critique.md) | reviewing/improving an EXISTING site against the vendored corpus — nearest-fit reference pick, per-axis gap analysis, ranked biggest-gap-first findings |
| [scripts/preflight.mjs](scripts/preflight.mjs) | `node scripts/preflight.mjs <root>` — runs the greppable subset of preflight + ai-tells as one scan; `--rules=scripts/rules.ru.mjs` adds RU copy tells |
| [references/pinia.md](references/pinia.md) | state that needs a store — store-vs-ref, Nuxt SSR state-leak footgun |
| [references/composables.md](references/composables.md) | extracting a composable or fetching data — useFetch/useAsyncData/$fetch decision |
| [references/forms.md](references/forms.md) | building a non-trivial form — vee-validate+Zod, multi-step, server-error mapping |
| [references/seo-i18n.md](references/seo-i18n.md) | SEO or i18n work — hreflang, locale routing, missing-key trap |
| [references/ux-laws.md](references/ux-laws.md) | layout/IA decisions — 29 UX laws as checkable rules + folklore corrections |
| [references/rtl-i18n-ui.md](references/rtl-i18n-ui.md) | RTL or bidi text in UI — logical properties, bdi/dir rules, mirror tables (seo-i18n owns routing) |
| [references/typography-cjk.md](references/typography-cjk.md) | Japanese/CJK content — horizontal metrics (em not ch, kinsoku) and vertical `writing-mode` rules |
| [references/rendering-pwa.md](references/rendering-pwa.md) | picking a render mode, adding PWA/offline, or packaging for desktop — routeRules decision, Tauri vs Electron |
| [../../shared/rule-spine.md](../../shared/rule-spine.md) | adding or renumbering a hard rule, or wondering which review tag catches one — the builder↔review crosswalk |
| [../../shared/communication.md](../../shared/communication.md) | chat tone (RU), thinking compression |
| [../../shared/completeness.md](../../shared/completeness.md) | any code/doc deliverable — no truncation stubs, scope-count lock, clean PAUSED breakpoints |
| [../../shared/context7.md](../../shared/context7.md) | Nuxt/Vue/Tailwind v4/GSAP/shadcn-vue/Pinia/VueUse API syntax before writing against it — version drift past training cutoff |

## DESIGN.md protocol

Generate the project's `DESIGN.md` at bring-up (Stitch 9-section format — tokens.md), READ it on every UI task. Tokens live in the project, rules live in this skill. Tailwind `@theme` mirrors DESIGN.md tokens — drift = bug.

## Boundaries

- "impulse" = suite name, NOT a dark-theme mandate. Theme is a per-project DESIGN.md decision; the Linear dark surface ladder is a first-class option in tokens.md, not the default.
- Em-dash ban covers visible UI copy only. Chat prose = shared/communication.md territory (pairs with /caveman: tone here, compression there).
- Diff review → `/impulse-review`. Correctness/security → `/code-review`.
- Existing/unfamiliar frontend code (not this skill's greenfield assumption) → `impulse-legacy` — characterization tests, blast-radius assessment first. That's code safety; `references/redesign.md` here is the brand/design-preservation layer of the same redesign task — use both.
- Testing floor, never mode-gated: component tests with `getByRole`, Playwright E2E on critical flows, visual states exercised.
- No emoji in code, copy, commits, logs. No secrets in examples.
