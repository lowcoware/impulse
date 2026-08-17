**Русский** · [English](README.en.md)

# impulse

Мой скилл-сьют для Claude Code против оверинжиниринга: скиллы на бэкенд
(микросервисы на Go, Python/Rust — там, где они реально оправданы, Node.js —
для сквозного TypeScript), фронтенд
(Vue 3 / Nuxt 4), ревью диффов, технический долг, очеловеченный текст,
документацию, управление проектом, легаси-код, AI/RAG-инфраструктуру,
безопасность, devops, мобильную разработку, брейнштормы, систематический
дебаг и аудит зависимостей. Не фреймворк — лестница против спекулятивной
сложности: неотменяемый бейзлайн первого дня, маркеры-потолки `impulse:`
вместо кода "на будущее", ревью диффа в одну строку. Нативен для Claude
Code, через инсталлер переносится в Cursor, Codex и Antigravity CLI.

## Установка

Основной способ зависит от инструмента: у Claude Code и Antigravity — их
плагин-система, у Cursor и Codex — `npx skills` (открытый установщик
агентских скиллов vercel-labs/skills).

| CLI | Установка (основной способ) | Подробности |
|---|---|---|
| Claude Code | плагин: `/plugin marketplace add lowcoware/impulse`, затем `/plugin install impulse@impulse` (даёт hooks, statusline, режимы) | `INSTALL.md` |
| Cursor | `npx skills add lowcoware/impulse -a cursor` | `INSTALL.md` |
| Codex | `npx skills add lowcoware/impulse -a codex` | `INSTALL.md` |
| Antigravity | плагин: `agy plugin install lowcoware/impulse` | `INSTALL.md` |
| OpenCode | `npx skills add lowcoware/impulse -a opencode` (или уже видит установку Claude Code/Codex) | `INSTALL.md` |
| Gemini CLI | расширение: `gemini extensions install https://github.com/lowcoware/impulse` | `INSTALL.md` |
| Qwen Code | расширение: `qwen extensions install https://github.com/lowcoware/impulse` | `INSTALL.md` |
| Goose | плагин: `goose plugin install https://github.com/lowcoware/impulse` (или уже видит установку Claude Code/Codex) | `INSTALL.md` |

`npx skills` работает и для Claude Code / Antigravity, но кладёт голый
уровень скиллов без плагин-обвязки. Альтернатива без npx — репозиторный
установщик, `node scripts/install.js --help`.

Hooks, statusline-бейдж и команды активации `/impulse-*` — только для Claude
Code: остальные CLI (и голая копия) подхватывают то же содержимое
скиллов по description. Что именно переносится на каждый таргет, а что
нет — в `INSTALL.md`.

## Быстрый старт (Claude Code)

1. `/plugin marketplace add lowcoware/impulse`, затем `/plugin install impulse@impulse`.
2. Перезапустите сессию.
3. `/impulse-help`.

## Скиллы

Все скиллы и как их позвать. Команды `/impulse-*` — это Claude Code; на
других CLI те же скиллы подхватываются по description. Живая справка одним
экраном — `/impulse-help`.

