---
title: impulse
description: Anti-overengineering engineering skill suite for Claude Code — Go-first backends, Vue/Nuxt frontends, review/debt/security/devops, and the planning-and-execution layer on top.
---

# impulse

impulse is a Claude Code plugin: 22 skills that push back on
overengineering across a project's whole lifecycle — backend, frontend,
review, technical debt, security, devops, plus a planning-and-execution
layer (`impulse-project-management` → `impulse-goal`) that drives a
task to done autonomously once it's specced. `impulse-help` is the
router entry point that lists all 22.

## Current focus

Every fixed-form-output skill (one that generates a specific document
shape, not free-form prose) now ships a **self-generated reference
artifact** living inside its own `references/` folder — this deep-dive
wiki you're reading is `impulse-wiki`'s own instance of that rule. See
[[Decisions]] for why.

## Where to go next

- New to the suite → [[Getting-Started]]
- Want the shape of the whole system → [[Architecture]]
- Want one module in depth → [[module-impulse-goal]] or
  [[module-impulse-wiki]]
- Want to know why a specific call was made → [[Decisions]]

Back to [[_MOC_Reference]].
