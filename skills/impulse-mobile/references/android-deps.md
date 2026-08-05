# Android dependency updates — gated procedure

General dependency-audit doctrine (CVEs, supply-chain risk, pinning) lives in
`impulse-dependency-audit` — this file is the Android/Gradle-specific
mechanics of *safely bumping* a version catalog, not the security audit
itself.

1. **The version catalog (`gradle/libs.versions.toml`) is the single edit
   target** when convention plugins are in use — module `build.gradle.kts`
   files declare no versions. Detect via
   `ben-manes/gradle-versions-plugin` (`./gradlew dependencyUpdates
   --no-parallel` — parallel mode only scans the root module on Gradle 9+).
2. **JitPack (`com.github.*`) is the detection tool's blind spot** — those
   artifacts never appear in the report, they land in `unresolved`. Check
   by hand: read each one's `maven-metadata.xml` from its host repo.
3. **Coupled version blocks are one item, not many.** Any set of artifacts
   sharing a `version.ref` or governed by a BOM (`composeBom`, a Firebase
   BOM) moves together — bumping one without the others is not "safe," it's
   incomplete.
4. **Never bucket Kotlin, AGP, or the Gradle wrapper as "safe," not even for
   a patch.** Kotlin drags KSP, the Compose Compiler, and every compiler
   plugin with it — it can break annotation processing or Compose on a
   version that reads as a harmless minor bump. AGP majors cascade into
   Gradle + Studio + often `compileSdk`/JDK. Each gets its own explicit
   confirmation; an "apply the safe ones" approval must never silently
   include them.
5. **`compileSdk`/`targetSdk`/`minSdk` are not catalog dependencies** and
   the update-detection tooling doesn't track them — raise `compileSdk`
   only when a confirmed dependency bump requires it (treat as its own
   coupled, high-risk item), leave `targetSdk` to a dedicated
   Play-policy-driven pass (new permissions/behavior changes, its own
   testing — not a dependency-update side effect), and only flag `minSdk`
   if a bump silently raises the *effective* floor.
6. **A "safe" bump can still hide a coupled requirement** — a library's
   latest patch can demand a higher `compileSdk`/AGP/Kotlin than declared.
   The verify build is what actually exposes this ("requires compileSdk
   N"); don't trust the semver number alone to mean "safe."
7. **Verify with a real build, not just a resolve** —
   `./gradlew :app:assembleDebug` minimum, `build` for anything touching
   tests/Kotlin/coroutines. On failure, before reverting outright, try
   stepping down to the highest version that still compiles — often the
   *latest* patch pulls a too-new transitive that an earlier patch of the
   same library doesn't.
8. **Split the bump from the migration.** The verify build only proves the
   code *compiles* against the new version, not that it's been updated to
   the new API (deprecations still compile). Bump and commit
   (`chore(deps): ...`) first; a separate pass greps for the now-deprecated
   symbols the changelog calls out and adapts them in its own commit
   (`refactor(deps): adapt X to Y vN API`) — never mixed with the bump
   commit.

Sources: alvarose/android-update-deps (MIT), harvested GitHub skill,
distilled and re-expressed — no verbatim text copied.