| Скилл | Команда | Для чего |
|---|---|---|
| impulse | `/impulse` | Универсальный роутер: опиши ситуацию — подскажет, какой impulse-скилл подключить, разведёт пересекающиеся пары |
| impulse-core | всегда включён (`/impulse-core on\|off`) | Мастер-слой: инженерный стержень + экономия токенов, хуки инжектят его в каждую сессию и каждого сабагента |
| impulse-backend | `/impulse-backend [mode]` | Бэкенды микросервисов с нуля, Go/Python/Rust/Node: лестница, бейзлайн первого дня, маркеры-потолки |
| impulse-frontend | `/impulse-frontend [mode]` | Vue 3 / Nuxt 4 / Tailwind v4: разделение регистров, баны AI-tells, канон GSAP/Lenis, протокол DESIGN.md |
| impulse-review | `/impulse-review` | Ревью диффа: оверинжиниринг, бейзлайн, seams, AI-типичные баги, гниль архитектуры, AI-tells — одна строка на находку |
| impulse-debt | `/impulse-debt` | Собирает маркеры `impulse:` в реестр, помечает гниль |
| impulse-humanizer | `/impulse-humanize` | Пишет и переписывает текст в откалиброванном голосе пользователя, вычищает письменные AI-tells (и автоматом при генерации доков) |
| impulse-md-generator | `/impulse-md` | Оформляет доки под Obsidian Flavored Markdown — properties, wikilinks, callouts, без плагинов |
| impulse-artifact | `/impulse-artifact` | Генератор самодостаточных HTML-артефактов: отчёт/план/диаграмма одним файлом, обязательный dark mode |
| impulse-wiki | `/impulse-wiki` | Ведёт вики проекта в Obsidian: структура, MOC, здоровье вольта, Canvas-диаграммы, Bases-вьюхи, CLI |
| impulse-project-management | `/impulse-pm` | Spec-driven workflow, жизненный цикл ADR, масштабирование ревью, механические плейбуки |
| impulse-legacy | `/impulse-legacy` | Существующий/незнакомый код: characterization-тесты, seams, blast-radius, Strangler Fig, read-before-write для агента |
| impulse-ai | `/impulse-ai` | RAG/эмбеддинги/Qdrant, LLM gateway, дизайн и безопасность MCP, конвенции сабагентов Claude Code |
| impulse-security | `/impulse-security` | JWT/HMAC-аутентификация, секреты, IDOR/authz, многослойный rate limiting, CORS, hardening edge на Traefik |
| impulse-devops | `/impulse-devops` | Compose по окружениям, multi-stage Dockerfile, GH Actions (ловушка pull_request_target), Traefik ACME/TLS, blue-green на одном VPS |
| impulse-mobile | `/impulse-mobile` | Flutter/React Native/нативка: выбор платформы, мобильный бейзлайн первого дня, каталог dispose/leak, секреты в бинаре |
| impulse-brainstorm | `/impulse-brainstorm` | Трудно-обратимое решение: 3 реальных подхода, оценка по названным ограничениям, рекомендация + trip-wire → ADR |
| impulse-systematic-debug | `/impulse-debug` | Охота на баг по дисциплине: воспроизвести → bisect → лог гипотез → минимальный фикс → регрессионный тест |
| impulse-dependency-audit | `/impulse-audit` | Проверка зависимости на CVE/тайпсквоттинг/protestware/install-hooks; дисциплина lockfile+pin |
| impulse-shrink | `/impulse-shrink` | Аудит оверинжиниринга по всему репо (не дифф): что удалить/заменить stdlib'ом, ранжировано по размеру выигрыша |
| impulse-clone | `/impulse-clone` | Клонирование сайта как дисциплина: recon-first, грейды сложности L1-L6, Playwright-скрипты harvest/mirror/diff, fidelity-аудит |
| impulse-goal | `/impulse-goal` | Движок исполнения: после PM-фазы гонит план по фазам под одним `/goal` — verify, 3-strike recovery, финальный аудит против плана |
| impulse-help | `/impulse-help` | Справка одним экраном: скиллы, режимы, конфиг |

## Режимы

Режим (`blitz|medium|hardcore`) — это переключатель скорости и строгости,
он есть только у backend и frontend. Остальные скиллы из таблицы выше
просто запускаются своей командой, без режима. blitz — быстро и по делу;
medium — полный набор правил (по умолчанию); hardcore — сначала
архитектура: границы, контракты, режимы отказа каждого seam до кода.

Включить: `/impulse-backend [blitz|medium|hardcore]`, `/impulse-frontend [blitz|medium|hardcore]`.
Выключить: `stop impulse` (или `normal mode`) — это гасит только доменные
режимы; всегда-включённый слой impulse-core остаётся (`/impulse-core off`
или `IMPULSE_CORE=0`, если нужно выключить и его). Конфиг —
`~/.config/impulse/config.json` (`defaultMode`, `docstringLang`,
`coverageTarget`, `core`); полная справка — `/impulse-help`.

## Использование в разных CLI

Как позвать скиллы, зависит от инструмента: в Claude Code (плагин) —
слэш-команды `/impulse-*` плюс режимы, hooks и statusline; в Cursor / Codex /
Antigravity и в голой копии Claude Code те же скиллы подключаются по
description, а режим называешь словами в промпте. Полный гайд по каждому
инструменту — `USAGE.md`, установка по каждому — `INSTALL.md`.

