# Tokens — DESIGN.md protocol, Tailwind v4 @theme, 3-tier system

Tokens live in the PROJECT (DESIGN.md + `@theme`). Rules live in this skill. "impulse" is the suite name, NOT a theme mandate — theme is a per-project decision recorded in DESIGN.md.

**Ceiling:** this file's DESIGN.md + `@theme` pair is deliberately the
lightweight end — one web app, Tailwind is both the source of truth and
the build output, no separate compile step. Escalate past it only when a
real cross-tool need shows up: tokens need to round-trip with Figma
variables, or the same values need to ship to a native iOS/Android app
alongside the web one. That's the DTCG format (Design Tokens Community
Group spec) + a build tool like Terrazzo — a real JSON token source
compiled to per-platform outputs. Don't reach for it pre-emptively "for
portability" on a single-app project; it's a token *compiler*, and a
compiler with nothing yet to compile to is pure overhead.

## 1. DESIGN.md protocol (per project)

1. Project bring-up → GENERATE `DESIGN.md` at repo root before the first component. No DESIGN.md = no UI code.
2. Every UI task → READ `DESIGN.md` first. Output must match its tokens; preflight check "DESIGN.md tokens matched" fails otherwise.
3. Design direction changes → edit DESIGN.md first, then code. Token change → DESIGN.md AND `@theme` in the same commit. Drift = bug.
4. Format: Stitch 9-section, condensed — target ≤150 lines:

| # | Section | Must contain |
|---|---|---|
| 1 | Visual Theme & Atmosphere | mood, density, register (brand/product), theme (light/dark/system) |
| 2 | Color Palette & Roles | semantic name + value + role per color; the ONE accent named |
| 3 | Typography Rules | families (≤2), hierarchy table: size/weight/line-height/tracking |
| 4 | Component Stylings | buttons, cards, inputs, nav — with states |
| 5 | Layout Principles | spacing scale, grid, container width, whitespace rule |
| 6 | Depth & Elevation | shadows OR surface ladder — pick ONE strategy |
| 7 | Do's and Don'ts | ≥5 each, project-specific, binary phrasing |
| 8 | Responsive Behavior | breakpoints, touch targets ≥24px hard floor (WCAG 2.2), 44px target, collapse strategy |
| 9 | Agent Prompt Guide | quick token reference for future prompts |

## 2. Tailwind v4 @theme mirror

