# Payments RU — банки, агрегаторы, СБП, 54-ФЗ

Provider-specific поверх `payments.md` — общие правила (webhook trust
boundary, идемпотентность, ledger, int64) действуют здесь целиком.

## Правила RU-ландшафта — поверх общих

1. **Копейки, integer, везде.** T-Bank и Sber принимают суммы в копейках —
   рубли float'ом = тихий 100x-баг. №1 по частоте.
2. **Fetch-before-trust — дефолт для RU-агрегаторов.** У половины
   провайдеров подпись вебхука не документирована или отсутствует
   (Platega, WATA, PayOk, Antilopay). Правило: коллбек = только триггер,
   истина = ответ GET-статуса по API. Вебхук без проверяемой подписи
   никогда не мутирует состояние сам.
3. **Дубли и ретраи — контракт, не edge case.** Sber ретраит ~каждые 10
   мин ×4 (потом ТИШИНА — потерял финальный статус навсегда), T-Bank
   ретраит до ответа `OK`, FreeKassa до `YES`. Дедуп на UNIQUE-констрейнте,
   ответ провайдеру — точной строкой, какой он ждёт.
4. **Тест/прод — разные креды, не флаг.** T-Bank: отдельная пара
   TerminalKey/Password. Sber: отдельный хост `ecomtest.sberbank.ru`.
   Robokassa: отдельные Пароль1/2 для теста. Смешал = тихие auth-фейлы
   или реальные списания в тесте.

## T-Bank (Tinkoff) эквайринг + T-Pay

1. Поток: `Init` → PaymentURL/виджет → `GetState`; двухстадийка:
   `AUTHORIZED` → `Confirm`/`Cancel`. Статусы: NEW → AUTHORIZING →
   AUTHORIZED → CONFIRMED | REJECTED | REFUNDED | DEADLINE_EXPIRED.
2. **Token-схема (и запрос, и вебхук):** только скалярные root-параметры
   (Receipt/DATA/Token исключить) + пара Password → сортировка по ключу →
   конкат ТОЛЬКО значений без разделителей → SHA-256 → hex. Классические
   фейлы: вложенные объекты в строке, не тот порядок сортировки.
3. Вебхук: ответить телом `OK` (plain, 200) — иначе ретраи бесконечно.
4. `PaymentURL` имеет TTL → `DEADLINE_EXPIRED`; UX повторного Init
   обязателен, ссылка не вечная.
5. T-Pay: DeepLink из Init-ответа. SDK: сообщество (`nikita-vanyasin/
   tinkoff` Go), официальных нет — проверяй свежесть коммитов.
6. Т-Касса = самый быстрый «прямой банк» для инди: self-serve онбординг
   на том же EACQ API.

## Sber эквайринг + SberPay

1. Поток: `register.do` (`registerPreAuth.do` двухстадийка) → `formUrl` →
   `getOrderStatusExtended.do` (не legacy getOrderStatus) → `deposit.do` /
   `refund.do`.
2. **Checksum коллбека:** выкинуть `checksum`+`sign_alias` → сортировка по
   имени → строка `param1;value1;param2;value2;...;` (с хвостовой `;`) →
   симметричный режим HMAC-SHA256 / асимметричный SHA512withRSA (публичный
   ключ Сбера). Сравнение регистронезависимое (uppercase hex).
3. SberPay: deeplink `sberpay://invoicing/v2?bankInvoiceId=...` из
   session/create. Онбординг исторически через менеджера — медленнее
   Т-Банка.

## СБП

1. Комиссия 0.4-0.7% против ~2-3% карточного — дефолтный метод для
   цифровых товаров. Лимит операции 1 млн ₽ (NSPK-wide).
2. QR динамический (на заказ, TTL) / статический. Рельса общая (НСПК),
   но вебхук — формат ТВОЕГО банка: парсинг per-bank, единого контракта
   нет.
3. Возвраты мгновенные, но окно может резать агрегатор (встречалось 30
   дней через API) — читай доки своего PSP, не НСПК.
