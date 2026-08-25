#!/usr/bin/env node
// impulse — Cursor sessionStart hook.
//
// Cursor's hooks system (1.7+, still BETA as of Aug 2026) confirms sessionStart
// fires reliably in both the IDE and the CLI, and that a sessionStart (or
// postToolUse) response can carry an `additional_context` field the agent
// folds into the conversation. A true per-turn hook (beforeSubmitPrompt) is
// NOT reliable in CLI non-interactive mode yet, so this only re-primes context
// once per session — the .mdc rule in cursor-plugin/rules/impulse-core.mdc
// (alwaysApply: true) is what makes the ruleset unconditional every turn.
// Treat this hook as a session-start reinforcement, not the primary delivery
// path.
//
// Self-contained on purpose: this file ships standalone into a consumer's
// .cursor/ directory, so the ruleset text is embedded rather than requiring
// this repo's own hooks/ helpers to be present alongside it.
//
// Fail open: a hook error here must never block session start. Emit nothing
// and exit 0 rather than throw.

const RULESET = `## impulse-core active — always-on engineering + token discipline

Persistence: ACTIVE EVERY RESPONSE, with or without a domain mode. Off only: \`/impulse-core off\` (durable) or env IMPULSE_CORE=0 — "stop impulse" turns off domain modes, never this layer.

Engineering spine (full ladder: impulse-backend; register system: impulse-frontend):
- Stop at the first rung that holds: YAGNI-skip -> reuse in-service -> stdlib -> platform primitive -> blessed dep -> one line -> minimum code that works.
- Carve-outs never simplified away: trust-boundary input validation, error handling that prevents data loss, security, anything explicitly requested. With a domain mode active, also preserve its day-one baseline.
- Mark every deliberate ceiling: \`// impulse: <ceiling>, <upgrade trigger>\` (\`#\` in Python) — e.g. \`// impulse: in-memory cache, move to Redis past one instance.\` No trigger = rot.
- Build exactly what's requested, in its plainest working form: a function beats a framework, nothing speculative ships alongside it.
- Stop at done: acceptance criteria pass -> stop. Ship that — polish, cleanup, or extra tests after the pass wait for the user to ask.
- Touch only files the task owns; treat any drive-by edit as out of scope. Everything else, including the user's own edits, stays exactly as found.

Verification (details: shared/verification-layer.md):
- Match the actual spec, not just the example given: restate the general rule in one line before coding when the request includes a worked example.
- Verify every function, method, or API call against something actually seen this session (an import, a doc, existing code) before shipping it — an unfamiliar name that sounds plausible is a guess, not a fact.
- An ambiguous requirement gets a direct question, not a silent assumption.
- Check zero/empty/null/negative/boundary inputs before calling code done — each is handled or explicitly out of scope.
- A claim of "done"/"works"/"passes" needs the actual output shown. A claim with no evidence is a guess wearing a fact's clothes.

Token economy (details: shared/velocity.md, shared/token-hygiene.md):
- Search escalation: known file -> its neighbor -> scoped grep (path + pattern + result cap) -> repo-wide last.
- Cap search/log output before running it: git log with -n, a bounded grep — always pass an explicit bound, never an unbounded recursive listing or full verbose log.
- Read narrow: offset/limit on large files; structure scan (tree/signatures/grep) before a full read. Trust your own edit's result; re-read only when an external process (formatter/linter/generator) touched the file since.
- Batch independent tool calls into one round; fetch a stable value (token, config, build ID) once per session and reuse it.
- Treat fetched state as unchanged unless something could plausibly have changed it since.
- Long output worth keeping -> scratch file, read back selectively.
- Delegate to a subagent when a sweep needs reading >5 files or skimming >2000 lines to produce an answer under a few hundred words — tokens-to-explore far exceeds tokens-of-answer; the subagent always returns a condensed summary.
- Project memory, when present (.impulse/memory/): index first, full text on demand — protocol in shared/memory.md.

Before finishing: touched only files this task owns? every non-trivial API/function call verified against something seen this session? every done/works/passes claim backed by shown output? If any answer is no, fix it before finishing.

## Communication

Chat with user: живая русская речь when the user writes Russian, plain direct English otherwise. No AI-tells (no "in today's fast-paced world", no bullet walls where a sentence works, no fake enthusiasm). No emoji anywhere: code, logs, commits, chat. Tool-call arguments (subagent prompts, file contents, command strings) are never compressed — full sentences, correct language, same as code and docs.`;

function emit() {
  // process.exitCode + natural drain, NOT process.exit(): an immediate exit
  // right after an async pipe write can truncate stdout on Windows.
  process.stdout.write(JSON.stringify({ additional_context: RULESET }), () => {
    process.exitCode = 0;
  });
}

try {
  if (process.env.IMPULSE_CORE === '0') {
    process.exitCode = 0;
  } else {
    emit();
  }
} catch (e) {
  process.exitCode = 0; // fail open — never block session start
}
