# Word Blacklist — German (Deutsch)

German-language AI-tell catalog (72-pattern source, a subset covered here
in depth). Distinctive format versus the RU/EN lists: every rule ships as
a **four-part card** — Signal (what to look for) / Schlechter Reflex (the
over-correction to avoid) / Sicherer Eingriff (the safe fix) / Nicht
anfassen (explicit do-not-touch exceptions) — more rigorous than either
the RU or EN blacklists' current format, worth considering as a template
upgrade for those files too.

## Deixis / Sprecherposition (speaker position)

**Signal:** text oscillating unpredictably between `ich`/`wir`/`man`/
neutral-passive/direct-address within one piece, or hiding all agency
behind passive/`man`-constructions when the text type calls for a clear
speaker position. **Schlechter Reflex:** mechanically converting every
`man`-construction to `ich`/`wir` regardless of whether impersonal framing
was actually appropriate. **Sicherer Eingriff:** pick ONE speaker position
appropriate to the genre and hold it consistently. **Nicht anfassen:** a
deliberately impersonal register (a manual, a policy document) that uses
`man` consistently throughout — that's correct register, not a tell.
German-specific because `man` (impersonal "one") is a distinct grammatical
escape hatch English lacks a direct equivalent for.

## Nominalstil vs. Verbalstil (nominalization)

**Signal:** nominalization chains like "Durchführung der Analyse"
(literally "the carrying-out of the analysis") standing in for a direct
verb like "analysieren" (to analyze) — the German-grammar-specific version
of the English nominalization-as-AI-tell pattern, using German's own
Nomen-Verb-Verbindungen (noun-verb compound constructions) vocabulary.
**Sicherer Eingriff:** convert back to the direct verb form wherever the
sentence structure allows it without breaking a genuinely intended formal
register.

## Modalpartikeln (modal particles)

**Signal:** absence or overdose of German's modal-particle class (`ja`,
`doch`, `eben`, `halt`) — a grammatical category with no direct English
equivalent. AI text either omits these entirely (reading formal-flat) or
over-doses them trying to fake casual register. **Sicherer Eingriff:**
correct density is register-dependent; cap at roughly one per paragraph
in casual register, and don't force them into formal register at all.

## Anti-Entropy-Reflex — an explicit anti-pattern, not a tell to fix

This card warns AGAINST an over-correction, not for one: deliberately
scattering sentence fragments, rule-breaks, filler, small errors, or rare
words purely to lower a detector-measured predictability score is itself
flagged as a bad move. Explicit framing: "forced entropy-injection can
raise burstiness/mimicry scores while making the text objectively worse —
less precise, less readable." This generalizes beyond German — see the
same caution restated in `false-positives.md`.

## DACH-Regionalstil — a locale-diversity protection rule

Austrian and Swiss German regional lexis, syntax, and register are
explicitly **not** an AI-tell and must never be "corrected" toward
standard Bundesdeutsch. Mnemonic given in the source: CH (Swiss) runs
formal-precise, AT (Austrian) runs historically elaborate, DE (German)
runs direct-terse — "all three are authentic, none is an AI-tell." No
equivalent regional-variant-protection rule currently exists for RU or EN
in this suite — worth considering whether either needs one (RU: Belarus/
Ukraine-adjacent regionalisms; EN: the many national Englishes).

## QGIR-Stop (Qualitäts-Grenze-Ist-Erreicht — "quality limit reached")

A named stopping condition: once only minor texture, register-appropriate
traces, and domain-normal uniformity remain, **stop polishing**. The bad
reflex named explicitly: "noch eine Runde Politur, damit der Text
menschlicher klingt" (one more polish pass, to make the text sound more
human) — flagged as the exact move to avoid. Directly reinforces this
suite's existing over-polishing caution, but gives it a named, checkable
stopping rule rather than a vague "don't overdo it."

Sources: marmbiz/humanizer-de, harvested GitHub skill, distilled and
re-expressed — 12 of the source's 72 catalogued patterns covered here in
depth; a follow-up read of the remaining 60 would deepen this file
further if German coverage needs to go beyond what's here. No verbatim
text copied.
