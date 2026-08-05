#!/usr/bin/env node
// impulse — shared config: flag file, config file, mode resolution.
//
// Flag  : $CLAUDE_CONFIG_DIR/.impulse-active (default ~/.claude)
//         JSON {"backend":bool,"frontend":bool,"mode":"blitz"|"medium"|"hardcore"}
// Config: ~/.config/impulse/config.json
//         { "defaultMode": "medium", "docstringLang": "ru", "coverageTarget": 80 }
// Mode  : IMPULSE_DEFAULT_MODE env > config defaultMode > "medium"
//
// Never-block contract: exported functions never throw — silent fail, safe defaults.

const fs = require('fs');
const path = require('path');
const os = require('os');

const MODES = ['blitz', 'medium', 'hardcore'];
const DEFAULT_MODE = 'medium';
const FLAG_FILE = '.impulse-active';

function normalizeMode(mode) {
  if (typeof mode !== 'string') return null;
  const m = mode.trim().toLowerCase();
  return MODES.includes(m) ? m : null;
}

function getClaudeDir() {
  // CLAUDE_CONFIG_DIR overrides ~/.claude, matching Claude Code.
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

function getFlagPath() {
  return path.join(getClaudeDir(), FLAG_FILE);
}

function getConfigPath() {
  return path.join(os.homedir(), '.config', 'impulse', 'config.json');
}

function readJson(file) {
  // Strip UTF-8 BOM (Windows editors prepend it; JSON.parse chokes).
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function getConfig() {
  const defaults = { defaultMode: DEFAULT_MODE, docstringLang: 'ru', coverageTarget: 80 };
  try {
    const cfg = readJson(getConfigPath());
    return {
      defaultMode: normalizeMode(cfg.defaultMode) || defaults.defaultMode,
      docstringLang: cfg.docstringLang === 'en' ? 'en' : 'ru',
      coverageTarget: Number.isFinite(cfg.coverageTarget) ? cfg.coverageTarget : defaults.coverageTarget,
    };
  } catch (e) {
    return defaults; // missing/invalid config = defaults, never an error
  }
}

function getDefaultMode() {
  return normalizeMode(process.env.IMPULSE_DEFAULT_MODE) || getConfig().defaultMode;
}

// Absent flag, invalid JSON, or no active domain = impulse off (null).
function readFlag() {
  try {
    const flag = readJson(getFlagPath());
    const backend = flag.backend === true;
    const frontend = flag.frontend === true;
    if (!backend && !frontend) return null;
    return { backend, frontend, mode: normalizeMode(flag.mode) || getDefaultMode() };
  } catch (e) {
    return null;
  }
}

function writeFlag(flag) {
  try {
    const flagPath = getFlagPath();
    fs.mkdirSync(path.dirname(flagPath), { recursive: true });
    fs.writeFileSync(flagPath, JSON.stringify({
      backend: flag.backend === true,
      frontend: flag.frontend === true,
      mode: normalizeMode(flag.mode) || getDefaultMode(),
    }));
    return true;
  } catch (e) {
    return false;
  }
}

function clearFlag() {
  try { fs.unlinkSync(getFlagPath()); } catch (e) {}
}

// Standalone command only. Matching the phrase anywhere turned the mode off
// mid-task for prompts like "add a normal mode toggle" (ponytail lesson) —
// require the whole message, ignoring case and trailing punctuation.
function isDeactivationCommand(text) {
  const t = String(text || '').trim().toLowerCase().replace(/[.!?\s]+$/, '');
  return t === 'stop impulse' || t === 'normal mode';
}

// Embed the install path in a statusline command only when it is made of
// ordinary path characters — an allowlist beats escaping every shell's
// metacharacters. Hostile path falls back to manual setup.
function isShellSafe(p) {
  return typeof p === 'string' && /^[A-Za-z0-9 _.\-:/\\~]+$/.test(p);
}

// Injection-size meter. Silent context has no price tag, so a ruleset that
// grows a paragraph at a time gets expensive without anyone noticing —
// especially on SubagentStart, which pays it once per spawned agent. Last
// line of every injection states the cost. Set IMPULSE_NO_METER=1 to drop it.
// ~4 chars/token is a rough estimate, deliberately not a tokenizer dependency.
function meter(context) {
  if (process.env.IMPULSE_NO_METER === '1') return context;
  const chars = context.length;
  return context + '\n\n[impulse injection: ~' + Math.ceil(chars / 4) +
    ' tokens / ' + chars + ' chars]';
}

// SessionStart/UserPromptSubmit accept raw stdout as context; SubagentStart
// drops it unless wrapped in the hookSpecificOutput JSON form.
//
// UserPromptSubmit is metered too but it is a one-line mode confirmation —
// the meter would cost more than the payload, so it opts out via `bare`.
function emit(event, context, bare) {
  try {
    const payload = bare ? context : meter(context);
    if (event === 'SubagentStart' || event === 'PostToolUse') {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { hookEventName: event, additionalContext: payload },
      }));
      return;
    }
    process.stdout.write(payload);
  } catch (e) {
    // EPIPE at hook exit must not surface as a hook failure.
  }
}

module.exports = {
  MODES,
  DEFAULT_MODE,
  normalizeMode,
  getClaudeDir,
  getFlagPath,
  getConfigPath,
  getConfig,
  getDefaultMode,
  readFlag,
  writeFlag,
  clearFlag,
  isDeactivationCommand,
  isShellSafe,
  emit,
};
