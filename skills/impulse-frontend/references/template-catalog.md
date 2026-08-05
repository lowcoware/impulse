# Template catalog — open-design rendering shapes

Index of nexu-io/open-design `design-templates/` (Apache-2.0) — packaged
"shapes" an agent renders into an artifact: each is a folder with its own
SKILL.md + baked `example.html` + assets. This file is the MAP; the actual
templates are vendored in full at
`design-templates/<name>/` (this directory, next to this file).

## Usage protocol

1. Match the brief to a row below; open that template's `SKILL.md` and
   `example.html` under `design-templates/<name>/` and follow them.
2. Copy the template's seed/assets into the project — never edit the vendored copy.
3. impulse rules stay upstream where registers apply: a WEB deliverable
   (prototype-mode templates) still passes ai-tells.md/preflight; DECK and
   poster modes are presentation artifacts — their own aesthetic canon,
   impulse's em-dash/emoji bans still hold on visible copy.
4. Taste-family templates (`*-taste-*`) are the same three style families
   as vocabulary.md's recipes — pick per Design Read, rotate.

## Decks (html-ppt family — 16:9 HTML slides, keyboard/wheel/touch nav)

Core engine: `html-ppt` (full system: templates/, references/, scripts/,
presenter mode). Named variants = same engine, distinct art direction +
worked example content:

| Template | Aesthetic / worked example |
|---|---|
| html-ppt-pitch-deck | demo-day pitch (hook/traction/moat/raise) |
| html-ppt-product-launch | B2B launch-and-adoption proposal |
| html-ppt-weekly-report | weekly growth review, number-driver-move |
| html-ppt-tech-sharing | engineering deep-dive talk |
| html-ppt-course-module | onboarding/training module |
| html-ppt-presenter-mode-reveal | live-demo deck with presenter mode |
| html-ppt-graphify-dark-graph | dark graph-heavy business case |
| html-ppt-hermes-cyber-terminal | cyber-terminal aesthetic, hands-on AI |
| html-ppt-knowledge-arch-blueprint | blueprint style, incident retro |
| html-ppt-obsidian-claude-gradient | dark gradient, enterprise AI brief |
| html-ppt-testing-safety-alert | policy/safety briefing |
| html-ppt-xhs-pastel-card / xhs-white-editorial | XHS card styles, story/career decks |
| html-ppt-taste-brutalist | CRT-terminal taste (vocabulary.md brutalist family) |
| html-ppt-taste-editorial | editorial-minimalist taste (minimalist family) |
| ib-pitch-book | investor pitch book, analyst-grade |
| kami-deck | academic lab-meeting deck |
| replit-deck | PRD/RFC/retro decision documents |
| guizang-ppt | marketing/GTM plan decks |
| simple-deck / weekly-update | operating review / metrics standup |
| deck also: open-design-landing-deck (brand story) | |

zhangzara-* series — ~30 art directions on the same engine, named by look:
8-bit-orbit, biennale-yellow, block-frame, blue-professional (QBR),
bold-poster (Series A), broadside (press), capsule (self-review),
cartesian (thesis), cobalt-grid (renewal case), coral (community campaign),
creative-mode (brand identity), daisy-days (CS workshop),
editorial-tri-tone (magazine system), grove (policy), long-table
(unit economics), mat (consulting diagnosis), monochrome (grant),
neo-grid-bold (portfolio), peoples-platform (transit policy),
pin-and-paper (capstone), pink-script (photo essay), playful (retail
training), raw-grid (brutalist posters), retro-windows (security
training), retro-zine, sakura-chroma (travel essay), scatterbrain
(grad project), signal (strategy memo), soft-editorial (transformation
roadmap), stencil-tablet (compliance), studio (rates deck), vellum
(humanities lecture). Pick by aesthetic + the worked example nearest the
brief's genre.

## Web prototypes (single self-contained HTML)

| Template | Shape |
|---|---|
| web-prototype | general desktop prototype: seed template.html + layouts from references/layouts.md — the default |
| web-prototype-taste-brutalist / -editorial / -soft | same, pre-skinned in the three style families |
| saas-landing | hero/features/proof/pricing/CTA, reads DESIGN.md tokens |
| waitlist-page | pre-launch email capture, reads DESIGN.md |
| pricing-page | tiers + comparison + FAQ |
| blog-post | long-form article: masthead, pull quotes, byline |
| docs-page | docs: side nav + article + TOC |
| dashboard | admin/analytics: sidebar, KPI cards, charts |
| github-dashboard / social-media-dashboard | repo analytics / creator analytics |
| flowai-live-dashboard-template | team-management dashboard, 3 tabs |
| live-dashboard / live-artifact | connector-backed refreshable artifacts |
| kanban-board / team-okrs / meeting-notes / pm-spec / hr-onboarding / eng-runbook / invoice / finance-report / dcf-valuation / clinical-case-report | document-shaped one-pagers, self-describing |
| mobile-app / mobile-onboarding / gamified-app | screens in pixel-accurate phone frames (seed + references/layouts.md) |
| wireframe-greybox / -annotated / -sketch / -mobile-flow | lo-fi wireframes: greybox, redline pins, hand-drawn, multi-screen flow |
| magazine-poster / digital-eguide / kami-landing | editorial print-grade pages (kami = parchment white-paper look) |
| email-marketing | table-based product-launch email |
| contact-widget | floating chat widget, zero deps |
| social-carousel | 3x 1080x1080 connected panels |
| motion-frames / sprite-animation | animated hero/explainer compositions |
| webgl-experience / worker-visualizer | GPU shader scenes / Web-Worker 60fps visualizers |
| critique | 5-dimension design review rendered as HTML report with radar chart |
| tweaks | wraps any artifact with live control panel (accent/scale/density) rewriting CSS vars |
| x-research / last30days | social-sentiment research report pages |
| orbit-* (github/gmail/linear/notion/general) | daily-briefing pages off connectors — open-design-daemon-specific, weakest fit outside it |

## Other modes

| Template | Mode | Shape |
|---|---|---|
| hyperframes | video | HTML-based video compositions: captions, overlays, audio-reactive, transitions |
| video-shortform | video | 3-10s clips via Seedance/Kling/Veo/Sora |
| image-poster | image | posters/key art via gpt-image/Flux/Imagen |
| audio-jingle | audio | jingles/VO/SFX via Suno/TTS providers |
| social-media-matrix-tracker-template / trading-analysis-dashboard-template | template | data-dense cinematic dashboards, theme switch |

## Boundaries

Design-reference images before code: `image-pipeline.md`. Page assets:
`images.md`. Style-family recipes: `vocabulary.md`. This catalog only says
which packaged shape exists and where — the template's own SKILL.md governs
its rendering once picked.
