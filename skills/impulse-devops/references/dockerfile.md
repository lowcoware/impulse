# Dockerfile — multi-stage

1. **Dependency manifests before source.** Copy `go.mod`/`go.sum` /
   `requirements.txt` and install BEFORE `COPY . .` — a source-first COPY
   invalidates the dependency-install layer on every code change, forcing a
   full re-download each build. The single most common cache mistake. Not
   a marginal win: teams correcting exactly this ordering commonly report
   70-85% CI/CD pipeline-time reductions. For multi-stage builds
   specifically, registry cache needs `mode=max` to cache INTERMEDIATE
   stage layers too — the default `mode=min` only caches the final stage,
   so a naive registry-cache setup on a multi-stage build silently misses
   most of the win this rule is supposed to buy.
   [freeCodeCamp: optimizing Docker build cache, 80% pipeline-time cut](https://www.freecodecamp.org/news/how-to-optimize-your-docker-build-cache/)
2. **Pin base images by digest** (`golang:1.23-alpine@sha256:...`), not just
   tag — tags are mutable, a digest guarantees byte-identical rebuilds.
3. **Non-root `USER` in the final stage.** Build stage needs compilers/root;
   runtime should never run as root.
4. Alpine (musl, has a shell) for fast-iterate/debuggable services;
   distroless (no shell, smaller attack surface) for high-stakes prod —
   distroless kills `docker exec` debugging, so take it only once logs/
   metrics are solid.
5. `.dockerignore` mirrors `.gitignore` plus `.git`, `.env*`, `*.pem`,
   `*.key` — a missing one ships `.git` history and local `.env` secrets
   baked into image layers, recoverable by anyone who pulls the image (even
   if a later `RUN rm` "deletes" them — they persist in the earlier layer).

Go:
```dockerfile
FROM golang:1.23-alpine@sha256:<pin> AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app ./cmd/api
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /app /app
USER nonroot:nonroot
ENTRYPOINT ["/app"]
```

Python:
```dockerfile
FROM python:3.14-slim@sha256:<pin> AS build
WORKDIR /app
COPY requirements.txt .
RUN pip install --user -r requirements.txt
COPY . .
FROM python:3.14-slim@sha256:<pin>
RUN useradd -u 1000 -m appuser
COPY --from=build /root/.local /home/appuser/.local
COPY --from=build /app /app
USER appuser
ENV PATH=/home/appuser/.local/bin:$PATH
CMD ["python", "-m", "app"]
```

Sources: [Docker multi-stage](https://docs.docker.com/build/building/multi-stage/) ·
[build best practices](https://docs.docker.com/build/building/best-practices/) ·
[digest pinning](https://docs.docker.com/dhi/core-concepts/digests/)
