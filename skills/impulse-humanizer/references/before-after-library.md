# Before/After Library — примеры до/после

Четыре разбора разных регистров: блог, тех-документация и два impulse-suite
жанра (ADR, service README). Каждый — исходный AI-текст → финал → короткое
«что изменилось и почему». Уникальные уроки из других жанров — в закрывающем
списке. Механические поштучные списки правок сюда не входят: конкретные
слова смотри в `word-blacklist-en.md` / `word-blacklist-ru.md`.

## 1. Блог-пост — продуктивность (EN → RU)

### Исходный AI-текст

> # Unlocking Productivity: A Comprehensive Guide to Time Management
>
> In today's fast-paced world, mastering time management has become
> more crucial than ever. Whether you're a busy professional, an
> ambitious student, or a multitasking parent, effective time
> management can be the key that unlocks your full potential and
> elevates your productivity to new heights.
>
> At its core, time management is about prioritizing what truly
> matters. By aligning your daily activities with your long-term
> goals, you can ensure that every minute is spent purposefully.
> Furthermore, leveraging proven techniques such as the Pomodoro
> Method and time blocking can significantly enhance your focus.
>
> In conclusion, time management is a powerful tool that can
> revolutionize the way you work and live. Start small, stay
> consistent, and watch your productivity soar to unprecedented
> levels.

### Финал

> # Тайм-менеджмент: что реально работает (а что — нет)
>
> Я пробовал примерно всё: бумажный планнер, Notion, GTD, Pomodoro,
> time blocking, две разные методички из YouTube. Большая часть
> отвалилась за неделю.
>
> Сработали две вещи. Time blocking — когда у меня _много_ задач и
> я тону. Pomodoro — когда у меня _мало_ задач, но я их избегаю.
> Это два разных режима, и путать их не надо.
>
> Самая полезная штука, которую я понял: проблема обычно не в том,
> что нет времени. Проблема в том, что я не хочу делать то, что
> запланировал. Никакая техника от этого не лечит.
>
> Так что если вы пробовали Pomodoro и оно не зашло — может, у вас
> и не было прокрастинации. Может, у вас было «много задач», и
> Pomodoro вам не нужен.

**Что изменилось и почему.** Five-paragraph essay с мета-вступлением и
закрывалкой-tropoм превращён в четыре рваных абзаца разной длины (1, 4, 4,
3 предложения). Ушли `unlock, elevate, align, leverage, revolutionize,
unprecedented` и инклюзивная whether-конструкция. Главное — добавлены
мнение («сработали две вещи»), конкретика (Notion, GTD, Pomodoro по имени)
и признание («никакая техника от этого не лечит»). Burstiness настоящая:
предложения от 4 до 18 слов.

## 2. Техническая документация — документация фичи

### Исходный AI-текст

> ## Real-Time Collaboration
>
> Our cutting-edge real-time collaboration feature empowers teams
> to work together seamlessly, regardless of their location. With
> robust synchronization and intuitive interfaces, multiple users
> can edit documents simultaneously, fostering a dynamic and
> productive work environment.
>
> ### Key Features
>
> - **Instant Updates:** See changes as they happen, in real time.
> - **Conflict Resolution:** Our advanced algorithms handle
> conflicts gracefully.
> - **Presence Indicators:** Know who's working on what.
>
> Experience the future of collaboration today!

### Финал

> ## Совместное редактирование
>
> Несколько пользователей могут одновременно редактировать
> документ. Изменения видны другим участникам в течение 200–400 мс.
>
> Под капотом — CRDT на основе Yjs. Это значит, что конфликтов
> на уровне символов не возникает: даже если два человека пишут в
> одно место, оба изменения сохранятся.
>
> Видно, кто сейчас в документе и где у них курсор. Если человек
> ушёл и вернулся через час — его правки сольются с тем, что
> произошло в документе за это время.
>
> Чего нет:
> - Голосового чата.
> - Видеозвонков.
> - Sync для офлайн-режима больше 7 дней (изменения старше отбросятся).

**Что изменилось и почему.** Ушли `cutting-edge, empower, seamless, robust,
intuitive, foster, dynamic`, инклюзивная обёртка «regardless of location» и
закрывалка «Experience the future». Bullet-список с bold-заголовками стал
нормальными абзацами плюс один оправданный список — «чего нет». Добавлены
конкретные числа (200–400 мс, 7 дней) и имя технологии (Yjs CRDT).
Явное «чего фича не делает» — сильнейший сигнал живого автора в тех-доке.

## 3. ADR (impulse-suite)

### Исходный AI-текст

> ## ADR-014: Adoption of Event-Driven Architecture
>
> In today's rapidly evolving technology landscape, it is crucial for
> systems to remain scalable and resilient. After careful consideration and
> comprehensive analysis of various architectural approaches, the team has
> decided to leverage an event-driven architecture to facilitate seamless
> communication between microservices.
>
> This approach offers numerous benefits, including improved scalability,
> enhanced fault tolerance, and increased flexibility. By embracing this
> paradigm shift, the system will be well-positioned to handle future growth.

