#!/usr/bin/env node
// scripts/bump-version.js — bump the patch version in every suite manifest,
// keeping them equal.
//
// Claude Code's /plugin update skips a plugin whose resolved version is
// unchanged even when file contents differ (see INSTALL.md "Update"), so
// every release push must bump — `git pushclean` runs this first.
//
// The file list comes from check-versions.js so the writer and the verifier
// can never disagree about what a manifest is.
'use strict';
const fs = require('fs');
const path = require('path');
const { MANIFESTS } = require('./check-versions.js');

const ROOT = path.join(__dirname, '..');
const SEMVER_RE = /^\d+\.\d+\.\d+$/;

for (const { file } of MANIFESTS) {
  const abs = path.join(ROOT, file);
  const manifest = JSON.parse(fs.readFileSync(abs, 'utf8'));
  if (!SEMVER_RE.test(manifest.version || '')) {
    console.error(`bump-version: ${file} version ${JSON.stringify(manifest.version)} is not a pinned X.Y.Z — fix it before bumping.`);
    process.exit(2);
  }
  const [major, minor, patch] = manifest.version.split('.').map(Number);
  const next = `${major}.${minor}.${patch + 1}`;
  console.log(`${file}: ${manifest.version} -> ${next}`);
  manifest.version = next;
  fs.writeFileSync(abs, JSON.stringify(manifest, null, 2) + '\n');
}
