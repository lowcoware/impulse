**Русский** · [English](INSTALL.en.md)

# Установка — impulse на разных CLI

Сьют написан в нативном формате `SKILL.md` + `references/*.md` —
agentskills.io. Этот формат все CLI ниже понимают **нативно**, так
что установка — это раскладка файлов, а не конвертация: и `npx skills`,
и репозиторный `scripts/install.js` просто копируют `skills/*/` (роутер +
references) в директорию расширений нужного CLI, ничего не переписывается
и не адаптируется под другой формат.

Основной способ зависит от инструмента: у **Claude Code** и **Antigravity**
— их собственная плагин-система (плагин Claude Code через маркетплейс и
плагин-бандл Antigravity, разделы ниже), у **Cursor**, **Codex** и
**OpenCode** — `npx skills`. У **Gemini CLI**, **Qwen Code** и **Goose**
тоже свои плагин-системы, и все три ставят сьют одной командой прямо из
GitHub-репо: `gemini extensions install`, `qwen extensions install`
(понимает Claude-плагины напрямую), `goose plugin install` — разделы ниже.
Для OpenCode есть и третий путь, часто самый
короткий: если сьют уже стоит для Claude Code или Codex/Antigravity в этом
же проекте или в домашней директории — OpenCode читает `.claude/skills/` и
`.agents/skills/` нативно на обоих scope и **уже видит его без единого
доп. шага** (раздел OpenCode ниже). Тот же zero-step эффект есть у **Goose**
(читает и `.agents/skills/`, и `.claude/skills/`) и у **Gemini CLI**
(читает `.agents/skills/` как алиас) — см. их разделы.

## Установка через npx skills (основной способ для Cursor и Codex)

Для Claude Code и Antigravity плагин-система даёт нативную установку, а у
Claude Code ещё hooks, statusline и режимы; `npx skills` для них тоже
работает, но кладёт голый уровень скиллов без плагин-обвязки.

`npx skills` — открытый установщик агентских скиллов (vercel-labs/skills):
берёт скиллы из GitHub-репо и кладёт в директорию нужного инструмента.
GitHub тут вместо npm-реестра. Сьют уже в нативном формате agentskills.io,
поэтому ставится как есть — манифест не нужен, все 22 скилла
подхватываются автоматически (проверено 2026-07-04:
`npx skills add lowcoware/impulse --list` находит все 16).

Одна команда на инструмент:

```
npx skills add lowcoware/impulse -a claude-code    # Claude Code
npx skills add lowcoware/impulse -a cursor         # Cursor
npx skills add lowcoware/impulse -a codex          # Codex
npx skills add lowcoware/impulse -a antigravity    # Antigravity
npx skills add lowcoware/impulse -a opencode       # OpenCode
npx skills add lowcoware/impulse -a gemini-cli     # Gemini CLI
npx skills add lowcoware/impulse -a qwen-code      # Qwen Code
npx skills add lowcoware/impulse -a goose          # Goose
```

Сразу во все — перечислите таргеты через несколько `-a`
(или `--all` — все скиллы во все обнаруженные
агенты). По
умолчанию ставит в проект; `-g` — в пользовательскую директорию, глобально
для всех проектов. Ещё полезное: `-y` — без вопросов (для CI), `--list` —
показать скиллы и ничего не ставить, `-s <skill>` — только конкретные
(например `-s impulse-backend -s impulse-frontend`).

Куда кладёт: `claude-code` → `.claude/skills/`, `cursor` / `codex` /
`opencode` → `.agents/skills/` на project scope (Cursor и OpenCode читают
и `.claude/skills/`, и `.agents/skills/` нативно — своих отдельных копий
не создают). На user/global scope у `opencode` свой путь:
`~/.config/opencode/skills/` — см. раздел OpenCode. `gemini-cli` →
`.agents/skills/` (проект) / `~/.gemini/skills/` (`-g`); `qwen-code` →
`.qwen/skills/` / `~/.qwen/skills/`; `goose` → `.goose/skills/` /
`~/.config/goose/skills/` — у Goose это легаси-пути, они читаются, но
рекомендованный стандарт `.agents/skills/` (см. раздел Goose). Пути
Antigravity уточняйте на месте — интерфейс молодой и уже переезжал (см.
раздел Antigravity ниже).

