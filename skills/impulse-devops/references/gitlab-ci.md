# GitLab CI/CD

Same stack, GitLab flavor: MR-gated validation, SSH deploy to a Compose
VPS, self-hosted runner. Facts current as of 2026-08 — GitLab moves fast,
re-verify keywords against docs on version-sensitive claims
(`shared/context7.md` discipline applies).

1. **`workflow:rules` kills the duplicate-pipeline default.** A push to a
   branch with an open MR runs BOTH a branch pipeline and an MR pipeline
   unless top-level `workflow:rules` says otherwise. The canonical guard:
   run MR pipelines for `$CI_PIPELINE_SOURCE == "merge_request_event"`,
   suppress branch pipelines when `$CI_OPEN_MERGE_REQUESTS` is set, keep
   default-branch + tag pipelines. Half the compute for one block of YAML.
2. **`rules:` only — `only/except` is deprecated and frozen.** Never mix
   the two in one job (hard error). MR validation gates on
   `merge_request_event`; deploy gates on default branch/tags.
3. **`needs:` where it shortens the critical path, stages elsewhere.**
   Plain stages are fine at ≤5 jobs; `needs:` (DAG) pays when a stage
   boundary forces an artificial wait — deploy needs build, not lint.
   `needs: []` starts a job at pipeline start. `interruptible: true` in
   `default:` + auto-cancel redundant pipelines so a new push kills the
   stale run.
4. **Cache ≠ artifacts — the classic confusion.** Cache: best-effort,
   keyed, for dependency stores (`node_modules`, pip/go caches), may miss.
   Artifacts: guaranteed, per-pipeline, for build outputs passed between
   jobs. Passing a build output via cache is a race waiting to fire. Key
   caches on lockfiles (`cache: key: files: [go.sum]`) with
   `fallback_keys`; `policy: pull` in consume-only jobs.
5. **Image builds: kaniko is dead (archived Jan 2025, docs removed).**
   Docker-in-Docker with BuildKit/`docker buildx` + `--cache-to/--cache-from`
   registry cache, or rootless buildah. A pipeline still on kaniko is
   running an unmaintained builder — migration is due, not optional.
6. **Cheap speed flags most pipelines skip:** `FF_USE_FASTZIP: "true"`,
   `ARTIFACT_COMPRESSION_LEVEL`/`CACHE_COMPRESSION_LEVEL: "fastest"`,
   `GIT_DEPTH: "1"` on build-only jobs (default clone depth is 20).
7. **Reuse: `extends:` + `!reference`, not YAML anchors; components, not
   templates.** Anchors don't cross `include:` file boundaries —
   `extends:` and `!reference` do. Shared knobs (`image`, `interruptible`,
   `retry`, `tags`) live in `default:`. GitLab stopped accepting new CI
   templates — CI/CD components (versioned, from the catalog) are the
   successor; publish your own only when ≥2 projects share a job.
8. **Protected variables require protected branches — both halves.** A
   deploy secret marked "protected" only stays off unprotected refs if the
   deploying branches/tags are actually protected. Masking is cosmetic
   against a malicious job (format-constrained, exfiltratable) — treat
   "masked" as log hygiene, "protected + protected ref" as the actual
   boundary.
9. **`id_tokens:` (OIDC) for Vault/cloud auth — `CI_JOB_JWT*` was REMOVED
   in 17.0.** Any pipeline still reading `CI_JOB_JWT` is silently broken.
   Same shape as GH Actions OIDC: short-lived federated identity beats a
   long-lived secret in a variable.
10. **Fork MR pipelines are GitLab's `pull_request_target`.** Running a
    fork's MR pipeline in the parent project exposes the parent's CI
    variables to the fork's code. Review the diff before triggering,
    keep protection rules on source and target, or disable
    fork-pipelines-in-parent outright.
11. **Deploy jobs declare `environment:` + `resource_group:`; manual gates
    are `when: manual` + `allow_failure: false`.** `environment:
    name/url` gives deploy history and stop actions (review apps get
    `on_stop` + `auto_stop_in`); `resource_group: production` serializes
    concurrent deploys (two pipelines SSH-ing `up -d` simultaneously is a
    coin-flip); without `allow_failure: false` a skipped manual gate
    blocks nothing — the pipeline just passes around it.
12. **SSH deploy + releases + runner choice.** File-type CI variable for
    the key + `ssh-agent`, pinned `known_hosts` (same MITM rule as the GH
    file), then `ssh host "docker compose pull && docker compose up -d"`;
    health gate after, same as DO-CI3. Tag pipelines cut releases via the
    `release:` keyword + release-cli. Runner: self-hosted docker-executor
    on your own VPS (gitlab.com free tier is 400 compute-minutes/month —
    a real project exhausts it); shell executor never runs untrusted
    code.

Free-tier security scanning worth its single include line:
`Jobs/SAST.gitlab-ci.yml` + `Jobs/Secret-Detection.gitlab-ci.yml` — results
land as JSON artifacts (MR widgets/dashboards are Ultimate-tier, the scan
itself isn't).

```yaml
workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH && $CI_OPEN_MERGE_REQUESTS
      when: never
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_COMMIT_TAG

default:
  interruptible: true

deploy:
  stage: deploy
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
      allow_failure: false
  environment:
    name: production
    url: https://app.example.com
  resource_group: production
  script:
    - ssh deploy@host "cd /srv/app && docker compose pull && docker compose up -d"
    - for i in $(seq 1 10); do curl -fsS https://app.example.com/health && exit 0; sleep 5; done; exit 1
```

Sources: [workflow:rules](https://docs.gitlab.com/ci/yaml/workflow/) ·
[rules](https://docs.gitlab.com/ci/yaml/#rules) ·
[pipeline efficiency](https://docs.gitlab.com/ci/pipelines/pipeline_efficiency/) ·
[caching](https://docs.gitlab.com/ci/caching/) ·
[kaniko archived](https://github.com/GoogleContainerTools/kaniko/issues/3348) ·
[YAML optimization](https://docs.gitlab.com/ci/yaml/yaml_optimization/) ·
[components](https://docs.gitlab.com/ci/components/) ·
[protected variables](https://docs.gitlab.com/ci/variables/#protect-a-cicd-variable) ·
[id_tokens](https://docs.gitlab.com/ci/secrets/id_token_authentication/) ·
[fork MR pipelines](https://docs.gitlab.com/ci/pipelines/merge_request_pipelines/#run-pipelines-in-the-parent-project) ·
[resource_group](https://docs.gitlab.com/ci/resource_groups/) ·
[environments](https://docs.gitlab.com/ci/environments/) ·
[SSH keys in CI](https://docs.gitlab.com/ci/ssh_keys/) ·
[compute minutes](https://docs.gitlab.com/ci/pipelines/compute_minutes/)
