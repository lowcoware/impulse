# MCP server and tool design

Current spec: 2025-11-25 (stable). A 2026-07-28 release candidate exists
(statelessness via removing the init handshake, an Extensions framework,
deprecating Roots/Sampling/Logging on a 12-month removal window) — not
final, don't build against it yet.

## Tool granularity — a real tradeoff, not a fixed rule

Anthropic's own guidance is explicit that there's no single "always
narrow" or "always broad" answer:

1. **Don't wrap every REST endpoint as a thin tool** (`list_users`,
   `list_events`, `create_event`) — consolidate multi-step workflows into
   one task-shaped tool (`schedule_event`) that does the work internally,
   mirroring how a human would actually solve the task in one step.
2. **But too many tools, or overlapping ones, distract the model** —
   granularity is something to evaluate against realistic tasks, not
   decide once upfront and never revisit.
3. Build a few thoughtful tools around evaluated workflows, then scale —
   this is the ladder's minimum-viable-first rung applied to tool design.

## Naming and descriptions — the model's primary decision surface

1. "Describe the tool like you're onboarding a new hire" — spell out
   implicit context (query formats, jargon, resource relationships) the
   model wouldn't otherwise have. Small description edits produce
   measurably large accuracy swings in evals.
2. Namespace by domain/resource (`asana_projects_search`, not
   `search`) — prefix vs. suffix ordering has a measurable, non-trivial
   effect on tool-selection accuracy; pick one convention and apply it
   consistently across all tools in one server.
3. Name parameters unambiguously — `user_id` not `user`, an enum for
   `response_format: concise|detailed` rather than a boolean flag with an
   undocumented meaning.
4. A 2025-11-25 spec rule (SEP-986): tool names are 1-64 chars,
   case-sensitive, alphanumeric plus `_-./` — validate against this, not
   an assumed-safe subset.

## Errors — for model self-correction, not just human debugging

The 2025-11-25 changelog explicitly clarifies (SEP-1303): **input
validation errors are Tool Execution Errors (`isError: true` in the tool
result), never Protocol Errors.** This matters mechanically — a Protocol
Error is a hard failure the calling model can't act on; a Tool Execution
Error's message is content the model reads and can use to retry
correctly. Error text should give "specific and actionable improvements,"
not opaque codes or a raw traceback.

## Database access — one generic query tool + schema-as-skill, as an alternative to per-operation tools

For an agent that needs to query a database, the granularity tradeoff
above (§ "Tool granularity") has a specific, concrete resolution worth
naming: instead of exposing many narrow tools (`get_user`, `list_orders`,
`sum_revenue`, ...), expose ONE generic SQL-execution tool per database
(`sql_<dbname>`, takes a raw query string, returns JSON rows with a
row-limit) — and pair it with a companion SKILL.md documenting that
specific schema: tables/columns/relationships, and critically, the
business conventions a raw schema read wouldn't reveal ("amounts are
stored in cents, not dollars," "cancelled orders are excluded from
revenue," "compute totals from line items, don't trust the stored total
column — it can drift"). The skill file is the cached schema knowledge,
so the agent isn't re-introspecting the database structure on every
session. This trades tool-level safety (a narrow `get_user` tool can't
accidentally run a cross-table join) for flexibility and much lower
tool-definition overhead — reach for it when the access pattern is
genuinely exploratory/analytical, not when a small fixed set of
operations covers the real need (that case is still better served by
narrow task-shaped tools per the granularity guidance above). Read
permission-tiering still applies regardless of which shape is chosen —
gate the generic query tool's connection at readonly/write/full per
deployment, same as any DB-access tool. **Two layers, not one**:
app-level query-shape validation (regex-checking that a "readonly" tool's
query isn't a disguised write) is defense-in-depth, not the actual
guarantee — the real enforcement is database-level, a genuinely
read-only replica connection or a Postgres role granted only `SELECT`.
An app-level check alone is bypassable by any query shape the validator
didn't anticipate; the DB-level grant isn't. Two narrower mechanical
rails worth adding regardless of tool shape: block `UPDATE`/`DELETE`
with no `WHERE` clause outright (a missing filter on a mutating query is
never intentional), and block multiple SQL statements in a single call
(stops one injected/malformed call from doing more than the one thing it
was authorized for).

## Context-window budget

1. Cap response size deliberately — paginate/filter/truncate with sane
   defaults; Claude Code itself caps tool responses at 25,000 tokens by
   default. Unbounded `list_*`-shaped tool output is the single most
   common cause of context blowup.
2. At scale, loading every tool's full definition upfront burns context
   before the model does anything — a documented case cut 150k tokens of
   upfront tool definitions to 2k by letting the agent load tool code on
   demand instead. For a server with many tools, prefer progressive
   disclosure (code-execution-style tool access) over flooding context
   with every schema at session start.
3. When truncating a response, tell the model how to narrow its next call
   — "showing 20 of 340 results, add a filter" is actionable; a silent cut
   is not.

## Annotations + functional eval

1. **Tool-annotation defaults are the dangerous direction:** unspecified
   `destructiveHint` and `openWorldHint` both default to TRUE. A read-only
   tool that doesn't declare `readOnlyHint: true` is treated as
   potentially destructive by well-behaved clients — declare annotations
   explicitly, don't ride defaults.
2. **Functional eval ≠ security review.** Before shipping a server, write
   ~10 realistic questions the agent should answer with the tools —
   independent, read-only, verifiable, stable answers, mixed complexity —
   and run them agent-driven. Tests tool SELECTION and composition, which
   unit tests of the tool bodies can't catch (pairs with
   `subagents.md`'s trajectory-level eval).

## Response shape conventions

1. List-shaped tools support both `response_format="json"` (full fields,
   consistent types, for programmatic chaining) and `="markdown"` (headers/
   lists, human-readable, display names with IDs in parens, typically the
   default) — this is the human-vs-machine-consumer split, not redundant
   formatting.
2. Pagination is mandatory on any list tool, never "load everything":
   respect an explicit `limit` (default 20-50), cursor/offset-based, and
   return metadata the caller can act on —
   `{"items": [...], "has_more": true, "next_offset": N, "total": M}`.
   Ties directly into the context-window-budget rule above: an unbounded
   `list_*` tool is the common blowup, a `has_more`/`next_offset` pair is
   the fix. (Re-expressed from anthropics/skills `mcp-builder`, Apache-2.0.)

## Spec version history — what changed and when

- **2024-11-05** — initial spec.
- **2025-03-26** — early revision.
- **2025-06-18** — removed JSON-RPC batching; added structured tool output
  (`structuredContent`/`outputSchema`); tool annotations
  (`readOnlyHint`/`destructiveHint`/`idempotentHint`/`openWorldHint` — a
  client MUST treat these as untrusted unless the server itself is
  trusted); elicitation; resource links; OAuth Resource Server
  classification + RFC 8707 Resource Indicators (see `mcp-security.md`).
- **2025-11-25** (current stable) — SEP-986 tool-name format, icons
  metadata, incremental OAuth scope consent, tool-calling in sampling,
  OAuth Client ID Metadata Documents, experimental Tasks, JSON Schema
  2020-12 as default dialect, SEP-1303 error classification above.