| CLI | Как звать | Команды / режимы |
|---|---|---|
| Claude Code (плагин) | `/impulse-*` или описанием задачи | команды, режимы, hooks, statusline |
| Claude Code (копия) | описанием задачи | нет — режим словами |
| Cursor | описанием задачи | нет — режим словами |
| Codex | описанием задачи (+ `AGENTS.md`) | нет — режим словами |
| Antigravity | описанием задачи (+ rules) | нет — режим словами |

## Линтеры

`node scripts/check-skills.js && node scripts/check-sync.js && node scripts/impulse-debt.js`
— схема frontmatter, лимиты размера, целостность кросс-ссылок и дрейф
компактных наборов правил. Те же три проверки гейтят CI
(`.github/workflows/lint.yml`) на каждый push и PR.

## Скиллы-компаньоны

impulse отвечает за инженерию под анти-оверинжиниринг. Рядом стоит поставить
вот это — каждое владеет тем, что impulse намеренно не дублирует:

- **caveman** — [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman).
  Режим сжатого общения: агент роняет воду и отвечает плотно, код, команды и
  ошибки остаются байт-в-байт. impulse берёт из него стиль сжатия мышления, но
  сам режим общения живёт в caveman — ставь для экономии токенов на каждом
  ответе.
- **claude-bughunter** — [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter).
  Наступательная безопасность: bug bounty и внешний ред-тим, 48 hunt-скиллов
  по разобранным disclosed-репортам плюс матрицы атак на M365/Okta/vCenter.
  impulse-security и impulse-dependency-audit закрывают ЗАЩИТНУЮ, build-time
  сторону; bughunter — наступательную. Ставь, когда работа — авторизованный
  пентест или bug bounty, а не разработка.
