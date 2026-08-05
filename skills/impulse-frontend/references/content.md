# Content density — long-list alternatives, quotes, copy self-audit

Numeric copy limits (headline/subtext word caps, filler-verb bans, fake-name
bans) live in `ai-tells.md` §4. This file is the positive-recipe layer: what
to build INSTEAD of the lazy default when content is long or dense.

## 1. Long lists need a different component, not a longer list

Default `<ul>` + `divide-y` past 5 items is the lazy choice (ai-tells.md
§6.3). Reach for instead:

| Content shape | Component |
|---|---|
| Groupable items (2-3 categories) | grouped chunks, one soft divider + heading per cluster |
| Item needs an image/label | card grid, 2-col desktop / 1-col mobile |
| Categorisable | tabs or accordion |
| Breadth over depth (logos, capabilities) | horizontal scroll-snap pills, or a marquee (max 1/page — motion.md) |
| Testimonials, breadth-heavy | carousel |

## 2. Spec sheets specifically

A long spec table with `border-b` on every row is the AI-cliche default for
cookware/hardware/apparel/artisan briefs (ai-tells.md §2 bans this shape
generally). Concrete alternatives:

- **2-col card grid:** each spec its own card — name, value as a large
  display number, one-line "why it matters" body.
- **Scroll-snap pills:** one spec per pill, flick through.
- **Grouped chunks:** cluster specs into 2-3 logical groups (e.g. Materials /
  Cooking / Warranty), one soft divider + heading per cluster.
- **Featured-vs-rest:** 3-4 hero specs as large display tiles, the rest
  behind a "View full specifications" disclosure.

## 3. Copy self-audit (mandatory before ship)

Re-read every visible string — headlines, subheads, eyebrows, button labels,
body, captions, alt text, footer, error messages. Flag and rewrite plain if
any is:

- grammatically broken ("free on its past", "two plans but one is honest")
- unclear-referent ("we plan to stay that way" with no antecedent)
- AI-hallucinated wordplay — forced metaphor that doesn't track
- performative-craftsman ("field notes", mock-poetic micro-meta)

Unsure whether a string makes sense → replace with a plain functional
sentence. Boring-but-clear beats clever-but-wrong every time.

## 4. Fake-precise numbers

`92%`, `4.1×`, `48k`, `5.8mm` are fine when they come from real data, or are
explicitly labeled mock (`<!-- mock -->`, "example"). Invented engineering-
precision aesthetics the brand doesn't actually claim — banned (ai-tells.md
§4 already counts this; this is the "why" — don't fake a level of rigor
nobody asked for).

## 5. Quotes

Max 3 lines of quote body (footer-scale testimonials can stretch slightly —
spirit is "fits in a glance"). Attribution = name + role + optional company,
never name-only. Typographic quotes (" ") or none — never straight ASCII.
Zero em-dash inside quote text (ai-tells.md §4 — no exception for quotes).

## 6. Theme-lock exception

registers.md's theme lock (one theme per page) has exactly one carve-out: a
deliberate "Color Block Story" / "theme switch on scroll" device, used once
per page with a real transition — never random section-by-section
alternation. If you can't name the device, it's not this exception.
