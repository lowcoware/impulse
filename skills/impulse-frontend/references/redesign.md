# Redesign protocol — brand/design preservation

Distinct from `impulse-legacy` (code safety: characterization tests, blast
radius, before touching unfamiliar CODE). This file governs the DESIGN
decision layer of the same task: what to preserve, what to modernize, in
what order. Use both together on a real redesign — impulse-legacy protects the
code, this file protects the brand.

## 1. Detect the mode first

| Mode | When |
|---|---|
| Greenfield | no existing site, or full overhaul explicitly approved — Design Read + dials apply cold |
| Redesign — preserve | modernize without breaking the brand — audit first, extract tokens, evolve |
| Redesign — overhaul | new visual language over existing content — treat visuals as greenfield, preserve content/IA |

Ambiguous → ask exactly once: "Preserve the existing brand, or start
visually from scratch?" (registers.md one-question rule).

## 2. Audit before touching

Document the current state before proposing anything:

1. Brand tokens — accent/primary colors, type stack, logo treatment, radii.
2. Information architecture — page tree, primary nav, conversion paths.
3. Content blocks — what's doing work, what's filler.
4. Patterns to preserve — signature interactions, recognisable hero, copy
   voice.
5. Patterns to retire — ai-tells.md violations, broken layouts, dead links,
   generic stock imagery, perf traps. reference-critique.md's gap analysis
   against the vendored corpus is the deeper version of this step when the
   ask is specifically "what's weak" / "how does this compare".
6. Dial reading of the existing site (registers.md's VARIANCE/MOTION/
   DENSITY) — that's the starting point, not the brand-new baseline.
7. SEO baseline — ranking pages, meta titles, structured data, OG cards.
   **SEO regression is the #1 redesign risk** — never silent.

**After the redesign ships, the comparison itself needs structure, not a
flat list of differences.** Categorize every visual/behavioral change
three ways — regression (worse than before, needs a fix), improvement
(the intended win), neutral (changed but no better/worse) — rather than
reporting "N differences found." A flat diff makes the user re-derive
which changes were the point and which are accidental fallout; the
three-way split does that work up front.

## 3. Preservation rules

1. Don't change information architecture unless asked — slugs, anchor IDs,
   primary nav labels stay stable (SEO + muscle memory).
2. Extract brand colors before applying tokens.md's Lila Rule — a brand
   that's already purple stays purple (the rule's own override clause).
3. Preserve copy voice unless a rewrite was asked for. Visual modernization
   is not content rewrite.
4. Don't regress existing a11y wins: focus states, alt text, keyboard nav,
   contrast.
5. Don't rename buttons/fields/section IDs analytics depends on.

## 4. Modernization levers — priority order

Stop when the brief is satisfied:

1. Typography refresh — biggest visual lift per unit of risk.
2. Spacing/rhythm — section padding, vertical rhythm.
3. Color recalibration — desaturate, unify neutrals, keep the brand accent.
4. Motion layer — add register/dial-appropriate motion to existing
   components (motion.md).
5. Hero + key-section recomposition (vocabulary.md patterns).
6. Full block replacement — only when the existing block is unsalvageable.

### 4a. De-slop order of operations

When lever work includes clearing ai-tells.md violations, fix in this order —
each level upstream makes hits downstream disappear for free:

1. Tokens/theme first (colors, radius, fonts in `@theme`/DESIGN.md) — one
   token fix clears every call site at once.
2. Shared components second.
3. One-off call sites third.
4. Copy last.

Editing call sites before tokens is the churn trap: every hit fixed by hand,
then the token change rewrites them again. And a de-slop pass is confirmed by
the rendered page, not the grep count — a passing scan is not a better page
(same rule as preflight #27 Core Web Vitals: verify the artifact, not the
counter).

## 5. Evolution vs full redesign

IA/content/SEO sound → targeted evolution (levers 1-4): most of the value at
a fraction of the risk. Visual debt is structural (broken IA, no design
system, broken mobile) → full redesign with strict content preservation.
Brand itself is changing → greenfield.

## 6. Never changes silently

URL/route slugs · primary nav labels · form field names/order (breaks
analytics + autofill) · brand logo/wordmark · existing legal/consent/cookie
copy. Any of these needs explicit user approval, not an inferred improvement.
