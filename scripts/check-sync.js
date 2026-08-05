#!/usr/bin/env node
// check-sync — verify hooks/impulse-instructions.js has not drifted from the
// skill files it summarizes. Checks a small set of anchor phrases exist in
// BOTH the compact ruleset (injected by hooks) and the corresponding SKILL.md
// / reference doc (read on demand). Not a full-text diff — a lightweight
// tripwire (ponytail check-rule-copies pattern).
//
// Usage: node scripts/check-sync.js
// Exit 0: all anchors present on both sides. Exit 1: prints named misses.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let instructions;
try {
  instructions = require(path.join(ROOT, 'hooks', 'impulse-instructions.js'));
} catch (e) {
  console.error('check-sync: hooks/impulse-instructions.js not found');
  process.exit(1);
}

const ANCHORS = [
  { id: 'backend:ladder', phrase: 'ladder', ruleset: instructions.backendRuleset('medium'), skillFile: 'skills/impulse-backend/SKILL.md' },
  { id: 'backend:baseline', phrase: 'baseline', ruleset: instructions.backendRuleset('medium'), skillFile: 'skills/impulse-backend/SKILL.md' },
  { id: 'backend:carve-out', phrase: 'carve-out', ruleset: instructions.backendRuleset('medium'), skillFile: 'skills/impulse-backend/SKILL.md' },
  { id: 'frontend:register', phrase: 'register', ruleset: instructions.frontendRuleset('medium'), skillFile: 'skills/impulse-frontend/SKILL.md' },
  { id: 'frontend:brand', phrase: 'brand', ruleset: instructions.frontendRuleset('medium'), skillFile: 'skills/impulse-frontend/SKILL.md' },
  { id: 'frontend:phosphor', phrase: 'phosphor', ruleset: instructions.frontendRuleset('medium'), skillFile: 'skills/impulse-frontend/SKILL.md' },
  { id: 'communication:caveman', phrase: 'caveman', ruleset: instructions.communicationRuleset(), skillFile: 'shared/communication.md' },
  { id: 'communication:ru-speech', phrase: 'живая', ruleset: instructions.communicationRuleset(), skillFile: 'shared/communication.md' },
];

function has(text, phrase) {
  return String(text || '').toLowerCase().includes(phrase.toLowerCase());
}

function readSkill(relPath) {
  try {
    return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  } catch (e) {
    return null; // missing file — reported as a miss below
  }
}

// --- Rule spine: builder rule <-> review tag coverage -----------------------
// shared/rule-spine.md is the ONLY crosswalk between a builder skill's rules
// and the impulse-review tag that catches each one. Before it existed,
// review's tag tables were a hand-copied subset: a rule added to
// impulse-frontend or impulse-backend stayed unreviewed until someone
// remembered to copy it across, with nothing to catch the drift. These checks
// are that tripwire — they fail when a builder gains a rule the spine doesn't
// list, or the spine cites a tag review doesn't define.

const SPINE = 'shared/rule-spine.md';

