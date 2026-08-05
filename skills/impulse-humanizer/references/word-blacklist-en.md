# Word Blacklist — EN: AI-маркеры на уровне слов и фраз

Рабочая база для слоя 1, английский текст. Русская секция —
`word-blacklist-ru.md`. Разделы 3–4 (жаргон, пунктуация) общие для языков.

Главное правило: **наличие слова из списка ≠ AI-текст.** Сигнал —
плотность: 5+ слов из списка на 200 слов текста плюс 2+ структурных
паттерна = почти наверняка AI.

## 1. Однословные тревоги

### 1.1 Глаголы «глубокого вовлечения» (AI обожает)

```
delve (into)        → look at, examine, dig into
embark (on)         → start, begin, do
navigate            → handle, deal with, work through
foster              → encourage, help, build, grow
harness / leverage  → use
unlock              → reveal, open up, get
elevate             → raise, improve, lift
streamline          → simplify, speed up
unleash             → release, let loose
cultivate           → grow, build, develop
illuminate          → show, reveal, make clear
captivate           → grab attention, hook
resonate (with)     → connect, hit, land
underscore          → emphasize, show
underpin            → support, hold up, ground
encompass           → include, cover
showcase            → show, display, feature
exemplify           → be an example of
spearhead           → lead, head
align (with)        → fit, match
pivot               → switch, change, shift
ideate              → think up, come up with
optimize            → improve, tune
transform           → change, turn into
revolutionize       → change, overhaul
empower             → enable, let, give power to
synergize           → work together
```

### 1.2 Прилагательные-усилители и тоновые маркеры

```
robust              → strong, reliable, solid
vibrant             → lively, bright, busy
intricate           → complex, detailed, fiddly
profound            → deep, big, real
pivotal / crucial   → important, key, decisive
essential / key     → needed, basic (или просто удалить)
vital               → important, needed
seamless            → smooth, easy, glitchless
comprehensive       → full, complete, broad
holistic            → whole, full-picture
multifaceted        → many-sided, complex
dynamic             → fast-moving, active, lively
transformative      → big, life-changing, deep
groundbreaking      → new, original, first-of-its-kind
cutting-edge / state-of-the-art → newest, latest, top
paramount           → most important, top
indispensable       → essential, needed
unparalleled / unprecedented → unmatched, never seen before
remarkable / exceptional / extraordinary → notable, striking, standout
invaluable          → useful, important
ever-evolving / ever-growing / rapidly evolving → changing (fast), growing
nuanced             → subtle, careful
tailored / bespoke  → custom, made for
curated             → picked, selected
meticulous(ly) / diligently → careful(ly), with effort
fascinating / intriguing → interesting
compelling          → strong, convincing
rich / deep         → full, strong
sophisticated       → complex, refined
elegant / refined   → clean, simple, polished
harmonious          → balanced, fitting
```

### 1.3 Абстрактные существительные (AI ими прикрывает пустоту)

```
testament (a testament to)   → proof of, sign of, shows
tapestry / mosaic / symphony → mix, blend
landscape (метафора)         → world, area, field, scene
realm                        → world, area, field
ecosystem                    → system, world, set-up
nexus / intersection         → meeting point, junction
paradigm                     → model, way of thinking
journey / odyssey / adventure → process, path, trip
quest / pursuit              → search, hunt
endeavor                     → effort, project, attempt
fabric (of society)          → society, life
narrative                    → story, account
discourse                    → talk, conversation, debate
synergy                      → combined effect, working together
alignment                    → match, fit, agreement
convergence                  → coming together
juxtaposition                → contrast, side-by-side
manifestation / embodiment / exemplification → form, sign, example of
underpinnings / bedrock      → basis, foundation
cornerstone                  → key part, foundation
catalyst                     → trigger, spark
vanguard / forefront         → leading edge, front
underbelly                   → underside, hidden side
```

### 1.4 Связки и discourse markers (избыток → AI)

