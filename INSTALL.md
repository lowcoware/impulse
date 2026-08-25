**Русский** · [English](INSTALL.en.md)

# Установка — impulse на разных CLI

Сьют написан в нативном формате `SKILL.md` + `references/*.md` —
agentskills.io. Этот формат все CLI ниже понимают **нативно**, так
что установка скиллов — это раскладка файлов, а не конвертация.

**У установки нет одного универсального пути — у каждой платформы он
свой**, потому что нативные механизмы реально разные: у Claude Code это
маркетплейс-плагин с hooks; у Cursor — `.mdc`-правила с `alwaysApply`; у
Codex — `hooks.json` с per-turn инъекцией через `UserPromptSubmit`; у
Antigravity — плагин-бандл с `rules/`; у Gemini CLI/Qwen Code/Goose —
свои `extensions install`/`plugin install`; у OpenCode/Kilo Code —
`AGENTS.md`/`instructions`-массив в конфиге. Ниже — отдельный раздел на
каждую платформу, ведущий её собственным нативным способом первым.
Кросс-платформенный установщик скиллов (`npx skills` / `scripts/install.js`)
существует и работает, но это **fallback**, не основной путь — он кладёт
голый уровень скиллов без machinery конкретной платформы (hooks, always-on
инъекция ruleset'а и т.п.); раздел "Кросс-платформенный fallback" внизу
файла, после всех платформенных разделов.

Некоторые платформы читают чужие директории нативно, без единого доп.
шага, если сьют уже стоит для соседнего инструмента в том же проекте или
в домашней директории — это отмечено в разделе каждой платформы, где
применимо (OpenCode, Goose и Gemini CLI читают `.claude/skills/` и/или
`.agents/skills/`).

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

У сьюта три слоя: **контент** (роутеры + references — ставится везде),
**always-on core-слой** (`impulse-core`: инженерная дисциплина,
verification, token economy — переносится на 8 из 9 харнессов через
собственный нативный механизм каждого, раздел этой платформы описывает
как именно: hooks у Claude Code/Codex/Cursor, статичный
rules-файл/`AGENTS.md` у остальных) и **mode-машинерия**, доступная
только в плагине Claude Code: флаг режима на `SessionStart`, полная
динамика `impulse-backend`/`impulse-frontend` (blitz/hardcore) на
`UserPromptSubmit`, распространение на `SubagentStart`, бейдж режима в
statusline и `/impulse-backend [mode]` / `/impulse-frontend [mode]` как
*state-переключатель режима*. Эта машинерия подключена через блок `hooks`
в `.claude-plugin/plugin.json` и грузится только когда сьют установлен
как **нативный плагин** (путь через маркетплейс) — ни на одном другом
таргете её нет, независимо от того, есть ли у него свой core-слой.

А что работает везде, включая голую копию скиллов без core-слоя: роутер
любого CLI сам подключает скилл, сверяя ваш промпт с `description` из
frontmatter (те самые триггер-фразы из каждого SKILL.md). Флага режима
`blitz`/`medium`/`hardcore` вне плагина Claude Code нет, но тот же эффект
даёт просто упоминание режима в промпте — например, "review this Go
service in hardcore mode" всё равно подтянет hardcore-гайдлайны
`impulse-backend`, просто без трекинга в session state и без отметки в
statusline.

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

**После рестарта ожидайте:** все 23 скилла в списке скиллов Claude Code
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

**Проверено:** 2026-08-26. Источник: `docs.cursor.com/docs/rules`,
`docs.cursor.com/docs/agent/hooks` (hooks — статус BETA, добавлены в
Cursor 1.7, октябрь 2025).

IDE и CLI используют один и тот же движок правил (`.cursor/rules/`,
`AGENTS.md`) — секция ниже единая для обеих поверхностей, различия по
CLI отмечены отдельно.

**Требования:** Cursor (IDE или CLI) с поддержкой `.cursor/rules/` —
это базовая функциональность, отдельно включать ничего не нужно.
Опциональная часть про hooks требует Cursor 1.7+ и включённый
Agent Skills для скиллов (см. ниже).

### impulse-core: постоянный слой (основной способ)

Cursor читает `.mdc`-файлы из `.cursor/rules/` (корень проекта,
вложенность допускается) — YAML-фронтматтер + markdown-тело. Поле
`alwaysApply: true` внедряет правило в **каждую** сессию безусловно;
`description`/`globs` в этом режиме не участвуют. Это самый надёжный
механизм постоянной доставки правил из всех, что подтверждены
документацией — работает одинаково в IDE и в CLI.

**Установка — одна команда (project scope):**

```
cp cursor-plugin/rules/impulse-core.mdc .cursor/rules/impulse-core.mdc
```

Правило подключается на следующей сессии — рестарт не обязателен для
CLI, для IDE иногда требуется переоткрыть чат.

**Про global/user scope:** отдельного `~/.cursor/rules/`, который
Cursor гарантированно подхватывает как user-level `alwaysApply`-правила
для всех проектов, в документации **не подтверждено** — Cursor
предлагает User Rules только через UI настроек (Settings → Rules), без
задокументированного пути к файлу на диске. Поэтому этот способ
установки — **project-level only**: копируйте `impulse-core.mdc` в
каждый проект, где нужен постоянный слой. Если хотите те же правила во
всех проектах разом — переносите текст вручную в Settings → Rules
через UI; это отдельный, не файловый механизм, который инсталлер не
трогает.

`AGENTS.md` в корне проекта тоже подхватывается автоматически и
складывается вместе с `.cursor/rules/` (аддитивно, не вместо) — если в
проекте уже есть `AGENTS.md`, `impulse-core.mdc` ему не мешает, они
суммируются.

Устаревший одиночный `.cursorrules` всё ещё грузится, но отсутствует в
актуальной документации как поддерживаемый — новую установку через него
не делайте.

**Удаление:**

```
rm .cursor/rules/impulse-core.mdc
```

### Скиллы (22 шт.) — отдельный механизм

impulse-core (эта секция) и сами скиллы — независимые установки, ставьте
оба. Скиллы:

```
npx skills add lowcoware/impulse -a cursor
```

(или `node scripts/install.js --target=cursor --apply` — офлайн-фолбэк,
подробнее в разделе «Кросс-платформенный fallback» ниже). Команда
переиспользует `.claude/skills/` (Cursor читает эту директорию напрямую,
нативно, ради совместимости — отдельной копии в `.cursor/skills/` нет и
не нужно).

**Поправка к старой формулировке:** ниже по документу для других
таргетов сказано «без hooks» — для Cursor это больше не так, у него
есть hooks (см. следующий раздел, статус BETA).

### hooks.json — опциональное per-сессийное усиление (BETA)

Cursor 1.7+ поддерживает `hooks.json` (`.cursor/hooks.json` — проект,
или `~/.cursor/hooks.json` — user/global, путь подтверждён документацией
в отличие от User Rules выше). Хук `sessionStart` умеет вернуть поле
`additional_context`, которое агент вкладывает в разговор.

**Важная оговорка по CLI:** `sessionStart` подтверждённо срабатывает и
в IDE, и в CLI. А вот `beforeSubmitPrompt` — единственный хук, похожий
на «настоящий» per-turn триггер (то есть срабатывающий на каждое
сообщение, а не один раз за сессию) — по подтверждению самого Cursor на
форуме **ненадёжно срабатывает в CLI non-interactive режиме**. Поэтому
`hooks.json` здесь даёт только разовое усиление в начале сессии, а не
per-turn инъекцию — основным механизмом постоянной доставки остаётся
`.mdc` с `alwaysApply: true` выше, hooks его дополняют, не заменяют.

**Установка (project scope):**

```
cp cursor-plugin/hooks/hooks.json .cursor/hooks.json
cp cursor-plugin/hooks/impulse-inject.js .cursor/impulse-inject.js
```

Файл `impulse-inject.js` самодостаточен — тот же текст ruleset'а зашит
внутрь, внешних зависимостей от остального репозитория нет. Отключить:
`IMPULSE_CORE=0` в окружении сессии (хук фейлит открыто, без
`additional_context`), или просто удалить оба файла.

**Удаление:**

```
rm .cursor/hooks.json .cursor/impulse-inject.js
```

### Итог

- `.mdc` + `alwaysApply: true` — ставьте всегда, это основной механизм,
  project-level, high confidence.
- `hooks.json` — ставьте по желанию как усиление на старте сессии,
  BETA, не замена `.mdc`.
- Скиллы — отдельная установка, см. общую секцию `npx skills` выше.

## Codex

**Проверено:** скиллы — 2026-07-04 (источники не менялись: `developers.
openai.com/codex/skills`, `/codex/guides/agents-md`, `/codex/config-
reference`, `github.com/openai/skills`). Hooks-механизм и IDE-унификация —
research-проход 2026-08-26, источники `learn.chatgpt.com/docs/hooks`
(прямая документация hooks, высокая уверенность) и `/codex/config-
reference` (`developer_instructions`); степень подтверждённости по каждому
пункту см. в тексте ниже.

**Требования:** OpenAI Codex CLI, и/или его IDE-расширение (VS Code,
JetBrains) — оба используют одну и ту же систему конфигурации
(`config.toml`, `AGENTS.md`, hooks); официальная документация прямо
говорит, что «Codex agents in the app inherit the same configuration as
the IDE extension and CLI». Поэтому один раздел покрывает оба — с одной
оговоркой про hooks в IDE, см. ниже.

**Скиллы:** `npx skills add lowcoware/impulse -a codex` или
`node scripts/install.js --target=codex --apply` (project scope
`.agents/skills/`, user scope `~/.agents/skills/`). Codex жёстко требует
лимиты frontmatter, инсталлер проверяет их **до** копирования: `name` ≤
64 символов, kebab-case, равно имени директории; `description` ≤ 1024
символов — нарушение репортится по имени и валит запуск (exit code 2), а
не обрезается молча. Текущий результат сьюта (чисто) — см. "Результаты
проверки" ниже. Ручной фолбэк: `robocopy skills <project>\.agents\skills
/E` + `robocopy shared <project>\.agents\impulse-shared /E`. Удаление:
`node scripts/install.js --target=codex --apply --uninstall`.

**Новое — `impulse-core` через hooks (основной способ для мастер-слоя):**

У Codex, помимо скиллов и `AGENTS.md`, есть отдельная hooks-система:
`SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`, `PreCompact` /
`PostCompact`, `PreToolUse`, `PostToolUse`, `SubagentStart` /
`SubagentStop`. `UserPromptSubmit` — это настоящий per-turn хук: срабатывает
перед **каждым** ходом, в отличие от `AGENTS.md`, который склеивается
(root -> cwd, лимит 32 KiB) один раз при старте сессии и больше не
перечитывается. Хук `SessionStart`, `SubagentStart` и `UserPromptSubmit`
может напечатать в stdout произвольный текст — Codex добавит его как
дополнительный «developer context» этого хода (либо вернуть JSON с полем
`additionalContext`; лимит по умолчанию ~2500 токенов, настраивается
`additionalContextLimit`). `codex-plugin/impulse-core/inject-core.js` — это
и есть такой скрипт: печатает ruleset мастер-слоя в stdout и выходит с
кодом 0, без зависимостей.

Hooks спрятаны за feature-флагом `features.hooks` (по умолчанию выключен)
и настраиваются файлом `hooks.json` (или инлайн-таблицей `[hooks]` в
`config.toml`) по одному из путей: `~/.codex/hooks.json`, `~/.codex/config.
toml`, `<repo>/.codex/hooks.json`, `<repo>/.codex/config.toml`. Для
project-local слоя (`<repo>/.codex/...`) Codex должен считать `.codex/`
доверенной директорией — обычно подтверждается интерактивным промптом при
первом запуске Codex в этом проекте. Глобальный слой (`~/.codex/...`, ниже
как основной путь) этого не требует — это собственная домашняя директория
Codex, а не директория недоверенного проекта.

Установка (global scope, самый простой путь):

```
mkdir -p ~/.codex
cp -r codex-plugin/impulse-core ~/.codex/impulse-core
```

`hooks.json` из `codex-plugin/impulse-core/` — это не финальное
расположение, а содержимое, которое нужно положить (или смержить) в один
из путей discovery выше. Если `~/.codex/hooks.json` ещё не существует:

```
cp ~/.codex/impulse-core/hooks.json ~/.codex/hooks.json
```

Если файл уже существует и в нём есть другие хуки — не перезаписывайте,
а добавьте записи `SessionStart` и `UserPromptSubmit` из `codex-plugin/
impulse-core/hooks.json` в соответствующие массивы вручную (структура —
список объектов с `hooks: [{type: "command", command: "..."}]`, как в
файле-источнике). Команда в обоих хуках — `node "$HOME/.codex/impulse-
core/inject-core.js"`; если `CODEX_HOME` у вас переопределён (не
`~/.codex`) или вы ставите на project scope, поправьте путь под свой
случай перед копированием.

