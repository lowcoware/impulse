# Word Blacklist — Chinese (中文): lexical, punctuation, syntax

Chinese-language AI-tell catalog. Distinctive structural feature versus
the RU/EN lists: nearly every rule here carries an explicit **register
gate** — Chinese AI-tell density and acceptability vary far more sharply
by register (casual/social-media/business vs. official-document/academic/
exam-essay) than in RU or EN, so a pattern's status ("flag" vs "leave
alone") is register-dependent by design, not a universal rule. For the
mechanical regex-backed detector system built on top of a similar
pattern base, see `zh-mechanical-detector.md`.

## A. 过度拔高意义 — significance inflation

"标志着...新阶段" (marks a new stage/era) and its family — legitimate,
expected phrasing in government reports and academic introductions;
an AI-tell only in casual/social/business registers where the actual
stakes don't warrant the elevation.

## B. AI高频词过载 — high-frequency AI vocabulary overload

赋能 (empower) / 助力 (assist/boost) / 打造 (forge/build) / 护航 (escort/
safeguard) / 抓手 (grip-point/lever) / 闭环 (closed loop) / 生态
(ecosystem) / 底层逻辑 (underlying logic) / 高质量发展 (high-quality
development). A single word from this list is not evidence of anything —
the tell is **3+ co-occurring** in one passage.

## C. 中英术语强行括注 vs. 该用中文却留英文

Two near-mirror-image errors, both flaggable, kept as separate rules
because they're opposite mistakes:
- **Redundant bracket-gloss**: `算力(compute)` when the Chinese term
  already stands alone and needs no English gloss.
- **Untranslated English left in** when a stable Chinese term exists —
  leaving "argument"/"workflow"/"context" in English mid-sentence rather
  than using the established Chinese equivalent.

## `性`/`化` suffix stacking — whitelist-gated

Decorative stacking of `性`/`化` suffixed abstractions (精细化/精益化/
精准化/精致化 strung together) is a tell — but there's a **hard whitelist
of ~30 terms** with genuine, stable English equivalents (可持续性 =
sustainability, 数字化 = digitalization, 鲁棒性 = robustness, etc.) that
never trigger this rule regardless of density or register. Only
non-whitelisted decorative stacking counts.

## Three-tier native-form whitelist

Chinese internet subcultures have stabilized native forms for foreign
terms that are neither literal translation nor raw English — "helpfully
translating fully" is itself the AI-tell here, the inverse of the usual
"translate foreign terms" instinct:
- Sports proper nouns kept in their stabilized native form.
- Tech/internet abbreviations kept as-is (MCP, TLDR, API) — translating
  these is the tell, not leaving them.
- Celebrity nicknames kept as their community-standard form (霉霉 for
  Taylor Swift, 黑曼巴 for Kobe Bryant) — translating 霉霉 back to
  泰勒·斯威夫特, or NBA to 美职篮, is itself the AI-tell.

## Second-person genericization

AI defaults to addressing readers as "用户"/"大家"/"各位" (users/everyone)
in contexts where a human writer would use direct "你" (you) address —
diagnosed via a real analyzed example (a farewell letter using "you" 30+
times and "users" only twice, both instances genuinely referring to a
distinct third party, not the reader).

## Table-abuse

Narrative content forced into a markdown table where flowing prose would
read more naturally — a structural tell, not a lexical one.

## Template-placeholder residue

Unfilled slots like `XX路XX号` (address placeholder), `X.X星`, `{{变量}}`
surviving into supposedly-finished content (e.g. a "restaurant review"
that never got real details filled in). A single occurrence is hard
evidence — no density threshold needed. Distinguish from deliberate
authorial vagueness: if the rest of the text is concrete and only this
one spot is an abstract placeholder, it's residue; if the whole text is
uniformly vague, that's an authorial choice, not a tell.

## Punctuation

- **顿号「、」vs. comma** for parallel items — AI conflates the two,
  defaulting to a Western comma where Chinese convention calls for the
  enumeration-specific 顿号.
- **分号「;」 is register-gated** — near-zero baseline in casual writing,
  legitimate in editorial parallel-clause writing (cited example: 南方周末
  New Year editorials use it deliberately).
- **书名号《》** systematically under-used by AI in favor of quotation
  marks for titles.
- **省略号「……」** baseline ≈0 in serious journalism (measured against
  real 三联生活周刊/南方周末/财新周刊 issues); legitimate only in
  dialogue, casual writing, or literary register.
- **Empirically observed frequency ordering** from serious Chinese media,
  rarest to most common: `。, 、: ""? ! 《》 —— ; ……()` (right = rarest).
  AI output tends to invert this ordering — overusing em-dash/semicolon/
  parens while underusing 书名号/ellipsis relative to the real baseline.
- **Em-dash (`——`) density is register-tiered**, stricter than the
  general-language baseline in `statistical-tells.md`: casual/social
  register ≥2 per 300 characters triggers (native casual typing baseline
  is close to 0 — the character costs two keystrokes and is genuinely
  rare); formal/general register ≥3; essay/literary registers keep the
  older, looser "≥3 AND content-empty" threshold specifically to protect
  legitimate heavy-dash stylists (鲁迅/钱钟书/王小波 cited as protected
  examples). Self-check for every dash: can it be losslessly replaced by
  a comma, a parenthesis, or a colon? If yes, cut it.

## Syntax — English-residue patterns in Chinese

Ten catalogable English-syntax calques surviving translation-through-
generation into Chinese: over-explicit pronoun retention where native
Chinese would elide the pronoun entirely; "作为一个X" as a register-gated
calque of "As an X..." (fine in some registers, a tell in others); 被-passive
overuse beyond native frequency; relative-clause stacking via 的 that
mirrors an English relative-clause chain rather than native Chinese
phrasing; "令人+adjective" as a calque of "makes one feel..."; a
"What...is..." cleft-sentence structure translated directly rather than
restructured for Chinese.

## Chengyu (成语) — density cap and a meta-warning

Classical four-character idioms substituted for AI-clichéd phrasing are
genuinely useful (似是而非 for "sounds right but isn't," 纸上谈兵 for "all
talk no execution," 釜底抽薪 for "fix the root cause not the symptom") —
but cap density at **≤3 per 500 characters**, and be aware that a handful
of chengyu have themselves become AI clichés through overuse
(精益求精/一丝不苟/不可或缺) and should be avoided by default rather than
reached for as a fix.

Sources: LifelongLazyLearner/qu-ai-wei (51-pattern catalog + punctuation/
syntax reference files), TwilightXQY/humanizer-zh-codex, masterball-w/
Master-humanizer-skill (chengyu reference) — harvested GitHub skills,
distilled and re-expressed, no verbatim text copied. Verify each source
repo's license before quoting any pattern verbatim.
