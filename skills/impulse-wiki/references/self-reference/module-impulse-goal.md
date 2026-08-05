---
title: "Module: impulse-goal"
description: The suite's autonomous execution engine — plans, then drives a task to done under a single /goal.
---

# Module: impulse-goal

What it's for: after a plan exists (from `impulse-project-management`, or
made from a raw prompt), this skill decomposes it into phases and hands
off ONE `/goal` line that drives every phase to done autonomously, with
per-phase verify and 3-strike recovery.

## Real entry point: claiming a run directory

Two `/impulse-goal` runs in the same working tree used to default to the
same flat `.impulse-goal/` directory and clobber each other's
`STATE.md`/`ROADMAP.md`. The fix, copied verbatim from the real script:

```bash
# skills/impulse-goal/scripts/claim-run.sh
base="${IMPULSEGOAL_BASE:-.impulse-goal}"

# Slugify the task for a human-readable prefix: lowercase, every non-[a-z0-9] run becomes
# a single '-', trim leading/trailing '-', cap at 40 chars (then re-trim a dangling '-').
# Purely cosmetic — uniqueness comes from mktemp's suffix, not the slug.
slug="$(printf '%s' "${1:-}" \
  | tr '[:upper:]' '[:lower:]' \
  | tr -c 'a-z0-9' '-' \
  | sed -E 's/-+/-/g; s/^-//; s/-$//' \
  | cut -c1-40 \
  | sed -E 's/-$//')"
[ -n "$slug" ] || slug="run"
```

(`skills/impulse-goal/scripts/claim-run.sh`, lines 27-38.) `mktemp -d`
right after this claims the directory and the name in one atomic step, so
two simultaneous callers can never receive the same path — the check-then-
write race that caused the original clobber is gone by construction, not
by convention.

## Where this fits

- Consumes: `impulse-project-management`'s ROADMAP/spec output, or runs its
  own intake if none exists.
- Produces: one ready-to-paste `/goal` line; everything after that runs
  inside that `/goal` session per `references/execution.md`.
- Boundary: does not replace `impulse-project-management` — it drives a plan,
  it doesn't decide what the plan should say.

Back to [[_MOC_Reference]] · See also [[module-impulse-wiki]]
