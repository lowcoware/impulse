#!/usr/bin/env node
// impulse — compact injected rulesets (SessionStart / SubagentStart payload).
//
// Hardcoded on purpose: decoupled from skill-file presence/formatting so the
// never-block contract holds even if skills/ is missing or malformed. This is
// the single source of truth for INJECTED rules — skills/impulse-backend/SKILL.md
// and skills/impulse-frontend/SKILL.md are the single source of truth for the
// FULL rules the model reads on demand. Keep the two in sync manually;
// scripts/check-sync.js verifies a small set of anchor phrases exist in both.

const MODES = ['blitz', 'medium', 'hardcore'];

const BACKEND_MODE_BLOCK = {
  blitz: 'Mode blitz: fastest correct attempt, first try. No plan prose, no alternatives discussion, no ceremony. Baseline + carve-outs + tests still mandatory.',
  medium: 'Mode medium: full ruleset as written, no shortcuts beyond the ladder.',
  hardcore: 'Mode hardcore: before code, enumerate service boundaries, contracts, and failure modes of every seam (idempotency, ordering, backpressure, partial failure), plus data ownership. Think long, then implement. Still zero ceremony docs — analysis lives in thinking + short chat summary.',
};

const FRONTEND_MODE_BLOCK = {
  blitz: 'Mode blitz: clean static, minimal motion, ship.',
  medium: 'Mode medium: register defaults apply as written.',
  hardcore: 'Mode hardcore: full choreography (brand) / full harden pass (product) — exercise 0/1/1000 items, long strings, emoji input, RTL, 400-500 API errors, offline, +40% German text expansion.',
};

function backendRuleset(mode) {
  const m = MODES.includes(mode) ? mode : 'medium';
  return [
    '## impulse-backend active — mode: ' + m,
    '',
    'Persistence: ACTIVE EVERY RESPONSE. No drift back to over-building. Off only: "stop impulse" / "normal mode".',
    '',
    'Ladder — stop at the first rung that holds:',
    '1. YAGNI-skip — unless baseline or carve-out.',
    '2. Reuse within this service. Cross-service reuse = contracts/schemas only, never internals.',
    '3. Stdlib.',
    '4. Platform primitive (Postgres constraint, Redis primitive, Traefik middleware, Kafka semantics).',
    '5. Blessed dep — new dep outside the list needs a one-line justification.',
    '6. One line.',
    '7. Minimum code that works.',
    '',
    'Carve-outs — never simplified away: trust-boundary input validation, error handling that prevents data loss, security, the day-one baseline, anything explicitly requested.',
    '',
    'Day-one baseline — every service ships with: /health/live + /health/ready, graceful SIGTERM shutdown (drain in-flight, close consumers/pools), structured JSON logs with correlation_id/trace_id, /metrics, versioned migrations from #1, config validation at boot (invalid config = refuse to start), timeout on every network call, idempotent Kafka consumers (dedup by event_id), .env.example + multi-stage non-root Dockerfile, retries with exp backoff+jitter on idempotent ops only, outbox+DLQ when events cross a service boundary with money/state at stake (else a `impulse:` marker), backups automated + restore-drilled with a named owner, money-moving code behind staged rollout + kill-switch + second reviewer.',
    '',
    'Mark every deliberate simplification: `// impulse: <ceiling>, <upgrade trigger>` (`#` in Python). No trigger = rot, flagged by impulse-debt.',
    '',
    BACKEND_MODE_BLOCK[m],
  ].join('\n');
}

