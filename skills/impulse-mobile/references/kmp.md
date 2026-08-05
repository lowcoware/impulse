# Kotlin Multiplatform (KMP)

For sharing logic between Android and iOS beyond what Flutter/RN cover —
usually an existing native Android app growing an iOS target, not a
greenfield cross-platform start (that's still Flutter first, per the
platform-choice ladder in SKILL.md).

1. **`interface` + DI over `expect`/`actual` for anything stateful.** Reserve
   `expect`/`actual` for small, stateless, value-like APIs (UUID generation,
   current timestamp) — anything with lifecycle or mutable state (a
   repository, a platform service) should be a `commonMain` `interface` with
   platform-specific implementations injected, not an `expect class`. The
   interface version is mockable in `commonTest` and composable with
   decorators; `expect`/`actual` isn't.
2. **`actual` must match `expect` exactly** (Kotlin 2.0+) — no new public
   members on the `actual` side. Default parameter values are allowed only
   on the `expect` declaration, never on `actual`. Prefer a `typealias` to an
   existing JDK/Darwin type over a hand-written wrapper when one already
   fits.
3. **Migrating an existing Android app into KMP — order matters.**
   Bottom-up: pure business logic first, then framework-facing code
   (networking, persistence), then ViewModels, iOS target last. A concrete
   replacement table: Retrofit+OkHttp → Ktor client, Room → SQLDelight,
   Moshi/Gson → kotlinx.serialization; WorkManager has no multiplatform
   equivalent and stays Android-only behind a shared interface.
4. **Migration anti-patterns:** moving Compose UI into `commonMain` before
   the domain/data layers are stable and fully shared (locks in churn at the
   most expensive layer); shipping a "partial" migration where the same
   logic exists duplicated in both `:app` and `:shared` (defeats the point,
   doubles the maintenance surface); enabling the iOS target "just to see if
   it compiles" before the Android side is actually stable — every iOS
   target multiplies CI cost and should be added deliberately, not
   speculatively.

Sources: almasumdev/awesome-kotlin-multiplatform-agent-skills, harvested
GitHub skill, distilled and re-expressed — no verbatim text copied. Only a
fraction of that repo's ~20 reference files were reviewed (expect/actual,
Android-to-KMP migration); it also covers Gradle/CI, Ktor, SQLDelight,
Compose Multiplatform, offline-sync, accessibility, animations,
localization, performance, and binary-size in more depth than reflected
here — worth a follow-up read if KMP coverage needs to go deeper than this.
