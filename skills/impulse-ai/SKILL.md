---
name: impulse-ai
description: >
  Use when BUILDING AI infra. Anti-overengineering patterns for RAG,
  embedding services, Qdrant, LLM
  gateway (Claude-primary + OpenAI-compatible fallback), MCP server/tool 
  design + security, Claude Code subagent conventions — impulse-backend's
  ladder/baseline applied to AI infra. Triggers: "/impulse-ai", "RAG
  pipeline", "embedding сервис", "Qdrant", "MCP сервер", "MCP tool", "LLM
  gateway", "напиши MCP-инструмент", "AI-сервис", "векторный поиск".
---

# impulse-ai

The load-bearing rule: `impulse-backend/SKILL.md` applies first, unconditionally
— an embedding service or MCP server is still a service. This skill adds only
the AI-specific layer on top: RAG/embeddings/vector search, an LLM gateway,
and MCP servers/tools. It doesn't re-derive the general microservice rules.

## Inherits from impulse-backend, unconditionally

- Day-one baseline: health/metrics/graceful-shutdown/timeouts/config validation.
- The ladder and blessed-stack discipline.
- Event/outbox rules when an AI service crosses a boundary via Kafka.
- Review inheritance is literal too: an AI-infra diff is judged against the
  `BE-*` rows of [`shared/rule-spine.md`](../../shared/rule-spine.md), since
  this skill declares no enumerated ruleset of its own.

## RAG / embeddings / Qdrant

- Chunking strategy and retrieval eval without building an over-engineered harness.
- Embedding-model versioning — watch for the "compare vectors across model versions" trap.
- Qdrant collection/index/HNSW hardening.
- Vector-DB decay patterns that compound over months: orphaned vectors, no TTL, drift with no alert.
- Parallel to `impulse-review`'s `arch:` tag philosophy for regular services.

Detail: `references/rag.md`, `references/qdrant.md`. For a corpus small
enough that a dedicated vector DB is the overengineered choice:
`references/pgvector.md`.

## LLM gateway

- Claude-primary + OpenAI-compatible-fallback pattern.
- Per-provider timeout/retry/circuit-breaker, not a blanket retry-storm risk.
- Untrusted content isolation: tool results and fetched docs belong in
  `tool_result` blocks, never the system prompt.
- Output validation before trusting LLM output downstream.
- The OpenAI-compat shim is a fallback path, not a primary one.

Detail: `references/llm-gateway.md`.

## MCP servers and tools

- Tool granularity is a real tradeoff: consolidate around workflows, not thin
  per-endpoint wrappers — but too few, too broad tools also fail.
- Naming/description is the model's primary decision surface.
- The 2025-11-25 spec's error-classification rule: validation errors are Tool
  Execution Errors so the model can self-correct, never Protocol Errors.
- Context-window budget discipline.

Detail: `references/mcp-server.md`.

**Security is not optional for an MCP server** — it's a trust boundary on
three sides (LLM↔client, client↔server, server↔downstream) with
documented real CVEs and a tool-poisoning attack class already seen in
production. Detail: `references/mcp-security.md`.

## Claude Code subagents

General subagent policy (contract, tool scoping, context isolation,
orchestration, model routing) lives in `shared/subagents.md` — the suite-
wide owner. `references/subagents.md` here holds only the AI-infra-specific
addendum (RAG-subagent citation discipline, MCP-tool-scoped subagents).

## References — load on demand

| File | Covers | Load when |
|---|---|---|
| references/rag.md | chunking, retrieval eval (promptfoo/Ragas), contextual retrieval, embedding versioning/caching, ONNX Runtime for classification/OCR/embedding tasks that don't need an LLM, code-level AI bugs (normalization, blocking calls, rate-limit backoff) | building or reviewing a RAG pipeline |
| references/qdrant.md | collection design, multitenancy, payload indexing, HNSW tuning order, memory/quantization, embedding-model migration, snapshots, decay patterns | any Qdrant-touching diff |
| references/pgvector.md | vector search inside Postgres (halfvec, HNSW config, filtered-search strategy, binary quantization) — the pre-Qdrant ladder rung | corpus small enough a dedicated vector DB isn't earned yet, or the project already runs Postgres |
| references/llm-gateway.md | provider fallback/circuit-breaker, when self-hosting via vLLM earns its place, prompt-injection isolation, output validation, price/context-window table as a repo file (LiteLLM reference schema), OpenAI-compat-shim caveat | building the Claude/OpenAI-compatible gateway |
| references/mcp-server.md | tool design, granularity, naming, error classification, context budget, response-shape/pagination conventions, spec version history | building an MCP server or tool |
| references/mcp-security.md | trust boundaries, egress-proxy + code-sandbox as separate services, tool poisoning, OAuth 2.1, real CVEs, cost/loop-runaway guardrails | any MCP server (tool poisoning applies even to stdio/localhost), any exposed server, any agentic loop with spend risk |
| references/subagents.md | AI-infra addendum only (RAG citation discipline, MCP-scoped subagents) — general policy is `../../shared/subagents.md` | designing a RAG/MCP-facing subagent specifically |
| references/speech.md | STT streaming-vs-batch, Vosk-vs-Whisper, VAD, sample-rate silent bug, self-host sizing, ElevenLabs TTS cache-by-hash | any STT/TTS/voice feature |
| references/prompts.md | prompt versioning (promptfoo for regression, when Langfuse's 4-datastore footprint is/isn't earned), user-facing prompt injection (Air Canada/Chevy/DPD), never-let-output-authorize, LLM output eval | managing prompts or evaluating LLM output |
| [../../shared/context7.md](../../shared/context7.md) | Qdrant client/MCP spec/LLM SDK API syntax before writing against it — spec and client versions move fast | building against Qdrant, an MCP SDK, or a provider SDK |

## Boundaries

- General backend hardening (Go/Python async, DB pools, gRPC) →
  `impulse-backend/references/hardening-go.md` + `hardening-python.md` — this skill doesn't repeat it.
- Overengineering/baseline/bug review on a diff touching this code →
  `/impulse-review`'s existing tags apply unchanged; this skill's rules feed
  new Finds into `bug:`/`arch:` where domain-specific (see cross-refs in
  each reference file).
- n8n-specific low-code AI workflow patterns are noted in
  `references/mcp-security.md`'s security section (n8n ships native MCP
  nodes) — n8n itself isn't a service this skill builds, just a system it
  needs to interoperate securely with.
- "stop impulse" / "normal mode": revert to default behavior.

## Before you finish

- Does `impulse-backend/SKILL.md`'s day-one baseline apply here, and is it satisfied — this is the load-bearing rule the whole skill sits on?
- If this touches RAG/Qdrant, is chunking/retrieval eval covered without an over-engineered harness?
- If this touches the LLM gateway, is untrusted content (tool results, fetched docs) kept out of the system prompt?
- If this is an MCP server, are validation errors classified as Tool Execution Errors, not Protocol Errors, and is `references/mcp-security.md` addressed?
- Would this diff be judged clean against the `BE-*` rows of `shared/rule-spine.md`?
