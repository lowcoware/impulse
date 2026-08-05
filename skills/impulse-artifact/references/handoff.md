# Handoff — from the skill that decided WHAT, to this skill's HOW

This skill answers "how do I render this as a shareable HTML artifact." It
never answers "should this document exist," "what should it say," or "what
cadence does it get written on" — those are the calling skill's job, same
split impulse-md-generator has with impulse-project-management for Markdown.

## Where an artifact request comes from

| Source | Produces | Nearest gallery example |
|---|---|---|
| impulse-project-management's weekly-checkpoint playbook | status report | 11-status-report.html |
| impulse-project-management's retrospective, or an incident write-up | incident report | 12-incident-report.html |
| impulse-project-management's spec-driven.md output, decomposed into phases | implementation plan | 16-implementation-plan.html |
| impulse-review's findings on a diff, or impulse-pm's review.md | PR review summary / PR write-up | 03-code-review-pr.html, 17-pr-writeup.html |
| impulse-debt's ledger, or impulse-pm's triage-incoming-request playbook | triage board | 18-editor-triage-board.html |
| impulse-goal's ROADMAP.md + phase specs | plan artifact (genres.md "plan") | 09-slide-deck.html, 16-implementation-plan.html |
| impulse-frontend/impulse-backend architecture, impulse-legacy's blast-radius output | architecture diagram (genres.md "diagram") | 04, 13, 21 |

## The handoff contract

1. **Content is already decided** by the calling skill — its Markdown
   output (a spec, a retro, a review, a debt ledger) is the SOURCE OF
   TRUTH for what the artifact says. This skill formats it as HTML; it
   does not invent scope, add sections the source doesn't have, or pad a
   short source into a longer artifact (genres.md's "plan" genre states
   this explicitly, but it holds for every genre).
2. **Never invent data to fill the artifact out.** A metric, a name, a
   date not present in the source stays out — or gets an explicit
   placeholder callout, never a plausible-looking fake number (same rule
   as ai-tells.md's fake-precision ban, and the gallery's own sample-data
   honesty note in `gallery.md`).
3. **Voice pass** — same step impulse-md-generator takes: hand prose content
   to impulse-humanizer before calling it done, per its genre-calibration for
   the doc type. Applies to a status report or incident write-up; doesn't
   apply to diagram label text (too short to have a "voice").
4. **This is not a impulse-md-generator replacement.** If the deliverable is
   going to live in an Obsidian vault as an ongoing note, it's Markdown —
   impulse-md-generator's job. This skill is for a document meant to be
   opened as a standalone artifact (shared as a file, rendered in a
   browser, pasted into a PR, dropped in a channel) — a different delivery
   shape, not a better one.
5. **The reverse path: when the artifact's content needs to go BACK into a
   conversation.** If the artifact represents agent output the user is
   likely to hand back somewhere else (a plan, a review, a decision they'll
   paste into a PR description or another chat) — not diagram/dashboard
   genres, where there's no equivalent text form — embed a `Copy Markdown`
   button alongside a concise Markdown-formatted payload (title,
   conclusions, rationale, open questions, next actions) distinct from the
   full HTML. This is a required handoff affordance for the plan/general
   genres carrying decision content, not an optional nicety — the artifact
   is often not the final destination, just the readable rendering of it.
