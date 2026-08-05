# Image pipeline — design references before code

Distilled from Leonxlnx's taste-skill `imagegen-frontend-web` + `image-to-code`
+ `brandkit` skills (MIT), re-expressed for the impulse suite.

`images.md` governs images as page ASSETS (what fills an `<img>` slot, logo
walls, product previews). This file governs images as DESIGN REFERENCES —
generated section comps that precede code and act as the visual source of
truth. Different job, different rules; both can fire on the same task.

Prompt presets: nexu-io/open-design `prompt-templates/` (image/ + video/
JSON presets — avatars, game screenshots, infographics) is a reusable
starting library for generation calls; adapt, don't invent from zero when a
preset matches.

## 1. When the pipeline fires

1. Two conditions, both required: an image-generation tool is available in
   the environment, AND the task is visually important — landing page, hero,
   marketing site, portfolio, product page, redesign where looks matter, or
   anything briefed mainly in visual terms.
2. Fires → the order is mandatory: generate references first, analyze them
   second (§6), implement third (§7). Never open with freeform coding on a
   visual task, never design "from taste" in code when the tool is there.
3. Does NOT fire: bug fixes, structural/technical work, dashboards behind
   auth, tasks where the user already supplies a precise design system or
   their own reference images (skip to §6 analysis on theirs). No gen tool →
   this file is inert; images.md priority ladder steps 2-3 apply.

## 2. One image per section — hard rule

4. N sections = N separate horizontal images, each its own generation call.
   Never one compressed board, never one tall page slice, never a collage,
   never "one best image" standing in for the set. Compression makes text,
   spacing, and buttons too small to extract — the whole pipeline degrades.

| Brief says | Sections → images |
|---|---|
| "hero" / one section | 1 |
| "landing page" / "site template" (no count) | 6 |
| "product page" / "portfolio" | 6 |
| "full website" / "full template" / "marketing site" | 8 |
| Explicit count N | N, exactly |

Default 8-pack: hero, trust bar, features, product showcase, benefits,
testimonials, pricing, CTA. 12-pack adds problem/solution, workflow,
metrics, FAQ + footer.

5. Format: horizontal always — 16:9 or 21:9 for the hero, 16:10 acceptable
   for narrower content sections. One focused section per frame, rendered
   large enough that a developer can read every label.
6. If the tool renders one image per call, run the calls sequentially,
   labeled "Section X of N: name", until the set is complete. Stopping early
   or summarizing the rest is under-generation (§5).

## 3. Hero rules

7. Left-text / right-image is the most overused AI hero. Allowed, never the
   default. Before rendering, check: "am I drafting text-left/image-right out
   of habit?" — if yes, pick another anchor: centered over full-bleed image
   (text in lower 40%), bottom-left over image, bottom-right, top-left lead,
   stacked center, image-as-canvas with a clean safe area, off-grid editorial
   offset, or the inverted classic.

| Hero scale (pick 1 per page, decisively) | Shape |
|---|---|
| Giant statement | massive type, large image, dominant first viewport |
| Mid editorial | balanced type/image, cinematic but not screen-filling |
| Mini minimalist | small logo + short statement + thin CTA, mostly negative space |

Mini is not weak — it is confident restraint. Do not split the difference
between scales.

8. Headline: 5-10 strong words, 1-2 lines preferred, 3 max. Wrapping to 4+ →
   cut words, don't add lines. Supporting text concise, one focal point,
   obvious hierarchy.
9. First-view rule: the first screen must read clean on a small laptop —
   headline, supporting line, one primary CTA, one focal visual. No pills,
   fake stats, badge rows, tiny logo strips, or pseudo-system labels
   ("00 orchestration layer") crowding the fold.

## 4. Variation engine

10. Pick one option per axis and commit — coherence comes from committing,
    variety comes from which options differ per section. Do not mash axes
    into chaos.

