#!/usr/bin/env node
// impulse — Claude Code UserPromptSubmit hook.
//
// Parses the user prompt for impulse commands and persists the flag file:
//   /impulse-backend [blitz|medium|hardcore]   activate backend (+optional mode)
//   /impulse-frontend [blitz|medium|hardcore]  activate frontend (+optional mode)
//   /impulse <blitz|medium|hardcore>           switch mode on whichever domain is active
//   stop impulse / normal mode                 deactivate both domains
//
// Emits a short confirmation as hidden context. Never-block: silent fail,
// 1s stdin fallback so a swallowed pipe (Windows PowerShell hook wrapper)
// never hangs the session.

let config;
try {
  config = require('./impulse-config');
} catch (e) {
  process.exit(0); // broken install — silent no-op, never block the session
}
const {
  getDefaultMode,
  normalizeMode,
  readFlag,
  writeFlag,
  clearFlag,
  isDeactivationCommand,
  emit,
} = config;

let input = '';
let done = false;

function currentOrDefault() {
  return readFlag() || { backend: false, frontend: false, mode: getDefaultMode() };
}

function confirm() {
  const flag = readFlag();
  if (!flag) return;
  const domains = [];
  if (flag.backend) domains.push('backend');
  if (flag.frontend) domains.push('frontend');
  emit('UserPromptSubmit', 'IMPULSE MODE: ' + domains.join('+') + ' — level: ' + flag.mode, true);
}

function finish() {
  if (done) return;
  done = true;
  try {
    // Strip UTF-8 BOM some shells prepend when piping (breaks JSON.parse).
    const data = JSON.parse(input.replace(/^\uFEFF/, ''));
    const raw = String(data.prompt || '').trim();

    // Skill-backed slash commands reach this hook XML-wrapped
    // (<command-name>/impulse-backend</command-name><command-args>hardcore</command-args>),
    // not as the literal typed line - reconstruct before matching.
    const cmdName = /<command-name>\s*(\/\S+)\s*<\/command-name>/i.exec(raw);
    const cmdArgs = /<command-args>\s*([^<]*?)\s*<\/command-args>/i.exec(raw);
    const prompt = cmdName
      ? cmdName[1] + (cmdArgs && cmdArgs[1] ? ' ' + cmdArgs[1].trim() : '')
      : raw;

    if (isDeactivationCommand(prompt)) {
      clearFlag();
      emit('UserPromptSubmit', 'IMPULSE MODE OFF');
      return;
    }

    const backendMatch = /^\/impulse-backend(?:\s+(\S+))?\s*$/i.exec(prompt);
    const frontendMatch = /^\/impulse-frontend(?:\s+(\S+))?\s*$/i.exec(prompt);
    const bareMatch = /^\/impulse(?:\s+(\S+))?\s*$/i.exec(prompt);

    if (backendMatch) {
      const cur = currentOrDefault();
      const mode = normalizeMode(backendMatch[1]) || cur.mode;
      writeFlag({ backend: true, frontend: cur.frontend, mode });
      confirm();
      return;
    }

    if (frontendMatch) {
      const cur = currentOrDefault();
      const mode = normalizeMode(frontendMatch[1]) || cur.mode;
      writeFlag({ backend: cur.backend, frontend: true, mode });
      confirm();
      return;
    }

    if (bareMatch && bareMatch[1]) {
      const mode = normalizeMode(bareMatch[1]);
      if (mode) {
        const cur = currentOrDefault();
        writeFlag({ backend: cur.backend, frontend: cur.frontend, mode });
        confirm();
      }
    }
  } catch (e) {
    // Silent fail
  }
}

process.stdin.setEncoding('utf8'); // multibyte chars must not split across chunks
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', finish);
process.stdin.on('error', () => { finish(); process.exit(0); });

// Never hang the session — a swallowed stdin pipe must not freeze
// UserPromptSubmit. unref() keeps the timer off the normal, fast path.
setTimeout(() => { finish(); process.exit(0); }, 1000).unref();
