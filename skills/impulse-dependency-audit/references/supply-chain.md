# Supply-chain — attacks, scanners, incidents

## Attack catalog

| Attack | Mechanism | Defense |
|---|---|---|
| Typosquatting | Malicious pkg with a near-miss name | Copy name from official docs; lockfile review |
| Slopsquatting | Attacker pre-registers a package name an LLM hallucinates, then waits for an agent or developer to install it | Verify every AI-suggested package resolves on the real registry before install — never trust a name because it "sounds right"; see below |
| Dependency confusion | Internal pkg name published public, pulled preferentially | Scope/namespace internal pkgs; configure registry priority |
| Maintainer hijack | Stolen npm/PyPI creds push malware in a patch | Committed lockfile (freezes the graph) + reviewed bumps via Renovate/Dependabot — see Lockfile discipline below on why hard-pinning the manifest isn't the actual defense here |
| Protestware / sabotage | Maintainer weaponizes own pkg | Committed lockfile so a floating range never silently pulls the sabotaged version; watch maintainer signals |
| Malicious install hook | `postinstall` runs on `npm i` before any code you wrote | `--ignore-scripts` by default; read hooks; `npm i` in a sandbox |
| Build-tool backdoor | Compromised build stage injects payload | Reproducible builds; pin build toolchain digests |
| Starjacking | Fake pkg claims a popular repo's stars for trust | Verify the repo link actually matches |