// Each: spine ID prefix <-> the owner list whose length it must match.
// `count` returns how many rules the owner file currently declares.
const SPINE_PARITY = [
  {
    id: 'FE-H',
    owner: 'skills/impulse-frontend/SKILL.md',
    what: 'hard technique rules',
    count: (t) => numbered(section(t, '## Hard technique rules')),
  },
  {
    id: 'BE-BL',
    owner: 'skills/impulse-backend/references/baseline.md',
    what: 'day-one baseline whitelist rows',
    count: (t) => tableRows(section(t, '## Whitelist')),
  },
  {
    id: 'BE-LD',
    owner: 'skills/impulse-backend/references/ladder.md',
    what: 'ladder rungs',
    count: (t) => tableRows(section(t, '## Rungs')),
  },
  {
    id: 'MO-LD',
    owner: 'skills/impulse-mobile/SKILL.md',
    what: 'platform-choice ladder rungs',
    count: (t) => numbered(section(t, '## Platform-choice ladder')),
  },
  {
    id: 'MO-BL',
    owner: 'skills/impulse-mobile/SKILL.md',
    what: 'day-one mobile baseline items',
    count: (t) => bullets(section(t, '## Day-one mobile baseline')),
  },
  {
    id: 'SE-M',
    owner: 'skills/impulse-security/SKILL.md',
    what: 'recurring mistakes',
    count: (t) => numbered(section(t, '## The two mistakes that recur most')),
  },
  {
    id: 'LG-R',
    owner: 'skills/impulse-legacy/SKILL.md',
    what: 'read-before-touch steps',
    count: (t) => numbered(section(t, '## The one rule everything else follows')),
  },
  {
    id: 'DO-CO',
    owner: 'skills/impulse-devops/references/compose.md',
    what: 'Compose rules',
    count: (t) => numbered(t),
  },
  {
    id: 'DO-DF',
    owner: 'skills/impulse-devops/references/dockerfile.md',
    what: 'Dockerfile rules',
    count: (t) => numbered(t),
  },
  {
    id: 'DO-CI',
    owner: 'skills/impulse-devops/references/ci.md',
    what: 'GitHub Actions rules',
    count: (t) => numbered(t),
  },
];

// Where a spine tag has to be defined for a finding to be emittable.
const TAG_HOMES = [
  'skills/impulse-review/SKILL.md',
  'skills/impulse-review/references/tags.md',
];

function section(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) return '';
  const rest = text.slice(start + heading.length);
  const end = rest.search(/\r?\n#{2,3} /);
  return end === -1 ? rest : rest.slice(0, end);
}

// Body rows of the first markdown table in `text` (header + separator dropped).
function tableRows(text) {
  const rows = text.split(/\r?\n/).filter((l) => /^\|/.test(l.trim()));
  return Math.max(0, rows.length - 2);
}

// Top-level list items. Continuation lines are indented, so anchoring at column
// zero counts each rule once no matter how many lines it wraps to. `numbered`
// deliberately ignores the number itself — a hand-renumbered list still counts
// right, and a duplicated "1." doesn't silently deflate the total.
function numbered(text) {
  return text.split(/\r?\n/).filter((l) => /^\d+\.\s/.test(l)).length;
}

function bullets(text) {
  return text.split(/\r?\n/).filter((l) => /^- /.test(l)).length;
}

