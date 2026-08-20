# visual-forensics.md: pixel-level AI-tell hunt on a rendered page

A grep catches what's in the source. It does not catch what's on screen —
a gradient assembled from three chained CSS custom properties, a particle
canvas drawn at runtime, a badge combo that only reads as "too much" once
rendered together. This is the procedure that closes that gap: render the
real page, look at it like the harshest design critic on the internet would,
and cite every ai-tells.md ban it fails by number. Run this whenever the
task is visually important (any `brand` register work, any `product` surface
before first ship) and a screenshot tool is available (`chrome-devtools` MCP
`take_screenshot`/`resize_page`/`navigate_page`, or the user's own
screenshot). No screenshot tool available → say so explicitly and fall back
to interface-audit.md's static read; don't skip the pass silently.

**Stance: guilty until proven deliberate.** Every visual tell found gets
fixed, not narrated. A finding that isn't obviously one of ai-tells.md's
named bans still gets flagged if a first-time human viewer would call it
generic, templated, or "AI-made" on sight — the named catalog is a floor,
not a ceiling. The only valid defense for keeping a flagged pattern is: the
brief explicitly named it (external design authority, design-contract.md),
or it's load-bearing content (a real chart, a real data grid) rather than
decoration. "It looks fine" is not a defense — fine is the bar this whole
skill exists to clear past.

## 0. Capture

1. Navigate to the actual rendered route (dev server or preview URL) — never
   audit from reading the template source, the two frequently diverge
   (hydration, CSS specificity collisions, real content vs. lorem).
2. Screenshot at minimum three widths: 375px (mobile), 768px (tablet), 1440px
   (desktop). A page that only got looked at on one breakpoint has an
   unaudited two-thirds.
3. For any hover/focus/loading/error/empty state that ai-tells.md or
   components.md's 8-states list requires: trigger it, screenshot it too.
   A state nobody ever looked at is a state nobody designed.
4. For any animated background (aurora, particles, gradient sweep): screenshot
   at two points at least 2 seconds apart. If the two frames are visually
   interchangeable, the animation is decoration with no motivation (ban 12,
   registers.md's motion discipline) — flag it regardless of how it looks.

## 1. First pass — no vocabulary allowed

Before opening ai-tells.md: look at the full-page screenshot and write down,
in plain language, what a first-time visitor would say if asked "does this
look like a template, or like someone actually designed it for this
product?" Zero mentions of hex codes, ban numbers, or CSS properties in this
pass — same discipline as interface-audit.md's human-first read, applied to
taste instead of a11y. If the honest answer is "generic" or "looks AI-made",
that's the finding — the numbered sweep below exists to locate *why*, not to
decide *whether*.

## 2. Structured sweep — walk the whole catalog, per screenshot

Go through ai-tells.md section 1 (bans 1-50) top to bottom against the actual
pixels, not the memory of what was written. For each ban, one of three
verdicts:

- **HIT** — the pattern is visibly present. Cite the ban number, the exact
  screen region (top-left/hero/card-3/footer), and the fix from the ban's
  own row.
- **CLEAR** — genuinely absent, not just "not obviously present." A gradient
  that's subtle doesn't get a pass because it's subtle — ban 1 doesn't have
  a strength threshold.
- **N/A** — the pattern class doesn't apply to this surface (ban 6's fake
  screenshot rule doesn't apply to a page with no screenshot-shaped content).

High-signal regions to look at with extra suspicion, because they're where
these patterns cluster:

- **Hero** — bans 2, 9, 20, 21, 38, 42, 49, and the layout-count table's hero
  text-element limit, all live here at once. A hero that fails one usually
  fails three.
- **Feature/value-prop grid** — bans 3, 33, 34, and layout-count's "3 equal
  cards" rule. Count the cards; count how many are visually distinct.
- **Backgrounds, anywhere** — bans 5, 16, 38, 39, 40 all live in "what's
  behind the content." If the background has movement, texture, or shapes
  unconnected to the content in front of it, it's a lead until proven
  otherwise.
- **Badges/pills/status indicators** — bans 20, 22, 42, 48, and the
  "AI-powered" sparkle-icon tell (ban 41). These stack combos, so check each
  badge against all four, not just one.
- **Any circle, oval, blob, or rounded-pill shape that isn't an avatar, a
  real icon, or a semantic status dot** — the user's own top complaint about
  generic AI output. Trace every round shape on the page back to a reason
  it exists; "it looked nice" is not a reason, it's the failure mode.
- **Any grid/dot/mesh pattern behind content** — same treatment. A grid
  background earns its place only on a genuine canvas/map/spatial surface
  (ban 16); anywhere else it's the single most-cited "every AI site has this
  background" tell in the published research behind this file, and it goes.
- **Cards and their shadows/borders/radii** — bans 12, 13, 14, 15, 35, plus
  script-detected t8/t9/t13/t14. Zoom into one card's corner at 2x if the
  screenshot tool allows it; corner-radius and shadow-blur mismatches hide
  at normal zoom.

## 3. Motion pass

Re-open any captured before/after animation frames. Cross-check against
motion.md's ban table and ai-tells.md ban 12/13 (motivated, and shown).
An animation that exists purely because "AI defaults add motion here" —
no state change it's explaining, no attention it's earning — is a HIT even
if it's smooth and on-brand-colored. Smooth execution of an unmotivated
animation is still an unmotivated animation.

## 4. Architecture cross-check

A visual audit alone misses the structural tells — pull up the component
tree (Vue devtools, or the file list) alongside the screenshots and check
ai-code-smells.md §1-2: does a visually-identical card/button appear more
than twice with a different implementation each time? Does the page swap
entire component subtrees at the mobile breakpoint instead of reflowing one?
These often correlate with visual tells (duplicated components drift apart
visually over time even when they started identical) — flag both together
when found together.

## 5. Report and fix, not report-and-move-on

Output format matches interface-audit.md's terse `file:line`/region style:

```text
## Screenshot: hero @ 1440px
ban 38 (aurora background) - hero section, full-bleed behind headline - remove or replace with solid surface
ban 40 (decorative blobs) - three floating circles behind CTA buttons, no content link - delete
ban 41 (sparkle icon) - "✨ AI-Powered" badge in nav - drop the icon, keep the words if true
## Screenshot: feature grid @ 768px
pass
```

Every HIT gets fixed in the same pass, then re-screenshotted to confirm —
this is a hunt-and-kill loop (per the user brief this file was built from:
"искоренять, искоренять, искоренять"), not a findings memo that ships
alongside the untouched page. A HIT that can't be fixed this pass (needs a
real asset, needs user sign-off on a structural change) gets named as a
follow-up explicitly, never silently dropped.

## Boundaries

- The ban catalog itself (what's banned and why) lives in ai-tells.md — this
  file is the *procedure* for finding those bans on a rendered page, not a
  restatement of them.
- Mechanical/greppable checks stay in preflight.md and its script — this
  file is for what a scanner structurally cannot see.
- A11y-specific rendered-page checks (focus order, contrast on real content,
  touch targets) → interface-audit.md; run both sweeps, they answer
  different questions.
- Architecture-level tells (component duplication, mobile/desktop forking)
  → ai-code-smells.md; §4 above is the pointer, not the full checklist.
