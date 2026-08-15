#!/usr/bin/env node
// check-token-hygiene — advisory report against shared/token-hygiene.md's
// named anti-patterns. NOT a CI gate (unlike check-skills.js's hard caps).
//
// Checks, each named after the token-hygiene.md pattern it mechanizes:
//   Rule-File Novel  — the ALWAYS-PAID surface only: every skill's
//                      frontmatter description (paid every turn regardless
//                      of trigger) + hooks/impulse-instructions.js (the
//                      compact ruleset injected once per active session).
//                      A first draft of this check capped shared/*.md and
//                      references/*.md by length instead — empirically
//                      wrong (every real file in this suite exceeded it,
//                      because those are on-demand protocol docs, not
//                      always-loaded bulk). See token-hygiene.md's
//                      corrected Rule-File Novel entry for why this check
//                      targets a different, narrower surface now.
//   Duplication Sediment — Jaccard word-overlap between shared/*.md and
//                          references/*.md pairs, high similarity with no
//                          cross-link between them.
//
// Usage: node scripts/check-token-hygiene.js [--help]
// Always exits 0 (advisory) unless invoked with a bad flag.
'use strict';
const fs = require('fs');
const path = require('path');

if (process.argv.includes('--help')) {
  console.log('check-token-hygiene: advisory audit against shared/token-hygiene.md anti-patterns.');
  console.log('Usage: node scripts/check-token-hygiene.js');
  process.exit(0);
}

const ROOT = path.join(__dirname, '..');
const INSTRUCTIONS_LINE_CAP = 400; // impulse-instructions.js — compact ruleset source, JS not prose
const DESC_CHAR_WARN = 600; // frontmatter description getting bloated (authoring.md caps at 1024 chars)
const DUP_SIMILARITY_THRESHOLD = 0.6;
const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'is', 'it', 'for',
  'on', 'this', 'that', 'not', 'with', 'as', 'be', 'are', 'was', 'at', 'by', 'from']);

function collectDocs() {
  const docs = []; // { label, file, text }
  const sharedDir = path.join(ROOT, 'shared');
  try {
    for (const f of fs.readdirSync(sharedDir)) {
      if (f.endsWith('.md')) docs.push({ label: `shared/${f}`, file: path.join(sharedDir, f) });
    }
  } catch (e) { /* no shared/ dir */ }

  const skillsDir = path.join(ROOT, 'skills');
  let entries;
  try { entries = fs.readdirSync(skillsDir, { withFileTypes: true }); } catch (e) { entries = []; }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const refDir = path.join(skillsDir, entry.name, 'references');
    let refFiles;
    try { refFiles = fs.readdirSync(refDir); } catch (e) { continue; }
    for (const rf of refFiles) {
      if (rf.endsWith('.md')) docs.push({ label: `${entry.name}/references/${rf}`, file: path.join(refDir, rf) });
    }
  }

  for (const d of docs) d.text = fs.readFileSync(d.file, 'utf8').replace(/^﻿/, '');
  return docs;
}

function collectDescriptions() {
  const out = []; // { skill, chars }
  const skillsDir = path.join(ROOT, 'skills');
  let entries;
  try { entries = fs.readdirSync(skillsDir, { withFileTypes: true }); } catch (e) { return out; }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
    let text;
    try { text = fs.readFileSync(skillPath, 'utf8').replace(/^﻿/, ''); } catch (e) { continue; }
    const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) continue;
    const descLine = fmMatch[1].match(/^description:[ \t]*(?:>-?[ \t]*)?(.*)$/m);
    if (!descLine) continue;
    let desc = descLine[1];
    if (desc === '' || /^>-?$/.test(descLine[0].split(':')[1]?.trim() || '')) {
      const after = fmMatch[1].slice(fmMatch[1].indexOf(descLine[0]) + descLine[0].length);
      const buf = [];
      for (const l of after.split(/\r?\n/)) {
        if (l.trim() === '') continue;
        if (/^\S/.test(l)) break; // next top-level key — folded block over
        buf.push(l.trim());
      }
      desc = buf.join(' ');

    }
    out.push({ skill: entry.name, chars: desc.length });
  }
  return out;
}

function wordSet(text) {
  const words = text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || [];
  return new Set(words.filter(w => !STOPWORDS.has(w)));
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function main() {
  const docs = collectDocs();
  const descs = collectDescriptions();

  console.log(`check-token-hygiene: ${docs.length} shared/reference file(s), ` +
    `${descs.length} skill description(s). Advisory only — no CI gate.\n`);

  console.log('Rule-File Novel — always-paid surface only:');
  const instrPath = path.join(ROOT, 'hooks', 'impulse-instructions.js');
  try {
    const lines = fs.readFileSync(instrPath, 'utf8').split(/\r?\n/).length;
    console.log(`  hooks/impulse-instructions.js: ${lines} lines` +
      (lines > INSTRUCTIONS_LINE_CAP ? ` — over the ${INSTRUCTIONS_LINE_CAP}-line advisory watch mark` : ' — ok'));
  } catch (e) {
    console.log('  hooks/impulse-instructions.js: not found');
  }
  const bloated = descs.filter(d => d.chars > DESC_CHAR_WARN).sort((a, b) => b.chars - a.chars);
  if (!bloated.length) console.log(`  no skill description over ${DESC_CHAR_WARN} chars`);
  else for (const d of bloated) console.log(`  ${d.skill}: description ${d.chars} chars (cap 1024, watch mark ${DESC_CHAR_WARN})`);

  const sets = docs.map(d => ({ label: d.label, set: wordSet(d.text) }));
  const dupPairs = [];
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const sim = jaccard(sets[i].set, sets[j].set);
      if (sim >= DUP_SIMILARITY_THRESHOLD) {
        dupPairs.push({ a: sets[i].label, b: sets[j].label, sim: sim.toFixed(2) });
      }
    }
  }
  console.log(`\nDuplication Sediment candidates (word-overlap >= ${DUP_SIMILARITY_THRESHOLD}):`);
  if (!dupPairs.length) console.log('  none');
  else for (const p of dupPairs) console.log(`  ${p.a} <-> ${p.b} (similarity ${p.sim}) — check for a cross-link, or dedupe`);

  console.log('\nN-Skill Trap: needs real invocation logs, not checkable from repo state — audit manually.');
  console.log('Unscoped Rule: judgment call (does this fact apply broadly enough to need a fires/skips ' +
    'table, or is being pointed-to by name already its scoping?) — not mechanized, see token-hygiene.md.');
}

main();
