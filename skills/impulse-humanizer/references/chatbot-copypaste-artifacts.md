# Chatbot copy-paste artifacts — mechanical, near-zero false positives

A distinct evidence class from every stylistic pattern elsewhere in this
skill: these are literal interface/rendering leftovers from a chat UI that
survived into copy-pasted text. Unlike a word-choice or syntax tell (which
needs density/corroboration to mean anything — see `false-positives.md`),
**a single occurrence of a Class A marker below is near-certain proof the
text is unedited chatbot output**, because no human writing process
produces these strings. Class B markers are contextual and need
corroboration like any other soft signal.

## Class A — single occurrence is enough

**OpenAI-family citation/tool-call leaks:**
`:contentReference[oaicite:N]{index=N}`, `oai_citation:N‡`, the
`turn0search0`/`turn0fetch0`/`turn0file2`/`turn0image0` family,
`citeturn0file0`, `【N†source】`.

**UTM tracking parameters appended to URLs** (users copy these straight out
of the chat interface without noticing): `utm_source=chatgpt.com`
(pre-Aug-2025 convention) vs. `utm_source=openai` (post), `utm_source=
copilot.com`, `referrer=grok.com`.

**Grok:** `grok_card://`, `grok_render_citation_card_json={...}`,
`<grok-card citation_card>`.

**Gemini:** `vertexaisearch.cloud.google.com/grounding-api-redirect/`,
`[cite_start]`, `[cite: 8]` / `[cite: 19, 20, 21]`,
`[span_2](start_span)` / `(end_span)`.

**Perplexity:** `[citation:N]`, `[attached_file:N]` / `[web:N]`, an S3 URL
containing `ppl-ai-file-upload`.

**DeepSeek:** stray `<think>…</think>` tags left in the pasted output,
`【85†L261-269】`-style line-range citations.

**Placeholder leaks:** `INSERT_SOURCE_URL`, `PASTE_*_URL_HERE`,
`[Your Name]` / `[Topic]` unfilled template slots, placeholder dates like
`2025-XX-XX`.

**Invisible/private-use Unicode:** `U+E200`-`U+E204`, `U+EA01`/`U+EA02`
(wraps a bare citation digit invisibly), zero-width `U+200B`-`U+200D`/
`U+FEFF` (exclude legitimate ZWJ sequences inside emoji), non-breaking-space
homoglyphs where a normal space is expected.

**Broken-render concatenation artifacts:** "Source+1Source+1"-style
strings (`Wikipedia+1`, `IT Governance+3ISO+3`) from a citation-count badge
that rendered as text instead of a UI element.

**Stale knowledge-cutoff disclaimers:** "As of my last knowledge update…",
"На момент моего обучения…" — a chatbot register marker that never
belongs in a human-authored final document.

## Class B — contextual, needs corroboration

Markdown/wikitext syntax surviving into non-wiki/non-markdown prose
(`[[Category:...]]`, `{{template}}`); a heading-level skip from H1 straight
to H3 with no H2 (an LLM's flattened mental TOC, not a deliberate document
structure); a raw component-block string like
`:::writing{variant="document" id="..."}` leaking from an editor's
internal markup.

## False-positive boundary — check before flagging

`[^1]` single-caret is a normal Markdown footnote — not a marker.
`[^N^]` double-caret specifically is the Copilot artifact. Don't flag
plain footnotes.

## Code-adjacent variant

`P46 Diff-Anchored Writing` (a distinct code-review-flavored tell,
converging independently from two harvested sources): prose that describes
*what changed* ("refactored to replace the callback with async/await")
rather than *what the code now does*. This is a chatbot-summarization habit
bleeding into commit messages and PR descriptions, directly relevant to
this suite's own commit/PR-writing output — check generated commit
messages and PR descriptions against this pattern specifically.

Sources: ivan-magda-adjacent RU harvest (Vladimir-Human/humanizer-ru) and
Aboudjem/humanizer-skill (P34/P35/P33/P46), harvested GitHub skills,
distilled and re-expressed — the two sources independently converged on
several of these markers, which is itself corroborating evidence they're
real. No verbatim text copied; regex forms paraphrased from the observed
pattern, not lifted from source code — verify exact regex syntax before
shipping a mechanical linter against these.
