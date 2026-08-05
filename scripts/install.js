#!/usr/bin/env node
// scripts/install.js — cross-CLI installer.
//
// Places this suite's SKILL.md + references/ (agentskills.io format, this
// suite's native origin) into one of five CLIs' extension directories.
// Content-port, not feature-port: hooks (mode flag, ruleset injection,
// SubagentStart), the statusline badge, and /impulse-* slash activation are
// Claude Code plugin-only and are never synthesized for other targets — see
// INSTALL.md "what does NOT port" per target. Placement facts were verified
// against vendor docs 2026-07-04; re-verify before trusting this script
// against a newer CLI release.
//
// Usage:
//   node scripts/install.js --target=<t> [--scope=project|user]
//                           [--project-dir=PATH] [--apply] [--uninstall]
//                           [--dry-run] [--help]
//
// No interactive prompts, ever (shared/authoring.md script rules). Default
// (no --apply) is dry-run: prints the exact copy plan, writes nothing.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

// Parse `name:` + `description:` out of a SKILL.md frontmatter block
// (single-line quoted or folded `>-` block). Mirrors check-skills.js.
function parseSkillFrontmatter(text) {
  const clean = text.replace(/^﻿/, '');
  const fmMatch = clean.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;
  const fm = fmMatch[1];
  const name = (fm.match(/^name:\s*(.+)$/m) || [])[1];
  let desc = '';
  const descLine = fm.match(/^description:\s*(?:>-?\s*)?(.*)$/m);
  if (descLine) {
    desc = descLine[1];
    if (desc === '' || /^>-?$/.test(descLine[0].split(':')[1]?.trim() || '')) {
      const after = fm.slice(fm.indexOf(descLine[0]) + descLine[0].length);
      desc = after.split(/\r?\n/).filter(l => /^\s+\S/.test(l)).map(l => l.trim()).join(' ');
      desc = desc.split(/\s(?=[a-z-]+:)/)[0] || desc;
    }
  }
  desc = desc.replace(/^["']|["']$/g, '').trim();
  if (!name || !desc) return null;
  return { name: name.trim(), description: desc };
}

const SUITE_ROOT = path.join(__dirname, '..');
const SKILLS_SRC = path.join(SUITE_ROOT, 'skills');
const SHARED_SRC = path.join(SUITE_ROOT, 'shared');

const TARGETS = ['claude', 'cursor', 'codex', 'antigravity', 'opencode'];
const SCOPES = ['project', 'user'];

// Hard per-target caps this script enforces before ever copying a byte.
// Source: vendor docs (Codex: name<=64 == dir, description<=1024;
// Antigravity and OpenCode share the same underlying skill spec/caps).
const NAME_MAX = 64;
const DESC_MAX = 1024;

const HELP = `install.js — cross-CLI installer

Usage:
  node scripts/install.js --target=<target> [options]
  node scripts/install.js --help

Targets (verified 2026-07-04):
  claude       .claude/skills/<skill>/          (project) or
               ~/.claude/skills/<skill>/         (user)
  cursor       alias of claude — Cursor reads .claude/skills/ natively;
               no separate .cursor/ copy is written.
  codex        .agents/skills/<skill>/          (project) or
               ~/.agents/skills/<skill>/         (user)
               Validates frontmatter: name<=${NAME_MAX} chars, == dir name,
               lowercase letters/digits with single hyphens;
               description<=${DESC_MAX} chars. Violations are reported, never
               silently truncated, and fail the run (exit 2).
  antigravity  .agents/skills/<skill>/          (project — SAME directory as
               codex; if codex is already installed there, that IS the
               antigravity install too) or
               ~/.gemini/config/skills/<skill>/  (user)
  opencode     .agents/skills/<skill>/          (project — SAME directory as
               codex/antigravity) or
               ~/.config/opencode/skills/<skill>/ (user)
               OpenCode also reads .claude/skills/ and .agents/skills/
               natively at BOTH scopes — if any other target is already
               installed in this project or user home, OpenCode already
               sees it; this target only matters for a from-scratch,
               OpenCode-only setup. Same frontmatter validation as codex.

Options:
  --target=claude|cursor|codex|antigravity|opencode   required
  --scope=project|user                       default: project
  --project-dir=PATH                         default: current directory
                                              (project scope only; ignored
                                              for --scope=user)
  --apply                                    write changes (default: dry-run
                                              — print the plan, write nothing)
  --dry-run                                  explicit no-write mode (this is
                                              the default; conflicts with
                                              --apply)
  --uninstall                                remove exactly what an install
                                              at this target+scope would have
                                              created, instead of installing
  --help, -h                                 show this help and exit 0

Every plan line (source -> destination, or removal) is printed; a summary
(skills, files, target, scope, mode) prints at the end.

Shared files: shared/*.md (cross-skill authoring/eval notes) are copied
alongside the skills into a "impulse-shared/" folder at the target's root
(e.g. .claude/impulse-shared/, .agents/impulse-shared/, ~/.gemini/config/impulse-shared/).
Skills reference shared/*.md and cross-skill references/*.md by relative
path; this installer places files, it does not rewrite links — deep
cross-skill links degrade gracefully outside Claude Code (pointers for a
human or agent to follow, not hard imports). See INSTALL.md.

Idempotent: re-running --apply overwrites this suite's own skill folders and
impulse-shared/ in place; it never touches sibling entries (other skills/plugins
already present in the same directory).

Exit codes: 0 = ran clean; 1 = usage/argument error; 2 = one or more skills
failed frontmatter validation (install mode only) and were skipped.
`;

function usageFail(msg) {
  console.error(`install: ${msg}`);
  console.error('Run with --help for usage.');
  process.exit(1);
}

function parseArgs(argv) {
  const opts = {
    target: null, scope: 'project', projectDir: null,
    apply: false, dryRunFlag: false, uninstall: false, help: false,
  };
  for (const a of argv) {
    let m;
    if (a === '--help' || a === '-h') { opts.help = true; continue; }
    if (a === '--apply') { opts.apply = true; continue; }
    if (a === '--dry-run') { opts.dryRunFlag = true; continue; }
    if (a === '--uninstall') { opts.uninstall = true; continue; }
    if ((m = a.match(/^--target=(.*)$/))) { opts.target = m[1]; continue; }
    if ((m = a.match(/^--scope=(.*)$/))) { opts.scope = m[1]; continue; }
    if ((m = a.match(/^--project-dir=(.*)$/))) { opts.projectDir = m[1]; continue; }
    usageFail(`unrecognized argument '${a}'.`);
  }
  return opts;
}

// --- suite introspection -------------------------------------------------

function listSkillDirs() {
  return fs.readdirSync(SKILLS_SRC, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort();
}

function listSharedFiles() {
  let names;
  try { names = fs.readdirSync(SHARED_SRC); } catch (e) { return []; }
  return names.filter(f => f.endsWith('.md')).sort();
}

// Recursively collect files under `dirAbs`, returned as paths relative to
// `srcRoot` (posix-joined with path.join so this stays Windows/POSIX-safe).
function walkFiles(dirAbs, srcRoot, out) {
  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    const abs = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) walkFiles(abs, srcRoot, out);
    else out.push(path.relative(srcRoot, abs));
  }
}

// SKILL.md + references/** only (this suite's runtime-relevant assets).
function collectSkillFiles(skillName) {
  const srcDir = path.join(SKILLS_SRC, skillName);
  const files = [];
  if (fs.existsSync(path.join(srcDir, 'SKILL.md'))) files.push('SKILL.md');
  const refDir = path.join(srcDir, 'references');
  if (fs.existsSync(refDir)) walkFiles(refDir, srcDir, files);
  return files;
}

// Exactly the checks vendor docs document as hard caps for
// Codex/Antigravity/OpenCode's shared skill spec. Reports every violation
// found; never truncates a name/description to make it fit.
// Name charset (OpenCode spec): lowercase letters/digits, single hyphens,
// no leading/trailing hyphen, no '--'.
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function validateSkill(skillName) {
  const violations = [];
  const skillPath = path.join(SKILLS_SRC, skillName, 'SKILL.md');
  const text = fs.readFileSync(skillPath, 'utf8');
  const fm = parseSkillFrontmatter(text);
  if (!fm) { violations.push('frontmatter unparseable (missing name/description)'); return violations; }
  if (fm.name.length > NAME_MAX) violations.push(`name '${fm.name}' is ${fm.name.length} chars (cap ${NAME_MAX})`);
  if (fm.name !== skillName) violations.push(`name '${fm.name}' != directory '${skillName}'`);
  if (!NAME_RE.test(fm.name)) violations.push(`name '${fm.name}' violates charset (lowercase letters/digits, single hyphens, no leading/trailing hyphen)`);
  if (fm.description.length > DESC_MAX) violations.push(`description is ${fm.description.length} chars (cap ${DESC_MAX})`);
  return violations;
}

// --- per-target placement (verified 2026-07-04) --

function placement(target, scope, projectDir) {
  const home = os.homedir();
  if (target === 'claude' || target === 'cursor') {
    // Cursor loads .claude/skills/ directly for compatibility — no
    // separate .cursor/skills/ copy is needed.
    return scope === 'user'
      ? { skillsRoot: path.join(home, '.claude', 'skills'), sharedRoot: path.join(home, '.claude', 'impulse-shared') }
      : { skillsRoot: path.join(projectDir, '.claude', 'skills'), sharedRoot: path.join(projectDir, '.claude', 'impulse-shared') };
  }
  if (target === 'codex') {
    return scope === 'user'
      ? { skillsRoot: path.join(home, '.agents', 'skills'), sharedRoot: path.join(home, '.agents', 'impulse-shared') }
      : { skillsRoot: path.join(projectDir, '.agents', 'skills'), sharedRoot: path.join(projectDir, '.agents', 'impulse-shared') };
  }
  if (target === 'antigravity') {
    // Project scope is deliberately identical to codex's project scope —
    // both CLIs read the same .agents/skills/ tree.
    return scope === 'user'
      ? { skillsRoot: path.join(home, '.gemini', 'config', 'skills'), sharedRoot: path.join(home, '.gemini', 'config', 'impulse-shared') }
      : { skillsRoot: path.join(projectDir, '.agents', 'skills'), sharedRoot: path.join(projectDir, '.agents', 'impulse-shared') };
  }
  if (target === 'opencode') {
    // Project scope is deliberately identical to codex/antigravity's —
    // OpenCode reads .agents/skills/ natively. User scope is OpenCode's own.
    return scope === 'user'
      ? { skillsRoot: path.join(home, '.config', 'opencode', 'skills'), sharedRoot: path.join(home, '.config', 'opencode', 'impulse-shared') }
      : { skillsRoot: path.join(projectDir, '.agents', 'skills'), sharedRoot: path.join(projectDir, '.agents', 'impulse-shared') };
  }
  throw new Error(`unknown target '${target}'`);
}

function printTargetNotes(target, scope, skillsRoot, skills) {
  const notes = [];
  if (target === 'claude') {
    notes.push('Note: native marketplace install is the richer path — it also wires hooks');
    notes.push('(mode flag, ruleset injection, SubagentStart), the statusline badge, and');
    notes.push('/impulse-* slash activation, none of which a bare skill copy can provide:');
    notes.push(`  1. /plugin marketplace add ${SUITE_ROOT}`);
    notes.push('  2. /plugin install impulse@impulse');
    notes.push('  3. restart the session, verify with /impulse-help');
  }
  if (target === 'cursor') {
    notes.push('Note: Cursor reads .claude/skills/ natively — no');
    notes.push('separate .cursor/skills/ copy is written. --target=cursor verifies/creates');
    notes.push('the same .claude/skills/ tree --target=claude would.');
  }
  if (target === 'antigravity' && scope === 'project') {
    notes.push(`Note: Antigravity project scope (${path.join('<project-dir>', '.agents', 'skills')}) is the`);
    notes.push('SAME directory Codex uses at project scope.');
    if (fs.existsSync(skillsRoot) && skills.some(s => fs.existsSync(path.join(skillsRoot, s)))) {
      notes.push('Detected: skills already present here (likely from a prior --target=codex');
      notes.push('install) — that install already satisfies antigravity; nothing further needed.');
    }
  }
  if (target === 'opencode') {
    notes.push('Note: OpenCode natively reads .claude/skills/ AND .agents/skills/ at both');
    notes.push('project and user scope, alongside its own tree — a prior --target=claude or');
    notes.push('--target=codex/antigravity install in this project or home directory may');
    notes.push('already be visible to OpenCode with zero further steps.');
    const home = os.homedir();
    // skillsRoot for opencode project scope IS <projectDir>/.agents/skills —
    // strip the two segments back to projectDir rather than threading a
    // second parameter through just for this note.
    const projectDir = scope === 'project' ? path.dirname(path.dirname(skillsRoot)) : null;
    const claudeAlt = scope === 'user' ? path.join(home, '.claude', 'skills') : path.join(projectDir, '.claude', 'skills');
    const agentsAlt = scope === 'user' ? path.join(home, '.agents', 'skills') : path.join(projectDir, '.agents', 'skills');
    // OpenCode reads .claude/skills/ and .agents/skills/ at BOTH scopes
    // (user scope: ~/.claude/skills, ~/.agents/skills — e.g. a prior
    // codex --scope=user install is already visible).
    const alreadyClaude = fs.existsSync(claudeAlt) && skills.some(s => fs.existsSync(path.join(claudeAlt, s)));
    const alreadyAgents = fs.existsSync(agentsAlt) && skills.some(s => fs.existsSync(path.join(agentsAlt, s)));
    if (alreadyClaude) notes.push(`Detected: skills already present at ${claudeAlt} — OpenCode already sees them.`);
    if (alreadyAgents) notes.push(`Detected: skills already present at ${agentsAlt} — OpenCode already sees them.`);
  }
  if (notes.length) { console.log(notes.join('\n')); console.log(''); }
}

// --- install / uninstall -------------------------------------------------

// Fixed-width action tags so plan/copy/remove/skip lines column-align.
function tag(t) { return t.padEnd(9); }

function doInstall({ skillsRoot, sharedRoot, skills, apply, target, scope }) {
  let fileCount = 0;
  let skillCount = 0;
  let violationCount = 0;
  const skipped = [];

  for (const skillName of skills) {
    const violations = validateSkill(skillName);
    if (violations.length) {
      violationCount += violations.length;
      skipped.push(skillName);
      console.error(`VALIDATION FAIL ${skillName}:`);
      for (const v of violations) console.error(`  - ${v}`);
      continue;
    }
    const files = collectSkillFiles(skillName);
    const srcDir = path.join(SKILLS_SRC, skillName);
    const destDir = path.join(skillsRoot, skillName);
    // Idempotent update-in-place: wipe only THIS skill's own dest folder
    // (never the shared skillsRoot — other tools/skills may live there).
    if (apply) fs.rmSync(destDir, { recursive: true, force: true });
    for (const rel of files) {
      const src = path.join(srcDir, rel);
      const dest = path.join(destDir, rel);
      console.log(`${tag(apply ? '[copy]' : '[plan]')}${skillName}: ${src} -> ${dest}`);
      if (apply) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
      }
      fileCount++;
    }
    skillCount++;
  }

  const sharedFiles = listSharedFiles();
  if (sharedFiles.length) {
    if (apply) fs.rmSync(sharedRoot, { recursive: true, force: true });
    for (const f of sharedFiles) {
      const src = path.join(SHARED_SRC, f);
      const dest = path.join(sharedRoot, f);
      console.log(`${tag(apply ? '[copy]' : '[plan]')}impulse-shared: ${src} -> ${dest}`);
      if (apply) {
        fs.mkdirSync(sharedRoot, { recursive: true });
        fs.copyFileSync(src, dest);
      }
      fileCount++;
    }
  }

  console.log('');
  console.log('SUMMARY');
  console.log(`  target: ${target} | scope: ${scope} | mode: ${apply ? 'APPLY (written)' : 'DRY-RUN (nothing written)'}`);
  console.log(`  skills: ${skillCount}/${skills.length} installed${skipped.length ? `, ${skipped.length} skipped (${skipped.join(', ')})` : ''}`);
  console.log(`  files ${apply ? 'copied' : 'planned'}: ${fileCount}`);

  if (violationCount > 0) {
    console.error(`  validation failures: ${violationCount} — fix frontmatter and re-run.`);
    process.exit(2);
  }
  process.exit(0);
}

