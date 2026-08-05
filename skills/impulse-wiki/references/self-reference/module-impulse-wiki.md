---
title: "Module: impulse-wiki"
description: The vault-lifecycle skill — structure, MOCs, health, canvas, bases. This deep-dive wiki is one of its own outputs.
---

# Module: impulse-wiki

What it's for: maintains a whole Obsidian vault as a connected, navigable
project wiki — folder taxonomy, Maps of Content, health (orphans/broken
links), Canvas diagrams, Bases views, and — as of `deep-dive.md` — full
multi-page team wikis like the one you're reading right now.

## Real code: how a MOC's source data gets extracted

Building a MOC (or, as here, a deep-dive page) starts from condensed
per-file data, not raw file reads — this keeps context spend flat
regardless of folder size. The condensation logic itself, verbatim:

```python
# skills/impulse-wiki/scripts/gather_data.py
def extract_meaningful_content(content: str) -> str:
    """
    Extracts the first H1 header OR the first meaningful paragraph text
    if no headers exist in the file.
    """
    lines = content.split('\n')

    # 1. Look for the first H1
    for line in lines:
        if line.startswith('# '):
            return f"Header: {line.strip()}"

    # 2. If no headers, skip frontmatter and grab the first non-empty paragraph
    in_frontmatter = False
    for line in lines:
        stripped = line.strip()
        if stripped == '---':
            in_frontmatter = not in_frontmatter
            continue
        if not in_frontmatter and stripped and not stripped.startswith('#'):
            return f"Paragraph: {stripped[:150]}"
```

(`skills/impulse-wiki/scripts/gather_data.py`, `extract_meaningful_content`,
lines 19-38 — truncated at the fallback return for brevity; the smallest
slice that shows the real extraction shape, per this skill's own rule that
a wiki excerpt is a slice, not a file dump.)

## This page's own honesty note

This module page, `Architecture.md`, and `module-impulse-goal.md` are
real — the code excerpts are copied verbatim from the actual files at the
paths cited, not reconstructed from memory. `Home.md` and
`Getting-Started.md` describe the real suite too. Nothing in this
directory is a fictional stand-in project; it's the suite documenting
itself, same evidence-honesty bar `impulse-clone`'s self-reference holds.

Back to [[_MOC_Reference]] · See also [[module-impulse-goal]]
