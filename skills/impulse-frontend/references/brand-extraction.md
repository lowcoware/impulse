# Brand extraction — building a NEW brand package when the catalog doesn't have it

brand-systems-catalog.md indexes 153 pre-built packages. When the brief
names a brand that isn't on that list, this file is the pipeline for
extracting one fresh — from a live URL, a local codebase, or screenshots —
before design-contract.md's normal from-references flow takes over.
Distilled from dominikmartn/hue (harvested GitHub skill, MIT), re-expressed
for this suite's file conventions.

## 0. Classify first — it changes what you're even looking for

| Type | Signal | Where the identity actually lives |
|---|---|---|
| UI-rich | many visible components, distinctive shapes, strong color system | components, colors, craft/micro-interaction details |
| Content-rich | full-bleed photography, minimal chrome, few distinctive components | typography, spacing, surface temperature, restraint |

Say which one out loud before extracting anything: "This reads as
content-rich — the language is typography and restraint, not distinctive
components." Content-rich brands need LESS invented decoration, not more —
adding color/components that aren't there is inventing an identity, not
reproducing one.

## 1. Extraction chain — live URL

Stop at the first step that actually returns real values; each later step
is a fallback, not an alternative to try for fun.

1. **Browser tooling if available** (chrome-devtools MCP): `navigate_page`,
   then `evaluate_script` for real computed styles — `getComputedStyle` on
   body + every button/CTA/link for `border-radius`, `background-color`,
   `color`, `padding`, `font-family`; walk visible text nodes for the full
   set of distinct colors in use, not just the primary. `take_screenshot`
   at desktop width and actually look at it — hero background treatment
   (flat/gradient/photo/mesh/shader) is a visual call a computed-style dump
   won't give you. Repeat on 2-3 subpages (features/pricing/docs) — accent
   colors absent from the homepage often show up there.
2. **WebFetch/curl fallback** when no browser tool exists. Returns
   text/raw HTML, not computed styles — flag every extracted value as
   approximate in the output, explicitly (border-radius and hero
   background classification are the values most likely wrong from text
   alone).
3. **Paywall/login/CAPTCHA hit:** do not immediately ask for screenshots.
   Search for public sources first — `"{brand} documentation"` / `"{brand}
   help center"` (real UI, no auth wall), `"{brand} product screenshots"`,
   design-team case studies on Dribbble/Behance, Product Hunt/press kits.
   Docs and help centers are often better evidence than the marketing site
   — real components, real colors, real density. Only after that search
   comes up short, ask the user, in order: logged into the product already
   (browser DevTools can read the live DOM)? local codebase available
   (tokens.css/theme.ts/tailwind.config — most accurate source there is)?
   4-5 screenshots as last resort?

## 2. Local codebase (most accurate source when available)

Grep for `tokens.css`, `variables.css`, `theme.ts`, `tokens.json`,
`tailwind.config.*`; `:root` custom properties (`--color-`, `--spacing-`,
`--font-`); component files (`Button.*`, `Card.*`) and Storybook stories.
Real token values beat anything scraped off the rendered page.

## 3. Screenshots — cross-reference before you trust any single one

Screenshots are ambiguous by default: different pages, states, modes, even
product versions can be mixed in one batch. Before generating anything:

1. Extract per-screenshot: exact hex palette, typography, spacing, corner
   radii, surface treatment.
2. Compare ACROSS screenshots for contradictions — different backgrounds
   (light/dark mode, or just different pages?), different weights
   (heading vs body, or genuine inconsistency?), different radii
   (different component types, or drift?).
3. **Play the findings back to the user before committing**, contradictions
   named explicitly: "Background is #F5F3EF in shots 1-3 but #1A1A1A in
   shot 3 — is that dark mode, or a different surface?" Don't silently
   pick one and move on; ask.

## 4. Component inventory (before generating anything)

Check what the brand actually HAS before designing components it doesn't:
buttons (which variants), cards, inputs, toggles, tags/badges, lists,
progress indicators. A brand with no toggle anywhere doesn't get an
invented toggle style in its package — note the gap and fall back to the
nearest real precedent from the brand's own components, not a generic
default.

## Ceiling — ongoing two-way sync, not just initial extraction

Everything above is one-directional: pull evidence from Figma once, build
the package. If a project's real need is designers and code staying in
sync over TIME — both sides can change, and you need to know what changed
since the last agreed state, not just overwrite one side — that's a
different problem (and it's not what design-contract.md's evidence step
solves). The shape worth knowing about: a committed lockfile recording the
last-agreed state between code tokens and Figma variables; a `plan` step
computes a three-way diff against that lockfile (code vs Figma vs the
lockfile — not "which side wins" but "what actually changed on each side"),
surfacing genuine conflicts instead of silently clobbering one side; an
`apply` step executes the reviewed plan and updates the lockfile. Plan and
apply stay separate steps specifically so the plan is a reviewable,
diffable artifact (attachable to a PR) before anything is written. Don't
build this for a one-off extraction — it's real infrastructure, worth it
only when the sync is genuinely ongoing and bidirectional.

## Boundaries

This file produces the RAW evidence for a new brand package. What happens
to that evidence (split into keep/change/do-not-copy, frozen into one
direction, written as DESIGN.md) is design-contract.md's job, unchanged.
The do-not-copy boundary (logos, brand marks, literal screenshots) and the
real-brand-is-study-material-only rule are brand-systems-catalog.md's,
and apply here identically — extracting a brand's system is not a license
to ship their identity.