Включите флаг — добавьте в `~/.codex/config.toml`:

```toml
[features]
hooks = true
```

**Проверка после установки:** `node ~/.codex/impulse-core/inject-core.js`
должен напечатать ruleset в stdout без ошибок (это проверяет сам скрипт
вне Codex). Чтобы проверить, что хук реально подключён — начните новую
сессию Codex и задайте прямой вопрос вроде «какие правила impulse-core
сейчас активны»: ответ должен процитировать конкретные пункты (ladder,
verification, token economy), а не общие слова — если цитирует,
`UserPromptSubmit`-хук сработал и переинжектится на каждом ходе.

**Удаление:**

```
rm -rf ~/.codex/impulse-core
```

и вручную убрать записи `SessionStart` / `UserPromptSubmit`, указывающие
на `impulse-core/inject-core.js`, из `~/.codex/hooks.json` (либо удалить
файл целиком, если в нём не было ничего своего).

**Более простая статичная альтернатива — `developer_instructions`:**

`config.toml` поддерживает строковое поле `developer_instructions`,
которое «инжектит дополнительные developer-инструкции в сессию» — без
feature-флага и без hooks-плампинга. Ограничение: это статика, задаётся
один раз при старте сессии (как `AGENTS.md`), а не на каждый ход — если
per-turn инъекция не критична, это более простой путь:

