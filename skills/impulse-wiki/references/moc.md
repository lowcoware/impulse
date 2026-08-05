# MOC building — Maps of Content

From tpitsunov/obsidian-skills' moc_builder (MIT), re-expressed. A MOC is
an index note: a curated, annotated map over a folder or tag, not an
alphabetical file listing.

## Workflow

1. **Scope**: which folder or tag is this MOC for. `structure.md` names the
   default folders; a MOC can also cover a cross-cutting tag.
2. **Gather condensed data, don't read every file raw.** Run the bundled
   script to extract metadata (frontmatter tags, H1, first-paragraph
   excerpt) per file — this keeps context spend flat regardless of folder
   size:
   ```bash
   python3 $IMPULSEWIKI_DIR/scripts/gather_data.py "<vault path>" --folder "<Folder/Path>"
   ```
   Filtering by tag instead of folder: run without `--folder` and discard
   rows missing the tag from the script's output.
3. **Group by semantic similarity** from the condensed excerpts — sub-topic
   clusters, not one flat list. If every note ends up in one cluster, the
   folder is too narrow for its own MOC; fold it into a parent's.
4. **Generate the MOC**:
   - `# MOC: <Domain>` title, one-sentence intro naming what the domain
     covers.
   - `## <Category>` per cluster.
   - Per note: `[[NoteFileName]]` + one annotation sentence — what it
     covers, not a restatement of its title.
5. **Save** as `_MOC_<Name>.md` per `structure.md`'s placement convention.
6. **Present for review** — the semantic grouping is a judgment call; show
   it before treating the MOC as final.

## Rebuild trigger

Not on every file add. `vault-health.md`'s stats script reports per-folder
file counts; a MOC whose folder grew by a handful of files since the MOC's
own `file.mtime` is the rebuild signal. A MOC that's never rebuilt silently
stops being a map.

## Boundary

This is index-building only — content of the indexed notes is untouched.

## Empirical grounding — honest, not a Zettelkasten sales pitch

No dedicated controlled study measuring Zettelkasten/PKM-linking against a
no-linking baseline was found — the method's own literature is
descriptive and testimonial, not a causal empirical claim this skill can
cite as settled science. What IS empirically grounded, from general
cognitive-science note-taking research: the "encoding effect" (deeper
processing from the act of note-taking itself) and specifically
**elaboration and organization — relational encoding that links new
information to existing schemas — produces more durable memory traces**
than isolated, unconnected notes. That's the actual mechanism a MOC and
wikilinks exploit: not "Zettelkasten works because Luhmann said so," but
"linking new notes to existing ones is relational encoding, and relational
encoding is the documented lever for retention." Annotate the link (rule 4
above), don't just place it — an unannotated `[[link]]` skips the
elaboration step that does the actual cognitive work.
[ScienceDirect: cognitive costs and benefits of note-taking, integrative review](https://www.sciencedirect.com/science/article/abs/pii/S1747938X17300374)
Deciding which folders EXIST is `structure.md`'s job, not this workflow's.
