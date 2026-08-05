# Authorization — RBAC, ABAC, and IDOR

## RBAC vs ABAC — default to RBAC

RBAC covers roughly 90% of real needs (NIST SP 800-162). Default to
role-based checks for coarse permissions; add narrow attribute-based
(ownership, tenant-scoping) checks only where roles genuinely can't
express the rule. Building a full ABAC policy engine greenfield, before
roles have proven insufficient, is the over-engineering direction most
teams actually hit — the more common mistake is ABAC-by-default, not
RBAC-that-turned-out-too-coarse.

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
