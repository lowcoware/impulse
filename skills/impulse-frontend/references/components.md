# components.md: shadcn-vue, Phosphor, 8 states, harden, a11y, tests

Scope: product register is the mandatory audience; brand-page interactive elements (nav, forms, CTAs) obey the same state, focus, and a11y rules.

## 0. Choosing the library — two lanes, never mixed

| | shadcn-vue + reka-ui (default) | Frappe UI |
|---|---|---|
| When | any task where the UI is a deliverable — brand register, or product register someone will actually look at | design explicitly doesn't matter: internal tool, admin CRUD, throwaway prototype, "just needs to work" |
| Cost | own the component code, style through DESIGN.md tokens, full ai-tells/registers/dial ruleset applies | batteries-included: forms, data table, rich-text editor (Tiptap), charts (ECharts), dialogs, layout shells — skip the taste ceremony, ship |
| Package | `shadcn-vue`, primitives from `reka-ui` | `frappe-ui` (Vue 3, Tailwind, bundles `@headlessui/vue` + `reka-ui` internally as its own closed system) |
| Icons | Phosphor only (§2 below) | Frappe UI ships its own icon set (`lucide-static`/feather) internally — that's its closed system, not a violation of the one-icon-family rule; don't reach into it for icons on a shadcn-vue surface, and don't import Phosphor into a Frappe UI surface |

Pick ONE per project/surface. The "1 component library per project" rule
(ai-tells.md) still holds — Frappe UI is the sanctioned SECOND lane for a
different job, not a mixing exception. Never both on the same page.

Choosing Frappe UI is a real decision, not a default: state it in the
Design Read ("register: product, lane: frappe-ui — internal tool, speed
over taste") so it's not silently skipping the ruleset below.

**Charting escape hatch.** ECharts (either lane) covers standard chart
types — bar/line/pie/scatter/heatmap. Reach for D3 instead, in either lane,
only when the need is a genuinely bespoke visual encoding ECharts has no
preset for: force-directed/network graphs, chord diagrams, custom
geographic projections, or hand-choreographed transitions tied to
scroll/interaction state. D3 binds data to the DOM directly — it isn't a
"chart library" with preset types, it's a toolkit for building one, so
don't reach for it just because it's more customizable in the abstract;
that's ECharts with extra steps and a much larger surface to get wrong.
Package: `d3` (tree-shakeable — import only the modules used: `d3-scale`,
`d3-shape`, `d3-force`, etc., not the `d3` umbrella package for anything
beyond a prototype).

**Maps.** MapLibre GL, not Google Maps/Mapbox GL (Mapbox went proprietary
license in 2021) — self-hosted vector tiles via `pmtiles` (single static
file) beat a hosted provider: no API key in the bundle, no per-view billing.

**Video.** `hls.js` for adaptive streaming playback + `media-chrome` (web
components) for the controls chrome, over a hand-rolled `<video>` control
bar or a heavier player framework.

**Component showcase.** Storybook as its own app once a design system
outlives one project (Formbricks runs it as a separate app in the
monorepo) — don't stand it up for a single-project component set that has
no second consumer yet.

**Copy vs. package.** shadcn-vue's copy-into-`components/ui/` model (§1
below) is right for one product. Once a design system serves 2+ products,
switch it to a versioned package published from its own repo (Immich's
`@immich/ui`) — copies drift between consumers past that point. A shared
package inside one monorepo with consumers on one release train (`@plane/ui`
pattern) is the middle ground; a separate repo is only worth it once release
cadences actually diverge.

### 0a. Design-system honesty

Brief reads as a KNOWN official design system → use the official package,
never recreate its CSS by hand and never import its tokens to override 90%
of them: Material-flavored product = `@material/web`/Vuetify, IBM-style
enterprise = Carbon, UK public sector = `govuk-frontend`, US = `uswds`,
Shopify admin = Polaris. Regulated/public-sector briefs often EXPECT the
official system — that expectation overrides aesthetic preference.

Brief reads as an AESTHETIC, not a system (glassmorphism, bento, brutalism,
editorial, "Apple Liquid Glass") → there is no official package. Build with
native CSS + Tailwind and say so honestly: "Liquid Glass" on the web is an
approximation via `backdrop-filter` + layered borders — label it as an
approximation, never claim official material. Execution recipes for the
named aesthetic families: vocabulary.md.

### 0b. Building a component others will love (Sonner principles)

