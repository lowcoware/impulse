# Prompts — management, injection defense, output eval

## Prompt management

1. Prompts are versioned artifacts (template + version id), not inline
   strings — enables diff/rollback independent of a code deploy.
2. Regression testing: golden input → expected-output-*shape* set (same
   pattern as `rag.md`'s golden-query suite) — gate on shape before
   subjective quality.

## User-facing prompt injection

Distinct from `mcp-security.md`'s tool-poisoning and `llm-gateway.md`'s
third-party-content isolation: this is the app's OWN end user typing into
the app's OWN LLM feature, and the model structurally cannot separate
instruction from data.

Real, load-bearing incidents:
- Chevrolet dealer chatbot "agreed" to sell a Tahoe for $1 after a user told
  it to accept anything (harmless only because pricing was never wired to bot
  output).
- DPD's bot swore at and badmouthed the company after a rules update lapsed.
- **Moffatt v. Air Canada** — a tribunal held the airline legally liable for
  a bereavement-fare policy its chatbot fabricated. Courts treat chatbot
  output as company-authoritative.

Defenses:
1. Instruction/data separation at the framework level — reuse
   `llm-gateway.md`'s `tool_result`-block isolation for end-user turns too.
2. Output constraints — schema/enum-bound responses for anything touching
   price, policy, or legal claims.
3. **Never let LLM output itself authorize an action.** The model's claim is
   not the authorization — a real business-rule check gates it server-side.
   An LLM saying "refund approved" is a suggestion, not a refund.

## LLM output eval in production

1. Golden-set regression (non-RAG flavor): fixed inputs → expected shape,
   block merge on mismatch.
2. Hallucination monitoring: LLM-as-judge / reference-based scoring on
   *sampled production* traffic, not just the fixed CI suite — production
   drifts from any static set.
3. Output-schema validation as the quality gate = the same OWASP LLM05
   control `llm-gateway.md` already mandates before downstream use. One gate,
   not a parallel one. **Use native structured output/constrained decoding
   over prompt-only formatting instructions** — measured failure rates
   differ by orders of magnitude, not marginally: prompt-only "output JSON"
   fails 5-10% of the time with zero type guarantee; JSON mode 2-5%; native
   structured output with constrained decoding (masking invalid tokens at
   generation time, not post-hoc validation) under 0.1%, schema-valid
   guaranteed. The latency cost of constrained decoding is now negligible
   on modern inference backends — not a real tradeoff against the
   reliability gain.
   [dev.to: LLM structured output in 2026, method comparison](https://dev.to/pockit_tools/llm-structured-output-in-2026-stop-parsing-json-with-regex-and-do-it-right-34pk)
4. Drift detection: track schema-failure rate and judge-score trend — the
   common failure is a slow creep, not a cliff.

Sources: [OWASP LLM01 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) ·
[Moffatt v. Air Canada](https://www.forbes.com/sites/marisagarcia/2024/02/19/what-air-canada-lost-in-remarkable-lying-ai-chatbot-case/) ·
[Chevrolet $1 Tahoe (AI Incident DB #622)](https://incidentdatabase.ai/cite/622/) ·
[DPD chatbot](https://time.com/6564726/ai-chatbot-dpd-curses-criticizes-company/)