function doUninstall({ skillsRoot, sharedRoot, skills, apply, target, scope }) {
  let removed = 0;
  let alreadyAbsent = 0;

  for (const skillName of skills) {
    const destDir = path.join(skillsRoot, skillName);
    if (fs.existsSync(destDir)) {
      console.log(`${tag(apply ? '[remove]' : '[plan]')}${skillName}: ${destDir}`);
      if (apply) fs.rmSync(destDir, { recursive: true, force: true });
      removed++;
    } else {
      console.log(`${tag('[skip]')}${skillName}: ${destDir} (not present)`);
      alreadyAbsent++;
    }
  }

  if (fs.existsSync(sharedRoot)) {
    console.log(`${tag(apply ? '[remove]' : '[plan]')}impulse-shared: ${sharedRoot}`);
    if (apply) fs.rmSync(sharedRoot, { recursive: true, force: true });
    removed++;
  } else {
    console.log(`${tag('[skip]')}impulse-shared: ${sharedRoot} (not present)`);
    alreadyAbsent++;
  }

  console.log('');
  console.log('SUMMARY');
  console.log(`  target: ${target} | scope: ${scope} | mode: ${apply ? 'APPLY (removed)' : 'DRY-RUN (nothing removed)'}`);
  console.log(`  entries removed: ${removed}`);
  console.log(`  entries already absent: ${alreadyAbsent}`);
  process.exit(0);
}

