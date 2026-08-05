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
[GH Actions deployments & environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
