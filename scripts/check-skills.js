#!/usr/bin/env node
// check-skills.js — lint every skills/*/SKILL.md frontmatter + size caps.
// Rules ported from anthropics/skills quick_validate.py (MIT, re-expressed)
// + impulse suite's own caps. Zero deps.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'skills');
const ALLOWED_KEYS = new Set(['name', 'description', 'license', 'allowed-tools', 'metadata', 'compatibility']);
const ROUTER_LINE_CAP = 150;

let failures = 0;
const fail = (skill, msg) => { failures++; console.error(`FAIL ${skill}: ${msg}`); };

let entries;
try {
  entries = fs.readdirSync(ROOT, { withFileTypes: true });
} catch (e) {
  console.error(`check-skills: skills/ not found at ${ROOT}`);
  process.exit(1);
}

for (const entry of entries) {
  if (!entry.isDirectory()) continue; // stray files in skills/ are not skills
  const dir = entry.name;
  const skillPath = path.join(ROOT, dir, 'SKILL.md');
  if (!fs.existsSync(skillPath)) { fail(dir, 'no SKILL.md'); continue; }
  // Strip UTF-8 BOM some editors prepend on Windows (breaks the /^---/ match).
  const text = fs.readFileSync(skillPath, 'utf8').replace(/^﻿/, '');
  const lines = text.split(/\r?\n/);

  const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) { fail(dir, 'no frontmatter block'); continue; }
  const fm = fmMatch[1];

  // top-level keys only (lines not indented)
  const keys = [...fm.matchAll(/^([A-Za-z-]+):/gm)].map(m => m[1]);
  for (const k of keys) if (!ALLOWED_KEYS.has(k)) fail(dir, `frontmatter key '${k}' not in allowed set`);

  const name = (fm.match(/^name:\s*(.+)$/m) || [])[1];
  if (!name) fail(dir, 'missing name');
  else {
    if (name.length > 64) fail(dir, `name ${name.length} chars (>64)`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name.trim())) fail(dir, `name '${name.trim()}' not clean kebab-case`);
    if (name.trim() !== name.trim().normalize('NFKC')) fail(dir, 'name not NFKC-normalized (official validator parity)');
    if (name.trim() !== dir) fail(dir, `name '${name.trim()}' != dir '${dir}'`);
  }

  // description: single line or folded block (>-)
  let desc = '';
  const descLine = fm.match(/^description:[ \t]*(?:>-?[ \t]*)?(.*)$/m);
  if (descLine) {
    desc = descLine[1];
    if (desc === '' || /^>-?$/.test(descLine[0].split(':')[1]?.trim() || '')) {
      // folded block: collect indented lines after description:
      const after = fm.slice(fm.indexOf(descLine[0]) + descLine[0].length);
      const buf = [];
      for (const l of after.split(/\r?\n/)) {
        if (l.trim() === '') continue;
        if (/^\S/.test(l)) break; // next top-level key — folded block over
        buf.push(l.trim());
      }
      desc = buf.join(' ');

    }
  }
  if (!desc) fail(dir, 'missing/empty description');
  else {
    if (desc.length > 1024) fail(dir, `description ${desc.length} chars (>1024)`);
    if (/[<>]/.test(desc)) fail(dir, 'description contains angle brackets');
    // Description = routing surface (authoring.md): a description with no
    // trigger vocabulary silently loses every routing decision. Two accepted
    // shapes exist in the corpus: an explicit "Triggers:" list, or the
    // imperative "Use when ..." form — either counts; neither present fails.
    if (!/Triggers?\b|Use when|Fires (for|when)/i.test(desc)) {
      fail(dir, 'description has no trigger surface ("Triggers:" list or "Use when ..." imperative)');
    }
  }

  if (lines.length > ROUTER_LINE_CAP) fail(dir, `SKILL.md ${lines.length} lines (>${ROUTER_LINE_CAP} router cap)`);

  // broken local references: [x](references/...) and bare references/*.md mentions
  for (const m of text.matchAll(/\((references\/[^)#\s]+)\)|\|\s*(references\/[A-Za-z0-9._-]+\.md)/g)) {
    const rel = (m[1] || m[2]);
    if (rel && !fs.existsSync(path.join(ROOT, dir, rel))) fail(dir, `broken reference link: ${rel}`);
  }
}

// Cross-reference integrity BETWEEN reference files (routers are checked above).
// Only slashed cross-skill paths whose anchor is a real skill dir are validated
// — the suite uses two equivalent conventions for these (`../../skill/references/
// x.md` resolved from the file, and `skill/references/x.md` resolved from skills/
// root), so a link is OK if EITHER resolves. Bare `foo.md` and non-skill paths
// (`docs/adr/index.md`, `NN-phase.md` placeholders) are illustrative — skipped.
const skillDirs = new Set(entries.filter(e => e.isDirectory()).map(e => e.name));
for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const refDir = path.join(ROOT, entry.name, 'references');
  let refFiles;
  try { refFiles = fs.readdirSync(refDir); } catch (e) { continue; }
  for (const rf of refFiles) {
    if (!rf.endsWith('.md')) continue;
    const t = fs.readFileSync(path.join(refDir, rf), 'utf8').replace(/^﻿/, '');
    const label = `${entry.name}/references/${rf}`;
    const mentions = new Set();
    for (const m of t.matchAll(/`([A-Za-z0-9._/-]+\.md)`/g)) mentions.add(m[1]);
    for (const m of t.matchAll(/\]\(([A-Za-z0-9._/-]+\.md)(?:#[^)]*)?\)/g)) mentions.add(m[1]);
    for (const rel of mentions) {
      if (/^https?:/i.test(rel)) continue;
      if (!rel.includes('/')) continue; // bare mention — router check + sibling discipline cover it
      const stripped = rel.replace(/^(\.\.\/)+/, '');
      if (!skillDirs.has(stripped.split('/')[0])) continue; // not a suite cross-ref (illustrative/external)
      const asFileRel = path.resolve(refDir, rel);       // ../../skill/references/x.md form
      const asRootRel = path.join(ROOT, stripped);        // skill/references/x.md form
      if (!fs.existsSync(asFileRel) && !fs.existsSync(asRootRel)) fail(label, `broken cross-reference: ${rel}`);
    }
  }
}

// Bare sibling references: `foo.md` / plain foo.md mentions with NO slash,
// found anywhere in a skill's SKILL.md, its references/*.md, or shared/*.md.
// These are informal — not path-resolved like the slashed form above — so a
// mention is OK if a file with that exact basename exists ANYWHERE in the
// suite (same skill, cross-skill, or shared/); that's enough to prove the
// mention isn't a stale/typoed reference. The names below are not suite
// files at all (generated in the consumer's project, naming-convention
// examples, or a numbered-placeholder pattern) — allowlisted, not checked.
const BARE_MD_ALLOWLIST = [
  'README.md',    // generic convention name (docs.md, git.md) — not a suite file
  'CHANGELOG.md', // generic convention name (git.md) — not a suite file
  'DESIGN.md',    // impulse-frontend generates this in the CONSUMER project, not the suite
  // impulse-humanizer style-source resolution order — all read FROM the consumer's repo
  'HUMANIZE_STYLE.md', 'CLAUDE.md', 'AGENTS.md',
  'banned-antipatterns.md', // impulse-mobile lineage citation of an external repo's `00-` prefixed file
  'IMPULSE-DEBT.md', // impulse-debt generates this at the CONSUMER repo root, not the suite
  'GEMINI.md', // real repo-root plugin file (Gemini CLI/Qwen Code contextFileName target) — outside the skills/references and shared/ resolution the suite checker walks
  'NN-phase.md',  // impulse-ai/subagents.md — placeholder for a numbered phase output file
  // impulse-goal run artifacts — all generated in the consumer's .impulse-goal/<run>/ dir, not suite files
  'ROADMAP.md', 'STATE.md', 'PROTOCOL.md', 'THINKING.md', 'phase-N.md', 'phase-N.fix.md', 'fix.md',
  'context.md', 'repo-map.md', 'applied-memories.md', 'applied-skills.md', 'tools.md',
  'MEMORY.md', // impulse memory index — generated in the consumer's memory dir, not a suite file
  // shared/memory.md tiered memory convention — generated in the CONSUMER
  // project's .impulse/memory/ dir, not suite files
  'index.md', 'YYYY-MM-DD-slug.md',
  // impulse-project-management ship-gate playbook — generated in the
  // consumer's docs/ironclad/sign-offs/ dir, not a suite file
  'shipgate.md',
  // authoring.md filler-file ban list — generic filenames named as examples
  // of what NOT to create, not suite files
  'QUICKSTART.md', 'INSTALL_NOTES.md',
  // authoring.md reference-link annotation example, illustrating the convention
  // with a filename borrowed from the lineage source, not a suite file
  'requests.md',
  // impulse-wiki generic example/generated filenames — the consumer's vault, not suite files
  'Notes.md', 'Glossary.md', 'MOC_Project.md',
  // impulse-wiki deep-dive.md page-name convention — generic team-wiki page names,
  // real files under skills/impulse-wiki/references/self-reference/ (a subdirectory
  // check-skills.js doesn't scan), not top-level suite reference files
  'Home.md', 'Getting-Started.md', 'Architecture.md', 'Decisions.md', 'MOC_Reference.md',
  'module-impulse-goal.md', 'module-impulse-wiki.md',
  'ADR-014-event-driven-communication.md', // impulse-md-generator/style.md — good-name example
  'ADR-014-the-decision-to-adopt-an-event-driven-architecture-for-services.md', // same, bad-name contrast
  // impulse-backend/references/testing.md lineage citations — link-text labels
  // for TheCodePace/fastify-skills' own rule files, not suite files
  'unit-testing.md', 'test-containers.md',
  // impulse-devops/references/k3s.md lineage citation — learnk8s/kubernetes-production-best-practices'
  // own checklist filenames (`02-your-manifests.md` / `03-your-security.md`), not suite files
  'your-manifests.md', 'your-security.md',
];
const bareAllowed = new Set(BARE_MD_ALLOWLIST);

const suiteFiles = []; // { file, label }
for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  suiteFiles.push({ file: path.join(ROOT, entry.name, 'SKILL.md'), label: `${entry.name}/SKILL.md` });
  const refDir = path.join(ROOT, entry.name, 'references');
  let refFiles;
  try { refFiles = fs.readdirSync(refDir); } catch (e) { continue; }
  for (const rf of refFiles) {
    if (rf.endsWith('.md')) suiteFiles.push({ file: path.join(refDir, rf), label: `${entry.name}/references/${rf}` });
  }
}
const SHARED_DIR = path.join(__dirname, '..', 'shared');
try {
  for (const sf of fs.readdirSync(SHARED_DIR)) {
    if (sf.endsWith('.md')) suiteFiles.push({ file: path.join(SHARED_DIR, sf), label: `shared/${sf}` });
  }
} catch (e) { /* no shared/ dir */ }

const knownBasenames = new Set(
  suiteFiles.filter(sf => fs.existsSync(sf.file)).map(sf => path.basename(sf.file))
);

for (const sf of suiteFiles) {
  if (!fs.existsSync(sf.file)) continue;
  const text = fs.readFileSync(sf.file, 'utf8').replace(/^﻿/, '');
  const reported = new Set();
  for (const m of text.matchAll(/[A-Za-z][A-Za-z0-9._-]*\.md/g)) {
    const token = m[0];
    if (text[m.index - 1] === '/') continue; // part of a slashed path — checked above
    if (bareAllowed.has(token) || knownBasenames.has(token) || reported.has(token)) continue;
    reported.add(token);
    fail(sf.label, `bare sibling reference not found in suite: ${token}`);
  }
}

if (failures === 0) console.log('check-skills: all skills pass.');
else { console.error(`check-skills: ${failures} failure(s).`); process.exit(1); }
