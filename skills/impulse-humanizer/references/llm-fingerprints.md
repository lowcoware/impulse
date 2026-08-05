# Model-specific stylometric fingerprints — soft evidence, never mechanical

Explicitly a lower evidence tier than `chatbot-copypaste-artifacts.md`:
these are *observed* stylistic habits per source model, not corpus-confirmed
statistics — grade them as evidence-class "observed," never let one alone
drive an automatic verdict. Useful for guessing *which* model produced a
draft (helps calibrate what to look for), not for proving AI origin on
its own.

- **ChatGPT:** "не просто X, а Y" family constructions; "стоит отметить"
  and shallow-politeness residue; balanced on-the-one-hand/on-the-other
  framing even when unprompted.
- **Claude:** long lyrical digressions; "рваная медитативность" — staccato,
  one-word-sentence "revelations" used as a rhythm device; "давайте будем
  честны" (let's be honest) as a stock opener.
- **Gemini:** dry compactness contrasted with portentous narrative closers
  ("В этот момент стало ясно, что…" / "In that moment, it became clear
  that…").
- **GigaChat:** shorter sentences than other models; occasional
  self-identification leaks; a web-scrape artifact where a domain glues
  directly onto the end of a sentence with no space ("…предложение.rbc.ru");
  formulaic "Вот пошаговая стратегия для…" openers.
- **YandexGPT / Алиса:** a separate "Рассуждения" (reasoning) block leaking
  into output; an "Источники" (sources) footer list; a "Коротко:" closing
  summary line; "В документе 1 говорится…" numbered-document references
  surviving from a RAG pipeline.
- **DeepSeek:** code-switching leaks inside reasoning traces ("Bottleneck-ом",
  "Upgrade-нуть" — Russian grammatical endings glued onto English tech
  terms mid-thought).

## The RLHF "helpful assistant" register — the actual detection target

The single most consequential research finding across the whole harvest,
worth treating as the frame all the above fingerprints sit inside: raw,
non-instruction-tuned base-model output reads as human to state-of-the-art
detectors ("Base Models Look Human," arXiv 2605.19516, corroborated by
Pangram's own analysis). What detectors actually flag is not "AI-ness" in
some general sense — it's the RLHF-trained "helpful assistant" register
specifically: polite hedging, balanced-tradeoff offering, structured
enumeration, unrequested-option listing, pedagogical over-explanation of
terms the reader likely already knows, an "important caveats" append on
every claim, acknowledgment-prefixes ("that's a great question, and…"),
closing-summary recaps, hedged sign-offs. This reframes the whole
humanization task: the target isn't "sound less like a machine" in the
abstract, it's specifically "sound less like a helpful assistant talking."

Concrete RLHF-register tells worth adding to any scan, distinct from the
lexical/syntax layers elsewhere in this skill: "Here's how I'd think about
it..." framing, offering a menu of options nobody asked for, explaining a
term the reader obviously already knows given the rest of the text's
register, a caveat appended to a claim that didn't need one, a closing
paragraph that recaps what was just said.

Sources: RU-harvest fingerprint tables (slopotron, Vladimir-Human's
`llm-fingerprints.md`) — both graded these as soft/observed, not
corpus-confirmed, and this file preserves that discipline. RLHF-register
reframe: harshaneel/humanize, citing arXiv 2605.19516 and Pangram's
published analysis — harvested GitHub skills, distilled and re-expressed,
no verbatim text copied.
