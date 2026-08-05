# AI bug patterns — frontend `bug:`/`a11y:`/`perf:` catalog

Not general bug-hunting. These are patterns AI-generated code produces
*systematically* — documented in academic studies, empirical corpus analysis,
and real incident writeups — because they're syntactically valid and
"look right" without the concurrent-access/lifecycle/failure-mode reasoning
a human reviewer applies by habit. Six of the entries below are confirmed
against this suite's own real project history, marked
**Seen in production**.

Backend AI-bug/arch patterns: `ai-bug-patterns-be.md`.

## User-facing changes need visual proof against spec, checked not just present

For any diff changing what a user actually sees, missing screenshot/video
evidence is a BLOCK, not a downgradeable nit — same weight as a missing
test on logic. And presence alone isn't enough: evidence that captures
the wrong surface (a screenshot of the wrong screen/state) or omits a
required acceptance criterion the spec named fails the check exactly the
same as no evidence at all. The proof has to be checked AGAINST the
spec/AC, not merely attached to the PR.

## FE — `bug:` (functional, not aesthetic)

### Reactivity

**Destructured `reactive()`/`props` losing reactivity.** `const { count } =
reactive({...})`, or `props` destructured outside a `<script setup>` macro
context — breaks Vue's Proxy-based tracking, the destructured binding is now
a plain non-reactive value frozen at destructure time.
*Fix:* `toRefs()`, or have composables return refs directly instead of a
reactive object callers destructure.

