# Embeds — full reference

Prefix any wikilink with `!` to pull the target's content inline instead of
just linking to it. Embedded content stays live — edit the source, the
embed updates.

## Embed notes

```markdown
![[Note Name]]                         Full note
![[Note Name#Heading]]                 Just one section
![[Note Name#^block-id]]               Just one block/paragraph
```

Prefer section/block embeds over whole-note embeds — embedding an entire
service README inside a status report usually means you wanted one
paragraph, not the whole doc.

## Embed images

```markdown
![[image.png]]
![[image.png|640x480]]                 Width x height
![[image.png|300]]                     Width only, aspect ratio kept
```

## External images

```markdown
![Alt text](https://example.com/image.png)
![Alt text|300](https://example.com/image.png)
```

Same width syntax works on standard Markdown image links too.

## Embed audio / PDF

```markdown
![[audio.mp3]]
![[document.pdf]]
![[document.pdf#page=3]]
![[document.pdf#height=400]]
```

## Embed Bases

```markdown
![[BaseFile.base]]
![[BaseFile.base#View Name]]
```

Only relevant if a `.base` file already exists in the vault — this skill
doesn't create one speculatively (see `SKILL.md`'s Bases note). Embed an
existing view when a report needs a live filtered table of, say, all open
ADRs; don't build the Base file just to embed it once.

## Embed lists

```markdown
![[Note#^list-id]]
```

Where the source list carries a block ID:

```markdown
- Item 1
- Item 2
- Item 3

^list-id
```

## Embed search results

````markdown
```query
tag:#project status:done
```
````

Native search-embed, not a Dataview query — no plugin required. Use when a
report needs "everything tagged X" without hand-maintaining the list.

## When to embed vs link

Embed when the reader needs the content right there to follow the current
note without a context switch (a diagram, a short definition, one relevant
paragraph). Link (`[[plain wikilink]]`, no `!`) when the reader might want
the content but the current note's job is to point, not to duplicate.
Default to linking — embedding is the exception that earns its screen space.