| Axis | Scope | Options |
|---|---|---|
| Theme paradigm | page | pristine light / deep dark / bold studio solid / quiet premium neutral |
| Typography character | page | clean grotesk / refined grotesk / expressive display / compressed statement / serif+sans editorial / Swiss rational |
| Hero scale | page | giant / mid / mini (§3) |
| Section system | page | bento rhythm / alternating editorial / poster stack / gallery cadence / Swiss grid / asymmetric marketing flow |
| Composition anchor | section | centered statement / top-left lead / bottom-left over image / bottom-right CTA cluster / left-third caption (sparingly) / right-third caption / centered low / off-grid offset / stacked center / image-as-canvas |
| Background mode | section | solid + inline asset / texture-paper-grid / full-bleed image + tonal overlay / editorial side-image 50-50 or 60-40 / flat color block + detail crop / tonal gradient / graded or duotone photo / radial vignette + product / color-blocked diptych |
| CTA style | section | primary pill / outline-ghost / underlined inline + arrow / full-width banner / oversized headline + tiny hint / caption under visual |

11. Consecutive images must vary the combination: same composition anchor
    max 2 sections in a row, same background mode max 3 in a row, at least
    3 different anchors across the page, CTA style varies at least once.
    Left-third caption never twice in a row.
12. Multi-image consistency: across all frames of one page — ONE palette
    (1 primary + 1 secondary + 1 accent + neutral scale), one type family
    and scale logic, one CTA identity, one radius language, one image
    treatment (grade, framing, materials), one copy voice. Variation lives
    in anchors, background modes, and section size; anything that breaks
    brand recall across frames is over-variation.
13. Section size rhythm: mix ambition deliberately — some frames rich and
    art-directed, some mini and mostly negative space, some medium editorial.
    Uniform slabs read generated; keep inter-section spacing even anyway.
14. Non-minimalist briefs: at least one full-bleed (or duotone/atmospheric)
    background and at least one mini minimalist section per multi-section
    set. Minimalist/Swiss briefs: rule suspended — restraint is the design.

## 5. Generation hygiene

15. Never crop, zoom, or slice an old image to fake a section or detail
    reference — cropping destroys spacing accuracy, type-scale
    relationships, margins, and proportions. Need a closer look → generate a
    FRESH image of that section in the same palette, type mood, button
    style, and radius logic, optimized for readability.
16. Anti-under-generation: too many clear images beats too few compressed
    ones. If another image would improve text readability, typography or
    spacing extraction, button inspection, or color reading — generate it.
    Never shrink the count for convenience.
17. Detail/extraction close-ups are cheap and allowed: a tighter hero render
    to read headline + CTA, a pricing-card close-up, a navbar treatment
    shot, a typography-and-spacing-only frame. Use them whenever a
    component in the primary frame is too small to analyze.
18. A section still unclear after a close-up → regenerate it as a fresh
    standalone frame: same design system, larger text, more visible
    spacing, calmer composition. That is a cleaner render of the same
    design, not a new design.
19. **Publication-critical text (a real title, a real price, a real date,
    a real CTA) never rides on the image model rendering it correctly.**
    This pipeline is for design REFERENCES the code implements afterward —
    text in these images is a layout/mood cue, not the delivered copy, so
    this rarely bites here. It matters if this skill's output is ever a
    finished visual asset distributed as-is (a generated poster/social
    card/key visual, not a coded page) — in that case, generate the
    background/texture/mood freely, then composite the actual text as real
    editable text/DOM afterward rather than trusting the image model's
    render of it.

## 6. Analysis pass — extract before you code

19. Treat the frames as a design spec, not a mood. No vibe-only glances,
    no jumping straight to code. Per frame, extract:

