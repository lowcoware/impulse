# Palette — the corpus's shared design language

NOT the default visual system. The canonical baseline every artifact
inherits is `self-reference.html` (SKILL.md workflow step 2); this file is
a fallback for component patterns (dot/pill/delta, semantic states) where
self-reference.html is silent, and documentation of what the vendored
gallery converges on.

Extracted directly from the gallery, not eyeballed: 20 of the 21 examples in
`examples/` independently converge on the SAME token set (same names, same
hex values, minor whitespace-only formatting drift). That convergence is
itself the signal — this is Anthropic's own document design language, not
one file's individual taste. A project with its own
DESIGN.md/brand tokens (impulse-frontend territory) overrides
self-reference.html same as any other default.

## Core tokens

```css
:root {
  --ivory:   #FAF9F5;  /* page background — warm paper, never pure white */
  --slate:   #141413;  /* ink — body text, never pure black */
  --clay:    #D97757;  /* the one accent — primary CTA, active state, links */
  --oat:     #E3DACC;  /* secondary surface — cards, subtle fills */
  --olive:   #788C5D;  /* semantic: good / resolved / low-risk / up */
  --rust:    #B04A3F;  /* semantic: bad / high-risk / danger */
  --white:   #FFFFFF;

  --gray-50:  #F7F6F2;
  --gray-100: #F0EEE6;
  --gray-200: #D1CFC5;  /* also seen as gray-300 across files — same value */
  --gray-300: #D1CFC5;
  --gray-500: #87867F;  /* muted text */
  --gray-700: #3D3D3A;  /* also seen as gray-800 — same value */
  --gray-800: #3D3D3A;

  --serif: ui-serif, Georgia, serif;
  --sans:  system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --mono:  ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
```

`--gray-200`/`--gray-300` and `--gray-700`/`--gray-800` appear as
duplicate-value aliases across different files (same hex, different name) —
pick ONE name per artifact and hold it; don't ship both aliases in one file.

## Dark variant

None of the Anthropic gallery files implement an actual `html.dark` block —
they're light-mode-only demonstrations. `dark-mode.md`'s mandate still
applies to every artifact THIS skill produces; derive the dark equivalents
from the same relationships the light values already express (ivory's job
is "warm paper," so its dark counterpart is a warm near-black, not a
desaturated gray):

```css
html.dark {
  --ivory: #17140F;   /* warm near-black, not neutral #000/#111 */
  --slate: #EDEAE3;
  --clay:  #E8926E;   /* lightened ~1 step for AA contrast on dark */
  --oat:   #23201A;
  --olive: #9DB07C;   /* lightened variant, seen in 2 gallery files */
  --rust:  #D26B5C;   /* lightened for contrast */
  --white: #17140F;   /* "white" surface role, inverted */
  --gray-100: #23201A;
  --gray-300: #3D3830;
  --gray-500: #8F8B80;
  --gray-700: #C9C4B8;
}
```

## Semantic color mapping (confirmed usage across the corpus)

| Token | Means | Seen on |
|---|---|---|
| `--olive` | good / resolved / done / low-risk / trending up | resolved pills, done checkmarks, low-risk dots, positive deltas |
| `--rust` | bad / high-risk / danger | high-risk dots, error states |
| `--clay` | the accent — active/impact/medium, never a second meaning | impact timeline dots, medium-risk dots, links, primary actions |
| `--gray-500` | muted / flat / secondary text | flat deltas, captions, timestamps |

Three-state severity ladders (risk dots, status timelines) use exactly
`olive -> clay -> rust` (low -> medium -> high) — that's the corpus's
convention for a semantic traffic-light without reaching for literal
green/amber/red.

## Typography scale — document register, not marketing register

This corpus's type scale is DENSE and small — the opposite end from
impulse-frontend's landing-page display sizes. An artifact is read up close on
a screen, not glanced at from six feet:

| Role | Size | Notes |
|---|---|---|
| Body / dense UI text | 11-15px | the dominant working range across every file |
| Section label / eyebrow | 12-13px | paired with uppercase + letter-spacing below |
| Hero number / display stat | 24-38px | rare, reserved for the one number that matters (a status report's headline metric) |

Uppercase micro-labels get real tracking, never a bare `text-transform:
uppercase`: `letter-spacing: 0.04em` to `0.1em`, most commonly `0.06-0.08em`.
Unlike impulse-frontend's marketing-page eyebrow ban (ai-tells.md #10-11,
registers.md) — a dense document artifact's section labels and status
pills are a different register where this earns its place; the ban is
about landing-page templating reflexes, not every possible use of small
caps.

## Radius scale

`4px` (tight — chips, small controls) · `6-8px` (rows, small cards) ·
`10-12px` (panels, primary containers) · `999px` (pills — full round).
Hold ONE scale per artifact; don't mix an ad-hoc radius in.

## Component patterns

### Status dot (three-state severity)

```css
.status-dot {
  width: 9px; height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.low  { background: var(--olive); }
.status-dot.med  { background: var(--clay); }
.status-dot.high { background: var(--rust); }
```

### Pill (status/state label)

```css
.pill {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-family: var(--sans);
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  padding: 5px 12px;
}
.pill.resolved { background: var(--olive); color: var(--white); }
```

### Delta indicator (up/flat/down)

```css
.stat-delta.up   { color: var(--olive); }
.stat-delta.flat { color: var(--gray-500); }
/* down would be --rust, following the same three-state ladder */
```

These are starting points to adapt, not a component library to import
verbatim — the value is the RELATIONSHIP (severity maps to olive/clay/rust,
labels get real tracking, radius holds one scale), not the exact pixel.
