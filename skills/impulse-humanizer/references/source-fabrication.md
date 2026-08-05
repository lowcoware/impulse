# Source-fabrication detection — a citation-specific audit lane

A distinct check from every prose-style pattern elsewhere in this skill:
when humanized text carries citations (academic, Wikipedia-style, a
research summary, anything referencing an external source), audit the
citations themselves, not just the sentences around them. An LLM asked to
write "with sources" produces fabricated citations in recognizable shapes.

## Seven fabrication shapes

1. A URL that's structurally plausible but broken/404.
2. A DOI that resolves, but to a *different* article than the one cited.
3. An ISBN with a valid checksum that doesn't exist in any real catalog —
   the checksum passing proves nothing about the book's existence.
4. An author cited as writing something published *after* their death.
5. A book citation with no page number, for an 800-page book — too vague
   to actually verify, which is itself the tell.
6. A footnote name declared but never actually used/referenced in the
   body text.
7. A suspiciously uniform "access date" repeated identically across
   multiple citations in a freshly-written document — real research
   accumulates citations over time with varying access dates; a uniform
   date across many sources is a generation-time artifact.

## Two modes — don't overclaim in the default one

**Offline mode (default).** Format and internal-consistency checks only:
does the citation's shape make sense, does the timeline hold together
(shape 4 above), is a page number present for a page-numbered source. Flag
as "needs verification" — **never** claim "fabricated" without an
offline-provable contradiction (an author-died-before-publication-date
mismatch is offline-provable; a URL that might 404 is not, without
actually checking it).

**Explicit-network-permission mode.** Only once the user has explicitly
granted it: actually open the URLs, resolve the DOIs, look up the ISBNs.
Only in this mode is "confirmed fabrication" a legitimate verdict to
report — offline mode reports possibilities, this mode reports facts.

Sources: Vladimir-Human/humanizer-ru, harvested GitHub skill, distilled
and re-expressed, no verbatim text copied.
