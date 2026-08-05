# Rendering modes & PWA

Build-time infra decisions with a runtime footgun each. Nuxt 4 routeRules +
@vite-pwa/nuxt. Cache-strategy thinking (CDN cache-control vs SW cache) is
one mental model, so both live here.

## Rendering modes / routeRules

| Mode | `routeRules` | When |
|---|---|---|
| SSR (default) | none / `ssr: true` | Personalized or frequently-changing content that still needs SEO |
| SSG / prerender | `{ prerender: true }` | Content fixed at build (marketing, docs) — fastest, CDN-cacheable indefinitely |
| SWR | `{ swr: <seconds> }` | Semi-dynamic public content (catalog, blog list): serve stale, revalidate in background |
| ISR | `{ isr: <seconds> }` | Same as SWR but pushes to platform CDN (Vercel/Netlify) — pick over SWR when deploying there |
| SPA | `{ ssr: false }` | Auth-gated dashboards/admin, zero SEO need — ship a `spa-loading-template.html` |

1. `nuxt generate` (full static) disables hybrid rendering — routeRules
   `ssr`/`swr`/`isr`/redirects/headers only work under `nuxt build` with a
   server/edge runtime.
2. Public cacheable routes set `cache-control: public, s-maxage=…,
   stale-while-revalidate=…` explicitly in `routeRules.headers` — don't
   assume the platform default is right per route.
3. **The cache-leak rule (build-side counterpart to `ai-bug-patterns-fe.md`'s
   `private:true` bug):** default a new route to NO caching; opt a route
   *into* `swr`/`isr`/prerender deliberately. Never let a per-user-data
   route inherit `swr`/`isr`/public cache-control from a wildcard rule —
   that serves one user's data to the next.

## PWA / offline

1. Cache strategy by asset type: hashed build assets (`_nuxt/*`) →
   `CacheFirst` (immutable); API/data → `NetworkFirst` or
   `StaleWhileRevalidate`; navigation/HTML → `NetworkFirst` +
   `navigateFallback`. **CacheFirst on HTML/API = users see stale data
   forever with no error signal.**
2. `registerType: 'prompt'` + explicit update UI (toast calling
   `updateServiceWorker()`) over `'autoUpdate'` for anything with client
   state — silent `skipWaiting` reload mid-interaction loses form state.
3. `Cache-Control: no-cache` on `/sw.js` itself (most hosts need the header
   override). **If the browser caches `sw.js`, new deploys never register —
   users stuck on the old build forever with no recovery path.**
4. Ship a kill-switch SW variant (unregister + `caches.delete` all) as a
   tested rollback before the first prod PWA release — a broken precache
   manifest otherwise bricks the app for all installed users with no remote
   fix.
5. IndexedDB for structured offline data (forms, queued mutations); Cache
   API only for network responses — don't conflate them.
6. Dedicated precached `offline.html` for navigation fallback, or users get
   the browser's native "no internet" page instead of an app-branded state.

Sources: [Nuxt rendering modes v4](https://nuxt.com/docs/4.x/guide/concepts/rendering) ·
[Cache-Control in Nuxt routeRules](https://dev.to/jacobandrewsky/using-cache-control-in-nuxt-to-improve-performance-565o) ·
[Vite PWA prompt-for-update](https://vite-pwa-org.netlify.app/guide/prompt-for-update) ·
[Workbox cached-broken-build footgun](https://github.com/GoogleChrome/workbox/issues/1528)
