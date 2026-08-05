# Preflight — mechanical checks before delivering any UI

Every check is one grep or one count. Run against changed surfaces. One unticked = not done: fix, re-run, then deliver. Applies in every mode, blitz included.

`SRC` = UI source dirs: `app/` (Nuxt 4 default — components/pages/layouts/assets nest inside; adjust for legacy `srcDir` setups).

The greppable subset runs as one command: `node <skill>/scripts/preflight.mjs <root>`
(`--json`, `--only=`/`--skip=`, `--gate` for project CI, `--rules=<skill>/scripts/rules.ru.mjs`
for Russian copy tells). Ratio/presence checks (#3, #5-6, #9, #11-13, #18-21,
#26-27) stay manual — a hit-scanner can't report "required but absent". Every
scanner hit is a lead, not a verdict — see "How a grep lies" below.

| # | Check | Command / count | Pass |
|---|---|---|---|
| 1 | Em-dash / en-dash separator in UI strings | `rg -n "—\|–" $SRC` | 0 in rendered copy |
| 2 | h-screen | `rg -n "h-screen" $SRC` | 0 |
| 3 | dvh for full-height | `rg -c "100dvh\|min-h-dvh" $SRC` | ≥1 if any full-height section exists |
| 4 | Raw scroll listener | `rg -n "addEventListener\(.scroll" $SRC` | 0 |
| 5 | Reduced motion | `rg -c "prefers-reduced-motion\|useReducedMotion" $SRC` | ≥1 if any animation exists |
| 6 | focus-visible present | `rg -c "focus-visible" $SRC` | ≥1 |
| 7 | outline:none unpaired | `rg -n "outline-none\|outline:\s*none" $SRC` | every hit has a focus-visible replacement in the same component |
| 8 | One icon family | `rg -o "@phosphor-icons/vue\|lucide\|heroicons\|@tabler" $SRC \| sort -u` | exactly 1 line: phosphor |
| 9 | Accent count | distinct accent color tokens in `@theme` | 1 |
| 10 | Radius in scale | `rg -o "rounded-\[[^]]*\]" $SRC` | 0 arbitrary radii; all values from token scale; cards ≤16px |
| 11 | Eyebrow count | `rg -c "uppercase tracking" -g "*.vue"` (micro-labels above headings; hero counts as 1) | ≤ ceil(sections / 3) |
| 12 | Zigzag run | count consecutive image+text split sections per page | ≤2 in a row |
| 13 | Marquee count | `rg -c "marquee" $SRC` per page | ≤1 |
| 14 | Gradient text | `rg -n "bg-clip-text\|background-clip:\s*text" $SRC` | 0 |
| 15 | Arbitrary z-index | `rg -n "z-\[?9{2,}" $SRC` | 0 |
| 16 | console.log | `rg -n "console\.log" $SRC` | 0 |
| 17 | Hand-rolled icon paths | `rg -n "<path d=" components/` outside icon-lib imports | 0 |
| 18 | States present | `rg --files-without-match "hover:" components/` — repeat for `focus-visible:`, `disabled:` | 0 interactive components missing any; async ones also show loading + error |
| 19 | Contrast spot-check | body-text token vs its bg token, one pair per distinct surface, computed (OKLCH → WCAG ratio), not eyeballed | ≥4.5:1 body incl. placeholders; ≥3:1 large |
| 20 | DESIGN.md tokens matched | diff token names/values in `@theme` vs project DESIGN.md | 0 mismatches |
| 21 | Selector-specificity collisions | for each utility-layer override of a class also styled globally (e.g. `.section` vs `.cta`), confirm the intended winner actually applies in devtools/computed | 0 silently-cancelled rules |
| 22 | Standing will-change | `rg -n "will-change" $SRC` | every hit tied to an active tween, none in static CSS |
| 23 | Paste blocking | `rg -n "@paste.prevent\|onpaste" $SRC` | 0 — never block paste in inputs |
| 24 | Animated blur | `rg -n "blur\(" $SRC` in transition/animation context | none continuous, none on large surfaces, ≤8px |
| 25 | Flex percentage math | `rg -n "w-\[calc\(" $SRC` | 0 — Grid (`grid-cols-*`) replaces flex-math splits |
| 26 | New dependency not installed | new import against `package.json` | 0 unlisted — output the install command before importing, never assume a library exists |
| 27 | Core Web Vitals (manual, pre-ship) | Lighthouse run on the changed page | LCP < 2.5s, INP < 200ms, CLS < 0.1 |

Notes:

- #1 scope = strings rendered to the user (templates, string literals, alt text). Chat prose and docs are communication.md territory.
- #12 and #19 are counts done by reading the page top-to-bottom once — still mechanical, still binary.
- Deliberately no 60-box essay checklist. Anything that can't run as a count lives in ai-tells.md / components.md, not here.

## How a grep lies — false positives per check

Every match is a lead, not a verdict: open the file and confirm before
counting it as a fail. The usual ways these checks lie:

| Check | Not a fail when |
|---|---|
| #1 em-dash | the string is a code sample being documented, or user-generated content passed through |
| #8 icon family | a second family name appears only in a comment, a lockfile path, or a migration shim being deleted in this same diff |
| #10 radius | the arbitrary value is an avatar/pill (full-pill is allowed for tags and buttons per ai-tells #12) |
| #14 gradient text | a logo wordmark — one deliberate brand treatment, not the default heading style |
| #17 `<path d=` | the SVG is a real commissioned asset or generated illustration checked in as a file, not a hand-rolled inline icon |
| #18 states | the "interactive" component is actually static (a display-only row that happens to be a `<button>` is its own finding — wrong element, not missing states) |
| accent/purple greps | the brand genuinely IS that color — check the logo and DESIGN.md before flagging (Lila Rule override). Slop is the combination: gradient + glow + pill + AI-copy eyebrow, not one hit alone |
| emoji | an emoji picker feature, documented code samples, user content |

A hit the user has defended is a decision — pin it with a `impulse-ok` comment
(id-scoped: `<!-- impulse-ok 14 -->`, `// impulse-ok-next-line t3`) so re-scans stay
quiet on that line while every other check still fires there.