Один момент про уровень: `npx skills` ставит контент скиллов (SKILL.md +
`references/` каждого) — тот же голый уровень, что и копия через
`scripts/install.js`. Hooks, бейдж statusline, стейтфул-режим и команды
`/impulse-*` он не переносит; их даёт только нативный плагин Claude Code
(раздел ниже). Файлы `shared/*.md` установщик скиллов тоже не кладёт — на
них завязаны кросс-ссылки между скиллами, подробнее в разделе "Общие файлы
и кросс-ссылки".

## Установщик репозитория (альтернатива)

Нужен офлайн-режим без npx, точный план копирования заранее (dry-run) или
симметричное удаление `--uninstall` — в репозитории есть свой установщик.
Полный список опций — `node scripts/install.js --help`. Коротко:

```
node scripts/install.js --target=claude|cursor|codex|antigravity|opencode \
  [--scope=project|user] [--project-dir=PATH] [--apply] [--uninstall]
```

По умолчанию (без `--apply`) — **dry-run**: печатает точный план
копирования (источник -> назначение, по одной строке на файл) и ничего не
пишет на диск. Добавьте `--apply`, чтобы выполнить. Он идемпотентен —
повторный `--apply` перезаписывает папки сьюта на месте — и никогда не
трогает соседние файлы или другие скиллы/плагины, уже лежащие в той же
директории. `--uninstall` (вместе с `--apply`) убирает ровно то, что
создал соответствующий install.

Форматы по каждому таргету ниже проверены **2026-07-04** по документации
самих вендоров. Эти интерфейсы
меняются быстро и уже выходят за горизонт знаний сьюта — перед установкой
на заметно более новом релизе CLI перепроверьте источник по ссылке.

## Обновление

**Проверено:** 2026-07-18. Источник: `code.claude.com/docs/en/plugin-marketplaces`,
README `vercel-labs/skills`.

Сначала важное: история этого репозитория — намеренно **один коммит,
force-push при каждом релизе**. Обычный `git pull` в клоне упадёт с
non-fast-forward. Клон обновляется так:

```
git fetch origin && git reset --hard origin/main
```

По каждому способу установки:

**Нативный плагин Claude Code (marketplace):**

```
/plugin marketplace update impulse
/plugin update impulse@impulse
```

Перезапустите сессию, проверьте через `/impulse-help`. Детали:

- Marketplace добавлен из **GitHub**: refresh делает pull репозитория;
  из-за force-push истории pull падает non-fast-forward, и Claude Code
  откатывается на повторное клонирование с нуля — это ожидаемо и нормально,
  ручные команды выше работают надёжно.
- Marketplace добавлен из **локального пути** (команды установки в секции
  Claude Code используют именно его): сначала обновите локальный клон
  (`git fetch` + `reset --hard` выше), потом две команды `/plugin`.
- Детекция обновления завязана на `version` в `.claude-plugin/plugin.json` —
  если версия у вас совпадает с новой, `/plugin update` **пропустит плагин,
  даже когда содержимое файлов поменялось**. Релизы сьюта поднимают эту
  версию; если обновление «залипло», проверьте, изменилась ли версия
  upstream, а как крайняя мера — `/plugin uninstall impulse@impulse` +
  `/plugin install impulse@impulse`.

**Через `npx skills`:**

```
npx skills update        # обновить все установленные скиллы (интерактивный выбор scope)
npx skills update -y     # без вопросов, scope определяется автоматически
npx skills update impulse-backend impulse-frontend   # только конкретные скиллы
```

Повторный `npx skills add lowcoware/impulse -a <agent>` тоже
подтягивает свежее состояние.

**Расширение Gemini CLI:** `gemini extensions update impulse` (или
`--all`). Обновление тянет из источника установки; если из-за
force-push истории update споткнётся, `gemini extensions uninstall impulse`
+ повторный install — чистый путь.

**Расширение Qwen Code:** `qwen extensions update impulse` — Qwen Code
хранит копию расширения, без update изменения из GitHub сами не
подтянутся.

**Плагин Goose:** `goose plugin update impulse`; либо поставьте один раз с
`goose plugin install --auto-update <url>` — тогда Goose сам проверяет
обновления перед загрузкой скиллов (обновление заменяет установленную
копию целиком, force-push история ему не мешает).

**Установщик репозитория (`scripts/install.js`):** обновите клон и
перезапустите ту же команду установки — он идемпотентен, перезаписывает
папки сьюта на месте и не трогает соседей:

```
git fetch origin && git reset --hard origin/main
node scripts/install.js --target=<t> [--scope=user] --apply
```

**Ручное копирование:** повторите те же команды копирования из "Ручного
фолбэка" нужного таргета — та же семантика перезаписи на месте.

