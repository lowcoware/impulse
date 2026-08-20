# ai-tells-extended.md: the backend deep-research sweep

A much larger, less-curated catalog pulled from a dedicated research pass across real sources (academic CWE-mapped LLM-code-quality studies, GitHub AI-bug-scanner rulesets, security research on AI-generated-code vulnerabilities, backend engineering blogs, Habr, Reddit r/golang/r/rust) — specifically to maximize the number of distinct, checkable "this was AI-generated without review" signals across the blessed stack (Go, Python, Rust, Node.js/TypeScript). Expect overlap with baseline.md, ladder.md, the hardening-*.md files, and `impulse-review/references/ai-bug-patterns-be.md` — that's reinforcement from independent sources, not a bug.

**Use it as a checklist, not a novel.** Skim the category relevant to the language/surface at hand before shipping a diff — this is the always-on gate SKILL.md points to, not a load-when-curious reference.

**Coverage note:** the Rust category came back thin (2 items) — this sweep's source pool skewed toward Go/Python/general findings; treat hardening-rust.md as the stronger source for Rust-specific traps until a follow-up pass fills this gap.

## Go tells

1. **Goroutine leak (no cancellation/error channel)** — A goroutine is spawned without a corresponding `context.With*`+cancel plumbed through, or without an error channel, so it becomes a fire-and-forget task that outlives its caller and leaks — the Go equivalent of a dangling promise. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

2. **context.With\* without matching cancel call** — `context.WithCancel/WithTimeout/WithDeadline` is called but the returned cancel function is never invoked (no `defer cancel()`), leaking the context's internal goroutine/timer. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

3. **time.NewTicker/NewTimer without Stop** — A ticker or timer is created but `.Stop()` is never called on it, leaking the underlying timer resource for the life of the process. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

4. **Resource opened without Close (os.Open/sql.Open/file handles)** — `os.Open`, `sql.Open`, or similar handle-returning calls are made with no corresponding `.Close()`/`defer .Close()`, leaking file descriptors or DB connections; detectable by an AST walker diffing acquire vs release call counts per file. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

