# Human perception — how readers, not algorithms, spot AI text

`detection-mechanics.md` covers algorithmic detectors. This file covers the
separate question: what makes an ordinary human reader say "this was
written by AI" — a different mechanism, and for this skill's primary
output language, the more culturally load-bearing one.

## The "felt sense," not a checklist

The strongest primary source here — Velasquez & Teston, 2026, 76
participants — found readers don't apply a checklist. They rely on an
inarticulate **"felt sense"** and only produce specific "red flags" when
pressed to explain it after the fact. Forced to articulate it, they
experience an **"axiological crisis"** — discomfort at realizing they were
attributing human values (effort, care, sincerity) to a probabilistic
system. [Journal of Writing Research](https://www.jowr.org/jowr/article/view/1750)

**Same gap shows up with readability formulas — don't substitute one for
the other.** Flesch Reading Ease (and kin) score only sentence length and
syllable count; research directly comparing formula scores to human
judgment found no reliable correlation between the two. The formula can't
distinguish "monosyllabic" (scores easy, isn't) from "through" (scores
hard-ish, isn't) because it has no model of actual word familiarity, and
it's blind to sentence structure, vocabulary appropriateness for the
audience, and content complexity entirely — the exact dimensions felt
sense above is actually tracking. A text can score "very easy" on Flesch
and still read as hollow/AI-flat, or score "difficult" and read as
genuinely engaging — never treat a Flesch pass as evidence a passage
sounds human; it measures a different, narrower thing.
[Readability formula validity research](https://www.richtmann.org/journal/index.php/mjss/article/download/11036/10649/41930)

**Practical implication:** local word-swaps don't fix a text that fails on
felt sense. What matters more than surface vocabulary: pacing, unevenness
of care across sections (some parts clearly mattered more to the writer
than others — real writing is never uniformly polished), and moments that
read as "someone specifically chose this," not "this was the statistically
likely continuation."

## The канцелярит connection — the highest-leverage finding for Russian

канцелярит (bureaucratic/officialese register) was named by Korney
Chukovsky in *Живой как жизнь* (1962) and elaborated by Nora Gal in *Слово
живое и мёртвое* (1972): verb-suppression via отглагольные существительные
(nominalization — «осуществление» instead of «делать»), passive/impersonal
constructions, and застойность (a static, lifeless quality). This is a
**60-year-old, culturally pre-loaded reflex** in Russian-language readers —
"this sounds robotic/dead" — that predates LLMs entirely.

Current Russian-language commentary on AI-text detection (Habr, endorsed
and repeated by the linguistic-authority site Gramota.ru) explicitly
**reuses канцелярит as the primary reader-facing AI-tell for Russian
text** — not a novel LLM-era observation, a repurposed pre-existing one.
[Habr: 6 reader-facing tells](https://habr.com/ru/articles/888614/) ·
[Gramota.ru coverage](https://gramota.ru/journal/rekomenduem/kak-otlichit-tekst-napisannyy-neyrosetyu-ryad-kriteriev-predlozheny-na-khabre) ·
[канцелярит (RU Wikipedia)](https://ru.wikipedia.org/wiki/%D0%9A%D0%B0%D0%BD%D1%86%D0%B5%D0%BB%D1%8F%D1%80%D0%B8%D1%82)

**This is why `word-blacklist-ru.md` (следует отметить, играет важную роль,
представляет собой, обеспечивает, осуществляет...) is the highest-leverage
single fix for the calibrated output.** It's not
targeting a novel machine tell — it's targeting a register Russian readers
have been trained to distrust since before either of them was born. Fixing
канцелярит buys more perceived-authenticity per word changed than any
English-specific technique in this skill, because it hits a reflex readers
already have, not one they're learning fresh from LLM exposure.

The 6 Habr-crowdsourced reader tells beyond канцелярит itself: excessive
formulaic structure (intro→bullets→smooth transitions→conclusion), overly
neutral/emotionless tone, idea-repetition without new information,
unnaturally smooth sentence-to-sentence flow, and confidently-stated
factual errors (a tell specific to content correctness, not style — not
this skill's job to fix, but worth knowing readers use it).

## The uncanny valley of text

No single canonical peer-reviewed paper coins this exact term for prose,
but the framing recurs across serious commentary, most substantively in
John Warner's essay: hyper-consistency itself is the tell — prose so
uniformly smooth it reads like "a face that is perfectly symmetrical."
[Uncanny valley of writing](https://biblioracle.substack.com/p/gpt-and-the-writing-uncanny-valley)

**Threshold, converging across sources:** perfect grammar plus uniform
stylistic smoothness across an *entire* document reads as more suspicious
than a document with small, real shifts in register or emphasis — because
genuine human writing carries "revision residue," traces of its own
drafting process, that flawless AI output structurally lacks. This is the
strongest available argument for the workflow's rule that different
sections of a text can (should) carry different levels of polish — evenness
of care is itself a tell, not a virtue.

## Trust after disclosure — the transparency penalty

Two 2025-2026 studies quantify what happens once a reader suspects AI
authorship. Disclosure produces a **"transparency penalty"** — trust drops
even when text quality is unchanged, worst for interpersonal/emotional
writing (apologies, encouragement, personal messages) and mildest for
technical/objective writing. [arXiv:2510.24011](https://arxiv.org/html/2510.24011v1)

What partially recovers trust: keeping disclosed AI-involvement under
roughly 50% of the total effort, framing AI as assistive rather than sole
author, and reader AI-literacy (literate readers read AI-use pragmatically;
less-literate readers read it as laziness). A companion study found
detailed disclosure paradoxically *increases* short-term engagement
(curiosity) even as it decreases long-term trust and increases
source-checking/skimming behavior. [arXiv:2601.09620](https://arxiv.org/abs/2601.09620)

**Implication for the doc-generation trigger** (impulse-project-management/
impulse-md-generator calling this skill automatically): the goal isn't to
"fool" a reader who already knows AI was involved in drafting — it's to
not *additionally* signal machine authorship through avoidable tells on
top of whatever the reader already assumes about tooling.

## The humanizing paradox — inserted imperfection can backfire

Research on synthetic-voice perception (vishing/deepfake-voice studies)
documents an **"imperfection heuristic"**: listeners/readers equate
disfluencies (um, filler, mid-thought correction) with real-time cognitive
processing, and read them as authenticity signals. [arXiv:2602.20061](https://arxiv.org/abs/2602.20061)

But the same literature warns *inserted* imperfections, once a reader is
primed to look for them, read as a different and often more obvious kind of
fake — "trying too hard." Separate fake-news-perception research found
errors read as authenticity markers in **social-media register** but not in
**edited-prose register** — meaning any inserted disfluency must match the
genre's own expected imperfection budget, not just exist for its own sake.
[arXiv:2402.07395](https://arxiv.org/pdf/2402.07395)

**This directly confirms `voice-and-soul.md`'s rule** (don't insert fake
conversational filler — «эм…», «ну…», «короче…» — with nothing to correct)
— the difference between `voice-profile.md`'s "короче" (a measured, real tic
from actual transcripts) and a manufactured "эм..." is exactly the line this
research draws between authentic and performed imperfection.

## Editorial/journalism flags (human editors, not detector vendors)

Newsroom internal guidance (surveyed by Nieman Lab across multiple
outlets) converges on: correlative "not just X, but Y" constructions,
formulaic transitions (moreover, in conclusion), hedging phrases,
marketing-speak, multiple redundant conclusions, and generic vocabulary
(delve, tapestry, nuance, landscape) — all of which `sentence-patterns.md`
and `word-blacklist-en.md` already ban. One flag treated as *contested, not
reliable* even by editors themselves: em-dash overuse is folk-signal
(strong community consensus, e.g. on Hacker News), not an editorially
validated one — worth keeping the per-genre em-dash norms already in
`word-blacklist-en.md` / `word-blacklist-ru.md` (2–4 journalism / 1–3 essay
/ 0–1 business per 1000 words), not escalating to a hard zero based on this
source alone.
[Nieman Lab: newsroom AI writing guidelines](https://www.niemanlab.org/2023/07/writing-guidelines-for-the-role-of-ai-in-your-newsroom-here-are-some-er-guidelines-for-that/)