| Extraction | What to pull |
|---|---|
| Text | exact readable copy: headline, subheadline, CTA labels, section titles, nav/footer labels, pricing labels, testimonial names — visible text is part of the design system, use it |
| Typography | families/mood, weight relationships, size-scale ratios, line count and wrap behavior, line-height and tracking feel, display-vs-body contrast |
| Spacing | headline-to-sub, text-to-button, card gaps and padding, section top/bottom, side gutters, image-to-text distance — faithful spacing logic, not pixel OCR |
| Buttons/components | size, shape, radius, fill vs outline, primary/secondary hierarchy, icon usage, card structure, dividers, shadows, input styling |
| Color | background, panels, accent, button fills, text hierarchy, border logic, image grade — preserve the palette, never swap in default web colors |

20. Anything still unreadable → back to §5 for a close-up before coding.
    Guessing a detail that one extra generation would answer is a bug.
21. Reduction happens on this pass, not later: strip nested boxes (cards
    inside cards inside a giant rounded wrapper — one framing move per
    section, open layout otherwise) and micro-UI clutter (filler pills,
    fake status chips, decorative system markers, metadata rows that carry
    nothing). The generator sometimes draws them; the analysis deletes them.
22. Fixed media frame rule: images inside the built page sit in controlled,
    repeatable frames — fixed aspect ratios, consistent radius, stable
    proportions across similar modules. No random sizes, no collage chaos
    unless the brief asks for it.

## 7. Implement to match

23. The code is a translation of the reference, not "inspired by" it.
    Preserve layout logic, spacing rhythm, section order, text/image
    balance, typography mood, component style. The rendered page and the
    frames must read as the same site.
24. Anti-drift: do not simplify to a default template, compress generous
    spacing, flatten distinctive typography, or merge varied sections into
    repeated rows during implementation. Drift-to-generic is the #1 failure
    of this pipeline.
25. Ambiguity order: visible design language > layout/spacing logic >
    component family > one more detail image (§5) > only then the most
    faithful implementation-friendly guess. Generic defaults come last.
26. `ai-tells.md` is upstream of any generated reference. Where a frame
    itself violates a ban — em-dash in copy, AI-purple palette, fake stat
    columns, marquee cliches, gradient-text "premium" — the ban wins: fix
    it in the implementation (or regenerate the frame), never copy the
    violation through because "the reference said so".
27. Match-to-reference is visual, not literal-to-a-fault: real fonts from
    the approved stack, real breakpoints, real a11y (contrast, focus
    states) even when the frame is desktop-only.

## 8. Invented brand needs a mark

For the invented-brand case images.md section 2 raises — a made-up brand
needs an SVG mark, not a styled span. Five concept methods; use one, combine
two at most:

| Method | Mechanism | Reach for it when |
|---|---|---|
| Monogram + meaning | brand initial fused with a metaphor via cuts, folds, negative space — never a plain letter-in-shape | brand name is distinctive, one strong initial |
| Product action | the product's core verb abstracted to a symbol (build = frame, protect = shield-boundary, convert = arrow, automate = loop) | product does one nameable thing |
| Metaphor fusion | two meaningful ideas reduced into one mark (shield + mountain, moon + waveform) — subtle, still readable | brand story has two pillars |
| Negative space | empty space carries the intelligence: hidden arrow, cutout initial, protected center — crisp edges mandatory | mark must feel clever without added ink |
| Construction geometry | mark built from a visible system: circles, grids, diagonal cuts, modular blocks, orbital paths | technical/precision brands, works at tiny sizes |

Keep it one or two colors, flat, geometric, legible at 24px, correct in
both themes (registers.md theme lock).

## 9. Boundaries

- Images filling asset slots in the built page (photography sources,
  placeholder URLs, logo walls, no-fake-screenshot rule) = `images.md`.
- No image-gen tool available = `images.md` priority ladder steps 2-3;
  this pipeline never runs on picsum placeholders.
- Palette/type/radius decisions extracted in §6 land in the project's
  token layer = `tokens.md`; register and dial readings = `registers.md`.
- Bans the references must never smuggle into code = `ai-tells.md`.
- Motion the frames only imply (pinned energy, stagger) is implemented
  per `motion.md`, not eyeballed from a static image.
