# Native — SwiftUI / Kotlin

1. **When native beats cross-platform (the decision rule):** pixel-perfect
   OS-level fidelity, a tiny binary/system-utility constraint, or deep
   OEM/hardware API access a cross-platform bridge can't reach cleanly.
   Otherwise cross-platform wins on two-team-cost grounds. From an existing
   Flutter/RN app, drop to native for the ONE feature that needs it via a
   platform channel/native module — never a full native rewrite.
2. **SwiftUI state:** iOS 17+ `@Observable` macro replaces
   `@Published`/`@ObservedObject` boilerplate — model uses `@Observable`, the
   owning view holds it via `@State` (yes, reference types now), passed-down
   views use `@Bindable`. Pre-iOS17 rule still matters for older targets:
   whoever creates the object owns it via `@StateObject`; children get
   `@ObservedObject`.
3. **Kotlin/Compose:** `viewModelScope` auto-cancels on ViewModel clear —
   put async work there, never `GlobalScope`. `LaunchedEffect`/
   `rememberCoroutineScope` for composable-scoped effects (auto-cancelled on
   leaving composition). Expose immutable `StateFlow` from the ViewModel,
   mutate only inside it.
3a. **Compose architecture, one line each:** state flows down as a sealed
   `UiState` interface (`Loading`/`Success`/`Error` — exhaustive `when`, not
   `Result<T>`), events flow up as `(Intent) -> Unit`; stateful "Route"
   composable owns `hiltViewModel()` at the screen root, stateless "Screen"
   composable takes state as a parameter (previews/tests cleanly, never
   drill the ViewModel down through children); type-safe Navigation Compose
   via `@Serializable` route data classes, args read with
   `savedState.toRoute<T>()` — no string routes. `LaunchedEffect(true)`/
   `LaunchedEffect(Unit)` as a catch-all re-runs only on first composition
   and silently ignores a changed key — key on the actual dependency.
   Material 2 imports (`androidx.compose.material.*`) alongside Material 3
   in the same project is the same class of mistake as mixing UIKit and
   SwiftUI. (Distilled from roninforge/roninforge-kotlin-compose, MIT,
   harvested GitHub skill.)
3b. **Compose stability — the recomposition-skip gate.** A composable only
    skips recomposition when EVERY parameter is stable. Plain `List`/`Map`/
    `Set` are unstable by default (mutable-backed) — either wrap in
    `kotlinx.collections.immutable.ImmutableList` or hide the list inside an
    `@Immutable`-annotated wrapper data class. `@Immutable` = never changes
    after construction (compiler skips freely); `@Stable` = mutable but
    always notifies Compose on change (for observable-state holder classes,
    not plain data). An unannotated data class used as a composable
    parameter is assumed unstable and defeats skipping silently — no error,
    just wasted recompositions. Verify with Compose compiler reports
    (`composeCompiler { reportsDestination = ... }`), not vibes — the
    generated `*_classes.txt`/`*_composables.txt` show exactly which types
    and which composables lost `skippable`.
3c. **`derivedStateOf` must be wrapped in `remember`** — bare
    `derivedStateOf { ... }` recreates the derived-state object every
    recomposition, defeating its own purpose. Reach for it only when the
    *derived* value changes less often than the *source* state (e.g.
    `listState.firstVisibleItemIndex > 5` flipping a boolean) — for cheap
    derivations (string concat, a single comparison) it's pure overhead.
3d. **Defer state reads to the layout/draw phase, not composition.**
    `Modifier.offset(x.dp, y.dp)` reads `x`/`y` during composition and
    recomposes the whole scope on every change; `Modifier.offset { IntOffset(x, y) }`
    (lambda form) reads inside the layout phase — only that layout pass
    reruns. Same shape applies to any per-frame-changing value fed into a
    Modifier (alpha, scale, rotation) — prefer the lambda-based
    `graphicsLayer { }` over parameter-based equivalents for animated
    values.
3e. **Lazy-list keys are non-optional, and `contentType` matters for mixed
    lists.** `items(list, key = { it.id })` — a missing key falls back to
    position-based identity, which corrupts item state/animations on
    reorder or removal (the mobile-list twin of the web's `:key="index"`
    bug). For a list mixing item shapes (header/row/ad), also pass
    `contentType` — without it every item shape competes for one
    composition-reuse pool, undermining the key optimization itself.