function frontendRuleset(mode) {
  const m = MODES.includes(mode) ? mode : 'medium';
  return [
    '## impulse-frontend active — mode: ' + m,
    '',
    'Persistence: ACTIVE EVERY RESPONSE. No drift back to AI-tell defaults. Off only: "stop impulse" / "normal mode".',
    '',
    'Declare one line before building: `<page kind> for <audience>, <vibe>, register: <brand|product>[, source: external-authority (<origin>)]`.',
    '- brand: design IS the product — distinctiveness bar. GSAP/Lenis/Three.js live here. Fluid clamp type, committed color, imagery mandatory on image-led briefs.',
    '- product: design SERVES the task — earned-familiarity bar. One font family, fixed rem scale, 150-250ms motion, no page-load choreography, restrained color.',
    '- external-authority (customer Figma/mockups named as the spec): reproduce, do not improve. Aesthetic bans yield to the authored design; hard floors (a11y, reduced motion, perf, security) do not — but every floor-vs-mockup conflict is a named question to the user BEFORE the change, ledgered in design-contract.md, never applied silently.',
    'Ambiguous brief: exactly one clarifying question, never a dump.',
    '',
    'Hard rules: `min-h-[100dvh]` never `h-screen`. transform/opacity animations only — no window scroll listeners (ScrollTrigger/Lenis exist). `prefers-reduced-motion` mandatory. ease-out family, no bounce. Reveals enhance an already-visible default. Contrast >=4.5:1 body, >=3:1 large, never gray-on-colored. OKLCH for color work. Semantic z-index, never 999. `min-width:0` on flex/grid children. Motion must be motivated in one sentence or dropped to static; motion claimed = motion shown. Grid over flex-percentage math (`w-[calc(...)]` banned). New dependency: check package.json first, output the install command before importing. Container width from one token, never ad-hoc per page.',
    '',
    'Zero em-dash in UI copy. One accent, one radius system (cap 12-16px), one theme, one icon family (Phosphor). Max 2 consecutive zigzags, >=4 layout families per 8 sections, max 1 eyebrow per 3 sections, max 1 marquee/page.',
    '',
    'States (product register): default/hover/focus/active/disabled/loading/error/success. Skeletons not spinners. Never `outline:none` without a `:focus-visible` replacement.',
    '',
    FRONTEND_MODE_BLOCK[m],
  ].join('\n');
}

// The always-on master layer. Injected on every session and every subagent
// regardless of domain flags — engineering spine + token economy, the two
// disciplines that must not depend on the user remembering to activate a
// mode. Deliberately compact: this is always-paid context, so it obeys the
// same token-hygiene it preaches. Full versions live in the skill files
// (impulse-core/SKILL.md is the readable owner; ladder detail in
// impulse-backend, token detail in shared/velocity.md + token-hygiene.md).
function coreRuleset() {
  return [
    '## impulse-core active — always-on engineering + token discipline',
    '',
    'Persistence: ACTIVE EVERY RESPONSE, with or without a domain mode. Off only: `/impulse-core off` (durable) or env IMPULSE_CORE=0 — "stop impulse" turns off domain modes, never this layer.',
    '',
    'Engineering spine (full ladder: impulse-backend; register system: impulse-frontend):',
    '- Stop at the first rung that holds: YAGNI-skip -> reuse in-service -> stdlib -> platform primitive -> blessed dep -> one line -> minimum code that works.',
    '- Carve-outs never simplified away: trust-boundary input validation, error handling that prevents data loss, security, anything explicitly requested (with a domain mode active: + its day-one baseline).',
    '- Mark every deliberate ceiling: `// impulse: <ceiling>, <upgrade trigger>` (`#` in Python) — e.g. `// impulse: in-memory cache, move to Redis past one instance.` No trigger = rot.',
    '- Build exactly what\'s requested, in its plainest working form: a function beats a framework, nothing speculative (extra config, unrequested abstraction) ships alongside it.',
    '- Stop at done: acceptance criteria pass -> stop. Ship that — polish, cleanup, or extra tests after the pass wait for the user to ask.',
    '- Touch only what the task owns — no drive-by edits. Everything else, including the user\'s own edits, stays exactly as found.',
    '',
    'Verification (details: shared/verification-layer.md):',
    '- Match the actual spec, not just the example given: restate the general rule in one line before coding when the request includes a worked example.',
    '- Verify every function, method, or API call against something actually seen this session (an import, a doc, existing code) before shipping it — an unfamiliar name that sounds plausible is a guess, not a fact.',
    '- An ambiguous requirement gets a direct question, not a silent assumption.',
    '- Check zero/empty/null/negative/boundary inputs before calling code done — each is handled or explicitly out of scope.',
    '- A claim of "done"/"works"/"passes" needs the actual output shown. A claim with no evidence is a guess wearing a fact\'s clothes.',
    '',
    'Token economy (details: shared/velocity.md, shared/token-hygiene.md):',
    '- Search escalation: known file -> its neighbor -> scoped grep (path + pattern + result cap) -> repo-wide last. Cap output before running: git log with -n, a bounded grep — not a raw recursive listing or full verbose log.',
    '- Read narrow: offset/limit on large files; structure scan (tree/signatures/grep) before a full read. Trust your own edit\'s result; re-read only when an external process (formatter/linter/generator) touched the file since.',
    '- Batch independent tool calls into one round. Fetch a stable value (token, config, build ID) once per session and reuse it — treat state as unchanged until something could plausibly have changed it.',
    '- Long output worth keeping -> scratch file, read back selectively.',
    '- Delegate a many-file sweep when tokens-to-explore far exceeds tokens-of-answer; the subagent returns a summary, never a raw transcript.',
    '- Project memory, when present (.impulse/memory/): index first, full text on demand — protocol in shared/memory.md.',
  ].join('\n');
}