## Что не переносится ни на один таргет, кроме нативного плагина Claude Code

У сьюта два слоя: **контент** (роутеры + references — это ставится
везде) и **машинерия**, доступная только в плагине Claude Code: hooks
(флаг режима на `SessionStart`, инъекция ruleset на `UserPromptSubmit`,
распространение на `SubagentStart`), бейдж режима в statusline и
`/impulse-backend [mode]` / `/impulse-frontend [mode]` как *state-переключатель
режима*. Эта машинерия подключена через блок `hooks` в
`.claude-plugin/plugin.json` и грузится только когда сьют установлен как
**нативный плагин** (путь через маркетплейс) — при голой копии папок со
скиллами её нет ни в Claude Code, ни где-либо ещё.

А что работает везде, включая голую копию: роутер любого CLI сам
подключает скилл, сверяя ваш промпт с `description` из frontmatter (те
самые триггер-фразы из каждого SKILL.md). Флага режима
`blitz`/`medium`/`hardcore` вне плагина нет, но тот же эффект даёт просто
упоминание режима в промпте — например, "review this Go service in
hardcore mode" всё равно подтянет hardcore-гайдлайны `impulse-backend`,
просто без трекинга в session state и без отметки в statusline.

## Claude Code

**Проверено:** 2026-07-04. Источник: `code.claude.com/docs/en/plugins-reference`,
`/plugin-marketplaces`, `/skills`.

**Требования:** установлен Claude Code CLI.

**Через `npx skills`:** `npx skills add lowcoware/impulse -a claude-code` —
голый уровень (без hooks/statusline/режимов; за ними — нативный плагин ниже).

**Установка — нативный плагин (основной способ):**

```
/plugin marketplace add <path-to-this-repo>
/plugin install impulse@impulse
```

Только этот путь подключает hooks, бейдж statusline и переключатель
режима `/impulse-backend [mode]` / `/impulse-frontend [mode]`. Перезапустите
сессию, проверьте через `/impulse-help`.

**Установка — через инсталлер (голая копия скиллов):**

```
node scripts/install.js --target=claude --apply
```

По умолчанию — project scope (`.claude/skills/` в текущей директории;
чтобы указать другой проект, передайте `--project-dir=PATH`). Добавьте
`--scope=user`, чтобы поставить в `~/.claude/skills/` — тогда доступно
всем проектам сразу, без диалога доверия на каждый из них.

**После рестарта ожидайте:** все 22 скилла в списке скиллов Claude Code
(project scope один раз покажет диалог доверия, user scope — нет); каждый
по-прежнему триггерится по своему description при совпадении промпта, так
же как и в варианте с плагином. Без hooks, без бейджа statusline, без
state-переключателя режима (см. выше).

**Ручной фолбэк** (нет Node, или просто хотите видеть команды):

```
robocopy skills <project>\.claude\skills /E
robocopy shared <project>\.claude\impulse-shared /E
```

(POSIX-эквивалент: `cp -r skills/. <project>/.claude/skills/` и
`cp -r shared/. <project>/.claude/impulse-shared/`.)

**Удаление:**

```
node scripts/install.js --target=claude --apply --uninstall
```