```toml
developer_instructions = """
<текст ruleset из codex-plugin/impulse-core/inject-core.js — тот же, что
инжектит hooks-путь выше, скопированный вручную>
"""
```

Дублировать текст ruleset прямо в этом файле не стали намеренно — источник
истины один, `codex-plugin/impulse-core/inject-core.js`, синхронизируемый
`scripts/check-sync.js`.

**Открытый вопрос — паритет hooks в IDE-расширении:** официальная
документация подтверждает, что IDE-расширение (VS Code, JetBrains)
использует ту же систему конфигурации, что CLI, но НЕ подтверждает прямо,
что hooks-события (в частности `UserPromptSubmit`) срабатывают в
IDE-сессиях идентично CLI — по итогам этого research-прохода это осталось
неподтверждённым, а не намеренно опровергнутым. Если ставите этот способ
ради IDE-расширения — проверьте эмпирически тем же вопросом «какие
правила impulse-core сейчас активны» в IDE-сессии; если хук не сработал,
`developer_instructions` (статичная альтернатива выше) — рабочий фолбэк,
поскольку это часть `config.toml`, который IDE точно читает.

**Что не переносится:** `AGENTS.md` остаётся отдельным, встроенным в ядро
механизмом инъекции контекста у Codex (конкатенация root -> leaf, лимит по
умолчанию 32 KiB) — hooks-путь выше его не заменяет и не генерирует; если
хотите, чтобы гайдлайны сьюта форс-загружались, а не роутились, добавьте
свою строку-указатель в `AGENTS.md` проекта вручную, как и раньше. Как и у
остальных не-Claude-Code таргетов: только core-слой (`impulse-core`)
инжектится always-on — mode-aware `impulse-backend`/`impulse-frontend`
динамика (blitz/hardcore) сюда пока не перенесена (см. `shared/multi-
harness-robustness.md`); `/impulse-core off` как durable-команда — это
Claude-Code-специфичный конфиг-файл, здесь не работает как есть.

## Antigravity

**Проверено:** 2026-08-24, но относитесь как к **молодому и
нестабильному** — путь скиллов у Antigravity уже переименовывали один раз
за время публичной жизни (`.agent/` -> `.agents/`), а текущие пути стоит
считать "вероятно-стабильными-не-замороженными". Прежде чем полагаться на
это для чего-то кроме текущего релиза, перепроверьте по
`antigravity.google/docs/skills` (а также `/docs/rules-workflows`,
`/docs/plugins`, `/docs/cli/plugins`, `/docs/cli/gcli-migration`). `.agent/`
(в единственном числе) поддерживается как алиас для обратной совместимости,
если найдёте старую установку с ним.

**Четыре поверхности, один движок.** «Google Antigravity» — не один
продукт, а общий движок под тремя потребительскими поверхностями плюс SDK
для разработчиков (SDK — библиотека для встраивания, не цель установки,
здесь не рассматривается):

- **Antigravity IDE** — редактор с агентом внутри, project/workspace-scope.
- **Antigravity 2.0** — отдельное десктоп-приложение (релиз ~19 мая 2026),
  agent-first, без привязки к IDE или конкретному репозиторию.
- **Antigravity CLI (`agy`)** — терминальный клиент, тот же движок.

