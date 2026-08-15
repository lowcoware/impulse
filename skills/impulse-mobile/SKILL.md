---
name: impulse-mobile
description: >
  Mobile engineering — Flutter-first (owner's primary), React Native, native
  SwiftUI/Kotlin, WebView wrappers. Anti-overengineering ladder for platform
  choice, day-one mobile baseline (crash reporting, release signing, dispose
  discipline, network timeouts), and the mobile-specific bug catalog.
  Triggers: "/impulse-mobile", "flutter", "react native", "swiftui", "kotlin
  android", "мобилка", "мобильное приложение", "флаттер", "андроид", "widget", "riverpod", "flatlist",
  "push notifications", "deep link", "webview", "app store", "offline-first".
---

# impulse-mobile

Mobile counterpart to impulse-backend/impulse-frontend. Same stance: the plainest
thing that ships, a day-one baseline that's never skipped, ceiling markers
for deferred scaling. Flutter is the owner's primary — deepest coverage
there. Content synthesized from openly-licensed sources (see Lineage in
README); native Apple docs are orientation-only (proprietary).

## Platform-choice ladder — rungs are IDs `MO-LD1`–`MO-LD4`

Stop at the first that holds:
1. **Cross-platform (Flutter)** unless a reason below forces otherwise — one
   codebase, two platforms.
2. **React Native** if the team/ecosystem is already React-native and the app
   is React-shaped.
3. **Drop to native for ONE feature** via platform channel / native module —
   not a full native rewrite — when it needs OS-level fidelity, a tiny
   system-utility binary, or deep OEM/hardware API access a bridge can't
   reach cleanly.
4. **Full native (SwiftUI/Kotlin)** only when most of the app is that one
   feature.

## Day-one mobile baseline — never skipped

IDs `MO-BL01`–`MO-BL06` in listed order; [`shared/rule-spine.md`](../../shared/rule-spine.md) maps each to the impulse-review tag that catches it.

- Crash reporting wired (Sentry/Crashlytics) from build #1
- Release signing + auto-incremented build number in CI (never by hand)
- Timeout on every network call (same rule as impulse-backend baseline)
- **Dispose discipline:** every subscription/controller/listener/observer
  opened has a paired teardown — the #1 mobile leak (`hardening-mobile.md`)
- Phased rollout (1%→5%→20%→50%→100%) with a crash-rate halt threshold
- No secret in the app binary (see cross-cutting.md — it's public)

## References — load on demand

| File | Covers | Load when |
|---|---|---|
| references/flutter.md | state-mgmt choice, rebuild perf, BuildContext-async-gap, go_router, platform channels, isolates, dispose | any Flutter work |
| references/react-native.md | New Arch/Expo choice, FlatList perf, Expo Router, state, bridge/listener leaks | any React Native work |
| references/native.md | native-vs-cross-platform decision, SwiftUI @Observable state, Kotlin coroutines/Compose, dropping to native | native code or a platform channel |
| references/cross-cutting.md | secrets-in-binary, deep linking, WebView security, offline-first sync, push, release discipline | any app (all platforms) |
| references/hardening-mobile.md | the mobile AI-typical bug catalog: leaks, main-thread blocking, list perf, lifecycle, Keychain/biometric misuse | reviewing mobile code |
| references/app-store.md | App Store + Play Store rejection causes, submission API gotchas, ASO, ATT/SKAdNetwork/AdAttributionKit attribution, guideline-drift-detection technique | submission prep, store metadata, attribution/ad-SDK wiring |
| references/android-deps.md | Gradle/version-catalog bump procedure: coupled-version detection, JitPack blind spot, Kotlin/AGP/SDK-level never-auto-safe rule, verify-by-build-not-resolve | bumping Android dependency versions |
| references/apk-security-review.md | post-build APK/AAB forensic security pass: toolchain, Flutter-`libapp.so` secrets trap, critical-blocker list, severity scoring, never-auto-edit list | reviewing a built Android artifact before release |
| references/audits.md | OWASP Mobile Top 10 checklist, Flutter localization audit (ICU plurals/RTL), Flutter/pub dependency audit (discontinued/license/pinning) | a standalone security/i18n/dependency audit pass, not per-PR review |
| references/kmp.md | Kotlin Multiplatform: expect/actual vs interface+DI, Android-to-KMP incremental migration order and anti-patterns | adding an iOS target to an existing native Android app via KMP |
| references/flutter-games.md | Flutter Flame 2D games: dt-clamping, collision, hybrid overlay UI, monetization + kids-safety checklist | building a Flame/game-loop project, not general app UI |
| [../../shared/rule-spine.md](../../shared/rule-spine.md) | builder↔review crosswalk: rule ID → detector → review tag | adding/renumbering a baseline item or ladder rung, or asking which review tag catches one |
| [../../shared/context7.md](../../shared/context7.md) | Flutter/React Native/SwiftUI/Kotlin API syntax before writing against it — New Arch/Expo/Compose move fast | unfamiliar SDK API or a version-pinned mobile dep |

## Boundaries

- Backend the app talks to → impulse-backend; auth/token handling → impulse-security
  (mobile-specific: secret-in-binary rule in cross-cutting.md).
- Web frontend → impulse-frontend (no ai-tells/register model transfers to
  mobile — different paradigm).
- "stop impulse" / "normal mode": revert to default behavior.
