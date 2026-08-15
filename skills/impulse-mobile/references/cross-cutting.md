# Cross-cutting mobile

Applies to every platform.

1. **Secrets-in-binary is public — the critical mobile rule.** Any key/token
   shipped in the app bundle is trivially extractable via static analysis
   (JADX/APKTool/MobSF) regardless of obfuscation. Paid/business-logic APIs
   must be called through your own backend, never directly from the client
   with an embedded key. This is the mobile counterpart to
   `impulse-security/references/secrets.md`.
2. **Deep linking:** HTTPS-based Universal Links (iOS) / App Links (Android),
   not custom URI schemes — a custom scheme can be claimed by multiple apps
   (auth-callback hijack). Never put tokens/PII in link params (logged
   everywhere). Most real-world failures are infrastructure, not app code —
   a 2026 tracking-link report across 3B clicks found 18% failed to route
   correctly (home screen, wrong screen, or crash). Check FIRST, before
   touching app code: `apple-app-site-association`/`assetlinks.json` served
   at the right path with the right Content-Type, fingerprint matching the
   actual signed build, all current team/package IDs listed (a URL pattern
   added after launch and never appended to these files fails silently).
   Android verification failure is silent by design — it falls back to a
   disambiguation dialog instead of erroring, and a failed verification
   gets cached, so a fix sometimes needs an app reinstall to actually
   re-verify during testing. Separately: in-app browsers (social-app
   webviews) are the single most common production failure for paid
   campaigns specifically — test the actual entry surface, not just Safari/
   Chrome directly.
   [Linkrunner: why deep links break on iOS, every failure mode](https://linkrunner.io/blog/why-your-deep-links-break-on-ios-and-how-to-fix-every-failure-mode)
3. **WebView wrapper:** `addJavascriptInterface`-style bridges are the #1
   Android WebView CVE source — never expose auth/sensitive native methods to
   the bridge, disable JS if unneeded, allowlist URLs before load, no
   remote-loaded JS touching the bridge.
4. **Offline-first sync:** the local DB is the source of truth; every synced
   table needs a `sync` flag + UTC `updated_at` (+ version counter), soft
   deletes, and a `pending_ops` table to preserve operation order. Flutter:
   sqflite. RN: WatermelonDB/Realm for complex sync. This pattern (last-
   write-wins by `updated_at`) is the right default — it's simple and
   covers most mobile sync shapes. **Reach for CRDTs specifically** only
   when multiple devices can genuinely edit the SAME record concurrently
   with no central server able to arbitrate who's "right" (true peer-to-
   peer or offline-for-days multi-device editing) — CRDTs guarantee
   convergence to an identical final state across devices without a
   coordinator, which LWW-by-timestamp doesn't guarantee under real clock
   skew. Don't reach for CRDT machinery (PowerSync/Realm Sync/a CRDT
   library) for the common case of "one user, multiple devices, mostly
   sequential edits" — that's exactly what the simpler pattern above
   already handles.
   [Calibraint: offline-first mobile with CRDT, when it's justified](https://www.calibraint.com/blog/offline-first-mobile-app-in-2026)
5. **Push notifications:** token-based auth to APNs/FCM, keep connections
   open (don't cycle per-message), collapse keys to avoid backlog floods on
   reconnect. Silent push is throttled/blocked by iOS Low Power Mode — never
   rely on it for critical delivery.
6. **Release discipline:** phased rollout (1%→5%→20%→50%→100%), halt on a
   crash-rate threshold (~0.5% sessions default), auto-increment build number
   in CI never by hand, marketing version matched across platforms. This
   default is deliberately stricter than Play's own published bad-behavior
   floor (1.09% user-perceived crash rate, 0.47% ANR rate, both overall —
   8% for a single device model) — halt the rollout well before Google's
   own visibility-reduction threshold, not at it.
   [Android Developers: Android vitals crash/ANR thresholds](https://developer.android.com/topic/performance/vitals/crash)

7. **Motion — spring params over duration+easing.** Parameterize by
   `(duration, bounce)` rather than raw stiffness/damping — the same two
   knobs drive SwiftUI's `.spring(duration:bounce:)`, Motion (web), and CSS
   `linear()` output, so one design decision ports across platforms.
   (`impulse-frontend`'s no-bounce-easing ban is a WEB rule and does not
   apply here: native platforms ship springs as the system-default motion
   language — bounce on mobile is idiomatic, not an AI-tell.)
   `stiffness = (2π/duration)²`, `damping = 4π(1-bounce)/duration` (corrects
   a formula that's circulated garbled from a WWDC23 transcript). Gesture
   rules that hold everywhere: 1:1 finger/drag response during the gesture,
   trigger the animation by its consequence not by a fixed delay, carry
   velocity into the release animation (don't zero it), keep the animation
   interruptible by a new gesture at all times, rubber-band past a hard
   boundary rather than clamping instantly. **Reduced-motion means calmer,
   not gone** — cut amplitude/duration, never just delete the animation or
   swap to an instant cut; an app that goes from spring-everywhere to
   zero-motion under Reduce Motion reads as broken, not accessible.
   (Distilled from OtherdaysStudio/springy-motion, harvested GitHub skill.)

Sources: [Android Developers WebView security (CC BY 2.5)](https://developer.android.com) ·
[HackTricks WebView attacks](https://book.hacktricks.wiki) · deep-linking/rollout facts are
general platform documentation (factual, not licensed expression) ·
OtherdaysStudio/springy-motion (harvested GitHub skill).
