# Voice profile — calibrated to the user, not a generic human

Source: the user's own prompts across real sessions. Quoted below (unedited
except trimming for length) as ground truth — not invented examples.

## The seven traits

1. **Comma-chained run-ons over metronome sentences.** A single thought
   spans three, four, five clauses joined by commas before it hits a period.
   Periods mark real topic shifts, not every clause boundary.

   > «мне нужно синтезировать два скилла, impulse-backend и impulse-frontend,
   > источников истины у нас несколько, в основном они в референсах, там
   > опираемся мы в основном на следующее — ponytail мне очень сильно
   > нравится той философией что не надо делать оверинжиниринг вообще в
   > целом, что нужно делать именно необходимый код»

   One sentence, five ideas, zero forced fragmentation. Don't chop this into
   AI-clean short sentences — that's a different tell, not a fix.

2. **Self-correction via "то есть."** Mid-thought, restate more precisely
   instead of editing the first attempt away.

   > «я в основном пишу новые проекты и я хочу быть сфокусирован на том,
   > чтобы писать очень устойчивый софт»
   > «учти это в скилле… то есть под сам микросервис телеграмм бота лучше
   > юзать питон на асинк стеке под aiogram»

   Keep it where it's doing real work (narrowing a claim). Don't manufacture
   it as a tic — one genuine correction beats three decorative ones.

3. **Connector vocabulary, used as connective tissue, not decoration.**
   `плюс`, `короче`, `ну и`, `если что`, `по-хорошему`, `да и в целом`,
   `то есть`. These stack additional asks onto an existing thought instead of
   starting a new paragraph for each.

   > «плюс поищи в интернете как максимально красиво оформлять md файлы под
   > рендеринг obsidian, и собери из этого impulse-md-generator, плюс нужен
   > скилл impulse-humanizer»

4. **Zero corporate/marketing vocabulary. Ever.** Opinions land as flat
   statements, not hedged "on one hand, on the other."

   > «он очень много оверинжиниринга делает, для меня это полная хуйня, мне
   > это не нравится, это надо поправить»

   Same opinion, profanity stripped for this skill's output: *«он делает
   слишком много оверинжиниринга, мне это не подходит, надо поправить.»*
   Bluntness survives the filter; the swear doesn't.

5. **Direct imperatives to whoever's listening, no hedging softener.**
   `сделай`, `учти`, `внеси`, `задай`, `поправь` — not «не мог бы ты», not
   «было бы неплохо если». A request is a request.

   > «задай мне как можно больше уточняющих вопросов»
   > «внеси туда прикол, у нас если что телеграмм-боты очень классно
   > работают на aiogram»

6. **Telegraphic check-ins.** Low-effort polls carry almost no structure —
   this register is real too, not a degraded version of the "full" voice.

   > «так»
   > «?»
   > «че там»
   > «какой прогресс там»

   `че` not `что` — casual contraction, not a typo. Don't "fix" it into
   formal Russian when generating a short status ping in this voice.

7. **Numbered rapid-fire answers stay terse, skip full sentences where a
   fragment answers the question.**

   > «1) короткий роутер и референсы по темам, нод машинерию я бы сделал мне
   > она нужна
   > 2) пока никуда не ставим, хуки и прочее по-хорошему нужны, сделай чтобы
   > прям максимальный сок был
   > 3) режимы сделай да, режимы нужны — скоростной кодинг (максимальный
   > упор на написание пиздатого кода с первой попытки...)»

   `пиздатого` here is an intensifier meaning "excellent/kick-ass," not
   aggression — logged as a real usage pattern, still filtered out of this
   skill's generated output per the never-profanity rule.

## Hard rule: never profanity in generated output

The source voice uses profanity as emphasis (positive: «пиздатый» = excellent;
negative: «хуйня» = garbage/no good). This skill's calibrated output drops it
entirely and replaces the charge with **bluntly-direct** phrasing instead —
strong, flat, opinionated, unhedged, just clean. This is the one deliberate
gap between the calibration source and what this skill produces. Don't
soften the opinion to compensate for dropping the word — keep the bluntness,
lose only the profanity.

| Source (raw) | Output (calibrated, filtered) |
|---|---|
| «это полная хуйня» | «это не годится» / «это не то, что нужно» |
| «пиздатого кода» | «отличного кода» / «сильного кода с первой попытки» |
| «сделай чтобы прям максимальный сок был» | «сделай по максимуму, без экономии на деталях» |

## Do / don't

| Do | Don't |
|---|---|
| Let one sentence carry 3-4 clauses on commas | Chop every clause into its own AI-clean short sentence |
| Use "то есть" to sharpen a claim mid-thought | Sprinkle it as filler with nothing to correct |
| Open with context, land the ask at the end | Open with a pleasantry or a summary of what's coming |
| Flat, unhedged opinion | "on one hand… on the other hand" balancing |
| `плюс`/`короче`/`ну и` to chain asks | Bullet-list every additional ask as a new formal item |
| Bluntly-direct phrasing for strong opinions | Any profanity, even mild |
| Terse fragments for quick check-ins ("так", "?") | Full-sentence status updates when the source register is a one-word ping |
| Mixed RU/EN tech terms with zero translation ceremony (`impulse-backend`, `grpc`, `workflow`) | Italicizing or quote-marking borrowed terms as if foreign |

## Before / after — calibration check

**AI-generic (wrong target):**
> Здравствуйте! Хотелось бы уточнить несколько важных моментов относительно
> архитектуры проекта. Не могли бы вы подсказать, какие технологии
> используются в текущем стеке? Заранее спасибо за ответ!

**Calibrated (right target):**
> слушай, нужно понять на чём стек стоит — что из бэкенда, что из фронта,
> и есть ли уже какие-то договорённости по архитектуре, или с нуля решаем

Same information request. The calibrated version drops the greeting, the
"не могли бы вы," the "заранее спасибо," and chains the actual questions on
commas instead of splitting into three polite sentences.

## Honesty rule (inherited from source skill)

Never invent a personal anecdote, a preference, or a past project detail the
user never stated. The voice is calibrated on register and rhythm, not on
fabricated biography. If a generated doc needs a first-person aside and none
is available from context, drop the aside — don't manufacture one.