- **agent-reach** — [Panniantong/Agent-Reach](https://github.com/Panniantong/Agent-Reach).
  Доступ агента в интернет: роутер на 15 платформ (Twitter, Reddit, YouTube,
  小红书, B站, LinkedIn и др.), мультибэкенд, cookie-based доступ, транскрипция
  видео. impulse — про инженерию кода, не про сбор контента из сети; ставь, когда
  агенту нужно исследовать/читать интернет, а не писать код.
- **i-have-adhd** — [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd).
  Формат вывода под ADHD-читателя: действие первой строкой, нумерованные шаги,
  состояние проговаривается каждый ход, конкретные time-estimate, бан преамбул
  и «Hope this helps». Тот же класс, что caveman — накладка на стиль ответа, не
  инженерия; impulse утащил из него debug-spiral триггер (impulse-systematic-debug) и
  pre-send checklist (shared/communication.md), но сам режим целиком — сюда.
- **obsidian-mind** — [breferrari/obsidian-mind](https://github.com/breferrari/obsidian-mind).
  Целый Obsidian-волт как долговременная память агента: lifecycle-хуки
  (инжект контекста на SessionStart, классификация каждого сообщения, валидация
  frontmatter/wikilink в момент записи), девять сабагентов под тяжёлые операции
  с волтом и graph-first дисциплина заметок. Внутри вендорится
  [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)
  (obsidian-markdown, obsidian-bases, json-canvas, obsidian-cli, defuddle) плюс
  свои mermaid/excalidraw/qmd; ставится через
  [shardmind](https://github.com/breferrari/shardmind). impulse-wiki и
  impulse-md-generator владеют дисциплиной проектной вики и Obsidian-ФОРМАТОМ
  генерируемых доков; obsidian-mind владеет СИСТЕМОЙ личного волта вокруг них —
  ставь, когда волт это память, а не просто формат вывода.
- **GitLab MCP** — [zereight/gitlab-mcp](https://github.com/zereight/gitlab-mcp)
  (`@zereight/mcp-gitlab` на npm). Не скилл, MCP-сервер: даёт агенту прямые
  вызовы над GitLab API (issues, MR, пайплайны, файлы репо) вместо
  ручных `curl`/`glab`. Установка и границы: `shared/gitlab-mcp.md`.
  Ставь, когда проект на GitLab и работа многократно трогает MR/issues/
  пайплайны за сессию — разовый `git push` в этом не нуждался.

- **cavemem** — [JuliusBrussee/cavemem](https://github.com/JuliusBrussee/cavemem).
  Полноценная кросс-агентная память: SQLite + FTS5, MCP-сервер с
  progressive-disclosure чтением (search/timeline/get_observations), фоновый
  индексирующий воркер. impulse взял из него форму (тир-индекс, redact-
  before-write, cheap-index-then-full-read) в лёгкий файловый протокол —
  `shared/memory.md`, без БД и демона. Ставь cavemem, когда нужен реальный
  полнотекстовый/семантический поиск по истории; `shared/memory.md` — когда
  достаточно дисциплины поверх Read/Write.

## Ещё

- Как пользоваться в Claude Code / Cursor / Codex / Antigravity — `USAGE.md`
- Установка по каждому CLI — `INSTALL.md`
- Как добавить скилл или прислать фикс — `CONTRIBUTING.md`
- Как сообщить об уязвимости — `SECURITY.md`
- История изменений — `CHANGELOG.md`

## Lineage

Таблица атрибуции источников — юридический документ, строки ниже
воспроизведены без изменений.

| Source | Taken |
|---|---|
| ponytail | anti-overengineering ladder, ceiling-marker debt convention, one-line review format, never-block hook pattern |
| taste-skill | AI-tells catalog, GSAP/ScrollTrigger/Lenis motion canon, mechanical preflight |
| kepano/obsidian-skills (MIT, Steph Ango) | impulse-wiki's Canvas + Bases + CLI vault-operation references |
| tpitsunov/obsidian-skills (MIT) | impulse-wiki's vault-health scripts (orphan/broken-link/stats/ToC), MOC builder, capture/glossary/tagging/atomization workflows |
| adriangrant/Obsidian-SKILLS (MIT) | impulse-wiki's CLI environment footguns (Linux sandbox, Snap) |
| ayghri/i-have-adhd (MIT) | impulse-systematic-debug's debug-spiral trigger, shared/communication.md's pre-send checklist |
| plannotator/effective-html (MIT) | impulse-artifact genre split (general/plan/diagram), dark-mode pattern, SVG pan/zoom technique |
| Anthropic html-effectiveness sample gallery (Apache-2.0) | impulse-artifact's vendored 21-file example gallery (`examples/`) + the shared token/component palette extracted from it (`palette.md`) |
| impeccable | brand/product register split, 8-state components, harden checklist |
| humanizer | impulse-humanizer skill — 3-layer AI-tell model, forked and recalibrated to one specific user voice |
| caveman (installed plugin) | thinking-compression style, manifest/hooks wiring ground truth |
| awesome-design-md | per-project DESIGN.md protocol, Linear dark surface-ladder reference |
| designer-skills | terse-checklist file format |
| kepano/obsidian-skills (MIT, Steph Ango) | impulse-md-generator's core Obsidian syntax reference (wikilinks, properties, callouts, embeds) |
| React Native docs (MIT) / Expo docs (MIT) / pmndrs/zustand (MIT) | impulse-mobile `react-native.md` — New Arch mandate, FlatList perf rules, Expo Router default, listener-leak pattern |
| Flutter docs (CC BY 4.0) / riverpod.dev (underlying repo MIT) / Android Developers docs (Apache-2.0) | impulse-mobile `flutter.md` + `native.md` — Riverpod/const-rebuild, context.mounted bug, dispose discipline, Compose/StateFlow |
| obra/superpowers (MIT, Jesse Vincent) | `shared/subagents.md` — dispatch artifacts: role-prompt templates as files, brief/review-package builder scripts, required-model field, escalation permission with named triggers, resume-and-append fix-report cycle |
| melihmucuk/pi-crew (MIT) | `shared/subagents.md` — goal/context/instructions dispatch object, per-role model/effort/tool declaration |
| AlexWortega/ai-peer-review-skill (MIT) | `shared/subagents.md` — redundant panel with opaque labels, reserved hostile-critic slot, concern × worker agreement matrix |
| rokoss21/swarm-iosm (MIT) | `shared/subagents.md` — declared touch-sets as the shared-working-tree fallback for separability |
| dart.dev linter-rules (CC BY 4.0 docs) / Solido/awesome-flutter (CC0-1.0) | impulse-mobile `flutter.md` — `use_build_context_synchronously` linter citation, curated Flutter package/pattern reference |
| PatrickJS/awesome-cursorrules (CC0) / HackTricks (CC BY-NC 4.0) | impulse-mobile cross-cutting — cursor-rule mobile patterns, WebView/deep-link attack surface (patterns re-expressed, no verbatim) |
| open-source skill corpus (anthropics/skills — mixed: Apache-2.0 skills + source-available components, mechanisms re-expressed, no files copied; obra/superpowers, wshobson/agents — MIT) | mechanisms harvested, not files copied: RED-phase test authoring, redacted-handoff adversarial review, numeric escalation gates, structured find→verify review shape; second pass: form-to-failure authoring rule, claim→evidence table, 3-failed-fixes→architecture gate, durable orchestration (state-on-disk, status vocabulary, batch dispatch), spec self-review + pre-mortem, YAGNI-pushback, PG identity/NOT VALID/FK-index rules, GH Actions script-injection env-indirection, Reader Test, MCP annotation defaults + DNS-rebinding |
| davila7/claude-code-templates (MIT) | hook-enforced read-only auditor pattern, dated-refreshable threat-intel convention, GH Actions env-indirection corroboration |
| addyosmani/agent-skills (MIT) | perf metric-honesty rule (static = "potential", measured = cited), font/INP/bfcache perf-catalog entries |
| agentskills/agentskills spec (CC BY 4.0) | normative frontmatter schema behind scripts/check-skills.js (name/dir match, 64/1024 caps, allowed keys) |
| ibelick/ui-skills (ui-skills.com) | motion-performance ladder re-expressed: blur ≤8px one-shot, ≤200ms interaction feedback, no scroll polling, standing-will-change ban, paste-block ban |
| mattpocock/skills (MIT) | seam-counting + deletion test, 3-condition lean ADRs, tight-loop debug gate + DEBUG-tag, standards-vs-spec review axes, throwaway-prototype settle, grounding ledger + format arguments, opposing-constraint divergence, fog-vs-ticket, GLOSSARY authoring axioms (no-op test, completion criteria, leading words, load accounting) |
| deep second pass (anthropics eval harness, obra tests/, wshobson plugin-eval + SLO skill, davila7 hooks) | shared/evals.md protocol (paired evals, trigger holdout, pressure tests), interview mechanics (confidence opener, want-vs-should-want, stop test), SLO burn-rate alerting (14.4x/6x), WCAG 2.2 target size, interpreter-unwrap hook bypass class, TG token regex + callback_data 64B, hook-as-gate examples |
| SPEC-14 research corpus — 66 verified sources | citations folded into the ladder, baseline, and stack refs |
| alibaba/open-code-review (Apache-2.0) | impulse-review's ai-bug-patterns-be.md Python general-correctness section (mutable defaults, bare except, is-vs-==, lazy logging, eval/pickle/yaml.load) |
| openai/skills (Apache-2.0) | impulse-backend's security-checklist.md (Go net/http + FastAPI hardening rules), impulse-ai's mcp-server.md pagination/response-format conventions |
| trailofbits/skills (CC BY-SA 4.0, mechanisms re-expressed, no text copied) | impulse-review's api-misuse-resistance.md (sharp-edges pit-of-success doctrine) + differential-review adaptive-depth framing in SKILL.md, impulse-backend's testing.md property catalog + deps.md modern-python tooling table, impulse-dependency-audit's supply-chain.md dependency-health-risk section |
| qdrant/skills (Apache-2.0) | impulse-ai's qdrant.md multitenancy + memory-optimization + embedding-model-migration sections |
| JuliusBrussee/cavemem (MIT) | `shared/memory.md`'s tiered (index/session/notes) memory shape, write-before-read redaction rule, progressive index→detail read order |
| tsilly07/ironclad-v3 (MIT) | `shared/memory.md`'s 50-line index cap and append-only session log; `playbooks.md`'s ship-gate evidence-table playbook |
| sharenq/skill-architect (no LICENSE file — mechanism re-expressed, no text copied) | `authoring.md`'s filler-file ban, gating-language phrase bank |
| alexgreensh/token-optimizer (custom license — mechanism re-expressed, no text copied) | `token-hygiene.md`'s named anti-pattern format (N-Skill Trap, Rule-File Novel, Unscoped Rule) |
| HKUDS/CLI-Anything (Apache-2.0) | `token-hygiene.md`'s cheap-default/expensive-opt-in convention |
| vibeeval/vibecosystem (MIT) | `shared/subagents.md`'s no-raw-transcript rule and structure-before-content read ordering |
| edxeth/superlight-context7-skill (MIT) | `shared/context7.md`'s REST-transport alternative section |
| MichaelYochpaz/agent-skills (MIT) | `authoring.md`'s reference-link load-condition annotation convention |
| Vix0007/vixero-skills (MIT) | `authoring.md`'s self-audit-before-shipping convention |
| ashritkvs/prompt-compression-agent (no LICENSE file — mechanism re-expressed, no text copied) | `token-hygiene.md`'s compress-then-verify checklist gate |
| majiayu000/claude-skill-registry-data (archive — individual skill entries carry their own terms, mechanism re-expressed) | `token-hygiene.md`'s never-load-raw-bulk-data rule |
| chrdrk/claude-focus (MIT) | `memory.md`'s native-`MEMORY.md` platform-cap citation (200 lines/25KB), orphan-link check |
| indulgeback/claude-code-memory-skill (MIT) | `memory.md`'s recall-discipline step (verify a Tier 3 fact against current repo state before acting on it) |
| FavorPan/hermes-skill-cleaner (MIT) | `scripts/check-token-hygiene.js`'s Jaccard word-overlap duplication check, byte/4 token-estimate formula, description-bloat watch mark |
| SOtham/claude-config (no LICENSE file — mechanism re-expressed, no text copied) | `velocity.md`'s search-escalation ladder, re-read/path-spelling waste patterns, session-hygiene batch/no-repoll rules, prompt-cache TTL + 54/36/10% cost-share breakdown; `subagents.md`'s delegate-when-explore-much-greater-than-answer test |
| JoaoPires3642/ai-agent-kit (no LICENSE file — mechanism re-expressed, no text copied) | `memory.md`'s Tier 2 session-log fixed-field entry shape (Goal/State/Decisions/Files/Validation/Risks/Next) |
| redis/agent-skills (MIT, Redis Inc.) | impulse-backend's new stores-redis.md |
| s3onghyun/otelcol-doctor (Apache-2.0) | impulse-backend's new otel-collector.md |
| zuoyebang/aiweave (Apache-2.0) | impulse-backend's hardening-go.md worker-pool-sizing section (Little's Law, pool invariants) |
| phuryn/pm-skills (MIT) | impulse-review's boundary-crossing-mismatch filter in the Intent reconstruction section |
| yetone/kill-ai-slop (Apache-2.0) | impulse-frontend's preflight.mjs scanner + rules.ru.mjs (RU slop lexicon) + scanner tests, ai-tells bans 30-35, motion transition-all/hover-scale bans, tokens spacing-by-relationship, typography display rule, ai-bug-patterns-fe corner-geometry entries, FP table + `impulse-ok` escape hatch, redesign de-slop ordering |
| emilkowalski/skills (MIT) | impulse-frontend's motion-craft.md (4-question gate, easing/duration/spring catalog, gesture formulas, review protocol), motion tag expansion, settled-decisions principle, data-not-instructions convention (impulse-review/impulse-shrink/impulse-legacy), motion glossary in vocabulary.md, Sonner toast principles in components.md, tracking-by-size in typography.md, write-executor-plan + reconcile-plans playbooks in impulse-pm |
| nexu-io/open-design (Apache-2.0) | impulse-frontend's template-catalog.md (115 shapes) + brand-systems-catalog.md (153 brand packages), vendored in full under design-templates/ + design-systems/, ux-laws.md (29 laws) + rtl-i18n-ui.md (21 rules), gsap-api.md (385-line API reference), interface-audit.md (48 Vercel WIG rules), design-contract.md, forms/components/tokens/typography/motion-craft deltas incl. WCAG large-text threshold fix, impulse-clone (18th skill: recon-first, L1-L6 grades, 12 Playwright scripts, ethics boundaries), export bugs in ai-bug-patterns-fe, humanizer lint mode, prompt-templates pointer, resolve-pr-feedback + research-synthesis PM playbooks |
| robzilla1738/supergoal (MIT) | impulse-goal (19th skill) — autonomous execution engine: SKILL.md router, workflow.md (stages 0-7), execution.md (loop/audit/recovery), planning-depth/phase-design/goal-format/repo-state-comparison, 4 templates, 6 scripts; renamed SUPERGOAL_→IMPULSEGOAL_, /supergoal→/impulse-goal |

## Лицензия

MIT — см. `LICENSE`. `LICENSE` также перечисляет сторонние источники из
таблицы Lineage выше, по классам лицензий.
