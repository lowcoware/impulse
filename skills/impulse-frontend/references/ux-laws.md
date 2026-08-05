# UX laws — named heuristics and the design rules they imply

Distilled from nexu-io/open-design craft/ rulebooks (Apache-2.0), re-expressed for the impulse suite.

Composition rules grounded in named research: how many options fit on one
screen, where the primary action anchors, when a progress indicator earns its
place, why a settings page needs grouping. Each entry: one-line law, then the
checkable rule it implies. These are review/composition guidance, not greps —
the mechanical subset already lives in `preflight.md` and `ai-tells.md`.

## 1. Perception and grouping (Gestalt + attention)

| # | Law | Rule it implies |
|---|---|---|
| 1 | **Proximity** (Wertheimer 1923) — near objects read as a group | Variable vertical rhythm: 8-12px within a group, 32-48px between groups. Uniform spacing = nothing is grouped (same rule as `tokens.md` #12a, from the research side) |
| 2 | **Similarity** (Wertheimer 1923) — visually similar elements read as a group | Equivalent affordances share one treatment: every list row, every secondary button, every destructive action identical. Visible deviation reserved for the ONE item meant to stand out |
| 3 | **Common Region** (Palmer 1992) — a shared bounded area binds its contents | Enclosure only when proximity is not enough: padding >= 16px inside the region, distinct surface (hairline border or tint). Every section bordered = signal destroyed |
| 4 | **Praegnanz** (Wertheimer 1923) — the eye resolves layouts to the simplest form | Align to one clear underlying grid. Ornate breaks with no semantic payload read as arbitrary, not designed |
| 5 | **Uniform Connectedness** (Palmer & Rock 1994) — connection beats proximity and similarity in the grouping hierarchy | Connected lines, shared toolbars, bracketing containers for wizard steps, comparison sets, explicit flows |
| 6 | **Selective Attention** (Broadbent 1958) — users filter aggressively; repeated attention-grabbers train banner blindness | Strongest visual contrast goes to exactly ONE goal-relevant action per surface; supporting content recedes in weight. Red dots and badges everywhere = self-defeating |
| 7 | **Von Restorff** (1933) — the item that differs from a uniform field is the one remembered | Recommended tier / active nav / warning state is visually distinct AND carries a non-color signal (icon, label, position) — color-alone is banned in `components.md` §6 |
| 8 | **Aesthetic-Usability** (Kurosu & Kashimura 1995) — polish biases perceived usability | Polish buys tolerance for minor friction; it never substitutes for the required states (`components.md` §3) or measured usability |

## 2. Decision-making

| # | Law | Rule it implies |
|---|---|---|
| 9 | **Hick's Law** (Hick 1952; Hyman 1953) — decision time grows ~log(n+1) with equivalent options | Cap one decision screen at 3-5 visible primary options; rest behind progressive disclosure; recommended choice visually distinct. Don't over-truncate either — surface the full set, just not all at equal weight |
| 10 | **Choice Overload** (Iyengar & Lepper 2000) — too many near-equal options stall the decision | Pricing: 3-4 tiers, exactly 1 marked recommended. Product grids: 6-9 hero cards above the fold. Settings: <= 5 named groups. Never a flat wall of equivalents |
| 11 | **Anchoring** (Tversky & Kahneman 1974) — the first number re-weights every later number | Place the recommended tier where it anchors comparison; yearly savings as concrete currency deltas, not percent badges; pre-select the safer radio default. Visual weight = intended decision weight |
| 12 | **Pareto / 80-20** (Pareto c.1906; Juran 1951) — a small share of actions drives most value | Name the 2-3 actions of the dominant journey; emphasize those; demote the long tail to overflow menus, footer, settings |
| 13 | **Tesler's Law** (Tesler, Apple 1980s) — complexity is conserved; the choice is where it lives, not whether | When complexity reaches the user, put guidance at the exact step it surfaces: smart defaults, inline empty-state coaching, contextual tooltip, progressive disclosure. Hiding complexity is not removing it |
| 14 | **Occam's Razor** (14th c.) — prefer the option with fewest assumptions | Minimal element inventory; no decorative chrome without a stated user task. Constrains assumptions, not feature count — "minimum viable" is a misread |

## 3. Memory

| # | Law | Rule it implies |
|---|---|---|
| 15 | **Miller / chunking** (Miller 1956; Cowan 2001) — working memory holds ~4 items reliably, ~7 short-term; each slot holds one familiar chunk | Group related fields under named sections. "Account / Notifications / Privacy / Billing / Danger zone" beats one flat list of 30 toggles. It's a chunking rule, not a menu-length rule |
| 16 | **Working Memory** (Baddeley & Hitch 1974) — items decay in seconds; recognition beats recall | Persist context across screens instead of making the user memorize: sticky filter chips, last-N selections, breadcrumbs that include applied filters, visited markers |
| 17 | **Serial Position** (Ebbinghaus 1885) — recall favors first and last positions; the middle fades | Most important nav items at the extremes of a horizontal menu; utilities cluster in the middle |
| 18 | **Peak-End** (Kahneman et al. 1993) — memory of an experience = its peak + its ending, not its average | Spend the celebration budget on the END of a flow (success state); intermediate steps stay calm. Matches `motion-craft.md` §1's rare-tier delight budget — mid-flow showpieces are the wrong slot |
| 19 | **Zeigarnik** (1927) — uncompleted tasks create tension that pulls users back | Visible progress ("3 of 5", greyed next sections) converts tension into completion. Legit for onboarding; the same lever on streaks, daily quests, nag counters is a dark pattern — don't ship it |

## 4. Interaction and motor

| # | Law | Rule it implies |
|---|---|---|
| 20 | **Fitts's Law** (1954) — target acquisition time depends on distance and size | Bigger and closer is faster; spacing between adjacent hit zones matters as much as size. Fitts gives the tradeoff; the FLOOR is the platform's: 24x24 CSS px WCAG 2.2 AA (`components.md` §4), 44pt iOS, 48dp Material. Never Fitts alone. Mobile: high-frequency controls in the thumb arc |
| 21 | **Doherty Threshold** (Doherty & Thadani 1982) — sub-second feedback keeps flow; latency ~1s+ breaks attention | Implemented as the loading-timing table in `components.md` §3 (<100ms nothing, 100ms-1s skeleton, >1s progress, >10s estimate + cancel). Folklore: "Doherty = 400ms" — the 1982 paper contains no 400; lowest measured threshold is 300ms |
| 22 | **Flow** (Csikszentmihalyi 1975) — flow lives between challenge and skill, fed by continuous feedback and control | System friction and latency are the fastest flow-breakers; every action gets immediate feedback (press states, optimistic UI) |
| 23 | **Goal-Gradient** (Hull 1932) — motivation rises as the goal nears | Multi-step flows show a progress indicator reflecting REAL progress: count completed prerequisites only when they truly exist (saved profile, imported data). No fabricated head-start progress — that's the loyalty-card dark pattern, not the law |
| 24 | **Postel's Law** (RFC 760, 1980) — liberal in what you accept, conservative in what you emit | Inputs tolerate natural shapes (phone with/without dashes, mixed date formats, `%` optional); normalize internally; emit one canonical format. Validation timing and error wiring: `forms.md` + `components.md`. (Retracted for protocol design by RFC 9413; the UX-input application stands) |

## 5. Expectation

| # | Law | Rule it implies |
|---|---|---|
| 25 | **Jakob's Law** (Nielsen 2000) — users spend most time on OTHER sites and expect yours to match | Reuse category convention: nav placement, cart icon, settings gear, primary CTA position. Novelty must beat the convention's ROI; "innovate everywhere" is the failure mode. Tension with `ai-tells.md`'s anti-template bans resolves by layer: keep the interaction grammar conventional, make the visual execution distinctive |
| 26 | **Mental Model** (Craik 1943; Norman 1988) — users arrive with a prior from competitor products | When the brief names a reference product, anchor on it explicitly — inherited interaction grammar is free usability |
| 27 | **Paradox of the Active User** (Carroll & Rosson 1987) — users skip the manual even when reading would be faster | Guidance lives in the surface at the action point: empty-state coaching, contextual hints. Never a "read the docs first" dependency |
| 28 | **Parkinson's Law** (1955) — work expands to fill allotted time | Cut friction and pre-fill: autofill, smart defaults, saved state. A checkout that finishes faster than expected is the felt win |
| 29 | **Cognitive Load** (Sweller 1988) — effort = intrinsic (task) + extraneous (bad layout, jargon, noise); design owns extraneous fully | The restraint rules already in the suite (one accent — `tokens.md` §6; type hierarchy — `typography.md`; banned defaults — `ai-tells.md`) exist to cut extraneous load. This entry names the cost they reduce |

## 6. Folklore corrections (lint these in reviews)

1. "Doherty Threshold = 400ms" — not in the 1982 paper; lowest measured is 300ms.
2. "Fitts's Law justifies small targets if close" — Fitts is a tradeoff, the platform floor (24x24 CSS px AA) is absolute.
3. "Miller's 7±2 caps menu length" — the paper is about chunks, not list items; grouping is the directive.
4. "Selective attention = add red dots" — repeated grabbers train blindness; one contrast peak per surface.
5. "Goal-gradient licenses fake progress" — Hull is descriptive; fabricated progress is a dark pattern.
6. "Zeigarnik justifies streak nags" — reserve for genuinely beneficial completion (onboarding), not retention traps.
7. "Aesthetic-usability means polish fixes usability" — it biases perception only; required states still required.

## Boundaries

Visual bans and counts: `ai-tells.md` + `preflight.md`. Motion values and the
animate-at-all gate: `motion-craft.md` (choreography: `motion.md`). Spacing
scale and relationship spacing: `tokens.md`. Required states, touch targets,
contrast numbers: `components.md`. Validation lifecycle: `forms.md`. This file
is the WHY layer — cite the law when a review finding needs its grounding.
