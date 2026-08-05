# Self-reference artifact — a real multi-file deep-dive wiki, not a single index

This used to be one MOC file listing the suite's 22 skills. `deep-dive.md`
added a proper team-wiki workflow — multiple linked pages with real code,
not a compressed index — so this self-reference was rebuilt to match: a
real, navigable, multi-page wiki about the impulse suite itself,
following `deep-dive.md`'s own page set.

Open `references/self-reference/` — start at `_MOC_Reference.md` or
`Home.md`, both link onward through every other page:

- `_MOC_Reference.md` — nav hub, one line per page (the `moc.md` workflow
  still applies at this smaller scale — a page set still gets a map)
- `Home.md` — what the suite is, current focus
- `Getting-Started.md` — real install commands from the actual plugin/
  marketplace manifests
- `Architecture.md` — the real folder layout + a verbatim excerpt from
  `check-skills.js`'s cross-reference check
- `module-impulse-goal.md` — verbatim excerpt from `claim-run.sh`
- `module-impulse-wiki.md` — verbatim excerpt from `gather_data.py`,
  plus this directory's own evidence-honesty note
- `Decisions.md` — ADR-001 (the reference-artifact directive) as it landed

Every code excerpt is copied verbatim from the real file at the cited
path — none reconstructed from memory — per `deep-dive.md`'s non-negotiable
rule. This is the suite documenting itself, not a fictional stand-in
project.
