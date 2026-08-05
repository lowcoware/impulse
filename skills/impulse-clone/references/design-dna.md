# Design DNA: structured design identity (visual-clone / rebrand modes only)

From nexu-io/open-design web-clone (Apache-2.0), re-expressed for the impulse suite.
Method and schema adapted from zanwei/design-dna (MIT), trimmed to this skill's needs.

Turns "make it feel like that site" into a versionable, diffable JSON spec.
Produced after recon, before scaffolding, so the content-swap step has a
contract: **DNA stays, content goes.**

## Applicability boundary (read first)

DNA's philosophy is "approximate the style" — it yields a style-consistent NEW
site, not a byte copy. That is the opposite direction from the faithful-clone
iron rule (real source above all). So:

| Mode | DNA? |
|---|---|
| Faithful clone (real source / single-file / byte-level WebGL) | **No.** Real source is the truth; don't dilute it into "approximately" |
| Visual clone (look-alike, simplified internals) | **Yes** — DNA is this path's main artifact |
| Rebrand (keep IA + rhythm + visual grammar, swap content) | **Yes** — DNA defines what to keep |

One line: DNA is for "make my own site out of this", never for "carry it over
identically".

## Three layers

1. **`design_system`** — measurable tokens: color / typography / spacing /
   layout / shape / elevation / iconography / motion / components. Lands
   directly as CSS custom properties.
2. **`design_style`** — subjective perception: aesthetic (mood/genre/era),
   visual_language, composition, imagery, interaction_feel, brand_voice_in_ui.
   Guides judgment calls.
3. **`visual_effects`** — rendering beyond plain CSS: background / particles /
   3d / shader / scroll / text / cursor / image / glass-neu / canvas / svg.
   Decides whether Canvas/WebGL/GSAP enters at all, and connects to the
   reverse-engineering branch.

## Three-step workflow

1. **Structure** — start from the skeleton `dna-scaffold.mjs` emits (it is the
   authoritative full schema); prune dimensions that don't apply.
2. **Analyze** — fill from recon artifacts, not from memory:
   - Colors: recon JSON `cssVariables` (custom-property color values) +
     `sections[].style` backgroundColor/color; primary by area, accent by CTA.
   - Fonts: `fonts` array + `sections[].style.fontFamily`, split
     heading/body/mono.
   - Spacing/layout: screenshots + `sections[].rect` for rhythm and max width.
   - Effects: `frameworks.three/gsap/lenis` + `canvases` + `counts.canvas` fill
     `visual_effects.overview.primary_technology` and the enabled flags.
   - Style/perception: judge mood/genre/composition/whitespace from the three
     screenshot widths (1440/768/390) by eye — this layer is legitimately human.
   - Fill every field with substance; anything unfillable gets `TODO` plus what
     evidence is missing. No empty strings pretending to be answers.
3. **Generate** — parse DNA, emit CSS custom properties, make the subjective
   calls per `design_style`, pick the implementation tier per
   `visual_effects.overview.effect_intensity`
   (lightweight = CSS/SVG/vanilla; medium = Canvas2D/GSAP/Lottie;
   heavy = Three.js/GLSL/Pixi), build pages, pour in the user's own content.
   Assets come from the original via `asset-harvest.mjs` where licensing allows
   — never AI-redraw approximations of real photography.

## Scaffold

```bash
node scripts/dna-scaffold.mjs --recon RECON/original-recon.json --out RECON/design-dna.json --name "site"
```

Pre-fills fonts, color candidates, and framework/effect signals best-effort from
the recon; everything else stays empty for manual analysis. Runs without
`--recon` too (pure empty skeleton). Discipline: the script only carries signals
the recon actually captured; ambiguous color roles land in `_recon_signals` for
manual assignment.

## Schema shape (full field list lives in dna-scaffold.mjs)

```json
{
  "meta": { "name", "description", "source_references", "created_at" },
  "design_system": {
    "color":      { "palette_type", "primary/secondary/accent {hex, role}", "neutral", "semantic", "surface", "contrast_strategy" },
    "typography": { "type_scale (display..overline: size/weight/line_height/tracking)", "font_families {heading, body, mono}", "font_style_notes" },
    "spacing":    { "base_unit", "scale", "content_density", "section_rhythm" },
    "layout":     { "grid_system", "max_content_width", "columns", "gutter", "breakpoints", "alignment_tendency" },
    "shape":      { "border_radius {small..pill}", "border_usage", "divider_style" },
    "elevation":  { "shadow_style", "levels", "depth_cues" },
    "iconography":{ "style", "stroke_weight", "size_scale", "preferred_set" },
    "motion":     { "easing", "duration_scale {micro, normal, macro}", "entrance_pattern", "exit_pattern", "philosophy" },
    "components": { "button_style", "input_style", "card_style", "navigation_pattern", "modal_style", "list_style" }
  },
  "design_style": {
    "aesthetic":        { "mood[]", "visual_metaphor", "era_influence", "genre", "personality_traits[]", "adjectives[]" },
    "visual_language":  { "complexity", "ornamentation", "whitespace_usage", "visual_weight_distribution", "focal_strategy", "contrast_level", "texture_usage" },
    "composition":      { "hierarchy_method", "balance_type", "flow_direction", "grouping_strategy", "negative_space_role" },
    "imagery":          { "photo_treatment", "illustration_style", "graphic_elements", "pattern_usage", "image_shape" },
    "interaction_feel": { "feedback_style", "hover_behavior", "transition_personality", "loading_style", "microinteraction_density" },
    "brand_voice_in_ui":{ "tone", "formality", "cta_style", "empty_state_approach", "error_tone" }
  },
  "visual_effects": {
    "overview":           { "effect_intensity", "performance_tier", "fallback_strategy", "primary_technology" },
    "background_effects": { "type", "description", "technology", "params" },
    "particle_systems":   { "enabled", "type", "params {count, movement_pattern, interaction, ...}" },
    "3d_elements":        { "enabled", "type", "params {renderer, lighting, camera, materials, post_processing, ...}" },
    "shader_effects":     { "enabled", "type", "params {uniforms, noise_type, distortion, ...}" },
    "scroll_effects":     { "parallax", "scroll_triggered_animations", "scroll_morphing" },
    "text_effects":       { "type", "params {split_strategy, stagger, ...}" },
    "cursor_effects":     { "enabled", "type", "params" },
    "image_effects":      { "type", "params {filter_pipeline, distortion_type, ...}" },
    "glassmorphism_neumorphism": { "enabled", "style", "params" },
    "canvas_drawings":    { "enabled", "type", "params" },
    "svg_animations":     { "enabled", "type", "params" },
    "composite_notes": ""
  }
}
```

## Division of labor with the WebGL branch

- Sites flagged heavy-immersive / WebGL / `shader_effects.enabled` — do NOT use
  DNA to "approximate" the effect. That work belongs to `effect-extraction.md`:
  reverse the real implementation or capture it at runtime.
- On such sites DNA covers everything AROUND the effect (palette, type, layout,
  ordinary motion); the effect itself goes through the evidence-graded pipeline.