4. Реальный срок подключения 3-7 рабочих дней (маркетинг «за 1 день» —
   без NSPK-провижининга).

## Агрегаторы — схема верификации per provider

| Провайдер | Верификация коллбека | Заметки |
|---|---|---|
| **Platega** | НЕ документирована в схеме CallbackPayload → fetch-before-trust | без ИП/юрлица; статусы только CONFIRMED/CANCELED; ToS-бан за транзит юрлиц |
| **WATA** | не найдена; сами рекомендуют polling (вебхук SLA до 32ч!) | Bearer JWT 1-12 мес — ротация или тихий 401; sandbox отдельный |
| **Lava.ru / lava.top** | shared-secret из кабинета (алгоритм не подтверждён) | .ru = RUB/СБП/SberPay, .top = международка; НЕ путать |
| **FreeKassa** | `md5(merchant_id:AMOUNT:secret2:ORDER_ID)` + IP-allowlist; ответ строго `YES` | два secret word: №1 форма, №2 коллбек |
| **Robokassa** | `MD5(OutSum:InvId:Пароль2)`, кастомные `Shp_*` — сортировать по ключу | сама фискалит 54-ФЗ (ФФД 1.2) |
| **CloudPayments** | HMAC-SHA256 raw body → base64, заголовки `Content-HMAC`/`X-Content-HMAC` | самая чистая схема из всех |
| **Enot.io** | HMAC-SHA256 по sorted-JSON, `x-api-sha256-signature`; ДВА ключа (касса vs аккаунт) | перепутать ключи = классика |
| **PayOk** | 6 полей + secret, точная формула не подтверждена → fetch-before-trust | только неофициальные SDK |
| **Antilopay** | не удалось подтвердить → fetch-before-trust | есть фишинг-клон домена — проверь URL |

**Pally (pally.info): не интегрировать без due diligence.** Независимые
RU scam-watch сайты консистентно флагают: нет лицензии ЦБ, юрлицо не
раскрыто, Whois скрыт. Не тот же трастовый тир, что Platega/WATA/Lava.

## TG-бот + RU-агрегатор = external-link flow

Никто из Platega/WATA/Lava/Enot/PayOk не подключён к BotFather как
нативный провайдер. Паттерн: бот шлёт inline-кнопку с hosted-checkout URL
→ вебхук агрегатора коррелируешь с chat/order через свою БД. Нативный
Payments API — только Stars (цифровое) и BotFather-провайдеры (YooKassa —
физическое). Deeplink SberPay/T-Pay из Mini App: голый `location.href` в
webview может тихо не открыть банк-апп — `Telegram.WebApp.openLink()` +
таймаут-фоллбек «открыть в браузере»; тестировать на живом устройстве
(вендорские доки TG-webview не покрывают).

## 54-ФЗ — чеки

1. Эквайринг ≠ фискализация. Банковский эквайринг чеки НЕ выбивает —
   нужна касса: облачная (АТОЛ Онлайн, КОМТЕТ) + ОФД. Два отдельных
   вендора, даже если дашборд банка выглядит как один.
2. Сами фискалят: Robokassa (полностью), ЮKassa (add-on). Platega/WATA/
   Enot/PayOk/FreeKassa — не найдено → своя касса поверх. Классическая
   слепая зона no-ИП агрегаторов: чеки юридически на тебе.
3. Прямой эквайринг требует ИП/ООО + расчётный счёт, без вариантов.
   Быстрейший путь инди: агрегатор с СБП внутри, прямой банк — когда
   объём оправдает торг за ставку.

Sources: developer.tbank.ru/eacq (token), securepayments.sberbank.ru wiki
(callback checksum), sbp.nspk.ru/faq, docs.platega.io, api.wata.pro,
docs.freekassa.net, docs.robokassa.ru, developers.cloudpayments.ru,
docs.enot.io/e/new/webhook, core.telegram.org/bots/payments, habr.com
745316 + 1050584.
