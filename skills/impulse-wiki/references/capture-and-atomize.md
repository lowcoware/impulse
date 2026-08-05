# Capture, glossary, tagging, atomization

From tpitsunov/obsidian-skills (MIT), re-expressed. Content-organizing
operations that turn raw or oversized material into vault-shaped notes.

## Inbox triage (fleeting capture)

For a project's `/inbox/` per `structure.md`, triaged the session it's
touched — an inbox that accumulates untriaged is a graveyard, not a queue.

1. Locate notes in the inbox folder.
2. Read each: main idea, and what kind it is (task / stray thought / link /
   draft of something larger).
3. Unnamed or generically-named → suggest a descriptive 3-5 word title.
4. Assign 1-3 tags from the vault's EXISTING tag taxonomy (search for
   `tags:`/`#` usage first — don't invent a parallel tag vocabulary).
5. Search the vault for related notes, propose `[[wikilinks]]` tying the
   capture into the existing structure.
6. Recommend a destination folder (`structure.md`'s taxonomy, or the
   project's established one).
7. Confirm, then execute: rename, inject frontmatter tags, add links, move
   the file.

## Glossary building

For `/glossary/` per `structure.md` — a technical project accrues
domain-specific terms that need one canonical definition, not five
inconsistent inline explanations.

1. Scan the target scope (a folder, a project, a domain).
2. Extract recurring domain-specific terms/acronyms/jargon — skip common
   words and general concepts, focus on the specific nouns and phrases
   that actually need defining.
3. **Infer definitions from usage in THESE notes, don't pull from
   training-data general knowledge unless asked.** A glossary entry that
   contradicts how the term is actually used in the project is worse than
   no entry.
4. Track the source file(s) each term was most prominently used/defined
   in.
5. Write/update `Glossary.md`, alphabetical, `**Term**: definition.
   (Source: [[File]])` per entry.
6. Optionally backlink the first mention of each term in its source files
   to `[[Glossary#Term]]` — only on request, this touches other files.

## Tagging

1. Read the target note for topic/entities/context.
2. Check the vault's existing tag taxonomy first — prioritize reusing an
   established tag over minting a near-duplicate.
3. Pick 3-5 tags: a couple broad category tags, the rest specific/thematic.
4. Write to frontmatter: prepend a `tags:` block if none exists, add the
   `tags:` key if frontmatter exists without it, append only the NEW
   unique tags if `tags:` already has entries — never blow away existing
   tags.
5. If the note reads out of place for its current folder given the new
   tags, flag it as a move candidate — don't move it unasked.

## Zettel atomization (long-document splitting)

For breaking an oversized reference doc or rambling draft into linked
atomic notes — genuinely useful on a project wiki's `/reference/` when one
file has grown into several unrelated concepts. Lossless by construction —
never retype the source text from memory:

1. **Prepare**: run `python3 $IMPULSEWIKI_DIR/scripts/atomizer.py prepare
   "<target file>"` — chops the file into numbered paragraph blocks so
   they can be referenced by index, not retyped.
2. **Index**: read the numbered output, identify 1-4 independent atomic
   concepts. For each: a title, 2-4 tags, and the list of block numbers
   that belong to it (need not be contiguous). Write this as a JSON array
   to a temp file.
3. **Split**: run `python3 $IMPULSEWIKI_DIR/scripts/atomizer.py split "<target
   file>" "<json instructions>" "<output dir>"` — the script physically
   creates the new atomic notes and replaces the extracted blocks in the
   original with `[[wikilinks]]` to them. This is what guarantees
   lossless extraction: the script moves exact text, it never regenerates
   it.
4. Clean up the temp JSON, summarize what was created and linked.

## Boundary

These operations organize and split EXISTING material — they don't
generate new content from nothing. Writing a spec/ADR/report from scratch
is `impulse-project-management`'s job; this skill's atomizer takes that
output and restructures it once it's grown unwieldy.
