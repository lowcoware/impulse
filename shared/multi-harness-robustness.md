# Multi-harness robustness — delivering impulse-core to weaker models

impulse ships to three CLI harnesses (Claude Code plugin hooks, Gemini
CLI extension, Qwen Code extension — the last two share the same
extension format; Qwen Code is a Gemini CLI fork that defaults to Qwen
models and also runs DeepSeek through its provider config). Claude Code
gets `impulse-core`'s ruleset via `SessionStart`/`SubagentStart` plugin
hooks; Gemini CLI and Qwen Code don't run those hooks the same way, but
both support a `contextFileName` manifest field that always-loads a
markdown file into every session — that's `GEMINI.md` at the repo root,
kept in sync with the hook output by `scripts/check-sync.js`. Sourced
from a dedicated research pass (see citations below); this file records
the findings and the reasoning behind the wording choices in
`hooks/impulse-instructions.js`'s `coreRuleset()` and
`skills/impulse-core/SKILL.md`.

## What the research actually supports

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

## What the research does NOT support (be honest about the gaps)

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

## What changed, concretely

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

## What's deliberately NOT done here

Domain-mode rulesets (`impulse-backend`/`impulse-frontend`, mode-aware)
are not yet mirrored to Gemini CLI/Qwen Code — both harnesses do support
a comparable hook-lifecycle system (`SessionStart` with
`additionalContext`, mirroring Claude Code's own hook), but Qwen Code's
hook support was documented as still incomplete/behind Gemini CLI's as of
this research pass (open feature-parity issues). Wiring dynamic
mode-aware injection there is real, separate work gated on that maturing
— tracked as an `impulse:` marker in `GEMINI.md` rather than attempted
half-built here.
[Gemini CLI hooks reference](https://geminicli.com/docs/hooks/reference/),
[Support Qwen Code CLI hooks](https://github.com/rtk-ai/rtk/issues/1222)