Все три читают одну и ту же конвенцию правил и плагинов — `.agents/rules/`
(workspace), `~/.gemini/GEMINI.md` (глобально), `AGENTS.md` (project root
или home dir, общий кросс-тул файл, читается наравне с `.agents/rules`) —
это не IDE-специфичная фича, а workspace/global-scoped механизм движка.
Из трёх поверхностей плагин-бандлы (`agy plugin install`) документированы
только у CLI; IDE и 2.0 подхватывают тот же бандл, если он лежит по одному
из путей ниже, но команды для управления им (`plugin list/enable/disable`)
— CLI-специфичны.

**Требования:** любая из трёх поверхностей — Antigravity IDE, Antigravity
2.0 (десктоп) или Antigravity CLI (`agy`). Плагин-фолбэки в этом разделе
рассчитаны на CLI; для IDE/2.0 см. блок ниже про ручную раскладку файлов.

**Установка — плагин Antigravity (основной способ, CLI):**

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
предупреждение выше).

**Правила (`rules/impulse-core.md`) — новое в этой ревизии.** Бандл теперь
несёт `rules/impulse-core.md` в своём корне, рядом с `skills/`. Для CLI это
означает: тот же `agy plugin install lowcoware/impulse`, что ставит скиллы,
кладёт и этот файл — отдельного шага не требуется, он автоматически входит
в уже описанную выше установку плагина.

Для IDE и Antigravity 2.0 команды `agy plugin` недоступны — файл нужно
положить руками по одному из путей, которые движок читает как правила:

```
robocopy rules <project>\.agents\rules /E
```

(или скопировать `rules\impulse-core.md` напрямую в `.agents/rules/` вашего
workspace; глобально — дописать его текст в `~/.gemini/GEMINI.md`, или
положить как `AGENTS.md` в корень проекта/home).

**Важно — активация "Always On" не автоматическая.** Формат Antigravity
предполагает четыре режима активации файла правил: Manual, Always On, Model
Decision, Glob — но точное имя YAML-поля frontmatter, которым режим Always
On задаётся программно, не подтверждено документацией на момент этого
исследования. Файл `rules/impulse-core.md` поставляется **без**
frontmatter, чтобы не гадать со схемой. После установки (любой поверхностью
— IDE, 2.0, CLI) откройте Rules UI/picker для вашего workspace и вручную
выставите этому файлу режим **Always On** — иначе правило не будет
подключаться на каждый ход.

**Хуки (`hooks.json`) — документированы, но не проверяйте на них always-on
поведение.** У Antigravity есть задокументированная система хуков с тремя
категориями (Inspect, Decide, Transform) — см. `antigravity.google/docs/plugins/`,
`/docs/cli/plugins/`. По независимому отчёту с форума (август 2026, без
подтверждения от Google) хуки на практике срабатывают **только в CLI**:
контролируемый тест на Antigravity IDE 2.1.1 и Antigravity 2.0 desktop
2.5.0 не дал ни одного вызова хука, хотя документация описывает хуки как
доступные на всех поверхностях. Точные имена событий хуков (в духе
PreToolUse/PostToolUse) взяты из заголовка форумной ветки, а не из
официальной схемы. Этот бандл сознательно **не** поставляет `hooks.json` —
это возможное будущее улучшение для CLI, но не текущий механизм доставки
правил; полагаться на хуки для чего-то кроме CLI пока нельзя.

**Установка — скиллы без плагин-обёртки (альтернатива):**

`npx skills add lowcoware/impulse -a antigravity`, либо
`node scripts/install.js --target=antigravity --apply`.

Project scope ставит в `.agents/skills/<skill>/` — **та же директория,
что Codex использует на project scope.** Если вы уже запускали
`--target=codex --apply` в этом проекте, эта установка уже покрывает и
Antigravity — инсталлер это обнаруживает и репортит, а не дублирует.
`--scope=user` ставит в `~/.gemini/config/skills/<skill>/` — это
специфично для Antigravity (с Codex не общее). Этот путь установки не
кладёт `rules/impulse-core.md` — при нём правила разложите вручную по
блоку выше.

У Antigravity та же базовая спецификация скиллов, что у Codex, поэтому
инсталлер применяет ту же валидацию `name`/`description`, что описана в
разделе Codex выше.

**После рестарта ожидайте:** все 23 скилла доступны, автоподключение по
description (на всех трёх поверхностях — IDE, 2.0, CLI). При установке
через `agy plugin install` — также `rules/impulse-core.md` на месте в
корне плагин-бандла; включите ему Always On через Rules UI, как описано
выше. `.agents/rules/*.md` (workspace) / `~/.gemini/GEMINI.md` (глобально)
и `AGENTS.md` — общие пути инъекции правил у Antigravity (лимит 12000
символов на файл); при установке без плагин-обёртки инсталлер их не
генерирует.

**Ручной фолбэк:**

```
robocopy skills <project>\.agents\skills /E
robocopy shared <project>\.agents\impulse-shared /E
robocopy rules <project>\.agents\rules /E
```

(user scope: `%USERPROFILE%\.gemini\config\skills\`,
`%USERPROFILE%\.gemini\config\impulse-shared\`; глобальные правила — через
`~/.gemini/GEMINI.md`, см. выше.)

**Удаление:**

```
node scripts/install.js --target=antigravity --apply --uninstall
```

Плюс, если правила ставились вручную — удалите `rules/impulse-core.md` (или
его копию/включение) из `.agents/rules/`, `~/.gemini/GEMINI.md` или
`AGENTS.md`.

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
директории — OpenCode **уже видит все 23 скилла, без единого доп. шага.**
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

**После рестарта ожидайте:** все 23 скилла доступны через тул `skill` —
`skill list` (или его эквивалент в используемом клиенте) покажет все
16 имён с description. Подключение — явным tool call от агента, не
автороутингом промпта (см. отличие выше). Без event-hook для инъекции в
чат на каждый ход (плагиновый хук `experimental.chat.system.transform`
сейчас не работает — мутации из плагина молча теряются до LLM, см.
GitHub issues `#17100`, `#17637`, `#27401` в бывшем `sst/opencode`, ныне
`anomalyco/opencode`), без statusline, без state-переключателя режима —
см. "Что не переносится" выше. Постоянная инъекция в системный промпт у
OpenCode всё же есть — не через hooks, а через `AGENTS.md`/`instructions`,
см. подраздел ниже.