```
Furthermore / Moreover / Additionally → Also, Plus, And
Subsequently        → Then, After that, Later
Consequently        → So, As a result
Therefore / Thus / Hence → So
Indeed              → (удаляй; или: Yes, In fact)
Notably / Specifically → (часто удаляй)
Particularly        → Especially
Essentially / Fundamentally / In essence → Basically, At base
Ultimately          → In the end, Finally
```

## 2. Фразы и обороты

### 2.1 Открывалки абзацев и вступления

— `In today's fast-paced world` / `In an ever-evolving landscape` /
`In the digital age` / `Without further ado` → удалить целиком
— `In recent years` → если важна дата — поставить год
— `It is important to note that` / `It's worth mentioning that` /
`It cannot be overstated that` → удалить, оставить факт
— `As we delve into` / `Let's explore` / `Let's dive in` /
`Let's break it down` → удалить или сразу к сути
— `In this article, we will` → удалить (мета-анонс)

### 2.2 Псевдо-глубокие повороты

— `At its core, X is…` / `In essence, X means…` / `Fundamentally,
X is about…` → «X is…»
— `The reality is that…` / `The truth is…` / `What this really
means is…` / `Make no mistake` → удалить

### 2.3 Балансные конструкции (хедж-машина)

— `On one hand … on the other hand` (автоматом) → переформулировать
с конкретной позицией
— `It's not just X, it's Y` / `It's more than just X` → выбрать одно
— `Not only X but also Y` → «X, and also Y» или два предложения
— `While X, Y` (пустая связка) → разбить на два предложения

### 2.4 Закрывалки

— `In conclusion` / `To sum up` / `Overall` / `All in all` → удалить
(часто абзаца не нужно вообще)
— `Ultimately, X plays a key role in Y` → удалить или конкретизировать
— `As we move forward` / `Looking ahead` / `The journey continues` /
`The future is bright` / `Exciting times lie ahead` / `Only time will
tell` / `One thing is certain` / `The possibilities are endless` → удалить

### 2.5 Сервильность и chatbot-артефакты

`I hope this helps!`, `Feel free to ask`, `Let me know if you have any
questions`, `Of course!`, `Certainly!`, `Absolutely!`, `Great question!`,
`You're absolutely right!`, `As an AI language model`, `As of my last
knowledge update`, `Based on the information available` — удалить целиком
или переписать без сервильности.

### 2.6 Vague attributions / weasel

— `Many experts believe` / `Industry leaders say` / `Critics have
noted` → конкретное имя или удалить
— `Studies have shown` / `Research suggests` → конкретная ссылка или удалить
— `It is widely believed` / `Some people argue` → удалить или конкретизировать

## 3. Бизнес/корпоративный жаргон (общий для языков)

synergy, alignment, optimization, streamlining, leveraging, ideation,
disruption, transformation, empowerment, engagement, scalability,
agility, resilience, robustness, operationalize, actionable,
deliverables, stakeholders, value proposition, mindshare, thought
leadership, best practices, key takeaways, pain points, moving the
needle — и их русские кальки (синергия, трансформация, вовлечение,
болевые точки, ключевые выводы…).

5+ таких слов на 300 слов = либо business-school presentation, либо AI.
Чаще AI.

## 4. Punctuation и форматирование (общий для языков)

### 4.1 Em-dash (—): нормы на 1000 слов по жанрам

- Журналистика: 2–4. Эссе: 1–3. Деловое письмо: 0–1.
- AI ставит 5–10, часто несколько в одном предложении.
- Замены: `X — Y, Z` → `X. Y, Z.`; тире → скобка; `X, Y — Z` → `X, Y, Z`.
- Русское «X — это Y» нормально, но проверь консистентность.

### 4.2 Кавычки

AI: curly `“…”` консистентно везде. Человек в обычной IDE: straight
`"…"`. Русский: «…» — норма, в неформальном тексте бывают "".
Держи стиль консистентным с платформой/жанром; в коде, тех-доке и
неформальных постах — straight.

