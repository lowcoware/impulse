#!/usr/bin/env node
// check-anchors — verify § cross-references point at headings that exist.
//
// check-sync.js guards 13 hand-listed anchor phrases; the tree carries ~175
// `§ Heading` references that nothing checked — a heading rename silently
// rotted every reference to it. This resolves each one mechanically.
//
// Reference shapes handled:
//   § Heading name            same-file reference
//   `path/to/file.md` § Heading    cross-file (nearest backticked .md path
//                                  earlier on the same line)
//   §5 / §8                   numbered-list refs — skipped (no stable anchor)
//
// Matching is prefix-fuzzy: references shorten headings ("§ Dispatch
// artifacts" vs "## Dispatch artifacts — the role prompt is a file"), and
// often carry trailing prose ("§ Context isolation section exists to…").
// A ref passes if any heading in the target file starts with the ref's
// first words (case-insensitive), tried longest-prefix-first down to two
// words. Zero-match on even two words = FAIL.
//
// Usage: node scripts/check-anchors.js
// Exit 0: all resolve. Exit 1: unresolved references listed.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function collectMdFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'references') {
        // top-level references/ = vendored third-party clones, skip; but
        // skills/*/references/ must be scanned — handle below.
        if (dir === ROOT && e.name === 'references') continue;
      }
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === '.git' || e.name === 'node_modules') continue;
        if (dir === ROOT && e.name === 'references') continue; // vendored clones
        walk(full);
      } else if (e.name.endsWith('.md')) {
        if (full.includes('design-templates')) continue; // vendored template packs, own conventions
        out.push(full);
      }
    }
  };
  walk(path.join(ROOT, 'shared'));
  walk(path.join(ROOT, 'skills'));
  return out;
}

function headingsOf(file, cache) {
  if (cache.has(file)) return cache.get(file);
  let heads = [];
  try {
    const text = fs.readFileSync(file, 'utf8');
    heads = [...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map(m =>
      m[1].toLowerCase().replace(/[`*_]/g, '').replace(/^\d+\.\s*/, '').trim());
  } catch (e) { /* unreadable = no headings */ }
  cache.set(file, heads);
  return heads;
}

function resolveTarget(citedPath, citingFile) {
  const tries = [
    path.join(ROOT, citedPath),
    path.join(ROOT, 'skills', citedPath),
    path.join(path.dirname(citingFile), citedPath),
  ];
  for (const t of tries) if (fs.existsSync(t)) return t;
  return null;
}

function refMatches(refPhrase, headings) {
  const words = refPhrase.toLowerCase().replace(/[`*_"«»]/g, '').trim().split(/\s+/);
  for (let n = words.length; n >= 2; n--) {
    const prefix = words.slice(0, n).join(' ');
    if (headings.some(h => h.startsWith(prefix))) return true;
  }
  // Single-word refs ("§ Boundaries") are legitimate — allow exact word match.
  if (words.length === 1 && headings.some(h => h.startsWith(words[0]))) return true;
  return false;
}

function main() {
  const files = collectMdFiles();
  const cache = new Map();
  const failures = [];
  let checked = 0;
  let skippedNumeric = 0;

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const m of line.matchAll(/§\s*("?)([^)`".,\n;]+)/g)) {
        const phrase = m[2].trim();
        if (!phrase || /^\d/.test(phrase)) { skippedNumeric++; continue; }
        // Letter-labeled check IDs (zh-mechanical-detector's §Z / §AB / §A-§AE
        // ranges) are item labels, not headings.
        if (/^[A-Z]{1,2}(\s|$|-)/.test(phrase)) { skippedNumeric++; continue; }
        checked++;
        // Nearest backticked .md path earlier on the line = cross-file ref.
        const before = line.slice(0, m.index);
        const pathMatches = [...before.matchAll(/`([A-Za-z0-9_./-]+\.md)`/g)];
        let target = file;
        if (pathMatches.length) {
          const cited = pathMatches[pathMatches.length - 1][1];
          const resolved = resolveTarget(cited, file);
          if (!resolved) {
            failures.push(`${path.relative(ROOT, file)}:${i + 1} — cited file not found: ${cited}`);
            return;
          }
          target = resolved;
        }
        if (!refMatches(phrase, headingsOf(target, cache))) {
          failures.push(`${path.relative(ROOT, file)}:${i + 1} — no heading matching "§ ${phrase}" in ${path.relative(ROOT, target)}`);
        }
      }
    });
  }

  if (failures.length) {
    console.error(`check-anchors: ${failures.length} unresolved of ${checked} § references (${skippedNumeric} numeric skipped):`);
    for (const f of failures) console.error('  ' + f);
    process.exit(1);
  }
  console.log(`check-anchors: ${checked} § references resolve (${skippedNumeric} numeric skipped).`);
}

main();