function checkSpine(misses) {
  const spine = readSkill(SPINE);
  if (spine === null) {
    misses.push('spine: ' + SPINE + ' not found — the builder<->review crosswalk is the glue, it cannot be absent');
    return;
  }

  for (const p of SPINE_PARITY) {
    const ownerText = readSkill(p.owner);
    if (ownerText === null) {
      misses.push('spine:' + p.id + ': owner ' + p.owner + ' not found');
      continue;
    }
    // Spine rows are `| FE-H07 | ...`; ids may also be cited in prose, so only
    // count the ones in leading table-cell position.
    const ids = new Set();
    const re = new RegExp('^\\|\\s*(' + p.id + '\\d+)\\s*\\|', 'gm');
    for (const m of spine.matchAll(re)) ids.add(m[1]);

    const declared = p.count(ownerText);
    if (process.argv.includes('--verbose')) {
      console.log('  ' + p.id.padEnd(7) + ' owner declares ' + String(declared).padStart(2) +
        ', spine has ' + String(ids.size).padStart(2) + '  (' + p.what + ')');
    }
    if (declared === 0) {
      misses.push('spine:' + p.id + ': found no ' + p.what + ' in ' + p.owner + ' — parser drifted from the file shape, fix the check');
    } else if (ids.size !== declared) {
      misses.push(
        'spine:' + p.id + ': ' + p.owner + ' declares ' + declared + ' ' + p.what +
        ' but ' + SPINE + ' has ' + ids.size + ' ' + p.id + ' rows — a rule with no spine row is invisible to impulse-review'
      );
    }
  }

  // Every tag the spine routes to must be defined somewhere review reads.
  const tagHomes = TAG_HOMES.map(readSkill).filter((t) => t !== null).join('\n');
  if (!tagHomes) {
    misses.push('spine: none of the tag homes readable (' + TAG_HOMES.join(', ') + ')');
    return;
  }
  // Any spine ID prefix, not a hardcoded list — a new domain's rows must be
  // checked the day they land, not the day someone remembers to widen this.
  const tags = new Set();
  for (const line of spine.split(/\r?\n/)) {
    if (!/^\|\s*[A-Z]{2}-[A-Z]*\d+\s*\|/.test(line)) continue;
    const last = line.split('|').slice(-2)[0] || '';
    for (const m of last.matchAll(/`([a-z]+:[a-z]*)`/g)) tags.add(m[1]);
  }
  for (const tag of tags) {
    if (!tagHomes.includes('`' + tag + '`')) {
      misses.push('spine: tag `' + tag + '` is routed to by ' + SPINE + ' but defined in neither ' + TAG_HOMES.join(' nor '));
    }
  }

  // Every spine ID cited anywhere in skills/ or shared/ must exist as a spine
  // row — otherwise renumbering a rule silently strands its citations in
  // review examples, tag tables, and builder cross-references.
  const rowIds = new Set();
  for (const m of spine.matchAll(/^\|\s*([A-Z]{2}-[A-Z]*\d+)\s*\|/gm)) rowIds.add(m[1]);
  const mdFiles = [];
  (function walk(dir) {
    let entries2;
    try { entries2 = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }); } catch (e) { return; }
    for (const e of entries2) {
      const rel = path.join(dir, e.name);
      if (e.isDirectory()) walk(rel);
      else if (e.name.endsWith('.md') && rel !== SPINE) mdFiles.push(rel);
    }
  })('skills');
  for (const f of fs.readdirSync(path.join(ROOT, 'shared'))) {
    if (f.endsWith('.md') && path.join('shared', f) !== SPINE) mdFiles.push(path.join('shared', f));
  }
  for (const f of mdFiles) {
    const t = readSkill(f);
    if (t === null) continue;
    for (const m of t.matchAll(/\b((?:FE|BE|MO|DO|SE|LG)-[A-Z]*\d+)\b/g)) {
      if (!rowIds.has(m[1])) {
        misses.push('spine: ' + f + ' cites ' + m[1] + ' which is not a row in ' + SPINE);
      }
    }
  }

  // impulse-help is a static card that mirrors the tag set. A card that lists
  // some of the tags reads as listing all of them, so a missing one is worse
  // than no card — same drift class this whole check exists to kill. Compared on
  // the base tag only: `over:yagni` counts as `over:`, because enumerating seven
  // ladder sub-labels is what the one-screen card deliberately doesn't do.
  const card = readSkill('skills/impulse-help/SKILL.md');
  if (card === null) {
    misses.push('spine: skills/impulse-help/SKILL.md not found');
  } else {
    const base = new Set([...tags].map((t) => t.split(':')[0] + ':'));
    for (const tag of base) {
      if (!card.includes('`' + tag + '`')) {
        misses.push('spine: tag `' + tag + '` missing from the impulse-help reference card');
      }
    }
  }
}

function main() {
  const misses = [];
  checkSpine(misses);

  for (const anchor of ANCHORS) {
    const inInstructions = has(anchor.ruleset, anchor.phrase);
    const skillText = readSkill(anchor.skillFile);
    const inSkill = skillText !== null && has(skillText, anchor.phrase);

    if (!inInstructions) {
      misses.push(anchor.id + ': phrase "' + anchor.phrase + '" missing from hooks/impulse-instructions.js');
    }
    if (skillText === null) {
      misses.push(anchor.id + ': ' + anchor.skillFile + ' not found');
    } else if (!inSkill) {
      misses.push(anchor.id + ': phrase "' + anchor.phrase + '" missing from ' + anchor.skillFile);
    }
  }

  if (misses.length > 0) {
    console.error('check-sync: ' + misses.length + ' miss(es):');
    for (const m of misses) console.error('  - ' + m);
    process.exit(1);
  }

  console.log('check-sync: ' + ANCHORS.length + '/' + ANCHORS.length + ' anchors in sync, rule spine covered.');
  process.exit(0);
}

main();
