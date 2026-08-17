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

## Nitro as the backend, not just the SSR server

Nuxt's own server layer (`server/api`, `server/routes`, Nitro tasks) can be
the whole backend instead of a thin SSR shell in front of a separate Go/Node
service — Nitro gives real routes, DB access, and auth (`Fullstack — стек`,
Sink: a URL shortener + analytics app shipped entirely as Nuxt+Nitro on
Cloudflare Workers with D1/KV, no separate API service).

Pick Nitro-as-backend only when all of these hold:
- the product is small with one release and no second API consumer on the
  roadmap (mobile app, partner integration, public API)
- no long-lived work: no background jobs, no queue worker, nothing that
  outlives a single request — an edge/serverless Nitro deployment has no
  long-running process to host them in
- the team is one, shipping one thing — the point is zero ops, not scale

Otherwise this is still the canon exception, not the default: keep Nuxt on
the frontend and the backend on Go (or the Node/Fastify variant in
`impulse-backend/references/deps.md`) behind its own API. The moment a
second consumer or a background job shows up, splitting a Nitro-backed app
into a real API service is more expensive than having built it separately
from day one.

Edge-deploy specifics if going this route (Cloudflare Workers preset):
- no persistent DB connection pool across invocations — pair with a pooling
  proxy (Hyperdrive, Neon's pooler, or a KV/D1-native store like Sink uses)
  rather than opening a fresh pool per cold start
- default CPU-time ceiling per request (Workers free/paid tiers) means
  anything CPU-heavy still doesn't belong in the request handler — the
  "queue and worker" rule from `Fullstack — стек` holds even harder here
  since there's no in-process worker to queue into; use Nitro's Cron
  Triggers integration or an external queue, not an in-request loop
- test against the real runtime, not Node-with-mocks: `@cloudflare/vitest-pool-workers` runs tests inside the actual Workers runtime

Sources: [Nuxt on the Edge](https://nuxt.com/blog/nuxt-on-the-edge) ·
[Nuxt Nitro: The Backend Layer Many Developers Underuse](https://www.nazarboyko.com/articles/nuxt-nitro-the-backend-layer-many-developers-underuse)

## Desktop shipping

Same codebase, packaged for desktop — split only what's physically
unavailable in a browser (filesystem, tray, global hotkeys).

1. **Tauri 2 by default.** Uses the OS's own webview, so the shipped app is
   megabytes, not the hundred-plus Electron adds; native layer is Rust
   (Kanri: Nuxt on Tauri).
2. **Electron only for a named reason:** identical rendering across OSes
   (own Chromium instead of the OS webview), heavy Node deps in the main
   process, or the mature auto-update ecosystem (Colanode, Ente Desktop —
   Ente also bridges a shared Rust core into it via `napi`).
3. Tokens/secrets go in the OS's protected credential store, never
   `localStorage` — the app runs on a machine you don't control.
4. Filesystem permissions are enumerated explicitly and minimally; a
   blanket "access everything" entry in the Tauri/Electron config is a
   blocking review finding.
5. Updates ship through the app itself and are signature-verified; an
   unsigned update is rejected, not installed.

### Tauri 2 capabilities/permissions (the v1→v2 behavior break)

v1's allowlist is gone. v2 is **default-deny per window**: every plugin
command — including core APIs like `window.setTitle` — is unreachable from
the frontend until a capability file explicitly grants it. A missing grant
fails silently as a runtime IPC error, not a build error.

1. Capability files live in `src-tauri/capabilities/*.json`, each with an
   `identifier`, a `windows` array (`["main"]`, or `["*"]` for all), and a
   `permissions` array (e.g. `"core:window:allow-set-title"`,
   `"fs:default"`). List only the capability files you actually want in
   `tauri.conf.json` → `app.security.capabilities` — file presence in the
   directory alone doesn't enable it.
2. Scope grants per window, not app-wide: a settings/about window doesn't
   need the same filesystem or shell access as `main` — give it its own
   capability file rather than widening `["*"]`.
3. Every third-party plugin ships its own permission set (`plugin:default`,
   `plugin:allow-<command>`) — check the plugin's docs for exactly which
   permission unlocks which command; granting `plugin:default` is often
   broader than the one command you need.

### IPC and shared state

1. Rust side: `#[tauri::command]` functions, registered via
   `tauri::generate_handler![...]` in the builder. Frontend side: `invoke()`
   from `@tauri-apps/api/core`, args as a JSON object with camelCase keys —
   there's no compile-time type link between the two, so a renamed Rust
   param silently breaks the frontend call until runtime.
2. Shared app state (DB handle, config, cache) goes through
   `tauri::Builder::manage(SomeState {})` once at startup; commands pull it
   via a `tauri::State<SomeState>` parameter — this is the idiomatic
   alternative to globals/lazy-statics for anything a command needs across
   calls.

### Sidecar pattern (bundling an external executable)

1. List the binary under `bundle.externalBin` in `tauri.conf.json`. Each
   platform variant needs the `-$TARGET_TRIPLE` suffix (find yours with
   `rustc --print host-tuple`) — Tauri strips the suffix and picks the
   right binary for the running OS at build time.
2. Spawn it from Rust with `tauri_plugin_shell::ShellExt` —
   `app.shell().sidecar("my-sidecar")` — filename only, no path.
3. Requires `"shell:allow-execute"` in the capability file with
   `"sidecar": true` on that binary's entry — same default-deny rule as
   everything else in v2.

### Updater signing

`tauri signer generate -w ~/.tauri/myapp.key` produces a keypair: the
pubkey goes in `tauri.conf.json` → `plugins.updater.pubkey` (safe to
commit); the private key signs releases via the `TAURI_PRIVATE_KEY` /
`TAURI_KEY_PASSWORD` env vars at build time and must never be committed —
losing it means the existing install base can no longer receive updates.

**Claude Code skill coverage:** [dchuk/claude-code-tauri-skills](https://github.com/dchuk/claude-code-tauri-skills)
is a 39-skill collection specifically for Tauri v2 (setup, security,
development, distribution) — check it before writing bespoke Tauri
guidance from scratch.

Sources: [Nuxt rendering modes v4](https://nuxt.com/docs/4.x/guide/concepts/rendering) ·
[Cache-Control in Nuxt routeRules](https://dev.to/jacobandrewsky/using-cache-control-in-nuxt-to-improve-performance-565o) ·
[Vite PWA prompt-for-update](https://vite-pwa-org.netlify.app/guide/prompt-for-update) ·
[Workbox cached-broken-build footgun](https://github.com/GoogleChrome/workbox/issues/1528) ·
[Tauri 2 capabilities](https://v2.tauri.app/security/capabilities/) ·
[Tauri 2 permissions](https://v2.tauri.app/security/permissions/) ·
[Tauri 2 calling Rust (IPC/state)](https://v2.tauri.app/develop/calling-rust/) ·
[Tauri 2 sidecar](https://v2.tauri.app/develop/sidecar/) ·
[Tauri 2 updater plugin](https://v2.tauri.app/plugin/updater/) ·
[dchuk/claude-code-tauri-skills](https://github.com/dchuk/claude-code-tauri-skills)
