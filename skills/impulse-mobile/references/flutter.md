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
4. **Navigation:** go_router (Flutter-team-blessed, Navigator 2.0). Cap
   nested-shell depth at 2; centralize route names; `go_router_builder` for
   type safety.
5. **Platform channels:** MethodChannel = request/response one-offs;
   EventChannel = streams. Reverse-domain channel names. Treat each channel
   as a versioned contract (stable method names, explicit success/failure
   payload shape).
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

Sources (openly licensed): [Flutter docs (CC BY 4.0)](https://docs.flutter.dev) ·
[dart.dev linter rules](https://dart.dev/tools/linter-rules) ·
[Solido/awesome-flutter (CC0)](https://github.com/Solido/awesome-flutter)
