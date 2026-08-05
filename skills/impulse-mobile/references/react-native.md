# React Native

1. **Architecture decision:** the New Architecture (Fabric/TurboModules/JSI)
   is mandatory as of RN 0.82 (legacy frozen mid-2025, no toggle). Expo
   managed workflow is the 2026 default — go bare only for a specific native
   integration Expo's plugin system can't cover. Measured deltas over the
   legacy bridge, not just an architectural preference: complex-list
   rendering ~43% faster, scroll frame drops down ~95%, memory ~33% lower,
   JS-to-native call latency 30-50% faster (JSI's direct memory access
   replaces the old serialize-over-the-bridge round trip).
2. **FlatList perf (the classic RN killer):** stable `keyExtractor` (never
   array index if data reorders — same class as the web `:key="index"` bug),
   `getItemLayout` when item height is fixed (skips per-item measurement —
   consistently the single highest-impact FlatList fix on its own),
   memoize `renderItem` (module-level or `useCallback`) to stop re-render
   storms. For a list that's still janky after all three: FlashList (Fabric-
   native) or the newer LegendList are drop-in-ish replacements built
   specifically to eliminate the blank-cell-flash FlatList still shows
   under fast scroll — reach for one before hand-rolling virtualization.
3. **Navigation:** Expo Router (file-based, auto deep-linking) is the default
   for new Expo projects; React Navigation for bare RN or bespoke
   transitions. Expo Router is built on React Navigation, not a replacement
   for its concepts.
4. **State:** same landscape as web — Context for small apps, Zustand as the
   sweet-spot default (tiny, selector-based, no boilerplate), Redux only for
   genuinely complex state.
5. **Bridge/listener leak:** passing a JS closure/listener to a native
   module can pin the whole component scope in memory if native never
   releases it; AppState/Keyboard listeners without a `useEffect` cleanup
   leak permanently — always return the unsubscribe fn from the effect.
6. **Effects are an escape hatch for external systems** (subscriptions,
   native listeners, timers) — not a place to derive state from
   props/state (do that inline during render) or to react to a user action
   (do that in the handler). An effect that sets state to trigger another
   effect is a chain to collapse into one handler/render pass (React core
   docs).

7. **`expo-secure-store` default accessibility, and its auth-gate
   platform asymmetry.** Same footgun class as native.md's raw-Keychain
   section: the default accessibility level survives-only-when-unlocked,
   which breaks background reads if you don't set it deliberately.
   `requireAuthentication: true` behaves differently per platform — Android
   requires biometric/passcode auth for every operation (read AND write),
   iOS requires it only for reading or updating an *existing* value, not
   for creating a new one. It also silently breaks if the same
   `keychainService` was previously used for non-authenticated writes —
   requiring auth needs its own dedicated `keychainService`, not a retrofit
   onto an existing one.
8. **`expo-crypto`'s AES-GCM API takes base64-encoded strings, not raw
   bytes** — plaintext, IV, tag, and AAD all must be base64-encoded before
   the call. Passing raw UTF-8 doesn't error, it silently produces garbage
   ciphertext — a dangerous silent-failure shape, not a crash you'd catch
   in testing.
9. **OAuth: authorization-code+PKCE only** — `ResponseType.Token` (implicit
   flow) is legacy and carries an access-token-injection risk.
   `CodeChallengeMethod.Plain` throws at construction; S256 is the only
   supported method. Expo Go specifically **cannot complete an OAuth
   redirect** (its scheme is fixed) — this needs a dev build, not just "try
   it in Expo Go first."
10. **Expo Router's `Stack.Protected`/route-guard pattern is client-side
    only** — it is not a substitute for server-side auth. A user who knows
    the URL can still fetch the underlying HTML/JS during a static export
    regardless of the guard; the guard controls navigation UX, not access.
    (Items 7-10 distilled from mahdi-salmanzade/expo56-skill, harvested
    GitHub skill.)

Sources: [React Native docs (MIT)](https://reactnative.dev) ·
[Expo docs (MIT)](https://docs.expo.dev) ·
[pmndrs/zustand (MIT)](https://github.com/pmndrs/zustand) ·
[ImpactTechLab: New Architecture JSI/Fabric/TurboModules performance data](https://impacttechlab.com/react-native-new-architecture-app-performance/) ·
[Medium: FlashList vs FlatList 2026](https://medium.com/@KaushalVasava/flashlist-vs-flatlist-in-react-native-a-2026-deep-dive-into-performance-architecture-and-fa4266f92ea9)