5. DESIGN.md tokens mirror 1:1 into `@theme` in the main CSS file. Names match: DESIGN.md `surface-1` → `--color-surface-1`. No second source of truth.
6. Use the v4 namespaces: `--color-*`, `--font-*`, `--text-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, `--ease-*`, `--animate-*`. OKLCH for all color values.
6a. v4 utility renames — training data still reaches for the old names,
    grep for them: `bg-gradient-to-*` → `bg-linear-to-*` (frees up
    `bg-radial-*`/`bg-conic-*` for radial/conic gradients), `shadow-sm` →
    `shadow-xs` and `shadow` → `shadow-sm` (whole shadow/blur/drop-shadow
    scale shifted one step), `rounded-sm` → `rounded-xs` and `rounded` →
    `rounded-sm`, `outline-none` → `outline-hidden`, bare `ring` → `ring-3`
    (default ring width is no longer implicit). Deprecated `*-opacity-*`
    utilities (`bg-opacity-50`) → slash opacity modifiers (`bg-black/50`).
    [Tailwind CSS v4 upgrade guide](https://tailwindcss.com/docs/upgrade-guide)

```css
@import "tailwindcss";
@theme {
  --color-canvas: oklch(0.15 0.005 265);
  --color-surface-1: oklch(0.19 0.005 265);
  --color-accent: oklch(0.58 0.16 275);
  --font-display: "Family", system-ui, sans-serif;
  --text-display: clamp(2.5rem, 6vw, 5rem);
  --radius-md: 0.5rem;
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}
```

## 3. Three tiers: global → alias → component

| Tier | Example | Rule |
|---|---|---|
| Global | `--color-blue-500` | raw values live ONLY here |
| Alias | `--color-action-primary` | semantic, references global; theming happens at this tier |
| Component | `--button-color-primary` | add only when a component needs variants — skip otherwise |

7. Naming: `{category}-{property}-{variant}-{state}`.
8. Components reference alias/component tokens only. Raw values in `.vue` files = 0: no hex, no `text-[#...]`/`bg-[#...]`, no inline `style="color: ..."` (grep-checkable).
9. Small project → global + alias is enough. Add the component tier at the first real theming need, not before.

## 4. Spacing and radius discipline

10. Base unit 4px. Scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96. Every margin, padding, gap ∈ scale.
11. Arbitrary spacing (`p-[13px]`, `mt-[27px]`) = 0. Off-scale need → add a token, never inline.
12. ONE section-rhythm token (64-128px) for vertical space between page sections. Use it everywhere.
12a. Space by relationship, not by token: tight inside a group, generous between groups. One value stamped everywhere (`gap-4`/`p-4`/`space-y-4` for both within-group and between-group distances) means proximity stops carrying information — a heading must sit visibly closer to its own body than to the previous section. The scale (rule 10) says which values exist; the relationship says which one to pick, and picking the same one twice in a row for different relationships is the tell.
13. Radius values ∈ DESIGN.md scale. One radius system per project. Card radius cap 12-16px (per `ai-tells.md`).
13a. A reusable card/panel that gets dropped into different-width containers (sidebar today, main column tomorrow, a modal later) sizes off its own container, not the viewport: `container-type: inline-size` on the wrapper, `@container (min-width: ...)` on the internal layout switch. Viewport media queries answer "how wide is the screen"; container queries answer "how wide is THIS box" — the component breaks the same way in every context. Reach for a viewport breakpoint only for page-level structure (sidebar collapse, nav to hamburger); reach for a container query for anything reusable that doesn't know where it'll be dropped.

## 5. Dark surface ladder — Linear canon (PER-PROJECT OPTION, NOT DEFAULT)

Apply ONLY when the project's DESIGN.md declares a dark theme. Never auto-apply because the suite is named "impulse". Physiological grounding for why "not default" is the right stance, not just taste: dark mode removes a compensatory mechanism of the pupillary response that, on a bright background, partially masks the distortion irregular corneal curvature creates — for the 30-50% of adults with some astigmatism, white text on black can bleed/halo, forcing harder focus and faster fatigue; ergonomic studies also consistently show positive contrast (dark-on-light) reading faster with better comprehension than negative contrast, for the general population, not just that subgroup.
[techealthinfo: dark mode and astigmatism](https://techealthinfo.com/dark-mode-is-not-making-your-astigmatism-worse-but-it-is-removing-the-one-thing-that-hides-it/)

| Rule | Spec |
|---|---|
| Canvas | near-black WITH a hue tint (Linear: `#010102`, faint blue). `#000000` banned |
| Surface ladder | 4 steps above canvas; hierarchy = surface lift; never skip levels |
| Borders | 1px hairlines carry depth (Linear: `#23252a` → `#34343a` → `#3e3e44`). Drop shadows on dark: no |
| Text | off-white, never `#ffffff` (Linear ink: `#f7f8f8`) |
| Ink tiers | exactly 4: ink / muted / subtle / tertiary (Linear: `#f7f8f8` / `#d0d6e0` / `#8a8f98` / `#62666d`) |
| Bright colors | desaturate 10-20% vs their light-theme values |
| Accent | ONE. Reserved for brand mark, primary CTA, focus ring, links. Never card fills, never section backgrounds |
| Whitespace | "the dark canvas IS the whitespace" — separate sections by surface lift, not by gaps |

Example ladder (Linear extracted values — replace with the project's own tinted ramp):
`canvas #010102 → surface-1 #0f1011 → surface-2 #141516 → surface-3 #18191a → surface-4 #191a1b`

14. Contrast still holds on dark. Full numbers: `components.md` §6.
15. Hover/selected state on dark = one surface step up, not an accent fill.

## 6. Color calibration — the Lila Rule

16. Max 1 accent color, saturation < 80% by default. Neutral base (zinc/
    slate/stone) + one high-contrast accent, not a rainbow.
16a. Pixel-share budget (craft rule): neutrals own 70-90% of rendered
    pixels, accent 5-10%, semantic colors 0-5%, effects <1%. A page where
    the accent covers a third of the viewport has no accent.
16b. Brand accent too light for text on a light background → darken to its
    ~600-level shade for text/links; keep the bright variant for fills and
    large surfaces. One hue, two duties, two values.
17. **The Lila Rule:** the "AI purple/blue glow" aesthetic (automatic purple
    button glows, random neon gradients) is banned as a default reach. Use
    it only when the brand brief names purple/violet explicitly — and then
    execute with intent: consistent palette, harmonised neutrals, restrained
    gradients, not generic AI-gradient slop.
18. **Premium-consumer palette ban.** For premium-consumer briefs (cookware,
    wellness, artisan, luxury, heritage craft, DTC home goods) the reflex
    default is warm beige/cream + brass/clay/oxblood/ochre + espresso dark
    text — banned as default. Concrete banned hex families:
    - Backgrounds: `#f5f1ea`, `#f7f5f1`, `#fbf8f1`, `#efeae0`, `#ece6db`,
      `#faf7f1`, `#e8dfcb` (warm paper/cream/chalk/bone)
    - Accents: `#b08947`, `#b6553a`, `#9a2436`, `#9c6e2a`, `#bc7c3a`,
      `#7d5621` (brass/clay/oxblood/ochre)
    - Text: `#1a1714`, `#1a1814`, `#1b1814` (espresso/warm near-black)
    Every premium-consumer brief reaches for this palette by default — the
    brand becomes invisible when it does. Rotate instead: Cold Luxury
    (silver-grey/chrome/smoke), Forest (deep green/bone/amber), Black &amp;
    Tan (true off-black + warm tan, no beige), Cobalt + Cream, Terracotta +
    Slate, Olive + Brick + Paper, or pure monochrome + one saturated pop.
    Don't reuse the same family twice in a row across projects (registers.md
    anti-default discipline #2). Override: acceptable ONLY when the brand
    brief names those exact colors, or the identity is genuinely vintage/
    artisan/warm-craft AND you can state why in one line — reaching for it
    because "cookware brief" is the banned reflex itself.
