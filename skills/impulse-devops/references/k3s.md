# k3s — manifest mechanics past the Compose threshold

`deploy.md` sets the line: more than one prod machine, more than ~10
services/env, or more-than-daily zero-downtime deploys. Below it, stop —
Compose is still the answer and nothing here applies. Past it, this file
is the mechanics `deploy.md` flagged as not-yet-covered: what to actually
write and run, not whether to adopt k3s.

## 1. Helm vs raw manifests vs Kustomize

No universal winner — pick per artifact, not per cluster:

| Use | When | Why |
|---|---|---|
| Helm | Deploying a third-party workload (Postgres operator, cert-manager, ingress-nginx, Prometheus stack) | The chart already exists, versioned, maintained upstream — writing your own manifests for it is re-solving a solved problem |
| Kustomize | Your own app, multi-env (dev/staging/prod) | Plain YAML + overlay patches, no templating language to learn, `kubectl apply -k` native, and the rendered output is literally what gets applied — easy diff review in a PR |
| Raw manifests | Single-env, small service count, near the threshold | Fewer moving parts than either; stop reaching for tooling before the duplication actually hurts |
| Helm for your own app | Only once another team/customer needs to `helm install` it | Packaging/versioning/rollback machinery that a single internal deploy target doesn't need |

Combining is normal and not an anti-pattern: Helm to package/pull a
third-party chart, Kustomize overlay on top for env-specific patches.
[Kustomize vs Helm comparison](https://spacelift.io/blog/kustomize-vs-helm)

## 2. Manifest hygiene checklist

Sourced from [learnk8s/kubernetes-production-best-practices](https://github.com/learnk8s/kubernetes-production-best-practices)
(open checklist, `02-your-manifests.md` / `03-your-security.md`) — every
row below is a real gap that ships broken if skipped, not defensive
boilerplate:

| Check | Rule | Why it bites when skipped |
|---|---|---|
| Resource requests/limits | Every container sets CPU + memory `requests` and `limits`; set `ephemeral-storage` too if the app writes temp files/cache/uploads | No request → scheduler treats it as zero footprint, overpacks the node; no limit → one runaway container starves its neighbors |
| Probes | `readinessProbe` + `livenessProbe` always; `startupProbe` for slow-boot apps | Readiness failure pulls the Pod from Service endpoints (no restart) — that's the traffic gate. Liveness failure restarts the container — reserve it for real deadlocks, an over-strict liveness probe restarts an app that would've recovered on its own |
| PodDisruptionBudget | `minAvailable` or `maxUnavailable` set on every multi-replica Deployment | Without it, a node drain (upgrade, scale-down) can take out every replica at once — PDB only covers voluntary disruptions, not a node crashing |
| securityContext | `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, drop all capabilities unless one is proven needed | UID 0 in the container maps to UID 0 on the node without user namespaces — a container escape is a root shell on the host, not a sandboxed one |
| NetworkPolicy | Default-deny per namespace, then explicit allow for ingress/egress per workload (don't forget DNS egress) | Flat pod-to-pod networking is the default — any compromised pod can reach every service and every internal DB unless something says otherwise |

```yaml
resources:
  requests: {cpu: 100m, memory: 128Mi, ephemeral-storage: 1Gi}
  limits:   {cpu: 500m, memory: 256Mi, ephemeral-storage: 2Gi}
securityContext:
  runAsNonRoot: true
  readOnlyRootFilesystem: true
  capabilities: {drop: ["ALL"]}
```

NetworkPolicy only works if the CNI enforces it (k3s ships Flannel by
default, which does not — swap in Canal/Calico if default-deny is a hard
requirement, not an afterthought).

## 3. Existing baseline maps onto k8s primitives, doesn't get replaced

`impulse-backend/references/baseline.md`'s health/shutdown/logging
contract is exactly what k8s primitives consume — nothing new to build,
just wire the existing endpoints in:

| Baseline (already built) | k8s primitive | Wiring |
|---|---|---|
| `/health/live` | `livenessProbe` | httpGet path `/health/live` |
| `/health/ready` (503 while a dependency is down) | `readinessProbe` | httpGet path `/health/ready` — the 503 IS the readiness-gate signal, no extra logic needed |
| Graceful shutdown on SIGTERM (drain in-flight, flip ready to 503 first) | `terminationGracePeriodSeconds` + optional `preStop` | Default grace period is 30s — raise it if in-flight requests can run longer; a `preStop: {exec: {command: ["sleep", "5"]}}` covers the gap between endpoint-removal propagating and SIGTERM arriving, since both start at the same instant, not sequentially |
| Structured JSON logs w/ `correlation_id`/`trace_id` | no k8s primitive — collected by DaemonSet log shipper (Promtail/Fluent Bit) reading stdout | Nothing to change; k8s captures container stdout/stderr and this format was already shipper-ready |

[k8s pod termination lifecycle, CNCF](https://www.cncf.io/blog/2024/12/19/decoding-the-pod-termination-lifecycle-in-kubernetes-a-comprehensive-guide/)

## 4. k3s-specific footguns vs vanilla k8s

1. **Datastore: SQLite is single-server only, embedded etcd is the HA
   step, not an external DB.** Default is embedded SQLite — fine for one
   server node, but "SQLite cannot be used on clusters with multiple
   servers" (k3s docs). Multi-server HA uses embedded etcd, turned on with
   `--cluster-init` at first boot; migrating an existing SQLite install to
   etcd is the one supported migration path (restart the server with
   `--cluster-init`). External Postgres/MySQL/MariaDB via
   `--datastore-endpoint` is a third option for teams that already run a
   managed DB and don't want etcd's operational surface — not needed
   until multi-server. [k3s datastore docs](https://docs.k3s.io/datastore)
2. **Traefik ships as the default ingress — this plugin's edge/TLS
   knowledge carries over.** `cert-tls.md`'s ACME resolvers and routing
   labels apply the same way, just expressed as `IngressRoute` CRDs
   instead of Compose labels. Disable with `--disable=traefik` only if a
   different ingress controller is a hard requirement.
3. **ServiceLB (Klipper) is the built-in `LoadBalancer` implementation —
   MetalLB is a deliberate swap, not a default gap.** ServiceLB binds
   hostPorts on nodes and needs zero extra config, which is why it's the
   default; MetalLB is for when hostPort binding isn't acceptable (port
   conflicts, needing a stable external IP via BGP/L2 advertisement).
   Swapping requires `--disable=servicelb` at install — running both
   fights over the same Service. [k3s networking docs](https://docs.k3s.io/networking/networking-services)
4. **Air-gap install is a documented two-path split.** With a private
   registry available: load the image tarball, retag, push to the
   registry, point `registries.yaml` at it. Without one (edge deployments
   where running a registry isn't practical): the image tarball is copied
   directly into containerd's local image store on each node — no
   registry involved at all. Pick based on whether a registry is
   operationally viable at the deploy site, not by default.
   [k3s air-gap install docs](https://docs.k3s.io/installation/airgap)

## 5. Secrets: k8s `Secret` is base64, not encryption

Already flagged in `deploy.md` — repeating the operational consequence
here because it's a manifest-writing decision, not just a fact to know.
`kubectl get secret x -o jsonpath='{.data.password}' | base64 -d` is the
entire "decryption" step; anyone with namespace read or etcd-backup
access has plaintext. Never commit a raw `Secret` manifest to git. Tier
selection (SOPS vs sealed-secrets vs external manager, and which
sensitivity needs which) is owned by
`impulse-security/references/secrets.md` — this file only owns the
consequence of getting it wrong inside a manifest.

## 6. GitOps is the delivery mechanism past the threshold

`kubectl apply` from a CI job (the SSH-deploy pattern `ci.md` uses for
Compose) doesn't carry over cleanly — there's no single "current state"
file to diff against, and a manual `apply` drifts from git the first time
someone runs an emergency `kubectl edit`. ArgoCD or Flux close that gap:
the cluster continuously reconciles against a git repo instead of a
one-shot push.

- **ArgoCD**: pull-based, renders via either Helm or Kustomize, has a
  web UI for diff/sync state — reach for it when a visual audit trail
  and manual-sync gating matter.
- **Flux**: pull-based, exposes `Kustomization` and `HelmRelease` as
  native CRDs — reach for it when the whole workflow should stay
  kubectl/CRD-native with no separate UI to run.
- Either way: CI's job changes to "build image, push, bump the tag in
  the git repo the controller watches" — the controller does the
  `apply`, not the pipeline. This is what makes rollback `git revert`
  again, unlike the SSH-deploy image-tag-pin rollback in `deploy.md`.

[GitOps best practices overview](https://akuity.io/blog/gitops-best-practices-whitepaper)

## Not yet covered

RBAC design, CRD/operator authoring, multi-cluster federation, and
autoscaling (HPA/VPA/Cluster Autoscaler) tuning aren't in this file —
none of them are threshold-crossing prerequisites, they're growth beyond
the "compose replacement" scope this file covers.