// --- main ------------------------------------------------------------

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { console.log(HELP); process.exit(0); }

  if (!opts.target) usageFail('missing --target=claude|cursor|codex|antigravity|opencode.');
  if (!TARGETS.includes(opts.target)) usageFail(`--target must be one of ${TARGETS.join('|')} (got '${opts.target}').`);
  if (!SCOPES.includes(opts.scope)) usageFail(`--scope must be 'project' or 'user' (got '${opts.scope}').`);
  if (opts.apply && opts.dryRunFlag) usageFail('cannot combine --apply and --dry-run.');

  const projectDir = opts.scope === 'project' ? path.resolve(opts.projectDir || process.cwd()) : null;
  const skills = listSkillDirs();
  const { skillsRoot, sharedRoot } = placement(opts.target, opts.scope, projectDir);
  const apply = opts.apply;
  const mode = opts.uninstall ? 'uninstall' : 'install';

  console.log(`impulse install — target=${opts.target} scope=${opts.scope} mode=${mode} ${apply ? '(APPLY)' : '(DRY-RUN — nothing written; pass --apply to execute)'}`);
  if (projectDir) console.log(`project-dir: ${projectDir}`);
  console.log(`source (this suite): ${SKILLS_SRC}`);
  console.log(`dest skills root:    ${skillsRoot}`);
  console.log(`dest shared root:    ${sharedRoot}`);
  console.log('');

  printTargetNotes(opts.target, opts.scope, skillsRoot, skills);

  if (mode === 'uninstall') {
    doUninstall({ skillsRoot, sharedRoot, skills, apply, target: opts.target, scope: opts.scope });
  } else {
    doInstall({ skillsRoot, sharedRoot, skills, apply, target: opts.target, scope: opts.scope });
  }
}

try {
  main();
} catch (e) {
  console.error(`install: unexpected error: ${e.message}`);
  process.exit(1);
}
