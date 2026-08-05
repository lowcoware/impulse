# Hardening — Rust production traps beyond the baseline

Distilled from leonardomso/rust-skills (harvested GitHub skill, MIT — 265
rules across 26 categories, sourced from the Rust API Guidelines, the
Rustonomicon, the Rust Performance Book, and idioms studied against
ripgrep/tokio/serde/polars/axum). Same role as hardening-go.md/
hardening-python.md: the layer above baseline.md, patterns that pass tests
and review but bite under real load or real `unsafe` misuse. Condensed to
the CRITICAL/HIGH tiers here — reach for the source repo's full 265-rule
set for MEDIUM/LOW-priority polish (naming, macros, project layout).

## Ownership and borrowing

1. Accept the narrowest borrow the function needs: `&[T]` not `&Vec<T>`,
   `&str` not `&String` — accepting the owned/growable type when only
   read access is needed forces every caller to own or allocate one just
   to call the function.
2. Prefer borrowing over `.clone()` by default; reach for `Cow<'a, T>`
   specifically when a function sometimes needs to mutate/own and
   sometimes doesn't, so the common (borrow-only) path stays allocation-free.
3. Concurrency ownership choice is a decision, not a reflex: `Arc<T>` for
   thread-safe shared ownership, `Rc<T>` only single-threaded, `Mutex<T>`
   for interior mutability across threads, `RwLock<T>` specifically when
   reads significantly outnumber writes (an `RwLock` under a read-heavy
   but not read-dominant load can lose to a plain `Mutex` on writer
   starvation).
4. `Copy` only for small, cheap-to-duplicate types; move (or `Box`) large
   types rather than let them get copied implicitly.

## Error handling

5. Library crates return errors via `thiserror` (typed, not stringly);
   application code handles/reports errors via `anyhow` (dynamic, doesn't
   need every call site converting error types). Mixing the two the wrong
   way round — `anyhow` in a library's public API — forces every
   downstream consumer onto `anyhow` too.
6. `.unwrap()` in production code is a finding, not a style nit — it's a
   panic waiting on the first unexpected input. `.expect()` is acceptable
   ONLY for invariants that indicate a genuine bug if false (a "this can't
   happen" internal precondition), never for anything reachable by user
   input or external state.
7. Preserve the error chain (`#[source]` / `.context()`) all the way to
   where it's logged or reported — swallowing the source at any hop turns
   "connection refused talking to payments-api" into a bare "request
   failed" by the time anyone sees it.

## Memory

8. `with_capacity()` whenever the eventual size is known or estimable —
   the default growth reallocation strategy is fine for unknown sizes,
   wasteful when the size was knowable up front.
9. Box large enum variants so the enum's total size isn't dictated by its
   single biggest variant — an enum with one 500-byte variant and five
   8-byte variants costs 500 bytes on every value regardless of which
   variant is actually held, unless the big one is boxed.
10. `mem::take`/`mem::replace` to move a value out of a `&mut` without a
    clone — reaching for `.clone()` here when the original is about to be
    overwritten anyway is a needless allocation.
11. Know drop order explicitly when it matters for correctness (a guard
    that must release after the resource it guards): struct fields drop
    top-to-bottom in declaration order, local variables drop in reverse
    declaration order.

## Unsafe code — non-negotiable, not best-effort

12. Every `unsafe` block gets a `// SAFETY:` comment directly above it
    explaining WHY the invariant the compiler can't check actually holds
    here; every `unsafe fn` gets a `# Safety` doc section stating what the
    CALLER must uphold. An `unsafe` block with no safety comment is
    unreviewable — the reviewer has no way to check the author's reasoning
    without re-deriving it themselves.
13. Keep the `unsafe` block as small as the operation that actually
    requires it — wrapping a whole function `unsafe` when only one line
    needs it hides which specific operation was actually the unsafe one.
14. `cargo miri test` in CI for every crate containing `unsafe` code —
    Miri catches undefined behavior (out-of-bounds access, use-after-free,
    invalid transmutes) that compiles cleanly and often runs fine in
    testing right up until it doesn't, on a different platform or
    allocator.
15. Never `mem::uninitialized()` or `mem::zeroed()` for a type with
    validity invariants (a `bool`, an enum, a reference) — an all-zero
    bit pattern is often not a valid value of the type, and the older
    zeroing APIs produce instant undefined behavior for such types.
    `MaybeUninit<T>` is the correct tool.

## Async/await

16. Never hold a `Mutex`/`RwLock` guard across an `.await` point — the
    lock stays held while the task is suspended and every other task
    waiting on it stalls for the full suspension, not just the critical
    section; clone the data you need (Arc it) before the await instead of
    holding the guard through it.
17. `spawn_blocking` for CPU-intensive work inside an async context —
    running a genuinely blocking/CPU-bound operation directly on an async
    task starves the runtime's other tasks scheduled on that same worker
    thread.
18. Every future used in a `tokio::select!` branch must be cancellation-safe
    — `select!` drops the losing branches' futures mid-flight, and a
    future that isn't written to tolerate being dropped partway (e.g. one
    that would lose buffered-but-unflushed data) corrupts state silently
    on exactly the runs where it loses the race.
