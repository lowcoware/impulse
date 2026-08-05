# Store: MinIO — media, 3D scenes

One of six blessed non-core stores (see `deps.md`). `arch:` compounds
silently over months; `bug:` is catchable in a single diff. Platform
primitive over app code, name the ceiling, cite real incidents.

**Use when** storing binary blobs clients stream/upload directly (media,
3D scenes, anything >~1MB) that should scale independently of the DB.
**Not when** the blob is small (<1MB) and needs transactional consistency
with relational rows in the same commit — that's a Postgres `bytea`.
Never the local filesystem for anything that must survive a restart or be
shared across replicas.

**arch:**

1. **Long-lived presigned URLs.** Leak via access logs, browser history,
   Referer headers; no revocation short of rotating the whole access key
   — minio-go's default/max presign is 7 days. *Fix:* mint per-request,
   expiry ≤15min for downloads, ≤1h for uploads, never persist/cache the
   URL.
2. **Single-PUT for large 3D scene files.** App buffers the whole object
   in memory, hits HTTP timeout on multi-hundred-MB files, no resume on
   network drop. AWS recommends multipart above ~100MB, requires it above
   5GB (same limit applies to MinIO's S3-compatible API). *Fix:* client
   uploads directly to MinIO via presigned multipart, resumable.
3. **One shared bucket + prefix-per-service.** No IAM boundary — any
   service's key can read/delete any other service's objects, so one
   compromised service owns everything. *Fix:* bucket-per-service, scoped
   access key + explicit bucket policy per bucket.
4. **Proxying uploads/downloads through the app server.** App becomes the
   bandwidth/memory bottleneck; transfer latency ties to app pod capacity
   instead of scaling with MinIO. *Fix:* app only issues/validates
   presigned URLs, client talks directly to MinIO/Traefik-fronted MinIO.
5. **Relying on implicit/default bucket policy.** "Private by default"
   assumption unverified in IaC — a debug `mc anonymous set public` left
   in prod. *Fix:* declare policy explicitly in compose provisioning,
   deny-by-default, assert it in a smoke test.

**bug:**

1. `PresignedPutObject(ctx, bucket, key, 7*24*time.Hour)` — long/default
   expiry hardcoded "for convenience." *Fix:* short constant, expiry from
   config, never a literal multi-day duration.
2. `io.ReadAll(file)` → `bytes.NewReader()` → `PutObject` — buffers an
   entire scene file (potentially GBs) into memory before upload. *Fix:*
   stream the `io.Reader` directly, or do client-side multipart so the
   server never holds the full object.
3. No content-type/magic-byte validation on the upload handler — accepts
   arbitrary MIME (e.g. `.glb` uploaded as `text/html`), enabling type
   spoofing on download. *Fix:* validate extension against magic bytes,
   enforce an allowlist, set `Content-Disposition`.
4. One app-wide root/admin MinIO client used across all services/buckets
   instead of least-privilege. *Fix:* per-service IAM policy + dedicated
   access key.
5. `MakeBucket` with no immediately-following `SetBucketPolicy` — new
   bucket inherits whatever the server default is. *Fix:* always call
   `SetBucketPolicy` right after bucket creation in provisioning code.

**Incidents:**
GHSA-hv4r-mvr4-25vw (CVSS 7.5, MinIO/AIStor, 2026) — signature
verification was gated on presence of the `Authorization` header; an
attacker supplying only `X-Amz-Credential` as a query param skipped
verification entirely and could write arbitrary objects to any bucket
knowing only a valid access key. Fixed in `RELEASE.2026-04-11T03-20-12Z`.
[github.com/minio/minio/security/advisories/GHSA-hv4r-mvr4-25vw](https://github.com/minio/minio/security/advisories/GHSA-hv4r-mvr4-25vw)
CVE-2023-28432 — MinIO in distributed-deployment mode leaked all
environment variables, including `MINIO_SECRET_KEY`/`MINIO_ROOT_PASSWORD`,
via an unauthenticated endpoint. CVSS 7.5.
[github.com/Chocapikk/CVE-2023-28432](https://github.com/Chocapikk/CVE-2023-28432)

Docs: [AWS presigned URL best practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/presigned-url-best-practices/logging-interactions.html) ·
[AWS multipart thresholds](https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html) ·
[MinIO security advisories](https://github.com/minio/minio/security/advisories)
