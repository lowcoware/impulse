# Callouts — full reference

Callouts are styled blockquotes with an icon and color keyed to type. More
legible than a plain blockquote for anything that needs to visually stand
apart from body text — a warning, a decision, an open question.

## Basic syntax

```markdown
> [!note]
> Basic callout, no title — the type name becomes the title.

> [!warning] Custom Title
> Callout with a custom title instead of the type name.

> [!tip] Title Only
```

`[!type]` must be the first thing in the blockquote — right after the `> `
marker, nothing before it. Type identifiers are case-insensitive
(`[!Note]` works). An unrecognized type doesn't error — it silently falls
back to `note` styling, so a typo in the type name won't break rendering,
it'll just render with the wrong icon/color.

## Foldable callouts

```markdown
> [!faq]- Collapsed by default
> Hidden until the reader expands it.

> [!faq]+ Expanded by default
> Visible, but collapsible.
```

Use `-` for detail a skimming reader doesn't need immediately (long
rationale, raw data); use `+` sparingly — a note whose important content is
folded by default confuses more than it organizes.

## Nested callouts

```markdown
> [!question] Outer callout
> > [!note] Inner callout
> > Nested content.
```

One level of nesting reads fine; two is a sign the structure should be
plain headings instead.

## Supported types

| Type | Aliases | Color / icon | Impulse-suite use |
|---|---|---|---|
| `note` | — | Blue, pencil | Generic aside |
| `abstract` | `summary`, `tldr` | Teal, clipboard | TL;DR at the top of a long report |
| `info` | — | Blue, info | Background context reader needs before continuing |
| `todo` | — | Blue, checkbox | Open action item inside a report |
| `tip` | `hint`, `important` | Cyan, flame | A non-obvious operational tip (runbooks) |
| `success` | `check`, `done` | Green, checkmark | Confirmed outcome, closed item |
| `question` | `help`, `faq` | Yellow, question mark | Open question an ADR hasn't resolved yet |
| `warning` | `caution`, `attention` | Orange, warning | Risk, tradeoff, "read before doing X" |
| `failure` | `fail`, `missing` | Red, X | What didn't work, a rejected ADR alternative |
| `danger` | `error` | Red, zap | Irreversible-action warning in a runbook |
| `bug` | — | Red, bug | Known defect worth flagging inline |
| `example` | — | Purple, list | Concrete before/after, sample payload |
| `quote` | `cite` | Gray, quote | Attributed external quote, not a generic aside |

## Custom callouts (CSS)

```css
.callout[data-callout="custom-type"] {
  --callout-color: 255, 0, 0;
  --callout-icon: lucide-alert-circle;
}
```

Only if a vault has a `.obsidian/snippets/` CSS file to hold it — don't
invent a custom type in a generated note that has nowhere to define its
styling. Stick to the built-in table above unless the caller specifically
maintains custom CSS.

## When NOT to use a callout

A callout is a visual interrupt — every one on a page competes for the same
attention. Don't wrap routine prose in `[!note]` just because a box looks
more finished; see `style.md` for the actual decision rule. A doc that's
60% callouts has stopped using them as emphasis and started using them as a
layout crutch.
