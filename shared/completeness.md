# Completeness — no truncated deliverables

From yetone taste-skill full-output-enforcement (MIT), re-expressed. Applies
to every impulse skill that produces code or documents. A partial output is a
broken output: the user asked for a thing, not a sketch of the thing.

This is NOT a license for verbosity. The ladder still governs how much code
should exist (rung 1: less of it); this file governs that whatever should
exist arrives whole. Shorter-by-design is impulse; shorter-by-truncation is a
bug.

## Banned output patterns

In code blocks — hard fail, grep = 0:

```
// ...            // rest of code      // implement here
// similar to above                    // continue pattern
// add more as needed                  /* ... */
```

plus bare `...` standing in for omitted code. (`// TODO` is banned as a
truncation stub; a `impulse:` ceiling marker with an upgrade trigger is the
legitimate form of deferral and is not this.)

In prose: "for brevity", "the rest follows the same pattern", "similarly for
the remaining", "and so on" replacing actual content, "let me know if you
want me to continue", "I'll leave that as an exercise".

Structural shortcuts: skeleton delivered where a full implementation was
asked; first and last section shown, middle skipped; one example plus "repeat
for the others" where the others were the request; describing what code
should do instead of writing it.

## Scope-count lock

1. **Scope** — before generating, count the distinct deliverables the request
   names (files, endpoints, components, sections, answers). Lock the number.
2. **Build** — every deliverable, complete. No "you can extend this later".
3. **Cross-check** — before responding, re-read the request and compare
   delivered count vs locked count. Missing one → add it, then respond.

## Long outputs

Approaching the response limit:

- Do NOT compress the remaining sections to squeeze them in.
- Do NOT skip ahead to a conclusion.
- Write at full quality to a clean breakpoint (end of function / file /
  section), then stop with:

```
[PAUSED — X of Y complete. "continue" resumes from: <next item>]
```

On "continue": resume exactly there. No recap, no re-delivery of finished
parts.

## Size is a structure signal, never a brevity signal

From breferrari/obsidian-mind (MIT), re-expressed. The mirror of this file's
rule: "arrives whole" says never truncate on the way IN; this says never
truncate on the way OUT either, once the thing is already whole and has grown.

A generated document crossing ~25KB (bytes, not lines — one giant line hides
in a low line count) is telling you it holds more than one subject. The
response is a **split**, never a trim:

1. Content moves **verbatim** into domain files — zero loss, no re-summarizing
   on the way out. Rewriting during a split is how facts drift.
2. The original keeps a **one-liner per moved entry plus a link**, becoming an
   index. It never re-inlines what it just moved.
3. **Inbound links retarget** to the new home in the same pass (see
   write-correctness law 2 in `authoring.md` — a half-swept split is worse than
   no split).

Exempt: files whose whole job is bulk — archives, vendored corpora, generated
catalogs. Name the exemption in the file rather than leaving it implicit.

Applies to what impulse GENERATES (`impulse-wiki` notes, `impulse-md-generator`
docs, `impulse-artifact` output, specs and ADRs). Skill files themselves are
governed by the stricter caps in `authoring.md` size discipline.

## Quick check before finalizing

- zero banned patterns anywhere in the output
- every requested item present and finished
- code blocks hold runnable code, not descriptions of code
- nothing shortened to save space — if it should not exist at all, that is a
  ladder decision stated openly, not a silent omission
