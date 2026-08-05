# Literary/logic editing — a distinct axis from AI-tell removal

Not an AI-detector — a genre-aware structural and logical editor,
applicable whether the source text came from a machine, a tired human, or
inherited bureaucratic inertia. Complements everything else in this skill:
AI-tell removal fixes *how something sounds*, this fixes *whether the
argument actually holds together*.

## Three-way action split — hard rule

Every proposed change falls into exactly one bucket:

1. **Fix objectively** — a genuine defect (broken logic, a factual
   contradiction, a grammar error) — apply directly.
2. **Flag for author decision** — a taste-level call (sentence-length
   rhythm, a synonym choice, a colloquialism, a metaphor) — propose it,
   never apply it silently.
3. **Leave alone** — the text is fine as written.

**Anything in bucket 2 does NOT enter the final text even if it's flagged
as cosmetic improvement** — the author decides taste, the editor only
decides correctness. This is a stricter consent boundary than this
skill's default draft→audit→final workflow, worth reaching for on
higher-stakes or personally-voiced text (an essay, a personal post) where
silently "improving" the author's stylistic choices is itself a harm.

## Genre modes change the rules, not just the intensity

Four modes, and switching modes changes which rules even apply, not just
how aggressively they're enforced:

- **Инфостиль** (information style) — stop-words and shortening applied
  aggressively.
- **Гибрид** (hybrid) — a middle setting.
- **Голос** (voice — essay, personal writing, fiction) — stop-words and
  shortening almost never applied; only objective defects get touched.
- **Устная речь** (spoken-transcription) — different rules entirely,
  since the source is a transcript, not composed prose.

This is a sharper version of `register-conventions.md`'s general
"genre has legitimate conventions" doctrine — here the genre doesn't just
gate *which patterns count as tells*, it gates *which categories of edit
are even permitted*.

## The one universal exception: parcellation (парцелляция)

Regardless of genre mode, one thing always gets fixed: a sentence
fragment with no grammatical core, sitting after its base clause in the
same paragraph, gets glued back into full syntax. Explicit reasoning
given in the source: "for neural nets this is a tic, not a device" — it's
never a deliberate rhythmic choice when it shows up this way, it's a
generation artifact. Contrast with deliberate authorial rhythm — a long
buildup followed by a short landing, where the short landing STILL has a
grammatical core — which is protected in every mode as legitimate style.

**The glue test**: does merging the fragment with the previous sentence
via a comma or dash produce a natural, complete phrase? If yes, it was
never a deliberate fragment — glue it. If merging would break the
sentence's sense, it might be genuine authorial rhythm — leave it, but
flag for author confirmation per the three-way split above.

## Four classical logic laws — a dedicated check pass

Run as a distinct pass from style checking: **identity** (does a term mean
the same thing every time it's used, or does its meaning silently drift
mid-argument?), **non-contradiction** (does any claim in the text
contradict another claim elsewhere in the same text?), **sufficient
reason** (does every conclusion actually follow from stated premises, or
does the text assert a conclusion without the argument that would earn
it?), **homogeneous enumeration** (does a list mix items from
incompatible categories — comparing apples to a color, or listing "speed,
reliability, and our new office" as parallel items?).

## Fact-flag, not fact-fix

For a questionable number, date, or quote encountered during logic
editing: flag it, don't silently correct it, and never delete it without
the author's confirmation — the editor may be wrong about what's actually
correct. This mirrors this skill's own honesty rule
(`voice-profile.md`'s honesty section) but as a dedicated pass during
logic editing specifically, not just during voice work.

## Reverse-outline technique (long-form)

For anything long enough that the argument's shape is hard to hold in
mind at once: rebuild a bare "chapter → claim → evidence" map from the
finished text, stripped of all prose. This map makes sagging middles and
redundant loops visible in a way that reading the prose straight through
doesn't — a structural defect that's invisible sentence-by-sentence
becomes obvious once the whole argument's skeleton sits on one page.

Sources: beaverbeard/chukovsky, harvested GitHub skill, distilled and
re-expressed, no verbatim text copied. Named for Korney Chukovsky's and
Nora Galь's editorial tradition, cited by the source repo as its lineage.
