# RTL & bidi UI — logical properties, direction, mirroring

Distilled from nexu-io/open-design craft/ rulebooks (Apache-2.0), re-expressed for the impulse suite.

The UI/layout layer of i18n: how a layout behaves when the script reads from
the right or mixes direction within a line. Locale routing, hreflang,
per-locale canonical, message loading: `seo-i18n.md` — zero overlap here.

## 1. Base direction and language

1. Full-page RTL: `<html dir="rtl" lang="ar">` (matching `lang` for he/fa/ur).
   In Nuxt: `useHead({ htmlAttrs: { dir, lang } })` driven by the active
   locale, SSR-rendered (client-only `dir` = wrong-direction flash).
2. `dir` without `lang` is a bug: `lang` drives font-stack selection,
   hyphenation, speech synthesis, indexing. Set both, always together.
3. Mixed-language subtree (code sample, English citation inside an RTL page):
   nest `<section dir="ltr" lang="en">`. Inside an opposite-direction
   ancestor, `lang` alone does NOT reset base direction — the subtree needs
   both attributes.
4. User-generated content of unknown direction: `dir="auto"` on the
   paragraph/element — the browser resolves from the first strong directional
   character.

## 2. Logical properties, not physical

5. Hardcoded `left`/`right`/`text-align: left` in new CSS = bug for any
   layout that may render RTL. Allow-listed exceptions only: chart x-axes,
   physical-object icons, platform-pinned UI (status-bar clock).
6. Tailwind v4 has the logical utilities in core: `ms-*`/`me-*`, `ps-*`/`pe-*`,
   `start-*`/`end-*`, `text-start`/`text-end`. No `[dir="rtl"]:` spacing
   overrides, no `tailwindcss-rtl` plugin — both obsolete on v4.

| Logical | LTR | RTL |
|---|---|---|
| `margin-inline-start` / `padding-inline-start` / `inset-inline-start` | left | right |
| `margin-inline-end` / `padding-inline-end` / `inset-inline-end` | right | left |
| `border-inline-start` | border-left | border-right |
| `border-start-start-radius` | top-left radius | top-right radius |
| `text-align: start` / `end` | left / right | right / left |

Inline-axis logical properties are Baseline Widely Available (Chrome 87,
Safari 14.1, Firefox 66) — no fallback needed.

## 3. Bidirectional text

7. Inline mixed-direction runs: `<bdi>` in HTML, always — markup over
   control characters (UAX #9 §2.7). Unicode isolate controls (U+2066 LRI /
   U+2067 RLI / U+2068 FSI, closed by U+2069 PDI) only in plain-text
   contexts: logs, plain-text email, terminal output. Legacy embeddings
   (LRE/RLE/LRO/RLO + PDF) only when interoperating with systems that emit
   them — never in new output.
8. Pick the isolate you KNOW: LRI for known-LTR runs, RLI for known-RTL,
   FSI only when direction is genuinely unknown (UGC). FSI-as-default is
   wrong — auto-detection when you already know the direction.
9. Weak-character values (phone, IBAN, card number) inside an RTL paragraph:
   `<bdi dir="ltr">` (or `<span dir="ltr">`). Bare `<bdi>` is NOT enough —
   digits and separators are weak/neutral, first-strong detection is
   unreliable. Force LTR explicitly.
10. `unicode-bidi: isolate`/`plaintext` in CSS is not a drop-in for `<bdi>`:
    `plaintext` changes per-paragraph base-direction resolution at block
    level. Prefer semantic HTML isolation for inline content; reach for the
    CSS property only when that block behavior is explicitly required and
    tested.

## 4. What mirrors and what doesn't

**Must mirror in RTL:**

| Element | Detail |
|---|---|
| Directional arrows | back/forward, next/previous, breadcrumb chevrons |
| Nav structure | nav rail position, tab order, calendar weekday order |
| Slider fill + non-media progress bars | download, upload, form-completion fill from the right |
| Checkbox/label position | label left of the control in RTL |

**Must NOT mirror:**

| Element | Why |
|---|---|
| Clock faces, circular refresh/sync/reload icons | clockwise is universal |
| Media playback controls AND the media scrubber/timeline | tape direction, not reading direction |
| Charts and graphs | x-axis is mathematical, not linguistic |
| Photos, logos, physical-object icons (camera, keyboard, headphones) | identity over direction |

11. Numerals are locale, not mirroring: Arabic-Indic digits follow the
    locale (bidi class AN affects line placement, never flips glyphs). Use
    `Intl.NumberFormat` / `Intl.DateTimeFormat` per `components.md` §5 —
    hand-formatting = 0.
12. Search icon is the one platform conflict: Apple mirrors the magnifier,
    Material 3 doesn't. On the web, follow Material (don't flip); note the
    deviation if the brief demands Apple fidelity.
13. Phosphor directional icons: flip via `rtl:-scale-x-100` (or a logical
    wrapper) only for the must-mirror list above — a blanket flip on all
    icons breaks the must-not list.

## 5. Script-aware typography

14. Never apply `letter-spacing` to Arabic/Persian/Urdu runs — tracking
    breaks cursive joining. The uppercase-tracking and display-tracking
    rules in `typography.md` are Latin-only; hierarchy in joining scripts
    is carried by size, weight, and whitespace.
15. No italics on Arabic or Hebrew — neither script has an italic tradition.
16. Arabic body: 14-18px with line-height 1.5-1.75 for harakat (diacritic)
    clearance; Latin defaults are too tight.
17. `text-align: justify` on Arabic looks unnatural (inter-word spacing
    instead of kashida elongation) and `text-justify: kashida` has zero
    browser support — don't justify. (Justify is banned for Latin body
    already; the reason differs.)
18. No Lorem Ipsum for RTL prototyping — Arabic word lengths, joins, and
    vertical extents differ; use real Arabic/Hebrew text.
19. Japanese/CJK content: Latin metrics (`ch`-based measure, ~1.5 line-height,
    italic emphasis) don't transfer any better than they do to Arabic —
    concrete ruleset (horizontal and vertical `writing-mode`): `typography-cjk.md`.

## 6. Forms in RTL

19. `<input dir="auto">` for any free-text field whose value direction is
    uncertain (search, comments).
20. Force `dir="ltr"` on intrinsically-LTR fields even inside an RTL page:
    email, URL, phone, IBAN, credit card.
21. Displayed mixed-script values (username in a paragraph, model number in
    a description): wrap in `<bdi>`; weak-character values per rule 9.

## 7. Lint list

- Hardcoded physical `left`/`right`/`pl-*`/`ml-*`/`text-left` on any surface
  that may render RTL (the `components.md` §5 harden probe is the runtime
  check; this is the source-level version).
- `dir="rtl"` without a matching `lang` (or vice versa on RTL pages).
- `[dir="rtl"]:` spacing overrides on Tailwind v4 — logical utilities exist.
- Bare `<bdi>` around phone/IBAN/card values — force `dir="ltr"`.
- `letter-spacing` or italic on Arabic runs.
- Blanket icon mirroring, or mirrored media scrubbers/clocks/charts.
- Locale resolved client-only (`onMounted`) — direction flash; SSR resolves
  first (`seo-i18n.md` #3 is the same rule for locale content).

## Boundaries

Locale routing, hreflang, canonical, message chunks, missing-key handling:
`seo-i18n.md`. Text-expansion tolerance (+40% German, fixed-width bans) and
the RTL harden probe: `components.md` §5. Latin type rules this file carves
exceptions from: `typography.md`. Mobile RTL primitives (Flutter
`EdgeInsetsDirectional`, RN `I18nManager`): impulse-mobile's territory, not
this file.