19. Bounded channels apply real backpressure; an unbounded channel between
    a fast producer and a slow consumer is an unbounded memory leak with
    extra steps — reach for `mpsc`/`broadcast`/`watch`/`oneshot`
    deliberately by the actual communication pattern (one-to-one request/
    response, one-to-many broadcast, latest-value-only), not by habit.

## Concurrency

20. Use the weakest correct memory `Ordering` for every atomic operation —
    reaching for `SeqCst` everywhere "to be safe" isn't free; it's a real
    performance cost paid for a guarantee the operation usually doesn't
    need. Get the ordering right for the actual synchronization pattern,
    don't default to the strongest one out of caution.
21. `std::thread::scope` to borrow stack data across threads instead of
    `Arc`-wrapping data that's provably going to outlive the threads
    anyway — scoped threads let the borrow checker prove the lifetime
    instead of paying a runtime reference-count cost for a lifetime
    that's actually static within the scope.

## Numeric safety

22. Integer overflow gets handled explicitly (`checked_`/`saturating_`/
    `wrapping_`/`overflowing_`) at any boundary where the input isn't
    already bounds-checked — release builds silently wrap on overflow by
    default (debug builds panic), so a debug-clean codebase can still
    silently corrupt a value in production on the exact input that
    overflows.
23. Never compare floats with `==`; use a tolerance comparison, and
    `total_cmp` (not the fallible `partial_cmp`) when floats need a total
    order (sorting, `BinaryHeap`).
24. `TryFrom` for narrowing numeric casts, not `as` — `as` silently
    truncates (a `u64` that doesn't fit in a `u32` just loses the high
    bits) with no error, no panic, nothing to catch it in review.

## Module organization and public surface

25. Prefer the modern `<name>.rs` module file style (`config.rs` +
    `config/parser.rs`) over the legacy `mod.rs` style — the file name
    directly indicates the module name, and there's no ambiguity from
    multiple identically-named `mod.rs` files across a project.
26. Keep modules private (`mod foo;`, never `pub mod foo;`) and publish a
    curated surface via `pub use` at the crate root instead. `pub mod`
    exposes the whole module namespace and its internal path structure as
    public API; `pub use` gives one flat, stable import path
    (`use my_crate::Thing`) while the module layout stays a refactorable
    implementation detail. If a type must be `pub` only because it
    appears in a public signature (Rust's `E0446` rejects a more-private
    type there), leave it `pub` but don't re-export it — living in a
    non-re-exported module makes it unreachable to downstream crates
    despite the keyword.

## Release profile (Cargo.toml)

```toml
[profile.release]
opt-level = 3
lto = "fat"
codegen-units = 1
panic = "abort"
strip = true
```

`codegen-units = 1` and `lto = "fat"` both trade slower compile time for a
faster binary — right default for a service's release build, wrong
default for the dev profile (keep dev fast: `opt-level = 0`, but consider
`[profile.dev.package."*"] opt-level = 3` so dependency code still runs at
a reasonable speed while your own crate stays fast to recompile).

## Anti-patterns — flag on sight in review

`.unwrap()` in a path reachable by external input · holding a lock across
`.await` · `Box<dyn Trait>` where `impl Trait` would do (unless genuinely
storing heterogeneous types or crossing an object-safety boundary) ·
`format!()` in a hot path (allocates every call; `write!()` into a reused
buffer instead) · collecting an iterator into a `Vec` just to immediately
iterate it again · stringly-typed state where an enum or newtype would
make an invalid state unrepresentable.

## Boundaries

Ownership-model and unsafe-code discipline are language-inherent, not
project-specific — apply these regardless of which framework/runtime a
Rust service uses. Framework-specific guidance (axum/actix routing,
tokio-postgres/sqlx patterns) isn't covered here; add a
`stores-*.md`-shaped file if/when a Rust service's data layer needs one.
