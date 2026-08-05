# typography-cjk.md: Japanese/CJK type rules — horizontal and vertical

Source: extracted from a harvested GitHub skill (jelaludo/claude-skill-typography).
Load this when a project actually serves Japanese/CJK content — rtl-i18n-ui.md's
script-aware section covers the general "don't assume Latin metrics" stance;
this file is the concrete Japanese ruleset underneath it.

## 1. Horizontal Japanese — Latin defaults don't transfer

- **Measure line width in `em`, not `ch`.** `ch` is defined off the Latin
  `'0'` glyph — meaningless as a metric for kanji/kana. Target 30-40
  characters per line (vs. Latin's 60-65ch) — Japanese reads narrower
  columns comfortably; a 65-character-wide Japanese line is fatiguing,
  not generous.
- **`line-height: 1.7` minimum**, well above Latin's ~1.5-1.6 — kanji has
  no ascenders/descenders to create visual breathing room between lines,
  so the line-height has to supply it directly.
- **`line-break: strict`** activates JIS X 4051 kinsoku shori (the rules
  for which characters can't start/end a line — a closing bracket can't
  open a line, punctuation can't dangle). This rule silently does nothing
  without `lang="ja"` present on the element or an ancestor — the
  language tag isn't optional metadata here, it's what turns the feature
  on.
- **`word-break: keep-all`** for CJK — never `break-all`. `break-all` is
  flagged as "catastrophic" for Japanese: it breaks mid-word at arbitrary
  character boundaries, ignoring kinsoku entirely.
- **No italic for emphasis.** `font-style: italic` doesn't exist as a
  meaningful rendering distinction for most Japanese typefaces. Use
  `text-emphasis` (bōten — the small dots placed above/beside characters,
  the native Japanese emphasis mark) instead.
- **Subset the webfont.** A full Japanese font file is commonly 2MB+
  (thousands of glyphs) — unacceptable to ship unsubsetted. Subset to the
  actual character set in use, or use a variable/subsetting service.

## 2. Vertical text (`writing-mode: vertical-rl`) — an inverted axis, not a rotation

Vertical Japanese isn't horizontal text rotated 90° — several properties
invert or stop applying the way Latin intuition expects:

- **`height` caps column length, not `max-width`.** In vertical mode, the
  reading direction runs top-to-bottom within a column, and columns flow
  right-to-left — the axis that constrains "how long is one column of
  text" is `height`, not width.
- **`width: max-content` is required on the text container** — `auto`
  collapses to near-zero in vertical mode (the browser computes width
  along what it thinks is the cross-axis, and for vertical text that's
  the dimension that would otherwise hold zero content). Skipping this
  is the single most common way vertical text renders as a sliver.
- **`text-align: start`, never `justify`.** Justify stretches short
  columns unevenly in the vertical axis — the visual equivalent of
  Latin's ugly justified-text rivers, but worse since column height
  varies more than line width does.
- **Column height target: ~22em (≈20 characters)** — derived from
  genkōyōshi (原稿用紙), the traditional Japanese manuscript grid paper.
  This is the vertical-text equivalent of Latin's `max-width: 65ch` — a
  measure-of-comfortable-reading constant, not an arbitrary number.
- **Known traps:**
  - A flex parent constrains vertical-mode children unpredictably —
    flex's own cross-axis sizing logic and vertical writing-mode's
    inverted axes fight each other. Test vertical text inside any flex
    ancestor specifically; don't assume it behaves like the horizontal
    case.
  - A global `overflow-x: hidden` reset (common in Latin-first
    boilerplate) clips the ENTIRE vertical reading surface, since in
    vertical mode the reading direction runs along what a global reset
    assumes is the non-scrolling axis.

## 3. Quick reference — rule inversion table

| Property/concept | Latin (horizontal) | Japanese (horizontal) | Japanese (vertical, `vertical-rl`) |
|---|---|---|---|
| Line-length unit | `ch` | `em` | — |
| Comfortable measure | ~65ch | ~30-40 characters | ~22em / ~20 characters (column height) |
| Line-height | ~1.5-1.6 | >= 1.7 | >= 1.7 |
| Word breaking | `normal` | `keep-all` + `line-break: strict` (needs `lang="ja"`) | same |
| Emphasis | italic | `text-emphasis` (bōten dots) | `text-emphasis` |
| Sizing constraint axis | `max-width` | `max-width` | `height` |
| Container width/height | `auto` fine | `auto` fine | `width: max-content` required |
| Alignment for short measure | `justify` acceptable | `justify` acceptable | `text-align: start` only |

## Boundaries

General "don't assume Latin metrics, detect script, size CJK/Arabic type
differently" stance lives in rtl-i18n-ui.md §5 — that file is where to
start for ANY non-Latin script. This file is the Japanese-specific
concrete ruleset once a project actually needs it; don't front-load these
rules into a project that has no Japanese content.
