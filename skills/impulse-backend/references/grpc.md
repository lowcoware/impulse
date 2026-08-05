# gRPC — building a service

Build/scaffold side. `hardening-go.md`'s gRPC section owns the hardening
(deadline propagation, stream drain, status codes) — this owns proto
layout, codegen, interceptors, and the REST-vs-gRPC decision.

1. **Decision rule:** internal service-to-service = gRPC (typed contract,
   deadline propagation, streaming). Public/browser-facing = REST
   (curlable, cacheable, no grpc-web complexity unless already justified).
   Measured delta backing this, not a vibe: independent 2026 benchmarks put
   gRPC's p50 latency roughly 3-5x lower than REST/JSON on small payloads
   (advantage narrows on large payloads), with protobuf serializing 30-40%
   smaller than the equivalent JSON body — the win is real but concentrated
   on small, frequent, latency-sensitive calls, which is exactly the
   internal-service-to-service case this rule targets, not every call.
   [Ian Gorton: scaling up REST vs gRPC benchmark tests](https://medium.com/@i.gorton/scaling-up-rest-versus-grpc-benchmark-tests-551f73ed88d4)
2. **`buf` over raw `protoc`** — one `buf.yaml`/`buf.gen.yaml`, and
   `buf breaking` gives free enforcement of additive-only evolution. The
   `contracts/` dir (`layout.md`) is the buf module root, versioned subdirs:
   `contracts/orders/v1/orders.proto`.
3. **Package versioning:** version lives in the proto *package*
   (`orders.v1`), not the service name — lets v1 and v2 stubs coexist in one
   binary. Additive-only within a version, same rule as `events.md` schema
   evolution; a breaking change is a new package version.
4. **Interceptors**, chained in this order so rate-limit/auth reject early
   and recovery wraps everything (a panic downstream can't skip logging):
   ```go
   grpc.ChainUnaryInterceptor(recoveryUnary, tracingUnary, loggingUnary, authUnary)
   grpc.ChainStreamInterceptor(recoveryStream, tracingStream, loggingStream, authStream)
   ```
   Use `go-grpc-middleware/v2`, not hand-rolled — the recovery interceptor
   is the process-level version of `hardening-go.md`'s "a spawned
   goroutine's panic isn't caught by the handler's recover" note.
5. **One domain-error-to-gRPC mapping, not ad hoc per handler.** A single
   `AppError` type (or equivalent) that every handler returns through,
   converted at one place into a gRPC `status.Status` plus a machine-
   readable `x-error-code` (or `google.rpc.ErrorInfo` metadata) — the
   status code tells the CLIENT how to react generically (retry? not
   found?), the error code tells calling code which SPECIFIC domain error
   this was, without every handler hand-picking a status code and string
   message independently and drifting inconsistent over time.

Sources: [buf: migrate from protoc](https://buf.build/docs/migration-guides/migrate-from-protoc/) ·
[go-grpc-middleware](https://github.com/grpc-ecosystem/go-grpc-middleware) ·
[Google AIP-185 versioning](https://google.aip.dev/185)
