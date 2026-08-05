# Style — the judgment calls syntax references can't make

Syntax files say what's possible. This file says when to actually reach for
it. Same ladder logic as the rest of impulse-suite: the plainest construction
that carries the meaning wins; a fancier one has to earn its place.

## Callout vs plain text

Use a callout when the content needs to visually interrupt normal reading —
a risk, an open question, a decision, a thing a skimming reader must not
miss. Don't use one to make a paragraph "look more finished." Test: if you
deleted the `> [!type]` line and left plain text, would a careful reader
miss anything important? If no, it didn't need the callout.

Ceiling: a doc that's mostly callouts has stopped using them as emphasis.
Rough guide — one callout per 300-400 words of a report is normal; one
callout per paragraph means something's wrong with the writing, not the
formatting.

## Mermaid — earns its lines or doesn't ship

A diagram is worth its vertical space when the relationship it shows is
genuinely spatial/sequential and prose would need several sentences to
describe the same shape (a request flow across 4 services, a decision tree
with real branches, an entity relationship). It is NOT worth it when:

- The diagram would have 2-3 nodes — just say the sentence.
- It's decorating an ADR that has no actual architecture to draw.
- Nobody asked and the content reads fine without it.

Per the user's own calibration: Mermaid goes in **when it genuinely helps**,
never as a default section in every ADR/report. One clear diagram beats
three ambitious ones nobody will maintain.

## Wikilink conventions between generated docs

- Link a service by its README's `title` property, not a prose restatement — `[[orders]]`, not `[[Orders Service (Go, Kafka)]]`.
- An ADR links the service(s) it concerns via the `service`/`related` properties (`properties.md`), not just inline prose links — that's what makes a future Base filter work.
- Never duplicate a fact that lives in another note's frontmatter — link to it. If a report needs to say a service's status, link `[[orders]]` rather than restating "orders is currently active."
- Broken-link tolerance: Obsidian shows unresolved links visually distinct but doesn't error. Still — don't link to a note that doesn't exist yet without a reason (a planned ADR, fine; a typo, not fine).

## Folder structure — minimum viable

No mandated deep tree. If a project's docs live in `docs/`, this is enough:

```
docs/
  adr/           one file per ADR, filename = title
  reports/       one file per period (weekly/monthly)
  runbooks/      one file per scenario
  <service>.md   service README lives at project root or next to its service, per impulse-backend convention — not duplicated into docs/
```

No `docs/adr/index.md` MOC (Map of Content) note by default — with
consistent `type: adr` properties, a **Base** view does that job with zero
maintenance (SKILL.md's Bases note). Add a hand-written MOC only when the
project genuinely wants curated prose framing around the list, not as a
navigation crutch.

## Naming

Filename = the `title` property, kept short enough to read in a link list.
`ADR-014-event-driven-communication.md`, not
`ADR-014-the-decision-to-adopt-an-event-driven-architecture-for-services.md`.
Obsidian resolves `[[wikilinks]]` by filename (or alias) — a long filename
makes every link to it verbose too.

## Grounding check — long-form docs and articles

Before the reader test: walk the doc top-to-bottom and verify every
concept a paragraph leans on was either a stated prerequisite or
introduced EARLIER in the doc. An ungrounded concept ("as the outbox
relay handles this" — outbox never explained) is where readers silently
fall off. Fix by reordering or one grounding sentence, not a glossary
dump. For a long doc, keep the ledger explicit while writing: two lists —
*prerequisites* (reader brings) and *introduced-so-far* — and a block may
only lean on what's already in one of them.

Two craft rules that pair with it: when a section could be prose OR a
list OR a table, argue the format choice in one sentence (what does the
reader do with it — scan, compare, read?) instead of defaulting to
whatever came out; and for candidate-sensitive spots (opening, section
lead), draft 2-3 candidates and pick — first-draft openings anchor the
whole doc on autopilot.

## Reader test — for docs whose misreading is expensive

Runbooks, migration guides, onboarding docs: before shipping, spin ONE
fresh no-context subagent (dispatch mechanics: `../../../shared/subagents.md`),
give it only the draft, and ask it the 3-5
questions a real reader will arrive with. Where its answers are wrong or
hedged, the doc assumed knowledge or buried the point — fix the doc, not
the reader. Skip for routine reports/changelogs; this is a gate for docs
where a misread costs an outage or a broken migration.

## The single most common mistake

Formatting a doc as if every Obsidian feature must appear once —
frontmatter, three callout types, a Mermaid diagram, a footnote, a
highlight, all in one 200-word service README. That's ceremony wearing a
different costume than the one impulse-backend already bans. Use exactly what
the content needs; a plain paragraph is a valid answer.