3f. **StateFlow / SharedFlow / Channel are not interchangeable — pick by
    delivery semantics, not habit.** `StateFlow`: always has a current
    value, conflates rapid updates, replays latest to new collectors — UI
    state only. `SharedFlow` (`replay=0`): no current value, every active
    subscriber gets every emission — broadcast/analytics events, never UI
    state (a `SharedFlow` configured with `replay=1` for UI state is just a
    worse `StateFlow`). `Channel`: delivered to exactly ONE collector,
    never silently dropped — one-shot commands (navigate, show-snackbar,
    haptic). Using the wrong one is a category error that manifests as
    "the event fired twice" or "the event never fired," not a compile
    error.
3g. **`stateIn(scope, SharingStarted.WhileSubscribed(5_000), initial)`** —
    the standard pattern for converting a cold Flow (a Room query, a
    repository stream) into a hot `StateFlow` shared across all
    collectors, so the underlying query runs once, not once per collector.
    The 5000ms grace window specifically survives a configuration-change
    rotation (~2-3s) without tearing down and restarting the upstream
    query — not an arbitrary number, don't shorten it without a reason.
3h. **`runCatching`/bare `catch (e: Throwable)` swallows
    `CancellationException`** — this silently breaks structured
    concurrency (a cancelled coroutine that "succeeds" instead of
    propagating cancellation). Any catch-all around suspending code must
    rethrow `CancellationException` before doing anything else with the
    caught exception. Related: `Dispatchers.IO`/`withContext` wrapped
    around a call the library already dispatches internally (Room,
    Retrofit-suspend, Ktor) is a redundant thread hop, not a correctness
    bug, but it's a reliable tell that the author didn't check what the
    library already does.
3j. **Wrapping a theme root in `Surface` just to propagate content color is
    a footgun** — `Surface` also silently adds a background layer, not just
    the `LocalContentColor` you wanted. Use
    `CompositionLocalProvider(LocalContentColor provides ...)` directly when
    color propagation is the only goal. Applies equally to plain Jetpack
    Compose and Compose Multiplatform. (Distilled from
    DumbGreenFish/greenfish-cpm-skill, harvested GitHub skill.)
    (3b-3h, 3j distilled from aldefy/compose-skill, anhvt52/jetpack-compose-skills,
    haidrrrry/compose-kotlin-agent-skills, DumbGreenFish/greenfish-cpm-skill
    — harvested GitHub skills.)
4. **SwiftUI layout — avoid the AI-default tells:** `GeometryReader`/
   `UIScreen.main.bounds` for sizing (use `containerRelativeFrame` instead —
   respects safe areas/multitasking, `GeometryReader` doesn't); `.cornerRadius()`
   (deprecated shape-clipping path — use `clipShape(RoundedRectangle(...))`);
   a hand-rolled empty-state view (iOS 17+ has `ContentUnavailableView`); a
   custom modal sheet (`.presentationDetents` + `.presentationDragIndicator`
   cover the standard cases already). Same "AI reaches for the wrong-but-
   working default" shape as `impulse-frontend/references/ai-tells.md`,
   SwiftUI-flavored. (Distilled from Wholiver/swiftui-design-skill, MIT,
   harvested GitHub skill.)
5. **Keychain/Secure Enclave — accessibility class is a when-can-this-run
   question, not a default to accept:** `kSecAttrAccessible*` constants rank
   by lock-state (survives-lock, migrates-in-backup, background-readable).
   Getting this wrong is the #1 AI-generated keychain bug — full pattern +
   the biometric-gate-bypass trap: `hardening-mobile.md` §9-10. Secure
   Enclave hard constraints an AI model routinely gets wrong: P-256 only (no
   P-384/Curve25519/RSA), no symmetric ops, no key export/import,
   device-bound (never survives an iCloud restore), and
   `SecureEnclave.isAvailable` can return `true` **on Simulator** when the
   host Mac has a T2/M-series chip — gate with `#if targetEnvironment(simulator)`
   too, availability alone isn't a reliable simulator check.

Note: Apple's SwiftUI/HIG docs are proprietary — used for orientation only,
not extracted. Kotlin/Compose guidance leans on Android Developers docs
(Apache-2.0) and MIT-licensed cursor-rule collections.

Sources: [Android Developers (Apache-2.0)](https://developer.android.com) ·
[PatrickJS/awesome-cursorrules (CC0)](https://github.com/PatrickJS/awesome-cursorrules) ·
ivan-magda/swift-security-skill, Wholiver/swiftui-design-skill — harvested
GitHub skills, distilled and re-expressed, no verbatim text copied.
