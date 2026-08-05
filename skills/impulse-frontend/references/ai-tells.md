# ai-tells.md: banned defaults catalog

Reg column: B = brand register (landing/marketing/hero), P = product register (app/dashboard/admin), B+P = both.
Every rule is binary: banned = count 0. An override exists only when the brief explicitly names the pattern.
Mechanical grep/count versions live in preflight.md. Register split + dials live in registers.md.
Positive recipes (what to build instead, not just what's banned) live in
images.md (visual assets), content.md (long lists/quotes), typography.md
(type-rule detail), vocabulary.md (pattern names).

**Why these bans, calibrated against what the research actually supports:**
automated AI-detection is unreliable — published detector accuracy averages
under 40% against adversarially-edited content, and detectors show
demographic/model-specific bias real enough that they're flagged as unfit
for high-stakes deployment. That's not the bar this file targets. The
patterns below are banned because a HUMAN reader recognizes them as
generic/low-effort on sight — same mechanism that lets experienced human
reviewers hit near-perfect accuracy where automated detectors fail: they
key on the same surface tells this catalog names (uniform sentence
structure, low lexical variety, predictable rhetorical shape, near-zero
burstiness), just applied by a person instead of a classifier. Ban these
because they read badly, not because a scanner would catch them — a
scanner mostly won't.
[Bloomberry: sentence-level patterns that make AI writing detectable](https://www.bloomberry.ai/research/how-ai-detects-your-writing)

## 1. Banned visual defaults

| # | Ban | Reg |
|---|-----|-----|
| 1 | AI-purple/violet gradient palette as default (the Lila Rule, tokens.md §6). Purple only when the brand brief names it, executed committed, zero glow | B+P |
| 2 | Centered-hero template: badge + headline + subtext + two buttons over dark mesh. Use split, asymmetric, or editorial hero | B |
| 3 | Three equal feature cards in a row. Use asymmetric grid, 2-col split, or full-width rows | B |
| 4 | Gradient text (`bg-clip-text` + gradient). One solid color; emphasis via weight or size | B+P |
| 5 | Glassmorphism as default. Rare and purposeful (with `prefers-reduced-transparency` fallback), or none | B+P |
| 6 | Fake screenshots built from divs (fake task list, fake terminal, fake dashboard). Real image, generated image, real component, or nothing — recipe: images.md §4 | B+P |
| 7 | Hand-rolled SVG icon paths. Phosphor only (components.md) | B+P |
| 8 | Sketchy/doodle SVG illustrations, `feTurbulence` paper grain. No real asset = ship no illustration | B+P |
| 9 | Hero-metric template: big number + small label + stat row + gradient accent | B |
| 10 | Numbered section eyebrows (01/02/03). Numbers only when the section IS a real ordered sequence | B |
| 11 | Uppercase tracked eyebrow above every section (counts in section 2) | B |
| 12 | `border-radius` >= 32px. Cards cap at 12-16px; full-pill only for tags and buttons | B+P |
| 13 | Nested cards. Always wrong | B+P |
| 14 | Side-stripe accent: `border-left`/`border-right` > 1px colored, on cards, callouts, alerts. Full border, tint, or nothing | B+P |
| 15 | Ghost-card: 1px border + drop shadow >= 16px blur on one element. Pick border OR shadow (<= 8px blur) | B+P |
| 16 | Decorative stripe/grid backgrounds: `repeating-linear-gradient`, 1px-line grid overlays. Only on real canvas/map surfaces | B+P |
| 17 | Custom mouse cursors | B+P |
| 18 | Pure `#000` canvas, pure `#fff` text. Off-black and off-white only | B+P |
| 19 | Inter as default font on brand register. Product register: system/Inter stack is allowed | B |
| 20 | Version labels in hero (`BETA`, `v0.6`, `EARLY ACCESS`) unless the brief IS a launch announcement | B |
| 21 | Decoration strips: hero-bottom word strip (`BRAND. MOTION. SPATIAL.`), locale/time/weather strips, scroll cues (`Scroll to explore`) | B |
| 22 | Decorative status dots on nav items, list rows, badges. Dot = real semantic state only, max 1 per section. The glowing variant is its own ban: halo, `animate-ping`/pulse, colored glow shadow around a dot — a binary state is not a gem; flat dot + word | B+P |
| 23 | Pills/labels overlaid on images; photo-credit captions as decoration. Caption below the image or nothing | B |
| 24 | Version footers (`v1.4.2`, `Build 0048`, `last sync 4s ago`) on marketing pages | B |
| 25 | Vertical rotated text; crosshair/hairline lines as decoration. Lines organize real content or don't exist | B |
| 26 | `border-t` + `border-b` on every row of a list or spec table. One sparse divider direction | B+P |
| 27 | Comparison bars with filled background tracks on marketing pages. Number + icon instead | B |
| 28 | Second-order escape-default palettes — the "I avoided purple" cliches: cream + serif + terracotta "editorial"; near-black + single neon accent "techno"; broadsheet + hairline rules "newspaper"; warm amber/stone "cozy" wash as the reflex translation of "friendly" (tokens.md §6 has the hex families); the "tasteful terminal" — mono everywhere, near-black, one warm accent, ASCII art as chrome. Polished enough to be the new default is still a default. Fine as a deliberate pick, banned as the reflex | B |
| 29 | Boldness budget unspent or sprayed: zero distinctive moves, or five competing ones. Exactly ONE signature element per page (a layout break, a type moment, a motion beat) — spend the budget once, commit | B |
| 30 | One-hue status box: border, text, and `/10` background all the same hue (`border-red-500 text-red-500 bg-red-500/10`) — one loud color at three opacities, toned to nothing around it. State lives in words and weight first (bold "Error" reads before color); if colored at all, one muted accent on a neutral surface | B+P |
| 31 | Default semantic rainbow: stock `-50` backgrounds + `-600` text for info=blue / tip=amber / success=green / error=red, three-four candy hues related to nothing. Grow semantic colors out of the project palette; most notes need no color at all | B+P |
| 32 | Highlighted keywords: colored/`font-semibold` spans scattered mid-paragraph, `<mark>` swipes, decorative strikes and underlines as "emphasis". Strike = real edit, underline = link, highlight = real annotation; max one accented phrase per paragraph | B+P |
| 33 | Flat type hierarchy: every size crammed into 14-18px, headings barely bigger than body, hierarchy left to shades of gray. Scale steps >= 1.25x; sizes within 1-2px of each other merge; the page's most important thing gets a size that says so | B+P |
| 34 | Icon in a tint of itself: every icon wrapped in a rounded square filled with `/10` of its own hue (`bg-blue-500/10` + `text-blue-500`) — a grid of soft colored squares. Icon inherits text color, no container; a genuinely needed container gets a deliberate opaque surface from the palette | B+P |
| 35 | Oversized shadow: blur/spread larger than the element casting it — a small card under a room-sized fog (`0 16px 80px`). Shadow = elevation: tight blur, small offset, low opacity, colorless. Often a hairline separates better than any shadow (ghost-card combo is ban 15) | B+P |
| 36 | Middle-dot `·` as the default separator ("foo · bar · baz · qux"). Rationed: max 1 per metadata line; a separator family = line breaks, hairlines, or columns | B+P |
| 37 | `<br>`-broken italic headline as a "design move" ("for thirty`<br>`*years.*"). Headlines read naturally first; a break earns its place only when the brief demands the device | B |

## 2. Layout anti-repetition counts

| Count rule | Limit | Reg |
|---|---|---|
| Consecutive image+text zigzag sections | <= 2; the 3rd consecutive split = fail | B |
| Layout families per 8 sections | >= 4 distinct; no family twice in a row except the zigzag pair | B |
| Eyebrows (uppercase tracked labels above headings) | <= ceil(sections / 3); hero counts; after an eyebrow, next 2 sections get none | B |
| Marquees | <= 1 per page | B |
| Split-header (big left headline + small floating right paragraph) | 0: stack headline over body, max-width 65ch | B |
| Hero text elements | <= 4: (eyebrow OR brand strip), headline <= 2 lines, subtext, CTAs. Zero taglines/trust-strips inside hero | B |
| Hero viewport | fits `100dvh` with CTA visible; top padding <= 6rem | B |
| Nav | 1 line at desktop, height <= 80px | B+P |
| Bento cells | = item count exactly, zero blank tiles; >= 2 cells visually varied (image/tint/pattern) | B |
| Logo wall | below the hero, real SVG logos, zero category labels under logos | B |
| CTA intent | 1 label per intent page-wide ("Get in touch" + "Let's talk" on one page = fail) | B |

## 3. Consistency locks

| Lock | Rule | Reg |
|---|---|---|
| Accent | 1 accent color per page, used identically in every section | B+P |
| Radius | 1 radius system; mixed values only under a written rule applied everywhere | B+P |
| Theme | 1 theme per page; zero light/dark section flips (one deliberate switch only if the brief names the device) | B+P |
| Icons | 1 icon family per project | B+P |
| Type | 1 pairing: contrast axis (serif+sans, geo+humanist) or one family in weights; never two similar sans-serifs | B+P |
| Copy | 1 copy register per page (no mono-technical + editorial + marketing mix) | B |
| Library | 1 component library per project: shadcn-vue, or Frappe UI as the declared speed-over-taste lane (components.md §0) — zero mixing either way | B+P |

## 4. Copy rules

| Rule | Reg |
|---|---|
| Em-dash and en-dash-as-separator in visible UI copy: zero. Grep `—` and `–` across `.vue` templates and locale files = 0. Hyphen only. (Chat prose = shared/communication.md territory, not this file) | B+P |
| Hero subtext <= 20 words; section sub-paragraph <= 25 words; section headline <= 8 words | B |
| Filler verbs: zero. Elevate, Seamless, Unleash, Empower, Supercharge, Revolutionize, Next-Gen: write the concrete verb instead | B+P |
| AI-voice sentence shapes: zero. "Not just X — it's Y", "Say goodbye to X", "Meet your new X", "in seconds, not hours", "unlock the power", three-word triads ("Fast. Beautiful. Yours."), and dismissing anything as "X theater" — say plainly what the thing does | B+P |
| Fake-precise numbers: zero unless from real data or labeled `<!-- mock -->`. Real numbers are odd and specific ("1,847 CI runs yesterday", sourced), never round set dressing (10k+ / 99.9% / 24/7) — one invented figure poisons every true one beside it | B+P |
| Generic names/brands: zero. No John/Jane Doe, Acme, Nexus, SmartFlow. Locale-appropriate realistic names. Mock data looks organic: `47.2%` not `50%`, `+1 (312) 847-1928` not `123-456-7890` — round-perfect values read as generated | B+P |
| "Quietly trusted by" style headers: zero. "Trusted by" or no header | B |
| Poetic section labels: zero ("Field notes", "From the field"). Plain labels ("Testimonials") or none | B |
| Micro-meta sentences under headings: zero ("The list will stay short on purpose") | B |
| Generic step labels: zero (Step 1 / Stage 1 / Phase 01). Verb labels: Install, Configure, Ship | B+P |
| Quotes <= 3 lines; attribution = name + role; typographic quotes or none — content.md §5 | B |
| Primary CTA <= 3 words, never wraps at desktop | B |
| Self-audit: reread every visible string before done; grammatically broken or AI-cute phrasing = rewrite plain — checklist: content.md §3 | B+P |

## 5. Type rules

Full type-rule table (display/body defaults, sans-serif pool, serif
discipline + named bans, pairings, emphasis, italic descender clearance):
`typography.md`.

## 6. Anti-default discipline (generic principles)

1. Category-reflex check: if theme + palette are guessable from the domain alone, that is the training-data default. Rework until they are not. (B)
2. Never reuse the previous project's signature palette family or display font for the same category. (B)
3. Lists > 5 items: grouped chunks, card grid, tabs, or scroll-snap. Never a default `<ul>` with a divider under every row. Full alternatives incl. spec-sheet shapes: content.md §1-2. (B+P)
