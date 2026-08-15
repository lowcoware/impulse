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
   `ssh-keyscan`, that's the MITM hole. **Why not OIDC here:** OIDC
   federation (GitHub Actions → short-lived cloud credentials, no
   `AWS_SECRET_ACCESS_KEY`-style long-lived key sitting in secrets forever)
   is the right fix for cloud-API deploys (AWS/GCP/Azure), and is
   meaningfully more secure than a static key when the target IS a cloud
   IAM principal. It doesn't apply to this SSH-to-VPS pattern — there's no
   OIDC trust relationship an SSH server can consume, so the deploy key
   itself stays the credential; the mitigations above (dedicated key,
   environment gate, reviewers) are what carries the weight OIDC would
   carry in a cloud-native pipeline.
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
    and lint workflows with `actionlint` + `zizmor` in CI.
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
[rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
