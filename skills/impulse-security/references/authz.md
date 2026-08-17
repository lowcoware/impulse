# Authorization — RBAC, ABAC, and IDOR

## RBAC vs ABAC — default to RBAC

RBAC covers roughly 90% of real needs (NIST SP 800-162). Default to
role-based checks for coarse permissions; add narrow attribute-based
(ownership, tenant-scoping) checks only where roles genuinely can't
express the rule. Building a full ABAC policy engine greenfield, before
roles have proven insufficient, is the over-engineering direction most
teams actually hit — the more common mistake is ABAC-by-default, not
RBAC-that-turned-out-too-coarse.

## Past ~3 roles: declarative rules in one place, not `if`-sprawl

Once role-based checks scatter across more than roughly three roles, `if`
chains diverge between endpoints and stop being reviewable as a set.
Three real projects converge on the same fix — permissions as declarative
rules checked in one place, not hand-written per endpoint: Infisical uses
**CASL** (`@casl/ability`, TS) — `can('read', 'Secret', {projectId})`
rules that ALSO compile to a DB-query filter (`@ucast/mongo2js`), so the
rule automates the "condition lives in the WHERE clause" IDOR fix above
instead of replacing it. Authelia uses **CEL** (`google/cel-go`) —
access-control rules as CEL expressions in config, the same
spec'd/sandboxed expression language Google uses, not a bespoke
mini-language. Trivy uses **Rego** (OPA) for policy checks — the same
engine Kubernetes/Gatekeeper uses, so the skill transfers even without a
cluster. Pick one when the third-role line is crossed; treat the choice
as an ADR-worthy decision, not a default.

**CASL's actual selling point isn't the `can`/`cannot` syntax — it's that
the same rules compile to a query filter.** `AbilityBuilder` builds rules
(`can('update', 'Post', {authorId: user.id})`, `cannot('delete', 'Post',
{status: 'published'})`) that check in-memory (`ability.can(...)`) AND —
via `accessibleBy(ability)` — compile to a MongoDB-style query object you
hand straight to the DB driver (`Post.accessibleBy(ability).exec()` in
mongoose, or `db.collection('posts').find(accessibleBy(ability,
'update').ofType('Post'))` raw). That's the point: one rule set produces
both the in-memory check and the DB-level filter, so there's no
fetch-broadly-then-filter-in-app-code path to forget on one endpoint (the
exact IDOR risk in the checklist below). [stalniy/casl](https://github.com/stalniy/casl).

**OPA: sidecar (REST, most common, upgrade OPA independently) vs
embedded-as-library (Go `rego` package, no network hop, but OPA version
is pinned to your build).** Docs recommend the SDK "if you're unsure
which one to use." Either way, the input convention is a single JSON
`input` document (`{"input": {"method": "GET", "path": [...], "subject":
{...}}}`) the policy reads as the `input` var — keeps the policy decoupled
from your API shape. `opa test . -v` runs the Rego test suite (`_test.rego`
files, `test_` prefixed rules) — wire it as a CI gate so a policy change
that breaks an allow/deny case fails the build, not production.
[OPA integration docs](https://www.openpolicyagent.org/docs/integration).
A Claude Code skill already covers this end to end —
[Void3110/rego-skill](https://github.com/Void3110/rego-skill): generates
Rego with default-deny, RBAC and ABAC examples, a 10-point security
checklist, and enforces `opa check` + `opa test . -v` before calling a
policy done.

**RBAC vs ABAC vs ReBAC — this file's RBAC-default above still holds; add
ReBAC only when the resource graph itself is the permission model.**
OpenFGA (Zanzibar-style ReBAC) is warranted once authorization questions
shift from "what role does this user have" to "what is this user's
relationship to this resource, and to resources related to it" — flat
RBAC "breaks down with hierarchy, sharing, or multi-tenancy" (per-doc,
per-folder sharing; nested groups; ownership that inherits down a tree).
[OpenFGA authorization concepts](https://openfga.dev/docs/authorization-concepts).
Don't reach for ReBAC to solve what a `WHERE owner_id = ?` clause or a
CASL condition already solves — it's for when permissions ARE the graph,
not when they're a lookup on one row.

## IDOR — an authorization bug, not an authentication bug

Insecure Direct Object Reference: the token is perfectly valid, verified,
unexpired — and the endpoint still returns another user's data because the
database lookup isn't scoped by the authenticated principal.

**The exact code-level tell, reviewable in a diff:**

```
GetResourceByID(id)                          // Go — id from URL/path/body
Resource.objects.get(pk=id)                  // Python/Django
db.query(Resource).filter_by(id=id)          // Python/SQLAlchemy
```

Any of the above where `id` comes from user input and the query has **no**
additional filter by `owner_id == current_user.id` (or a subsequent
explicit `if resource.OwnerID != userID { return 403 }` check) is a
candidate IDOR. Grep-able pattern: object lookup by user-supplied ID with
zero references to the auth-context variable anywhere in the same
function.

## A server action is a public endpoint

Nuxt's `server/api`/`server/routes` and Next's `"use server"` functions look
like plain function calls from the component that invokes them — the
client/server boundary disappears from the code. It hasn't disappeared from
the network: each one is still a normal HTTP endpoint, reachable directly
with curl regardless of how many places in the UI call it, or whether a
button that triggers it is hidden. "Authorization always on the server" is
the same rule as for a REST/tRPC handler; the only thing that changed is
that nothing in the source forces the author to notice they wrote an
endpoint. Treat every server action/route handler as a review target on the
same checklist below, not as trusted internal code because it's colocated
with the component (`Fullstack — стек`).

## Real incidents — the textbook progression

**Peloton (2021)**: first had no authentication at all on GraphQL
endpoints — anyone could query any user's data. After patch #1 added
authentication, any *logged-in* user could still fetch any *other* user's
private profile data (age, weight, location) — the auth fix didn't touch
authorization, IDOR survived the patch untouched. This is the canonical
"fixing authn doesn't fix authz" case; treat it as the standard shape to
check for whenever an auth bug gets patched — ask explicitly whether the
authz gap was fixed too, don't assume it was bundled.

**T-Mobile (Jan 2023, 37M records)**: root-caused to API authorization
config gaps, exploited roughly six weeks before detection. Underscores
that IDOR/BOLA-class bugs (Broken Object Level Authorization) are the
dominant API breach vector now — ahead of injection-class bugs in
frequency. Not just an impression from headline incidents: BOLA is OWASP's
own #1-ranked API security risk (API1:2023) and shows up in roughly 40% of
observed API attacks — the highest single-vulnerability share in that
population, which is why this file leads with IDOR rather than treating it
as one line-item among many.
[OWASP API1:2023: Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)

## Review checklist

1. Every resource-by-ID lookup: is there an ownership/tenant check in the
   same function, not three layers away where it's easy to miss?
2. Every "fix an auth bug" diff: does it also address authorization on the
   same endpoint, or just authentication? Ask explicitly if unclear.
3. Bulk/list endpoints: does the query filter by the authenticated
   principal at the DB level, or does it fetch broadly and filter in
   application code after the fact (a slower, easier-to-get-wrong pattern
   that's also an IDOR risk if the post-filter step is ever skipped on one
   code path)?
