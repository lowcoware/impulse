#!/usr/bin/env node
// impulse — Claude Code SubagentStart hook.
//
// SessionStart context is parent-thread only and never reaches Task-spawned
// subagents, so without this every subagent runs impulse-unaware. When impulse is
// active, re-inject the same compact ruleset here.
//
// Optional scoping: set IMPULSE_SUBAGENT_MATCHER to a regex and only subagents
// whose agent_type matches get the ruleset (unanchored, case-insensitive) —
// e.g. IMPULSE_SUBAGENT_MATCHER='builder|reviewer' keeps it out of unrelated
// search agents. Unset = inject into every subagent, the default.
//
// Fail open everywhere: a bad regex, unreadable stdin, or a missing
// agent_type injects rather than skips. Silently dropping the ruleset would
// look like impulse is off, which is the worse failure.

let flag;
let getImpulseInstructions;
let emit;
try {
  // Require inside the try: a broken install must be a silent no-op, not a stack dump.
  const config = require('./impulse-config');
  flag = config.readFlag();
  if (!flag) process.exit(0); // impulse off — inject nothing
  emit = config.emit;
  ({ getImpulseInstructions } = require('./impulse-instructions'));
} catch (e) {
  process.exit(0); // silent fail — never block subagent start
}

function inject() {
  try {
    emit('SubagentStart', getImpulseInstructions(flag));
  } catch (e) {
    // Silent fail — never block subagent start
  }
}

const matcherSource = process.env.IMPULSE_SUBAGENT_MATCHER;
if (!matcherSource) {
  // No scoping configured: inject without touching stdin, so the default
  // path stays as fast as it was before scoping existed.
  inject();
  process.exit(0);
}

let matcher;
try {
  matcher = new RegExp(matcherSource, 'i');
} catch (e) {
  inject(); // unparseable regex is a user typo, not a reason to go silent
  process.exit(0);
}

let input = '';
let done = false;

function finish() {
  if (done) return;
  done = true;
  let agentType = '';
  try {
    agentType = String(JSON.parse(input).agent_type || '');
  } catch (e) {
    inject(); // no readable agent_type — cannot scope, so inject
    return;
  }
  if (!agentType || matcher.test(agentType)) inject();
}

process.stdin.setEncoding('utf8'); // multibyte chars must not split across chunks
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', finish);
process.stdin.on('error', () => { finish(); process.exit(0); });

// Never hang a subagent launch — a swallowed stdin pipe must not freeze it.
// unref() keeps the timer off the normal, fast path.
setTimeout(() => { finish(); process.exit(0); }, 1000).unref();
