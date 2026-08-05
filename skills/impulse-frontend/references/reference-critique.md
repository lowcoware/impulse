# Reference critique — find weak spots by comparing against the corpus

Where interface-audit.md checks the site against impulse's OWN mechanical
rules (a11y, hydration, i18n — pass/fail, no taste involved), and the
vendored `critique` template scores against a fixed 5-dimension rubric,
this file finds weak spots by holding the site up against the vendored
reference corpus — concrete "here's what a comparable strong example
does that yours doesn't", not a generic score.

## When it fires

User asks to review/improve an EXISTING site or UI and wants concrete
gap-driven suggestions — "what's weak here", "how does this compare to
good examples", "improve my landing page", "make this feel more X, show
me what that looks like". Building fresh with no existing site → this
doesn't apply, use design-contract.md / reference-mining.md instead.

## Process

1. **Capture the current state** — redesign.md §2's audit (brand tokens,
   IA, patterns to preserve/retire) if this is a real redesign; otherwise
   read the live code/DESIGN.md/a screenshot directly. **Budget the
   screenshot cost before capturing more than ~3 routes** — each image
   costs real tokens through vision (order of ~2500 each); an audit that
   screenshots every route in a large app without planning for this can
   blow the budget before the comparison work even starts. Sample
   representative routes/states instead of exhaustively capturing
   everything, and say so in the output.
2. **Mechanical pass first.** Run interface-audit.md's 55 rules before any
   taste discussion — broken basics (missing focus states, hydration
   mismatch, bad touch targets) are findings regardless of any reference,
   cheaper to catch this way, and they'd otherwise pollute the taste
   comparison below.
3. **Pick comparison references** — same nearest-fit logic as
   reference-mining.md's source map: 1-3 `design-systems/` packages that
   match the site's domain/register (a fintech dashboard compares against
   stripe/coinbase-shaped packages, not against apple), plus one
   `design-templates/` structural shape if the page kind has a packaged
   equivalent (landing → saas-landing, dashboard → dashboard). Aesthetic-
   family packages are fair game too when the brief names a direction
   ("more brutalist") rather than a domain.
4. **Gap analysis, one axis at a time** — color temperature, type scale/
   contrast, spacing rhythm, density, motion attitude, structural
   composition. Per axis: what the site currently does (observed) → what
   the reference does (cited, with the package/template name) → the gap →
   a concrete fix. "More premium" is not a finding; "reference's body
   copy runs 15% denser at the same viewport, yours has more idle
   whitespace between paragraph and CTA" is — same concrete-over-adjective
   bar as design-contract.md §4.
5. **Rank biggest-gap-first.** Not everything found ships — rank by
   impact, same discipline as impulse-review's one-line-per-finding and
   impulse-shrink's biggest-cut-first ordering, so the user acts on the top
   of the list, not an unordered dump.
6. **Do-not-copy still applies.** A fix borrows the controllable quality
   (the reference's spacing rhythm, its type contrast ratio) — never its
   exact copy, imagery, or a real brand's distinctive mark
   (reference-mining.md's Boundary). Findings that would require literally
   cloning the reference get flagged as such, not silently softened into a
   copy.
7. **Hand off.** A ranked text list is the default output. If the user
   wants it rendered, `design-templates/critique/` (5-dimension radar
   report) or impulse-artifact both take this finding list as input — don't
   duplicate their rendering logic here, this file stops at the findings.

## Escalating a repeated miss into a permanent rule

If the user reports the same category of miss more than once across
review sessions on the same project (a real bug this process should have
caught but didn't), that's a signal the ruleset itself has a gap, not
just an isolated slip. Don't just note it and move on — after the same
category misses 3+ times, it earns a permanent addition to the relevant
reference file (interface-audit.md for a mechanical miss, ai-tells.md for
a taste miss) rather than staying a one-off correction re-explained each
session. A miss that never gets promoted just repeats.

## Boundaries

- Mechanical/structural rule compliance (a11y, hydration, i18n) =
  interface-audit.md — run that first, every time.
- Fixed-rubric scoring with no external reference comparison =
  `design-templates/critique/`.
- What counts as "borrowing" vs "copying" a reference, and the real-brand
  identity line = design-contract.md §3 / reference-mining.md Boundary.
- Preserving brand/IA during an actual redesign engagement = redesign.md
  — this file's findings feed into redesign.md §2's "patterns to retire".
