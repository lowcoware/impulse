# Audit checklists — OWASP Mobile, localization, dependencies

Checklist-shaped material, distinct from `hardening-mobile.md`'s diff-review
bug catalog: run these as a standalone audit pass, not per-PR.

## OWASP Mobile Top 10 (2024) — Flutter/Dart-detectable checks

Ten categories plus six emerging checks (AE1-AE6), each with a concrete,
grep-able signal:

- **M1 Improper credential usage** — hardcoded API keys/passwords in Dart
  source (`grep -rn "apiKey\s*=\s*['\"]" lib/`), credentials in
  `SharedPreferences` unencrypted instead of `flutter_secure_storage`.
- **M2 Inadequate supply-chain security** — see this file's "Flutter/pub
  dependency audit" section below for the discontinued/license/pinning
  tables.
- **M3 Insecure auth/authz** — token refresh logic client-side only with no
  server-side revocation check, biometric gate used as the sole security
  boundary (same trap as native.md's LAContext pattern, RN/Flutter
  equivalent: a local-only biometric check gating a value that never
  actually needed decrypting).
- **M4 Insufficient input/output validation** — deep-link parameters used
  directly in a query/file-path without validation.
- **M5 Insecure communication** — `usesCleartextTraffic`, no certificate
  pinning on a security-sensitive endpoint, TLS version not pinned to a
  floor.
- **M6 Inadequate privacy controls** — analytics/ads SDK initialized before
  consent is obtained, PII in logs.
- **M7 Insufficient binary protections** — see `apk-security-review.md` for
  the Android side; debuggable flag, missing obfuscation
  (`--obfuscate --split-debug-info` for release Flutter builds).
- **M8 Security misconfiguration** — exported components (see
  `apk-security-review.md`), verbose error messages leaking stack traces to
  the client.
- **M9 Insecure data storage** — plaintext SQLite/Hive/sqflite for
  sensitive fields, unencrypted local backups including sensitive tables.
- **M10 Insufficient cryptography** — hand-rolled crypto, ECB mode, a fixed
  IV/nonce.
- **AE1-AE6 (emerging)**: data leakage via 3rd-party SDK over-sharing,
  hardcoded secrets missed by M1's basic grep (config files, CI scripts
  bundled into the asset folder by mistake), insecure access control on a
  local IPC/deep-link surface, path traversal in a file-picker/download
  handler, unprotected exported components (overlaps M8, worth a second
  pass), unsafe sharing (a `FileProvider`/content-URI grant wider than the
  receiving app needs).

## Flutter localization audit

- **ICU plural forms are language-specific, not a fixed `one`/`other`
  pair.** Russian needs `one`/`few`/`many`/`other`; Arabic needs all six
  CLDR categories. An ARB file authored assuming English's two-form pattern
  silently mis-pluralizes every other language — verify the ARB's plural
  keys against the target language's actual CLDR category set, not against
  English's.
- **RTL-safe layout properties, not physical ones:** `EdgeInsetsDirectional`
  not `EdgeInsets.only(left:)`, `TextAlign.start`/`.end` not `.left`/`.right`.
  Same physical-vs-logical distinction as
  `impulse-frontend/references/rtl-i18n-ui.md`, Flutter-flavored.
- **String concatenation breaks word order in translation** — `Text(loc.hello
  + ' ' + name)` bakes in English word order; a placeholder-based message
  (`loc.helloUser(name)`) lets the translated string reorder the
  interpolation point per language.

## Flutter/pub dependency audit

Parallel to `android-deps.md` but for `pubspec.yaml`, not Gradle:

- **Known-discontinued packages** have known successors — `connectivity` →
  `connectivity_plus`, `share` → `share_plus`. A dependency audit should
  check against a maintained discontinued-package list, not just "does it
  still resolve" (an unmaintained package resolves fine right up until it
  doesn't).
- **License risk**: GPL/AGPL-licensed packages are Critical risk in a
  closed-source app (copyleft obligations), not a style nit.
- **Version-pinning risk**: `any` constraint = High risk (silently accepts
  a breaking major on next `pub get`), an unbounded `>=` = Medium. Pin with
  a caret (`^1.2.3`) at minimum.

Sources: NoaTubic/owasp-mobile-audit-skill,
NoaTubic/flutter-localization-audit-skill,
NoaTubic/flutter-dependency-audit-skill — harvested GitHub skills (MIT),
distilled and re-expressed, no verbatim text copied.