### impulse-core always-on delivery

impulse-core (движковый слой сьюта: инженерная дисциплина, verification,
token economy — см. `skills/impulse-core/`) в Claude Code держится на
хуках, которых у OpenCode нет и не предвидится в рабочем виде (см. выше
про сломанный `experimental.chat.system.transform`). У OpenCode для этого
есть свой нативный, рабочий механизм — не хук, а безусловная загрузка
файла в системный промпт при старте сессии:

- **`AGENTS.md`** — OpenCode ищет его, поднимаясь от текущей директории до
  корня проекта, плюс отдельно читает глобальный
  `~/.config/opencode/AGENTS.md`. Оба варианта читаются безусловно на
  старте каждой сессии и попадают в системный промпт — это и есть рабочий
  always-on канал для OpenCode.
- **`instructions` в `opencode.json`** — аддитивный массив путей/глобов/
  URL; содержимое каждого файла добавляется в тот же блок системного
  промпта, что заполняет `AGENTS.md`. Это правильный способ подключить
  файл, который не называется буквально `AGENTS.md` — например, файл этого
  сьюта.

Файл сьюта: `opencode/IMPULSE-CORE.md` (в корне репозитория `impulse`).
Два способа его подключить:

**(a) Через `instructions` в `opencode.json`** — путь пишется относительно
расположения самого `opencode.json`:

```json
{
  "instructions": ["opencode/IMPULSE-CORE.md"]
}
```

- **Project scope:** если репозиторий `impulse` склонирован прямо в
  корень проекта (или как git submodule), путь `opencode/IMPULSE-CORE.md`
  в project-`opencode.json` (`<project>/opencode.json`) сработает как
  есть. Если репозиторий сьюта лежит в другом месте — укажите путь
  относительно project-`opencode.json` до него (например
  `../impulse/opencode/IMPULSE-CORE.md`) или абсолютный путь.
- **Global scope** (`~/.config/opencode/opencode.json`, применяется ко
  всем проектам на машине): относительный путь здесь считается от
  `~/.config/opencode/`, поэтому проще всего указать абсолютный путь до
  файла в клонированном репозитории (`C:\Users\<user>\Projects\impulse\opencode\IMPULSE-CORE.md`
  на Windows, `/home/<user>/impulse/opencode/IMPULSE-CORE.md` на Linux/macOS)
  либо скопировать сам файл рядом с `opencode.json` и сослаться на него
  локально.

**(b) Проще для большинства — вставить содержимое в свой `AGENTS.md`.**
Без правки `opencode.json`: возьмите текст `opencode/IMPULSE-CORE.md`
(после вступительного абзаца, с заголовка `## impulse-core active —
always-on engineering + token discipline` и до конца) и допишите его в
конец своего `AGENTS.md` — project-версии (`<project>/AGENTS.md`) для
одного проекта или global-версии (`~/.config/opencode/AGENTS.md`) для всех
сессий на машине. Если в этом же `AGENTS.md` уже есть свои project-
инструкции — impulse-core просто дописывается ниже, оба блока читаются
вместе.

Оба пути дают идентичный результат: правила impulse-core оказываются в
системном промпте каждой сессии OpenCode безусловно, без участия
plugin-хуков. Домен-моды (impulse-backend, impulse-frontend и т.д.)
по-прежнему подключаются через тул `skill`, как описано выше — always-on
слой их не заменяет и не включает автоматически.

## Kilo Code

**Проверено:** 2026-08-26. Источник: `Kilo-Org/kilocode` GitHub docs
(`docs/features/custom-instructions` — `kilo.jsonc`'s `instructions`
array, `.kilo/rules/` convention, global `~/.config/kilo/kilo.jsonc`,
directly fetched) и `kilo.ai` (2026 rebrand от `kilocode.ai`, "v7"
переписан на OpenCode engine, новый отдельный CLI `kilo` рядом с
VS Code-расширением). Путь для скиллов ниже — **экстраполяция**, не
проверено напрямую на Kilo Code, см. флаг в соответствующем разделе.

**Важно про возраст этой версии:** "v7" — переписанный на OpenCode engine
релиз середины 2026, то есть на момент этой проверки ему несколько
месяцев. Конфиг-имена и пути здесь взяты из официальных доков Kilo Code
на дату проверки выше — если у пользователя релиз заметно новее,
перепроверьте `kilo.ai/docs` перед установкой: у движка, который сам
недавно пережил rewrite, конфиг-схема может сдвинуться быстрее, чем у
устоявшихся таргетов вроде Claude Code.

**Требования:** Kilo Code VS Code-расширение (v7+) и/или отдельный
CLI `kilo` — оба ставятся через `kilo.ai`, конкретные команды
install/update там же (не переносил их сюда, чтобы не дублировать то,
что вендор меняет чаще этого документа). У сьюта пока нет скриптового
таргета `--target=kilo` в `scripts/install.js` — установка ниже ручная,
как у Hermes Agent (см. его раздел).

Это **первая установка сьюта под Kilo Code** — этого раздела раньше не
было. Ниже — только текущий (v7) always-on механизм. Легаси-путь
(`.kilocoderules` файл, `.kilocode/rules/*.md`) у Kilo Code всё ещё
работает через авто-миграцию в тот же `instructions`-массив, но
целиться в него незачем: он существует ради обратной совместимости с
установками, которые начинались до v7 — у этой установки такой истории
нет.

