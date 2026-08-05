# Chinese mechanical lint — a runnable, regex-backed detector

Distinct from `word-blacklist-zh.md`'s prose reference: this is the shape
of an actual runnable linter (originally a stdlib-only Node.js script) for
Chinese AI-tell detection, organized into 6 meta-patterns with 90+ named
regex-backed rules plus ~30 judgment-only checks too fuzzy for a regex.
Model this shape for the lint-mode workflow described in SKILL.md, adapted
to whatever tooling the target project actually has available.

## Six meta-patterns

**A. 套话填充 (filler boilerplate)** — stock connective/hedge phrases,
mechanically detectable the same way the RU/EN word-blacklist files work.

**B. 修辞反差 (rhetorical contrast)** — false-contrast constructions
("不是X，而是Y" family), same shape as the EN "not just X, it's Y" pattern
in `sentence-patterns.md`.

**C. 隐喻拟人化 (metaphor-anthropomorphism)** — genuinely novel, not
covered anywhere else in this suite. A systematic catalog of AI Chinese
prose assigning human verbs/feelings to non-human subjects: a process
"died" or "is alive" (进程"死了"/"活着"), a problem "popped up" or
"surfaced" (问题"冒出来"/"浮出水面"), a system that "likes" or "dislikes"
(系统"喜欢"/"讨厌"), a CPU that "got eaten" or "burned" (CPU"被吃掉"/
"被烧"). **Explicit legitimate-exception list**: verbs applied to the
*model itself* as subject (模型理解/思考/学习/记得 — "the model
understands/thinks/learns/remembers") are industry-standard usage, never
flag these. Only flag human-register verbs applied to a non-model,
non-human subject (a database, a queue, a cache).

**D. Anchor/connector absence** — same family as the RU finding (§12,
paragraph-connector-absence): paragraphs starting from a blank slate with
no connective tissue to the previous one.

**E. 装饰自评 (decoration self-labeling)** — a passage that labels its own
rhetorical move ("值得注意的是" / "worth noting is") rather than just
making the point.

**F. 口语化 (colloquialism)** — over- or under-application of casual
register markers, register-mismatched against the surrounding text.

## Structural rules (beyond the word/phrase level)

Rigid-enumeration markers (首先/其次/再次/最后 used as a mechanical
four-step scaffold); long-的-chain sentences (≥4 的-linked modifiers in
one sentence); multi-negation pileup (≥3 negations in one sentence);
identifier-stuffing (≥3 backtick-wrapped code identifiers crammed into
one sentence, a structural tell independent of the identifiers'
individual validity).

## Whitelist against false positives

A compound-word whitelist prevents regex substring matches from
false-flagging legitimate words that happen to contain a flagged
character sequence (搞清楚/玩具/挺拔 all contain characters that would
otherwise trigger a naive substring match). Any mechanical Chinese linter
needs this kind of whitelist layer — Chinese has no word-boundary
character the way English has spaces, so naive regex is far more
false-positive-prone here than in EN/RU.

## Escape-hatch comment syntax

A working linter needs an explicit override mechanism a human author can
invoke inline: a single-line ignore (`<!-- check:ignore-line -->`), a
rule-specific ignore (`<!-- check:ignore=rule-code -->`), and a
whole-file disable (`<!-- check:file-disable=... -->`). Without this, any
mechanical checker eventually gets disabled wholesale the first time it
false-flags something a human deliberately wrote that way.

## Judgment-only checks (§A-§AE) — too fuzzy for regex, still worth running

**§Z "suspicion ≠ verdict"** — a 3-question gate every regex hit must
clear before actually editing: (1) does the claimed "对立面"/contrast
counterpart genuinely exist, or was the contrast invented for rhetorical
shape? (2) does the proposed replacement lose real semantic weight —
example: "怎么治" (how to treat, implying systemic ownership of the
problem) vs. "怎么修" (how to fix, a one-off repair) are not
interchangeable, downgrade the flag if replacing would lose this
distinction; (3) is the hedge word doing actual contrast work, or is it
pure filler? This is a more formalized anti-over-correction discipline
than anything else in this suite's audit process — worth adopting as a
general pattern, not just for Chinese.

**§O "over-compression"** — a distinct failure mode: AI Chinese prose
compressing to fragments that drop the subject or object entirely
("最多10步停" — stops what? who does the stopping? → the fix supplies
both: "agent loop最多跑10步就强制结束"). Detection heuristic: a
dash/colon-introduced explanation ≤5 characters long, or a bare
single-character verb (停/退/崩/挂/跑) immediately following a quantity
phrase with no subject.

**§Y "sentence-role audit"** — classify every sentence into one of 5
discourse roles (场景/scene-setting, 论据/evidence, 结论/takeaway,
转折/pivot, lead-in) *before* checking word choice, because the same
word is correct in one role and wrong in another — a colloquial phrase
like "跑稳"/"搞定" is fine as scene-description, wrong as a paragraph's
takeaway sentence, which needs weightier phrasing like "稳定运行."

**§AB "soft-promo vs. tutorial-book boundary"** — a real editorial-
integrity check, distinct from a style tell: a promotional article that
references a product's internal variable names, exact numeric constants,
or lines-of-code counts as if they were common public knowledge is a
**verifiability failure** — a reader who goes and checks the actual
source code loses trust when the casual reference doesn't hold up. Flag
this as a distinct category from AI-style tells, worth cross-referencing
in any fact-checking pass.

**§AC "concept restatement vs. genuine repetition"** — the same concept
appearing across intro/problem-statement/categorization/deep-dive/summary
sections is NOT redundancy if each occurrence serves a genuinely
different discourse function (the "spiral curriculum" shape, where a
concept is revisited at increasing depth). Only flag repetition when the
*same functional role* repeats with the *same claim* — don't flag a
concept for merely being mentioned more than once.

## Full punctuation reference (中文标点)

Comma/period/colon and the rest must be full-width when adjacent to
Chinese characters, regardless of any embedded English terms nearby — but
**code blocks get the reverse rule**: full-width punctuation appearing
inside a code block is almost always an IME typo, and should be flagged
as an error, not a style warning. Concrete Chinese/English spacing
convention: a half-width space between 汉字 and adjacent English words or
digits.

Sources: woai3c/humanize-skill (`rules.json` + `detect.js` + reference
files) — harvested GitHub skill, MIT-licensed, distilled and re-expressed
into prose description, no code or verbatim regex copied. Verify actual
regex syntax against the source before implementing a real linter from
this description.