Нативный плагин: `/plugin uninstall impulse@impulse`. Вручную: удалите
`<project>\.claude\skills\impulse-*` и `<project>\.claude\impulse-shared\`.

## Cursor

**Проверено:** 2026-07-04. Источник: `cursor.com/docs/context/rules`,
`/context/skills`.

**Требования:** Cursor с включённым Agent Skills.

**Через `npx skills` (основной способ):** `npx skills add lowcoware/impulse -a cursor`.

Cursor читает `.claude/skills/` **напрямую, нативно, ради
совместимости** — отдельной копии в `.cursor/skills/` нет и не нужно.
`--target=cursor` — это алиас: он проверяет/создаёт то же самое дерево
`.claude/skills/`, что и `--target=claude`.

**Установка — одна команда:**

```
node scripts/install.js --target=cursor --apply
```

(`--scope=user` — для `~/.claude/skills/`, глобально для всех ваших
проектов в Cursor.)

**Нативная альтернатива:** если хотите использовать собственную
директорию скиллов Cursor вместо общего пути `.claude/skills/`, вручную
направьте то же дерево источников в `.cursor/skills/` (проект) или
`~/.cursor/skills/` (пользователь) — отдельным таргетом инсталлер это не
предлагает, потому что это была бы просто вторая, избыточная копия
файлов, которые Cursor и так читает.

**После рестарта ожидайте:** те же 22 скилла, автоподключение по
description (тип правила Agent-Requested в Cursor) или явный вызов. Без
hooks, без statusline, без state режима — см. "Что не переносится" выше.

**Ручной фолбэк:** идентичен ручному фолбэку Claude Code выше — та же
директория назначения.

**Удаление:**

```
node scripts/install.js --target=cursor --apply --uninstall
```

## Codex CLI

**Проверено:** 2026-07-04 для базового механизма. Источник:
`developers.openai.com/codex/skills`, `/codex/guides/agents-md`,
`/codex/config-reference`, `github.com/openai/skills`. (Детали по
названиям полей в системе плагинов взяты из одного источника в ходе
research-прохода — подтверждёнными считайте только размещение в
`.agents/skills/` и лимиты frontmatter ниже.)

**Требования:** OpenAI Codex CLI с поддержкой скиллов.

**Через `npx skills` (основной способ):** `npx skills add lowcoware/impulse -a codex`.

**Установка — одна команда:**

```
node scripts/install.js --target=codex --apply
```

Project scope ставит в `.agents/skills/<skill>/` в текущей директории
(Codex резолвит это от корня вашего репозитория); `--scope=user` ставит в
`~/.agents/skills/`.

Codex жёстко требует лимиты frontmatter, инсталлер проверяет их
**до** копирования чего-либо: `name` ≤ 64 символов, строчные буквы/цифры
с одиночными дефисами (без ведущего/хвостового дефиса) и равно имени
директории скилла; `description` ≤ 1024 символов. Нарушение репортится по
имени и валит запуск (exit code 2), а не обрезается молча — текущий
результат сьюта (чисто) смотрите в "Результатах проверки" ниже.

**После рестарта ожидайте:** все 22 скилла доступны в собственном
списке скиллов Codex, автоподключение по description. `AGENTS.md` —
отдельный, встроенный в ядро механизм инъекции контекста у Codex
(конкатенация root -> leaf, лимит по умолчанию 32 KiB) — инсталлер его не
генерирует; если хотите, чтобы гайдлайны сьюта форс-загружались, а не
роутились, добавьте свою строку-указатель в `AGENTS.md` проекта вручную.

**Ручной фолбэк:**

```
robocopy skills <project>\.agents\skills /E
robocopy shared <project>\.agents\impulse-shared /E
```

**Удаление:**

```
node scripts/install.js --target=codex --apply --uninstall
```

## Antigravity

**Проверено:** 2026-07-04, но относитесь как к **молодому и
нестабильному** — путь скиллов у Antigravity уже переименовывали один раз
за время публичной жизни (`.agent/` -> `.agents/`), а текущие пути стоит
считать "вероятно-стабильными-не-замороженными". Прежде чем
полагаться на это для чего-то кроме текущего релиза, перепроверьте по
`antigravity.google/docs/skills` (а также `/docs/rules-workflows`,
`/docs/plugins`, `/docs/cli/gcli-migration`). `.agent/` (в единственном
числе) поддерживается как алиас для обратной совместимости, если найдёте
старую установку с ним.

**Требования:** Google Antigravity CLI.

**Установка — плагин Antigravity (основной способ):**

Antigravity CLI ставит плагины командой:

```
agy plugin install lowcoware/impulse
```

Рядом: `agy plugin list` — показать установленные, `agy plugin enable impulse`
/ `agy plugin disable impulse` — включить/выключить без удаления,
`agy plugin uninstall impulse` — удалить. Сьют собран как плагин-бандл
(`plugin.json` в корне + папка `skills/`, Antigravity читает
`skills/<name>/SKILL.md`), поэтому ставится как есть.

Если ваша сборка CLI хочет полный адрес — `agy plugin install
https://github.com/lowcoware/impulse`. Ручной фолбэк без команды — положить
бандл в директорию плагинов, CLI подхватит его на старте:

- workspace: `.agents/plugins/impulse/` в корне рабочего пространства;
- глобально: `~/.gemini/antigravity-cli/plugins/impulse/` (в части сборок —
  `~/.gemini/config/plugins/impulse/`).

```
git clone https://github.com/lowcoware/impulse .agents/plugins/impulse
```

