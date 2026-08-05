# Typography — display/body defaults, serif discipline, pairings

Type rules were `ai-tells.md` §5 — moved here as the section grew past a one-table footnote. `ai-tells.md` keeps a pointer, not a copy.

## 1. Display / body defaults (brand register)

| Role | Default |
|---|---|
| Display/headline | fluid `clamp()`, tracking floor -0.04em (default -0.02 to -0.03em), display cap 6rem — registers.md |
| Body/paragraph | >= 16px, prose measure 65-75ch, `text-wrap: pretty` |
| Headings | `text-wrap: balance` on h1-h3 |

Measure 65-75ch matches the field's own converging number (50-75
characters, 66 most-cited) from eye-tracking/saccadic-movement research —
not an arbitrary pick. Line-height pairs with measure, not independently:
1.5-1.6x supports natural eye movement at this width; tighten only for a
demonstrably larger-x-height face.
[Baymard: the optimal line length for readability](https://baymard.com/blog/line-length-readability)

Display size is for the two-three words that can carry it. A full marketing
sentence at `text-6xl font-extrabold tracking-tight`, wrapping to 3+ lines, is
size standing in for the decision about what matters: compress the one thing
into a few words, say the rest in a normal-size subline. The tracking floor
(-0.04em) is the same rule from the other side — crushing letter-spacing past
where the face keeps its shapes is "designed" cosplay. After shortening a
headline, re-check its `max-width`: a measure sized for the old sentence
re-wraps the short one and undoes the fix — verify rendered, not just the copy.

Tracking is size-specific — one `letter-spacing` for all sizes is wrong
somewhere: display text wants negative tracking (letters drift apart as
they grow — hence the floor above), body sits near 0, small/caps text wants
slightly positive — ALL CAPS specifically requires +0.06em to +0.1em, not
"a bit". Leading tracks size inversely: tight on display (1.05-1.1),
looser on body (1.5+). Build hierarchy from weight + size + leading as a
set, not size alone.

## 2. Sans-serif pool (default family)

Discouraged as reflex default: Inter (registers.md brand bans — reflex-default fonts). Pick from brand-voice words first; catalog options: Geist, Outfit, Cabinet Grotesk, Satoshi, PP Neue Montreal, ABC Diatype, Söhne Breit. Inter is fine when the brief explicitly wants neutral/standard/Linear-style, or on product register (system/Inter stack allowed there).

Pairings: `Geist` + `Geist Mono`, `Satoshi` + `JetBrains Mono`, `Cabinet Grotesk` + `Inter Tight`, `GT America` + `IBM Plex Mono`.

## 3. Serif discipline

1. Serif is very discouraged as the default. "Creative brief = serif" is the single most-tested AI tell — it is a reflex, not a decision.
2. Serif justified only when: the brief names a serif font explicitly, OR the aesthetic is genuinely editorial/luxury/publication/heritage AND you can state in one line why this specific serif fits this specific brand.
3. **Banned outright as defaults:** `Fraunces`, `Instrument Serif` — the two LLM-favorite display serifs. Using either without the justification in rule 2 is a fail.
4. When serif is justified, rotate — never reuse the same serif across consecutive projects (registers.md anti-default discipline #2 generalizes to serif choice specifically): PP Editorial New, GT Sectra Display, Cardinal Grotesque, Reckless Neue, Tiempos Headline, Recoleta, Cormorant Garamond, Playfair Display, EB Garamond, IvyPresto, Migra, Söhne Breit Kursiv, Domaine Display, Canela, Schnyder, Tobias, NB Architekt, ITC Galliard.

## 4. Emphasis and italic

1. Emphasis inside a headline = italic or bold of the SAME family. Mixed-family emphasis (random serif word dropped into a sans headline) is amateur — zero instances.
2. Italic display word containing a descender letter (`y g j p q`): `leading-[1.1]` minimum + `pb-1`/`mb-1` reserve, or the descender clips. Audit every italic word in display headlines before shipping.