**Slopsquatting detail:** LLM package-name hallucinations are highly
reproducible, not random noise — one study found 43% of hallucinated names
appeared on every one of ten identical re-runs, and a 2026 industry
analysis found ~27.8% of one leading model's dependency recommendations
were names that don't exist at all. Attackers register the predictable
hallucinated name and wait. This is the exact reason `SKILL.md`'s
vet-before-add checklist item 1 says "copy the name from official docs,
never type it from memory" — the same rule now also covers "never trust a
name an agent typed from its own memory" without an independent registry
check.
[CSA: slopsquatting research note](https://labs.cloudsecurityalliance.org/research/csa-research-note-slopsquatting-ai-supply-chain-20260419-csa/) ·
[Package hallucination re-evaluation, arXiv:2605.17062](https://arxiv.org/pdf/2605.17062)

## Scanners per stack

| Stack | Tool | Runs |
|---|---|---|
| Go | `govulncheck` | CI + pre-add; symbol-aware (flags only reachable vulns) |
| Python | `pip-audit` | CI + pre-add; against installed set |
| JS/TS | `npm audit` / `pnpm audit` | CI; noisy — triage by reachability |
| Any / polyglot | `osv-scanner` (Google, OSV.dev) | CI; one tool across ecosystems |
| Containers | `trivy` / `grype` | image scan in `impulse-devops` build |

Advisory sources: OSV.dev (aggregate), GitHub Advisory DB, ecosystem-native
(`RUSTSEC`, `PyPA`). Wire one into CI so new CVEs in pinned deps surface on the
next build, not at exploit time.

## Lockfile discipline

- Commit the lockfile (`go.sum`, `poetry.lock`/`uv.lock`,
  `pnpm-lock.yaml`/`package-lock.json` — one per repo, never both).
  It's the record of *exactly* what ran — for BOTH direct and transitive
  deps, which is the actual defense against a silently-hijacked patch.
- **Manifest constraint on direct deps: narrow floating range, not a hard
  pin.** Counter-intuitive but empirically supported: hard-pinning direct
  dependencies measurably increases the cost of carrying vulnerable/
  outdated versions and can even raise exposure to malicious updates,
  because the eventual manual bump isn't graph-verified any more carefully
  than an automated Renovate/Dependabot PR would have been. A separate
  survival-analysis study of real-world constraint patterns found
  floating-major minimizes staying outdated, floating-minor minimizes
  staying vulnerable, and recommends a floating-range + lockfile hybrid
  over pinning either way. The lockfile is what freezes reality; the
  manifest range is what lets a bot propose a sane update at all.
  [Pinning Is Futile, arXiv:2502.06662 (FSE'25)](https://arxiv.org/pdf/2502.06662) ·
  [Dependency constraint-type survival analysis, arXiv:2510.08609](https://arxiv.org/pdf/2510.08609)
- Containers: pin base images by **digest** (`@sha256:...`), not tag — tags are
  mutable (`impulse-devops/references/dockerfile.md`); this exception holds
  because there's no lockfile-equivalent freezing the image reference.
- Bumps via Renovate/Dependabot → reviewable PRs. Never blanket auto-merge;
  auto-merge only patch-level of already-vetted deps if at all.
- `npm ci` / `uv sync --frozen` / `go mod verify` in CI — install from the lock,
  fail on drift.

## Real incidents (why the rules exist)

- **xz-utils backdoor (CVE-2024-3094, 2024)** — a long-game maintainer social-
  engineered commit access, hid a backdoor in release *tarballs* (not the git
  tree) targeting sshd. Lesson: build from source you can inspect; even trusted
  upstreams get compromised; reproducible builds matter.
- **event-stream (2018)** — popular npm pkg handed to a new "maintainer" who
  added a dep that stole crypto wallet keys via a transitive chain. Lesson:
  transitive deps are trust you didn't grant; maintainer changes are a signal.
- **node-ipc protestware (2022)** — maintainer shipped code that wiped files /
  wrote protest messages based on geo-IP, via a floating version with no
  lockfile pinning it down. Lesson: the lockfile is what would have stopped
  this from auto-pulling — `latest` with no committed lock means arbitrary
  future code on the next install anywhere.
- **colors/faker sabotage (2022)** — author intentionally broke own hugely-
  popular pkgs with infinite loops. Lesson: even non-malicious maintainer acts
  break you if nothing freezes what actually gets installed — same lockfile
  argument, not a case for hard-pinning the manifest itself.
- **PyPI/npm typosquat campaigns (ongoing)** — thousands of near-miss-named
  malicious pkgs with credential-stealing install hooks. Lesson: exact names +
  `--ignore-scripts`.

## Prioritizing CVEs once they exist — EPSS over bare CVSS

CVSS scores severity (how bad IF exploited); EPSS scores probability
(likelihood it actually gets exploited in the wild). Published comparisons
find EPSS meaningfully outperforms bare CVSS for prioritization — better at
both catching what actually gets exploited and not wasting effort on what
won't. Don't drop CVSS entirely though: EPSS alone can under-weight a
business-critical exposure that just hasn't been widely exploited yet.
Practical rule: triage by EPSS first (what to fix soonest), but a
business-critical asset with even a moderate EPSS score doesn't wait for
the score to climb — severity still gates urgency on your own crown jewels.
[Intruder: EPSS vs CVSS for vulnerability prioritization](https://www.intruder.io/blog/epss-vs-cvss)

## SLSA — build provenance, not a dependency-vetting substitute

SLSA (Supply-chain Levels for Software Artifacts, OpenSSF) scores the
BUILD process's integrity — provenance, tamper-resistance — not any given
dependency's trustworthiness; it's the complementary axis to everything
above, not a replacement for it. Levels run 0-3: level 2 is the realistic
bar for most production software (signed provenance, hosted/scripted
build), level 3 is for high-risk/regulated builds (hardened, isolated build
platform). Relevant here mainly as a question to ask of a dependency's OWN
build pipeline when evaluating "how compromised could this package's build
step get without anyone noticing" — not something this skill's own CI needs
to chase past level 2 without a specific regulatory trigger.
[OpenSSF: SLSA project](https://openssf.org/projects/slsa/)

## Malicious-package lifetime — detection is fast, the exposure window still matters

Automated scanning increasingly catches malicious packages within minutes
of publication — but "fast" isn't "zero": a real 2026 incident (Bitwarden
CLI package compromise) had a 93-minute window before removal, long enough
for automated installs (including agent-driven ones) to pull the poisoned
version. Lockfile discipline is what limits blast radius during that
window — a project that installs from a committed lock only picks up the
poisoned version on the NEXT deliberate bump, not on every fresh `install`
run everyone does in the meantime.

## Dependency health risk — proactive, before an attack ever happens

The attack catalog above is reactive (what to watch for once something's
already gone wrong). This is the proactive complement: scoring a
dependency's *likelihood* of becoming a supply-chain vector, before any
CVE exists. Flag a dependency if it hits any of:

| Risk factor | Why it matters |
|---|---|
| Single maintainer / tiny team, not org-backed | One person bribed, phished, or burnt out can push malicious code unilaterally — the exact left-pad/event-stream shape. Prolific, identity-verified maintainers lower this; anonymous ones raise it. |
| Unmaintained / stale / archived | A real vuln in it won't get patched in time — you inherit the risk indefinitely. |
| Low popularity relative to peers | Fewer eyes means a malicious change goes unnoticed longer. |
| High-risk feature surface (FFI, deserialization, arbitrary code exec) | These are exactly the primitives an attacker exploits once in — scrutiny should scale with blast radius, not just popularity. |
| History of high/critical CVEs disproportionate to complexity | Track record predicts trajectory — though for extremely popular projects, more CVEs partly reflects more scrutiny, weigh accordingly. |
| No security contact (no security-policy file, no listed email) | A found vulnerability has no safe disclosure path — it either goes public immediately or nowhere. |

Overlaps by design with `SKILL.md`'s "Alive" pre-add gate (one binary
check, applied to every new dep) — this table is the scored version for a
periodic/pre-audit pass on the existing tree, not a duplicate rule to keep
in sync separately. Run when: adding a new dependency outside the blessed
stack (deps.md's new-dep rule already requires justification — this is
what the justification should weigh), or auditing an existing dependency
tree before a security-sensitive release. Not a CI gate — proportional to
how security-sensitive the surface actually is.
(Re-expressed from trailofbits/skills `supply-chain-risk-auditor`,
CC BY-SA 4.0.)

## Keeping intel fresh

Any curated threat list (bad-package names, IOC hashes, malicious-maintainer
watchlist) rots in weeks. If you maintain one: date-stamp it in the file
header, name the refresh sources (OSV/Socket/ecosystem advisories), and
treat a stale date as a finding in itself — undated intel reads as current
when it isn't.

Note: all incidents are public advisories/CVEs; summarized in own words, not
copied. Scanner behaviors are documented tool features.
