# Reference mining — combine vendored sources like a designer, not a copier

Everything design-contract.md's Part A does for ONE reference, this file
does for MANY: on request ("combine X's hero with Y's palette", "pull the
best bits from these three"), or proactively on a greenfield build with no
reference named, mine the vendored catalogs for complementary pieces and
assemble ONE coherent direction — never present a blended mush, never
silently copy a whole moodboard wholesale.

## When it fires

- User names 2+ sources to combine, or asks to "pull from" / "borrow from"
  / "mix" named references.
- Greenfield build, no DESIGN.md, no single reference named, register is
  `brand` — before defaulting to a from-brief resolve (design-contract.md
  Part B), check whether 1-2 vendored sources would give the brief a
  sharper, less-generic direction than resolving from adjectives alone.
  Product register rarely needs this — system_ui + one accent is usually
  the right answer; don't reach for mining reflexively there.

## What's minable

| Source | Location | What to take |
|---|---|---|
| Structural shapes | `design-templates/<name>/` (115, see template-catalog.md) | layout skeleton, composition logic, section rhythm — never the baked copy/imagery |
| Token/color systems | `design-systems/<name>/` (153, see brand-systems-catalog.md) | color temperature, type scale, spacing rhythm — real-brand packages are STUDY material only (see Boundary below); aesthetic-family/mood packages are free to lift as-is |
| Pattern vocabulary | vocabulary.md | names to reach for deliberately instead of the nearest AI-default (hero paradigm, nav, card, scroll pattern) |
| Motion layer | motion-craft.md + gsap-api.md | easing/duration/spring family, gesture physics — one motion voice across the whole combined direction, not per-source |
| Structural constraints | ux-laws.md | keeps the combination usable, not just a collage of nice parts |

## The combine method

1. **Pick at most one source per axis** — one structural shape, one
   token/color system, one motion voice. Combining two structural shapes
   or two color systems is how a design becomes a collage; combining one
   of each is how it becomes a direction.
2. **Run design-contract.md §3's Keep/Change/Do-not-copy split on EACH
   source independently** before combining — mining doesn't skip the
   contract, it just runs it N times instead of once.
3. **State the audit trail in one line per axis**, so the mix is never
   silent: `structure: <template-name> · palette/type: <brand-system-name>
   · motion: <voice name>`. This line goes in design-contract.md's
   decision record, not just chat — the next agent needs to know what was
   mined without re-deriving it.
4. **Still freeze ONE direction** (design-contract.md §2 step 4) — mining
   multiple sources is not a menu; it's assembly toward the single
   direction that gets built. If two mined pieces actively fight (a
   maximalist structural shape + a minimal token system), that's a
   decision point to resolve now, not carry into the build as tension.
5. **ai-tells.md still sits upstream of every mined piece** — a template
   or brand package that itself trips a ban (gradient text, fake stat row,
   AI-purple glow) doesn't launder the ban by being vendored reference
   material.

## Boundary — real brands are for craft, not identity

Real-brand packages (`brand-systems-catalog.md`'s "Real product/company
brands" list — apple, stripe, linear-app, notion, etc.) are structural and
craft evidence: how they handle density, type scale, spacing, color
temperature. Never combine two real brands' distinctive marks into one
identity (a logo-adjacent mark, a signature color+shape pairing that
reads as "that's basically X's identity") — that crosses from "informed
by" into brand appropriation, the same do-not-copy line design-contract.md
§3 already draws for a single reference. Aesthetic-family and mood
packages (brutalism, claymorphism, editorial, ...) carry no such risk —
combine freely.

## Boundaries

- Single-reference evidence contract (screenshots, one URL, "like X") =
  design-contract.md Part A — this file is what to do when there's more
  than one source worth mining.
- Which packaged shape/brand exists and where = template-catalog.md /
  brand-systems-catalog.md — this file is the combination method on top
  of those maps.
- What a mined piece may not do regardless of source = ai-tells.md.