**Watcher created off the synchronous setup call.** Vue auto-disposes
`watch`/`watchEffect` created synchronously inside `setup()` — but a
watcher created inside an async callback, a standalone helper, or a nested
composable called outside that sync window gets NO automatic disposal. A
500-repo static-analysis study found ~4,000 unstored watch/watchEffect stop
handles across the sample — a mechanically detectable, systemic pattern.
[Bryce Andy: the hidden reason your Vue watchers leak memory](https://www.bryceandy.com/posts/the-hidden-reason-your-vue-watchers-leak-memory-and-how-to-avoid-it) ·
[StackInsight empirical study, ~4000 unstored handles](https://stackinsight.dev/blog/memory-leak-empirical-study/)
*Fix:* capture the stop handle, call it in `onUnmounted`/`onScopeDispose`.

**Event listener/interval/third-party lib init with no paired cleanup.**
`addEventListener`/`setInterval`/a chart or map library initialized in
`onMounted` with no matching `removeEventListener`/`clearInterval`/`.destroy()`
in `onUnmounted`.
*Fix:* prefer VueUse's `useEventListener` (auto-cleans), or pair every init
with an explicit teardown.

**SSR-specific leak.** `watch()`/`useFetch()`/`useMediaQuery()` called in a
composable's setup body with no `import.meta.client` guard — on the server,
Nuxt's SSR teardown doesn't dispose the effect scope the same way a client
unmount does; the reactive graph stays in heap across requests. Documented
as an 8-day-to-diagnose real leak, reproducible because the code is
syntactically identical to the client-only-safe version.
[Habr: 8 days hunting a Nuxt 3 SSR memory leak](https://habr.com/ru/articles/1040346/)
*Fix:* wrap in a client-only guard, or use a manual `$fetch` + `shallowRef`
for the SSR path.

### Async / race conditions

**Fetch with no request-identity or AbortController.** Rapid re-fetch
(search-as-you-type, tab switch, param change) with no way to tell which
response is newest — the last-*resolved* promise wins over the
last-*issued* one, so a stale response can silently overwrite a fresher
one.
*Fix:* `AbortController`, abort the previous request before issuing a new
one; in Nuxt 4.2+, `useFetch`/`useAsyncData`'s `dedupe: 'cancel'`.
[Nuxt docs: useAsyncData](https://nuxt.com/docs/4.x/api/composables/use-async-data)

**No cancellation on unmount/route change.** A fetch resolves after the
component that issued it is gone, then sets state on a dead component —
sometimes throws, sometimes silently leaks.

**Async handler with no error handling.** An `async` click/submit handler
with no `try/catch` — a rejected promise vanishes, the loading spinner
never resets, the user sees nothing happen.

### SSR / hydration

**Browser-only API accessed without a client-only guard.** `window`,
`document`, `localStorage`, `innerWidth` read directly in `setup()`/a
computed body — mismatched or crashing SSR.
*Fix:* `onMounted`, `import.meta.client`, or `<ClientOnly>`.

**Non-deterministic value rendered in a template.** `Math.random()`,
`Date.now()`, or raw date formatting used directly where the server and
client can compute different values — hydration mismatch.
*Fix:* `<NuxtTime>`, or compute the value client-side only.

### Lists

**`:key="index"` on a reorderable/filterable/insertable list.** Position-based
keys cause state bleed — focus, local input values, per-item component
state binds to the *slot*, not the *item*, so reordering silently swaps
one item's state onto another.
*Fix:* a stable `item.id` as the key, always, for any list that isn't
strictly append-only and static.

### Forms

**Submit not guarded against double-click.** A disabled-while-pending flag
alone leaves a window before Vue's reactivity updates the DOM; debounce
alone lets clicks through mid-debounce. Both together are the actual fix.
[OpenReplay: preventing double form submissions](https://blog.openreplay.com/prevent-double-form-submissions/)

### Export / download failures

(From nexu-io/open-design export-download-debugging, Apache-2.0. Also the
debug catalog when impulse-systematic-debug meets "download is 0 KB".)

**Native save picker opened before the payload exists.** The host creates
the destination file on picker confirm; a later capture/write failure
leaves a 0 KB file that "downloaded successfully". Core rule: separate
capture from save — prove the payload has non-zero bytes (log type, MIME,
byte length) BEFORE any save channel opens; Save stays disabled until then.
*Fix:* prepare and validate payload first; picker last.

**`showSaveFilePicker().createWritable()` assumed universally available.**
Sandboxed iframes, permissions, and several browsers fail or silently
write nothing.
*Fix:* feature-detect and fall back to `<a download>` (or Electron's
download manager); for PNG under suspicious CSP/sandbox/revocation timing,
a verified non-empty data URL beats a blob URL.

**`URL.revokeObjectURL` raced against the click.** Revoking the object URL
before the download actually started yields empty/failed downloads.
*Fix:* revoke after the download settles, not synchronously after
`click()`.

**Electron `will-download` path unhandled.** Missing Save-As filters for
image extensions, unhandled cancellation, no final-size check — users get
extension-less or empty files.
*Fix:* explicit filters (`.png .jpg .jpeg .webp`), handle cancel, verify
final file size on disk.

### Rendered geometry — right line by line, wrong as a whole

The model never renders its own output, so it never sees these; a human sees
the broken edge in one glance. (Pattern pair from yetone/kill-ai-slop, MIT,
re-expressed.)

**Border that dies at the corner.** A `rounded-xl overflow-hidden` wrapper
whose CHILD carries the 1px border or dividers (a table, an image list, a
scroll area that can't round its own corners). Every line is locally correct —
wrapper owns the radius, child owns the stroke — but the square stroke ring
falls outside the rounded clip at all four corners and gets erased; the
straight runs survive. Same failure via `clip-path: inset(... round ...)`
cutting a stroke off, or a single-side `border-t`/`border-b` stopping mid-arc
on a rounded box.
*Fix:* radius and border on the SAME box — the stroke wraps the arc for free;
if an outer layer genuinely must clip, move the border up onto the clipping
layer too. If the lines are really dividers, keep them straight, edge to edge,
and don't round the fill.

**Corners that don't nest.** Outer box and inner box stamped with the same
big radius token, so the arcs are not concentric and the inner corner visibly
fights the outer one. Nested corners have math the model skips.
*Fix:* inner radius = outer radius minus the padding between them
(`rounded-2xl p-3` outside → ~`rounded-lg` inside), or don't round the inner
element at all.

### Security (AI-typical, not a full audit)

**`v-html` on unsanitized user/API data.** Bypasses Vue's auto-escape
entirely — hands the browser raw markup. Vue's `{{ }}` interpolation and
normal `:attr` bindings ARE safe (auto-escaped via `textContent`/
`setAttribute`); `v-html` is the one explicit opt-out, and AI code reaches
for it whenever a field is described as containing "rich text" or "HTML."
*Fix:* `v-html="DOMPurify.sanitize(x)"`, or don't render as HTML.
Confirmed real-world: CVE-2024-6783 (Vue 2 template-compiler XSS).

**Dynamic `:href`/`:src` bound to an unvalidated URL.** Vue's attribute
auto-escaping does not check URL schemes — `:href="userUrl"` lets
`javascript:...` through untouched.
*Fix:* protocol allowlist or server-side validation before the value
reaches the template.

**CSP loosened to `unsafe-inline` to unblock a component.** A component
breaking under a strict CSP gets "fixed" by widening the policy instead of
fixing the component — reopens exactly what CSP existed to close. Flag any
diff adding `unsafe-inline`/`unsafe-eval` to a CSP config as a regression,
not a fix.

**JWT stored in `localStorage` instead of memory + httpOnly cookie.** Any
XSS on the page can read `localStorage` directly and exfiltrate the token
— full account takeover, no CSRF needed. 2025-2026 consensus: access token
in memory (a store, not persisted), refresh token in an `HttpOnly` +
`Secure` + `SameSite` cookie.
[Descope: JWT storage guide](https://www.descope.com/blog/post/developer-guide-jwt-storage)

**`useAsyncData`/`useFetch` fetching user-scoped data on a cache-eligible
route (`swr`/`isr`/static `routeRules`) with no `private: true`.** Nuxt
bakes whatever the *first* request's auth context saw into the cached HTML
— every later visitor, including anonymous ones, gets that user's data
until the cache TTL expires. Confirmed as a real Nuxt footgun, fixed via
the `private` option (`nuxt/nuxt#30181`). *Fix:* `private: true` on any
`useAsyncData` call touching per-user data on a cached route.
[Nuxt issue #29064](https://github.com/nuxt/nuxt/issues/29064)

**Private `runtimeConfig` value passed into `useState()` or interpolated
into a template.** Only `runtimeConfig.public.*`/`app.*` are meant to reach
the client — `useState()` serializes into the SSR payload and ships
regardless of which `runtimeConfig` section the value came from. Also
watch `NUXT_PUBLIC_*` env-var naming: a missing `PUBLIC_` silently makes a
var server-only (breaks a feature); an accidentally-added one leaks a
secret.

**New npm dependency with a `postinstall`/`preinstall` script and no exact
version pin.** 2025-2026 supply-chain risk shifted from typosquatting to
maintainer-account takeover of legitimate popular packages (the
`chalk`/`debug` compromise, the Shai-Hulud self-propagating worm across
500+ packages). Review checklist for any new dependency: check for
install-time scripts, recent maintainer/ownership changes, and pin exact
versions for anything that has one.
[StepSecurity: Shai-Hulud npm supply-chain attack](https://www.stepsecurity.io/blog/shai-hulud-here-we-go-again-mass-npm-supply-chain-attack-hits-the-antv-ecosystem)

## FE — `a11y:` additions (functional, not contrast/color)

**Custom interactive widget with no keyboard path.** A `<div @click>` or
`<span @click>` standing in for a button/link with no `tabindex="0"`, no
`role`, no `@keydown.enter`/`.space` handler — unreachable and unusable by
keyboard. A 2025 peer-reviewed study of LLM-generated UIs found the
dominant expert-flagged issues shifted from visual (contrast) toward
exactly this — structural/interactive defects — as models improved on the
visual dimension.
[ACM W4A 2025: accessibility of LLM-generated interfaces](https://dl.acm.org/doi/10.1145/3744257.3744266)

**Modal/dropdown with no focus trap or Escape-to-close.** `reka-ui`
primitives (already mandated by `impulse-frontend/references/components.md`)
handle this correctly — this finding is specifically for any hand-rolled
overlay that bypasses the primitive.

**Async status/error text with no `aria-live` region.** Content injected
after a fetch completes with no live region — a screen reader user never
hears that anything happened.

## FE — `perf:` (Core Web Vitals, bundle, rendering)

2026 targets: LCP ≤2.5s, CLS <0.1, INP ≤200ms. INP is the one most sites
still fail (~43%) — it replaced FID in 2024.

**LCP element marked `loading="lazy"`.** One of the single most common
individual mistakes — the hero image/largest element should be eager +
preloaded, not deferred. Lazy-loading the thing LCP measures directly
delays LCP.

**No explicit `width`/`height` on an image.** Classic CLS cause — the
browser can't reserve layout space before the image loads, content jumps
when it arrives.
*Fix:* explicit dimensions, or `<NuxtPicture>` (which also negotiates
AVIF/WebP — plain `<NuxtImg>` ships only the original format unless
`format` is set per-image). Not a marginal format choice: AVIF runs
~50-70% smaller than JPEG at equivalent visual quality and ~20-37% smaller
than WebP; combined with correct `srcset`/responsive sizing the image
payload for a page commonly drops 60-70% versus serving one full-size
original. Browser support (~94-97% AVIF, ~96-98% WebP in 2026) is why the
serve order is AVIF → WebP → JPEG, not AVIF-only.
[dev.to: why AVIF became the default image format in 2026](https://dev.to/swapfileio/what-is-avif-why-it-became-the-default-image-format-in-2026-4kf9)

**Barrel import defeating tree-shaking.** `import { X } from 'lodash'` or
a UI-kit's index barrel pulls the whole package into the bundle.
*Fix:* deep imports (`lodash/isNull`), or a build-time plugin that
auto-transforms barrel imports.

**Whole icon collection installed instead of on-demand.** `@iconify/json`
wholesale inflates bundle and build time; per-collection
`@iconify-json/<set>` or `unplugin-icons` ships only the icons actually
used.

**Heavy component imported synchronously behind a `v-if`/modal.** A chart,
editor, or map component `import`ed at the top of a page but only rendered
conditionally still ships in the initial bundle.
*Fix:* `defineAsyncComponent`/`<LazyX>` for anything gated behind user
interaction.

**`v-if` on content toggled frequently (tab switch, filter chip, hover).**
`v-if` has a real create/destroy DOM cost; fine for rarely-toggled content
(a modal), expensive when it fires on every interaction.
*Fix:* `v-show` for high-frequency toggles.

**Deep watcher (`{ deep: true }`) on a large reactive object.** Walks the
entire object graph on every mutation.
*Fix:* watch a specific computed slice, or `watch(() => obj.field, ...)`.

**Third-party `<script>` with no `async`/`defer`.** Render-blocking by
default — any analytics/widget script added without an explicit loading
strategy delays first paint for code that isn't the page's actual content.

**Font-swap CLS + font bloat.** Every added family/weight is a network
fetch and a swap-jump. Budget: 2-3 families, 2-3 weights, WOFF2 only;
`size-adjust`/`ascent-override` on the fallback kills the swap layout
shift.

**Long task blocking INP.** A >50ms JS chunk on the interaction path eats
the 200ms INP budget. *Fix:* split with `scheduler.yield()` /
`scheduler.postTask()`, check `isInputPending()` in loops — not
`setTimeout(0)` chains.

**bfcache killed.** An `unload` handler or `Cache-Control: no-store` on
the HTML document disables back/forward cache — every back-nav becomes a
full reload. Remove `unload` (use `pagehide`), reserve `no-store` for
genuinely sensitive documents.

Sources: [Nuxt 4.x performance docs](https://nuxt.com/docs/4.x/guide/best-practices/performance) ·
[nuxt-vitalizer](https://github.com/johannschopplich/nuxt-vitalizer) ·
[Alokai Vue/Nuxt performance checklist](https://alokai.com/blog/vue-and-nuxt-performance-optimization-checklist)

## Sources

- [GitClear 2025: 211M-line, 5-year code-quality trend study](https://www.gitclear.com/ai_assistant_code_quality_2025_research)
- [Stanford/Codex security study — Copilot users wrote more insecure code, more confidently](https://techcrunch.com/2022/12/28/code-generating-ai-can-introduce-security-vulnerabilities-study-finds/)
- [Habr: 8-day Nuxt 3 SSR memory-leak hunt](https://habr.com/ru/articles/1040346/)
- [Bryce Andy: the hidden reason your Vue watchers leak memory](https://www.bryceandy.com/posts/the-hidden-reason-your-vue-watchers-leak-memory-and-how-to-avoid-it)
- [StackInsight empirical study, ~4000 unstored watch/watchEffect handles](https://stackinsight.dev/blog/memory-leak-empirical-study/)
- [ACM W4A 2025: accessibility of LLM-generated interfaces](https://dl.acm.org/doi/10.1145/3744257.3744266)
- [Nuxt 4.x performance docs](https://nuxt.com/docs/4.x/guide/best-practices/performance)
- [nuxt-vitalizer](https://github.com/johannschopplich/nuxt-vitalizer)
- [Alokai Vue/Nuxt performance checklist](https://alokai.com/blog/vue-and-nuxt-performance-optimization-checklist)
