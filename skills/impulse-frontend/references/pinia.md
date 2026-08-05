# Pinia — store patterns

Setup-store default (`defineStore('x', () => {...})`) — full Composition API
flexibility, can call composables/watchers. Options-store only when porting
Vuex or a team wants the terse state/getters/actions shape.

1. **Every piece of state MUST be returned from a setup store's function.**
   An omitted ref is invisible to Pinia — breaks SSR serialization,
   devtools, plugins. Looks fine until a refresh/hydration.
2. **Store-vs-local-ref test:** promote to a store only if state is (a)
   needed by 2+ unrelated component subtrees with no shared ancestor, or (b)
   must survive route navigation. Otherwise it's a local `ref`/composable —
   a store per component is a smell (`impulse-review`).
3. **Composition:** a store calls `useOtherStore()` at the top of its setup,
   in a getter, or in an action. Two stores reading each other's *state*
   directly in both setup bodies = circular-init deadlock — read the other's
   state from a getter/action, never the top-level setup body of both sides.
4. **THE Nuxt SSR footgun:** a module-level `reactive()`/`ref()` declared
   outside any composable (a plain `state.ts` singleton, `export const cart =
   reactive({...})`) is ONE JS object shared by every request the Node
   process serves — user A's cart bleeds into user B's response. Pinia is
   SSR-safe precisely because it does NOT do this: each request gets its own
   store instance via `useNuxtApp()`-scoped injection, so `useXStore()`
   called inside `setup()` is safe. `useState()` is Nuxt's version for
   ad-hoc state. Any `reactive`/`ref` at module scope (not inside a
   composable/store/component setup) IS the leak — move it into `useState()`
   or a store. Same request-shared-state class as `ai-bug-patterns-fe.md`'s
   `useAsyncData` `private:true` leak.

Sources: [Pinia + Nuxt SSR](https://pinia.vuejs.org/ssr/nuxt.html) ·
[Pinia composing stores](https://pinia.vuejs.org/cookbook/composing-stores.html) ·
[Pinia SSR state-leak #2443](https://github.com/vuejs/pinia/issues/2443) ·
[Nuxt state management](https://nuxt.com/docs/4.x/getting-started/state-management)
