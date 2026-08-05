# APK/AAB post-build security review

A read-only forensic pass over a built Android artifact — catches what
source-level review can't, because it inspects what actually shipped.
Distinct from `hardening-mobile.md` (source-level bug patterns) and
`android-deps.md` (dependency hygiene): this is "decompile and inspect the
binary" review.

## Toolchain

`jadx` (decompile), `aapt2 dump badging` / `aapt2 dump xmltree` (manifest
inspection), `apksigner verify --print-certs` (signing check), `strings` on
`lib*/libapp.so` (Flutter-specific — see below).

## Flutter-specific trap

Flutter's Dart business logic compiles into a native AOT snapshot inside
`lib*/libapp.so` — the decompiled Java/Kotlin you get from `jadx` is
**wrapper/plugin glue only**, not the app's real logic. Secrets, hardcoded
URLs, and API keys embedded in Dart code won't show up in decompiled
Java/Kotlin at all — `strings libapp.so | grep -i` (for `http`, `key`,
`secret`, `token` etc.) is the only way to catch what actually leaked from
the Dart layer. A review that only decompiles Java/Kotlin and calls it done
is a false negative on any Flutter app.

## Critical blockers (auto-fail, don't ship)

`android:debuggable="true"` present in a release manifest; global cleartext
traffic allowed (`android:usesCleartextTraffic="true"` with no per-domain
allowlist); an exported `<activity>`/`<service>`/`<receiver>` with no
permission/intent-filter protection; a hardcoded privileged secret (payment
key, admin token) found via the strings pass above; a release build signed
with the debug keystore (`apksigner verify --print-certs` shows the debug
cert's known fingerprint).

## Severity scoring

Start at 100, subtract 35 per critical finding, 15 per high, 5 per warning.
≥85 with zero criticals = SAFE. 60-84 = RISKY (human review before
release). <60, or any single critical present regardless of score = UNSAFE,
blocked.

## Never auto-edit

A finding in this pass is a report, not a fix-it-yourself target for an
agent. Never auto-edit: payment code, auth code, signing config,
permissions, the dependency graph, publishing config, production
environment files, or an API-key rotation/migration. Surface the finding,
let a human decide the fix.

Sources: anasfik/FlutterGuard, harvested GitHub skill, distilled and
re-expressed — no verbatim text copied.