**Установка — скиллы (флаг: путь не подтверждён напрямую для Kilo Code):**

Kilo Code v7 построен на OpenCode engine и поэтому нативно читает
`AGENTS.md` (и `CLAUDE.md`) из корня проекта без единого шага конфига —
это подтверждено напрямую (см. Источник выше). Но именно *куда Kilo
Code складывает и ищет скиллы* официальные доки Kilo-Org в ходе этой
проверки не назвали явно. OpenCode сам (см. его раздел этого документа)
нативно читает `.claude/skills/` и `.agents/skills/` на project- и
user-scope через отдельный tool-based механизм (`skill({ name: ... })`,
не системную инъекцию по `description`). Поскольку Kilo Code — тот же
движок, `.agents/skills/` — правдоподобный кандидат по аналогии, но
**это предположение, не факт, проверенный на Kilo Code конкретно.**

Практический путь: если в этом же проекте (или в домашней директории)
уже стоит Codex, Antigravity или сам OpenCode, скиллы уже лежат в
`.agents/skills/` — попробуйте Kilo Code без доп. шагов и спросите
агента внутри Kilo Code напрямую ("what skills do you see" / "какие
скиллы тебе видны"). Если список пустой, ручной фолбэк на ту же
директорию (см. ниже) — она либо подхватится по аналогии с OpenCode,
либо не подхватится вовсе, и тогда единственный подтверждённый канал
для этого таргета — сам `.kilo/rules/`-файл ниже плюс нативный
`AGENTS.md`, который Kilo Code точно читает.

```
robocopy skills <project>\.agents\skills /E
robocopy shared <project>\.agents\impulse-shared /E
```

**Установка — мастер-слой (always-on `impulse-core`), headline-фича этой
установки:**

```
mkdir "<project>\.kilo\rules" 2>$null
copy kilo-plugin\rules\impulse-core.md "<project>\.kilo\rules\impulse-core.md"
```

`kilo.jsonc` в корне проекта (или `.kilo/kilo.jsonc`) должен содержать
`.kilo/rules/*.md` в массиве `instructions` — это дефолтный glob для
идиоматичной директории правил, но проверьте свой `kilo.jsonc`: если там
уже есть `instructions` без wildcard-паттерна на эту директорию,
допишите путь явно:

```jsonc
{
  "instructions": [".kilo/rules/impulse-core.md"]
}
```

Это подтверждённый напрямую (не экстраполяция) always-on механизм:
глобальные `instructions` грузятся первыми, затем проектные, оба
конкатенируются в system prompt **на каждом ходу** — не одноразово на
сессию. `hooks/impulse-instructions.js`'s `coreRuleset()` и
`kilo-plugin/rules/impulse-core.md` держат один и тот же текст ruleset;
`scripts/check-sync.js` это проверяет.

Плагин/hooks-система Kilo Code (`chat.message`,
`experimental.chat.system.transform`) существует, но это тот же
OpenCode chat-hook слой, который в самом OpenCode числится ненадёжным
(см. его раздел) — сьют сюда сознательно не лезет, статичный файл в
`.kilo/rules/` надёжнее и уже подтверждён как always-on.

**Глобальный уровень:** подтверждён напрямую только сам файл
`~/.config/kilo/kilo.jsonc` с тем же `instructions`-массивом — доки не
подтвердили отдельную глобальную директорию правил-эквивалент
`.kilo/rules/` на user-scope. Чтобы `impulse-core.md` подключался из
любого проекта, а не только текущего, положите файл куда угодно
стабильное (например `~/.config/kilo/rules/impulse-core.md`) и
сошлитесь на него из глобального `kilo.jsonc` явным путём:

```jsonc
{
  "instructions": ["~/.config/kilo/rules/impulse-core.md"]
}
```

**После рестарта ожидайте:** новая сессия Kilo Code (VS Code-расширение
или `kilo` CLI) должна процитировать конкретные пункты impulse-core
(ladder, verification, token economy), а не общие слова, если спросить
её напрямую — "какие правила impulse-core сейчас активны". Если
цитирует — `instructions`-массив реально подхватил файл. `AGENTS.md` в
корне репозитория подхватывается отдельно и без доп. проверки — это
нативная OpenCode-engine фича, не завязанная на `kilo.jsonc`.

**Ручной фолбэк:** тот же самый — команды выше уже ручные, скриптового
установщика для этого таргета пока нет.

**Удаление:**

```
del "<project>\.kilo\rules\impulse-core.md"
```

(и обратно откатить правку `instructions` в `kilo.jsonc`, если добавляли
путь явно). Скиллы — удалить `.agents\skills` и `.agents\impulse-shared`,
если ставили только ради Kilo Code и ни один другой таргет их не
использует в этом же проекте.

**Что не переносится:** то же, что у остальных не-Claude-Code таргетов —
hooks Claude Code, statusline, `/impulse-core off` как durable-команда
(Claude-Code-специфичный конфиг) не работают как есть. Mode-aware
`impulse-backend`/`impulse-frontend`-динамика (blitz/hardcore) сюда не
перенесена — только core-слой всегда активен, то же ограничение, что у
`GEMINI.md`-адаптера и у Hermes Agent, и по той же причине: нет
подтверждённого per-turn hook-канала на этом движке, на который можно
было бы повесить mode-aware поведение (плагинный chat-hook слой
существует, но признан ненадёжным — см. выше). `impulse: static
core-only delivery for Kilo Code, revisit if a confirmed reliable
OpenCode-engine chat hook lands.`

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
`~/.gemini/extensions/impulse/` со всеми 23 скиллами. Рядом:
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
--apply`) — Gemini CLI **уже видит все 23 скилла без единого доп.
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

**После рестарта ожидайте:** все 23 скилла в `/skills` (интерактивная
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
Antigravity или OpenCode — Goose **уже видит все 23 скилла без единого
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
CLI-сессии) показывает все 23 скилла; подключение — по совпадению
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

## Hermes Agent

**Проверено:** 2026-08-20. Источник: `github.com/NousResearch/hermes-agent`,
`hermes-agent.nousresearch.com/docs` — конкретно `developer-guide/plugins`
(схема плагина, `pre_llm_call`), `developer-guide/creating-skills` (схема
скилла), `user-guide/features/hooks` (gateway-хуки — не то, что нужно
здесь, см. ниже).

**Требования:** Hermes Agent установлен —
`curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash` или
`pip install hermes-agent`.

Hermes — не форк Gemini CLI/Claude Code и не совместим с их форматом
плагина/расширения напрямую: свой YAML-манифест плагина (`plugin.yaml` +
`register(ctx)` на Python), своя схема `SKILL.md` (frontmatter с
`metadata.hermes`, вложенность `category/skill-identifier/`, а не плоская
`skill-name/`, как у сьюта). Единой команды "поставь весь репозиторий
одной строкой" под Hermes сьют не даёт — декларативного манифеста уровня
`gemini-extension.json`/`plugin.json`, который сам Hermes подхватывал бы
целиком, в его документации не нашлось (проверялось целенаправленно, не
предполагалось). Установка — два раздельных шага.

**Установка — мастер-слой (always-on `impulse-core`):**

```
cp -r hermes-plugin/impulse-core ~/.hermes/plugins/impulse-core
```

Это не голая копия hooks-машинерии Claude Code — `hermes-plugin/impulse-core/`
это отдельно написанный под Hermes плагин (`plugin.yaml` +
`__init__.py`), который через `pre_llm_call` (единственный хук Hermes,
чей возврат реально попадает в контекст — остальные gateway-хуки чисто
для side-effect'ов вроде логирования) инжектит тот же ruleset, что и
`hooks/impulse-instructions.js`'s `coreRuleset()`, в **user message
каждого хода** — даже надёжнее, чем статичный `GEMINI.md` у Gemini
CLI/Qwen Code, потому что переинжектится каждый раз, а не один раз на
сессию. `scripts/check-sync.js` держит текст этого файла синхронным с
остальными тремя поверхностями (hook, `impulse-core/SKILL.md`,
`GEMINI.md`).

**Установка — скиллы:**

Схема Hermes ждёт `skills/<категория>/<имя-скилла>/SKILL.md` (два
уровня), а у сьюта плоско — `skills/<имя-скилла>/SKILL.md` (один). Кладём
всё под одну категорию `impulse`:

```
mkdir -p ~/.hermes/skills/impulse
cp -r skills/*/ ~/.hermes/skills/impulse/
```

Дополнительные Hermes-специфичные поля frontmatter (`version`, `metadata.
hermes.tags`/`category`) — необязательны для базовой работы (`name` +
`description` у каждого `SKILL.md` уже есть), это опциональное улучшение
для лучшей discoverability через `hermes skills browse`, не сделано
здесь ради контроля объёма изменений.

**Проверка после установки:** `hermes skills list` должен показать все
скиллы сьюта под категорией `impulse`. Проверить, что мастер-слой реально
инжектится — задать агенту прямой вопрос вроде "какие правила impulse-core
сейчас активны" в новой сессии: ответ должен процитировать конкретные
пункты (ladder, verification, token economy), а не общие слова — если
цитирует, `pre_llm_call`-хук сработал.

**Удаление:**

```
rm -rf ~/.hermes/plugins/impulse-core ~/.hermes/skills/impulse
```

**Что не переносится:** то же самое, что у остальных не-Claude-Code
таргетов — hooks Claude Code, statusline, `/impulse-core off` как
durable-команда (это Claude-Code-специфичный конфиг-файл) не работают
как есть. Плюс специфично для Hermes: только core-слой (`impulse-core`)
инжектится always-on — mode-aware `impulse-backend`/`impulse-frontend`
динамика (blitz/hardcore) сюда пока не перенесена, то же ограничение, что
у `GEMINI.md`-адаптера, и по той же причине (см.
`shared/multi-harness-robustness.md`) — Hermes теоретически мог бы пойти
дальше остальных адаптеров благодаря `pre_llm_call`'s per-turn (не
per-session) вызову, но это отдельная, непроверенная здесь работа.

## Кросс-платформенный fallback

Всё выше — нативный путь под конкретную платформу. Это резервный
вариант: пригождается для офлайн-режима без npx, для платформы без
собственной плагин-системы, или когда нужен единый dry-run/uninstall
поверх произвольного набора таргетов сразу. Он кладёт только **контент**
скиллов (SKILL.md + `references/`) — machinery конкретной платформы
(hooks, always-on инъекция ruleset'а, statusline, режимы) fallback не
переносит; за ней — в раздел нужной платформы выше.

**`npx skills`** — открытый установщик агентских скиллов
(vercel-labs/skills): берёт скиллы из GitHub-репо и кладёт в директорию
нужного инструмента, GitHub вместо npm-реестра. Сьют уже в нативном
формате agentskills.io, манифест не нужен, все скиллы подхватываются
автоматически (проверено 2026-07-04: `npx skills add lowcoware/impulse
--list` находит все).

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

Сразу во все — несколько `-a` подряд (или `--all` — все скиллы во все
обнаруженные агенты). По умолчанию ставит в проект; `-g` — глобально,
в пользовательскую директорию. Ещё полезное: `-y` — без вопросов (для
CI), `--list` — показать скиллы и ничего не ставить, `-s <skill>` —
только конкретные (например `-s impulse-backend -s impulse-frontend`).

Куда кладёт: `claude-code` → `.claude/skills/`, `cursor` / `codex` /
`opencode` → `.agents/skills/` на project scope (Cursor и OpenCode читают
и `.claude/skills/`, и `.agents/skills/` нативно — своих отдельных копий
не создают). На user/global scope у `opencode` свой путь:
`~/.config/opencode/skills/`. `gemini-cli` → `.agents/skills/` (проект) /
`~/.gemini/skills/` (`-g`); `qwen-code` → `.qwen/skills/` /
`~/.qwen/skills/`; `goose` → `.goose/skills/` / `~/.config/goose/skills/`
— у Goose это легаси-пути, они читаются, но рекомендованный стандарт
`.agents/skills/`. Пути Antigravity уточняйте на месте — интерфейс
молодой и уже переезжал.

Файлы `shared/*.md` установщик скиллов тоже не кладёт — на них завязаны
кросс-ссылки между скиллами, подробнее в разделе "Общие файлы и
кросс-ссылки между скиллами" ниже.

**Установщик репозитория (`scripts/install.js`)** — нужен офлайн-режим
без npx, точный план копирования заранее (dry-run) или симметричное
удаление `--uninstall`:

```
node scripts/install.js --target=claude|cursor|codex|antigravity|opencode \
  [--scope=project|user] [--project-dir=PATH] [--apply] [--uninstall]
```

По умолчанию (без `--apply`) — **dry-run**: печатает точный план
копирования (источник -> назначение, по одной строке на файл), ничего не
пишет на диск. `--apply` — выполнить; идемпотентен, повторный `--apply`
перезаписывает папки сьюта на месте и не трогает соседние файлы или
другие скиллы/плагины в той же директории. `--uninstall` (вместе с
`--apply`) убирает ровно то, что создал соответствующий install. Полный
список опций — `node scripts/install.js --help`.

Форматы по каждому таргету проверены **2026-07-04** по документации
вендоров — эти интерфейсы меняются быстро; перед установкой на заметно
более новом релизе CLI перепроверьте источник по ссылке в разделе нужной
платформы.

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

Все 23 скилла проходят лимиты frontmatter для Codex/Antigravity/OpenCode
(общая спецификация, инсталлер валидирует одним кодом для всех трёх): у
каждого `name` ≤ 64 символов и точно совпадает с директорией; у каждого
`description` ≤ 1024 символов. Ноль нарушений —
валидатор инсталлера тут это defense-in-depth на случай, если будущий
скилл выйдет за лимит, а не фикс уже сломанного (`scripts/check-skills.js`
и так гейтит эти же два лимита по всему сьюту в CI).

## Матрица совместимости

| | Claude Code | Cursor | Codex | Antigravity | OpenCode | Kilo Code | Gemini CLI | Qwen Code | Goose | Hermes Agent |
|---|---|---|---|---|---|---|---|---|---|---|
| SKILL.md нативно | да (исходный формат) | да | да | да | да | нет данных (экстраполяция от OpenCode-движка, см. раздел Kilo Code) | да | да | да | да, но своя схема (`metadata.hermes`) и вложенность `category/skill-name/`, не плоская |
| Целевая директория этого инсталлера | `.claude/skills/` | `.claude/skills/` (алиас) | `.agents/skills/` | `.agents/skills/` (проект, = codex) / `~/.gemini/config/skills/` (пользователь) | `.agents/skills/` (проект, = codex) / `~/.config/opencode/skills/` (пользователь) | своего таргета нет; ручной фолбэк на `.agents/skills/` (не подтверждено) | своего таргета нет; проект покрывает `--target=codex` | своего таргета нет; `npx skills -a qwen-code` -> `.qwen/skills/` | своего таргета нет; проект покрывает `--target=codex` | своего таргета нет; ручная копия в `~/.hermes/skills/impulse/` (раздел выше) |
| Нативная плагин-система | `/plugin install` (marketplace) | нет | нет | `agy plugin install` (CLI) | нет | нет | `gemini extensions install` | `qwen extensions install` (понимает Claude-плагины и Gemini-расширения) | `goose plugin install` (Open Plugins) | `~/.hermes/plugins/<name>/` (`plugin.yaml`+`register(ctx)`), нет команды на весь репозиторий сразу |
| references/*.md как есть | да | да | да | да | да | да | да | да | да | да |
| `impulse-core` always-on доставка | плагин: hooks (`SessionStart`/`UserPromptSubmit`) | `.mdc` `alwaysApply: true` (основной) + `hooks.json` `sessionStart` (BETA, доп.) | `hooks.json` `UserPromptSubmit` — настоящий per-turn (за флагом `features.hooks`) | статичный `rules/impulse-core.md`, активация Always On через UI вручную | `AGENTS.md` / `opencode.json` `instructions` (безусловно на старте сессии) | `.kilo/rules/` через `kilo.jsonc` `instructions` (на каждый ход, не одноразово) | `GEMINI.md` (`contextFileName`, один раз на сессию) | `GEMINI.md` (тот же механизм, Qwen Code — форк Gemini CLI) | нет (core-слой сюда не доставлен) | `pre_llm_call`-плагин, per-turn (не per-session) |
| Mode-flag `/impulse-*` (blitz/hardcore) + statusline | только плагин | нет | нет | нет | нет | нет | нет | нет | нет | нет |
| Подключение скилла | роутер по description | роутер по description | роутер по description | роутер по description | явный tool call `skill({name})`, агент решает по description | нет данных (вероятно тот же tool-call механизм, что у OpenCode — не подтверждено) | модель вызывает тул `activate_skill` + подтверждение пользователя | роутер по description + явная слэш-команда `/<skill>` | роутер по description | 3-уровневый progressive disclosure: `skills_list()` -> `skill_view(name)` -> `skill_view(name, path)` |
| Нативно читает чужие директории других таргетов | — | `.claude/skills/` | — | — | `.claude/skills/` И `.agents/skills/`, project+user | нет данных | `.agents/skills/` (алиас), project+user | — | `.agents/skills/` И `.claude/skills/` (+ легаси `.goose/skills/`), project+user | не проверялось — нет данных |
