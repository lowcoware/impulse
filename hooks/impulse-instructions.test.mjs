// Tests for the injection payload builder — the always-paid layer, so its
// shape regressions are expensive. Run: node --test hooks/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const i = require('./impulse-instructions.js');

test('core-only payload: header + core + communication, no domain blocks', () => {
  const out = i.getImpulseInstructions(null, true);
  assert.match(out, /^IMPULSE CORE ACTIVE/);
  assert.match(out, /impulse-core active/);
  assert.match(out, /## Communication/);
  assert.doesNotMatch(out, /impulse-backend active/);
  assert.doesNotMatch(out, /impulse-frontend active/);
});

test('domain + core: header carries core flag, core block precedes domain', () => {
  const out = i.getImpulseInstructions({ backend: true, frontend: false, mode: 'blitz' }, true);
  assert.match(out.split('\n')[0], /IMPULSE MODE ACTIVE — backend — mode: blitz — core: on/);
  const coreIdx = out.indexOf('impulse-core active');
  const beIdx = out.indexOf('impulse-backend active');
  assert.ok(coreIdx !== -1 && beIdx !== -1 && coreIdx < beIdx);
});

test('domain without core: no core block, no core flag in header', () => {
  const out = i.getImpulseInstructions({ backend: false, frontend: true, mode: 'medium' }, false);
  assert.doesNotMatch(out, /core: on/);
  assert.doesNotMatch(out, /impulse-core active/);
  assert.match(out, /impulse-frontend active/);
});

test('nothing active: empty string', () => {
  assert.equal(i.getImpulseInstructions(null, false), '');
  assert.equal(i.getImpulseInstructions({ backend: false, frontend: false, mode: 'medium' }, false), '');
});

test('invalid mode falls back to medium', () => {
  const out = i.getImpulseInstructions({ backend: true, frontend: false, mode: 'turbo' }, false);
  assert.match(out, /mode: medium/);
});

test('coreRuleset carries every check-sync anchor phrase', () => {
  const core = i.coreRuleset().toLowerCase();
  for (const phrase of ['first rung that holds', 'upgrade trigger', 'escalation', 'tokens-of-answer', '.impulse/memory', 'stop at done', 'drive-by']) {
    assert.ok(core.includes(phrase), `missing anchor: ${phrase}`);
  }
});
