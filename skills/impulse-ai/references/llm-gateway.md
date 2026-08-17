# LLM gateway — Claude-primary, OpenAI-compatible fallback

## Self-hosting an LLM (vLLM) — a narrow, not-default decision

Self-hosting via vLLM only earns its place under sustained, constant load
plus a hard requirement not to send data to a third-party API — under
episodic/bursty call patterns the GPU sits idle between calls and a metered
API is cheaper by a wide margin. Don't default to self-hosting because a
project touches LLMs; treat it the same as any other "run our own
infrastructure vs. call a managed API" ladder decision, gated on measured
utilization, not on principle.

A ready-made Claude Code skill for the deployment/benchmarking half already
exists — [vllm-project/vllm-skills](https://github.com/vllm-project/vllm-skills),
an official Anthropic-skill-template repo installable via the Claude Code
marketplace. It covers Docker and Kubernetes deployment (with health
probes) and endpoint benchmarking (prefix-cache hit rate, synthetic-load
throughput, TTFT/TPOT via `vllm bench serve`) against any OpenAI-compatible
serving endpoint. It does **not** cover GPU sizing or quantization — use it
for standing the server up and measuring it, and the sizing gate below for
deciding what to run on it.

### GPU sizing and quantization gotchas

1. `--gpu-memory-utilization` (default `0.9`) is the fraction of device VRAM
   vLLM pre-claims for weights, activations, and KV cache combined — not a
   safety margin the OS enforces. Set it below the default only to leave
   headroom for other processes on the same GPU; otherwise use the largest
   value that stays stable, since a smaller KV-cache budget directly caps
   the number of concurrent sequences the server can batch.
2. Continuous batching (vLLM's default, vs. static/fixed-batch serving) is
   what makes GPU sizing worth doing carefully at all — it admits new
   requests into a running batch as soon as a slot frees up instead of
   waiting for the whole batch to finish, which is what lets a correctly
   sized server sustain high GPU utilization under concurrent load rather
   than idling between fixed batches.
   Source: [vLLM Throughput Guide — PagedAttention and Batching](https://blog.easecloud.io/ai-cloud/increase-throughput-with-vllm-serving/)
3. AWQ/GPTQ quantization trade weight precision for footprint: AWQ cuts
   memory ~4x versus fp16 with limited quality loss, which is the
   difference between needing 4x A100-40GB and 2x A100-40GB to serve a
   70B model — the concrete lever when "self-host" and "GPU budget" are in
   tension. Launch with `vllm serve <model> --quantization awq
   --gpu-memory-utilization 0.9`; a model name ending in `-AWQ`/`-GPTQ`
   still needs the matching `--quantization` flag, vLLM doesn't infer it
   from the name.
4. The server's OpenAI-compatible API mode (`vllm serve`, default port
   `8000`) is what makes self-hosting a drop-in swap: it's the same
   surface any OpenAI-SDK client or LiteLLM deployment entry expects, so
   switching a `model_list` entry's `api_base` to the self-hosted endpoint
   is the only client-side change — no request/response reshaping.

## Provider failure handling

1. Distinguish transient (5xx, network error) from persistent (429, 529 —
   overloaded) failures before deciding to retry. A persistent failure
   retried immediately just adds load to an already-struggling provider.
2. Circuit breaker per provider — pull an unhealthy provider out of
   rotation instead of every concurrent client retrying it in parallel
   (the exact retry-storm pattern `impulse-backend/references/hardening-go.md`
   already warns about, applied to LLM providers specifically).
3. Cap the end-to-end retry/fallback latency budget explicitly. "3 ×
   10s timeout" silently adds 30s+ before failover completes — the budget
   needs to be a stated number, not an emergent property of stacked
   per-attempt timeouts.
4. Track cost per-user/per-request with real-time threshold alerts, not
   just a monthly aggregate — an aggregate bill catches a runaway cost
   weeks too late. Cross-reference `mcp-security.md`'s $47K agentic-loop
   postmortem: the fix there was pre-execution enforcement, not a
   dashboard, and the same lesson applies to any gateway with per-call
   cost.
5. **The per-model price/context-window table is a versioned file in the
   repo, not a hardcoded constant or a value read from a provider's
   dashboard.** Without it, a token count never turns into a dollar figure,
   which breaks rule 4 outright. LiteLLM's `model_prices_and_context_window.json`
   is the reference schema for this — adopt it directly if building on
   LiteLLM, or use it as the field list if rolling a custom gateway.

## LiteLLM as the reference implementation

If this section's requirements are satisfied by adopting **LiteLLM**
outright — single entry point, per-provider retry/timeout, circuit
breaker, load balancing, token/cost accounting, Prometheus export — the
section closes as configuration, not code. Building a custom gateway
instead is legitimate, but LiteLLM's feature set is then the completeness
checklist to build against, not a menu to reinvent from scratch.

Concrete config patterns (all `config.yaml` / proxy-admin-API, not code):

1. **Fallback on provider failure** — `router_settings.fallbacks` maps a
   primary model to an ordered backup list; `litellm_settings.num_retries`
   and `request_timeout` bound the retry before it fires, `allowed_fails`
   + `cooldown_time` pull a provider out of rotation after N failures/min
   (the circuit breaker in rule 2 above, as proxy config rather than
   custom code). Separate `context_window_fallbacks` and
   `content_policy_fallbacks` exist for those specific error classes:
   ```yaml
   litellm_settings:
     num_retries: 3
     request_timeout: 10
     allowed_fails: 3
     cooldown_time: 30
   router_settings:
     fallbacks: [{"gpt-3.5-turbo": ["gpt-4"]}]
   ```
2. **Load balancing across keys/deployments for the same model** — repeat
   the same `model_name` across multiple `model_list` entries (different
   `api_base`/`api_key` each); the proxy distributes requests across them
   and routes around whichever entry is unavailable.
3. **Virtual keys + budgets, per team or per user** — `POST /key/generate`
   and `POST /team/new` take `max_budget` (USD), `budget_duration`
   (`"30s"`/`"30m"`/`"30h"`/`"30d"`), and `tpm_limit`/`rpm_limit`; a
   `model_tpm_limit`/`model_rpm_limit` map narrows the same limits to
   specific models per key. Team budgets, when a key belongs to a team,
   supersede the individual key's — requires a Postgres backend. This is
   the concrete mechanism for rule 4's per-user cost tracking, not a
   dashboard bolted on afterward.
4. **Redis caching layer** — exact-match caching is
   `cache_params.type: redis` with a `ttl`; semantic caching is
   `cache_params.type: redis-semantic` plus a `similarity_threshold`
   (0-1) and a designated embedding-model entry in `model_list` to
   generate the lookup vectors. Same staleness caveat as this file's
   Response Caching section below — LiteLLM's own docs flag semantic
   caching as single-shot-prompt-only, prone to replaying stale answers
   across multi-turn conversations.

Source: [BerriAI/litellm](https://github.com/BerriAI/litellm), [LiteLLM proxy reliability docs](https://docs.litellm.ai/docs/proxy/reliability), [LiteLLM proxy caching docs](https://docs.litellm.ai/docs/proxy/caching), [LiteLLM proxy users/budgets docs](https://docs.litellm.ai/docs/proxy/users)

## Untrusted content isolation

Anthropic's own guardrail guidance: untrusted content (tool results,
fetched documents, any user-supplied text that isn't the direct
instruction) belongs only in `tool_result` blocks or clearly-delimited
user-content areas — **never** the system prompt, never concatenated into
plain instruction text. JSON-encode third-party strings before passing
them through to prevent delimiter breakout (a fetched document containing
text that looks like a role marker or instruction).

## Output validation before trusting downstream

Validate LLM output against a schema (Pydantic/JSON Schema) before it
drives any downstream logic — an LLM response is not guaranteed output any
more than user input is. Unvalidated LLM output chained into a DB write,
an HTTP call, or rendered HTML is OWASP's LLM05 (Insecure Output Handling)
and chains directly into injection/XSS/SSRF/code-exec if the output isn't
checked first.

## The OpenAI-compatible shim — fallback, not primary

Anthropic states its own OpenAI-SDK-compatibility layer is explicitly "not
production-ready for most use cases": no prompt caching, no strict schema
guarantee, system messages get hoisted/concatenated differently than the
native API. Use it as a fallback/migration path only — building the
primary gateway path against the compat shim inherits its limitations as
if they were the platform's, not a temporary workaround.

## Response caching

1. Exact-match: hash `(normalized prompt + params + model version)`. Safe
   default for deterministic/low-temperature, non-personalized calls —
   zero-cost win on repeated prompts.
2. Semantic cache (embedding-similarity lookup) costs an embedding call per
   lookup but catches paraphrases; GPTCache-class systems report ~60-68%
   production hit rates. Only pays off at volume.
3. **Dangerous for** personalized context, time-sensitive facts, or any
   tool-augmented/business-decision call — a cached answer can serve a stale
   authorization/price/policy result (same caution as `prompts.md`'s
   never-let-output-authorize rule). No caching downstream of a
   business-decision call without a TTL tied to the underlying data's
   freshness need.

Source: [GPTCache semantic-cache hit-rate study](https://www.researchgate.net/publication/376404523)
