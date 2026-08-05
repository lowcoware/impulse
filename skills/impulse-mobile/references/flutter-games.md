# Flutter Flame — 2D games

Load only when the task is a Flame/game-loop project, not general app UI —
different rules apply than the rest of impulse-mobile.

1. **Pure-Dart game model, zero framework imports.** The model layer that
   holds game state/rules must not import `package:flutter` or
   `package:flame` — makes it unit-testable with plain `dart test`, no
   widget/engine harness needed. Inject a seeded `Random` into game logic;
   never call bare `Random()`/`Random.secure()` inside deterministic game
   code — kills reproducibility for tests and replays.
2. **`FlameGame.update(dt)` does not cap `dt` — you must.** After any stall
   (app backgrounded, debugger paused, frame drop), the next `dt` can be
   huge — feeding an uncapped `dt` into physics/movement causes tunneling
   (an object skips through a collider it should have hit) or a visible
   explosion in position. Always `dt.clamp(0.0, 1/30)` before using it.
   `pauseEngine()` must pause the model's own clock too, not just the
   render loop, or the same spike hits on resume.
3. **`HasCollisionDetection` + `CollisionCallbacks`**, with hitbox
   `CollisionType.active`/`.passive`/`.inactive` chosen deliberately —
   active-vs-active checks are the expensive case; mark static/background
   colliders passive.
4. **Hybrid UI pattern:** `GameWidget` with `overlayBuilderMap` for real,
   accessible Flutter widgets (menus, HUD, pause screen) layered over the
   Flame canvas — don't hand-draw UI chrome inside the game's render loop
   when a real widget gets you free accessibility/text-scaling/Semantics
   support.

## Monetization + kids-safety (Apple Kids Category / Google Play Families)

- Audience-gate first: a kids build ships zero ads/tracking/`AD_ID` —
  verify via `flutter pub deps` that no ad/analytics SDK made it into the
  dependency graph, not just via a runtime flag.
- ATT prompt before any ad-SDK init call (same ordering rule as
  `app-store.md`'s attribution section); UMP consent obtained before
  `canRequestAds()` returns true.
- A full-screen ad must pause the game loop, and resuming after it must
  clamp `dt` the same as any other stall (rule 2 above) — an ad-return
  physics spike is a real, reported bug class. Frequency-cap ads in code,
  don't leave pacing entirely to the ad server.
- IAP: verify receipt before granting the purchased content, and call
  `completePurchase` for every `pendingCompletePurchase` — Android
  auto-refunds an uncompleted purchase after 3 days. "Restore Purchases" is
  a required control, not optional polish. No dark patterns, and a
  parental gate on any purchase flow a child could reach.
- Kids-category doctrine, cross-cutting: no tracking, no ads, no analytics,
  no accounts, no personal-data collection, no external links without a
  parental gate, offline-first where possible, `Semantics` on every
  interactive control, and reduce-motion/text-scaling honored.

Sources: Zulut30/dart-mobile-game-studio, harvested GitHub skill, distilled
and re-expressed — no verbatim text copied. A second source
(huseyininnc/flame-game-dev) independently confirms Flame as an
under-covered niche but wasn't deep-read for this file.
