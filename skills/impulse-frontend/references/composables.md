# Composables & data fetching

Composable design and the data-fetching decision live together — useFetch/
useAsyncData are themselves composables and share the lifecycle-sync rule.

## Composable design

1. Extract when logic is reused ≥2 places OR isolating it materially
   improves a component's readability (3+ lines of setup ceremony). Don't
   extract one-off template logic — premature abstraction.
2. **Return contract:** return an object of individual `ref`s, not a
   `reactive()` object — callers destructure without losing reactivity
   (`ai-bug-patterns-fe.md`'s destructured-reactive bug is the failure this
   avoids). Wrapping a reactive object → `toRefs()` before returning.
3. **Lifecycle-safety:** `onMounted`/`watch`/etc. must be invoked from a
   *synchronous* call stack rooted in `setup()`. A composable calling
   `onMounted` inside an `async` function, `.then()`, or a later callback
   has no active instance to attach to — silent no-op, not an error (same
   root cause as the watcher-leak bug).
4. Composables calling composables is idiomatic (VueUse is built this way)
   as long as the sync-call rule holds at every level.
5. **VueUse-first:** before hand-rolling `addEventListener`/`ResizeObserver`/
   `localStorage`/debounce/clipboard, check VueUse — hand-rolled versions
   routinely miss the cleanup pairing (`ai-bug-patterns-fe.md`).
6. **Fake-store trap:** a composable returning a `ref`/object created once at
   *module scope* (not inside the composable function) is a shared
   singleton wearing a composable's clothes — every caller reads/writes the
   same instance, with none of Pinia's devtools or SSR safety. State shared
   across unrelated components is a store, not a composable (Hoffmann).

## Data-fetching decision

| Need | Use |
|---|---|
| Single GET, SSR + no double-fetch on hydration | `useFetch` |
| Multiple endpoints in parallel, a 3rd-party SDK call, or reshaping before it hits the component | `useAsyncData` |
| Client-only, event-driven (submit, click, search-as-you-type) | raw `$fetch` |

1. Always pass an explicit `key` — the auto file+line key breaks when the
   composable runs in a loop or dynamically.
2. `pick`/`transform` to shrink the SSR payload (both still fetch the full
   response server-side; they trim what's serialized to the client).
3. `lazy: true` + own pending guard for non-blocking navigation;
   `server: false` for client-only widgets.
4. `dedupe: 'cancel'` covers the AbortController stale-response race
   (`ai-bug-patterns-fe.md`). Wire `status` into the 4-branch
   pending/error/empty/data chain from `components.md` §3 — same pattern,
   nothing new to relearn.

Sources: [Vue composables (sync-call rule)](https://vuejs.org/guide/reusability/composables) ·
[Nuxt useAsyncData](https://nuxt.com/docs/4.x/api/composables/use-async-data) ·
[VueUse composables style guide](https://alexop.dev/posts/vueuse_composables_style_guide/)
