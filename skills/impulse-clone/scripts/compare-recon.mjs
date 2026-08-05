#!/usr/bin/env node
// From nexu-io/open-design web-clone (Apache-2.0), re-expressed for the impulse suite.
import fs from "node:fs";
import path from "node:path";

function usage() {
  console.log(`Usage:
  node scripts/compare-recon.mjs --original <original-recon.json> --clone <clone-recon.json> [--visual-diff visual-diff.json] [--original-routes route-map.json] [--clone-routes route-map.json] [--original-interactions interactions.json] [--clone-interactions interactions.json] [--out CLONE_REPORT.md]
`);
}

function parseArgs(argv) {
  const out = {
    original: "",
    clone: "",
    visualDiff: "",
    originalRoutes: "",
    cloneRoutes: "",
    originalInteractions: "",
    cloneInteractions: "",
    out: "CLONE_REPORT.md",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--original") out.original = argv[++i] || "";
    else if (arg === "--clone") out.clone = argv[++i] || "";
    else if (arg === "--visual-diff") out.visualDiff = argv[++i] || "";
    else if (arg === "--original-routes") out.originalRoutes = argv[++i] || "";
    else if (arg === "--clone-routes") out.cloneRoutes = argv[++i] || "";
    else if (arg === "--original-interactions") out.originalInteractions = argv[++i] || "";
    else if (arg === "--clone-interactions") out.cloneInteractions = argv[++i] || "";
    else if (arg === "--out") out.out = argv[++i] || "CLONE_REPORT.md";
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  return out;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function firstSignals(recon) {
  return recon.captures?.[0]?.signals || {};
}

function boolList(flags = {}) {
  return Object.entries(flags).filter(([, value]) => value).map(([key]) => key);
}

function ratioScore(a, b) {
  if (a === 0 && b === 0) return 5;
  if (a === 0 || b === 0) return 1;
  const ratio = Math.min(a, b) / Math.max(a, b);
  if (ratio > 0.9) return 5;
  if (ratio > 0.75) return 4;
  if (ratio > 0.55) return 3;
  if (ratio > 0.3) return 2;
  return 1;
}

function sequenceSimilarity(a, b) {
  const left = a.map((item) => `${item.tag}:${item.text}`).filter(Boolean);
  const right = b.map((item) => `${item.tag}:${item.text}`).filter(Boolean);
  if (!left.length && !right.length) return 1;
  if (!left.length || !right.length) return 0;
  const rightSet = new Set(right);
  const hits = left.filter((item) => rightSet.has(item)).length;
  return hits / Math.max(left.length, right.length);
}

function inferComplexity(signals) {
  const frameworks = boolList(signals.frameworks);
  const counts = signals.counts || {};
  if ((counts.forms || 0) > 2 && (counts.inputs || 0) > 10) return "L6";
  if ((counts.canvas || 0) > 0 || signals.frameworks?.three) return "L5";
  if (signals.frameworks?.gsap || signals.frameworks?.lenis || (counts.video || 0) > 2) return "L4";
  if (frameworks.some((name) => ["react", "next", "vue", "nuxt", "svelte", "astro"].includes(name))) return "L3";
  if ((counts.links || 0) > 80 || (counts.images || 0) > 40) return "L2";
  return "L1";
}

function score(original, clone, visualDiff) {
  const o = firstSignals(original);
  const c = firstSignals(clone);
  const structureSimilarity = sequenceSimilarity(o.headings || [], c.headings || []);
  const structure = Math.max(1, Math.round(structureSimilarity * 5));
  const responsive = original.captures?.length === clone.captures?.length ? 4 : 2;
  const functionCounts = ["links", "forms", "buttons", "inputs"].map((key) => ratioScore(o.counts?.[key] || 0, c.counts?.[key] || 0));
  const functional = Math.round(functionCounts.reduce((sum, value) => sum + value, 0) / functionCounts.length);
  const motionCounts = ["canvas", "video"].map((key) => ratioScore(o.counts?.[key] || 0, c.counts?.[key] || 0));
  const interaction = Math.round(motionCounts.reduce((sum, value) => sum + value, 0) / motionCounts.length);
  return {
    sourceEvidence: 3,
    structure,
    visual: visualDiff ? `${visualDiff.visualScore}/5` : "manual: inspect screenshots or pass --visual-diff",
    interaction,
    responsive,
    functional,
    contentReplacement: "manual: check copy residue",
    legalRisk: "manual: verify license / assets",
  };
}

function line(value) {
  if (Array.isArray(value)) return value.join(", ") || "none";
  return value ?? "";
}

function routePath(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}` || "/";
  } catch {
    return url;
  }
}

function routesSection(files, evidence) {
  if (!evidence.originalRoutes || !evidence.cloneRoutes) {
    return `## Route coverage
- No route-crawl results provided. Multi-page sites need --original-routes / --clone-routes.
`;
  }
  const originalSet = new Set((evidence.originalRoutes.routes || []).map((route) => routePath(route.url)));
  const cloneSet = new Set((evidence.cloneRoutes.routes || []).map((route) => routePath(route.url)));
  const matched = Array.from(originalSet).filter((item) => cloneSet.has(item));
  const missing = Array.from(originalSet).filter((item) => !cloneSet.has(item));
  const extra = Array.from(cloneSet).filter((item) => !originalSet.has(item));
  const coverage = originalSet.size ? Math.round((matched.length / originalSet.size) * 100) : 100;
  return `## Route coverage
- Original routes: ${originalSet.size}
- Clone routes: ${cloneSet.size}
- Coverage: ${coverage}%
- Original route map: ${files.originalRoutes}
- Clone route map: ${files.cloneRoutes}
- Missing routes: ${missing.join(", ") || "none"}
- Extra routes: ${extra.join(", ") || "none"}
`;
}

function changedActionCount(interactions) {
  return (interactions?.actions || []).filter((action) => action.changed).length;
}

function interactionSection(files, evidence) {
  if (!evidence.originalInteractions || !evidence.cloneInteractions) {
    return `## Interaction coverage
- No interaction-probe results provided. Interactive sites need --original-interactions / --clone-interactions.
`;
  }
  const originalActions = evidence.originalInteractions.actions || [];
  const cloneActions = evidence.cloneInteractions.actions || [];
  const originalChanged = changedActionCount(evidence.originalInteractions);
  const cloneChanged = changedActionCount(evidence.cloneInteractions);
  const originalCanvas = evidence.originalInteractions.discovered?.canvases?.length || 0;
  const cloneCanvas = evidence.cloneInteractions.discovered?.canvases?.length || 0;
  const originalInteractive = evidence.originalInteractions.discovered?.interactive?.length || 0;
  const cloneInteractive = evidence.cloneInteractions.discovered?.interactive?.length || 0;
  return `## Interaction coverage
- Original visible interactive targets: ${originalInteractive}
- Clone visible interactive targets: ${cloneInteractive}
- Original canvas targets: ${originalCanvas}
- Clone canvas targets: ${cloneCanvas}
- Original changed actions: ${originalChanged}/${originalActions.length}
- Clone changed actions: ${cloneChanged}/${cloneActions.length}
- Original interaction probe: ${files.originalInteractions}
- Clone interaction probe: ${files.cloneInteractions}
- Verdict: ${originalChanged === cloneChanged && originalCanvas === cloneCanvas ? "Interaction count signals are close; still inspect screenshots to confirm state quality." : "Interaction count signals differ; check for missing states or over-implementation."}
`;
}

function report(files, original, clone, evidence) {
  const o = firstSignals(original);
  const c = firstSignals(clone);
  const scores = score(original, clone, evidence.visualDiff);
  const complexity = inferComplexity(o);
  const originalFlags = boolList(o.frameworks);
  const cloneFlags = boolList(c.frameworks);
  const counts = ["sections", "links", "images", "video", "canvas", "forms", "buttons", "inputs", "interactive", "scripts"];

  return `# ${original.label || "original"} vs ${clone.label || "clone"} - clone evaluation report

## Conclusion
- Original URL: ${original.url}
- Clone URL: ${clone.url}
- Auto-inferred complexity: ${complexity}
- Suggested mode: ${complexity === "L5" ? "teardown / faithful clone first" : complexity === "L6" ? "presentation-layer visual clone" : "visual clone / rebrand"}
- Auto-report boundary: structure, counts, frameworks, console compare automatically; with visual-diff, pixel-diff scoring is included. Content residue and legal still need the audit.

## Technical signals
| Item | Original | Clone |
|---|---|---|
| title | ${o.title || ""} | ${c.title || ""} |
| lang | ${o.lang || ""} | ${c.lang || ""} |
| frameworks | ${line(originalFlags)} | ${line(cloneFlags)} |
| scrollHeight | ${o.scrollHeight || 0} | ${c.scrollHeight || 0} |
| h1 | ${line(o.h1)} | ${line(c.h1)} |

## Count comparison
| Metric | Original | Clone | Auto score |
|---|---:|---:|---:|
${counts.map((key) => `| ${key} | ${o.counts?.[key] || 0} | ${c.counts?.[key] || 0} | ${ratioScore(o.counts?.[key] || 0, c.counts?.[key] || 0)}/5 |`).join("\n")}

## Scores
- Source evidence: ${scores.sourceEvidence}/5
- Structure: ${scores.structure}/5
- Visual: ${scores.visual}
- Motion/interaction: ${scores.interaction}/5
- Responsive: ${scores.responsive}/5
- Functional: ${scores.functional}/5
- Content swap: ${scores.contentReplacement}
- Legal/deploy risk: ${scores.legalRisk}

## Console
- Original console errors: ${original.console?.errors?.length || 0}
- Clone console errors: ${clone.console?.errors?.length || 0}
- Original page errors: ${original.console?.pageErrors?.length || 0}
- Clone page errors: ${clone.console?.pageErrors?.length || 0}

${routesSection(files, evidence)}

${interactionSection(files, evidence)}

## Screenshot evidence
- Original recon: ${files.original}
- Clone recon: ${files.clone}
- Pixel diff: ${files.visualDiff || "not provided"}
- Pixel diff ratio: ${evidence.visualDiff ? evidence.visualDiff.diffPixelRatio : "not provided"}
- Original screenshots: ${(original.captures || []).map((capture) => capture.screenshot).join(", ")}
- Clone screenshots: ${(clone.captures || []).map((capture) => capture.screenshot).join(", ")}

## Known gaps
- Without visual-diff input, visual fidelity requires opening the screenshots for manual confirmation.
- Legal, asset licensing, and brand-replacement completeness require manual review.
`;
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.original || !args.clone) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const original = readJson(args.original);
  const clone = readJson(args.clone);
  const visualDiff = args.visualDiff ? readJson(args.visualDiff) : null;
  const originalRoutes = args.originalRoutes ? readJson(args.originalRoutes) : null;
  const cloneRoutes = args.cloneRoutes ? readJson(args.cloneRoutes) : null;
  const originalInteractions = args.originalInteractions ? readJson(args.originalInteractions) : null;
  const cloneInteractions = args.cloneInteractions ? readJson(args.cloneInteractions) : null;
  const output = path.resolve(args.out);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, report(args, original, clone, {
    visualDiff,
    originalRoutes,
    cloneRoutes,
    originalInteractions,
    cloneInteractions,
  }));
  console.log(output);
} catch (error) {
  console.error(`compare-recon failed: ${error.message}`);
  process.exit(1);
}
