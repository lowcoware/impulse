#!/usr/bin/env node
// impulse — Claude Code SessionStart hook (startup|resume|clear|compact).
//
// 1. Read the flag file. Impulse inactive (no domain on) → exit clean, inject nothing.
// 2. Emit the compact ruleset for active domains, filtered by mode, as hidden context.
// 3. Nudge statusline setup if missing (only relevant once impulse is active).
//
// Source-aware: the static ruleset is bulk, and re-sending bulk that is already
// in the conversation is pure waste. Which sources still have it:
//   startup — new conversation, nothing in context      → FULL
//   clear   — context wiped by the user                 → FULL
//   compact — history replaced by a summary that may or may not have kept the
//             ruleset. Silently dropping it would look like impulse is off,
//             which is the worse failure                → FULL
//   resume  — full history is re-loaded verbatim, so the ruleset is provably
//             still there                               → VOLATILE ONLY
// Unknown/unreadable source falls open to FULL: over-injecting costs tokens,
// under-injecting costs the ruleset.
//
// Never-block contract: every branch silent-fails, hook always exits 0.

const fs = require('fs');
const path = require('path');

let config;
let getImpulseInstructions;
let flag;
let coreOn;
try {
  // Requires inside the try: a broken install must be a silent no-op, not a stack dump.
  config = require('./impulse-config');
  ({ getImpulseInstructions } = require('./impulse-instructions'));
  flag = config.readFlag();
  coreOn = config.isCoreEnabled();
  // Core is the always-on master layer: with it enabled there is always
  // something to inject, flag file or not. Only fully-off installs exit here.
  if (!flag && !coreOn) process.exit(0);
} catch (e) {
  process.exit(0); // silent fail — never block session start
}

// Statusline nudge rides the full injection only. On resume it would be a
// repeat of something the earlier injection already said, and the point of the
// resume path is to stay small.
function statuslineNudge() {
  try {
    const claudeDir = config.getClaudeDir();
    const settingsPath = path.join(claudeDir, 'settings.json');
    if (fs.existsSync(settingsPath)) {
      // Strip UTF-8 BOM some editors prepend on Windows (breaks JSON.parse).
      const raw = fs.readFileSync(settingsPath, 'utf8').replace(/^﻿/, '');
      if (JSON.parse(raw).statusLine) return '';
    }

    const isWindows = process.platform === 'win32';
    const scriptName = isWindows ? 'impulse-statusline.ps1' : 'impulse-statusline.sh';
    const scriptPath = path.join(__dirname, scriptName);
    if (config.isShellSafe(scriptPath)) {
      const command = isWindows
        ? `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`
        : `bash "${scriptPath}"`;
      const statusLineSnippet =
        '"statusLine": { "type": "command", "command": ' + JSON.stringify(command) + ' }';
      return '\n\n' +
        'STATUSLINE SETUP NEEDED: the impulse plugin shows an active-mode badge ' +
        '(e.g. [IMPULSE:BE:BLITZ], [IMPULSE:FE], [IMPULSE:BE+FE:HARDCORE]). Not configured yet. ' +
        'To enable, add this to ' + settingsPath + ': ' + statusLineSnippet + ' ' +
        'Proactively offer to set this up for the user on first interaction.';
    }
    // Install path has shell metacharacters — don't embed it in a command
    // snippet, have the agent wire it up by hand instead.
    return '\n\n' +
      'STATUSLINE SETUP NEEDED: the impulse plugin shows an active-mode badge. ' +
      'Its install path contains characters unsafe to embed in a shell command — configure it manually: ' +
      'add a statusLine command of type "command" that runs ' + scriptName +
      ' from the plugin hooks/ directory to ' + settingsPath + ', quoting the path for your shell. ' +
      'Proactively offer to set this up for the user on first interaction.';
  } catch (e) {
    return ''; // don't block session start over statusline detection
  }
}

// The volatile half: what mode is live right now. The DOMAIN ruleset is
// provably in the resumed history (it can only activate via a hook that
// injected it), so it is not re-sent. The CORE ruleset has no such proof:
// core may have been switched on mid-previous-session via /impulse-core on,
// after that conversation's SessionStart already ran — so when core is on,
// re-inject it in full (it is small) rather than assert presence.
function volatileOnly() {
  const domains = [];
  if (flag && flag.backend) domains.push('backend');
  if (flag && flag.frontend) domains.push('frontend');
  const { coreRuleset } = require('./impulse-instructions');
  const corePart = coreOn ? '\n\n' + coreRuleset() : '';
  if (domains.length) {
    return 'IMPULSE MODE: ' + domains.join('+') + ' — level: ' + flag.mode +
      (coreOn ? ' — core: on' : '') + '. ' +
      'Domain ruleset already in this conversation (resumed) — still in force, not re-sent.' +
      corePart;
  }
  return 'IMPULSE CORE: on (no domain mode).' + corePart;
}

let input = '';
let done = false;

function finish() {
  if (done) return;
  done = true;
  try {
    let source = '';
    try {
      source = String(JSON.parse(input.replace(/^﻿/, '')).source || '');
    } catch (e) {
      source = ''; // unreadable payload → fall open to FULL below
    }
    const output = source === 'resume'
      ? volatileOnly()
      : getImpulseInstructions(flag, coreOn) + statuslineNudge();
    config.emit('SessionStart', output);
  } catch (e) {
    // Silent fail — never block session start
  }
}

process.stdin.setEncoding('utf8'); // multibyte chars must not split across chunks
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', finish);
process.stdin.on('error', () => { finish(); process.exit(0); });

// Never hang session start — a swallowed stdin pipe (Windows PowerShell hook
// wrapper) must not freeze it. unref() keeps the timer off the fast path.
setTimeout(() => { finish(); process.exit(0); }, 1000).unref();