### 4.3 Oxford comma

AI ставит запятую перед `and` всегда. Человек — непоследовательно:
намеренно убери в половине случаев. В русском проблема не стоит.

### 4.4 Эмодзи и bold-заголовки в буллетах

Эмодзи-префиксы в заголовках/буллетах (ракета, лампочка, галочка) —
AI-сигнатура в деловых местах: удалить полностью. Шаблон
`**Topic:** Explanation` в буллетах — тоже: короткий заголовок без bold
и двоеточия, а лучше — обычный текстовый абзац.

### 4.5 Идеальные двоеточия в анонсах списков

`There are three reasons: A, B, and C.` → AI. Лучше отдельными
предложениями или вплести в текст без анонса.

## 5. Замены: что взамен

Главный ход — не подбирать синоним, а **переписать конструкцию или
удалить мысль целиком**.

| Было (AI)                            | Стало (живо)                    |
|--------------------------------------|---------------------------------|
| It is important to note that X is Y  | X is Y.                         |
| In today's fast-paced world, X       | X.                              |
| Furthermore, X also Y                | X also Y. / Plus, X Ys.         |
| At its core, X is Y                  | X is Y.                         |
| Not only X but also Y                | X. And Y. / X, plus Y.          |
| It's not just X, it's Y              | It's Y. (or: X — but really Y.) |
| X plays a crucial role in Y          | X matters to Y because…         |
| In conclusion, X                     | (drop the closing entirely)     |
| The journey of X has been remarkable | X did Y. Then Z.                |
| X serves as a testament to Y         | X shows Y.                      |

## 6. Math/code notation as prose shorthand — hard ban

`= → ← ⇒ > < ≥ ≤ ≠ ≈ ± + vs &` used as sentence-level shorthand ("Speed >
perfection", "A = B", "juniors vs seniors") is a distinct, mechanically
detectable tell — not covered by the word lists above at all. Replace:
`→` → "leads to"; `=` → "is"; `vs` → "compared to"; `&` → "and". A hard
ban, not a density threshold — a single instance in prose (outside actual
code/math contexts) is worth fixing.

## 7. Chatbot copy-paste artifacts and forensic tells

A distinct, mechanical evidence class — near-zero false positives, unlike
everything above which needs density to mean anything. Full catalog:
`chatbot-copypaste-artifacts.md` (citation-leak strings, UTM parameters,
placeholder residue, invisible Unicode). Two more forensic tells worth
checking directly: **paragraph-reshuffling immunity** — can paragraph 2
and paragraph 4 swap positions without breaking the piece? If yes, it
reads as AI (LLMs generate parallel self-contained blocks rather than an
unfolding argument with real dependency between paragraphs); **the
treadmill effect** — a long section restating one idea in different words
("The system is fast. In other words, it performs well. Put simply,
speed is a strength.") — a paragraph that doesn't actually advance,
distinct from ordinary filler because each sentence is individually fine.

## 8. The RLHF "helpful assistant" register — the frame around all of this

Full detail and research citations: `llm-fingerprints.md`. Short version:
what detectors actually flag isn't "AI-ness" abstractly — it's the
RLHF-trained helpful-assistant register specifically. Watch for: "Here's
how I'd think about it..." framing, unrequested-option enumeration,
pedagogical over-explanation of terms the reader already knows, a caveat
appended to a claim that didn't need one, acknowledgment-prefixes ("that's
a great question, and..."), a closing paragraph that recaps what was just
said.

## Финальное правило

Ни один список не покрывает всех случаев. Проверка: **прочитай вслух.**
Если фраза звучит как пресс-релиз, LinkedIn-пост с MBA-эстетикой или
презентация Q3 — она AI-окрашена, даже если её слов нет в списке.
Перепиши простыми словами, как сказал бы человек коллеге за обедом.
