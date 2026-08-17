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

Same lazy-senior-engineer stance as `impulse-backend` — the ladder, the
day-one baseline, ceiling markers — applied to AI-specific infrastructure:
RAG/embeddings/vector search, an LLM gateway, and MCP servers/tools. This
skill doesn't re-derive the general microservice rules; it adds what's
specific to this domain on top of them.

## Inherits from impulse-backend, unconditionally

Day-one baseline (health/metrics/graceful-shutdown/timeouts/config
validation), the ladder, blessed-stack discipline, event/outbox rules when
an AI service crosses a boundary via Kafka. An embedding service or MCP
server is still a service — `impulse-backend/SKILL.md` applies first, this
skill adds the domain-specific layer. The inheritance is literal in review
too: an AI-infra diff is judged against the `BE-*` rows of
[`shared/rule-spine.md`](../../shared/rule-spine.md), since this skill
declares no enumerated ruleset of its own.

## RAG / embeddings / Qdrant

Chunking strategy, retrieval eval without building an over-engineered
harness, embedding-model versioning (the "compare vectors across model
versions" trap), Qdrant collection/index/HNSW hardening, and vector-DB
decay patterns that compound over months (orphaned vectors, no TTL, drift
with no alert) — parallel to `impulse-review`'s `arch:` tag philosophy for
regular services. Detail: `references/rag.md`, `references/qdrant.md`. For
a corpus small enough that a dedicated vector DB is the overengineered
choice: `references/pgvector.md`.

## LLM gateway

Claude-primary + OpenAI-compatible-fallback pattern: per-provider
timeout/retry/circuit-breaker (not blanket retry-storm risk), untrusted
content isolation (tool results/fetched docs go in `tool_result` blocks,
never system prompt), output validation before trusting LLM output
downstream, and the explicit caveat that the OpenAI-compat shim is a
fallback path, not a primary one. Detail: `references/llm-gateway.md`.

## MCP servers and tools

Tool granularity is a real tradeoff (consolidate around workflows, not
thin per-endpoint wrappers — but too few, too broad tools also fail);
naming/description as the model's primary decision surface; the
2025-11-25 spec's error-classification rule (validation errors are Tool
Execution Errors so the model can self-correct, never Protocol Errors);
context-window budget discipline. Detail: `references/mcp-server.md`.

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
