# Conventions — cross-cutting, apply to every playbook and command

## Config resolution

Three-tier, same pattern as the rest of the impulse suite: per-invocation flag
> `PROJECT_ANCHOR_*` env var > `~/.config/impulse/pm.json` on disk. `init`
(first use in a project) asks for the anchors that can't be inferred
(project name, task-ID prefix, repo scope) and writes the config — never
re-asks once set.

## stdout by default, write only with explicit consent

Every playbook/command prints its output to chat by default. A file only
gets written when the user passes `--apply` (or says "write it," "save
this," equivalent) — never silently. Before any write: check the target
isn't a dirty/uncommitted change the write would clobber; if it is, stop
and say so instead of overwriting.

## Ask vs. don't ask

| Ask | Don't ask |
|---|---|
| Anchors unset on first use in a project | Routine lookups a reference file already answers |
| Scope/target genuinely ambiguous between two real options | A command with an unambiguous single target |
| No service/repo specified in a polyrepo and it matters | The project has only one repo |
| A decision needs human sign-off (ADR acceptance) | Formatting/template-filling mechanics |

One question, not a dump. If context resolves it, don't ask — declare the
inference and proceed.

## Severity triage — BLOCK / WARN / INFO

Same three-tier system used throughout the impulse suite (`/impulse-review`'s
tags use it too — one mental model everywhere):

- **BLOCK**: violates a hard rule (missing acceptance criteria, an ADR
  accepted without human sign-off, a write attempted without `--apply`).
  Not mergeable/actionable until fixed.
- **WARN**: a heuristic flag that needs a human look — might be a false
  positive, still surfaced.
- **INFO**: advisory, no action forced.

BLOCK pile-up in one pass → one named systemic-debt item, per
`/impulse-review`'s Verdict rule (applied at wider scope in `review.md`).

## Completion status — richer than binary done/not-done

A task or spec's OUTPUT status, distinct from the severity-triage above
(which is about findings during review, not the artifact's own state).
Binary done/not-done forces "shipped but I have a real concern about it"
into either a falsely-clean DONE or an overstated BLOCKED — neither is
honest. Four states:

- **DONE** — shipped, verified, no open concern.
- **DONE_WITH_CONCERNS** — shipped, acceptance criteria met, but something
  worth flagging didn't rise to a blocker (a WARN-tier finding that
  wasn't worth holding the merge for, a scope-drift note, an NFR claim
  still `NEEDS-RUNTIME`). The concern travels WITH the record — it
  doesn't get lost by rounding up to a clean DONE.
- **BLOCKED** — can't proceed; names what's blocking it.
- **NEEDS_CONTEXT** — genuinely stuck on missing information, not a
  blocker in the traditional sense (nobody's preventing progress, the
  information just isn't available yet) — distinct from BLOCKED because
  the next action is "go get an answer," not "wait for someone to
  unblock."

Use this status on the task/spec record itself (`templates.md`), not just
in prose — a status field that's actually one of these four values is
queryable later; a paragraph explaining nuance in the Context section
isn't.

## Citation discipline

Never invent a fact — a task ID, an ADR number, a service name, a fact
about the codebase. Every claim cites something concrete: a file:line, an
ADR number, a spec section, a commit hash. Uncertain → ask, or verify with
a tool (Grep/Read), never guess and present the guess as fact. This is the
single most important convention in this skill — a PM tool that
hallucinates a fact is worse than one that admits it doesn't know.

Two mechanical checks the discipline above implies but that don't happen
automatically unless run deliberately:

- **The citation's target actually exists.** A well-formed reference
  (right shape, plausible ADR number, plausible file:line) is not the
  same claim as "this reference resolves to something real." Before
  trusting an index of docs/specs/ADRs this skill's own setup depends
  on, verify each referenced file is actually ON DISK — not just that
  the index file that lists them exists. A missing referenced file
  should halt with an offer to repair, not silently proceed as if the
  citation were valid.
- **A cited artifact persists in the same commit as its citation.** A
  project's default ignore rules (`*.log`, a build-output pattern) can
  silently exclude something a spec/ADR/retro/review doc cites as
  evidence — the citation reads fine, the file it points at never made
  it into the commit. Before trusting a citation to an artifact (a log,
  a generated report, a captured output), confirm the artifact is
  actually tracked and present, not just that the reference has the
  right shape.

## Subagent orchestration principles

Two patterns this skill's playbooks lean on — canonical mechanism in
`../../shared/subagents.md`:

- **Gather-then-synthesize** — periodic rituals (checkpoint, retro,
  plan-a-cycle) fan out parallel subagents to gather context BEFORE any
  generative writing; never draft-first-fact-check-after.
- **Layer-sharded review** — decompose a whole-service/repo review into N
  independent layer-scoped passes (`review.md`).

## Doc language and voice

Docstring/comment language for CODE stays `docstringLang`
(`impulse-backend`'s config key). PM artifacts (specs, ADRs, retros,
checkpoints) — voice comes from `impulse-humanizer`'s automatic
doc-generation trigger, formatting from `impulse-md-generator`. This skill
owns content and structure only.
