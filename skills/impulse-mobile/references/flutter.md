# Flutter

1. **State-mgmt decision (one line, not a tutorial):** Riverpod = safe
   default (async-first, testable, no BuildContext dependency). Bloc when a
   team needs strict event/state discipline at scale — Bloc adds
   states+events+an `EventHandler`, Cubit skips all three (Bloc docs).
   Provider = legacy/tiny apps only.
2. **Rebuild perf:** `const` constructors let Flutter skip a rebuild entirely
   (identity short-circuits the tree walk) — use them everywhere they apply.
   Split god-widgets into small pieces so rebuild scope stays local. Keys
   only for list-item identity/state preservation; `GlobalKey` is a last
   resort (bypasses parent-child, slow).
3. **The BuildContext-after-async-gap bug** (linter-enforced,
   `use_build_context_synchronously`): always check `context.mounted` (or
   `State.mounted`) immediately after every `await` before touching
   context/Navigator. The linter has a known false-positive inside
   if-statements — verify manually, don't over-trust the lint.
4. **Navigation:** `auto_route` is the default — codegen produces typed route
   arguments, so a wrong/missing param is a compile error instead of a
   runtime crash from unpacking a string map. `go_router` (Flutter-team-
   blessed, Navigator 2.0) is still an acceptable choice for simple
   navigation with no typed args, but it's no longer the default for new
   projects. Cap nested-shell depth at 2; centralize route names;
   `go_router_builder` closes the type-safety gap if you do pick go_router.
   Concrete pattern: annotate pages `@RoutePage()`, the router class
   `@AutoRouterConfig()`, run `dart run build_runner watch`/`build` to emit
   typed `PageRouteInfo` classes (`router.push(const BookListRoute())`, no
   string paths). Nested/tab routes declare children inline
   (`AutoRoute(path: '/dashboard', page: DashboardRoute.page, children: [...])`)
   under a parent whose widget extends `AutoRouter` as the outlet. Auth
   guards: `class AuthGuard extends AutoRouteGuard` implementing
   `onNavigation(resolver, router)` — `resolver.next(true)` to continue,
   `resolver.redirectUntil(LoginRoute())` to bounce; attach per-route via
   `AutoRoute(page: ProfileRoute.page, guards: [AuthGuard()])` or globally on
   the router. Deep links: `deepLinkBuilder` validates/rewrites the incoming
   link before matching, `deepLinkTransformer` strips prefixes; path/query
   params bind via `@PathParam()`/`@QueryParam()` on the route constructor.
   (Milad-Akarie/auto_route_library docs.)
5. **Platform channels:** prefer **pigeon** — it generates the Dart/Swift/
   Kotlin interface from one schema, so the channel is a typed, versioned
   contract instead of a hand-parsed `Map<String, dynamic>`. Falling back to
   raw channels: MethodChannel = request/response one-offs, EventChannel =
   streams, reverse-domain channel names, explicit success/failure payload
   shape. Workflow: define the contract once in `pigeons/*.dart` with
   `@HostApi()`/`@FlutterApi()`-annotated abstract classes, run
   `dart run pigeon --input pigeons/messages.dart` to emit a Dart client plus
   a Swift protocol and Kotlin interface the native side must implement (a
   missing method is a native compile error, not a runtime channel-name
   typo). The pigeon schema file is the only source of truth — never
   hand-edit generated output; gate it in CI with a `pigeon-check` job that
   regenerates and fails the build on any diff, and pin both sides to the
   same pigeon version (a version mismatch across platforms is undefined
   behavior). Don't export generated types past your app's boundary — wrap
   them in a hand-written facade mapping to domain models, so a schema
   change doesn't ripple into every call site. (Very Good Ventures: Flutter
   Pigeon in production.)
6. **Lifecycle/memory — the #1 Flutter leak:** every `StreamSubscription`/
   controller opened in `initState` must be cancelled in `dispose()`; a
   `WidgetsBindingObserver` must `removeObserver` in `dispose()`.
   Non-negotiable.
7. **Blocking the UI:** single main isolate — CPU-bound work jank's the UI.
   I/O-bound → `async`/`await` is enough; CPU-bound one-off → `Isolate.run()`/
   `compute()`; persistent stream → `Isolate.spawn`. The actual budget, not
   a vibe: ~16.67ms per frame at 60Hz, ~8.33ms at 120Hz — the main isolate
   or raster thread blocked past that window is jank, by definition, not
   just "feels slow."
8. God-widget anti-pattern: compose small reusable widgets, not one giant
   `build()`.
9. **Domain models must not import Flutter SDK or external packages**
   (codegen annotations like `freezed`/`json_serializable` excepted) — a
   lint-checkable boundary between `lib/domain` (pure Dart) and `lib/data`
   (services injected into repositories, never called directly by
   ViewModels/controllers). Catches the domain layer silently absorbing a
   framework dependency it shouldn't have.
10. **Layer scaffolding is overkill below a certain size.** Data/domain/
   presentation package splits earn their keep on a multi-feature app with a
   team behind it — even Very Good Ventures, the pattern's own authors, call
   full layering "a bit overkill" for small projects. Start flat.
11. **Pin the Flutter version with fvm** (`.fvmrc` in the repo). One line;
   removes the "builds locally, not in CI" class of drift for good — a repo
   without it eventually hits the mismatch exactly once, then permanently.
12. **Localized strings via codegen, not raw ARB/`intl` keys:** `slang` or
   `easy_localization` generate a typed accessor class, so a typo'd key is a
   compile error instead of an empty string rendered in production.
13. **Rendering engine: Impeller, not Skia — no toggle needed.** As of
   Flutter 3.27, Impeller is the only rendering engine on iOS (can't switch
   back to Skia) and default on Android API 29+; as of Flutter 3.47 it's
   also default on macOS/Linux/Windows. Skia (JIT-compiled shaders at
   runtime) is what caused classic shader-compilation jank; Impeller
   precompiles shaders at engine-build time instead, so first-run animation
   smoothness no longer differs from steady-state — a warmup-cache workaround
   for jank is a stale fix, not a current one. Flutter Web still uses Skia
   (CanvasKit/HTML), not Impeller. On Android devices too old for Vulkan,
   Impeller falls back to legacy OpenGL automatically — no app-side handling
   needed.

Sources (openly licensed): [Flutter docs (CC BY 4.0)](https://docs.flutter.dev) ·
[dart.dev linter rules](https://dart.dev/tools/linter-rules) ·
[Solido/awesome-flutter (CC0)](https://github.com/Solido/awesome-flutter) ·
[Flutter docs: Impeller rendering engine](https://docs.flutter.dev/perf/impeller) ·
auto_route/pigeon/fvm/slang choices cross-checked against real Flutter
production codebases (Immich, LocalSend, Spotube — none used go_router) ·
[Milad-Akarie/auto_route_library](https://github.com/Milad-Akarie/auto_route_library)
(guards/nested routes/deep links) ·
[Very Good Ventures: Flutter Pigeon in production](https://verygood.ventures/blog/flutter-pigeon-type-safe-platform-channels/)
(codegen workflow, CI regen-check gotcha) · no dedicated Claude Code skill
found covering auto_route/drift/pigeon at this depth (checked
Arcturus91/claude-flutter-skill's 19 reference files — its nav reference
covers go_router, not auto_route; no drift or pigeon reference exists).
