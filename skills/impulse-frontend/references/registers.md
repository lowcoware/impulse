# Registers — brand vs product

Every UI task runs in exactly one register. Pick it, declare it, obey its column.

## Pick cues (first match wins)

| Order | Cue | Example |
|---|---|---|
| 1 | Task words | "landing", "hero", "marketing", "portfolio" → brand. "dashboard", "admin", "CRUD", "settings", "table" → product |
| 2 | Surface in focus | marketing route (`pages/index.vue`, `/about`) → brand. App shell (`pages/app/**`, auth'd surface) → product |
| 3 | `register` field in project DESIGN.md | recorded at bring-up; tie-breaker when 1-2 are silent |

## Design Read (mandatory, before any code)

One line, exact format:

`Design Read: <page kind> for <audience>, <vibe>, register: <brand|product>`

| Example | |
|---|---|
| `Design Read: SaaS landing for technical buyers, Linear-clean, register: brand` | ok |
| `Design Read: orders admin for support staff, dense and fast, register: product` | ok |
| `Design Read: restaurant site for locals, warm image-led, register: brand` | ok |
| Skipping the line and coding from a default aesthetic | fail |

## One-question rule

1. Brief ambiguous AND the read genuinely diverges → ask exactly ONE question, then build. Example: "Closer to Linear-clean or Awwwards-experimental?"
2. Never a multi-question dump.
3. Can infer from context → do not ask. Declare the read and proceed.

## Dials — brand register only, finer grain than a preset

Three numeric dials, 1-10, gate every layout/motion/density decision on the
brand register. Presets (below) are the coarse tool; dials are for when a
preset doesn't quite fit and the Design Read needs to say why.

| Dial | 1 | 10 |
|---|---|---|
| `VARIANCE` | perfect symmetry | asymmetric/masonry, artsy chaos |
| `MOTION` | static, `:hover`/`:active` only | full choreography, scroll-driven |
| `DENSITY` | art-gallery whitespace | cockpit-dense, `font-mono` numbers |

Baseline `8/6/4`. Infer from the Design Read's vibe words, don't ask the
user to hand-tune this table conversationally:

| Vibe words | VARIANCE | MOTION | DENSITY |
|---|---|---|---|
| minimalist / calm / editorial / Linear-style | 5-6 | 3-4 | 2-3 |
| premium consumer / Apple-y / luxury | 7-8 | 5-7 | 3-4 |
| playful / Awwwards / experimental / agency | 9-10 | 8-10 | 3-4 |
| landing/portfolio, no strong vibe word | 7-9 | 6-8 | 3-5 |
| trust-first / public-sector / accessibility-critical | 3-4 | 2-3 | 4-5 |
| redesign — preserve | match existing | existing+1 | match existing |
| redesign — overhaul | existing+2 | existing+2 | match existing |

Mobile override: `VARIANCE` >= 4 collapses to strict single-column below
768px regardless of the desktop asymmetry — never ship the asymmetric grid
unresolved on mobile.

`MOTION` > 4 obligates motion.md's "motion claimed, motion shown" rule —
declaring a dial and shipping a static page is the same failure as the dial
not existing.

## The split

| | brand | product |
|---|---|---|
| Design is | the product | serving the task |
| Bar | distinctiveness: "how was this made?" | earned familiarity: tool disappears into task |
| Failure mode | templated slop; safe = invisible | strangeness without purpose |
| Type | fluid `clamp()` headings, display cap 6rem, scale ratio ≥1.25, tracking floor -0.04em | ONE family carries everything, fixed rem scale, ratio 1.125-1.2 |
| Font pick | 3 brand-voice words → catalog hunt; Inter-by-default banned | system/Inter fine |
| Color | Committed / Full palette / Drenched allowed — commit, don't hedge with neutrals | Restrained floor; accent = primary actions, selection, state — never decoration |
| Motion | GSAP/Lenis/Three.js live here; orchestrated load OK when the brand invites it | 150-250ms transitions; motion conveys state; zero page-load choreography |
| Imagery | mandatory on image-led briefs (food, travel, hotel, fashion, photo); zero images = bug, not restraint | screenshots, data-vis, skeletons — imagery serves the task |
| Layout | asymmetry, broken grids, one dominant idea per fold | structural responsive: collapse sidebar, breakpoint columns, density welcome |

## Brand permissions / bans

Permissions: ambitious first-load motion; single-purpose viewports with deliberate pacing; unexpected color strategies (palette IS voice); art direction per section — voice consistency beats treatment consistency.

Bans (on top of ai-tells.md):

1. Monospace as costume for "technical" when the brand isn't.
2. All-caps body copy. Caps = short labels and headings only.
3. Timid palettes, average layouts. Safe = invisible.
4. Zero imagery on an image-led brief. Colored blocks where a hero photo belongs.
5. Editorial-magazine aesthetic (display serif + italic + drop caps) on non-magazine briefs — one lane, not the default.
6. Eyebrow as section grammar. One named kicker system = voice; an eyebrow on every section = scaffold.
7. Reflex-default fonts (Inter and the training-data pool) on brand surfaces.

## Product permissions / bans

Permissions: system fonts and familiar sans defaults; standard nav (topbar + sidenav, breadcrumbs, tabs, command palette); density where users need it; same visual vocabulary screen to screen.

Bans (on top of ai-tells.md):

1. Decorative motion that conveys no state.
2. Page-load choreography. Product loads into a task.
3. Display fonts in labels, buttons, data.
4. Custom scrollbars, weird form controls, non-standard modals.
5. Heavy or full-saturation color on inactive states.
6. Modal as first thought — exhaust inline/progressive alternatives first.
7. Two different-looking "save" buttons. One is wrong.

## Presets × modes (the coarse tool — dials above are the fine one)

| Mode | brand | product |
|---|---|---|
| blitz | clean static composition, committed palette, near-zero motion, ship | shadcn-vue + project tokens, real states not stubs, ship |
| medium | register defaults above; motion where motivated; imagery per brief | register defaults above; skeletons, empty states that teach, full state vocabulary |
| hardcore | full choreography: GSAP pin/scrub, Lenis, staggered reveals, per-section art direction | full harden pass: 0/1/1000 items, long strings, emoji input, RTL, 400-500 API errors, offline, +40% German expansion |

Never mode-gated — fire in blitz too: hard technique rules, contrast numbers, reduced-motion, states on shipped interactive components, preflight.