When the deliverable IS a reusable component/library (from emilkowalski's
Sonner, 13M+ weekly downloads; MIT, re-expressed):

1. Adoption friction ~ zero: one mount + one function call
   (`<Toaster />` + `toast()`), no hooks, no context, no setup ceremony.
2. Defaults beat options — most users never customize; the default
   easing, timing, and look must be excellent out of the box.
3. Edge cases handled invisibly: pause timers in hidden tabs, fill hover
   gaps between stacked items with pseudo-elements, capture pointer during
   drag. Nobody notices — that's the point (unseen details compound).
4. Transitions, not keyframes, for anything triggered rapidly
   (motion-craft.md §5).
5. Motion matches the component's personality — Sonner is deliberately a
   touch slower and `ease` instead of `ease-out` because elegant is the
   vibe; a dashboard component stays crisp.

## 1. shadcn-vue conventions

1. Add via `npx shadcn-vue@latest add <component>`; code lands in `components/ui/`, you own it.
2. Never ship the default shadcn theme. Map radius/colors/type to DESIGN.md tokens through Tailwind v4 `@theme` (tokens.md).
3. One component library per project. Zero mixing with PrimeVue/Vuetify/Element/Naive.
4. Keep the reka-ui primitive underneath: it carries focus trap, ARIA, keyboard nav, portals. Never rebuild dialog/dropdown/popover/tooltip/select by hand.
5. Overlays render through the primitive's portal (`Teleport`). `position: absolute` inside `overflow: hidden` = clipped menu = bug.
6. Variants via `cva` inside the component file. States are variants; zero ad-hoc state classes at call sites.
7. Same control = same component everywhere. Two different-looking save buttons = one is wrong.

## 2. Icons

1. `@phosphor-icons/vue` only. lucide is banned: replace shadcn-vue's default `lucide-vue-next` imports on every `add`.
2. One icon family per project: grep icon imports = 1 package.
3. One weight globally (set default props via provide/inject in a Nuxt plugin); per-icon weight mixing = 0.
4. Hand-rolled SVG icon paths = 0. Glyph missing = pick another Phosphor glyph, never draw one.
5. Emoji as icons or in UI strings = 0.

## 3. Eight states per interactive element

`default / hover / focus / active / disabled / loading / error / success`: all 8 shipped or the component is not done.

| State | Rule |
|---|---|
| loading | Skeleton matching the final layout shape. Content-area spinners = 0. Button in-flight = disabled + inline indicator |
| loading timing | < 100ms: nothing. 100ms-1s: skeleton. > 1s: visible progress. > 10s: estimate + cancel |
| empty | Teaches: names what fills it + one CTA to fill it. Bare "No data" = fail |
| error | Forms: inline at the field, input preserved. Fetch: message + retry button. Toast only for transient events. Retry discipline: first retry immediate, then backoff 2s/4s/8s; after 3 failures swap Retry for "Contact support" + a copyable error ID |
| success | Confirms the state change; optimistic update rolls back on failure |
| disabled | Visually distinct AND exposed to AT (native `disabled` / `aria-disabled`); no full-saturation accent on inactive controls |
| hover / active | `:active` gives physical feedback: `scale-[0.98]` or `-translate-y-[1px]` |
| focus | See section 4 |

Vue idioms:
- Data views: `useFetch`/`useAsyncData` `status` drives one `v-if` chain: pending = skeleton, error = error + retry, empty result = empty state, data = content. All 4 branches present in every data view.
- Skeleton shimmer sits behind `prefers-reduced-motion: no-preference`.
- Double submit: pending disables the control; second click no-ops.
- `aria-live` containers exist in the DOM BEFORE content is injected — adding the region together with its content never announces.
- Auto-dismissing toasts pause their timer on hover/focus (WCAG 2.2.1).

## 4. Focus

1. `outline: none` without a `:focus-visible` replacement = banned. Ring >= 2px at >= 3:1 against adjacent colors.
2. Every action reachable keyboard-only; tab order = DOM order.
3. Modals trap focus and return it on close. reka-ui does this; do not opt out.
4. Touch/click target >= 24x24 CSS px (WCAG 2.2 minimum; 44x44 the
   comfortable bar) — an icon button smaller than that needs padding to
   the floor, not a smaller hitbox.

## 5. Harden checklist

Full pass in hardcore. In blitz/medium, spot-check 3: RTL, empty state, one API error — the rest ride on the next hardcore pass or an explicit ask.

