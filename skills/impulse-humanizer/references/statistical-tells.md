# Statistical tells — corpus-grounded numbers, not vibes

Concrete, calibrated thresholds behind the qualitative "vary your rhythm"
advice in `rhythm-burstiness.md`. Use these as a countable check, not a
felt impression — the harvest's own research repeatedly flagged "looks
clean" as the exact point where humanization silently fails: write the
actual count down, don't trust the vibe.

## Burstiness — two countable proxies

A model can't compute a standard deviation mentally while writing, so two
simpler proxies work as a self-check:

1. **Range floor:** longest sentence minus shortest sentence, by word
   count, in the passage ≥ 20 words.
2. **Mid-band cap:** fewer than half of all sentences sit in the 10-20-word
   band.

**Both are required.** Satisfying only the range floor with one fragment
plus one long sentence, while everything else in between clusters at
12-16 words, still reads as uniform — that's the failure mode a
single-metric check misses.

For a formal population-stdev version: **≥8.0 words stdev of sentence
length = human-like, 4.0-7.9 = AI-leaning, <4.0 = strong signal.**

A harder numeric target for editing by hand: on every 5-7 sentences, at
least one should land at ≤4 words and at least one at ≥20 — variance, not
average, is what a flat-8-to-15-words paragraph fails even with zero
lexical markers present.

## Lexical diversity

**Type-token ratio (TTR)**, unique words ÷ total words: ≥0.45 acceptable,
<0.27 severe. Caveat: raw TTR is length-biased (longer texts trend toward
lower TTR structurally) — MATTR or MTLD are the length-invariant fixes if
this ever gets automated; don't compare TTR across texts of very
different lengths without one of those corrections.

## Em-dash density — real baselines, not a guess

Human published prose: roughly 1 per 1000 words. Default GPT-4-class
output: 4-7 per 1000 words. **A 600-word piece carrying 5 em-dashes is
almost certainly machine-generated regardless of what the vocabulary
looks like** — density alone, at this gap, is near-decisive.

Chinese-specific em-dash (`——`) baselines are even more register-sensitive
and near-zero in native casual writing — see `word-blacklist-zh.md`'s
register-tiered thresholds, which are stricter than the English number
above because the character costs two keystrokes and is genuinely rare in
native Chinese typing outside formal/literary registers.

## Other countable signals

- **Comma density** > 3.0 commas per sentence = AI-typical clausal piling.
- **Paragraph-length standard deviation** — same uniform-vs-bursty logic
  as sentence length, applied one level up; a document where every
  paragraph runs 80-100 words is a structural-level tell even if every
  individual sentence passes the burstiness check.
- **Sentence-opener diversity** — cap the same opening word/structure at 2
  reuses per 10-sentence window; more than that is the paragraph-level
  version of the mid-band-cap check above.

## Corpus grounding for "AI is wordier / less diverse" — HC3

From the HC3 corpus (Guo et al. 2023, arXiv 2301.07597): human answers
averaged 142.5 words vs. ChatGPT's 198.1 — roughly 39% longer for the same
question. Humans in that corpus used a larger unique-word vocabulary
(79,157 vs. 66,622 total unique words). ChatGPT text measured measurably
lower perplexity at both the text and sentence level. This gives the
"AI text is wordier and less lexically diverse" claim an actual citation
instead of stating it as received wisdom.

## Perplexity gap and Uniform Information Density (RU-specific numbers)

Even at a 99.9% human-rated style match, mean human-text perplexity runs
~29.5 vs. LLM text at ~15.2 in RU-language measurement — detectors can see
this gap even when a human reader can't feel it in the prose. The
mechanism behind it: LLMs distribute "surprisal" evenly across a text
(Uniform Information Density), while humans burst — a dense-fact
paragraph, then a light connector, then a personal aside, then dense
again. This is the precise mechanism behind "vary your density," sharper
than "vary your sentence length" alone: density of *information*, not
just syllable count, needs to burst.

A related, harder-to-fake signal (**DivEye**, arXiv 2509.18880): AI text
shows lower variability specifically in *token-level surprisal* — local
coherence over-smoothing — and this signal **survives surface rewriting**.
A word-swap-only humanization pass doesn't touch it; only genuine
structural rewriting (new sentence boundaries, new information ordering)
does.

## Readability formulas — per language, not just Flesch-Kincaid

Flesch-Kincaid is English-specific and doesn't transfer cleanly. Per-language
alternatives worth knowing exist, even without full implementation detail
here: **Wiener Sachtextformel** (German), **Flesch-Szigriszt** (Spanish),
**Gulpease** (Italian), **LIX** (the Nordic languages generally — Swedish,
Danish, Norwegian). Using Flesch-Kincaid's raw output on non-English text
and treating the number as meaningful is itself a mistake — check for a
language-appropriate formula before citing a readability score in another
language.

Sources: harshaneel/humanize (burstiness proxies, DivEye, HC3, MrBridgeHQ
statistical-tells doctrine em-dash/TTR/comma-density baselines),
ilyautov/humanizer-ru (RU perplexity/UID numbers, hard sentence-length
targets), numen-tech/slopornot (per-language readability formula mapping)
— harvested GitHub skills, distilled and re-expressed, no verbatim text
copied.
