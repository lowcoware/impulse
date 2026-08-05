# Context7 — live docs layer for the impulse suite

Training data has a cutoff; library APIs don't stop moving at it. Context7
is an MCP server that fetches current docs/snippets for a resolved library
ID, so code gets written against what the package actually does *today*,
not what it did at training time. This file is the single source — every
impulse-* skill below points here instead of repeating the protocol.

## Requires setup — say so once if missing

Context7 is a separate MCP server, not bundled with impulse. If a context7
tool call errors or the tool isn't in the available set: tell the user
once ("context7 не подключен — доки не проверены, ставь через
`claude mcp add context7`" or equivalent), then proceed from trained
knowledge and flag the affected claim as unverified. Never silently claim
docs are current when the check didn't run — that's worse than not
checking.

## When to call it — version-sensitive surface only

Call BEFORE writing code, not after something breaks:

| Fires | Skips |
|---|---|
| API/config syntax for a fast-moving lib (Nuxt, Tailwind v4 `@theme`, GSAP, shadcn-vue, Qdrant client, MCP spec, Traefik labels, GH Actions syntax, Flutter/RN APIs post-New-Arch) | Language stdlib, POSIX, SQL, HTTP basics — training data is stable here |
| A migration, "as of vX", breaking-change, or deprecation claim about to be acted on | A library the task isn't touching — no speculative pre-fetch |
| An error message that smells like a moved/removed API (`is not a function`, `unknown option`, 404 in official docs path) | Re-checking a library already resolved earlier in the SAME task |
| User names a version explicitly (`Nuxt 4`, `Tailwind v4`, `Pydantic v2`) — pin to it, don't assume latest | Internal/project-owned code — context7 only knows public packages |

## Call discipline — token economy

1. `resolve-library-id` ONCE per library per task, then reuse that ID for
   every follow-up query in the same task — don't re-resolve on every
   question. The tool itself hard-caps at 3 resolve calls per question;
   treat that as a ceiling, not a target.
2. Query narrow: ask for the specific API/pattern needed, not "give me
   the docs for X". A targeted query returns fewer, more relevant
   snippets — cheaper and more useful than a full-doc dump.
3. One resolve + one query beats guessing wrong and burning a
   correction cycle later — but don't chain 3+ queries fishing for an
   answer; if two targeted queries don't have it, say what's unverified
   and move on.
4. Cite what changed: when a fetched doc contradicts trained assumption
   (renamed option, removed API, new default), name the delta in one
   line — that's the actual value of the check, not the fetch itself.

## Boundary

- Doesn't replace `impulse-dependency-audit` (CVE/supply-chain vetting) —
  context7 answers "how does this API work now", not "is this package
  safe to add".
- Business/domain logic, this project's own code, and anything not a
  public library's documented surface: out of scope, trained knowledge
  and reading the actual code both win here.
