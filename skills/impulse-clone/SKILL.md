---
name: impulse-clone
description: "Website cloning done as a discipline: L1-L6 complexity grading, evidence-graded reverse engineering, Playwright tooling, fidelity gates. Legitimate basis required — own property, explicit permission, or internal study; for redesign baselines, migration snapshots, design study. Triggers: \"/impulse-clone\", \"clone this site\", \"clone website\", \"reverse engineer this page\", \"mirror this site\", \"склонируй сайт\", \"сделай копию сайта\", \"повтори этот сайт\", \"скопируй лендинг\", \"разбери, как сделан этот сайт\". Redesigning your own UI from scratch = impulse-frontend; the clone's code still goes through impulse-review."
---

# impulse-clone

From nexu-io/open-design web-clone (Apache-2.0), re-expressed for the impulse suite.

Cloning a website is a repeatable pipeline, not vibes: recon -> assess ->
harvest -> rebuild -> visual-diff -> fidelity audit. Everything lands in the
current project: `NOTES` (project-root notes file), `RECON/`, the comparison report, and the fidelity-audit report.

**Setup**: scripts are standalone node + Playwright. Playwright is a peer
dependency the USER'S project provides — `npm install -D playwright` once in the
project root, then `npx playwright install chromium` (skipped automatically when
a system Chrome exists; scripts fall back to `channel: "chrome"`). Run scripts
from the project root; never vendor deps into the skill. "Environment not set
up" is not a reason to eyeball instead of running the scripts.

## Iron rule: real source above all

Any AI-generated "clone analysis" may inform the concept skeleton, but its code
blocks are presumed fabricated until verified line-by-line against real source.
Documented case: an analysis invented ray-marching + SDF for what was analytic
sphere intersection feeding an SVG displacement filter — copying it would have
failed slowly. First action is always: get real source.

## Workflow

1. **Recon — source-available check first.** Search GitHub by site/product name
   (deploy slugs on vercel.app/github.io are often the repo name). Single-file
   sites: curl the raw HTML. Source found + license allows = skip straight to
   rebuilding from it. Then check license: MIT/Apache/BSD = usable with credit;
   NO LICENSE = all rights reserved, local study only; "it's public on GitHub"
   is not a license.
2. **Recon — framework detect.** `recon-site.mjs` collects frameworks
   (three/gsap/lenis), canvas counts, computed palette, font-face rules, DOM
   structure, console errors, screenshots at 1440/768/390. Add
   `sourcemap-hunt.mjs` (source maps are free real source), `network-capture.mjs`
   (SPA fixtures), `route-crawl.mjs` (multi-page), `interaction-probe.mjs`
   (hover/click/scroll/drag states).
3. **Assess before promising.** Grade L1 (static) to L6 (SaaS), pick the mode
   (faithful / visual / rebrand / teardown), write what will NOT be cloned.
   Ladder, scoring, per-level playbooks: `references/assessment.md`. Route by
   recon: static = mirror; React/Vue/Next content = rebuild + pour content;
   SPA = network fixtures first; static-build (Astro/Vite SSG/Hugo) even with
   heavy WebGL = full mirror (`references/static-mirror.md`); WebGL/Canvas
   heavy = evidence-graded reverse engineering
   (`references/effect-extraction.md`); visual/rebrand modes = also scaffold
   design DNA (`references/design-dna.md`).
4. **Harvest.** `asset-harvest.mjs` (real browser network stack — beats hotlink
   protection, lazy-load, srcset/CSS backgrounds) or `mirror-site.mjs` for
   static builds.
5. **Rebuild.** Keep the original as read-only baseline. Strip trackers
   (GA/gtag/pixels) surgically.
6. **Visual-diff + fidelity audit.** Re-run recon against the local clone, then
   `compare-recon.mjs`, `visual-diff.mjs`, and `audit-clone.mjs --recon --strict`
   (exit 2 on fidelity hard-failures — fix and re-run, no delivery below the
   gate). Real browser verification is mandatory: local server, zero console
   errors, screenshots against the original. Record honestly what could not be
   verified.

## Evidence grading — how a claim was obtained is its rank

Computed style read from the browser outranks a screenshot eyeball; captured
shader text outranks a plausible reconstruction. Tags: `SOURCE` (real
source/runtime dump/frame capture) > `PARTIAL` (names, minified slices) >
`GUESS` (visual fitting, magic numbers). Untagged = GUESS; GUESS is never copied
into the clone. No compensation: never tune brightness/speed/position to mask a
wiring error. Full discipline + baseline-first gate:
`references/effect-extraction.md`.

