# Detection mechanics — how algorithmic detectors actually work

`rhythm-burstiness.md` covers perplexity/burstiness conceptually and names
the detectors. This file goes one level deeper: what each one's internals
actually key on, so the humanize pass targets the real mechanism, not a
folk theory of it.

## Turnitin's AI writing indicator

A proprietary transformer classifier trained specifically on GPT-3.5/GPT-4
family output, scoring at the *sentence* level and aggregating to a
document-level percentage. Since Aug 2024 it also runs a dedicated
"AI paraphrase" layer aimed at humanized/reworded text specifically — a
naive single-pass humanize is exactly what this layer targets.

**False-positive clustering.** Turnitin's own published data: document-level
false-positive rate is <1% for docs with >20% flagged content, but the
**sentence-level FP rate is ~4%** ([Turnitin: sentence-level false-positive
rate](https://www.turnitin.com/blog/understanding-the-false-positive-rate-for-sentences-of-our-ai-writing-detection-capability)).
Turnitin separately notes false positives cluster in the **first and last
few sentences** — the intro and conclusion, the most templated parts of any
document. Practical read: whatever else happens, the opening and closing
sentences of a generated doc need the most individual attention, not the
least (the opposite of how a rushed pass usually goes).

**The non-native-speaker bias problem.** Turnitin claims no significant gap
internally, but independent work disagrees sharply: a 2025 study found an
**18.7% FPR on non-native-English papers** through Turnitin specifically,
and the original Stanford paper (Liang et al.) found a **61.3% FPR across
detectors generally** on TOEFL essays. [arXiv:2304.02819](https://arxiv.org/pdf/2304.02819)
The mechanism: simple, formulaic, low-perplexity phrasing reads as
"machine-like" to a perplexity-sensitive detector — and that's exactly the
register non-native writers and rigid five-paragraph-essay writers produce
naturally. **This means the things that get real human writing falsely
flagged are the same things a humanize pass should avoid regardless of
authorship**: rigid five-paragraph structure, generic templated
intros/conclusions, simple/repetitive vocabulary. Minimum document length
for reliable scoring is 300 words (raised from 150) — accuracy craters
below that on any detector, humanized or not.

## Watermarking (SynthID and the abandoned alternative)

Google DeepMind's SynthID-Text modifies the token-*sampling* step during
generation itself — a pseudo-random "g-function" plus "tournament sampling"
reweights logits, leaving a statistical signature invisible to a reader but
detectable by a model holding the key. Not deprecated as of 2026 — expanded
past 10B watermarked items, adopted beyond Google (OpenAI, Kakao,
ElevenLabs). [DeepMind: SynthID](https://deepmind.google/blog/watermarking-ai-generated-text-and-video-with-synthid/)

OpenAI's alternative approach — a fine-tuned *classifier* model, not a
watermark — was killed in mid-2023 after catching only 26% of AI text at a
9% human false-positive rate. [TechCrunch](https://techcrunch.com/2023/07/25/openai-scuttles-ai-written-text-detector-over-low-rate-of-accuracy/)
Labs re-invested in watermarking, not classifiers, after that failure.

**Why this doesn't change how this skill works.** A watermark is embedded
by the source model at generation time — a pipeline that generates via API
then rewrites inherits whatever watermark the source model applied. SynthID's
own documentation states detection confidence **drops sharply under heavy
paraphrasing or translation** — it survives light edits and cropping but
not a genuine rewrite. This is consistent with the whole point of this
skill's workflow (draft → audit → full rewrite, not a synonym pass) —
watermark survival is one more reason a cosmetic edit isn't enough.

## Stylometric / embedding classifiers — the features perplexity misses

Production detectors (Copyleaks and similar) don't stop at perplexity —
they build frequency profiles against a corpus of trillions of pages,
tracking features deliberately model-agnostic (targeting generation
*technique*, not a specific LLM's fingerprint):

- **Type-Token Ratio and MTLD** (lexical diversity) — AI reuses vocabulary
  *within a single response* more than a human writer does. A humanize pass
  that fixes rhythm but keeps a narrow, repeated vocabulary is still
  catchable on this axis alone.
- **Function-word frequency profiles** — the distribution of the ~10 most
  common function words (的/и/но/а equivalents) has a measurable AI
  signature independent of content words.
- **Syntactic depth / parse-tree complexity** — structural predictability
  at the grammar level, not just sentence length.
- **POS-tag distribution and syllable dispersion** — even after burstiness
  is fixed at the word-count level, a flat part-of-speech rhythm remains
  detectable.

[Copyleaks methodology](https://copyleaks.com/ai-content-detector/testing-methodology)

## Ensemble systems — why fixing one axis isn't enough

GPTZero describes its own system as fusing seven components; Copyleaks and
Winston do the same — perplexity + burstiness + stylometric features +
sometimes embedding similarity, combined into one weighted score rather
than thresholding a single signal. [GPTZero: how AI detectors work](https://gptzero.me/news/how-ai-detectors-work/)

**This is the single most important operational implication for this
skill.** A humanize pass that only randomizes sentence length (burstiness)
while leaving vocabulary narrow and function-word distribution flat still
fails an ensemble detector on the axes it didn't touch. The workflow's
three-layer model (lexicon / syntax / voice) already forces varying
multiple axes — this is *why* skipping layer 3 (voice) and stopping at
layers 1-2 (word swaps + rhythm) is explicitly called a failure mode in the
main `SKILL.md`, not just a completeness nice-to-have.

## Pangram Labs — current state of the art (2024-2026)

Published technical report: a transformer classifier trained via **"hard
negative mining with synthetic mirrors"** — it continuously mines its own
false positives from large real-world corpora and retrains on them, plus
generates close AI/human "mirror pairs" as hard training examples.
[arXiv:2402.14873](https://arxiv.org/abs/2402.14873) ·
[Pangram technical report](https://www.pangram.com/blog/technical-report-february-2024)

Claims 99.85% accuracy, 0.19% FPR across 10 domains × 8 LLMs, and — the
notable claim relative to Turnitin/GPTZero above — **no measurable
non-native-speaker bias**, attributed to hard-negative training targeting
exactly that failure mode.

**Pangram 3.0 added AI-assistance detection**: trained specifically on text
where AI made only *partial/light edits* to human writing — meaning it's
tuned to catch precisely the "humanized"/lightly-touched-up middle ground,
not just fully-generated text. A cosmetic humanize pass is exactly its
training target; a genuine layer-1-2-3 rewrite is not.

## Adversarial robustness — what actually defeats detectors

DIPPER (an 11B paraphrase model with tunable lexical-diversity/reordering
knobs) dropped DetectGPT's accuracy from 70.3% to 4.6% at a 1% FPR via
paraphrasing alone, and also evaded GPTZero, watermarking, and OpenAI's
now-dead classifier. [arXiv:2303.13408](https://arxiv.org/abs/2303.13408)

Newer work (2025-2026, AuthorMist/StealthRL-family) uses RL-trained
paraphrasers optimized against *multiple* commercial detectors
simultaneously — evidence that ensemble detection genuinely raises the bar
over any single-signal approach, but real, substantial rewriting still
beats it. This validates the workflow's own repeated instruction: a
cosmetic pass fails, a genuine rewrite (draft → audit → final) works,
against both a single detector and an ensemble.

## Practical summary — what this means for the workflow

1. Fix all three layers, not just lexicon — ensembles catch single-axis fixes.
2. Vary vocabulary genuinely (MTLD/TTR), not just sentence length — reused
   words within one response are a stylometric tell independent of rhythm.
3. Give the intro and conclusion the most attention, not the least — that's
   where false positives (and by extension, true positives on lazy AI text)
   cluster.
4. Don't trust a cosmetic edit to survive a watermark or an ensemble
   detector — genuine rewriting is the only thing the adversarial-robustness
   research shows actually works.
5. Simple, formulaic, five-paragraph structure with generic vocabulary gets
   flagged even when a human wrote it — so avoiding that structure isn't
   just a "sound more human" move, it's the actual documented false-positive
   trigger. Ties directly to `sentence-patterns.md` §8's ban on the
   topic+summary paragraph template.
