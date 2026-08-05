# Review — scaling the bottleneck, not the ceremony

`/impulse-review` finds line-level issues in a diff. This file governs a
different question: how much review attention a change *earns*, and how to
review a whole service/repo when a diff is too narrow a lens. Data behind
why this matters: AI-assisted teams show +59% branch throughput but PR
review time +91%, PRs got larger, and ~45% of AI-generated code samples
introduced an OWASP Top-10 issue in one security benchmark (Veracode) when
review doesn't specifically target it.
Left unmanaged, review becomes either the bottleneck or a rubber stamp —
both are failure modes, not tradeoffs to accept.

## Ship-Show-Ask — review tier by risk, not by author

| Tier | When | What happens |
|---|---|---|
| **Ship** | Trivial, reversible, in a well-understood file (typo, config value, a change matching an existing pattern exactly) | Merges directly, no gate |
| **Show** | Medium risk — new logic in a familiar area, no contract change | Async review, doesn't block the next spec from starting |
| **Ask** | High risk — touches a contract, crosses a service boundary, governed by an ADR, or is the first spec in a new area | Synchronous review before merge, required |

Assign the tier when the spec is planned, not after implementation —
a spec touching a payment contract is `Ask` from the start regardless of
how small the eventual diff turns out to be.

## Diff-size as a rubber-stamp detector

A review whose time approaches the *human* baseline for writing that code,
or a diff over roughly 400 lines, is functionally a rubber stamp — nobody
reads 400 lines carefully in the time budget review actually gets. Two
responses, not one:

1. **Prevent it**: specs decompose (`spec-driven.md`) before implementation
   sprawls into one giant diff.
2. **Detect it**: if a diff arrives at 400+ lines anyway, the reviewer's
   first move is asking for a decompose, not reviewing it whole.
3. **When decompose genuinely isn't an option** (the work is already done,
   there's no time to re-slice) — get explicit consent to switch into an
   iterative mode instead of silently reviewing cold: file by file,
   holding findings in working memory and aggregating them at the end,
   rather than one whole-diff pass. This is the fallback path when
   decompose isn't possible, not a replacement for the decompose-first
   rule above.

## Numeric escalation gates — thresholds, not vibes

Tier is assigned by risk (above), but these hard numbers *force* an escalation
regardless of the assigned tier — they exist so "it felt small" can't
downgrade a genuinely large or dangerous change. Cross a line → bump the gate,
no judgment call:

| Signal | Threshold | Forced action |
|---|---|---|
| Diff size | > 400 changed lines | Reviewer refuses whole-review → asks for decompose (above) |
| Files touched | > ~10 files in one change | Auto-escalate one tier (Show → Ask) |
| `/impulse-review` BLOCKs | > 10 | One systemic-debt task, not 10 tickets (impulse-review Verdict rule) |
| Blast radius | change touches a contract / shared lib / auth / money path | Force `Ask` tier, ignore diff size |
| Coverage delta | drops below `coverageTarget` | CI blocks — non-negotiable, no reviewer override |

The point is removing discretion where discretion fails: a tired reviewer
rubber-stamps a "small-looking" 500-line diff; a gate doesn't get tired. Keep
the list short — a gate for everything is bureaucracy, these are the few that
actually predict escaped defects.

Gates can be HOOKS, not just review-time checks: a PreToolUse gate that
blocks editing production code with no sibling test file (tests-ship-with-
code enforced mechanically), or a non-blocking warn when touched files
drift from the spec's declared "files to modify" list. Same
discretion-removal move, earlier in the loop.

## Intent reconstruction over line-by-line diffing

