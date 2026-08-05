# Brand-systems catalog — open-design portable design packages

Index of nexu-io/open-design `design-systems/` (Apache-2.0): 153 portable
brand packages, each the same machine-readable shape — `manifest.json`
(discovery/provenance) + `DESIGN.md` (canonical prose for agents) +
`tokens.css` (compiled semantic tokens). Vendored in full at
`design-systems/<name>/` (this directory, next to this file); this file is the map.

## Usage protocol

0. Brand named isn't in either list below → it's not in the catalog. Don't
   fabricate its system from memory — extract it fresh: brand-extraction.md.
1. Brief says "make it like <brand>" or names an aesthetic family below →
   open that package's `DESIGN.md` + `tokens.css` and use them as the
   EVIDENCE source for the project's own DESIGN.md (design-contract.md
   from-references flow) — never as a verbatim paste.
2. impulse rules stay upstream: real-brand packages are study material for
   layout/feel; shipping another company's brand on your product is the
   do-not-copy boundary (design-contract.md). Aesthetic-family packages
   (brutalism, claymorphism, ...) are free to use as-is.
3. Token names map into the project `@theme` per tokens.md conventions —
   one source of truth, no parallel token file.
4. Picking one of these because it's the nearest preset is the ai-tells
   #28 reflex; picking it because the Design Read names the direction is a
   decision. Rotate as usual.

## Real product/company brands (study + inspiration evidence)

Dev/AI: claude, openai, cohere, mistral-ai, perplexity, huggingface,
together-ai, x-ai, ollama, replicate, runwayml, elevenlabs, minimax,
voltagent, agentic, composio, lovable, opencode-ai, cursor, warp, raycast,
linear-app, vercel, github, framer, figma, shadcn, expo, supabase, sanity,
sentry, posthog, mongodb, clickhouse, hashicorp, mintlify, resend, zapier,
webflow, cal, levels, superhuman, loom, miro, intercom, notion, slack,
discord, canva, airtable.

Consumer/finance/industrial: apple, nike, tesla, spacex, bmw, bmw-m,
bugatti, ferrari, lamborghini, renault, uber, airbnb, spotify, duolingo,
pinterest, starbucks, playstation, meta, wechat, xiaohongshu, lingo,
stripe, mastercard, revolut, wise, coinbase, binance, kraken, vodafone,
cisco, webex, ibm, nvidia, ant, arc, clay, theverge, wired, cafe,
totality-festival.

## Aesthetic families (usable as-is)

brutalism, neobrutalism, claymorphism, glassmorphism, neumorphism,
skeumorphism, dithered, doodle, retro, vintage, pacman, tetris, fantasy,
cosmic, futuristic, neon, gradient, mono, flat, paper, kami (紙 parchment),
hud, mission-control, trading-terminal, dashboard, urdu (Indus script),
atelier-zero (editorial collage), tom-modern (editorial-technical,
vermillion accent), warm-editorial, editorial, publication, storytelling.

## Mood presets (adjective packages)

default (neutral modern), minimal, clean, simple, sleek, spacious, modern,
contemporary, professional, corporate, enterprise, premium, luxury,
elegant, refined, bold, dramatic, expressive, energetic, vibrant, colorful,
friendly, creative, artistic, perspective, bento, application.

Mood presets are the weakest picks — an adjective is not a direction
(registers.md Design Read wants a nameable language, not "modern"). Reach
for them only as a token starting point under a real Design Read.

## Boundaries

Contract-from-references flow: `design-contract.md`. Token conventions:
`tokens.md`. Style-family execution recipes impulse owns natively:
`vocabulary.md`. Rendering shapes (decks/prototypes): `template-catalog.md`.
