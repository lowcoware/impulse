# Self-reference artifact — a schema-accurate worked example, not a fabricated clone claim

Self-generated reference for `impulse-clone`: the exact comparison-report
shape `compare-recon.mjs` produces (the script's `report()` function was
read directly to build this — every heading, table, and field below matches
what the script actually emits), filled with **clearly-labeled illustrative
numbers**, not a claim that a real clone was run against a real site.

This is a genuinely different case from the other skills' self-references:
this skill's real output requires live browser recon data (Playwright
against an actual URL). Fabricating realistic-looking recon numbers and
presenting them as if a real clone happened would violate this skill's own
"recorded evidence never gets faked" rule — so this file is explicit about
being a schema demonstration, the same way `impulse-artifact`'s gallery
examples are calibration references, not production output.

---

## Example comparison-report output — schema demonstration only, no real target

*(All values below are illustrative placeholders in the exact shape
`compare-recon.mjs` fills them with — not a real recon run.)*

# example-original vs example-clone - clone evaluation report

## Conclusion
- Original URL: `https://example.com` *(illustrative — no real recon was run for this file)*
- Clone URL: `http://localhost:3000`
- Auto-inferred complexity: L2
- Suggested mode: visual clone / rebrand
- Auto-report boundary: structure, counts, frameworks, console compare automatically; with visual-diff, pixel-diff scoring is included. Content residue and legal still need the audit.

## Technical signals
| Item | Original | Clone |
|---|---|---|
| title | Example Co — Product | Example Co — Product (clone) |
| lang | en | en |
| frameworks | react, gsap | react, gsap |
| scrollHeight | 8400 | 8350 |
| h1 | Build faster, ship calmer | Build faster, ship calmer |

## Count comparison
| Metric | Original | Clone | Auto score |
|---|---:|---:|---:|
| sections | 7 | 7 | 5/5 |
| links | 34 | 34 | 5/5 |
| images | 18 | 18 | 5/5 |
| video | 1 | 1 | 5/5 |
| canvas | 0 | 0 | 5/5 |
| forms | 1 | 1 | 5/5 |
| buttons | 12 | 11 | 4/5 |
| inputs | 3 | 3 | 5/5 |
| interactive | 22 | 21 | 4/5 |
| scripts | 6 | 4 | 3/5 |

## Scores
- Source evidence: 4/5 *(source maps found for 3 of 4 chunks — partial, not full source)*
- Structure: 5/5
- Visual: pending manual pixel-diff run
- Motion/interaction: 4/5
- Responsive: 5/5
- Functional: 4/5 *(one interactive element short — see Known gaps)*
- Content swap: complete, placeholder brand only, no real Example Co copy retained
- Legal/deploy risk: low — MIT-licensed source located, credited in the project notes file

## Console
- Original console errors: 0
- Clone console errors: 0
- Original page errors: 0
- Clone page errors: 0

## Route coverage
- Original routes crawled: 4
- Clone routes crawled: 4
- Verdict: route counts match; spot-check each route's screenshot, a matching count doesn't guarantee matching content.

## Interaction coverage
- Original visible interactive targets: 22
- Clone visible interactive targets: 21
- Original canvas targets: 0
- Clone canvas targets: 0
- Original changed actions: 9/10
- Clone changed actions: 8/10
- Verdict: interaction count signals are close; still inspect screenshots to confirm state quality.

## Screenshot evidence
- Original recon: `RECON/original-recon.json`
- Clone recon: `RECON/clone-recon.json`
- Pixel diff: `RECON/diff.json`
- Pixel diff ratio: 0.018
- Original screenshots: `RECON/original-1440.png, RECON/original-768.png, RECON/original-390.png`
- Clone screenshots: `RECON/clone-1440.png, RECON/clone-768.png, RECON/clone-390.png`

## Known gaps
- One interactive element (a secondary nav toggle) not yet wired in the clone — tracked, not silently dropped.
- Without a real visual-diff input for this illustrative file, visual fidelity would still require opening the screenshots for manual confirmation, same as any real run.
- Legal, asset licensing, and brand-replacement completeness require manual review — `audit-clone.mjs --strict` is the enforced gate for this, not this report alone.

---

## Why this shape and not a live-run example

Building a genuine `SOURCE`-tier example would require an actual authorized
target (own property, explicit permission, or a page already legitimately
under internal study per this skill's own Ethics section) plus a working
Playwright environment in this repo — neither is set up here. Generating
plausible-looking recon numbers and presenting them as real would be
exactly the fabricated-evidence failure this skill's own `GUESS` tag exists
to catch. The honest self-reference is: here is the report's real shape,
verified against the script that generates it, explicitly not claiming a
real clone behind it.