Формат аргумента `agy plugin install` и точную директорию плагинов сверьте
с `antigravity.google/docs/cli/plugins` — интерфейс молодой (см.
предупреждение выше). Плагин Antigravity отдаёт те же 22 скилла; impulse-хуки,
режимы и statusline — только у плагина Claude Code, отдельного
`hooks.json`/`rules` под Antigravity сьют не поставляет.

**Установка — скиллы без плагин-обёртки (альтернатива):**

`npx skills add lowcoware/impulse -a antigravity`, либо
`node scripts/install.js --target=antigravity --apply`.

Project scope ставит в `.agents/skills/<skill>/` — **та же директория,
что Codex использует на project scope.** Если вы уже запускали
`--target=codex --apply` в этом проекте, эта установка уже покрывает и
Antigravity — инсталлер это обнаруживает и репортит, а не дублирует.
`--scope=user` ставит в `~/.gemini/config/skills/<skill>/` — это
специфично для Antigravity (с Codex не общее).

У Antigravity та же базовая спецификация скиллов, что у Codex, поэтому
инсталлер применяет ту же валидацию `name`/`description`, что описана в
разделе Codex выше.

**После рестарта ожидайте:** все 22 скилла доступны, автоподключение по
description. `.agents/rules/*.md` (workspace) / `~/.gemini/GEMINI.md`
(глобально) и `AGENTS.md` — отдельные пути инъекции правил у Antigravity
(лимит 12000 символов) — инсталлер их не генерирует.

**Ручной фолбэк:**

```
robocopy skills <project>\.agents\skills /E
robocopy shared <project>\.agents\impulse-shared /E
```

