# Multi-harness robustness — delivering impulse-core to weaker models

**RULE THIS FILE FOLLOWS:** a shorter, affirmative, lower-instruction-count
core ruleset helps every model on the roster at once — Claude included —
so `coreRuleset()` is edited once, not forked per-harness. Everything
below is the evidence for that rule and the delivery mechanics per
harness. Restated as this file's last line too.

impulse ships to nine CLI/IDE harnesses, each with its own injection
mechanism:

1. **Claude Code** — plugin hooks (`SessionStart`/`SubagentStart`) —
   code in `hooks/impulse-instructions.js`. The only harness with true
   per-turn re-injection AND mode-aware (blitz/hardcore) dynamic content —
   every other harness below gets the core layer only, static or
   per-turn, never the domain-mode machinery.
2. **Gemini CLI** — a `contextFileName` manifest field that always-loads
   a markdown file into every session — `GEMINI.md` at the repo root.
3. **Qwen Code** — same mechanism as Gemini CLI, since it's a Gemini CLI
   fork that defaults to Qwen models (and also runs DeepSeek through its
   provider config) — same `GEMINI.md`.
4. **Hermes Agent** — NousResearch's multi-provider agent harness
   (unrelated to the Hermes model fine-tunes beyond sharing an org name).
   Its own hook system (`~/.hermes/hooks/`) is purely observational —
   return values are ignored — so the real injection point is a Hermes
   *plugin* (`~/.hermes/plugins/`, `plugin.yaml` + `register(ctx)`)
   registering a `pre_llm_call` callback, the one hook whose returned
   `{"context": ...}` dict actually lands in that turn's user message.
   `hermes-plugin/impulse-core/` is that plugin — install steps:
   `INSTALL.md` § Hermes Agent.
5. **OpenAI Codex** (CLI + IDE extension, shared config system) — a real
   documented hooks system (`SessionStart`/`UserPromptSubmit`, gated
   behind the `features.hooks` flag), the closest match to Claude Code's
   own per-turn injection outside Claude Code itself.
   `codex-plugin/impulse-core/` (`hooks.json` + `inject-core.js`) — install
   steps: `INSTALL.md` § Codex. Codex's own `AGENTS.md` mechanism is
   separate and stays untouched — the hook is additive, not a replacement.
6. **Cursor** (IDE + CLI, shared rules engine) — primary delivery is a
   static `.mdc` rule with `alwaysApply: true` (`.cursor/rules/`), the
   most reliable mechanism confirmed for this harness; a `hooks.json`
   `sessionStart` hook exists as a secondary, beta reinforcement (Cursor's
   own staff confirmed the CLI doesn't reliably fire a true per-turn hook
   in non-interactive mode, so the static rule stays primary, not the
   hook). `cursor-plugin/` — install steps: `INSTALL.md` § Cursor.
7. **Google Antigravity** (IDE, "Antigravity 2.0" desktop, and CLI —
   three surfaces, one engine) — a static rules file
   (`.agents/rules/`, activation mode set to Always On via the Rules UI
   post-install; the frontmatter field for that mode isn't confirmed by
   documentation, so the file ships with none rather than a guess). A
   real `hooks.json` system is documented but, per an unresolved Aug 2026
   community report, appears to fire only in the CLI surface — not used
   as a delivery mechanism here. `rules/impulse-core.md` (repo root, rides
   along with the existing Antigravity plugin bundle) — install steps:
   `INSTALL.md` § Antigravity.
