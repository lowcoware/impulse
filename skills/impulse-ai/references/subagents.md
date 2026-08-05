# Subagent design — AI-infra addendum

General subagent policy (four-element contract, tool scoping, context
isolation, orchestration patterns, durable orchestration, handoff
discipline, model routing, observability) moved to `shared/subagents.md` —
read that first, it's the owner. This file holds only what's genuinely
specific to AI-infrastructure agents.

## RAG/retrieval subagent specifics

A subagent doing retrieval-then-synthesis (gather-then-synthesize pattern,
`shared/subagents.md`) over a vector store should return the retrieved
chunks' source citations alongside the synthesis, not synthesis alone — the
caller can't verify a claim against a source it never saw. Cite chunk IDs
or document paths, not just "found relevant context."

## MCP-server-facing subagent specifics

A subagent whose tool list includes an MCP server's tools inherits that
server's own security posture (`references/mcp-security.md`) — scoping the
subagent's tools narrower than the full server surface is the same
containment argument as `shared/subagents.md`'s tool-restriction section,
applied at the MCP-tool granularity rather than the Claude-Code-tool one.