(user scope: `%USERPROFILE%\.gemini\config\skills\` и
`%USERPROFILE%\.gemini\config\impulse-shared\`.)

**Удаление:**

```
node scripts/install.js --target=antigravity --apply --uninstall
```

## OpenCode

**Проверено:** 2026-07-18. Источник: `opencode.ai/docs/skills`,
`/docs/plugins`, `/docs/config`; таргет `opencode` в `vercel-labs/skills`
(`github.com/vercel-labs/skills` README, таблица Supported Agents).

**Требования:** OpenCode CLI с включённым `skill`-тулом (по умолчанию
включён; можно ограничить через `permission.skill` в `opencode.json`).

**У OpenCode нет нативной команды `/plugin` и нет GUI/TUI-инсталлера** —
в отличие от Claude Code (`/plugin marketplace add` + `/plugin install`) и
Antigravity (`agy plugin install`). Официально поддерживаются только: npm-
пакет в массиве `plugin` внутри `opencode.json`, или файлы плагина в
`.opencode/plugins/` / `~/.config/opencode/plugins/` (авто-загрузка при
старте). Сторонние неофициальные тулы для маркетплейса скиллов
(`opencode-marketplace`, аналоги) существуют, но это community-обёртки, не
вендорская фича — в этот раздел не включаю, здесь только пути из
официальной документации OpenCode.

**Важное отличие от остальных четырёх таргетов:** OpenCode не роутит по
`description` на уровне промпта — у него отдельный тул `skill`. Агент
видит список доступных скиллов (имя + description) и сам решает вызвать
`skill({ name: "impulse-frontend" })`, когда описание подходит к задаче.
Эффект тот же (скилл подключается по релевантности), механизм другой
(явный tool call, а не системная инъекция).

**OpenCode читает `.claude/skills/` и `.agents/skills/` нативно, на обоих
scope (project И user/global) — в дополнение к своим собственным
`.opencode/skills/` (project) и `~/.config/opencode/skills/` (global).**
Если сьют уже стоит для Claude Code (`.claude/skills/`) или для
Codex/Antigravity (`.agents/skills/`) в этом же проекте или в домашней
директории — OpenCode **уже видит все 22 скилла, без единого доп. шага.**
Ниже — путь для случая, когда OpenCode стоит сам по себе, без остальных.

**Через `npx skills` (основной способ для чистой OpenCode-установки):**
`npx skills add lowcoware/impulse -a opencode`.

**Установка — одна команда:**

```
node scripts/install.js --target=opencode --apply
```

Project scope ставит в `.agents/skills/<skill>/` (та же директория, что
у Codex/Antigravity на project scope — если один из них уже стоит здесь,
инсталлер это обнаруживает и репортит, не дублирует). `--scope=user`
ставит в `~/.config/opencode/skills/<skill>/` — это специфично для
OpenCode, с Codex/Antigravity не общее.

Frontmatter-лимиты у OpenCode — та же спецификация, что у Codex/Antigravity:
`name` ≤ 64 символов, kebab-case, равно имени директории; `description`
≤ 1024 символов. Инсталлер валидирует тем же кодом, что для Codex — сьют
уже проходит чисто (см. "Результаты проверки" ниже).

**После рестарта ожидайте:** все 22 скилла доступны через тул `skill` —
`skill list` (или его эквивалент в используемом клиенте) покажет все
16 имён с description. Подключение — явным tool call от агента, не
автороутингом промпта (см. отличие выше). Без hooks, без statusline, без
state-переключателя режима — см. "Что не переносится" выше.

**Ручной фолбэк:**

```
robocopy skills <project>\.agents\skills /E
robocopy shared <project>\.agents\impulse-shared /E
```

(user scope: `%USERPROFILE%\.config\opencode\skills` и
`%USERPROFILE%\.config\opencode\impulse-shared`.)

**Удаление:**

```
node scripts/install.js --target=opencode --apply --uninstall
```

## Gemini CLI

**Проверено:** 2026-08-05. Источник: `geminicli.com/docs/cli/skills`,
`/docs/extensions/reference`, `github.com/google-gemini/gemini-cli`
(`docs/cli/skills.md`); таргет `gemini-cli` в `vercel-labs/skills`.

**Требования:** Gemini CLI с включёнными Agent Skills — на свежих stable
включены по умолчанию; на старых preview-сборках включите
`experimental.skills` через `/settings` (поиск по слову "Skills").

**Установка — расширение Gemini CLI (основной способ):**

```
gemini extensions install https://github.com/lowcoware/impulse
```

Сьют поставляет `gemini-extension.json` в корне, а папку `skills/`
расширения Gemini CLI подхватывают автоматически — бандл встаёт в
`~/.gemini/extensions/impulse/` со всеми 22 скиллами. Рядом:
`gemini extensions list`, `disable impulse` / `enable impulse` (у
disable есть `--scope user|workspace`), `uninstall impulse`. Плюс этого
пути: обновление одной командой (см. "Обновление") и клонируется весь
бандл, включая `shared/` — кросс-ссылки резолвятся, как в нативном
плагине Claude Code.

**Установка — standalone-скиллы (альтернатива):**
`gemini skills install <repo-url>` ставит скиллы из git-репозитория
(`--scope user|workspace`; `--consent` пропускает
security-подтверждение). Либо `npx skills add lowcoware/impulse -a
gemini-cli` — кладёт в `.agents/skills/` (проект) / `~/.gemini/skills/`
(глобально, `-g`).

**Zero-step случай, как у OpenCode:** Gemini CLI читает
`.agents/skills/` (workspace) и `~/.agents/skills/` (user) как алиасы
своих `.gemini/skills/` / `~/.gemini/skills/`, причём алиас в
приоритете. Если сьют уже стоит для Codex/Antigravity/OpenCode на
project scope (например, через `node scripts/install.js --target=codex
--apply`) — Gemini CLI **уже видит все 22 скилла без единого доп.
шага.**

**После рестарта ожидайте:** `/skills list` показывает все скиллы
(`/skills reload` — перечитать без рестарта, `/skills disable|enable
<name>` — точечно). Механизм подключения ближе к OpenCode, чем к
роутеру Claude Code: имена и description скиллов инжектятся в промпт,
модель сама вызывает тул `activate_skill`, и перед раскрытием полного
SKILL.md Gemini CLI спрашивает подтверждение пользователя. Без hooks,
statusline и state-режима — см. "Что не переносится" выше.

**Ручной фолбэк:**

```
robocopy skills <project>\.agents\skills /E
robocopy shared <project>\.agents\impulse-shared /E
```

(тот же project-scope путь, что у Codex/Antigravity/OpenCode; user
scope — `%USERPROFILE%\.agents\skills\`.)

**Удаление:** `gemini extensions uninstall impulse`; голые копии —
удалите `impulse-*` из соответствующей skills-директории.

## Qwen Code

**Проверено:** 2026-08-05. Источник:
`qwenlm.github.io/qwen-code-docs/en/users/features/skills`,
`/en/users/extension/introduction`; таргет `qwen-code` в
`vercel-labs/skills`.

**Требования:** Qwen Code CLI.

**Установка — расширение Qwen Code (основной способ):**

Qwen Code ставит Claude-Code-плагины и Gemini-расширения напрямую, с
автоконвертацией на установке:

```
qwen extensions install https://github.com/lowcoware/impulse
```

Этот репозиторий — одновременно Claude-маркетплейс с одним плагином и
Gemini-расширение; Qwen Code понимает оба формата. При конвертации
Claude-плагина манифест переводится в `qwen-extension.json`, скиллы — в
Qwen-формат; hooks не переносятся (как и на всех не-Claude таргетах —
см. "Что не переносится"). По умолчанию расширение ставится на user
scope (`~/.qwen/extensions/`), `--scope project` — только в текущий
workspace. Управление — интерактивный менеджер `/extensions` (три таба,
hot-reload без рестарта) или `qwen extensions
list|disable|enable|uninstall`.

**Установка — скиллы без обёртки (альтернатива):**
`npx skills add lowcoware/impulse -a qwen-code` — кладёт в
`.qwen/skills/` (проект) / `~/.qwen/skills/` (глобально, `-g`). Важно:
в отличие от Gemini CLI, OpenCode и Goose, Qwen Code **не** читает
`.claude/skills/` и `.agents/skills/` — установка для соседних CLI его
не покрывает, нужна своя копия.

**После рестарта ожидайте:** все 22 скилла в `/skills` (интерактивная
панель). Подключение двойное: модель сама подхватывает скилл по
description (как роутер Claude Code), плюс каждый скилл можно вызвать
явно слэш-командой `/<имя-скилла>` — например `/impulse-backend`.
Frontmatter-лимитов типа Codex у Qwen Code нет; `name` должен
матчиться на `/^[\p{L}\p{N}_:.-]+$/u` — все имена сьюта проходят.

**Ручной фолбэк:**

```
robocopy skills <project>\.qwen\skills /E
robocopy shared <project>\.qwen\impulse-shared /E
```

(user scope: `%USERPROFILE%\.qwen\skills\`.)

**Удаление:** `qwen extensions uninstall impulse`; голые копии —
удалите `impulse-*` из `.qwen/skills/`.

## Goose

**Проверено:** 2026-08-05. Источник: `block.github.io/goose` —
`docs/guides/context-engineering/using-skills`, `.../plugins`,
`docs/mcp/skills-mcp`; таргет `goose` в `vercel-labs/skills`.

**Требования:** Goose v1.25+ (CLI или Desktop) — скиллы там грузит
встроенный платформенный экстеншен Skills, включённый по умолчанию. В
v1.16–1.24 это было отдельное расширение `skills` (включается через
`goose configure` -> Toggle Extensions); раньше скиллов не было.

**Zero-step случай, как у OpenCode:** рекомендованный стандарт Goose —
`.agents/skills/` (проект) и `~/.agents/skills/` (глобально), плюс
обратная совместимость с `.claude/skills/`, `~/.claude/skills/` и
`.goose/skills/`. Если сьют уже стоит для Claude Code, Codex,
Antigravity или OpenCode — Goose **уже видит все 22 скилла без единого
доп. шага.** Ниже — пути для чистой установки.

**Установка — плагин Goose (основной способ для чистой установки):**

```
goose plugin install https://github.com/lowcoware/impulse
```

Формат Open Plugins у Goose — `plugin.json` в корне + папка `skills/` —
ровно то, как сьют уже собран (тот же бандл, что ставит Antigravity).
Плагин встаёт в `~/.agents/plugins/impulse/` целиком, включая `shared/`
(кросс-ссылки резолвятся). Флаг `--auto-update` при установке — Goose
сам проверяет обновления перед загрузкой скиллов. Выключить без
удаления — `"disabledPlugins": ["impulse"]` в
`~/.config/goose/settings.json`.

Два нюанса формата: скиллы из Open-плагина Goose неймспейсит именем
плагина — `impulse:impulse-backend` и т.д., при явном вызове используйте
полное имя (скиллы из голой копии в `.agents/skills/` живут без
префикса). И Goose-hooks (`hooks/hooks.json`) сьют не поставляет —
папку `hooks/` с Claude-машинерией Goose игнорирует, исполняться из неё
ничего не будет.

**Установка — голая копия (альтернатива):**
`npx skills add lowcoware/impulse -a goose` кладёт в `.goose/skills/`
(проект) / `~/.config/goose/skills/` (глобально) — легаси-пути, Goose
их читает, но рекомендованный стандарт — `.agents/skills/`:
`node scripts/install.js --target=codex --apply` (project scope) или
`cp -r skills/. ~/.agents/skills/` (глобально).

**После рестарта ожидайте:** `goose skills list` (или `/skills` в
CLI-сессии) показывает все 22 скилла; подключение — по совпадению
запроса с description либо явной просьбой ("use the impulse-backend
skill"). Без hooks, statusline и state-режима — см. "Что не
переносится" выше.

**Ручной фолбэк:**

```
robocopy skills %USERPROFILE%\.agents\skills /E
robocopy shared %USERPROFILE%\.agents\impulse-shared /E
```

(project scope: `<project>\.agents\skills\` — тот же путь, что у
Codex/Antigravity/OpenCode.)

**Удаление:** плагин — удалите `~/.agents/plugins/impulse/` (отдельной
команды uninstall у `goose plugin` нет; выключение без удаления —
`disabledPlugins` выше); голые копии — удалите `impulse-*` из
соответствующей skills-директории.

## Общие файлы и кросс-ссылки между скиллами

`shared/authoring.md`, `shared/communication.md`, `shared/evals.md` и
`shared/context7.md` копируются вместе со скиллами в папку `impulse-shared/`
в корне каждого таргета (`.claude/impulse-shared/`, `.agents/impulse-shared/`,
`~/.gemini/config/impulse-shared/`, `~/.config/opencode/impulse-shared/` на
OpenCode user scope — на project scope OpenCode делит `.agents/impulse-shared/`
с Codex/Antigravity). Некоторые скиллы ещё и ссылаются на
`references/*.md` *других* скиллов по относительному пути (например,
`impulse-frontend` указывает на референс `impulse-backend`). Инсталлер просто
раскладывает файлы, ссылки он не переписывает. Внутри нативного плагина
Claude Code эти ссылки резолвятся, потому что весь сьют ставится одним
деревом. Везде ещё — при голых копиях на любом таргете — глубокая
кросс-ссылка между скиллами может не найти файл на диске. Это осознанная
деградация, а не баг: ссылки — это указатели для человека или агента, куда
пойти за нужным гайдлайном, а не жёсткий импорт, от которого зависит
работа скилла. Строить движок, переписывающий ссылки, ради этого
обсуждали и отклонили — оверинжиниринг для документационной
кросс-ссылки.

## Результаты проверки (текущий сьют, проверено 2026-07-04)

Все 22 скилла проходят лимиты frontmatter для Codex/Antigravity/OpenCode
(общая спецификация, инсталлер валидирует одним кодом для всех трёх): у
каждого `name` ≤ 64 символов и точно совпадает с директорией; у каждого
`description` ≤ 1024 символов. Ноль нарушений —
валидатор инсталлера тут это defense-in-depth на случай, если будущий
скилл выйдет за лимит, а не фикс уже сломанного (`scripts/check-skills.js`
и так гейтит эти же два лимита по всему сьюту в CI).

## Матрица совместимости

| | Claude Code | Cursor | Codex | Antigravity | OpenCode | Gemini CLI | Qwen Code | Goose |
|---|---|---|---|---|---|---|---|---|
| SKILL.md нативно | да (исходный формат) | да | да | да | да | да | да | да |
| Целевая директория этого инсталлера | `.claude/skills/` | `.claude/skills/` (алиас) | `.agents/skills/` | `.agents/skills/` (проект, = codex) / `~/.gemini/config/skills/` (пользователь) | `.agents/skills/` (проект, = codex) / `~/.config/opencode/skills/` (пользователь) | своего таргета нет; проект покрывает `--target=codex` | своего таргета нет; `npx skills -a qwen-code` -> `.qwen/skills/` | своего таргета нет; проект покрывает `--target=codex` |
| Нативная плагин-система | `/plugin install` (marketplace) | нет | нет | `agy plugin install` | нет | `gemini extensions install` | `qwen extensions install` (понимает Claude-плагины и Gemini-расширения) | `goose plugin install` (Open Plugins) |
| references/*.md как есть | да | да | да | да | да | да | да | да |
| Hooks / statusline / mode-flag `/impulse-*` | только плагин | нет | нет | нет | нет | нет | нет | нет |
| Подключение скилла | роутер по description | роутер по description | роутер по description | роутер по description | явный tool call `skill({name})`, агент решает по description | модель вызывает тул `activate_skill` + подтверждение пользователя | роутер по description + явная слэш-команда `/<skill>` | роутер по description |
| Нативно читает чужие директории других таргетов | — | `.claude/skills/` | — | — | `.claude/skills/` И `.agents/skills/`, project+user | `.agents/skills/` (алиас), project+user | — | `.agents/skills/` И `.claude/skills/` (+ легаси `.goose/skills/`), project+user |
