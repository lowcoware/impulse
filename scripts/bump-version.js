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
  const isYaml = file.endsWith('.yaml') || file.endsWith('.yml');
  const raw = fs.readFileSync(abs, 'utf8').replace(/^﻿/, '');

  let current;
  if (isYaml) {
    const m = raw.match(/^version:\s*['"]?(\S+?)['"]?\s*$/m);
    current = m ? m[1] : undefined;
  } else {
    try {
      current = JSON.parse(raw).version;
    } catch (e) {
      console.error(`bump-version: ${file} unreadable/unparseable: ${e.message}`);
      process.exit(2);
    }
  }

  if (!SEMVER_RE.test(current || '')) {
    console.error(`bump-version: ${file} version ${JSON.stringify(current)} is not a pinned X.Y.Z — fix it before bumping.`);
    process.exit(2);
  }
  const [major, minor, patch] = current.split('.').map(Number);
  const next = `${major}.${minor}.${patch + 1}`;
  console.log(`${file}: ${current} -> ${next}`);

  if (isYaml) {
    const updated = raw.replace(/^version:\s*['"]?\S+?['"]?\s*$/m, `version: ${next}`);
    fs.writeFileSync(abs, updated);
  } else {
    const manifest = JSON.parse(raw);
    manifest.version = next;
    fs.writeFileSync(abs, JSON.stringify(manifest, null, 2) + '\n');
  }
}