| Probe | Pass condition |
|---|---|
| 0 / 1 / 1000 items | 0 teaches (see empty state); 1 does not look broken; 1000 paginated or virtualized, never a 10k-node render |
| 100+ char string | truncate or line-clamp; full value via `title`/tooltip; layout holds |
| emoji input | renders, counts, and truncates correctly in every text field |
| RTL | logical properties only (`ms-*`, `ps-*`, `margin-inline-*`); directional icons mirror |
| API 400 / 401 / 403 / 404 / 429 / 500 | each maps to distinct UI: inline validation / login redirect / permission notice / not-found / rate-limit message / generic + retry |
| offline / timeout | error state + retry; infinite skeleton = fail |
| +40% German text | fixed widths on text containers = 0; buttons size by padding, not `w-*` |
| flex/grid children | `min-width: 0` on every shrinkable child |
| dates / numbers / plurals | `Intl.*` APIs; hand-formatting = 0 |
| concurrent actions | submit clicked 10x fast = one request |
| untrusted input reaching CSS | zero: a user-controlled string interpolated into `style="..."`, a dynamic class name built from user data, or a value written into a CSS custom property from unsanitized input. Style values from data (a brand color, a user-set accent) go through an allowlist/validation, not straight interpolation |

Layout-math ceiling: if virtualization + memoization on a large grid still
bottlenecks on the recalculation itself (thousands of items, recompute on
every resize), the next rung is a WASM module for the layout math, not more
JS tuning — Immich moved its justified-photo-grid layout into
`@immich/justified-layout-wasm` once profiling pointed at the computation,
not the render. Mark it `// impulse: JS layout math, upgrade to WASM if
profiling shows compute-bound past virtualization` — a default, not a
starting point.

## 6. A11y numbers

