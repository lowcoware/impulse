#!/usr/bin/env node
// check-versions — verify every version-bearing manifest agrees.
//
// The suite ships one manifest per host (Claude Code, Antigravity, and one
// per adapter as those land). They carry the same version by necessity, and
// nothing stops them drifting: bump-version.js writes the list below, but a
// hand-edit or a newly added manifest silently breaks the set. Claude Code's
// /plugin update keys on `version`, so a stale manifest means users never
// get the update (INSTALL.md "Update").
//
// Three checks:
//   1. every listed manifest exists and carries a pinned X.Y.Z version
//   2. all listed versions are identical
//   3. on a release-tag CI run, that shared version equals the tag
// Plus a discovery pass: a tracked *.json carrying a top-level `version`
// that is NOT in MANIFESTS fails the run — that is the "added a manifest,
// forgot to list it" case the other three checks cannot see.
//
// Usage: node scripts/check-versions.js [--help]
// Exit 0: consistent. 1: usage error. 2: one or more violations.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// Every manifest that must carry the suite version, with the host it serves.
// Adding an adapter means adding its manifest here — the discovery pass below
// fails the run until you do.
const MANIFESTS = [
  { file: '.claude-plugin/plugin.json', host: 'Claude Code plugin (hooks)' },
  { file: 'plugin.json', host: 'Antigravity plugin bundle / Goose Open Plugin' },
  { file: 'gemini-extension.json', host: 'Gemini CLI extension (also read by Qwen Code)' },
];

// Tracked JSON that legitimately carries a `version` key without being a
// suite manifest (schema declarations, lockfiles).
const VERSION_KEY_EXEMPT = [
  'package-lock.json',
];

// Vendored third-party trees carry their own upstream version — not ours to
// keep in step with the suite.
const VENDOR_PATH_RE = /(^|\/)vendor\//;

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

const HELP = `check-versions — verify every version-bearing manifest agrees

Usage:
  node scripts/check-versions.js
  node scripts/check-versions.js --help

Checks:
  1. Each manifest in MANIFESTS exists and has a pinned X.Y.Z version
     (no ranges, no pre-release suffixes — /plugin update compares exact
     strings).
  2. All manifest versions are identical.
  3. On a release-tag CI run (GITHUB_REF=refs/tags/...), the shared version
     equals the tag, with an optional leading "v" stripped. Off a tag this
     check is skipped, not failed.
  4. Discovery: any tracked *.json with a top-level "version" that is not
     listed in MANIFESTS fails the run, so a newly added adapter manifest
     cannot silently drift.

Exit codes: 0 = consistent; 1 = usage error; 2 = one or more violations.
`;

function readManifest(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return { error: 'file not found' };
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (e) {
    return { error: 'unparseable JSON: ' + e.message };
  }
  if (!Object.prototype.hasOwnProperty.call(parsed, 'version')) {
    return { error: 'no "version" key' };
  }
  return { version: parsed.version };
}

// Tracked *.json carrying a top-level string `version`. Uses git so untracked
// scratch files and node_modules never enter the set; no git = skip the pass
// rather than fail (a tarball install has no repo).
function discoverVersionedJson() {
  let listed;
  try {
    listed = execFileSync('git', ['ls-files', '*.json'], { cwd: ROOT, encoding: 'utf8' });
  } catch (e) {
    return null;
  }
  const found = [];
  for (const rel of listed.split('\n').filter(Boolean)) {
    if (VERSION_KEY_EXEMPT.includes(path.basename(rel))) continue;
    if (VENDOR_PATH_RE.test(rel)) continue;
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    } catch (e) {
      continue; // malformed JSON is check-skills' problem, not ours
    }
    if (parsed && typeof parsed === 'object' && typeof parsed.version === 'string') {
      found.push(rel.split(path.sep).join('/'));
    }
  }
  return found;
}

// refs/tags/v1.2.3 -> 1.2.3. Returns null when not a tag run.
function releaseTagVersion() {
  const ref = process.env.GITHUB_REF || '';
  if (!ref.startsWith('refs/tags/')) return null;
  return ref.slice('refs/tags/'.length).replace(/^v/, '');
}

function main() {
  if (process.argv.slice(2).some(a => a === '--help' || a === '-h')) {
    console.log(HELP);
    process.exit(0);
  }
  if (process.argv.length > 2) {
    console.error('check-versions: unrecognized argument. Run with --help for usage.');
    process.exit(1);
  }

  const violations = [];
  const versions = new Map();

  for (const { file, host } of MANIFESTS) {
    const result = readManifest(file);
    if (result.error) {
      violations.push(`${file} (${host}): ${result.error}`);
      continue;
    }
    if (typeof result.version !== 'string' || !SEMVER_RE.test(result.version)) {
      violations.push(`${file}: version ${JSON.stringify(result.version)} is not a pinned X.Y.Z`);
      continue;
    }
    versions.set(file, result.version);
    console.log(`  ${file} -> ${result.version}  (${host})`);
  }

  const distinct = [...new Set(versions.values())];
  if (distinct.length > 1) {
    violations.push(`manifests disagree: ${[...versions].map(([f, v]) => `${f}=${v}`).join(', ')}`);
  }

  const shared = distinct.length === 1 ? distinct[0] : null;

  const tagVersion = releaseTagVersion();
  if (tagVersion !== null) {
    if (shared === null) {
      violations.push(`release tag ${tagVersion}: cannot verify, manifests do not share one version`);
    } else if (shared !== tagVersion) {
      violations.push(`release tag is ${tagVersion} but manifests carry ${shared}`);
    } else {
      console.log(`  release tag matches: ${tagVersion}`);
    }
  }

  const discovered = discoverVersionedJson();
  if (discovered === null) {
    console.log('  discovery: skipped (not a git checkout)');
  } else {
    const known = new Set(MANIFESTS.map(m => m.file));
    for (const rel of discovered) {
      if (!known.has(rel)) {
        violations.push(`${rel} carries a top-level "version" but is not in MANIFESTS — add it (or drop the key)`);
      }
    }
    for (const { file } of MANIFESTS) {
      if (!discovered.includes(file) && fs.existsSync(path.join(ROOT, file))) {
        violations.push(`${file} is listed in MANIFESTS but is not tracked by git`);
      }
    }
  }

  if (violations.length) {
    console.error(`check-versions: ${violations.length} violation(s):`);
    for (const v of violations) console.error('  - ' + v);
    process.exit(2);
  }

  console.log(`check-versions: ${versions.size}/${MANIFESTS.length} manifests agree on ${shared}.`);
  process.exit(0);
}

// MANIFESTS is the one list of version-bearing files; bump-version.js writes
// exactly what this script verifies. Only run the check when invoked directly.
module.exports = { MANIFESTS };

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(`check-versions: unexpected error: ${e.message}`);
    process.exit(1);
  }
}