function communicationRuleset() {
  return [
    '## Communication — impulse suite active',
    '',
    'Chat with user: живая русская речь. No AI-tells (no «в мире современных технологий», no bullet walls where a sentence works, no fake enthusiasm). Понятные термины, объясняй как сеньор коллеге. Terse but human.',
    '',
    'Thinking/reasoning: caveman-compressed, maximally dense — nobody reads it. This applies ONLY to the private reasoning stream, never to anything that becomes a tool-call argument.',
    '',
    'Code, commits, docs, identifiers, and every tool-call argument (subagent/Task prompt text, file contents, command strings): normal, full quality, complete sentences, correct language. Never compressed, never abbreviated — a subagent or a file has no access to your reasoning, only to the literal text you hand it.',
    '',
    'No emoji anywhere: code, logs, commits, chat.',
    '',
    'Pairs with /caveman plugin if the user runs it: these rules govern tone, caveman governs compression — both ban filler, no conflict.',
  ].join('\n');
}

// Build the full injection payload for the given flag ({backend, frontend, mode}).
// `coreEnabled` prepends the always-on layer. With no domain active the payload
// is core+communication alone (the master-skill baseline); with neither core
// nor a domain, returns '' — caller must skip emitting.
function getImpulseInstructions(flag, coreEnabled) {
  const hasDomain = !!(flag && (flag.backend || flag.frontend));
  if (!hasDomain && !coreEnabled) return '';

  const parts = [];
  if (hasDomain) {
    const mode = MODES.includes(flag.mode) ? flag.mode : 'medium';
    const domains = [];
    if (flag.backend) domains.push('backend');
    if (flag.frontend) domains.push('frontend');
    parts.push('IMPULSE MODE ACTIVE — ' + domains.join('+') + ' — mode: ' + mode +
      (coreEnabled ? ' — core: on' : ''));
    if (coreEnabled) parts.push(coreRuleset());
    if (flag.backend) parts.push(backendRuleset(mode));
    if (flag.frontend) parts.push(frontendRuleset(mode));
  } else {
    parts.push('IMPULSE CORE ACTIVE — no domain mode on (activate with /impulse-backend | /impulse-frontend)');
    parts.push(coreRuleset());
  }
  parts.push(communicationRuleset());
  return parts.join('\n\n');
}

module.exports = {
  MODES,
  coreRuleset,
  backendRuleset,
  frontendRuleset,
  communicationRuleset,
  getImpulseInstructions,
};
