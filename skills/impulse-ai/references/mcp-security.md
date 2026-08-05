# MCP security — trust boundaries, real incidents, cost guardrails

## Three trust boundaries

1. **LLM ↔ client** — the LLM can't independently verify a tool
   description is accurate; it trusts whatever the server declares.
2. **Client ↔ server** — weak auth or missing response validation is the
   common gap; the spec makes authorization OPTIONAL, so a server that
   skips it isn't violating spec, just shipping insecure by default.
3. **Server ↔ downstream systems** — an over-broad server credential (a
   token with more access than any single tool call needs) turns one
   compromised tool call into a compromised downstream system.

Treat tool descriptions AND tool outputs as untrusted, executable input —
review and version them like code, not like static config.

Local-HTTP server hardening: bind `127.0.0.1`, never `0.0.0.0`, and
validate the `Origin` header on every request — a malicious webpage can
DNS-rebind onto a localhost-listening MCP server and drive it from the
browser if either is skipped.

## Tool poisoning — a real, named attack class

Malicious or rug-pulled tool descriptions redefine behavior post-install,
or a tool's returned content embeds hidden instructions (a fake
"compliance report" result telling the agent to read a sensitive file and
exfiltrate it). Documented real case (Invariant Labs, WhatsApp MCP
integration): a benign `get_fact_of_the_day()` tool silently swapped its
own definition to exfiltrate chat history to an attacker number, hiding
the stolen data off-screen via whitespace padding.

**Defenses:**
1. Require structured/schema-validated tool output; reject free text that
   doesn't match the declared schema.
2. Isolate high-privilege tools from any agent context that also talks to
   third-party/untrusted MCP servers — don't let one agent session hold
   both a filesystem-write tool and an untrusted web-fetch tool.
3. Enforce authorization server-side — a system-prompt instruction telling
   the model "don't do X" is not a security control, it's a suggestion the
   model can be talked out of.
4. Allowlist vetted servers only; don't auto-trust a new MCP server
   because a tool description sounds legitimate.

**Scale, not a rare edge case:** ~5.5% of a 1,899-server sample showed
active tool poisoning; a compromised server cascades to other servers in
the same session 72.4% of the time once it happens. Dozens of MCP-specific
CVEs surfaced in the first months of 2026 alone, spanning trivial path
traversal up to a CVSS 9.6 RCE. **The field's own honest position** (2025
publications from OpenAI, Anthropic, and Google DeepMind, converging
independently): prompt injection cannot be fully solved within current LLM
architectures — any defense expressed as a prompt instruction is itself
overridable, no matter how it's worded. The 2026 state-of-the-art response
is enforcing security OUTSIDE the model, not training it to refuse better:
systems like CaMeL, FIDES, Progent, and RTBAS mediate agent actions with
deterministic capabilities/information-flow policies rather than trusting
model judgment, and report near-elimination of attacks on the AgentDojo
benchmark specifically. Rule 3 above ("enforce server-side") is this
principle applied to MCP — not a stopgap until models get smarter, but the
only mechanism that's shown to actually work.
[Practical DevSecOps: MCP security statistics 2026](https://www.practical-devsecops.com/mcp-security-statistics-2026-report/) ·
[Zylos: indirect prompt injection defenses, 2026 state of the art](https://zylos.ai/research/2026-04-12-indirect-prompt-injection-defenses-agents-untrusted-content/)

## Named CVEs — concrete, not hypothetical

- **CVE-2025-6514** (mcp-remote, CVSS 9.6) — arbitrary OS command
  execution when connecting to an untrusted MCP server; 437k+ downloads
  affected.
- **CVE-2025-49596** (MCP Inspector, CVSS 9.4) — drive-by RCE via a
  malicious webpage.
- **SQL injection in Anthropic's own reference SQLite MCP server**
  (Trend Micro research) — unsanitized table names concatenated via
  f-strings, PoC demonstrated stored-injection hijacking a support bot to
  email customer data to an attacker. Forked 5,000+ times before the repo
  was archived; Anthropic declined to patch, citing archived/reference-only
  status. **Lesson: a reference implementation's popularity doesn't imply
  it's hardened — audit any forked reference server as if it were
  first-party code you own.**
- **GitHub MCP Server cross-repo leak** (Invariant Labs) — a malicious
  GitHub Issue in a public repo injects instructions that get an agent
  with access to a private repo to leak its data into an autonomously
  created PR. Framed by the researchers as an architectural flaw (any
  agent with access to both trusted and untrusted content is exposed),
  not a code bug in that specific server.

## OAuth 2.1 — the current authorization baseline

For HTTP-transport MCP servers (STDIO servers use environment credentials
instead, per spec SHOULD guidance): MCP server = OAuth 2.1 resource
server, client = OAuth 2.1 client. MUST implement RFC 8707 Resource
Indicators (audience-bound tokens — a token minted for server A must not
be accepted by server B), RFC 9728 Protected Resource Metadata, RFC 9207
issuer validation. Tokens never go in query strings. This directly
prevents the confused-deputy pattern where a proxy/gateway MCP server acts
with broader privilege than the individual requesting client actually has.

## Cost/loop-runaway guardrails

Documented postmortem: an autonomous multi-agent loop with no budget cap
ran 264 hours and spent ~$47K before billing data caught it. Root cause
was the absence of *pre-execution* enforcement, not a missing dashboard —
alerts fire after the money's spent. Concrete, enforced (not just
monitored) guardrails:

1. Hard step cap on any agentic loop — a maximum number of tool calls per
   task, enforced in code, not a suggested limit in a prompt.
2. Hard USD budget gate — the loop cannot proceed past a spend threshold
   regardless of how promising the current trajectory looks.
3. Loop/duplicate-call detector on `(tool_name, args)` hashes — the same
   call repeating is a strong signal something is stuck, catch it
   mechanically rather than waiting for a human to notice.

## n8n-specific note

n8n ships native MCP nodes (MCP Server Trigger, MCP Client Tool) — the
Server Trigger has **no authentication by default**, a gap n8n's own
security documentation names explicitly. If exposing n8n as an MCP
server, treat the default-no-auth state as a BLOCK-severity finding, not
an acceptable default. General n8n AI-workflow anti-patterns: deep nested
IF/branch trees added early make debugging brittle (test one branch at a
time); split monolithic workflows into sub-workflows with dedicated error
handling (retry+backoff, alert-on-failure) around each action node; PII
sent unmasked to a third-party model node, and no human-review gate before
a sensitive automation (HR/finance/customer comms) fires, are both
reviewable red flags in a workflow definition.