Ratios below are WCAG 2.x math — the enforceable/legal standard, still the
number to cite. Known limitation, not a reason to ignore it: WCAG's ratio
formula overstates contrast on dark colors specifically (a near-black pair
can pass 4.5:1 mathematically while reading as functionally low-contrast),
and its pass/fail cliff has documented absurdities — `#777777` on white
fails at 4.48:1 while `#767676` passes at 4.54:1, a difference no eye can
perceive. APCA (perceptually-calibrated, same felt contrast at the same Lc
score regardless of light/dark) is the more accurate successor and worth
spot-checking a dark-theme palette against — but WCAG 2.x ratios stay the
number this file enforces until APCA reaches equivalent tooling/legal
standing.
[Myndex: WCAG 2 vs APCA, a contrast in applied maths](https://gist.github.com/Myndex/069a4079b0de2930e72d5401bde9af98)

| Check | Number / rule |
|---|---|
| Body text vs background | >= 4.5:1 |
| Large text | >= 3:1 — "large" per WCAG is 18pt regular (~24px) or 14pt BOLD (~18.5px); 18px regular is NOT large and still needs 4.5:1 |
| Document structure | landmarks (`<header>/<nav>/<main>/<footer>`), exactly one `<h1>`, no skipped heading levels, `<html lang>` set |
| Native-first ARIA | native element before any `role=` (a bare `<a>` without `href` is not focusable — use `<button>`); ARIA decision order: native element, native attribute, established pattern, nothing — never invent ARIA |
| UI component boundaries, focus rings | >= 3:1 against adjacent colors |
| Placeholder text | counts as text: >= 4.5:1, not the muted-gray default |
| Gray text on colored background | banned: use a darker shade of the background's own hue, or alpha of the text color |
| Meaning by color alone | banned: pair with icon or text |
| Form anatomy | label above input, error below input, placeholder-as-label = 0 |
| CTA button contrast | audit every CTA incl. ghost buttons over photos (backdrop/scrim/stroke): white-on-white, `bg-white` + `text-white`, borderless transparent-on-page = 0 |

## 7. Tests

1. Component tests: Vitest + `@testing-library/vue`. `getByRole` selectors only: test-ids = 0, class selectors = 0. If `getByRole` cannot find it, the markup is wrong; fix the markup, not the test.
2. Exercise states, not just the happy path: error, disabled, loading, empty each rendered and asserted.
3. E2E: Playwright on critical flows. Required, not optional. Assert visible outcomes, never implementation details. Web-first assertions, no manual sleeps. Full detail (assertion rule, locator fallback order, worker-isolated test data, fixtures-over-POM, visual-regression thresholds, network-mock scope, CI retry/shard limits): `impulse-backend/references/testing.md` §4.
4. Deterministic: inject time and randomness; conditional logic in tests = 0.
5. AI-generated tests get the same scrutiny as AI-generated code: an assert-less test (calls the function, checks nothing) is a `test:` finding in `/impulse-review`, not a pass. On-demand mutation check for a specific business-logic component: `impulse-backend/references/testing.md` §9.

## 8. Component architecture

1. `defineProps<Interface>()` / `defineEmits<{...}>()` type-only macros — no runtime `props: {type: String}` objects in a TS project. Generic components (`<script setup generic="T">`) over prop unions when a prop's type must propagate to emits.
2. Slots when the parent injects markup/interactivity; props when it's data. A prop typed `renderFn: () => VNode` is a slot in disguise — make it a slot.
3. `provide`/`inject` for state a deep, unknown-depth subtree needs (theme, form context) — never as a props-drilling shortcut for 1-2 levels. Cost: consumers become untestable without a wrapping provider in every test — budget that before choosing it over Pinia (`pinia.md`).
4. `v-model` via `defineModel()` (3.4+), not manual `modelValue` prop + `update:modelValue` emit boilerplate.
5. Composable-extraction criteria and the lifecycle-sync rule live in `composables.md` — a component that's grown three unrelated concerns is usually three composables, not one bigger component.
6. Vue 3.5+: destructured `defineProps()` bindings are reactive by default
   (compiler rewrites access to `props.x`) — write `const { count = 0 } =
   defineProps<{ count?: number }>()` for a default instead of the old
   `withDefaults()` boilerplate; only wrap a destructured prop in `toRef()`
   when passing it across a function boundary (composable, watch source)
   that needs the ref itself, not the auto-tracked value.
7. Template refs: `useTemplateRef('name')` (3.5+) over a bare `ref(null)` +
   matching `ref="name"` in the template — works inside composables (a bare
   `ref` declared outside `setup()`'s template-linked scope never binds),
   and `@vue/language-tools` type-checks it against the template's `ref=`
   usage.
   [Vue 3.5 announcement](https://blog.vuejs.org/posts/vue-3-5)

## 8a. Filter interactions

Toggling a filter dims non-matching items (`opacity` down, e.g. `.35`)
rather than removing them from the DOM/layout. Removing filtered-out items
outright collapses the layout and destroys the user's spatial memory of
where things were — dimming preserves position while still making the
match/no-match state obvious at a glance. Reserve actual removal for when
the filtered set is what gets acted on next (a search that narrows a list
before a bulk action), not for exploratory filtering.

## 9. Dense operational UI (dispatch/warehouse/logistics-class tools)

registers.md's product-register DENSITY dial covers most product UI; these
four are specific to a tool trained specialists run for hours a day (a
dispatch board, a warehouse queue, a scheduling console) — genuinely
different from an occasional-use admin panel, not just "high density":

1. **Per-row action controls stay visible, never hover-only.** An expert
   scanning 40 rows doesn't hunt with the mouse to find which rows have
   actions — a hover-revealed action column means the row's actual state
   (has an action? which one?) is invisible until the pointer happens to
   land there. Keep the control (checkbox, toggle, icon button) rendered
   at all times; hover styling can highlight it, but presence isn't
   contingent on it.
2. **Workflow-state filters and search are two different controls, not
   one filter bar.** A persistent filter ("today's orders, unassigned")
   represents a scope decision and stays visible/sticky across the
   session; a search input finds one specific item inside that scope and
   is expected to clear quickly. Merging them into a single filter UI
   forces the operator to context-switch between "what scope am I in"
   and "where's that one row" using the same control.
3. **Bulk-action feedback scales with the affected count**, not a single
   fixed pattern: under ~10 items, inline confirmation is enough; 10-100
   gets a toast with the count ("42 orders updated"); 100+ gets a progress
   indicator during the operation and a completion summary after. A
   silent bulk operation (no feedback regardless of count) is always a
   finding — the operator needs confirmation the action actually landed.
4. **Hierarchical data (order→lines, route→stops) is an in-place
   accordion, not a drill-down to a separate page/route** — the operator
   needs to compare sibling rows' status without losing place. Keyboard
   expand/collapse (arrow keys, Space/Enter) matters more here than in a
   consumer list, since these users work keyboard-first for throughput.
