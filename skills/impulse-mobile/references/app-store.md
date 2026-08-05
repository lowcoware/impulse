# App Store / Play Store — submission, review, attribution

## Rejection — top causes, not folklore

~40-60% of first-time iOS submissions get rejected; Apple's own numbers put
crashes/broken functionality and performance issues as the single biggest
rejection categories, well ahead of anything content-policy related. Cheapest
wins before ANY submission: a working support URL (Guideline 1.5 — a broken
one is consistently a top-3 rejection cause on its own), a present and
accurate `PrivacyInfo.xcprivacy` manifest, and the App Privacy "nutrition
label" answers actually matching what the binary's SDKs do (a mismatch here —
e.g. an ad SDK tracking without disclosure — is now a routine rejection, not
an edge case). In-app-purchase violations (external payment links for digital
goods, hidden pricing, unclear subscription terms) are their own dominant
category, separate from technical quality entirely.
[QAwerk: App Store rejection reasons 2026](https://qawerk.com/blog/app-store-rejection-reasons/)

Concrete pre-submission checks worth automating (grep/API-checkable, not
vibes): Info.plist usage-description parity with actually-called APIs;
privacy-manifest API-category mapping for every "required-reason" API used
(`UserDefaults`, file timestamp, disk space, etc.); ATT prompt fires *before*
any ad-SDK init call, never after; App Group `suiteName` matches across every
target that shares it; app-extension targets carry their **own** privacy
manifest, separate from the host app's; hardcoded price strings vs.
StoreKit's live `displayPrice` (drift here is a rejection, not a typo).

## App Store Connect API — real scar tissue

- Age-rating declaration moved to the `appInfo` resource, not the version
  resource (2025 schema change) — old integration guides point at the wrong
  endpoint.
- Sending `ageRatingOverride` and `ageRatingOverrideV2` together = `409`.
- The App Privacy "nutrition label" endpoints are UI-only — there is no API
  relationship for them; expecting to set this via API 404s.
- The **first** subscription in a group must be attached via the App Store
  Connect UI — no API relationship exists for the first-subscription
  attachment step, only for subsequent ones.
- `.p12` export requires OpenSSL's `-legacy` flag on current OpenSSL — a
  plain `openssl pkcs12` invocation silently produces a cert ASC rejects.
- Expo/EAS: a native `ios/` directory present in the repo silently
  **overrides** `app.json` config at build time — a config change that
  "does nothing" is almost always this.

## Guideline-drift detection (technique, generalizes beyond App Store)

Apple's review guidelines aren't versioned or dated, so a static local copy
goes stale silently. Pattern: snapshot section numbers/text into a baseline
file, diff the live guidelines page against it on each run, WARN-only (never
auto-update the baseline — that would silently swallow the signal a human
needs to see). Verdict as a 3-tier gate: 0 fails/≤4 warns = green, 0
fails/≥5 warns = yellow (needs a human look before relying on the check),
≥1 fail = red/blocked. The same shape applies anywhere a moving external
ruleset is being tracked locally (HIG, OWASP MASTG version bumps, a
third-party API's ToS) — a scraped local mirror rots without a diff-and-flag
step. (Distilled from berkayturk/appstore-precheck, harvested GitHub skill.)

## ASO — screenshot text is now indexed

Apple's screenshot captions are OCR-indexed for search ranking (2025 shift) —
caption text is a ranking signal, not just marketing copy. Per-locale keyword
fields have real economics: title/subtitle/keywords must not repeat a term
across fields (wasted character budget, App Store dedupes). A localization
pipeline shape worth reusing: translate captions only, composite the
translated caption back onto the *pristine* (unmodified) source screenshot
per locale — don't regenerate screenshots per locale from scratch, don't
translate anything baked into the screenshot image itself. Use a
popularity/difficulty data source (App Store search-suggestion scraping or a
paid ASO API) for keyword choice, never literal machine-translation of an
English keyword list into another language — the literal translation is
usually not what users in that locale actually search. (Distilled from
marcotini/apple-app-store-aso and mazen-salah/appstore-localization,
harvested GitHub skills.)

## Attribution — ATT / SKAdNetwork / AdAttributionKit

Real gap area, easy to get subtly wrong:

- **ATT is a 4-state permission** (not authorized/denied): not-determined,
  restricted, denied, authorized. Only "authorized" unlocks the IDFA: treat
  every other state as "no IDFA," don't special-case "denied" only.
- **The wait/delay scope trap:** an MMP SDK's (AppsFlyer/Adjust) attribution
  queue only covers calls that SDK itself makes. Any direct backend call, a
  server-to-server CAPI call, or a direct Meta/TikTok pixel call made
  *before* ATT resolves is NOT covered by the SDK's queue and fires with
  whatever consent state existed at that instant — a common silent
  over-collection bug.
- **SKAdNetwork vs AdAttributionKit are dual, not either/or** on current iOS:
  they use *different* Info.plist keys for the postback copy endpoint and
  are commonly confused — `NSAdvertisingAttributionReportEndpoint` is
  SKAdNetwork's key, `AttributionCopyEndpoint` is AdAttributionKit's. Setting
  only one when both attribution paths are live silently drops postbacks
  from the uncovered path.
- Conversion-value encoding is one of three shapes depending on what the
  campaign needs to measure: funnel-step (which stage a user reached),
  revenue-bucket (coarse spend tier), or multi-window (separate values at
  different post-install windows) — pick based on the optimization goal
  before wiring the SDK, not after.

(Distilled from Rylaa/ios-marketing-att-skill, harvested GitHub skill.)

## Pre-submission review-by-simulation (technique)

Beyond static checks: drive an actual Simulator build with computer-use
tooling, role-playing an Apple reviewer specifically hunting for what static
analysis can't see — dead-end login flows, missing report/block controls on
user-generated content, notch/Dynamic-Island-clipped layouts. One practical
gotcha: typing into the iOS software keyboard through automation tooling
reliably mangles text (autocorrect/autocomplete interference) — paste via
clipboard instead of simulating keystrokes. (Distilled from
anagnole/apple-reviewer-simulator, harvested GitHub skill.)

## Play Store (Android) — submission specifics

- **Signed-AAB pipeline:** `keytool -genkeypair` for the upload key →
  `keystore.properties` (gitignored, never the keystore itself) →
  `bundleRelease` → `jarsigner -verify` before upload. The upload key is
  distinct from Google's Play App Signing key — losing the upload key is
  recoverable (Google re-signs with the app-signing key), losing that
  underlying app-signing key is not.
- **Data Safety form maps directly to what's grep-detectable in the
  binary/manifest** — an auth SDK, an analytics/ads SDK, any device-ID
  read. "Collects" and "shares" are separate declarations: data that never
  leaves the device isn't "collected" for this form's purposes even if the
  app reads it.
- **Screenshot aspect-ratio hard rule:** long side must be ≤2× the short
  side. A raw modern-device capture (e.g. 1080×2340 = 2.17:1) gets
  rejected by this rule — pad the canvas, don't crop the content to fit.
- `applicationId` is permanent after the first upload — no renaming a
  package later. Free→paid is a one-way switch. The public listing name is
  the developer-account name, and it must match whatever the linked
  privacy-policy page says (a mismatch here is a real rejection cause, not
  a formality).
- **A generic "changes couldn't be saved" error with no field-level
  message is almost always a scrolled-past required control** (the
  Free/Paid radio, a hidden checkbox further down the form), not a backend
  flaw — check every required control before assuming the console is
  broken.
- The first AAB/graphics upload is unavoidably a manual step in most agent
  tooling — file-upload automation commonly caps around 10MB and a
  release AAB routinely exceeds that. Automate everything else in the
  pipeline (build, sign, verify, changelog, metadata); hand off just the
  upload and the final "send for review" click.

(Distilled from dineshkumarappdeveloper/play-console-draft, harvested
GitHub skill.)

**Data-declaration mapping is table-driven, not case-by-case guessing** —
map each bundled SDK to its declared-data-type obligation on both
platforms: `firebase_analytics` → Product Interaction + Device ID (iOS
nutrition label) / Analytics (Android Data Safety); `google_mobile_ads` →
Advertising Data + Device ID on both. iOS's `PrivacyInfo.xcprivacy` reason
codes are also table-driven per required-reason API —
`NSPrivacyAccessedAPICategoryUserDefaults` maps to reason code `CA92.1`
specifically, not a free-text justification; picking the wrong reason code
for a used API is a rejection cause distinct from omitting the entry
entirely. Age-rating content triggers: any UGC/chat feature forces a 12+
(iOS)/Teen (Android) minimum rating regardless of the rest of the app's
content — this is commonly missed because the rest of the app reads as
all-ages. (Distilled from NoaTubic/flutter-store-readiness-skill, MIT,
harvested GitHub skill.)

## Release automation — Fastlane Match

Fastlane `match` stores encrypted certs/provisioning profiles in a private
git repo shared across the team/CI — the standard way to avoid "who has the
signing cert" chaos. Two non-negotiables: `readonly: true` in every build
lane (a non-readonly `match` call can silently regenerate/revoke a cert
mid-build), and `setup_ci` (creates a temporary CI keychain, no-op locally)
must run *before* `match` in any CI lane, not after. Scope boundary worth
remembering: Fastlane uploads the binary and app-level metadata/screenshots,
but NOT in-app-purchase/subscription review assets — those are still a
manual App Store Connect step regardless of how automated the rest of the
pipeline is. (Distilled from greenstevester/fastlane-skill, harvested
GitHub skill.)

Sources: berkayturk/appstore-precheck, beydemirfurkan/appstore-release,
JustinPerea/app-store-review-skill, marcotini/apple-app-store-aso,
mazen-salah/appstore-localization, Rylaa/ios-marketing-att-skill,
anagnole/apple-reviewer-simulator — all harvested GitHub skills, distilled
and re-expressed, no verbatim text copied.
