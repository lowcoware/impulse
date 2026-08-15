# Memory — tiered project memory, read/write discipline

Cross-session project memory as a convention any impulse skill can use,
not a database. No daemon, no vendored engine — a small file tree an agent
reads and writes with the tools it already has (Read/Write/Edit/Grep).
Point skills here instead of re-describing the protocol per skill; a skill
that needs domain-specific memory (e.g. `impulse-project-management`'s
narrative-handover / tagged-lesson split in `playbooks.md`'s retrospective
entry) layers on top of this, doesn't replace it.

## Layout

```
.impulse/memory/
  index.md          # Tier 1 — always read at session start. Hard cap: 50 lines.
  sessions/          # Tier 2 — one file per session/cycle, append-only.
    YYYY-MM-DD-slug.md
  notes/             # Tier 3 — durable tagged facts, one per file or grouped by topic.
```

Lives in the target project's own repo (not the plugin install), same as
any other project-local convention this suite writes (`plans/`,
`docs/ironclad/`-style artifacts in `impulse-project-management`). Create
the tree on first write, never proactively — a project that doesn't use
memory shouldn't get an empty `.impulse/` dir.

## Tier 1 — `index.md`, the 50-line ceiling

The only file read unconditionally. Contents: active work-in-progress
(one line each), the 3-5 standing facts that would cause a wrong move if
forgotten (a negative constraint from a past retro, a non-obvious repo
quirk, a decision that isn't in code), and pointers into Tier 2/3 by
filename — never inlined detail. Hitting the cap forces a choice (retire a
stale line, promote detail to Tier 2/3) instead of silent unbounded
growth. If nothing is in play, the file doesn't exist — recreate on next
write, don't leave a stub.

## Tier 2 — session log, append-only

One file per session or work cycle. Never edited after the session ends —
a later correction is a NEW entry in the current session's file, not a
rewrite of the old one (same "narrative handover" rule as
`impulse-project-management/references/playbooks.md`'s retrospective: the
reasoning behind a past decision is worth more than its latest
restatement). This is the raw trail; Tier 1 only ever links to it.

Entry shape — write this on session end or near a compaction, not
freeform prose:

```
Goal: <what this session was trying to finish>
State: <what's done, what remains>
Decisions: <decision — why it matters>, one per line
Files: <path>: <why it matters>
Validation: <command>: <result>
Risks/Blockers: <risk, blocker, or "none known">
Next: <the exact next step>
```

Fixed fields beat free prose for the same reason `subagents.md`'s status
vocabulary does: a field left visibly blank is harder to skip than a
paragraph nobody wrote. `Next` is mandatory even when it's `session
ended, no follow-up needed` — an absent one reads as "forgot," not
"nothing to do."

## Tier 3 — durable notes

A fact worth surviving indefinitely, independent of any one session —
promoted from Tier 2 when it proves reusable (the same pattern bit twice,
a rule that would apply to unrelated future work). Same "reaffirm, don't
duplicate" rule as the retrospective playbook's tagged-lesson entry: if a
Tier 3 note proves true again, note the reaffirmation in place rather than
writing a near-duplicate note.

## Write discipline

1. **Redact before writing, not after.** Never persist secrets, tokens, or
   anything the user marked private into any memory tier — check before
   the `Write`/`Edit` call, not as a follow-up cleanup.
2. **One funnel per project, not many.** If a skill needs to record
   something, it writes through this same three-tier shape rather than
   inventing a parallel memory file — a second ad-hoc memory location is
   the duplication-sediment failure `token-hygiene.md` names, applied to
   memory specifically.
3. **Compact, not compressed-to-lossy.** Tier 1 entries are short because
   they're pointers, not because content was chopped to fit — if a fact
   needs more than one line to stay true, it belongs in Tier 2/3 with a
   Tier 1 pointer, not squeezed.

## Read discipline — cheap index first, full text only on demand

Reading order for any skill consulting memory: `index.md` (cheap, always) →
grep session/note filenames for a relevant hit (still cheap — filenames and
headers, not bodies) → open the specific Tier 2/3 file only once a match is
identified. Never `cat` the whole `sessions/` directory into context
speculatively; that defeats the tiering.

**Recall discipline.** A Tier 3 fact is a claim about the repo as it was
when written, not a live view. Before acting on one — a named file,
function, flag, or config value — verify it still holds against current
repo state (grep for it) rather than trusting the note. Prefer what the
repo says now over what memory says happened; a stale fact acted on
silently is worse than a fact re-derived. On a conflict, flag the drift
for the next `index.md` pointer update instead of quietly overwriting the
note (append-only discipline above still applies).

**Orphan-link check.** Periodically (not every session) verify every
Tier 2/3 pointer in `index.md` resolves to a file that still exists. A
dangling pointer left to rot is worse than no pointer — either the
target was deleted (retire the `index.md` line) or renamed (fix the
pointer).

## Native `MEMORY.md`, if the project has one

Claude Code's own auto-memory index (`MEMORY.md`, project-generated, not
this suite's file) truncates at 200 lines or 25 KB, whichever hits first
([code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory)).
Don't conflate the two: that cap governs the platform's native memory
file; `index.md`'s 50-line cap above is this convention's own, stricter,
self-imposed discipline for a different, project-local file. A project
using both keeps them for different jobs — native `MEMORY.md` for
cross-session user/preference facts the harness manages, `.impulse/
memory/` for the tiered work-in-progress/decision trail this file
describes — rather than merging them into one.

## When NOT to use this

- A single-session task with nothing worth remembering next time — writing
  an index entry for its own sake is the Unscoped-Rule failure applied to
  memory.
- Anything `impulse-project-management`'s spec/ADR/task artifacts already
  own (a spec, an ADR, a task file) — those are the durable record for
  planned work; this tier is for cross-session context those artifacts
  don't carry (why an approach was abandoned mid-session, a repo quirk
  discovered by accident), not a duplicate of them.
- Retro artifacts get ONE home, chosen once per project: with this
  convention active, the retrospective playbook's narrative handover is
  the Tier 2 entry and its tagged lesson a Tier 3 note; without it, both
  live in the pm docs tree. Never both — the playbook
  (`impulse-project-management/references/playbooks.md`, retrospective
  item 5) states the same rule from its side.

## Sources

Patterns re-expressed from third-party repos (no third-party rule text
reproduced) — see README Lineage.
