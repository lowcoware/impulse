# Vault health — maintenance operations

From tpitsunov/obsidian-skills (MIT), re-expressed, scripts vendored
directly under `scripts/`. Every operation here is deterministic-script-
first: the script computes the fact, the agent only interprets and proposes
— never hand-wave a count or a match the script could have produced exactly.

## Stats — dry numbers

```bash
python3 $IMPULSEWIKI_DIR/scripts/vault_stats.py "<vault path>"
```

Reports file count, word count, total links, tasks, top-10 tags. Present
the script's exact output — do not estimate or round these numbers
yourself; a hallucinated vault stat is worse than not answering. Run
periodically or before/after a structural change (rule of thumb: same
cadence as impulse-pm's weekly-checkpoint playbook) to catch runaway inbox
growth or a MOC-rebuild trigger (`moc.md`).

## Orphan detection and connection

```bash
python3 $IMPULSEWIKI_DIR/scripts/find_orphans.py "<vault path>"
```

Finds notes with zero incoming AND zero outgoing links — the script's
definition, not a fuzzy one. For each orphan the user wants connected:

1. Read the orphan fully for context.
2. Extract its main entities/keywords/themes.
3. Search the vault for those terms in OTHER notes not currently linked to
   it.
4. Propose the 3-5 most relevant connections, with the reason and the
   exact text edit (either turn an existing word into a link, or add a
   `Related:` section).
5. Apply only after confirmation.

An orphan with no plausible match is a genuine gap — say so, don't force a
weak connection just to clear the orphan count.

## Broken link healing

```bash
python3 $IMPULSEWIKI_DIR/scripts/heal_links.py "<vault path>" "<target file>"
```

Parses the target's links, cross-references every file in the vault
(regardless of depth), fuzzy-matches broken links against the 3 closest
real filenames. Review the script's suggestions, propose corrections
(preserve sentence structure with an alias — `[[Apple|apples]]` — when the
literal target name would read wrong in context), apply on confirmation. A
broken link with no plausible match is flagged as genuinely orphaned — the
target note may need to be created, not guessed at.

## Table of contents

```bash
python3 $IMPULSEWIKI_DIR/scripts/generate_toc.py "<target file>"
```

Parses header levels (ignoring code blocks and frontmatter), emits a
clickable indented ToC snippet. Insert below the first `H1` unless the
user names another spot. Regenerate whenever a long reference file's
heading structure changes — a stale ToC that doesn't match its own
document is worse than none.

## Linting a messy note

No script — this one is a read-and-rewrite pass. Scan for: multiple
consecutive blank lines, trailing/double spaces, broken list indentation or
inconsistent bullet characters, raw URLs instead of `[text](url)`,
header-level skips (`#` straight to `###`) or missing space after `#`.
Reformat preserving all content and logic; report which rules fired.
Obsidian-specific syntax correctness (wikilinks, callouts, properties) is
`impulse-md-generator`'s deeper pass — this is the mechanical Markdown-hygiene
sweep that runs first.

## Boundary

These operations fix STRUCTURE (links, headers, ToCs) and report FACTS
(stats). They never rewrite a note's content or voice — that's
impulse-humanizer's job if the note's prose itself needs work.
