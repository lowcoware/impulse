# Register conventions — what's a tell HERE, legitimate THERE

The recurring pattern across nearly every harvested specialized-register
humanizer (economics papers, technical docs, marketing copy, legal text):
every genre has its own legitimate conventions, and applying a
general-purpose AI-tell rule inside a genre that legitimately uses that
exact phrasing produces a false positive AND damages the text's actual
correctness. This file collects the register-specific "know this before
you flag it" tables. Cross-reference `false-positives.md` for the general
version of this caution; this file is the genre-by-genre specifics.

## Content-type intensity matrix (RU source, generalizes)

Not every genre gets the same enforcement intensity:

| Genre | Intensity | Applied patterns |
|---|---|---|
| Marketing | Maximum | full catalog |
| Expert/technical content | High | lexical + structural tells only |
| Business correspondence | Medium | lexical + light structural — never touch formal register or polite address forms |
| Documentation | Low | lexical only — never touch structure or established terminology |
| Legal text | Minimal | factual-error-level only — everything else IS the required legally-binding language |
| Direct quotes | Zero | never touch a quotation, ever |

## Economics/academic papers — legitimate formal-register phrasing

"we estimate," "本文使用" ("this paper uses"), "robustness checks" are
conventional economics-paper phrasing, not AI tells — leave them alone.
**Causal-language discipline table**, mapping verb strength to evidence
strength (a distinct, more precise version of this skill's general
"don't invent facts" rule):

