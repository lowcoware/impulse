---
title: Architecture
description: How the 22 skills, shared/ docs, and the validation scripts fit together.
---

# Architecture

```
impulse/
  skills/impulse-<name>/
    SKILL.md            — router: frontmatter (name/description/triggers) + workflow
    references/*.md      — loaded on demand, the actual rule bodies
    scripts/*             — deterministic operations (node/python/bash), never guessed
  shared/*.md             — cross-cutting docs every skill can cite (authoring, evals,
                            velocity, subagents, communication, completeness, context7)
  scripts/check-skills.js — frontmatter lint + cross-reference integrity, every commit
  scripts/check-sync.js   — version-anchor sync across skills
  scripts/check-versions.js — semver bump discipline
```

Every skill is independently loadable — `SKILL.md` alone must be enough to
route a request to the right `references/*.md` file, without pre-reading
every reference up front. That's the reason `check-skills.js` enforces a
150-line cap on each router file (see below): a router that grows past
that stops being a fast dispatch table.

## A real excerpt: how the suite catches a broken cross-reference

`scripts/check-skills.js` doesn't just lint frontmatter — it also verifies
that when one reference file mentions another (`skill/references/x.md`),
that file actually exists, checked from both path conventions the suite
uses interchangeably:

```js
// scripts/check-skills.js
for (const rel of mentions) {
  if (/^https?:/i.test(rel)) continue;
  if (!rel.includes('/')) continue; // bare mention — router check + sibling discipline cover it
  const stripped = rel.replace(/^(\.\.\/)+/, '');
  if (!skillDirs.has(stripped.split('/')[0])) continue; // not a suite cross-ref (illustrative/external)
  const asFileRel = path.resolve(refDir, rel);       // ../../skill/references/x.md form
  const asRootRel = path.join(ROOT, stripped);        // skill/references/x.md form
  if (!fs.existsSync(asFileRel) && !fs.existsSync(asRootRel)) fail(label, `broken cross-reference: ${rel}`);
}
```

(`scripts/check-skills.js`, from the suite's own cross-reference-integrity
pass — this is the exact mechanism that caught several stale references
during this wiki's own construction.)

## Module deep dives

- [[module-impulse-goal]] — the autonomous execution engine
- [[module-impulse-wiki]] — this skill, vault lifecycle + this wiki

Back to [[_MOC_Reference]] · Next: [[module-impulse-goal]]
