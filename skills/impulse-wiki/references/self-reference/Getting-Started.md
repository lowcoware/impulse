---
title: Getting Started
description: Install the impulse plugin and run your first command.
---

# Getting Started

Real steps, taken from the suite's own marketplace manifest
(`.claude-plugin/marketplace.json`) and plugin manifest
(`.claude-plugin/plugin.json`) — not paraphrased, the actual registered
`name` fields.

```bash
# 1. Register the marketplace (once per machine)
claude plugin marketplace add lowcoware/impulse

# 2. Install the plugin from it
claude plugin install impulse@impulse

# 3. Restart the session so the new skills load, then try:
/impulse-help
```

`impulse-help` is the router — it lists all 22 skills and what each one
is for, so it's the correct first command whether or not you already know
which skill you need.

## First thing to try

Any of the suite's trigger phrases work directly in conversation, no slash
command required — e.g. saying "review this diff" activates
`impulse-review` the same way `/impulse-review` would. Full trigger
list per skill: each skill's own `SKILL.md` frontmatter `description`
field names them explicitly.

Back to [[_MOC_Reference]] · Next: [[Architecture]]