For anything above `Ship` tier, reconstruct intent before reading the diff
line by line: read the spec, the relevant ADRs, and prior related PRs
first — then the diff. A diff read cold, with no context, either misses
real problems (the change conflicts with a pattern the reviewer doesn't
know about) or manufactures false ones (the reviewer doesn't recognize an
intentional deviation). Mechanical checks (types, lint, contract tests,
`/impulse-review`'s tag catalog, CI gates) run first and are never re-litigated
by a human — human attention goes to spec-conformance and intent, the
things automation can't judge.

## Receiving review — rigor, not agreement

Respond to findings technically, not socially. Two gates:

1. **Verify before implementing.** A reviewer's "this is broken" is a
   hypothesis — reproduce/confirm it first (same rule as
   `impulse-systematic-debug`); implementing an unverified finding ships the
   reviewer's misunderstanding.
2. **YAGNI pushback is a legitimate response.** Reviewer says "implement
   this properly / more robustly" → grep for actual usage first; if the
   code path is unused or single-caller, propose REMOVAL or the one-line
   version, citing the ladder — with the grep output as evidence, not as
   opinion. "Reviewer suggested it" is not an exemption from
   anti-overengineering.

## Whole-service / whole-repo review — layer-sharded

`/impulse-review` is explicitly one-shot-per-diff. This skill owns the wider
lens: reviewing an entire service or repo, not a change to it — for a
periodic audit, a pre-release check, or onboarding into unfamiliar code
(pairs with `impulse-legacy`).

**Mechanism**: fan out parallel subagents, one per architectural layer, so
findings can't interfere with each other and the review finishes in the
time of the slowest layer, not the sum:

| Layer | Subagent checks |
|---|---|
| Contracts | proto/OpenAPI/AsyncAPI vs actual handlers — drift, undocumented fields |
| Architecture | changed code vs. the ADR set (`adr.md`'s classification: does this diff Correct/Refine/Conflict-with/introduce New-vs an existing decision) — a "corpus gap" signal (the touched area has zero documented decisions) is itself worth surfacing, not a silent pass |
| Data | migrations, indexes, soft-delete consistency, explicit FKs |
| Security | authn/authz on every endpoint, secrets handling, rate limits present |
| Tests | coverage gate, contract tests per seam, assert-less tests |
| Docs | README accuracy, `.env.example` completeness, `docs.md`'s minimal list |

Findings from each layer feed one merged report with the same BLOCK/WARN/
INFO severity triage as everything else in this suite (`conventions.md`).

## Severity-gated debt aggregation

The per-diff case is `/impulse-review`'s Verdict rule (already cited in the
gates table above). The whole-service review applies the same aggregation
at larger scale: a layer whose BLOCKs cross that threshold becomes one
named "pay down X debt" spec, not a pile of disconnected tickets nobody
prioritizes. The debt-aggregation threshold exists specifically to prevent
review findings from becoming a backlog graveyard.

## A review too large for one pass — checkpoint, don't restart

A whole-service audit or a long checklist-driven security sweep can
genuinely outgrow one context window. Three pieces make it resumable
instead of a gamble on finishing before running out of room:

1. **Persist progress as it runs** — a state record shaped like `{scope,
   commit, ledger: {itemId: {status, evidence}}}` — so a review that runs
   out of room checkpoints where it stopped and resumes from there,
   rather than restarting from zero and re-spending the budget already
   spent.
2. **A coverage gate blocks "done."** Every applicable checklist item
   needs an explicit verdict (PASS / FAIL / N/A / DEFERRED) before the
   review reports complete — a silently-skipped item is indistinguishable
   from a passed one otherwise, which defeats the point of having a
   checklist at all.
3. **Findings need reachability, not just a pattern match.** A finding
   confirmed by reading the actual path from input to the flagged
   behavior is real; a pattern that merely looks concerning in isolation
   is a candidate worth investigating, not yet a finding — reporting it
   without confirming reachability inflates false-positive rate and
   erodes trust in the review that produced it.

## Tone discipline for review output and PM artifacts

A finding, a commit message, a PR description, or a ticket earns three
checkable tests before it stays as written — this is mechanical, not a
banned-word list:

1. **Deletion test** — remove the sentence; did the reader lose a fact?
   If not, it wasn't carrying information.
2. **Subject test** — is the sentence about the change, or about the
   author's diligence? "Carefully verified X" is about the author;
   "X returns 409 on duplicate" is about the change.
3. **Voice test** — would a terse maintainer write this, or does it read
   like a cover letter?

Two recurring failure modes this catches: **announcing the expected**
("tests pass", "linters clean" — that's the baseline, not news; only
state a check's status to flag an EXCEPTION to it) and **self-praise
framing** ("clean", "robust", "the honest fix", "I carefully..."). Applies
across commit messages, PR descriptions, review findings, tickets, and
changelog entries — the same discipline everywhere PM output gets
written, not a special rule for one artifact type.

## Multi-lens review — declare blocking policy per lens, not globally

For a review that fans out specialized lenses (security, error-handling,
concurrency, performance, API-design, test-quality, accessibility,
data-safety — same shape as the layer-sharded audit above, applied to a
diff instead of a whole service), declare per-lens blocking policy
explicitly rather than letting every lens block by default: an
`alwaysBlock` list (injection, auth-bypass, hardcoded-secrets — never
downgraded regardless of context) and a `neverBlock` list (findings that
surface as WARN/INFO no matter how the lens phrases them). Route
higher-risk lenses (security, concurrency) to stronger review effort by
default — not every lens needs the same depth on every diff.

## Closing a review — disposition, not just verdict

A review concluding (with or without fixes applied) isn't done until the
reviewed unit of work gets an explicit disposition, distinct from the
verdict itself: Archive (kept for reference), Delete (superseded,
no longer needed), or Skip (deliberately left as-is, reason stated).
Ship-Show-Ask and severity triage answer "was this okay" — disposition
answers "what happens to the tracking artifact now" — a real gap when
nothing currently owns what happens to a completed spec's directory or
tracking entry once review passes.

## Reconciling conflicting sources — precedence, then adversarial check

When code, docs, and conversation history about a project's state
disagree (a "catch me up" or status-reconciliation situation), resolve
by a fixed precedence, not by whichever source was read last: current
code/git state outranks a committed decision record, which outranks
docs, which outranks recent conversation, which outranks older
conversation — code and git arbitrate what actually happened, since
everything else is a claim ABOUT what happened. Then run a skeptic pass
that tries to REFUTE each material claim against the code/git ground
truth, defaulting anything unconfirmed to "unverified" and listing it in
a dedicated Contradictions/Unverified section rather than asserting it
as settled — the same citation discipline `conventions.md` already
requires, applied specifically to reconciling sources that disagree.

## Pairs-with-impulse-review division of labor

| Question | Owner |
|---|---|
| Is this specific line/diff correct, safe, AI-slop-free? | `/impulse-review` |
| Does this change need sync review before merge, or can it ship? | This skill (Ship-Show-Ask) |
| Is the whole service healthy, not just this diff? | This skill (layer-sharded audit) |
| Is a cluster of findings a real systemic problem? | Both — same aggregation rule, different scope |
