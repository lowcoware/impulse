# GitHub Actions CI/CD

1. **Split trusted from untrusted.** Build/test/lint gate on
   `pull_request` (no secrets needed). Deploy on `push` to `main`/`release`
   only, in a separate workflow. Require the PR checks via branch protection.
2. **The `pull_request_target` footgun (critical).** `pull_request_target`
   runs with the base repo's context, secrets, and a read-write
   `GITHUB_TOKEN`. If the workflow then checks out the fork's `head.sha` and
   executes anything from it (test script, Makefile, build step), an
   attacker's fork PR runs arbitrary code with your secrets in scope —
   documented real exfiltrations (spotipy GHSA-h25v-8c87-rvm8 leaked the
   client secret; timescale/pgai GHSA-89qq-hgvp-x37m exposed a token for ~2
   months). Rule: if you need write access to label/comment a fork PR, use
   `pull_request_target` WITHOUT checking out PR code at all; run untrusted
   build in a secret-free `pull_request` job that uploads an artifact.
3. **Health gate after deploy.** A post-`up -d` step curls the health
   endpoint through Traefik and fails the job (non-zero) if it doesn't return
   200 within N retries. Without it, "deploy succeeded" just means "container
   started," not "app is serving" — documented as a repeated 3-week
   ship-broken failure mode.