5. **SSH host-key verification unset or stubbed out** — Go SSH client code leaves `ClientConfig.HostKeyCallback` unset or assigned a no-op, or treats a successful `PublicKeyCallback` invocation as proof of authentication without confirming the key actually completed the handshake. (https://aigent.ly/rules)

6. **Unbounded protocol parsing with no resource budget** — Code processes attacker-supplied protocol data (HTTP/2 headers, HPACK, HTML tokens, SSH agent/GSSAPI messages) without an explicit finite time/memory/CPU budget, and treats stdlib parsing/classification functions as sufficient sanitization at the trust boundary. (https://aigent.ly/rules)

Note: the raw dump's entry 1 (java:S112, generic exception throw/catch) is a Java-specific SonarQube rule, not a Go tell, so it was excluded from this Go-category list rather than merged.

## Python tells

1. **Orphaned asyncio task** — `asyncio.create_task()` is called but the task is never awaited or tracked, so it can be garbage-collected mid-execution or its exception silently lost. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)
2. **Resource opened without a context manager** — `open()` (or a lock/connection/socket) is used directly instead of `with open(...)`, and often without `encoding=`, so the handle isn't guaranteed to close on early return or exception; this same habit shows up as a distinct CWE-772 finding specific to ChatGPT-style generations. (https://github.com/Dicklesworthstone/ultimate_bug_scanner; https://arxiv.org/html/2511.15817)
3. **Friendly-default exception swallowing** — a broad `except Exception:` catches any failure and returns a plausible-looking hardcoded/demo object instead of propagating or logging the error. (https://tenki.cloud/blog/reviewing-ai-generated-code-checklist)
4. **Type assumption without validation** — code calls a type-specific method or passes an argument to a stdlib/library call whose type it never actually verified (e.g. `.islower()` on an unchecked value, `min()` on unorderable objects without `key=`), causing a runtime AttributeError/TypeError. (https://arxiv.org/html/2512.05239v1; https://arxiv.org/pdf/2403.08937)
5. **Mutable default argument** — a function signature uses a mutable object (list/dict/set) as a default value, so the default is shared and mutated across unrelated calls. (https://arxiv.org/html/2511.15817)
6. **Broad/catch-all exception handling** — `except Exception:` or bare `except:` catches any failure instead of specific exception types, swallowing unrelated bugs and making failures silent; consistently one of the most common findings across static-analysis and CWE-mapped studies (CWE-396). (https://arxiv.org/html/2511.15817; https://arxiv.org/abs/2510.26103)
7. **Raising a generic Exception** — `raise Exception("...")` instead of a specific/custom exception class, preventing callers from selectively handling the failure. (https://arxiv.org/html/2511.15817)
8. **Unused import** — a module import is never referenced in the file body, a copy-paste/scaffolding residue. (https://arxiv.org/html/2511.15817)
9. **Unused variable / dead store** — a variable or function argument is assigned or declared but never subsequently read; the single most common defect category found in both ChatGPT and Copilot Python output (CWE-563). (https://arxiv.org/html/2511.15817; https://arxiv.org/abs/2510.26103)
10. **Shadowing a builtin name** — a variable/parameter reuses a builtin name (`list`, `id`, `type`, `input`), silently shadowing it in that scope. (https://arxiv.org/html/2511.15817)
11. **Redefining an outer-scope name** — a nested function, loop, or comprehension variable reuses a name already bound in an enclosing scope, obscuring which binding is active. (https://arxiv.org/html/2511.15817)
12. **Non-idiomatic naming** — identifiers don't follow PEP 8 (camelCase variables, ambiguous single letters, non-snake_case functions); shown to be a shallow, easily-perturbed pattern rather than deliberate design choice. (https://arxiv.org/html/2511.15817)
13. **Redundant else after return/raise** — `if cond: return X` followed by an unnecessary `else: return Y`/`raise`, a template-like control-flow tell. (https://arxiv.org/html/2511.15817)
14. **Reaching into another object's private members** — code accesses a single-underscore-prefixed attribute/method on an object it doesn't own, violating encapsulation. (https://arxiv.org/html/2511.15817)
15. **Undefined global variable** — a `global x` statement references a name never assigned at module scope, indicating sloppy mutable module state instead of proper parameter passing. (https://arxiv.org/html/2511.15817)
16. **Unnecessary dunder-method call** — code explicitly calls `obj.__len__()`/`obj.__eq__(other)` instead of the idiomatic `len(obj)`/`obj == other`, often a cross-language idiom bleed-through. (https://arxiv.org/html/2511.15817)
17. **Python carries structurally higher vulnerability density than JS/TS** — across tools, AI-generated Python hits CWE-mapped findings in roughly 16–18.5% of files vs. ~2.5–9% for JS/TS, a language-level (not tool-level) signal warranting extra scrutiny. (https://arxiv.org/abs/2510.26103; https://arxiv.org/pdf/2510.26103)
18. **Misinterpretation of the spec** — generated code implements a plausible but different operation than what the prompt/docstring actually specifies. (https://arxiv.org/pdf/2403.08937)
19. **Syntax error / unfinished declaration** — the model cuts off mid-statement, commonly an unclosed function signature or missing colon, so the file fails to parse. (https://arxiv.org/pdf/2403.08937)
20. **Silly mistake (redundant/duplicated branches)** — structurally pointless code such as an if/else where both branches do the identical thing, or a no-op type cast. (https://arxiv.org/pdf/2403.08937)
21. **Prompt-biased overfitting** — the implementation is hard-coded to satisfy only the specific example values in the prompt/docstring instead of generalizing to arbitrary inputs. (https://arxiv.org/pdf/2403.08937)
22. **Missing corner case** — the function handles the mainline case but omits edge conditions or alternate representations the spec implies (e.g. missing localhost aliases in a host-check). (https://arxiv.org/pdf/2403.08937)
23. **Hallucinated object** — code calls a helper function/method/object that is never defined or imported anywhere, invented from words in the prompt. (https://arxiv.org/pdf/2403.08937)
24. **Wrong attribute** — code accesses an attribute that doesn't exist on the given object/module (e.g. a nonexistent argparse attribute), a straightforward name-resolution failure. (https://arxiv.org/pdf/2403.08937)
25. **Incomplete generation** — the model stops before finishing the function: bare `pass`, empty body, or trailing off mid-statement instead of returning a value. (https://arxiv.org/pdf/2403.08937)
26. **Non-prompted consideration (unrequested extra logic)** — the model adds behavior-changing logic never asked for in the spec (e.g. sorting output when not requested); the dominant failure mode for the strongest model tested. (https://arxiv.org/pdf/2403.08937)
27. **Swallowed error condition with no corrective action** — code detects an error (falsy return, caught exception, checked status) but takes no action on it — no re-raise, no log, no propagation — distinct from catch-all handling in that it's about inaction rather than over-broad catching. (https://arxiv.org/pdf/2510.26103)

## Rust tells

1. **Unwrap after partial guard** — `.unwrap()`/`.expect()` called on a `Result`/`Option` following only a partial pattern match (e.g. inside an `if let Some(...)` branch that doesn't cover every case), or the `?` operator is skipped entirely, so an untested error/`None` path panics in production instead of propagating an error. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

## Node.js/TypeScript tells

**2. Unhandled promise rejection / missing `.catch()`** — Async/await code and `.then()` chains omit `.catch()`/try-catch around awaits, leaving unhandled rejections that can crash the Node process; note `.finally()` does not count as error handling. (https://www.ranger.net/post/common-bugs-ai-generated-code-fixes; https://github.com/Dicklesworthstone/ultimate_bug_scanner)

**3. Blocking synchronous work inside async handlers** — CPU-heavy synchronous calls are performed inside async request handlers, stalling the Node.js event loop instead of offloading to a worker or async API. (https://www.ranger.net/post/common-bugs-ai-generated-code-fixes)

**4. `await` inside a loop instead of parallel dispatch** — `for (...) { await api.call() }` runs requests strictly sequentially where `Promise.all`/concurrent dispatch was intended, producing a correctness-safe but needlessly slow implementation. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

**5. `parseInt` without radix** — `parseInt(userInput)` called without an explicit radix argument, which in older engines can misparse leading-zero strings (e.g. "08") as octal and return unexpected results. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

**6. Event listener/timer without cleanup (resource leak)** — `addEventListener`/`setInterval` registered with no matching `removeEventListener`/`clearInterval` tied to the component/lifecycle, causing progressive memory or timer-handle leaks. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

**7. Fetch/request without cancellation** — `fetch()` or an outbound HTTP call issued with no abort/cancellation mechanism wired in, so a stalled request can hang the calling workflow indefinitely. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

**8. Missing `async` keyword with `await` present** — `await` used inside a function never declared `async`, a syntax-level mismatch indicating the async body was written without correctly wiring the function signature. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

**9. Use of potentially dangerous functions (CWE-676)** — Generated JavaScript reaches for functions with unsafe semantics (`eval`, unchecked `exec`/`child_process.exec` with string concatenation, `innerHTML`-style sinks) — 35% of all of GitHub Copilot's JavaScript vulnerability findings, its single largest JS weakness category. (https://arxiv.org/abs/2510.26103; https://arxiv.org/pdf/2510.26103)

**10. Uncontrolled resource consumption (CWE-400)** — Loops, recursion, or request handlers with no bound on iteration count, payload size, or allocation (e.g. reading an entire request body into memory with no size cap). 7% of ChatGPT's JavaScript vulnerabilities, 23.5% of Copilot's TypeScript vulnerabilities. (https://arxiv.org/pdf/2510.26103)

**11. Unthrottled resource allocation (CWE-770)** — Allocation of buffers, worker spawns, or queue entries with no configured ceiling — e.g. `new Array(userInput)`-style sizing or unbounded `Promise.all` fan-out driven by request data. 5.9% of ChatGPT's JavaScript vulnerabilities. (https://arxiv.org/pdf/2510.26103)

**12. Unnecessary third-party package for built-in functionality** — Reaches for a package (axios/node-fetch, uuid, moment/date-fns, lodash) when the Node.js runtime already ships an equivalent native API (`fetch`, `crypto.randomUUID`, `node:path`, `node:fs/promises`). Check package.json for deps duplicating node: built-ins. (https://dev.to/chefgs/how-to-avoid-vulnerabilities-in-ai-generated-javascript-and-nodejs-projects-4ggi)

**13. CommonJS `require()` in an ESM-declared project** — Generated code uses `require()`/`module.exports` despite package.json setting `"type": "module"`. Grep for `require(` under an ESM project. (https://dev.to/chefgs/how-to-avoid-vulnerabilities-in-ai-generated-javascript-and-nodejs-projects-4ggi)

**14. Missing or unpinned runtime version declaration** — No `engines` field in package.json and no `.nvmrc`, so the target Node version is left ambiguous for both the AI and CI. (https://dev.to/chefgs/how-to-avoid-vulnerabilities-in-ai-generated-javascript-and-nodejs-projects-4ggi)

**15. Callback-style flow instead of promise/async-await APIs** — Uses legacy callback-passing style (e.g. `fs.readFile(path, cb)`) instead of promise-based equivalents (`node:fs/promises`, async/await), reflecting older ecosystem patterns baked into training data. (https://dev.to/chefgs/how-to-avoid-vulnerabilities-in-ai-generated-javascript-and-nodejs-projects-4ggi)

**16. Missing process-level crash handlers** — An Express/Node service has no top-level `unhandledRejection`/`uncaughtException` handlers that log and gracefully drain connections, so a single malformed request can crash the whole process. (https://aigent.ly/rules)

## Architecture & design tells

**2. Unindexed / unoptimized database queries** — Generated queries lack appropriate indexes or use inefficient access patterns, only surfacing as bottlenecks under production-scale load, not in small tests. (https://www.ranger.net/post/common-bugs-ai-generated-code-fixes)

**3. Excessive cyclomatic/cognitive complexity per method** — Autoregressive generation optimizes for local token coherence and never tracks a running complexity score across a whole method, so single methods accumulate excessive branching/nesting (flagged Critical by java:S3776 and similar rules; Claude 3.7 Sonnet 422 instances, GPT-4o 112 in one study) — a general pattern also observable via any static complexity analyzer. (https://arxiv.org/pdf/2508.14727; https://arxiv.org/pdf/2607.01867)

**4. Dead code: empty placeholder classes/methods and unused elements** — Model emits empty or unfinished classes/methods, unused variables/fields/constants, and unreferenced code as syntactically-plausible scaffolding because detecting non-local usage requires whole-project reference analysis beyond its context (java:S2094 and related rules; worst in smaller models — GPT-4o 531 instances, OpenCoder-8B 661). (https://arxiv.org/pdf/2508.14727; https://arxiv.org/pdf/2607.01867)

**5. Over-handling edge cases inflates design complexity / framework anti-patterns** — Attempting thoroughness without enough project context, models (notably Claude Sonnet 4, ~22.26% of its code smells) over-generate defensive branches and produce framework-idiom violations (broken singleton, missing DI annotations, boilerplate) instead of following project-specific conventions. (https://arxiv.org/pdf/2607.01867; https://arxiv.org/html/2508.14727v1)

**6. Functional-correctness/security inverse trade-off** — The model best at functionally-correct code (highest pass@k) is not necessarily the one producing the most secure code (lower secure@k than its own predecessor); passing functional tests is not evidence the code is safe. (https://arxiv.org/pdf/2311.00889)

**7. Unnecessary / unutilized / imperative / multifaceted abstraction** — Models introduce interfaces or abstract classes never actually used by the rest of the program, doing too much, unneeded for any polymorphism, or leaking implementation detail — a clear over-engineering signature; human baselines show near-zero occurrences vs. ~1.0 per LLM solution. (https://arxiv.org/pdf/2510.03029; https://arxiv.org/abs/2510.03029)

**8. Unwarranted / broken inheritance hierarchy** — LLM solutions introduce broken, cyclic, deep, wide, multipath, or "rebellious" (contract-violating) class hierarchies where a flat single-class design would do, with human baselines at ~0 occurrences vs. non-zero for every LLM. (https://arxiv.org/pdf/2510.03029; https://arxiv.org/abs/2510.03029)

**9. God class / bloated module** — Classes accumulate too many methods/fields, absorbing responsibilities that belong elsewhere, with tight coupling and poor separation of concerns (PMD "God Class"/"Too Many Methods"/"Too Many Fields", DesigniteJava hub-like rules). (https://arxiv.org/pdf/2510.03029; https://arxiv.org/abs/2510.03029)

**10. Quality collapse on OOP-heavy topics** — Across multiple LLMs, code-quality degradation vs. human baseline is worst specifically on object-oriented topics (encapsulation, inheritance, polymorphism, interfaces, generics) rather than procedural logic. (https://arxiv.org/pdf/2510.03029)

**11. Overreliance on eval/exec-style dynamic solutions** — Model reaches for `eval()`/`exec()`-style shortcuts instead of a safe, purpose-built API when facing a dynamic-behavior requirement — a generation-time habit, not a one-off mistake. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

**12. Happy-path-only code generation** — Code assumes inputs/objects are always present and calls always succeed, because training data skews toward tutorial-style happy-path examples and under-represents error handling, concurrency, and cleanup; checkable against a fixed pre-merge checklist (concurrency, connection release, input validation, auth context, retry/backoff, listener cleanup, transactional consistency). (https://github.com/Dicklesworthstone/ultimate_bug_scanner; https://dev.to/pockit_tools/7-hidden-production-bugs-ai-coding-agents-create-and-how-to-catch-them-before-they-crash-f7b)

**13. No cleanup-lifecycle awareness** — Code that registers a resource (listener, timer, subscription, connection) is written with no symmetric teardown anywhere in the same change, because the model models creation but not the full object lifecycle. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

**14. Confident refactor that silently breaks callers** — An agent "cleans up" a module's internals while quietly changing its external contract (renamed params, changed return types, altered defaults); static typing catches signature mismatches but misses behavioral changes distant callers relied on. (https://dev.to/stravukarl/the-bugs-ai-writes-five-patterns-that-show-up-in-ai-generated-code-bl3)

**15. Copy-paste drift across similar components/endpoints** — Generating several similar components, the agent copies the first but applies changes inconsistently to siblings (e.g. one endpoint validates input, another doesn't), invisible until siblings are diffed against each other. (https://dev.to/stravukarl/the-bugs-ai-writes-five-patterns-that-show-up-in-ai-generated-code-bl3)

**16. Dependency/import sprawl** — Agents install new packages liberally for a requested feature even when an equivalent dependency already exists in the project, bloating the dependency tree with redundant/conflicting utilities. (https://dev.to/stravukarl/the-bugs-ai-writes-five-patterns-that-show-up-in-ai-generated-code-bl3)

**17. Missing failure taxonomy in error handling** — No separation between retryable errors (timeout, connection) and permanent errors (permission, invalid request, contract mismatch); everything funnels through one generic `except Exception`. (https://tenki.cloud/blog/reviewing-ai-generated-code-checklist)

**18. Lying success envelope** — A response wrapper hardcodes `success: true` / 200 OK regardless of whether the underlying operation actually completed, e.g. returning success even after falling back to mock/empty data. (https://tenki.cloud/blog/reviewing-ai-generated-code-checklist; https://maciejkepa.dev/blog/ai-generated-code-risks-fallbacks-and-mocks/)

**19. UI success state decoupled from backend truth** — Frontend marks an operation complete purely because it received a syntactically valid HTTP response, without checking an explicit `result_state`/degradation flag, so a swallowed backend failure still shows a green success indicator. (https://tenki.cloud/blog/reviewing-ai-generated-code-checklist; https://maciejkepa.dev/blog/ai-generated-code-risks-fallbacks-and-mocks/)

**20. Fallback with no observability signal** — A fallback/degraded response is returned without a `result_state`, `data_source`, freshness marker, or correlation ID, and without an accompanying metric, so degradation is invisible to telemetry and traces. (https://maciejkepa.dev/blog/ai-generated-code-risks-fallbacks-and-mocks/)

**21. Global-variable overuse / non-locality** — Reaching for module-level or global mutable state instead of passing values explicitly through parameters/return values, typical of quickly generated code. (https://arxiv.org/html/2512.05239v1)

**22. Unnecessary abstraction hurting performance** — Extra layers of abstraction (wrappers, indirection, generic frameworks) not warranted by the requirement, showing up as P99 latency regression after the code ships. (https://clacky.ai/blog/code-review-checklist-ai-generated-code)

**23. High change frequency post-merge** — Files/functions containing AI-generated code get modified unusually often per month compared to human-authored files, an operational signal of latent quality issues pre-merge review missed. (https://clacky.ai/blog/code-review-checklist-ai-generated-code)

**24. Logic drift** — Implementation looks plausible and passes happy-path tests but subtly solves a different problem than the actual specification, with a deviation small enough that ordinary review misses it. (https://contextqa.com/blog/what-is-ai-generated-code-testing-checklist/)

**25. Interface/contract drift between AI code and callers** — AI-generated interfaces or return types subtly differ from what calling code actually expects (wrong field name, type, or shape), only surfacing under contract/boundary tests against real call sites. (https://contextqa.com/blog/what-is-ai-generated-code-testing-checklist/)

**26. Utility/hub-like modularization** — Logic is dumped into a static-only "utility class" instead of proper OO decomposition, or one module becomes a hub most others directly depend on, signaling missing layering. (https://arxiv.org/abs/2510.03029)

**27. Insufficient/broken modularization** — Related behavior that should live in one module is scattered across several, or a module's internal parts are inconsistently grouped, per coupling/cohesion metrics. (https://arxiv.org/abs/2510.03029)

**28. Cyclically-dependent modularization** — Two or more modules/classes depend on each other in a cycle rather than a one-directional graph, making them impossible to build, test, or reuse independently. (https://arxiv.org/abs/2510.03029)

**29. Law of Demeter violation** — Code chains calls through an object's internals to reach a distant object (`a.getB().getC().doThing()`) instead of asking the immediate collaborator, exposing internal structure. (https://arxiv.org/abs/2510.03029)

**30. Excessive coupling / high class fan-out** — A single class references an unusually large number of other classes, per coupling-between-objects and class-fan-out metrics, indicating it knows too much about the rest of the system. (https://arxiv.org/abs/2510.03029)

**31. Deficient/unexploited encapsulation** — Fields/internals are exposed with broader visibility than needed, or getters/setters exist but are never actually used to enforce invariants. (https://arxiv.org/abs/2510.03029)

**32. Excessive public count / hidden field** — A class exposes far more public members than necessary, or a field is shadowed by a same-named parameter/local variable. (https://arxiv.org/abs/2510.03029)

**33. Overly complex function signatures** — Functions generated with excessive parameter count, excessive local variables, or excessive branching (long if/elif chains) instead of being decomposed — detectable by simple AST node counts against a threshold (R0913/R0917/R0914/R0912-style rules). (https://arxiv.org/html/2511.15817)

**34. Architecture and dependency choice generated together, unreviewed** — Asking the AI to produce both design and concrete package choices in one pass leads to silent adoption of weak libraries; mitigated by separating "define rules -> propose options -> review/select -> generate implementation." (https://dev.to/chefgs/how-to-avoid-vulnerabilities-in-ai-generated-javascript-and-nodejs-projects-4ggi)

**35. Library-default trust for security config** — Security-relevant options (JWT algorithm, key type, proxy rules, size limits) are left at library defaults instead of being explicitly declared, treating third-party defaults as an implicit security boundary. (https://aigent.ly/rules)

**36. Library-internal-sanitization assumed sufficient** — Code relies on an ORM/ODM's built-in sanitization for all inputs (including nested logical operators) instead of adding an explicit application-level allowlist/schema-validation layer before query construction. (https://aigent.ly/rules)

## Security tells

1. **Hallucinated/slopsquatted packages** — AI suggests importing a package that doesn't exist or is a near-miss typo of a popular one; attackers pre-register the hallucinated name with malicious code. Verify every new dependency resolves in the real registry and check age/download count. (https://github.com/Arcanum-Sec/sec-context; https://www.ranger.net/post/common-bugs-ai-generated-code-fixes)

2. **Hardcoded secrets/credentials** — API keys, DB passwords, JWT secrets, or tokens embedded as literal strings in source instead of pulled from env vars/secret managers. (https://github.com/Arcanum-Sec/sec-context; https://arxiv.org/pdf/2508.14727)

3. **SQL injection via string-built queries** — Queries assembled by concatenation/f-strings/`.format()` around SQL keywords instead of parameterized queries or prepared statements. (https://github.com/Arcanum-Sec/sec-context; https://www.ranger.net/post/common-bugs-ai-generated-code-fixes)

4. **OS command injection via shell string building** — Shell commands built by concatenating user input, or invoked via `shell=True`/`exec()`/`os.system`, instead of argument arrays with shell disabled. (https://github.com/Arcanum-Sec/sec-context; https://www.ranger.net/post/common-bugs-ai-generated-code-fixes)

5. **LDAP/XPath/NoSQL injection (incl. Mongo `$where`)** — User input concatenated into LDAP filters, XPath expressions, or NoSQL query objects/operators without escaping or safe query builders. (https://github.com/Arcanum-Sec/sec-context; https://aigent.ly/rules)

6. **Server-side template injection (SSTI)** — User-controlled input passed into a template engine's render/compile call (Jinja2, Twig, lodash `_.template`, EJS) as template source rather than data. (https://github.com/Arcanum-Sec/sec-context; https://aigent.ly/rules)

7. **XSS / unescaped output into HTML, log, or shell sinks** — User input echoed into HTML, `innerHTML`, or another output context without context-appropriate encoding; a single encoding pass reused across contexts is a related mistake. (https://github.com/Arcanum-Sec/sec-context; https://www.ranger.net/post/common-bugs-ai-generated-code-fixes)

8. **Missing CSP / HTTP security headers** — Responses omit Content-Security-Policy, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy entirely; observed as a 100%-of-models gap in one study. (https://github.com/Arcanum-Sec/sec-context; https://arxiv.org/html/2504.20612v1)

9. **Weak/predictable session or reset tokens** — Session IDs or reset tokens generated with `Math.random()`, sequential counters, or short values instead of a CSPRNG. (https://github.com/Arcanum-Sec/sec-context)

10. **Session fixation** — Session ID is not regenerated after login/privilege change, letting an attacker fixate a pre-auth session ID and hijack it post-auth. (https://github.com/Arcanum-Sec/sec-context; https://arxiv.org/html/2504.20612v1)

11. **JWT `alg:none` / unpinned algorithm / weak secret** — Verification accepts the `none` algorithm, trusts the algorithm from the token header rather than pinning it server-side, or lets an RSA/EC public key double as an HMAC secret (algorithm confusion). (https://github.com/Arcanum-Sec/sec-context; https://aigent.ly/rules)

12. **Sensitive data in JWT payload / tokens in localStorage** — Passwords or PII placed unencrypted in a JWT payload (base64, not encryption), or tokens stored in localStorage instead of httpOnly cookies, exposing them to XSS theft. (https://github.com/Arcanum-Sec/sec-context)

13. **Insecure password reset flow** — Predictable/non-expiring/reusable reset token, token leaked via `Referer` header, or reset link built from a trusted (attacker-controlled) Host header. (https://github.com/Arcanum-Sec/sec-context)

14. **Deprecated/weak cryptographic algorithms & general crypto misconfiguration** — MD5/SHA1 for password hashing or integrity, DES, weak ciphers/hash functions, or improper padding/cipher-mode choice instead of bcrypt/Argon2 and AES-GCM/ChaCha20-Poly1305. (https://github.com/Arcanum-Sec/sec-context; https://www.ranger.net/post/common-bugs-ai-generated-code-fixes)

15. **ECB mode / static or reused IV-nonce** — Block cipher used in ECB mode, or a hardcoded/reused IV/nonce with GCM/CBC, defeating semantic security. (https://github.com/Arcanum-Sec/sec-context)

16. **Rolling your own crypto** — Custom-written encryption/hashing/signing routines instead of vetted library primitives. (https://github.com/Arcanum-Sec/sec-context)

17. **Weak key derivation** — Encryption keys derived from passwords via a single hash iteration or no KDF, instead of PBKDF2/Argon2/scrypt with proper salt and iteration count. (https://github.com/Arcanum-Sec/sec-context)

18. **Client-side-only validation** — Input validation exists only in frontend code with no server-side re-validation, so a direct API call bypasses it. (https://github.com/Arcanum-Sec/sec-context)

19. **Regex without anchors / ReDoS-prone regex** — Missing `^`/`$` anchors allow partial matches, or nested quantifiers (e.g. `(a+)+`) cause catastrophic backtracking on crafted input. (https://github.com/Arcanum-Sec/sec-context; https://arxiv.org/abs/2510.26103)

20. **Missing canonicalization before validation** — Paths/filenames/unicode are validated before normalization, letting `../`, homoglyphs, or null bytes slip past the check post-decode. (https://github.com/Arcanum-Sec/sec-context)

21. **Debug mode / verbose errors leaking internals in production** — Framework debug mode left on, or stack traces/internal error detail returned directly in API responses. (https://github.com/Arcanum-Sec/sec-context; https://www.ranger.net/post/common-bugs-ai-generated-code-fixes)

22. **Insecure CORS: wildcard + credentials, or reflected origin** — `Access-Control-Allow-Origin: *` combined with `Allow-Credentials: true`, or origin reflected verbatim instead of checked against an allowlist. (https://github.com/Arcanum-Sec/sec-context; https://github.com/Dicklesworthstone/ultimate_bug_scanner)

23. **No CORS policy configured at all** — Backend never sets restrictive CORS headers, leaving endpoints open to any origin by default. (https://arxiv.org/html/2504.20612v1)

24. **Default credentials left in place** — Admin panels/DBs/services generated with default username/password pairs and no forced-change-on-first-login. (https://github.com/Arcanum-Sec/sec-context)

25. **Outdated/unpinned dependencies & deprecated APIs with known CVEs** — Dependencies with known CVEs, unpinned versions that silently pull newer code, or use of deprecated methods/older library versions predating the model's training cutoff. (https://github.com/Arcanum-Sec/sec-context; https://arxiv.org/pdf/2508.14727)

26. **Excessive/unnecessary dependency sprawl** — Casually-suggested packages dragged in for trivial functionality, each pulling dozens of transitive dependencies of unknown maintenance status, widening supply-chain surface. (https://github.com/Arcanum-Sec/sec-context; https://dev.to/chefgs/how-to-avoid-vulnerabilities-in-ai-generated-javascript-and-nodejs-projects-4ggi)

27. **Blind trust in transitive dependencies** — No review or lockfile-integrity check of a dependency's own dependencies, only the top-level package inspected. (https://github.com/Arcanum-Sec/sec-context)

28. **Missing authentication/authorization/rate-limiting on generated endpoints** — New routes generated without an auth check, validation, or throttling applied, especially because the requirement was never stated in the prompt ("correct in isolation, dangerous in system context"). (https://github.com/Arcanum-Sec/sec-context; https://clacky.ai/blog/code-review-checklist-ai-generated-code)

29. **Broken object-level authorization / IDOR** — Endpoint takes a resource ID (or trusts a client-supplied `userId` query/param over the verified auth-context identity) and fetches/mutates it without verifying ownership; also appears as a stub/TODO ownership check added "later." (https://github.com/Arcanum-Sec/sec-context; https://dev.to/pockit_tools/7-hidden-production-bugs-ai-coding-agents-create-and-how-to-catch-them-before-they-crash-f7b)

30. **Mass assignment** — Request body fields bound directly onto a model/struct without an allowlist (e.g. `User(**request.json)`, destructuring `req.body` straight into a DB write), letting an attacker set privileged fields like `role`/`is_admin`. (https://github.com/Arcanum-Sec/sec-context; https://dev.to/pockit_tools/7-hidden-production-bugs-ai-coding-agents-create-and-how-to-catch-them-before-they-crash-f7b)

31. **Excessive data exposure / sensitive information exposure (CWE-200)** — Full internal model/entity serialized back to the client instead of an explicit DTO/field allowlist; or restricted data (PII, internal detail) returned/logged without a recipient check. (https://github.com/Arcanum-Sec/sec-context; https://www.endorlabs.com/learn/anti-pattern-avoidance-a-simple-prompt-pattern-for-safer-ai-generated-code)

32. **Missing rate limiting on sensitive endpoints** — Login, password-reset, OTP endpoints have no per-IP/per-user throttling. (https://github.com/Arcanum-Sec/sec-context; https://arxiv.org/html/2504.20612v1)

33. **No brute-force/account-lockout protection** — Login handler has no failed-attempt counter or lockout after N failures. (https://arxiv.org/html/2504.20612v1)

34. **No CAPTCHA after repeated failed logins** — Login endpoint never triggers a CAPTCHA challenge on repeated failure. (https://arxiv.org/html/2504.20612v1)

35. **Weak/partial password complexity enforcement** — Only length (or length+letters/numbers) checked; symbol/case rules, expiration, and reuse restriction skipped. (https://arxiv.org/html/2504.20612v1)

36. **No multi-factor authentication scaffolding** — Generated auth ships password-only login with no MFA/TOTP/OTP hooks even when "industry-standard secure" auth was requested. (https://arxiv.org/html/2504.20612v1)

37. **Path traversal** — User-supplied filename/path used directly in filesystem operations (or via a raw file-serving function instead of a path-restricted equivalent) without resolving and confining it to an allowed base directory. (https://github.com/Arcanum-Sec/sec-context; https://www.ranger.net/post/common-bugs-ai-generated-code-fixes)

38. **Unrestricted file upload** — Upload handlers accept any extension/MIME/size or trust client-supplied MIME type instead of inspecting content/magic bytes. (https://github.com/Arcanum-Sec/sec-context)

39. **Insecure temp file handling** — Temp files created with predictable names in world-writable directories via unsafe calls (e.g. `tempfile.mktemp`) instead of `mkstemp`-style APIs, enabling race/symlink attacks. (https://github.com/Arcanum-Sec/sec-context)

40. **Log injection** — User input written into log lines without sanitizing newlines/control characters, enabling forged/split log entries. (https://github.com/Arcanum-Sec/sec-context; https://arxiv.org/abs/2510.26103)

41. **Timing-unsafe secret comparison** — Password hashes/tokens/HMACs compared with standard `==` (short-circuiting) instead of a constant-time comparison, enabling timing side-channel attacks. (https://github.com/Arcanum-Sec/sec-context)

42. **JWT/token signature not verified before trusting claims** — Code reads user ID/role from a decoded-but-unverified JWT payload, or otherwise fails to verify the signature before use. (https://github.com/Arcanum-Sec/sec-context; https://arxiv.org/pdf/2508.14727)

43. **Missing SSL/TLS certificate or hostname validation** — Client code skips certificate/hostname verification (e.g. a TrustManager that accepts everything). (https://arxiv.org/pdf/2508.14727; https://arxiv.org/pdf/2607.01867)

44. **XXE-vulnerable XML parser defaults** — XML parsers instantiated with default settings that don't disable external entity resolution. (https://arxiv.org/pdf/2508.14727; https://arxiv.org/pdf/2607.01867)

45. **Unsanitized data injected directly into JSON construction** — Untrusted data concatenated/inserted into JSON building/serialization without respecting trust boundaries. (https://arxiv.org/pdf/2508.14727; https://arxiv.org/pdf/2607.01867)

46. **Inadequate I/O error handling on untrusted input** — Critical exceptions from I/O on untrusted sources are swallowed, not propagated, or handled generically instead of distinguishing security-critical failures. (https://arxiv.org/pdf/2508.14727; https://arxiv.org/html/2508.14727v1)

47. **Unhandled permission/authorization errors** — Code touching a protected resource doesn't handle a denial (e.g. `PermissionError`), so an authorization failure surfaces as an unhandled crash rather than a controlled response. (https://arxiv.org/html/2512.05239v1)

48. **SSRF via unvalidated user input in outbound request/proxy target** — A user-controlled value is spliced into a URL used for a server-side HTTP request, a reverse-proxy target, or an HTTP client (e.g. axios) call without host/scheme allowlisting. (https://arxiv.org/pdf/2311.00889; https://github.com/Dicklesworthstone/ultimate_bug_scanner)

49. **Prototype pollution via unguarded object merge** — Code merges untrusted JSON into objects/config (spread, `Object.assign`, lodash merge/set) without stripping `__proto__`/`constructor`/`prototype` keys or whitelisting properties. (https://github.com/Dicklesworthstone/ultimate_bug_scanner; https://aigent.ly/rules)

50. **HTTP header/CRLF injection into response headers** — Request-derived values written into outgoing headers (or built by string concatenation, e.g. `Content-Disposition`) without stripping CR/LF or control characters. (https://github.com/Dicklesworthstone/ultimate_bug_scanner; https://aigent.ly/rules)

51. **SSE header/field newline injection** — Server-Sent-Events code interpolates user-controlled strings (message type/id) into SSE output without stripping `\r`/`\n`, enabling protocol injection. (https://aigent.ly/rules)

52. **Open redirect via unvalidated redirect target** — Redirect target built from request data without same-origin or allowlist validation. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

53. **Session/auth cookies missing Secure/HttpOnly/SameSite** — Cookies carrying session state set without one or more of these attributes. (https://github.com/Dicklesworthstone/ultimate_bug_scanner; https://arxiv.org/html/2504.20612v1)

54. **No session expiry/timeout enforcement** — Sessions created with no configured timeout, so inactive sessions never expire. (https://arxiv.org/html/2504.20612v1)

55. **Passwords stored without hashing/salting at all** — Credential storage has no call to a hashing function or per-password salt whatsoever (distinct from merely using a *weak* algorithm). (https://arxiv.org/html/2504.20612v1)

56. **Verbose errors enabling user/account enumeration** — Login/registration errors distinguish "user not found" vs "wrong password," or reveal password policy, letting an attacker enumerate valid accounts. (https://arxiv.org/html/2504.20612v1)

57. **No security event logging** — Failed login attempts aren't logged, anomalous access patterns aren't flagged, and logs (when present) aren't stored securely. (https://arxiv.org/html/2504.20612v1)

58. **Missing/misconfigured CSRF token validation** — State-changing forms generated without CSRF tokens or without server-side validation of them. (https://arxiv.org/html/2504.20612v1)

59. **Content-Type not enforced on JSON body parsing** — Handler deserializes the body as JSON without strictly validating `Content-Type: application/json` server-side, opening CSRF via a `text/plain` CORS-preflight bypass. (https://aigent.ly/rules)

60. **Dynamic code execution on unsanitized input (`eval`/`exec`/code injection)** — Untrusted data reaches `eval()`, `exec()`, `Function()`, or another dynamic-execution sink, giving arbitrary code execution. (https://github.com/Dicklesworthstone/ultimate_bug_scanner; https://arxiv.org/abs/2510.26103)

61. **False-success HTTP 200 on downstream/dependency failure** — Endpoint returns `200 OK` (sometimes with mock/stale/default data) when a required dependency failed, instead of a `5xx` with an error code and correlation ID. (https://tenki.cloud/blog/reviewing-ai-generated-code-checklist; https://maciejkepa.dev/blog/ai-generated-code-risks-fallbacks-and-mocks/)

62. **Missing/unspecified file encoding on file open** — `open(path)` called without an explicit `encoding=`, making decode behavior depend on platform locale and risking silent data corruption across environments. (https://arxiv.org/html/2511.15817)

63. **Uncontrolled resource consumption / no throttling (DoS)** — Loops, allocations, or request handlers with no upper bound, size cap, or rate limit (e.g. reading an entire request body unbounded). (https://arxiv.org/abs/2510.26103; https://arxiv.org/pdf/2510.26103)

64. **IP-header-as-auth-signal** — Code uses `X-Forwarded-For`/`X-Real-IP`/`CF-Connecting-IP` as the sole basis for IP allowlisting/trust instead of the actual socket-layer client IP with an explicit trusted-proxy hop count. (https://aigent.ly/rules)

65. **Regex-only injection defense** — Middleware relies solely on a regex pattern as the last line of defense against XSS/SQLi instead of also validating/parameterizing at the handler/data layer. (https://aigent.ly/rules)

66. **Mixed literal and parameterized SQL fragments in ORM queries** — ORM code mixes raw `literal()` SQL with parameterized replacements in the same query, or interpolates user input into a literal fragment even when bound parameters are defined elsewhere. (https://aigent.ly/rules)

67. **Dynamic identifier/column injection in SQL or ORM calls** — User input builds column names, cast types, or computed-column/attribute expressions via string interpolation instead of resolving through a controlled lookup/allowlist or safe helpers (e.g. `sequelize.fn()`/`sequelize.col()`). (https://aigent.ly/rules)

68. **ORM where-clause type confusion** — Finder/where-clause arguments passed straight to an ORM without verifying they're plain objects/primitives, silently accepting Date/function/class instances that bypass intended filters. (https://aigent.ly/rules)

69. **Hostname/IP allowlist comparison without canonicalization** — NO_PROXY/allowlist checks compare raw hostname strings without normalizing trailing dots, IPv6 literals/zone IDs, or IPv4-mapped IPv6 forms, letting internal addresses slip through. (https://aigent.ly/rules)

70. **Improper/missing input validation on external data** — Request-derived fields (form values, query params, IDs) are read and used without checking for missing/empty values, type, range, or format before use. (https://www.endorlabs.com/learn/anti-pattern-avoidance-a-simple-prompt-pattern-for-safer-ai-generated-code; https://arxiv.org/abs/2510.26103)

## Testing tells

1. **Benchmark score improves while defect severity worsens** — Comparing successive model generations (e.g. Claude 3.7 Sonnet → Claude Sonnet 4) shows unit-test pass rate rising (72.46%→77.04%) while BLOCKER-severity bug share nearly doubles (7.1%→13.71%) and BLOCKER-severity vulnerability share also rises (56.03%→59.57%). A higher pass rate, larger "thorough-looking" diff, or newer/higher-benchmark model is not a valid proxy for fewer or less severe defects — check issue density/severity directly, since functional performance and code quality are uncorrelated. (https://arxiv.org/pdf/2607.01867; https://arxiv.org/html/2508.14727v1)
2. **Passing code still carries real defects** — Code that passes all unit tests still shows measurable static-analysis defect density (1.45–2.11 issues per passing task across models), proving unit-test pass rate is not a valid proxy for code quality/security — static analysis/review is required independent of test results. (https://arxiv.org/pdf/2607.01867)
3. **Tests that validate implementation, not behavior** — The assertion's expected value is copied directly from the function's own return value (or output is computed then asserted against itself) instead of being independently derived, or everything is mocked so the test only exercises the mocking framework. Detect by asking "would this test fail if the function returned a hardcoded/wrong value?" and by favoring integration tests over heavily-mocked unit tests. (https://dev.to/stravukarl/the-bugs-ai-writes-five-patterns-that-show-up-in-ai-generated-code-bl3)
4. **Regex logic errors invisible at compile time** — Regular expressions that are syntactically valid but semantically wrong: match empty strings, contain redundant/ambiguous sub-patterns, or are logically incorrect for the intended input (java:S2639, S5842, S5850, S5855, S5856). Only surfaces at runtime, not via static syntax checking. (https://arxiv.org/html/2508.14727v1)
5. **Mock/fixture data reachable outside the test boundary** — Demo/fixture objects (e.g. `demo_report`) are referenced directly from production code paths (often inside a catch/except or fallback branch) with no build-time or runtime guard restricting them to test/dev environments, letting mocked data leak into production responses. Detect by grepping for `demo_`/`mock_`/`fixture_` identifiers reachable from non-test source files. (https://tenki.cloud/blog/reviewing-ai-generated-code-checklist; https://maciejkepa.dev/blog/ai-generated-code-risks-fallbacks-and-mocks/)
6. **No four-layer consistency test for failure paths** — Test suites cover only the happy path and never simulate a dependency failure to verify that the HTTP response, UI state, trace, and logs all agree on the outcome — the kind of test that would catch an except block silently returning fake success. Detect by checking whether integration/contract tests inject timeouts/permission failures/retry exhaustion and assert on response truthfulness, not just shape. (https://tenki.cloud/blog/reviewing-ai-generated-code-checklist)
7. **Magic-number test assertions** — Generated tests assert specific literal expected values (e.g. `assertEquals(5, ...)`) with no comment or derivation explaining why that number is correct, making the test unreadable and hard to trust (a named "Magic Number" test smell). (https://arxiv.org/html/2512.05239v1)
8. **Tests referencing nonexistent external resources** — Generated tests reference files, URLs, or fixtures that don't actually exist in the project (e.g. `getResource("/test.jar")` pointing at a file never created), causing NullPointerException/FileNotFound at run time — a sign the model faked a fixture instead of verifying it exists. (https://arxiv.org/html/2512.05239v1)
9. **Happy-path-only edge case handling** — Code handles the main success case correctly but fails to consider null inputs, empty arrays/collections, or unexpected data types — logic gaps from token-prediction rather than reasoning about program state. (https://diatomenterprises.com/blog/how-to-tell-if-code-is-ai-generated/)
10. **Tautological self-written tests** — When the same model writes both the implementation and its tests, the tests encode the same blind spots/assumptions as the code and validate what the code happens to do rather than what the spec requires. Tell: 100% coverage but tests never fail even for known-bad inputs, or assertions just restate the implementation's own logic. (https://clacky.ai/blog/code-review-checklist-ai-generated-code; https://contextqa.com/blog/what-is-ai-generated-code-testing-checklist/)
11. **Systematically undertested boundary values** — Empty strings/collections, null, zero, max/min integers, single-element arrays, concurrent access, and timeout scenarios are underrepresented in generated code and its tests because they're underrepresented in training data. Detect by checking whether the standard boundary set is covered per function. (https://clacky.ai/blog/code-review-checklist-ai-generated-code; https://contextqa.com/blog/what-is-ai-generated-code-testing-checklist/)
12. **Missing correlation ID in error responses** — Error responses omit a correlation/request ID that would let an operator trace the failure across API response, logs, and traces, forcing manual reconstruction of what happened. (https://maciejkepa.dev/blog/ai-generated-code-risks-fallbacks-and-mocks/)
13. **Contract tests missing for degraded/error paths** — The test suite lacks contract tests proving an error response is distinguishable from a successful one, and lacks integration tests simulating dependency timeouts, invalid payloads, permission failures, and retry exhaustion — so fallback branches are never exercised as real production behavior. (https://maciejkepa.dev/blog/ai-generated-code-risks-fallbacks-and-mocks/)
14. **Missing module/function docstrings** — Generated modules or functions lack a docstring entirely (pylint C0114/C0116) — easy to grep for via AST parsing (a `FunctionDef`/`Module` node with no leading string-expression statement). (https://arxiv.org/html/2511.15817)
15. **Function call with incorrect argument count (CWE-685)** — Generated code calls a function/API with the wrong number of arguments — a hallucinated signature that a compiler/linter or a single test run would catch immediately, signaling the code was never actually executed before being committed. Found in both ChatGPT and Copilot output. (https://arxiv.org/abs/2510.26103)
16. **Always-true/always-false expression (CWE-570/571)** — A conditional whose expression is a tautology or contradiction, typically from copy-pasted boilerplate or an incompletely adapted template (e.g. a leftover `if (true)` guard, or a comparison against a constant that can never match). Appears in the top-5 findings for nearly every language/tool pair analyzed (JS, TS, Python). (https://arxiv.org/pdf/2510.26103)
17. **Unnecessary test-framework dependency** — AI pulls in Jest or Vitest as a new dependency for a project with no existing test stack, instead of using the built-in `node:test`/`node:assert`, inflating the dependency tree for no functional gain. (https://dev.to/chefgs/how-to-avoid-vulnerabilities-in-ai-generated-javascript-and-nodejs-projects-4ggi)
18. **Untested business logic despite looking complete** — AI-generated modules (e.g. scheduling/recurrence, attendance tracking) ship with no unit tests covering the core logic; the code reads as finished but has zero validation that recurrence/date math or state transitions are correct. (https://dev.to/chefgs/how-to-avoid-vulnerabilities-in-ai-generated-javascript-and-nodejs-projects-4ggi)

## Concurrency tells

1. **Broken/thread-unsafe synchronization primitives** — Java concurrency bugs (incorrect double-checked locking, missing or misused `volatile` on shared state, synchronizing on the wrong object, unsynchronized shared mutable state — rules java:S2168/S2222/S2445/S3077/S3078). Reported as disproportionately common in AI output because atomicity/thread-safety concepts are underrepresented in training corpora, and the share of this bug class reportedly nearly doubled from Claude 3.7 Sonnet to Claude Sonnet 4 rather than improving with capability. (https://arxiv.org/pdf/2508.14727; https://arxiv.org/pdf/2607.01867)

2. **Fire-and-forget async call (missing await)** — An async function/coroutine is invoked without `await` (or equivalent) in an async context, so execution proceeds with an unresolved Promise/task, silently corrupting downstream state instead of failing loudly. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

3. **Mutex Lock without matching Unlock** — A `Lock()` call (e.g. Go's `sync.Mutex`) has no symmetric `Unlock()`/`defer Unlock()` covering every code path, risking permanent deadlock on error or early-return paths. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

4. **Uniform retry-everything loop** — A retry loop catches a broad exception type and retries every failure identically, without distinguishing transient errors (timeouts, connection resets) from permanent ones (validation, permission, auth errors). (https://tenki.cloud/blog/reviewing-ai-generated-code-checklist)

5. **Unbounded/unjittered retry policy** — Retry logic has no maximum attempt budget and/or no randomized exponential backoff or jitter, so a flat or unlimited retry loop amplifies load on an already-failing dependency instead of protecting it. (https://tenki.cloud/blog/reviewing-ai-generated-code-checklist; https://maciejkepa.dev/blog/ai-generated-code-risks-fallbacks-and-mocks/)

6. **Unterminated recursion causing stack overflow** — A recursive function lacks a correct terminating condition on some input branch, causing infinite recursion and a stack overflow on otherwise normal-looking input. (https://arxiv.org/html/2512.05239v1)

7. **Cache stampede / thundering herd** — Cache-aside code (check cache, on miss query DB, then populate cache) with no per-key lock around the DB fetch, so a hot key's expiry causes a burst of concurrent requests to all miss and hit the database simultaneously. (https://dev.to/pockit_tools/7-hidden-production-bugs-ai-coding-agents-create-and-how-to-catch-them-before-they-crash-f7b)

8. **Connection pool exhaustion via missing finally-release** — A pooled connection is acquired and used across several operations but released only on the happy path with no try/catch/finally, so any thrown error leaks the connection and eventually exhausts the pool with no obvious error signal. (https://dev.to/pockit_tools/7-hidden-production-bugs-ai-coding-agents-create-and-how-to-catch-them-before-they-crash-f7b)

9. **Unhandled read-then-write race condition (toggle/counter logic)** — A "check row exists, then insert/delete plus increment/decrement a counter" pattern with no row locking or uniqueness constraint, so two near-simultaneous requests both read the pre-update state and the counter drifts from actual row count; invisible under sequential testing, only surfaces under concurrent calls. (https://dev.to/pockit_tools/7-hidden-production-bugs-ai-coding-agents-create-and-how-to-catch-them-before-they-crash-f7b)

10. **Slow memory/resource leak from missing unsubscribe or cleanup** — An event/pub-sub or WebSocket handler registers a callback/listener on connect but never removes it on disconnect/close/error, so the listener collection grows unbounded and the process eventually OOMs — often invisible in dev where processes restart frequently. (https://dev.to/pockit_tools/7-hidden-production-bugs-ai-coding-agents-create-and-how-to-catch-them-before-they-crash-f7b)

11. **Missing concurrency/timeout test coverage** — Tests and handling for concurrent access and slow/failed-response timeout scenarios are systematically absent from AI-generated code, since these paths are rare in typical training examples. (https://contextqa.com/blog/what-is-ai-generated-code-testing-checklist/)

12. **Unbounded multipart upload parsing with no error handling** — Multipart/stream upload parsing (e.g. Multer/busboy) has no try/catch or stream error handlers, no field/file-count/size/timeout limits, and doesn't explicitly close or destroy the parsing stream on error, enabling DoS via unclosed streams or process crashes. (https://aigent.ly/rules)

13. **Stream with no abort handler on client disconnect** — Streaming endpoints (e.g. StreamableFile/piped streams) have no handler tied to client disconnection, so server-side streams and their underlying resources stay open indefinitely after the client drops. (https://aigent.ly/rules)

14. **No deadline on network handshake** — Network/SSH code omits an explicit deadline on key-exchange or handshake completion, letting slow or stalled clients pin server resources/memory indefinitely. (https://aigent.ly/rules)

## Cross-cutting / process tells

1. **Boundary/edge-case blindness** — Functions handle typical inputs correctly but fail on empty arrays, null, zero, negative numbers, or max-int values — passes happy-path tests but breaks on edge cases. Detect by feeding empty/null/zero/negative/boundary values into every generated function. (https://www.ranger.net/post/common-bugs-ai-generated-code-fixes)

2. **Missing bounds checks on array/collection access** — Index-based array/collection accesses (including Vector.get/set-style APIs) lack a preceding length/null validation or try/catch, risking out-of-range crashes. (https://www.ranger.net/post/common-bugs-ai-generated-code-fixes; https://arxiv.org/html/2512.05239v1)

3. **Quadratic/nested loop where linear suffices** — Code defaults to a nested O(n²) loop (searching one list inside a loop over another) instead of a hash-map/single-pass O(n) approach, working on small demos but degrading under real load. (https://www.ranger.net/post/common-bugs-ai-generated-code-fixes; https://diatomenterprises.com/blog/how-to-tell-if-code-is-ai-generated/)

4. **String concatenation in loops instead of a builder** — Strings are built via repeated `+=`/concatenation inside a loop rather than a StringBuilder/buffer/join, causing quadratic memory churn. (https://www.ranger.net/post/common-bugs-ai-generated-code-fixes; https://arxiv.org/pdf/2508.14727)

5. **Empty/swallowing catch blocks and suppressed exceptions** — Exception handlers catch an error and do nothing, only log, or otherwise fail to propagate/rethrow/handle it, producing silent failures. Grep for empty `catch{}` or catch-then-log-only blocks. (https://www.ranger.net/post/common-bugs-ai-generated-code-fixes; https://arxiv.org/pdf/2607.01867)

6. **Missing null/guard checks before processing (happy-path input bias)** — Generated code skips null/emptiness validation and early-return guardrails at function entry points, roughly 2x more often than human PRs. (https://www.ranger.net/post/common-bugs-ai-generated-code-fixes)

7. **Correlated subqueries instead of window functions/CTEs** — Aggregation logic uses slow row-by-row correlated subqueries where a single-pass window function or CTE would work, inflating query latency. (https://www.ranger.net/post/common-bugs-ai-generated-code-fixes)

8. **Generic/broad exception type usage** — Code throws/catches a generic `Exception` (or prints-and-swallows via a broad catch) instead of a specific, dedicated exception type. Grep for `throw new Exception(` / bare `catch (Exception e)`. (https://arxiv.org/pdf/2508.14727; https://arxiv.org/html/2508.14727v1)

9. **Unclosed resources / missing try-with-resources** — Streams, connections, files, or executors are opened without a guaranteed close on all paths (no try-with-resources, no finally-close), because resource lifecycle spans multiple calls beyond the model's local context. Recurring Blocker-level bug across every model tested. (https://arxiv.org/pdf/2508.14727; https://arxiv.org/pdf/2607.01867)

10. **Control-flow logic errors: always-true/false conditions, unreachable branches** — Conditionals/loops contain always-true or always-false predicates, unreachable code, or tautological comparisons, requiring deep multi-path reasoning to catch. Largest bug category for several models (48% of GPT-4o's bugs). (https://arxiv.org/pdf/2508.14727; https://arxiv.org/pdf/2607.01867)

11. **API contract violations (ignored return values, broken equals/hashCode)** — Meaningful return/status values from API calls are ignored, or equals()/hashCode() contracts are broken — the model doesn't track sequential, stateful API semantics. Especially common in Llama-family models. (https://arxiv.org/pdf/2508.14727; https://arxiv.org/pdf/2607.01867)

12. **Unsafe/illegal type casts** — Casts performed without tracking a variable's static-type provenance through complex data flow, risking ClassCastException. (https://arxiv.org/pdf/2508.14727; https://arxiv.org/pdf/2607.01867)

13. **Missing null checks before dereference / misused Optional** — Values are dereferenced without null checks, or Optional is misused/redundantly substituted, risking NullPointerException — 5-9% of bugs across evaluated models. (https://arxiv.org/pdf/2508.14727; https://arxiv.org/pdf/2607.01867)

14. **Missing Serializable implementation where required** — A class used in a serialization context (framework object graph, session, DTO) omits `implements Serializable` — a non-local, framework-dependent requirement missed from a local view. (https://arxiv.org/pdf/2508.14727; https://arxiv.org/pdf/2607.01867)

15. **Regex/string-format logic flaws (syntactically valid, semantically wrong)** — Regular expressions or format operations compile and look plausible but contain subtle logic errors (matching empty string, redundant/ambiguous patterns) detectable only at runtime. (https://arxiv.org/pdf/2508.14727; https://arxiv.org/pdf/2607.01867)

16. **Newer model versions trade higher pass rates for more severe defects** — Comparing successive model generations, test-pass-rate improved but the proportion of BLOCKER-severity bugs nearly doubled and BLOCKER-severity vulnerabilities also rose — a checkable regression when judging models purely by pass-rate. (https://arxiv.org/pdf/2508.14727)

17. **Data structure misuse / wrong collection semantics** — Wrong collection type chosen for the semantic intent, or out-of-bounds/incorrect element access, reflecting syntactic-but-not-semantic grasp of collection APIs. (https://arxiv.org/pdf/2607.01867; https://arxiv.org/html/2508.14727v1)

18. **Performance-blind code: redundant recomputation, unbounded recursion, unnecessarily inefficient implementation** — Functionally correct but inefficient: repeated computation, stack-overflow-prone unbounded recursion, non-terminating loops, or extra passes/allocations where a direct method exists — model optimizes for local token likelihood, not runtime characteristics. (https://arxiv.org/pdf/2508.14727; https://arxiv.org/html/2508.14727v1)

19. **Overly broad field/variable scope** — Fields/variables declared with wider scope than necessary — missing `final`, class fields where locals would do, unnecessary static references — correct scoping needs class-wide reasoning the model skips. (https://arxiv.org/html/2508.14727v1)

20. **Convoluted/redundant conditional logic** — Mergeable if-statements, redundant switch cases, overly complex ternaries, or duplicate conditional branches instead of simpler idiomatic control flow. (https://arxiv.org/html/2508.14727v1)

21. **Issue-mix statistical fingerprint** — Across models, static-analysis issues cluster tightly around ~90-93% code smells, ~5-8% bugs, ~2% vulnerabilities, at roughly 2 issues per passing task — a codebase claiming AI authorship that deviates wildly (e.g. near-zero smells) merits scrutiny as under-scanned. (https://arxiv.org/html/2508.14727v1)

22. **Syntactically incomplete/polluted raw generations** — Raw output often isn't directly compilable: it omits the prompted signature/imports, or appends trailing unrelated code/prose after the function (trailing `\ndef`, `\nclass`, prose wrapped around a code fence). Only 15% of raw generations compiled before rule-based repair. (https://arxiv.org/pdf/2311.00889)

23. **Magic numbers** — Numeric literals used directly in logic instead of a named constant; one of the worst-scoring smell types for every LLM and the human baseline alike. (https://arxiv.org/abs/2510.03029)

24. **Missing/insufficient documentation** — Methods, types, and variables lack required comments/Javadoc, or comment content/size falls short of what the code's complexity warrants. (https://arxiv.org/abs/2510.03029)

25. **Improper formatting/indentation drift** — Inconsistent indentation, missing braces around single-statement blocks, misplaced braces, out-of-order attributes; indentation alone was the single highest-volume smell of any kind in the study. (https://arxiv.org/abs/2510.03029)

26. **Redundant modifiers/imports and copy-pasted duplicate code** — Unnecessary access modifiers, unused imports, or near-identical duplicated code blocks — signs of templated, unedited generation. (https://arxiv.org/abs/2510.03029)

27. **Inconsistent naming conventions across identifier kinds** — Variable/method/class/generic names deviate from standard conventions inconsistently within the same generation (camelCase vs PascalCase locals, spelled-out abbreviations). (https://arxiv.org/abs/2510.03029)

28. **Excessive statement/line length and overly long methods** — Lines/statements exceed recommended length, or methods aren't decomposed into smaller named steps; dominated in practice by simple line-length violations rather than genuine logical complexity. Also shows up as AI functions tripping cyclomatic-complexity/nesting thresholds more than human equivalents. (https://arxiv.org/abs/2510.03029; https://contextqa.com/blog/what-is-ai-generated-code-testing-checklist/)

29. **Smell density scales with task complexity, faster than in human code** — Code-smell count per solution rises near-linearly with cyclomatic complexity and LOC, and rises faster than in human reference solutions of matching complexity. (https://arxiv.org/abs/2510.03029)

30. **Encapsulation as a counter-tell** — Unlike almost every other category, LLMs scored better than the human baseline on encapsulation (visibility modifiers, final params/classes) — a negative/counter-indicator when profiling AI-authored code. (https://arxiv.org/abs/2510.03029)

31. **Dead/unused code elements are less frequent than human baseline (counter-tell)** — Unused imports, private fields/methods, and unused locals occurred less often in LLM code than in human code — a counter-signal, since heavy dead code suggests the sample is less likely raw LLM output. (https://arxiv.org/abs/2510.03029)

32. **Unused declared parameters / assigned-but-never-used variables** — A parameter is threaded through a signature but never referenced, or a variable is assigned and never subsequently read — the single most common finding across several AI-tool/language combos in a separate study, in tension with entry 31's counter-tell framing. (https://arxiv.org/html/2512.05239v1; https://arxiv.org/pdf/2510.26103)

33. **Hallucinated API/library calls** — Code confidently invokes a plausible-sounding but nonexistent function/method/class, assembled from patterns across contexts; compiles/lints fine, fails only at link/run time. (https://arxiv.org/html/2512.05239v1; https://diatomenterprises.com/blog/how-to-tell-if-code-is-ai-generated/)

34. **Hallucinated/mismatched third-party dependencies** — Code references npm/pip packages that don't exist, or uses API signatures from a different package version than what's actually pinned/locked. Caught by install/lockfile-audit before merge. (https://clacky.ai/blog/code-review-checklist-ai-generated-code; https://contextqa.com/blog/what-is-ai-generated-code-testing-checklist/)

35. **Call-site argument mismatches (swapped args, wrong overload/arity)** — Swapped argument order, calling a same-named method with different semantics, using an overload with wrong arity, or a call not matching the callee's real signature — a sign of a stale/hallucinated signature never cross-checked. (https://arxiv.org/html/2512.05239v1; https://arxiv.org/pdf/2510.26103)

36. **Unsafe pointer-width reinterpretation (C-style)** — Casting the address of a narrower type to a wider pointer type causes strict-aliasing violations, misaligned access, and out-of-bounds writes on dereference. (https://arxiv.org/html/2512.05239v1)

37. **Unhandled I/O end-of-stream errors** — File/stream reads don't guard against EOF mid-read, letting an EOF condition propagate unhandled instead of being explicitly checked. (https://arxiv.org/html/2512.05239v1)

38. **Unhandled database operational errors** — DB interaction code omits try/except around connection, query, or transaction calls, letting driver-level exceptions crash the caller instead of being translated into a domain error. (https://arxiv.org/html/2512.05239v1)

39. **Style/formatting habits clustering as a fingerprint** — Omitted braces on single-line ifs, trailing commas in literals, inconsistent class naming, unnecessary imports — individually harmless but clustering together as a signature of unreviewed generated code. (https://arxiv.org/html/2512.05239v1)

40. **Retry storm: immediate retry with no backoff/jitter/idempotency** — A retry loop around an external call retries immediately with no exponential backoff/jitter, retries non-idempotent POSTs on ambiguous failures, and sends no idempotency key — risking double-charges and amplified load under degraded downstream latency. (https://dev.to/pockit_tools/7-hidden-production-bugs-ai-coding-agents-create-and-how-to-catch-them-before-they-crash-f7b)

41. **Retry logic doesn't distinguish transient vs permanent errors** — A fixed-count retry loop retries every exception identically regardless of whether it's transient (timeout/connection) or permanent (invalid request, permission, bad contract), with no explicit retryable/permanent error taxonomy, then falls through to a fake success payload. (https://maciejkepa.dev/blog/ai-generated-code-risks-fallbacks-and-mocks/)

42. **Comments restate the code instead of explaining "why"** — Comments describe what the next line literally does (e.g. "// Loop through the list of users") rather than business context or non-obvious tradeoffs. (https://diatomenterprises.com/blog/how-to-tell-if-code-is-ai-generated/)

43. **Hyper-uniform style within one generation** — A single generated block is unnervingly consistent in naming/spacing/structure with zero natural variance, unlike human code's mix of short and descriptive names. (https://diatomenterprises.com/blog/how-to-tell-if-code-is-ai-generated/)

44. **Over-descriptive naming even for trivial iterators** — Fully descriptive names used even for trivial loop counters (`index`, `item_counter` instead of `i`, `j`), losing the naming cues developers normally use to signal intent. (https://diatomenterprises.com/blog/how-to-tell-if-code-is-ai-generated/)

45. **Logic drift from spec** — Implementation looks plausible and passes happy-path tests but subtly solves a different problem than what was specified, in a way normal review misses. Detect against acceptance criteria written independently beforehand. (https://clacky.ai/blog/code-review-checklist-ai-generated-code)

46. **Happy-path-only error handling** — The success path is fully implemented while error/exception paths are stubbed, ignored, or given only generic handling. Detect by forcing error conditions and checking for real vs. superficial handling. (https://clacky.ai/blog/code-review-checklist-ai-generated-code; https://contextqa.com/blog/what-is-ai-generated-code-testing-checklist/)

47. **Silent wrong-result failures** — Code executes without throwing while still producing incorrect output (e.g. miscalculated totals), because it never validates its own result against business invariants; only caught by asserting business-metric values, not error absence. (https://clacky.ai/blog/code-review-checklist-ai-generated-code; https://contextqa.com/blog/what-is-ai-generated-code-testing-checklist/)

48. **Plausible-but-wrong edge-case handling** — Code passes the tests you'd write but silently mishandles edge cases outside the happy path (e.g. misinterpreting an ambiguous date format against codebase convention) — no crash, just wrong data. (https://dev.to/stravukarl/the-bugs-ai-writes-five-patterns-that-show-up-in-ai-generated-code-bl3)

49. **Base-case/logic misalignment with problem spec** — Algorithm runs without crashing and looks plausible, but a base case or condition doesn't actually match the problem (e.g. a DP array initialized without checking an edge condition the recurrence depends on), producing silently wrong output on some inputs. (https://arxiv.org/html/2512.05239v1)

50. **Silent degradation with no observability signal** — A fallback/degraded response path emits no metric, no result-state/data-source/as-of field, and no correlation ID — the degraded state is invisible to operators even though the caller got a 200. (https://tenki.cloud/blog/reviewing-ai-generated-code-checklist)

51. **Broad exception handler silently returns fabricated/demo data** — A try/except wraps a real dependency call and returns hardcoded/demo data on any exception instead of propagating the failure, so the caller can't tell the operation actually failed. (https://maciejkepa.dev/blog/ai-generated-code-risks-fallbacks-and-mocks/)

52. **Unnecessary abstraction/over-engineering causing latency regressions** — Extra layers/wrappers not asked for show up as P99 latency regressions after shipping, even though the code "works" — visible only by comparing before/after performance baselines, not by reading the diff. (https://contextqa.com/blog/what-is-ai-generated-code-testing-checklist/)

53. **High post-deploy change frequency as a quality proxy** — Files with AI-generated code that get modified unusually often after shipping proxy for latent quality problems missed pre-merge. (https://contextqa.com/blog/what-is-ai-generated-code-testing-checklist/)

54. **TODO/FIXME markers left in "finished" code** — Generated solutions contain literal TODO/FIXME/XXX comments marking unfinished work rather than a complete implementation — directly greppable. (https://arxiv.org/abs/2510.03029; https://arxiv.org/html/2511.15817)

55. **Excessive parameter lists** — A method takes an unusually large number of parameters instead of grouping related arguments into an object, making call sites error-prone and hard to test. (https://arxiv.org/abs/2510.03029)

56. **Lost exception chain (raise without preserving cause)** — Inside an except block, a new exception is raised without chaining to the original (`raise ... from err`), discarding traceback/cause and hindering root-cause debugging. (https://arxiv.org/html/2511.15817)

57. **Inconsistent return statements** — Some code paths in a function return a value while others fall through without an explicit return (implicit None), a common source of silent None-propagation bugs downstream. (https://arxiv.org/html/2511.15817)

58. **Style-level smells are shallow and unstable under paraphrase** — Naming/formatting-dependent smells shift substantially in probability under meaning-preserving micro-edits (variable rename, operand swap), while deeper semantic smells stay stable — indicating style-level defects come from shallow lexical pattern matching, not semantic reasoning, and should be expected to appear/disappear inconsistently across near-identical prompts. (https://arxiv.org/html/2511.15817)

59. **Detection of error condition without action (CWE-390)** — Code checks for an error/failure condition (return code, exception, status) but then does nothing with it — no logging, propagation, or recovery. (https://arxiv.org/abs/2510.26103)

60. **Dead/unreachable code after control-flow exit (CWE-561)** — Unreachable statements placed after a return/raise/break, or unused whole helper functions never called — residue of generating boilerplate around an early return without pruning what follows. (https://arxiv.org/abs/2510.26103; https://arxiv.org/pdf/2510.26103)

61. **Commented-out code left in place** — Generated files retain blocks of commented-out code rather than removing them, a low-cost but consistent tidiness/review-diligence signal. (https://arxiv.org/abs/2510.26103)

62. **Incomplete control statements: missing switch default, missing else, empty blocks** — A switch/selector omits a default case, a conditional is missing its terminating else, or a brace-delimited block contains no executable statements — code that looks finished but leaves a path silently unimplemented. (https://github.com/Dicklesworthstone/ultimate_bug_scanner; https://arxiv.org/abs/2510.03029)

63. **Unguarded deep property-chain access** — Multiple chained property accesses (`user.profile.settings.theme`) with no preceding null/undefined guard anywhere in the function. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

64. **Array mutated during its own iteration** — Code mutates an array while iterating it (e.g. `arr.forEach(() => arr.push(...))`), causing skipped or duplicated elements as the iteration index and backing array diverge mid-loop. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

65. **Direct NaN self-comparison** — Code does `if (x === NaN)`, which is always false under IEEE-754 semantics since NaN never equals itself; `Number.isNaN()`/`isNaN()` should be used instead. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

66. **Division without zero-check** — An arithmetic division is performed with no guard against a zero denominator, silently producing Infinity/NaN instead of a handled error. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

67. **Ruby: Thread.new spawned without .join** — A thread is created but never joined, letting the caller proceed without waiting and letting exceptions raised inside the thread vanish unhandled. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

68. **C++: std::async result never retrieved via .get()** — The future returned by std::async is never `.get()`'d (or is dropped), silently discarding the result and swallowing any exception the async task threw. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

69. **C#: sync-over-async deadlock risk and lost stack trace** — Blocking on async work via `Task.Wait()`/`.Result` risks deadlock on a captured synchronization context, and rethrowing via `throw ex;` instead of bare `throw;` discards the original stack trace. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

70. **Swift: unstructured Task{} with no error handling** — A detached `Task { ... }` is spawned with no error propagation, producing unstructured-concurrency leaks where a thrown error inside is silently lost. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

71. **Java: CompletableFuture chains missing .exceptionally()/.join()** — A CompletableFuture chain has no `.exceptionally()` handler and its result is never `.join()`'d, so exceptions inside the async pipeline are swallowed rather than surfaced. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

72. **C/C++: buffer overflow from unchecked bounds** — Functions like `strcpy()` or raw buffer writes are used without validating destination size against source length, overwriting memory past the buffer's bounds. (https://github.com/Dicklesworthstone/ultimate_bug_scanner)

73. **Explicit async error handling omitted or reduced to a generic catch (JS/Node)** — Generated async code lacks meaningful error handling (e.g. bare `.catch(console.error)` or no try/catch around I/O) instead of surfacing failure modes appropriately. (https://dev.to/chefgs/how-to-avoid-vulnerabilities-in-ai-generated-javascript-and-nodejs-projects-4ggi)

74. **Weak TypeScript typing** — Generated TypeScript uses `any` liberally, omits explicit return types on core services, and doesn't enable strict mode, reducing the compiler's ability to catch defects early. (https://dev.to/chefgs/how-to-avoid-vulnerabilities-in-ai-generated-javascript-and-nodejs-projects-4ggi)

75. **Silent failure with no feedback to caller/user** — The system fails without informing the user or the calling process that something went wrong, instead of surfacing the failure explicitly. (https://diatomenterprises.com/blog/how-to-tell-if-code-is-ai-generated/)

