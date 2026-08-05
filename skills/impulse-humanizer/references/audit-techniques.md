# Audit techniques — beyond the single-pass "name 3-5 tells" step

`sentence-patterns.md`'s audit checklist stays the fast default. This file
holds the deeper multi-pass techniques worth reaching for on longer or
higher-stakes text — a report, a long-form piece, anything where a single
audit pass is likely to miss something.

## Traffic-light paragraph triage (do this first, before any rewrite)

Mark every paragraph before touching anything: **red** (3+ markers →
full rewrite), **yellow** (1-2 markers → surgical edit only), **green**
(clean → do not touch). Rewriting a clean paragraph introduces *new*
markers that weren't there before — and a document that mixes genuinely
clean paragraphs with edited ones is empirically the hardest shape for a
detector to flag confidently (cited precision on mixed-content documents:
<62%, per DivEye). Editing everything uniformly, even the parts that
didn't need it, makes the whole document easier to flag, not harder.

## Quad-pass audit (for text over ~300 words)

Run these in sequence, after the draft rewrite, before calling it final:

1. **Detector pass** — mechanical re-scan against the pattern catalogs in
   `word-blacklist-*.md`/`sentence-patterns.md`, ~30 seconds per category,
   nothing new here beyond doing it systematically.
2. **Person-on-the-street pass** — stop being the editor. Read as a random
   feed-scroller and ask "would I think a neural net wrote this?" Six
   concrete red flags to check for: too smooth, every paragraph the same
   length, every transition equally smooth, zero unexpected word choices,
   the text could be about almost anything (genericness), an emotional
   flatline (all-positive or all-neutral, nothing sharp or specific).
3. **Cardiogram pass** — mentally graph, sentence by sentence, "how
   unexpected is this given the sentence before it." A flat line across
   the whole passage means insert 2-3 genuine spikes: an unexpected
   comparison, a sharp question, a bare number dropped into otherwise
   qualitative reasoning, a parenthetical personal aside.
4. **Skeleton pass** (for text with lists or numbered sections) — read
   ONLY the first line of every list item or section, in sequence,
   ignoring the content underneath. If 3+ start identically, that's a
   "macro-burstiness" failure — invisible to passes 1-3, which only check
   uniformity *within* a block, not uniformity *between* blocks.
5. **Cash-out pass** (conditional — expert/technical text only) — every
   term that gestures at a mechanism must actually cash out into "what
   specifically is happening." No answer available → rewrite as an actual
   mechanism or delete the term entirely. Wrong mechanism supplied →
   worse than no mechanism at all, fix it rather than decorating it
   further. A term used with two different meanings in the same piece
   ("floating term") → anchor it, define it once at first use.

## Blind verification (cheap, catches editor self-blindness)

Hand a fresh context — a subagent with no prior involvement, or genuinely
set the text aside and come back later — ONLY the final text plus the
pattern reference sheet, with no original draft, no findings table, no
edit history. Ask it to independently find patterns. The reasoning: the
editor who made the edits recognizes their own phrasing and unconsciously
grades it softer than a genuinely fresh read would. This is a real,
reusable QA technique for the humanizer workflow itself, not just for the
target text.

## Self-rewrite-distance check (a cheap detector substitute)

Ask a different model/context to "rewrite this in different words." If
the rewrite comes back near-identical to the input, the text is still
sitting at a local probability maximum — it reads as AI-generated even
without running it through an actual detector. This is a genuinely novel
verification technique, usable without any external detector tool at all.

## Contrastive subtraction (a positive, generative technique)

The counterpart to every removal-oriented rule elsewhere in this skill:
in each sentence, find the single MOST predictable word and swap it for a
less-probable-but-still-fitting one. "нашли решение" (found a solution) →
"нашли выход/лазейку/костыль" (found a way out / a loophole / a
workaround) — concrete, character-appropriate, not a generic synonym.
Cited as outperforming three separate stylistic fixes combined in
controlled comparison (CoPA, EMNLP 2025). Where every other technique in
this skill is about deleting AI markers, this one is about actively
demoting the most machine-typical word choice at the sentence level.

## Noise budget (guards against polish drift)

Cap a revision pass at 8-12 non-essential expression-level changes per
1,000 characters — argument-level fixes (fixing something actually wrong)
don't count against this cap. Exceeding it mid-pass means pausing and
checking with the author before continuing. This guards against "polish
drift": each individual change is reasonable in isolation, but the
accumulation produces a text nobody actually wrote, in a voice that
belongs to neither the original author nor a deliberate style.

## Over-imitation guard (the reverse failure mode)

The opposite problem from AI-tell removal: a revision that mechanically
piles up the *author's own* signature features until the voice becomes a
caricature of itself — first person in every single sentence, comma-flow
chains everywhere, a rhetorical question forced at every pivot point. Test
against the author's own measured base rate from their real samples, not
against presence/absence — `voice-profile.md` calibrates a target voice,
but doesn't currently audit for *over-application* of that voice once
calibrated. This closes that gap.

## Homogenization warning (DAMAGE)

LLM rewriting measurably strips conversational asides, personal
anecdotes, and colloquial phrasing, replacing them with neutral phrasing
(a cited +70% shift toward neutral-essay register when LLM-assisted) —
even a prompt as innocuous as "just fix the grammar" measurably shifts
semantics. If the source text has a personal story or an idiosyncratic
phrase, it must be **preserved**, never "improved" into neutral register.
The uniform "humanized" style that results from running everything
through one tool is itself detectable — this pattern is named DAMAGE in
the source research. Theoretical grounding for this skill's existing
"don't turn into a school essay" rule — the rule isn't arbitrary taste,
it's a measured failure mode with a name and a citation.

Sources: ilyautov/humanizer-ru (quad-pass, traffic-light triage,
contrastive subtraction, DAMAGE citation), smixs/humanizer-ru (blind
verification), harshaneel/humanize (self-rewrite-distance/Raidar
citation), tizzy916/humanities-writing-companion (noise budget,
over-imitation guard) — harvested GitHub skills, distilled and
re-expressed, no verbatim text copied.