## Fidelity hard gates (machine-checked by audit-clone.mjs --recon --strict)

1. **Fonts**: self-host the real fonts via `asset-harvest.mjs` (browser network
   stack beats CDN hotlink checks); `font-family` copied verbatim from recon
   JSON. System-font approximation = fail.
2. **Images**: real files on disk, replaced mechanically per
   `asset-manifest.json`. Gradient/SVG placeholders = fail unless recorded as an
   unobtainable exception.
3. **Colors**: copy the recon's computed values exactly. `rgb(17,17,17)` means
   `#111111`, not a "close enough" `#0a0a0a`.
4. **Scroll feel**: recon's frameworks + motion signals are the recipe — same
   smooth-scroll library, same snap, same sticky/parallax triggers; verify
   mid-scroll states with `interaction-probe.mjs`.

## Scripts (node scripts/NAME.mjs, from the project root)

| Script | Does |
|---|---|
| `init-clone.mjs <slug> --url U [--in-place]` | Scaffold notes file + RECON/screenshots/ |
| `recon-site.mjs --url U --out RECON --label original` | Frameworks, palette, fonts, DOM, console, 3-width screenshots |
| `asset-harvest.mjs --url U --out assets` | Download all real images/fonts/media via browser network stack; self-hosted fonts.css + manifest |
| `mirror-site.mjs --url U --out DIR` | Full same-origin asset mirror of static-build sites (scroll-captured runtime fetches included) |
| `network-capture.mjs --url U --out RECON/network` | Save XHR/fetch responses as local fixtures (SPA/SaaS) |
| `route-crawl.mjs --url U --out RECON/routes --max-pages 25` | Same-site route map + per-route screenshots |
| `interaction-probe.mjs --url U --out RECON/interactions` | Scroll/hover/safe-click/canvas-drag state evidence |
| `sourcemap-hunt.mjs --recon RECON/original-recon.json --out RECON/sourcemaps` | Find + download source maps from JS chunks |
| `dna-scaffold.mjs --recon ... --out RECON/design-dna.json` | Design-DNA skeleton, pre-filled from recon (visual/rebrand modes only) |
| `compare-recon.mjs --original ... --clone ... --out ./<report-name>.md` | Original-vs-clone comparison report |
| `visual-diff.mjs --original a.png --clone b.png --out diff.json` | Pixel diff score + difference image |
| `audit-clone.mjs --project . --recon ... --strict` | Trackers, brand residue, external-URL risk + fidelity gates (exit 2) |

## References (load on demand)

| File | When |
|---|---|
| `references/assessment.md` | Grading L1-L6, modes, scoring, L4-L6 playbooks, deliverables |
| `references/effect-extraction.md` | WebGL/Canvas reverse engineering: evidence tags, baseline gate, runtime capture |
| `references/static-mirror.md` | Astro/Vite SSG/Hugo full-mirror recipe, Typekit self-hosting |
| `references/design-dna.md` | Structured design identity for visual-clone/rebrand modes |
| `references/legal.md` | hiQ v. LinkedIn, robots.txt/ToS enforceability, why asset copyright is a separate question from access | before or during any live scrape, and when the boundaries below feel ambiguous |
| `references/self-reference.md` | self-generated reference artifact — the exact comparison-report shape `compare-recon.mjs` produces, filled with explicitly-labeled illustrative values (not a fabricated real-clone claim, per this skill's own evidence-honesty rule) | checking whether current report output still matches this skill's own baseline |

## Ethics / Boundaries

- Clone only with a legitimate basis: your own property, explicit permission
  from the owner, or internal study of publicly-served pages. This skill exists
  for your own redesign baselines, migration snapshots, and design study.
- Never harvest content behind auth or a paywall. Login-gated, paid, or private
  pages are out — full stop.
- Assets and brand remain the owner's. A clone built to reuse someone else's
  brand, copy, or photography in production is out of scope; the strict audit's
  brand-residue check exists to strip it, not to ship it.
- Respect robots.txt and the site's ToS; no license on public code means all
  rights reserved. Legal framework this rule rests on (hiQ v. LinkedIn,
  robots.txt/ToS enforceability, why assets are a separate question from
  access): `references/legal.md`.
- Recorded evidence never gets faked: what could not be verified is written
  down as such.
- Redesign work on your own product routes to
  `impulse-frontend/references/redesign.md`; the clone's code still passes
  impulse-review like any other diff.
- "stop impulse" / "normal mode": revert to default behavior.
