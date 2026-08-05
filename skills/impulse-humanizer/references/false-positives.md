# False-positive boundaries — required reading before any AI-tell verdict

No single soft marker is ever sufficient for an "this is AI" verdict.
The bar to clear: **(a)** one Class-A chatbot-copy-paste artifact
(`chatbot-copypaste-artifacts.md`), **(b)** a confirmed source fabrication
(`source-fabrication.md`), or **(c)** three-or-more soft markers from
*different* categories (lexical/syntactic/structural/communicative — not
three from the same family, which is just one pattern repeated). Anything
short of that bar is "flag as suspicious," not "declare AI."

## Concrete exemptions — legitimate human usage that looks like a tell

- **Em-dash in literary prose** in the tradition of Tsvetaeva/Brodsky-style
  Russian writing, or any writer whose style genuinely uses heavy dashes —
  don't flag density alone without checking whether the register is
  literary.
- **Curly quotes** from macOS/iOS autocorrect — a platform artifact, not
  an AI signature.
- **Rule of three as classical rhetoric** — "veni, vidi, vici," "liberty,
  equality, fraternity" — the device predates LLMs by two thousand years;
  the tell is *frequency* (more than one per 500 words), never the device
  itself.
- **"Delve"/"погрузиться"** in text with a pre-Nov-2022 date, or in
  pre-existing academic register where the word was already standard —
  age and register both defeat this marker on their own.
- **Канцелярит as mandatory register** in legal documents — the same
  words that are a tell in a blog post are the *correct* register in a
  contract.
- **Long Tolstoy/Dostoevsky-style subordinate-clause sentences** — a
  genuine literary-tradition sentence shape, not a generic "subordinate
  clause overload" tell; check whether each clause carries real semantic
  weight (literary) vs. is padding (AI).
- **Title Case** in English is a tell only when the pattern *repeats*
  across a whole document — one Title-Case heading proves nothing.
- **Markdown syntax in a programmer's personal notes** — normal working
  format for that author, not evidence of chatbot origin.
- **Academic passive voice / hedging cascades / "является"** — correct
  register in academic writing, not a tell, when the rest of the paper's
  conventions match (see `register-conventions.md` for the broader
  "genre has legitimate conventions" doctrine).
- **DACH regional German** (Austrian/Swiss lexis, syntax, register) is not
  an AI-tell and must never be "corrected" toward Bundesdeutsch — CH runs
  formal-precise, AT runs historically elaborate, DE runs direct-terse;
  all three are authentic native registers.
- **Anti-entropy overcorrection is itself a mistake to avoid**: don't
  scatter fragments/errors/rare words purely to raise a burstiness score —
  that's forced entropy-injection, and it makes text *worse* (less
  precise, less readable) while possibly still not fixing the actual
  detector signal. Randomness for its own sake is not the goal; genuine
  variation grounded in real content is.

## Positive evidence — signs FOR human authorship

A different axis from "absence of AI-tells": actively look for evidence
the text was written by a specific person, not just evidence it lacks
machine polish.

- Text dated before Nov 2022 (pre-ChatGPT-public) is strong evidence on
  its own.
- The author can explain *why* they chose a specific word or phrase —
  ask, if this is interactive.
- A sharp, provocative, or ironic stance the model wouldn't default to
  (models are trained toward balanced/hedged framing).
- A hard-to-invent personal detail — the kind of specific, slightly odd,
  remembered-not-generated fact a model wouldn't fabricate unprompted.
- Admitted uncertainty or genuinely mixed feelings about a single claim
  (not blanket hedging over everything — see the "uncertainty goes where
  the uncertainty is" positive-craft rule in `positive-craft.md`).
- "Live syntax" substitutions: plain "есть/это" instead of "представляет
  собой," a plain verb like "умер" instead of a euphemism like "ушёл из
  жизни," a categorical superlative stated flatly, a clunky-but-human
  connective like "из-за того, что" instead of a smoothed formal
  connector.

## Two failure modes this file exists to prevent

**Over-flagging** turns the skill into a school-essay-ifier that strips
legitimate register, literary devices, and domain conventions — see
`register-conventions.md` for the genre-specific version of this same
caution. **Under-flagging** happens when a reviewer treats a single soft
marker as sufficient — the three-category-minimum rule above exists
specifically to prevent this.

Sources: Vladimir-Human/humanizer-ru (`false-positives.md`),
marmbiz/humanizer-de (Anti-Entropy-Reflex, DACH-Regionalstil) — harvested
GitHub skills, distilled and re-expressed, no verbatim text copied.
