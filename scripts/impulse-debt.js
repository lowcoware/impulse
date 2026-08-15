#!/usr/bin/env node
// impulse-debt — recursive scan for `impulse:` ceiling markers.
//
// Marker syntax: `// impulse: <ceiling>, <upgrade trigger>` (Go/TS/JS/etc.)
//                `# impulse: <ceiling>, <upgrade trigger>`  (Python/shell)
// A marker with no trigger (no comma) is rot — flagged separately.
//
// Usage: node scripts/impulse-debt.js [rootDir]   (default: cwd)
// Plain Node core modules only. No deps.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.nuxt', '.output']);
const SCAN_EXT = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
  '.go', '.py', '.vue', '.sh', '.ps1', '.sql', '.yaml', '.yml',
]);
// `//` or `#` must actually start a comment: not preceded by `:` (blocks http://, https://),
// and either at line start or preceded by whitespace/punctuation.
// `--` covers SQL comments (SCAN_EXT includes .sql — without it that
// extension scanned nothing).
const MARKER_RE = /(?:^|[\s;{}()])(?:(?<!:)\/\/|#|--)\s*impulse:\s*(.+?)\s*$/;
// Empirical grounding, not a guess: SATD (self-admitted technical debt)
// median lifespan is 18-172 days across studied open-source projects
// (Potdar & Shihab; Maldonado et al., 5,733 SATD removals across 5 projects
// — majority self-removed by whoever introduced it). 6 months (~180 days)
// sits at the upper edge of that range: a impulse: marker still alive past
// this point has outlived the empirical norm for how long debt like this
// usually survives before someone (often its own author) clears it.
const STALE_MONTHS = 6;

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return; // unreadable dir — skip, never crash the scan
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue; // avoid cycles
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
    } else if (entry.isFile() && SCAN_EXT.has(path.extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
}

const gitAgeCache = new Map(); // file path -> age; one `git log` per file, not per marker

function gitAge(file, rootDir) {
  if (gitAgeCache.has(file)) return gitAgeCache.get(file);
  const age = gitAgeUncached(file, rootDir);
  gitAgeCache.set(file, age);
  return age;
}

function gitAgeUncached(file, rootDir) {
  try {
    const out = execFileSync(
      'git', ['log', '-1', '--format=%at|%ar', '--', file],
      { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    if (!out) return { display: 'n/a', stale: false };
    const [epoch, relative] = out.split('|');
    const ageMonths = (Date.now() / 1000 - Number(epoch)) / (60 * 60 * 24 * 30);
    return { display: relative, stale: ageMonths > STALE_MONTHS };
  } catch (e) {
    return { display: 'n/a', stale: false }; // no git, untracked file, or git not on PATH — never block
  }
}

function scan(rootDir) {
  const files = [];
  walk(rootDir, files);

  const rows = [];
  for (const file of files) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch (e) {
      continue; // unreadable/binary — skip
    }
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      const m = MARKER_RE.exec(line);
      if (!m) return;
      const body = m[1];
      const commaIdx = body.indexOf(',');
      const ceiling = (commaIdx === -1 ? body : body.slice(0, commaIdx)).trim();
      const trigger = commaIdx === -1 ? '' : body.slice(commaIdx + 1).trim();
      const rel = path.relative(rootDir, file).split(path.sep).join('/');
      const age = gitAge(file, rootDir);
      const flags = [];
      if (!trigger) flags.push('ROT'); // no trigger = decay, not debt
      if (age.stale) flags.push('STALE'); // git-age > STALE_MONTHS — check whether the trigger already fired
      rows.push({
        file: rel,
        loc: rel + ':' + (i + 1),
        ceiling,
        trigger,
        age: age.display,
        flag: flags.join(',') || '-',
      });
    });
  }
  rows.sort((a, b) => a.loc.localeCompare(b.loc));
  return rows;
}

function pad(s, width) {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

function printTable(rows) {
  if (rows.length === 0) {
    console.log('No impulse: markers found. Clean.');
    return;
  }
  // rows are pre-sorted by loc (scan()), so same-file rows land adjacent — grouped by file for free.
  const headers = ['LOCATION', 'CEILING', 'TRIGGER', 'AGE', 'FLAG'];
  const cols = rows.map(r => [r.loc, r.ceiling, r.trigger || '(none)', r.age, r.flag]);
  const widths = headers.map((h, i) => Math.max(h.length, ...cols.map(c => c[i].length)));

  console.log(headers.map((h, i) => pad(h, widths[i])).join(' | '));
  console.log(widths.map(w => '-'.repeat(w)).join('-|-'));
  for (const c of cols) {
    console.log(c.map((v, i) => pad(v, widths[i])).join(' | '));
  }

  const rot = rows.filter(r => r.flag.includes('ROT'));
  const stale = rows.filter(r => r.flag.includes('STALE'));
  console.log('');
  if (rot.length === 0 && stale.length === 0) {
    console.log('No rot: every marker names an upgrade trigger and is under ' + STALE_MONTHS + ' months old.');
  } else {
    if (rot.length) console.log('ROT (' + rot.length + ' — no upgrade trigger): ' + rot.map(r => r.loc).join(', '));
    if (stale.length) console.log('STALE (' + stale.length + ' — older than ' + STALE_MONTHS + ' months, check if the trigger already fired): ' + stale.map(r => r.loc).join(', '));
  }
  console.log('');
  console.log(rows.length + ' marker(s), ' + rot.length + ' rot, ' + stale.length + ' stale.');
}

function main() {
  const rootDir = path.resolve(process.argv[2] || process.cwd());
  let stat;
  try {
    stat = fs.statSync(rootDir);
  } catch (e) {
    console.error('impulse-debt: not a directory: ' + rootDir);
    process.exit(1);
  }
  if (!stat.isDirectory()) {
    console.error('impulse-debt: not a directory: ' + rootDir);
    process.exit(1);
  }
  const rows = scan(rootDir);
  printTable(rows);
}

main();
