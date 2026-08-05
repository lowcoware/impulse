# LLM gateway — Claude-primary, OpenAI-compatible fallback

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
