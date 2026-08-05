#!/usr/bin/env node
// impulse — Claude Code PostToolUse hook (Write|Edit).
//
// Catches ceiling-marker rot at WRITE time instead of on demand. `/impulse-debt`
// already finds `impulse:` markers with no upgrade trigger, but only when someone
// runs it — so a triggerless marker survives in the tree until the next audit,
// which is exactly the decay the marker convention exists to prevent. Same rule,
// enforced at the moment the line is written, while the author is still here.
//
// Rot = `impulse:` with no `,` — a named ceiling and no condition to revisit it.
// See scripts/impulse-debt.js (MARKER_RE is kept identical on purpose).
//
// Never-block contract: every branch silent-fails, hook always exits 0. This is
// advisory context, never a block decision — a false positive must not stop a write.

let flag;
let emit;
try {
  // Require inside the try: a broken install must be a silent no-op, not a stack dump.
  const config = require('./impulse-config');
  flag = config.readFlag();
  if (!flag) process.exit(0); // impulse off — say nothing
  emit = config.emit;
} catch (e) {
  process.exit(0); // silent fail — never block a write
}

// Same extensions impulse-debt scans: markers only mean something in source.
const SCAN_EXT = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
  '.go', '.py', '.vue', '.sh', '.ps1', '.sql', '.yaml', '.yml',
]);

// Identical to scripts/impulse-debt.js MARKER_RE — one convention, one regex.
// `//` or `#` must actually start a comment: not preceded by `:` (blocks http://),
// and either at line start or preceded by whitespace/punctuation.
const MARKER_RE = /(?:^|[\s;{}()])(?:(?<!:)\/\/|#)\s*impulse:\s*(.+?)\s*$/;

let input = '';
let done = false;

function extname(p) {
  const i = p.lastIndexOf('.');
  return i === -1 ? '' : p.slice(i).toLowerCase();
}

// Write carries the whole file; Edit carries only the replacement. Either way
// we scan just what this call wrote — re-flagging untouched pre-existing markers
// would nag about lines the author did not touch.
function writtenText(toolName, toolInput) {
  if (toolName === 'Write') return String(toolInput.content || '');
  if (toolName === 'Edit') return String(toolInput.new_string || '');
  return '';
}

function finish() {
  if (done) return;
  done = true;
  try {
    const data = JSON.parse(input.replace(/^﻿/, ''));
    const toolName = String(data.tool_name || '');
    if (toolName !== 'Write' && toolName !== 'Edit') return;

    const toolInput = data.tool_input || {};
    const file = String(toolInput.file_path || '');
    if (!SCAN_EXT.has(extname(file))) return;

    const text = writtenText(toolName, toolInput);
    if (!text || text.indexOf('impulse:') === -1) return; // cheap bail before regex

    const rot = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = MARKER_RE.exec(lines[i]);
      if (!m) continue;
      // No comma = ceiling named, upgrade trigger missing. That is rot.
      if (m[1].indexOf(',') === -1) rot.push(m[1].trim());
    }
    if (!rot.length) return; // clean write — stay silent, silence is the cheap path

    const list = rot.map(c => '  - `impulse: ' + c + '`').join('\n');
    emit('PostToolUse',
      'IMPULSE MARKER ROT — just written to ' + file + ':\n' + list + '\n' +
      'A ceiling marker with no upgrade trigger is decay, not tracked debt: nothing ' +
      'says when to revisit it, so it never gets revisited. Fix the line now — ' +
      '`// impulse: <ceiling>, <upgrade trigger>` (e.g. `// impulse: in-process cache, ' +
      'move to Redis when a second replica appears`). If no trigger is nameable, the ' +
      'simplification is not a deliberate ceiling — either justify it or build it properly.');
  } catch (e) {
    // Silent fail — a malformed payload must not surface as a hook failure
  }
}

process.stdin.setEncoding('utf8'); // multibyte chars must not split across chunks
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', finish);
process.stdin.on('error', () => { finish(); process.exit(0); });

// Never hang a write — a swallowed stdin pipe must not freeze the session.
setTimeout(() => { finish(); process.exit(0); }, 1000).unref();
