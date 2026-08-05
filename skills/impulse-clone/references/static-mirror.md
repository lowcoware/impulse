# Static-build sites: 1:1 faithful clone by full asset mirroring

From nexu-io/open-design web-clone (Apache-2.0), re-expressed for the impulse suite.

Applies to: Astro / Vite SSG / Hugo / Eleventy / anything that ships its client
runtime as downloadable static assets — even when it's WebGL/Canvas/Gaussian-
splat-heavy. Does NOT apply to real SSR or data-driven SPAs (business data behind
APIs) — those go through `network-capture.mjs` API stand-ins instead.

## Why this reaches 1:1

These sites' "real source" is not on GitHub, but the DEPLOYED static assets are
the truth: HTML + bundles + CSS + runtime-fetched binaries
(`.sog`/`.buf`/`.wasm`/`.riv`/fonts/images/video). Mirror them as-is, serve from
the web root, and you are running real code + real assets — not a rebuild. That
is byte-level fidelity, original bugs and quirks included. This is the "real
source above all" rule extended to static sites: for a static-build site,
"getting the source" MEANS "mirroring the deployed asset set".

Decision-tree trap: seeing `astro: true` does not mean "find the theme on a
marketplace" — that only works for sites built on off-the-shelf themes. A custom
Astro site has no theme to buy; full mirroring is the answer.

## Why a real browser with a full scroll — not grep, not wget

- `.buf`/`.sog`/`.riv` binaries are fetched BY JS AT RUNTIME as you scroll, with
  URLs assembled dynamically in code — grepping the bundle misses them and
  `wget --mirror` never discovers them (it only follows static HTML links).
- Only reliable method: real browser load + scroll top to bottom, record every
  network request that actually happened, mirror per that list.

## One command

```bash
node scripts/mirror-site.mjs --url https://site/ --out .
```

Output:
- `site/...` — mirrored same-origin assets (paths preserved; directory URLs
  stored as `index.html`)
- `own-asset-urls.txt` — same-origin asset list
- `third-party.json` — third-party hosts + webfont CSS (Typekit/Google) that
  needs self-hosting
- `mirror-manifest.json` — every request + status

Downloads go through the browser network stack, so cookies/proxy behavior match
the page's own requests.

## Manual finishing (to run offline 1:1)

The script mirrors same-origin only and rewrites nothing. Third-party items are
handled by hand per `third-party.json`:

1. **Self-host domain-locked fonts (most common: Adobe Typekit).** Typekit kits
   are locked to licensed domains; the remote `@import` may not render from a
   different origin. Self-host:
   - Download the kit CSS directly (Typekit often blocks proxies; use a browser
     UA and a referer of the original site).
   - Extract the `use.typekit.net/af/...` font URLs from the kit CSS
     `@font-face src` entries; download each into `site/typekit/fonts/`. The
     same font comes in three flavors — `/l=woff2`, `/d=woff`, `/a=otf` — trust
     the file magic (`wOF2` / `wOFF` / `0x00010000`), not the filename.
   - Write a local `@font-face` with relative `url()` values, the original
     `format()` hints, the original `font-weight` ranges, `font-display: swap`.
   - Rewrite the reference — note Typekit is usually the FIRST LINE of the main
     bundled CSS as `@import"https://use.typekit.net/kit.css"`, not an HTML
     `link` tag:
     ```bash
     perl -0pi -e 's{\@import"https://use\.typekit\.net/KIT\.css"}{\@import"/typekit/kit-local.css"}g' site/_astro/main.css
     ```
2. **Strip trackers**: Cloudflare beacon / GA / pixels — surgical script removal.
3. **Public CDNs** (e.g. Rive wasm on unpkg): cross-origin loads work online, so
   they may stay remote (they die offline — note it). Mirror + rewrite only if
   full offline is required.
4. **Vimeo/YouTube embeds**: iframes play online only; usually non-core — note
   it and move on.

## Serve + verify

```bash
cd site && python3 -m http.server 8124
```

`site/` MUST be the web root so root-relative paths (`/_astro`, `/models`, ...)
resolve. Then the standard gate: zero console errors + `visual-diff.mjs` against
the original. WebGL-heavy sites: screenshot at multiple scroll positions — a
single full-page shot misses scroll-triggered GL frames.

## Shape of a worked result (Gaussian-splat Astro site, L6-grade frontend)

135 same-origin assets (HTML + bundles + CSS + 25 `.buf` geometry/camera-anim +
2 `.sog` splats + sorting wasm + `.riv` + MSDF + fonts + 80-plus images). Only
rewrites: Typekit import to self-hosted + one beacon removed. Result: exact
`scrollHeight` match, zero console errors, hero pixel diff 36 pixels out of
1.3M. Vimeo gallery and unpkg wasm left online as recorded exceptions.
