# Reverse-engineering heavy frontends: evidence discipline + baseline gate

From nexu-io/open-design web-clone (Apache-2.0), re-expressed for the impulse suite.
The evidence-discipline paradigm is inspired by lixiaolin94/skills
web-shader-extractor (no license — concepts only, rewritten, no code or prose copied).

Use when recon says WebGL/Canvas/Three.js-heavy: `window.THREE` present, multiple
canvases, or shader script tags. Two halves: how to READ the rendering
architecture, and how not to lie to yourself while extracting it.

## Reading the architecture

1. **Get single-file source first.** Many demo sites are fully self-contained in
   one HTML (GitHub raw / view-source). Don't reach for Playwright before checking.
2. **Count canvases, read SVG defs, grep shaders.** How many canvas elements?
   Any SVG filter? Where do shader strings live? These three determine the
   rendering architecture.
3. **Determine what the WebGL is actually computing** (decides whether any
   secondhand analysis can be trusted):
   - grep `texture2D` / `sampler2D` — sampling textures/framebuffers
   - grep loops with `+= dS` / `map(` / `MAX_STEPS` — ray-marching
   - grep `b*b` / discriminant / `sqrt(` with quadratics — **analytic intersection**
     (closed-form; spheres/planes) — never assume ray-marching on intuition;
     refraction demos are frequently analytic.
4. **Find the GPU-DOM bridge.** If a WebGL canvas isn't displayed directly but
   feeds `toDataURL` / `feImage` / `feDisplacementMap`, it is generating a DATA
   image (displacement/normal/depth) for another layer. This is the layer
   secondhand analyses most often get backwards.
5. **Physics/audio read separately** — usually decoupled pure-JS modules,
   independently verifiable.

## Evidence grading — every claim gets a tag

Ungraded = GUESS. Nothing GUESS-level gets copied into the clone until upgraded
to SOURCE.

| Tag | Meaning | Examples |
|---|---|---|
| `SOURCE` | Direct, target-bound hard evidence | Real source line, source-map-recovered module, runtime object dump, captured shader text, frame capture, hashed network response body |
| `PARTIAL` | A handle for the next probe, not a conclusion | Class/function/field names, minified bundle slice, framework object, shader without its uniforms/passes/input state |
| `GUESS` | Reconstructed without direct evidence | Visual fitting, name-based inference, assumed defaults, hand-tuned magic numbers, anything that merely "looks right" |

The cautionary case: an AI analysis of a glass-marbles site fabricated
"ray-marching + SDF + sampling the DOM as a texture" for what was really analytic
sphere intersection encoding a displacement map (RG=offset, B=fresnel) that an
SVG `feDisplacementMap` used to distort the live DOM. Concept skeleton was
roughly right; every code block was invented — constants, filter chain, and
coordinate conventions included. Lesson: secondhand analyses may inform the
skeleton; their code blocks are copied never, verified always, line by line
against real source.

## No-compensation rule

Never tweak brightness/speed/position/noise to make output "look right" and mask
a real error in timing, color, FBO wiring, resources, coordinate systems, or
state models.

- A fitted constant that improves the picture is STILL a GUESS; write down what
  evidence would upgrade it.
- Wiring facts (pass order, coordinate transforms, time units, input coupling)
  are never "confirmed" by resemblance — chase them to evidence independently.
- What cannot be verified is recorded honestly, never faked.

## Baseline-first gate

The classic failure: extracting, rewriting, and beautifying simultaneously —
ending up neither faithful nor explainable. Gate it:

```
locate render surface -> capture minimal truth -> RAW REPLAY (as-is minimal repro)
  -> BASELINE: frame-by-frame comparison passes
  -> only then PROJECTIZE (refactor into an editable project) -> package
```

- **RAW REPLAY**: real captured draw calls / shaders / uniforms / vertex data in
  the smallest as-is runnable repro. No optimizing, no framework swap, no
  parameter changes.
- **BASELINE gate**: the replay must match the original frame-by-frame (or on
  sampled frames) before any refactor is allowed.
- After the gate, projectize into a maintainable form; every spot keeps its
  evidence tag. Final status is honest: baseline-verified / projectized /
  baseline-with-recorded-gaps.
- Keep replay artifacts in `RECON/baseline/` next to the screenshots as proof.

## No source anywhere: runtime capture fallback

First moves are always GitHub search and `sourcemap-hunt.mjs`. When an effect
site is sourceless and minified to the ground, do NOT regress to "write what it
looks like" (that is GUESS). Capture truth at the rendering boundary:

- Intercept the WebGL/WebGPU context: actual draw calls, bound programs,
  compiled shader source, uniform values, FBO/texture sizes, blend/depth state.
- Tool directions: spector.js-style frame capture, patching
  `WebGLRenderingContext.prototype` to log calls, `getShaderSource` for compiled
  shaders, a preload script injecting hooks before page scripts run.
- These captures count as `SOURCE` — they are the new "real source"; feed them
  into the baseline-first flow.

## Transferable paradigms worth keeping

- **Displacement-map refraction of live DOM**: offscreen WebGL computes a PNG
  (RG=displacement, B=auxiliary), SVG `feDisplacementMap scale=N` distorts real
  interactive HTML with it. GPU-side and SVG-side scales must match. Enables
  liquid glass / magnifier / ripple over a live page — something
  `MeshPhysicalMaterial(transmission)` cannot do (glass-ball looks, yes;
  refracting the whole page, no).
- **One shader, mode uniform**: refraction/reflection/shadow/highlight share one
  fragment shader branched on a mode uniform.
- **Downres auxiliary data + sleep when settled**: displacement/shadow maps
  tolerate 1/2-1/4 resolution; stop rendering entirely when objects settle.
- **Fullscreen big triangle over quad**: 3 vertices `[-1,-1, 3,-1, -1,3]`.

## Porting decisions

- 1:1 possible and license allows: take real source, change copy/colors/params.
- Approximate effect acceptable: same-genre open-source template — but swapping
  the implementation route often drops the original's soul mechanism (e.g.
  refracting the live DOM); confirm that mechanism isn't the point first.
- Site-specific math (intersection formulas, magic numbers) must be rederived
  when the shape/material changes — analytic sphere code doesn't survive a mesh.

## Verification (hard requirement)

Local server, real browser, console clean of JS/WebGL compile errors, screenshots
against the original at multiple scroll positions. Physics sites: two loads with
different initial states indirectly prove the engine runs. Synthetic input
limitations (untrusted PointerEvents) get recorded, not papered over.
