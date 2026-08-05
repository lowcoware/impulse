---
name: impulse-dependency-audit
description: "Audit third-party dependencies for CVEs, transitive risk, and supply-chain attacks (typosquatting, protestware, hijacked maintainer, malicious postinstall) before adding them and periodically after. Lockfile discipline, pinning, minimizing the tree. Use for \"is this package safe\", \"audit dependencies\", \"add this library\", \"npm/pip/go audit\", vendor review. Triggers: \"/impulse-audit\", \"dependency\", \"package\", \"supply chain\", \"CVE в пакете\", \"зависимост\", \"пакет\", \"безопасно ли ставить этот пакет\", \"аудит зависимостей\", \"уязвимость в зависимости\". Vulnerabilities in OUR OWN code (authn/authz, IDOR, rate limiting, CORS) = impulse-security."
---

# impulse-dependency-audit

Every dep is code you didn't write running with your privileges. This skill
gates what enters the tree and re-checks what's already in it. Pairs with
`impulse-backend/references/deps.md` (the blessed-dep *ladder* — should we add one
at all) — this skill answers *is this specific one safe*.

## Two moments it fires

1. **Before adding** — the ladder said "yes, a dep" (YAGNI → reuse → stdlib →
   platform-primitive → dep, all failed). Now vet the specific package.
2. **Periodically** — CVEs land in deps you already trust. Scheduled scan +
   scan in CI (see `impulse-devops/references/ci.md`).

## Vet-before-add checklist

Run before the first `import`. Any red = justify loudly or pick another.

1. **Name is exact.** Typosquat check — `reqeusts`, `python-sqlite`,
   `crossenv`, `electorn`. Copy the name from official docs, never type it from
   memory. (PyPI/npm typosquatting is a routine attack vector.)
2. **It's the real package.** Right repo, right author, matches the docs link.
   Dependency-confusion: an internal name published to a public registry gets
   pulled preferentially — scope/namespace internal packages.
3. **Alive.** Recent commits, releases, issues answered. Abandoned = unpatched
   CVEs waiting.
4. **Proportionate tree.** `npm i one-liner` that drags 40 transitive deps →
   the `left-pad`/`is-even` tax. Prefer stdlib or a small vetted dep. Check the
   transitive count before committing.
5. **No unexplained install hooks.** `postinstall`/`preinstall` scripts, build
   steps that fetch remote code — the classic malware delivery path. Read them.
6. **Known-vuln scan.** `npm audit` / `pip-audit` / `govulncheck` / `osv-scanner`
   against the exact version. Advisory open + no fix → don't adopt.
7. **License fits.** Copyleft (GPL/AGPL) in a proprietary service is a legal
   CVE. Check before, not after.

Load `references/supply-chain.md` when actually auditing (any new dep, periodic
audit, incident) — attack catalog, scanners per stack, lockfile rules, real
incidents.

## Hard rules

1. **Lock, don't hard-pin direct deps.** Commit the lockfile always — it
   freezes the WHOLE graph (direct + transitive), which is the actual
   defense against a silently-hijacked patch. Hard-pinning the direct
   dependency itself in the manifest (exact version instead of `^`/`~`) is
   a separate move, and a CMU empirical study found it backfires: pinning
   direct deps measurably increases the cost of carrying vulnerable/outdated
   versions and can even increase exposure to malicious updates, because the
   deliberate manual bump (when it finally happens) isn't graph-verified any
   more carefully than an automated one would have been. Prefer a narrow
   floating range (`^`/`~`, patch-or-minor) on direct deps + the committed
   lockfile for reproducibility + Renovate/Dependabot proposing bumps as
   reviewable PRs, not auto-merge. Containers/OCI images are the exception —
   pin those to a digest; the CMU finding is about language-ecosystem
   package managers with lockfiles, not image references.
   [Pinning Is Futile, arXiv:2502.06662 (FSE'25)](https://arxiv.org/pdf/2502.06662)
2. **Read install scripts of anything new.** One `postinstall` audit is cheaper
   than one credential exfil.
3. **Scan in CI, not just locally.** A vuln that lands after merge needs to
   surface on the next build (`impulse-devops` CI gate).
4. **Minimize the tree.** Fewer deps = smaller attack surface. Every transitive
   dep is trust you extended without asking.
5. **A CVE in a dep is your bug.** "Upstream's problem" ships the vuln to your
   users regardless. Own it: patch, pin-back, or replace.

## Boundaries

- Should we add a dep *at all* (the ladder) → `impulse-backend/references/deps.md`.
- Runtime secrets/authz/edge hardening → `impulse-security`.
- Wiring the scan into the pipeline → `impulse-devops/references/ci.md`.
- "stop impulse" / "normal mode": revert to default behavior.