8. **OpenCode** — no reliable per-turn hook (`experimental.chat.system.
   transform` is reported broken as of this research pass — see
   anomalyco/opencode#17100/#17637/#27401); delivery is the harness's own
   `AGENTS.md`/`opencode.json` `instructions` array, read unconditionally
   at session start. `opencode/IMPULSE-CORE.md` — install steps:
   `INSTALL.md` § OpenCode.
9. **Kilo Code** (VS Code extension + `kilo` CLI, built on the OpenCode
   engine as of its 2026 "v7" rewrite) — same reasoning and same
   broken-hook caveat as OpenCode (they share the underlying chat-hook
   layer); delivery is the static `.kilo/rules/` file referenced from
   `kilo.jsonc`'s `instructions` array. `kilo-plugin/rules/impulse-core.md`
   — install steps: `INSTALL.md` § Kilo Code.

All delivery copies (Claude Code hook output, `GEMINI.md`, and the six
harness-specific files/plugins above) are kept in sync with
`coreRuleset()` by `scripts/check-sync.js` — it failed silent for GEMINI.md
and hermes-plugin once already (a `coreRuleset()` rewrite drifted from both
copies with check-sync still green, because it didn't check them yet), so
every new delivery surface gets a `check-sync.js` entry at the same time
it's created, not as a follow-up.

Sourced from a dedicated research pass (citations below); this file
records the findings and the reasoning behind the wording choices in
`hooks/impulse-instructions.js`'s `coreRuleset()` and
`skills/impulse-core/SKILL.md`.

## What the research actually supports <established-fact>

**Compound negation is a real, measured failure mode — worse on open
models.** Under simple negation ("don't do X"), open-weight models
endorsed the prohibited action ~77% of the time; under compound negation
("don't do X, don't do Y, don't do Z"), ~100%. Commercial models still
swing 19-128% depending on framing. The mechanism is partly "ironic
rebound" — mentioning the forbidden thing raises its output likelihood,
traced to middle-layer attention heads.
[When Prohibitions Become Permissions](https://arxiv.org/html/2601.21433),
[The Pink Elephant Problem](https://eval.16x.engineer/blog/the-pink-elephant-negative-instructions-llms-effectiveness-analysis)

**Instruction-count degradation is real and worse for smaller models.**
Success at satisfying *every* instruction in a prompt decays as
instruction count grows — non-linearly, and the decay curve is steeper
for less capable models under the same instruction load.
[How Many Instructions Can LLMs Follow at Once?](https://arxiv.org/pdf/2507.11538),
[Instruction Stacking Collapse](https://arxiv.org/html/2608.02639)

**DeepSeek-R1 specifically struggles with the system-prompt slot.**
Multiple tool-integration issues report R1 ignoring or degrading under a
system prompt; community guidance is to fold instructions into the first
user turn instead, and API providers document a hard sequencing
constraint (first message after system must be a user message).
[DeepSeek-R1 issue #33](https://github.com/deepseek-ai/DeepSeek-R1/issues/33),
[AWS Bedrock DeepSeek docs](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-deepseek.html)

**Anthropic went the other direction for its own frontier model.** The
Claude Code team removed over 80% of Opus/newer-generation system-prompt
scaffolding with no measurable eval loss — their stated philosophy is
"less scaffolding, more curation" for Claude 5-class models. Structured
JSON output has also been shown to cost accuracy on weaker/mid-tier
models when nothing downstream actually needs to parse it.
[Claude 5 context-engineering analysis](https://www.developersdigest.tech/blog/claude-5-context-engineering-rules-hn-analysis),
[Claude prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

**This is the load-bearing finding for this file's whole approach:**
trimming compound negations into short affirmative imperatives is not a
tradeoff between "good for weak models" and "good for Claude" — both
research threads point the same direction. A shorter, affirmative,
lower-instruction-count core ruleset is the one edit that helps every
model on the roster at once, which is why `coreRuleset()` was rewritten
that way rather than forked per-harness.

**Few-shot examples help FORMAT compliance on weaker models specifically**
(not reasoning quality — that's a mixed/negative result). Qwen2.5-Coder
went from inconsistent tool-call-tag formatting to 100% correct with one
concrete example. This is why the ceiling-marker rule now carries one
worked example (`// impulse: in-memory cache, move to Redis past one
instance.`) instead of just the abstract `<ceiling>, <upgrade trigger>`
placeholder.
[vllm-qwen2.5-coder-tool-parser](https://github.com/hanXen/vllm-qwen2.5-coder-tool-parser)

## What the research does NOT support (be honest about the gaps) <known-gap>

- No controlled study was found isolating rule-ORDER effects (start vs.
  end placement) specifically for system-prompt-style rules — the
  "lost in the middle" literature is about long-document RAG recall, not
  short instruction lists, and at least one study found no consistent
  position-to-compliance relationship for instructions.
- No benchmark directly compares DeepSeek/Qwen vs. Claude on long/nuanced
  system-prompt adherence — the DeepSeek-R1 system-prompt friction is
  well-documented, but Qwen's own claims of "resilience to diverse system
  prompts" are self-reported, not third-party verified.
- No named, validated "tiered instruction" methodology (short mandatory
  core + optional elaboration) was found in the literature for exactly
  this multi-model-portability use case — the design here is a reasoned
  synthesis of the findings above, not a citation of an established
  pattern. Treat it as the current best guess, not settled science.

## What changed, concretely <changelog>

- `coreRuleset()` / `impulse-core/SKILL.md`: the four worst compound-
  negation bullets ("no X, no Y, no Z" chains) rewritten as single
  affirmative imperatives carrying the same constraints. Anchor phrases
  (`scripts/check-sync.js`'s `ANCHORS`) preserved so the rewrite is
  provably equivalent in coverage, not just vibes.
- Ceiling-marker rule: added one concrete worked example.
- `GEMINI.md` + `gemini-extension.json`'s `contextFileName`: the core
  layer now actually reaches Gemini CLI and Qwen Code sessions at all —
  previously the extension manifest carried no context-injection
  mechanism, so DeepSeek/Qwen sessions through these harnesses got
  none of impulse-core's ruleset, full stop. That was a bigger gap than
  any wording choice.

## What's deliberately NOT done here <deferred-todo>

Domain-mode rulesets (`impulse-backend`/`impulse-frontend`, mode-aware) are
not yet mirrored to Gemini CLI/Qwen Code:

1. Both harnesses support a hook-lifecycle system comparable to Claude
   Code's (`SessionStart` with `additionalContext`).
2. Qwen Code's hook support was documented as still incomplete/behind
   Gemini CLI's as of this research pass (open feature-parity issues) —
   so wiring dynamic mode-aware injection there is not safe yet.
3. Action taken: tracked as an `impulse:` marker in `GEMINI.md` instead of
   attempted half-built. Recheck Qwen Code's hook parity before acting on
   this marker.

[Gemini CLI hooks reference](https://geminicli.com/docs/hooks/reference/),
[Support Qwen Code CLI hooks](https://github.com/rtk-ai/rtk/issues/1222)

## To add a new harness or edit `coreRuleset()`

1. Confirm the harness's context-injection mechanism (hook, manifest
   field, or plugin callback) before writing anything — see the harness
   list at the top of this file.
2. Write the injected ruleset as short affirmative imperatives, not
   compound negations (see "What the research actually supports").
3. Preserve every anchor phrase listed in `scripts/check-sync.js`'s
   `ANCHORS` array when editing `coreRuleset()` — the rewrite must stay
   provably equivalent in coverage, not just similar in tone.
4. Run `scripts/check-sync.js` and confirm all delivery copies (Claude
   Code hook output, `GEMINI.md`, Hermes plugin) still match.
5. Add one worked example for any new rule a weak model will need to
   format correctly (the Qwen2.5-Coder few-shot finding above).

Restated: a shorter, affirmative, lower-instruction-count core ruleset
helps every model on the roster at once, including Claude — that is why
`coreRuleset()` is edited once here, never forked per-harness.