4. **SSH deploy:** `appleboy/ssh-action` (or `webfactory/ssh-agent`,
   key in-memory not on disk) running `docker compose pull && up -d`
   remotely. Dedicated deploy key (not a personal key), scoped to an
   environment-level secret with required reviewers on prod, and a pinned
   `known_hosts` (host key is not secret, commit it) — never blind
   `ssh-keyscan`, that's the MITM hole. This is the "SSH commands from a
   control plane" access model (what GitHub Actions running the deploy key
   above IS) — compare the other two models self-host panels use, since the
   choice sets the blast radius of a compromised control plane: SSH-command
   (Coolify — no agent to install, but the panel/key holds root over every
   server it touches), agent-over-SSH (Beszel — an agent is installed, but
   auth/encryption ride the SSH protocol already solved), agent-with-mTLS
   (Komodo — most setup cost, but the control plane itself is never
   all-powerful and the network can be locked down harder). Our GH-Actions-
   over-SSH deploy is model one; the deploy-key scoping/rotation
   requirements above exist precisely because that model has no cheaper
   substitute for "don't let the key become a skeleton key." **Why not OIDC here:** OIDC
   federation (GitHub Actions → short-lived cloud credentials, no
   `AWS_SECRET_ACCESS_KEY`-style long-lived key sitting in secrets forever)
   is the right fix for cloud-API deploys (AWS/GCP/Azure), and is
   meaningfully more secure than a static key when the target IS a cloud
   IAM principal. It doesn't apply to this SSH-to-VPS pattern — there's no
   OIDC trust relationship an SSH server can consume, so the deploy key
   itself stays the credential; the mitigations above (dedicated key,
   environment gate, reviewers) are what carries the weight OIDC would
   carry in a cloud-native pipeline. **If you do use cloud OIDC elsewhere:**
   GitHub's subject claim used to carry only the (mutable) repo name — a
   renamed or recycled repo/org could mint a token matching an old trust
   policy. Since mid-2026 the claim also carries immutable owner/repo IDs
   (`repo:octocat@123456/my-repo@456789:ref:...`) — update the cloud-side
   trust policy to match, new repos get the new format automatically.
   [GitHub: immutable OIDC subject claims](https://github.blog/changelog/2026-04-23-immutable-subject-claims-for-github-actions-oidc-tokens/)
5. Cache keyed on lockfile hash (`hashFiles('go.sum')`), never `github.sha`
   — a SHA-keyed cache never hits.
6. **Script injection via event fields.** `${{ github.event.issue.title }}`
   / `.pull_request.body` interpolated directly inside `run:` executes
   attacker-controlled text as shell. Route untrusted fields through `env:`
   (`env: TITLE: ${{ ... }}` then `"$TITLE"` in the script) — env values
   don't get shell-expanded.
7. **`environment:` with no reviewers configured hangs silently.** A job
   pointing at a GH Environment whose required-reviewers list is
   empty/misconfigured waits forever with no error — the "deploy stuck for
   an hour" mystery. Check the environment's protection rules exist before
   pointing a job at it.
8. **Concurrency group on every PR workflow, never on deploy.**
   `concurrency: { group: ${{ github.workflow }}-${{ github.ref }},
   cancel-in-progress: true }` — a new push cancels the stale run instead
   of burning minutes on an obsolete commit. Deploy workflows get
   `cancel-in-progress: false` (killing a half-finished deploy is worse
   than a queued one), and with a merge queue the group key must include
   the event or `merge_group` runs collide with PR runs.
9. **`permissions: {}` at workflow top level, grant per job.** The default
   `GITHUB_TOKEN` is read-write across the repo — the blast radius in
   every workflow compromise. Empty at the top, then `contents: read` (or
   what the job actually needs) per job.
10. **Third-party actions pinned to full commit SHA, updated by bot.**
    The March 2025 `tj-actions/changed-files` compromise dumped secrets
    from every workflow referencing it by tag — a tag is a mutable
    pointer an attacker can move. Pin to the 40-char SHA (org policy can
    enforce this since Aug 2025), let Dependabot/Renovate bump the pins,
    and lint workflows with `actionlint` + `zizmor` in CI. GitHub's 2026
    roadmap moves toward immutable action releases (mutable tags
    deprecated at the platform level) plus artifact attestations
    defaulting on for public repos — real hardening, but neither
    substitutes for SHA pinning today.
    [GitHub 2026 Actions security roadmap](https://github.com/orgs/community/discussions/190621)
11. **`timeout-minutes` on every job.** The default is 360 — one hung job
    silently burns six hours of minutes. 10-30 min fits most jobs; a
    timeout that fires is a signal, not an inconvenience.
12. **Caching stack, in order:** `setup-go`/`setup-node`/`setup-python`
    built-in `cache:` first (caches the package-manager store, auto-keyed
    on the lockfile — hand-rolled `actions/cache` of `node_modules`
    breaks across versions); Go additionally persists GOCACHE (build/test
    cache, not just modules — measured minutes per run); Docker builds
    `cache-from/cache-to: type=gha,mode=max`, graduating to
    `type=registry` at the Actions-cache 10 GB / 7-day-eviction limits.
    `RUN --mount=type=cache` mounts do NOT survive ephemeral runners and
    are not saved by layer cache — persist them explicitly
    (buildkit-cache-dance) or don't rely on them in CI.
13. **PR feedback under 10 minutes — structure for it.** Lint/typecheck as
    separate fast-fail jobs (cheapest signal dies in ~1 min, not after a
    10-min bundle); heavy E2E/perf moves to main/nightly, not PR;
    `paths:`/`paths-ignore:` skips runs that touch only docs; a suite
    past ~5 min shards across a matrix (vitest `--shard`, `pytest-split`,
    Go package-list matrix) — but cache deps first or per-shard setup
    eats the win. Python installs: `uv` over pip — measured 5-8 min → 
    30-60 s.
14. **Runner economics.** `ubuntu-24.04-arm` is ~37% cheaper than x64 at
    comparable-or-better perf — default for arch-agnostic Linux jobs.
    Self-hosted runners NEVER on public repos: any fork PR executes code
    on your machine, and a non-ephemeral runner stays compromised for
    every later job.
15. **Rulesets over classic branch protection; merge queue only at real
    contention.** Rulesets are layerable, org-wide, audit-logged, with
    dry-run evaluate mode. A merge queue (cheap checks on `pull_request`,
    full suite on `merge_group`) pays when several PRs land on one busy
    branch daily — below that, branch protection + required checks is the
    whole answer.
16. **"Build, lint, test" is three checks; the working minimum is wider —
    steal it from a project whose own CI builds itself** (Woodpecker,
    Authelia):

    | Check | Tool | Catches |
    |---|---|---|
    | Dependency/image CVEs | `trivy` | known CVEs, misconfig, and SBOM in one pass — run it first, it covers four rows below in one step |
    | Secrets | `trufflehog` | a key committed, before it's buried in history |
    | Dockerfile | `hadolint` | the multi-stage violations `dockerfile.md` lists |
    | Static analysis | `golangci-lint` / `eslint` / `semgrep` | incl. the review checklist `impulse-security` owns |
    | Formatting/lint | `editorconfig-checker`, `yamllint`, `markdownlint` | drift that would otherwise get argued over in review |
    | Docs | `lychee` | dead links |
    | Shell scripts | `shellcheck` | classic bash footguns |

    **Scan the published image, not just the build context** — `trivy`
    reads layers straight out of the registry, which is the only way to
    catch what actually shipped and stays consistent with rule 1's "build
    once, promote the same artifact" (an image scanned before push can
    still drift from what's tagged and deployed).

17. **Semgrep as a dedicated static-analysis gate, diff-aware, SARIF into the
    Security tab.** Row 16's stack lists `semgrep` alongside `golangci-lint`/
    `eslint` as one of several linters — this rule is the concrete wiring for
    running it as its own gate rather than folding it into a generic lint
    step. Trigger on `pull_request: {}` (Semgrep's own diff-aware scanning
    activates automatically in a PR context — it reports only findings
    introduced after the baseline, not every pre-existing hit in files the
    PR happens to touch, which is what keeps a first rollout from drowning a
    legacy codebase in noise) plus `push` to main/release for a full-repo
    scan. Start from `--config auto` (Semgrep's own auto-detection across
    registry rulesets) or an explicit named ruleset — `p/ci` is Semgrep's
    own general low-false-positive CI default, `p/owasp-top-ten` when the
    review checklist is specifically OWASP-Top-Ten-shaped. Emit SARIF and
    upload it so findings land in GitHub's native Security tab next to
    CodeQL, not just console output that scrolls off:
    ```yaml
    semgrep:
      runs-on: ubuntu-latest
      permissions:
        security-events: write   # required to upload SARIF
        contents: read
      steps:
        - uses: actions/checkout@v4
        - run: semgrep scan --config p/ci --sarif --output semgrep.sarif
        - uses: github/codeql-action/upload-sarif@v3
          if: always()
          with:
            sarif_file: semgrep.sarif
    ```
    **Suppression discipline:** a real finding gets fixed; a false positive
    gets a targeted `// nosemgrep: rule-id` (or `# nosemgrep: rule-id` —
    space required after `//`/`#`) on the flagged line, not a blanket
    `.semgrepignore` path exclusion. A ruleless bare `// nosemgrep` silences
    every rule on that line, not just the false positive — always name the
    rule-id. Suppressed findings still register as findings in Ignored
    triage state rather than vanishing, which is what keeps a suppression
    from quietly becoming permanent blindness to that line.

```yaml
deploy:
  needs: [build, test]
  if: github.ref == 'refs/heads/main'
  environment: prod           # required reviewers gate the env secrets
  steps:
    - uses: appleboy/ssh-action@v1
      with:
        host: ${{ secrets.SSH_HOST }}
        username: ${{ secrets.SSH_USER }}
        key: ${{ secrets.SSH_KEY }}
        script: cd /srv/app && git pull && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
    - name: Health gate
      run: for i in $(seq 1 10); do curl -fsS https://app.example.com/health && exit 0; sleep 5; done; exit 1
```

Sources: [GitHub Security Lab: preventing pwn requests](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/) ·
[spotipy GHSA-h25v-8c87-rvm8](https://github.com/spotipy-dev/spotipy/security/advisories/GHSA-h25v-8c87-rvm8) ·
[GH Actions deployments & environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) ·
[SHA-pinning org policy](https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/) ·
[zizmor](https://github.com/zizmor-labs/zizmor) ·
[Docker cache backends](https://docs.docker.com/build/cache/backends/) ·
[GOCACHE in Actions](https://danp.net/posts/github-actions-go-cache/) ·
[buildkit cache-mount persistence](https://depot.dev/blog/how-to-use-buildkit-cache-mounts-in-ci) ·
[ARM runners](https://github.blog/news-insights/product-news/arm64-on-github-actions-powering-faster-more-efficient-build-systems/) ·
[GH merge queue](https://github.blog/engineering/engineering-principles/how-github-uses-merge-queue-to-ship-hundreds-of-changes-every-day/) ·
[rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) ·
[Woodpecker's own pipelines](https://github.com/woodpecker-ci/woodpecker/tree/main/.woodpecker) ·
[trivy](https://github.com/aquasecurity/trivy) · [trufflehog](https://github.com/trufflesecurity/trufflehog) ·
[hadolint](https://github.com/hadolint/hadolint) · [lychee](https://github.com/lycheeverse/lychee) ·
[Semgrep CI overview — diff-aware scanning](https://docs.semgrep.dev/semgrep-ci/overview/) ·
[Semgrep sample CI configs](https://docs.semgrep.dev/semgrep-ci/sample-ci-configs) ·
[Semgrep: ignoring files, folders, and code (nosemgrep)](https://docs.semgrep.dev/ignoring-files-folders-code) ·
[j3ssie/sample-semgrep-ci — SARIF + upload-sarif example](https://github.com/j3ssie/sample-semgrep-ci)
