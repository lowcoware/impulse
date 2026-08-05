# Images — visual asset strategy (positive recipe, pairs with ai-tells.md #6)

`ai-tells.md` bans fake screenshots and hand-rolled illustration. This file is
the "what to do instead" — a shape problem needs a recipe, not just a
prohibition (authoring.md). Landing pages and portfolios are visual products;
a text-only page with fake-screenshot divs is not minimalism, it's incomplete.

Scope split: this file = images as page ASSETS. Images as DESIGN REFERENCES
generated before code (section comps, extraction, implement-to-match) =
`image-pipeline.md`.

## 1. Priority order for any visual asset slot

1. **Image-gen tool first.** Any image-generation tool available in the
   environment (MCP image tool, IDE-integrated gen) → use it for
   section-specific assets: hero photography, product shots, textures, mood
   images. Generate at the aspect ratio the section needs.
2. **Real web images second**, when no gen tool exists:
   - `https://picsum.photos/seed/{descriptive-seed}/{w}/{h}` for placeholder
     photography — seed describes the section (`marrow-cookware-kitchen`),
     never a random string.
   - Actual stock/brand URLs when the brief provides them.
   - Open-license sources (Unsplash, Pexels) only if explicitly allowed.
3. **Last resort: tell the user.** Neither available → do NOT fill the gap
   with hand-rolled SVG illustration or div-based fake screenshots. Leave a
   labeled placeholder (`<!-- TODO: hero product photo, 1600x1200 -->`) and
   say once, plainly: this page needs real images at [list] — generate or
   provide them.

Even a restrained/minimalist brief needs real images — 2-3 minimum (hero, one
product/lifestyle shot, one supporting image). A low motion/density dial
lowers ornamentation, not image count.

## 2. Social-proof logos

1. **Real SVG logos, never plain-text wordmarks.** Source: Simple Icons
   (`https://cdn.simpleicons.org/{slug}/{hex}`) for known brands, devicon for
   tech-stack logos.
2. **Invented brand name → invented SVG mark**, not a styled `<span>`.
   Generate a simple monogram (letter-in-circle, two-letter ligature,
   abstract glyph) as inline `<svg>` matching the page's style. A plain-text
   wordmark for a made-up brand reads as generic every time.
3. Logos render correctly in both themes (registers.md theme lock) — white-
   on-dark / black-on-light / single-color CSS variable.
4. **Logo-only rule:** the wall is logos and nothing else. No category label
   under a logo (`Vercel` / `hosting`, `Stripe` / `payments`) — the logo
   already carries the credibility, the label adds nothing. Alt text and an
   optional link to the brand's site are the only permitted extras.

## 3. Hand-rolled illustration

Icons from the approved library (components.md) are fine. Hand-rolled
decorative SVG — custom illustrations, invented marks, logos drawn by hand —
is strongly discouraged as default. Acceptable only when the brief explicitly
asks for it, the mark is a single simple geometric shape, and you're
confident in the output quality.

## 4. Product-preview alternatives (no fake screenshots)

A "hand-built product preview" made of `<div>` rectangles — fake task list,
fake terminal, fake dashboard — is the #1 landing-page tell. When a section
needs to show product:

- a real screenshot URL, if one exists
- a generated image via the image-gen tool
- a real component preview (an actual mini-instance of the app's own UI)
- or skip the preview and use editorial photography instead

A hero with text over a gradient blob is a placeholder, not a hero — it
needs one of the four options above.
