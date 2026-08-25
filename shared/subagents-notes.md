# Subagents — open questions and unresolved flags

Non-normative: nothing here is a binding rule. These are flagged gaps
pulled out of `shared/subagents.md` (the owner of actual subagent policy)
because neither contains an actionable directive — read this file only
when specifically chasing one of these two questions, never as part of
subagent dispatch.

## Observability

No specific measured methodology found for "did this subagent spend its
context well." Qualitatively: ties to the injection-size meter already
built into `hooks/impulse-config.js` — every subagent spawn pays the
ruleset injection cost, now visible per spawn. Extending observability
past that is unresolved — flagged, not solved.

## `IMPULSE_SUBAGENT_MATCHER` default — still unresolved

The hook's default is inject-into-every-subagent; scoping to specific
agent types is opt-in via an env var. No data surfaced in the research
pass that produced `subagents.md` directly measures the cost/benefit of
flipping that default (inject-only-into-code-writing-agents). Leaving the
default as-is rather than guessing — this is exactly the kind of change
that should follow a measurement, not precede one.
