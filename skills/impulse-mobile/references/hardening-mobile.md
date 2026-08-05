# Hardening — mobile AI-typical bugs

The mobile counterpart to `impulse-review/references/ai-bug-patterns-be.md` —
patterns AI-generated mobile code produces systematically. Each is a review
catch: signal → fix.

1. **Undisposed subscription/controller (Flutter).** Created in `initState`
   with no matching `dispose()` — the #1 Flutter leak. Full detail:
   `flutter.md` §6.
2. **Missing `removeObserver` on `WidgetsBindingObserver`** — leaks the whole
   State object. Full detail: `flutter.md` §6.
3. **BuildContext used after an `await` with no `mounted` check** — crashes
   or acts on a disposed widget. Full detail: `flutter.md` §3.
4. **FlatList with index-as-key / no `getItemLayout` / unmemoized
   `renderItem` (RN)** — re-render storms and state-bleed between rows.
   Full detail: `react-native.md` §2.
5. **Native-module/AppState/Keyboard listener never unsubscribed (RN)** —
   permanent leak. Full detail: `react-native.md` §5.
6. **CPU-bound work on the main isolate / JS thread** — UI jank/ANR. *Fix:*
   `Isolate.run()`/`compute()` (Flutter), a native module or Interaction
   Manager deferral (RN).
7. **App background/foreground ignored** — timers/streams keep running in
   background (battery drain), or stale data on resume. *Fix:* pause on
   background, refresh/resubscribe on resume via the lifecycle observer.
8. **Secret/API key in the bundle** — publicly extractable
   (`cross-cutting.md` §1). *Fix:* proxy through your backend.
9. **Keychain item saved with the default accessibility class
   (`kSecAttrAccessibleWhenUnlocked`)** when the read happens from a
   background context — widget, push-notification extension, background
   fetch. *Signal:* `errSecInteractionNotAllowed` (`-25308`) at runtime, or
   silent no-op reads. *Fix:* pick the accessibility constant by *when the
   reader runs*, not by default — `AfterFirstUnlock` for background-eligible
   reads. Also: `kSecAttrAccessible` and `kSecAttrAccessControl` are
   mutually exclusive on one query — setting both is `errSecParam` (`-50`).
10. **`LAContext.evaluatePolicy()` used as the security gate itself**
    (`if success { unlock() }`) instead of binding the protected secret to
    `SecAccessControl` + Secure Enclave. *Why it matters:* the boolean
    callback is just user-space state with no cryptographic binding —
    trivially bypassed via a Frida/objection one-liner
    (`ios ui biometrics_bypass`), and OWASP MASTG explicitly fails this
    pattern. `evaluatePolicy` alone is fine ONLY for non-security UI
    decisions (show/hide a button) — never as the last line of defense on
    an actual secret. Also: keychain items **survive app deletion** — wipe
    on first-launch-after-install (a `UserDefaults` sentinel flag) or a
    reinstall/resold-device inherits stale credentials.
    (Keychain/biometric patterns distilled from ivan-magda/swift-security-skill,
    harvested GitHub skill.)
11. **SwiftUI stale UI after a write** — a view reads a value that was
    mutated through a different owner than the one the view observes (two
    state owners for the same fact). *Fix:* single source of truth per
    piece of state; if two views need it, lift it, don't duplicate it.
12. **`.onAppear` used to (re)fetch, causing a reload loop** on tab-switch /
    NavigationStack pop-back, because `.onAppear` fires on every
    re-appearance, not just first mount. *Fix:* gate with a has-loaded flag
    or move the fetch to `.task` keyed on a stable identity.
13. **Async result overwrites newer state** — two in-flight requests for the
    same resource (e.g. rapid search-as-you-type) resolve out of order and
    the stale one wins because nothing checks which is newer. *Fix:* a
    request-generation counter/id checked before applying the result, or
    cancel the superseded task.
14. **Silent fallback on a failed/empty read** (`try? fetch() ?? []`) —
    collapses "empty," "not found," "denied," and "failed" into the same
    UI state, so a real error renders as an empty list instead of an error
    view. *Fix:* the repository layer must distinguish these cases; never
    swallow the failure into a default value. Same discipline as
    `impulse-backend`'s no-silent-fallback rule, mobile-flavored.
    (Items 11-14 distilled from moretea-labs/ios-engineering-skill,
    harvested GitHub skill.)
15. **`GlobalScope.launch { }` in Kotlin/Compose code** — outlives every
    lifecycle, leaks like the Flutter/RN patterns above. *Fix:*
    `viewModelScope`/`lifecycleScope`/`rememberCoroutineScope()` per
    `native.md` §3.
16. **`mutableStateOf` used as ViewModel-held state** instead of
    `StateFlow` — couples the ViewModel to the Compose runtime and loses
    the value across process death. *Fix:* `StateFlow` in the ViewModel,
    `collectAsStateWithLifecycle()` in the composable.
17. **Compose `LazyColumn`/`LazyRow` items with no `key`** — position-based
    identity, breaks on reorder/removal (same failure class as RN's
    index-as-key). *Fix:* `items(list, key = { it.id })`.
18. **`Modifier.clickable` ordered before `.clip()`/`.padding()`** — modifier
    order IS execution order in Compose; a clickable applied before the
    clip extends the hit target beyond the visible shape (or a padding
    applied after clip clips the padding away too). *Fix:* the
    conventional order is size → clip → background → clickable → padding
    → content, adjusted per case, but always reason about it as a literal
    top-to-bottom pipeline, not a bag of unordered flags.
19. **Nav-graph argument passed as a whole object** instead of an id/key —
    Navigation Compose args must survive process death; a non-primitive
    argument that isn't `Parcelable`-safe crashes on restore. *Fix:* pass
    `id: String`, re-fetch the object from the ViewModel/repository on the
    destination screen.
20. **`fallbackToDestructiveMigration()` left in a production Room build** —
    wipes the local DB on any unhandled schema change instead of erroring
    loudly. *Fix:* an explicit `Migration` per version bump; destructive
    fallback is a dev-only escape hatch, never ships.
    (Items 15-20 distilled from aldefy/compose-skill and
    haidrrrry/compose-kotlin-agent-skills' `00-banned-antipatterns.md`,
    harvested GitHub skills — cross-check any of these directly against
    that file's WRONG/RIGHT table when reviewing Kotlin/Compose diffs.)

These are `/impulse-review`-style findings for mobile diffs — one line each,
signal + fix.

## App Store rejection, ASO, attribution

Full detail moved to `references/app-store.md` — rejection top causes, App
Store Connect API gotchas, guideline-drift-detection technique, ASO
screenshot-indexing, ATT/SKAdNetwork/AdAttributionKit attribution. Load that
file before any submission-prep or store-metadata work.