### Финал

> ## ADR-014: событийная связь между сервисами
>
> Сейчас сервисы дёргают друг друга синхронно по REST. Под нагрузкой один
> медленный сервис подвешивает всех, кто его вызывает — видели это в
> октябрьском инциденте, когда лок в БД каталога застопорил заказы на
> 40 секунд.
>
> Перевод межсервисных записей на события в Kafka убирает эту прямую
> завязку. Каждый сервис обрабатывает свою очередь в своём темпе; медленный
> консьюмер тормозит сам себя, а не вызывающих.
>
> Компромисс: консистентность становится eventual, не мгновенной. Если UI
> должен сразу показать результат записи — придётся поллить или показывать
> загрузку на пару сотен мс. Решили, что это ок везде, кроме подтверждения
> оплаты — там оставили синхронно.

**Что изменилось и почему.** Ушли `rapidly evolving landscape, crucial,
after careful consideration and comprehensive analysis, leverage, facilitate
seamless, numerous benefits, paradigm shift, well-positioned`. Добавлены
реальный инцидент, реальный механизм и честный компромисс с одним явным
исключением (оплата) — то, что должен уметь ADR уровня 2
(`genre-calibration.md`). ADR, который только перечисляет плюсы, читается
как маркетинг, а не как решение.

## 4. Service README (impulse-suite)

### Исходный AI-текст

> # Orders Service
>
> The Orders Service is a robust, scalable microservice designed to
> seamlessly handle order processing within our comprehensive e-commerce
> ecosystem. Built with cutting-edge technology, it ensures reliable and
> efficient order management.
>
> ## Getting Started
>
> To get started, simply follow the steps below to set up your development
> environment and begin exploring the service's capabilities.

### Финал

> # orders
>
> Владеет жизненным циклом заказа: создание, оплата, выполнение, отмена.
> Дёргает `catalog` за ценами, `payments` за списаниями, публикует
> `orders.order_created` / `orders.order_paid` в Kafka.
>
> ## Запуск
>
> `docker compose up orders` — нужны запущенные `payments` и `catalog`,
> Compose поднимет порядок через `depends_on`.
>
> ## Чего нет
>
> Учёта склада — это `catalog`. Orders только проверяет наличие на момент
> записи и мирится с тем, что данные могут быть устаревшими на пару секунд.

**Что изменилось и почему.** Ушли `robust, scalable, seamlessly,
comprehensive ecosystem, cutting-edge, ensures reliable and efficient` и
шаблонное «Getting Started… simply follow the steps». Добавлены реальные
границы сервиса, реальная команда, реальные имена событий и явное «чего
нет» — самый сильный сигнал живого сервис-дока.

## Уроки из других жанров (по одному)

- **Email-отказ:** отказ — в первой фразе, без «I hope this email finds you
  well»; закрой реальной пользой (рекомендация подрядчика), а не сервильной
  формулой.
- **Эссе / колонка:** балансную конструкцию «on one hand … on the other»
  замени на конкретное мнение; читателю эссе нужна позиция, не «views vary».
- **Маркетинг-лендинг:** признание «для кого продукт _не_ подходит» («если у
  вас 200 человек — Jira лучше») — сильнейший ход; все хвалят себя, единицы
  говорят, где плохо работают.
- **Личное письмо:** конкретный повод (тот вьетнамский, в апреле не дошли) +
  конкретный запрос (свободные дни кроме среды), ноль формальной обёртки.
- **Новостная заметка:** живая цитата («получилось или нет — посмотрим за
  полгода») вместо шаблона; конкретные дата, цена, интеграции, конкуренты.
- **Академический абзац:** конкретный источник с цифрой (IDMC, 32 млн/год)
  вместо «recent studies»; мета-анонс «this paper aims to delve» → область
  фокуса (прибрежная Бангладеш, 2015–2022).

## Метавывод

Что общего у успешных переписей:

1. **Сокращение объёма** — почти все стали короче на 30–60%. AI пишет
   длинно от неуверенности; человек короче от уверенности.
2. **Конкретика заменила обобщение** — числа, имена, даты, географические
   точки во всех примерах.
3. **Появилась позиция** — мнение, признание ограничений, «чего нет». Даже в
   тех-доке и новости это снимает машинную безусловную позитивность.
4. **Структура стала разной** — вместо five-paragraph essay абзацы разной
   длины, иногда с непривычной структурой («что убрали / что оставили»).
5. **Тон неровный** — в одном тексте сосуществуют серьёзный и
   саркастический регистры, что для AI нехарактерно.

Каждый твой humanize должен пройти те же пять трансформаций.