- **Strong causal claim** ("causes," "leads to," "we identify the effect
  of") — only legitimate when the paper's actual research design
  supports a causal claim.
- **Moderate claim** ("affects," "is associated with," "is consistent
  with") — for correlational evidence that doesn't license a causal
  claim.
- **Descriptive claim** ("documents," "shows," "correlates with") — for
  observation without any implied mechanism.

Using a stronger causal verb than the evidence supports is a precision
failure, not a style tell — check this before applying any general
lexical humanization pass to an academic or research-adjacent text.

## Technical documentation — the "AI sheen" failure mode

The dominant failure mode in technical writing isn't wrong word choice —
it's **AI wrapping technically-correct content in unnecessary narrative
scaffolding**: an "Overview" section that just restates the document
title, a "Conclusion" section in a 400-word README, verbose comments
explaining something the code already makes obvious. The fix is usually
to **delete the paragraph entirely**, not rewrite it — this is a fourth
failure mode distinct from this skill's three-layer lexicon/syntax/voice
model, closer to "unnecessary scaffolding around otherwise-fine content"
than a word- or sentence-level problem.

**The "replace with 'good'" heuristic** for calibrating suspect technical
vocabulary: if swapping "robust"/"scalable"/"comprehensive" for the plain
word "good" preserves the sentence's actual meaning, the original word
was decorative sheen — flag it. If the swap loses real technical
precision ("robust to network partitions" → "good to network partitions"
genuinely loses meaning), the word is doing legitimate technical work —
leave it. This is a concrete, portable test, and it works better than a
static banned-word list specifically for technical registers, where
context determines legitimacy more than the word itself does.

**Content-type numeric weighting** (a more precise alternative to a
purely qualitative genre table): score each register across three axes —
statistical, stylistic, structural — with different weights per genre.
Example weights: technical = {0.5, 0.7, 0.3} (relax across the board;
repeated technical vocabulary and heavy header/bullet structure are
*expected*, not a tell, in technical writing); marketing = {1.0, 1.0,
1.0} (full enforcement — marketing copy carries the highest actual
detection risk and the least legitimate excuse for AI-typical patterns).

**Design-doc/RFC/ADR-specific guidance**, directly relevant to
`impulse-project-management`'s ADR format: a "Decision" section is
fine and expected; a separate "Conclusion" section appearing *after* it
is sheen — cut it. No "Executive Summary" needed for a document whose
actual audience is engineers who will read the whole thing anyway.

## Ogilvy's five checks — copywriting craft, not detection literature

A genuinely different source lineage from every detection-research-based
pattern elsewhere in this suite: five operationalized checks from David
Ogilvy's 1982 "How to Write" memo.

1. **Sound like a person talking** — the read-aloud stumble test:
   if it doesn't sound like something a person would actually say out
   loud, rewrite it.
2. **Short words, short sentences, short paragraphs** — not a hard limit,
   a *trigger to look closer*: flag Latinate words with plain
   equivalents ("utilize" → "use," "terminate" → "end"), and treat
   sentences over ~30 words or paragraphs over ~5 lines as worth a second
   look, not an automatic violation.
3. **No jargon** — split into three distinct sub-categories, each needing
   a different fix: invented-abstraction jargon ("operationalize,"
   "ideate," "incentivize" — replace with the plain verb); corporate
   filler ("circle back," "move the needle," "north star" — cut
   entirely); unexplained domain terms (define on first use, or cut if
   not actually needed). The underlying test: "can the writer say it
   plainly? If not, the *thinking* is the problem, not just the word
   choice" — jargon often signals unclear thinking underneath, not just
   bad style.
4. **Verify quotations, statistics, dates, names** — flag anything
   unverifiable as needing verification; never invent a quote, and never
   "improve" a real quote's wording.
5. **Is the ask crystal clear** — after reading, could the recipient
   state exactly what they're meant to do next? The clarity bar is
   genre-specific: an email needs a clearer ask than a longform essay
   does.

**Mode split worth adopting as an explicit procedure**: preserve-mode
(strip AI tells only, actively protect the writer's own voice, hedges,
and digressions) vs. conform-mode (strip tells AND rewrite toward a
specific target-voice file) — resolved through a discoverable precedence
chain rather than assuming a voice profile always exists: an explicit
flag, a named style-file path, a `HUMANIZE_STYLE.md` file in the project
root as an opt-in signal, falling back to any voice section already in
`CLAUDE.md`/`AGENTS.md`, and only then a default profile. This makes the
"which voice am I calibrating to" decision procedure explicit and
file-discoverable, rather than silently assuming `voice-profile.md`
always exists and is the only source of truth.

## Substitutability test (marketing-specific)

Swap the brand or author's name for a direct competitor's — if the copy
still reads as true after the swap, it's generic AI filler with no real
specificity, regardless of how polished the sentences are.

## Article-formula skeletons — structural starting points, not tells to avoid

Five named document-level skeletons worth using as a structural starting
point before applying any humanization pass, not as patterns to flag:

- **Engaging/social** — hook → problem → twist → CTA or open question,
  short paragraphs throughout.
- **Expert/Habr-style** — concrete problem or case → why-this-matters-now
  context → data-driven breakdown → honest limitations stated plainly →
  actionable conclusion. Tone: "I worked through this and I'm sharing it"
  — not "here is the truth."
- **Landing/sales copy** — pain → amplification → solution → proof →
  a single call to action. Explicitly ban "инновационные решения"/
  "innovative solutions" and "комплексные подходы"/"comprehensive
  approaches" as filler even within this otherwise-legitimate persuasive
  structure.
- **News** — inverted pyramid, no author opinion in the body text.
- **Storytelling** — hero with a problem. LLMs default to third-person
  narration with no real surprise; the fix is simplifying toward
  first-person with an actual surprise moment, not adding more narrative
  complexity on top of the flat default.

Sources: Ecow0ker/econ-humanizer-skills (causal-language table),
MrBridgeHQ/human-writer-en (AI-sheen framing, "replace with good"
heuristic, content-type weighting, substitutability test, design-doc
guidance), ameenmo/humanize-skill (Ogilvy's five checks, preserve/conform
mode split), ilyautov/humanizer-ru (intensity matrix, article-formula
skeletons) — harvested GitHub skills, distilled and re-expressed, no
verbatim text copied.
