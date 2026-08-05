# Docs & docstrings

Coverage that earns its lines. Docstring/comment language = `docstringLang` in `~/.config/impulse/config.json` (`ru` default, `en` option). Identifiers and commits: always English.

## Docstring ladder

| Code | Docstring |
|---|---|
| Public / exported symbol, public endpoint | Full: purpose, params + constraints, returns, errors, side effects (DB writes, events published) |
| Simple internal with a non-obvious contract | One line |
| Self-evident (`isEmpty`, getters, trivial mappers) | Nothing — a docstring here is noise |

Example (Go, ru):

```go
// RegisterPayment регистрирует оплату заказа. Идемпотентен по idempotencyKey.
// Ошибки: ErrOrderNotFound, ErrCurrencyMismatch.
// Побочные эффекты: запись в payments, публикация PaymentCaptured через outbox.
```

## Comments

1. Comment = why, constraint, or invariant. Never what — the code says what.
2. Do comment: non-obvious decisions, numeric constants, third-party bug workarounds, spec references.
3. Process comments banned: "changed per request", "as agreed", "rewritten to async", authorship marks. History lives in git.
4. Ceiling markers are comments: `// impulse: <ceiling>, <upgrade trigger>` — see ladder.md. Marker without trigger = rot.
5. No commented-out code "for later". Delete it; git remembers.
6. No emoji anywhere: code, comments, docs, logs.

## No TODO / no stubs

| Banned | Instead |
|---|---|
| `TODO`, `FIXME`, `XXX` | finish it, or file a tracker task |
| `panic("not implemented")`, `NotImplementedError`, `pass`, `return nil // temp` | don't declare the function |
| Empty functions declared "for the interface" | add when a caller exists |

Invariant: everything declared in code works. Doesn't fit this iteration → task in the tracker, zero trace in code.

## Service docs — the whole list

| Artifact | Content |
|---|---|
| `README.md` | what the service does (2-3 sentences), how to run, env var table: name, required, default, meaning |
| `contracts/` | proto / OpenAPI / AsyncAPI — machine-readable source of truth |
| `migrations/` | versioned schema history, from migration #1 |

That is the complete list. Contract changed → `contracts/` updated in the same commit; prose retelling of the contract is not written.

## Banned doc ceremony

1. Forced `docs/` tree; per-service overview/api/data-model/runbook/relations file sets.
2. «Связи» sections, C4 diagrams, glossary files, doc-task bookkeeping.
3. Docs describing history instead of current state.
4. ADRs are impulse-project-management territory: project has an ADR system → record architecture decisions there. impulse-backend adds no ADR machinery.
