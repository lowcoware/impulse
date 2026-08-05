#!/usr/bin/env node
/*
  impulse-frontend preflight scanner — dependency-free.

  Greps a project's frontend source for the MECHANICAL subset of the impulse
  preflight checks (references/preflight.md) plus the greppable bans from
  references/ai-tells.md. Prints a grouped report of file:line hits. It NEVER
  edits files. Every hit is a lead to confirm by reading the code, not a
  verdict — the non-mechanical checks (contrast, layout counts, Web Vitals)
  stay in preflight.md and are not encoded here.

  Scanner pattern from yetone/kill-ai-slop (MIT), re-expressed for the impulse
  suite: same walk/grep/report architecture, impulse's own rule set and
  suppression syntax.

  Usage:
    node preflight.mjs [root] [--json] [--no-color] [--gate]
                       [--only=14,t3] [--skip=16] [--exclude=path]
                       [--rules=extra.mjs]

  Rule ids: bare numbers map to preflight.md row numbers (#1, #14, ...);
  t-prefixed ids (t1, t2, ...) come from the ai-tells ban catalog.

  Exit code: 0 even with findings — this is an informational tool, not a
  gate. --gate flips that: nonzero exit when any finding exists, so a
  project's CI can consume it.

  Suppressing confirmed-intentional hits, in source comments:
    impulse-ok [ids...]            suppress hits on the same line
    impulse-ok-next-line [ids...]  suppress hits on the next line
    impulse-ok-file [ids...]       suppress hits in the whole file
  Without ids the directive suppresses every rule; with ids
  (e.g. // impulse-ok-next-line t3 14) only those.
*/

import { readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, extname, join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const root = args.find((a) => !a.startsWith("-")) || ".";
const asJson = args.includes("--json");
const asGate = args.includes("--gate");
// Ids compare after stripping leading zeros so --only=05 still matches "5".
const normalizeId = (value) => value.replace(/^0+(?=\d)/, "");
const flagValues = (name) =>
  args
    .filter((a) => a.startsWith(`--${name}=`))
    .flatMap((a) => a.slice(name.length + 3).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
const onlyIds = new Set(flagValues("only").map(normalizeId));
const skipIds = new Set(flagValues("skip").map(normalizeId));
const excludes = flagValues("exclude");
const rulesFiles = flagValues("rules");
const useColor = !args.includes("--no-color") && process.stdout.isTTY && !asJson;

// realpath both roots so the "skip the skill's own files" check still works
// when one path arrives through a symlink (e.g. a symlinked .claude/skills).
const realpathOr = (p) => {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
};
const resolvedRoot = realpathOr(resolve(root));
const skillRoot = realpathOr(resolve(dirname(fileURLToPath(import.meta.url)), ".."));

// Neutralize control characters and terminal escape sequences (OSC, CSI, ...)
// before echoing file names or line content — hostile file names must not be
// able to inject sequences into the caller's terminal.
const escapeTerminal = (text) =>
  text.replace(/[\0-\x1f\x7f-\x9f]/g, (char) =>
    `\\x${char.codePointAt(0).toString(16).padStart(2, "0")}`,
  );

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "out", ".next", ".astro",
  ".output", ".svelte-kit", ".nuxt", "coverage", "vendor", ".cache",
  ".vercel", ".turbo",
]);
const EXTS = new Set([
  ".html", ".css", ".scss", ".sass", ".less",
  ".tsx", ".jsx", ".ts", ".js", ".mjs", ".cjs",
  ".vue", ".svelte", ".astro", ".md", ".mdx",
]);

// A rule: id, group, human name, one-line fix, and the patterns that flag it.
// Plain rules only look at code/style files; `copy: true` rules also read
// prose (.md/.mdx). `excludePath` (RegExp vs the relative path) lets a rule
// skip legitimate homes, e.g. hand-rolled <path d= inside an icons/ dir.
// Patterns run against the whole file text, so [\s\S]{0,N} windows catch
// combos that span attribute line breaks.
const RULES = [
  // ---- preflight.md mechanical rows (id = row number) ----
  { id: "1", group: "copy", name: "em/en dash in UI strings", fix: "hyphen or rewrite; dashes never render in UI copy",
    patterns: [/[—–]/u] },
  { id: "2", group: "layout", name: "h-screen", fix: "min-h-dvh / 100dvh; h-screen lies on mobile chrome",
    patterns: [/\bh-screen\b/] },
  { id: "4", group: "perf", name: "raw scroll listener", fix: "IntersectionObserver or a scroll-driven library, never addEventListener('scroll')",
    patterns: [/addEventListener\(\s*['"`]scroll['"`]/] },
  { id: "7", group: "a11y", name: "outline:none", fix: "pair every removal with a focus-visible replacement in the same component",
    patterns: [/\boutline-none\b/, /outline:\s*none/i] },
  { id: "8", group: "component", name: "second icon family", fix: "one family per project: phosphor",
    patterns: [
      /lucide(?:-vue-next|-react)?|@heroicons\/|heroicons|@tabler\/icons|@fortawesome\/|react-icons\//i,
    ] },
  { id: "10", group: "component", name: "arbitrary radius rounded-[...]", fix: "radius from the token scale; cards cap at 16px",
    patterns: [/rounded-\[[^\]]+\]/] },
  { id: "14", group: "color", name: "gradient text", fix: "one solid color; emphasis via weight or size",
    patterns: [
      /bg-clip-text/,
      /(?:-webkit-)?background-clip:\s*text/i,
      /-webkit-text-fill-color:\s*transparent/i,
    ] },
  { id: "15", group: "layout", name: "arbitrary z-index z-[99+]", fix: "small documented z scale; 999 means stacking is broken",
    patterns: [/z-\[?9{2,}/] },
  { id: "16", group: "code", name: "console.log", fix: "delete before delivering",
    patterns: [/console\.log\(/] },
  { id: "17", group: "component", name: "hand-rolled <path d=", fix: "phosphor icon, not hand-drawn path data",
    excludePath: /(?:^|\/)icons?\//i,
    patterns: [/<path\s+d=/i] },
  { id: "22", group: "perf", name: "standing will-change", fix: "set only while a tween runs; never in static CSS",
    patterns: [/will-change/i] },
  { id: "23", group: "a11y", name: "paste blocking", fix: "never block paste in inputs",
    patterns: [/@paste\.prevent/, /\bonpaste\b/i] },
  { id: "24", group: "motion", name: "animated blur", fix: "no continuous blur animation; static, small, small-surface only",
    patterns: [
      /(?:transition|animation|animate)[^\n]{0,80}?blur\(/i,
      /blur\([^)]*\)[^\n]{0,80}?(?:transition|animation-)/i,
    ] },
  { id: "25", group: "layout", name: "flex calc math w-[calc(", fix: "grid-cols-* replaces flex percentage splits",
    patterns: [/w-\[calc\(/] },

  // ---- ai-tells bans, greppable subset (id = t<N>) ----
  { id: "t1", group: "color", name: "indigo-violet gradient", fix: "one solid, chosen accent (the Lila Rule)",
    patterns: [
      /from-(?:indigo|violet|purple|fuchsia)-\d+[\s\S]{0,60}?to-(?:purple|violet|fuchsia|pink)-\d+/i,
      /(?:linear-gradient|bg-gradient)[^;"'`]*(?:#6366f1|#8b5cf6|#a855f7|#7c3aed)/i,
    ] },
  { id: "t2", group: "color", name: "one-hue status box", fix: "state in words; one muted accent on neutral",
    patterns: [
      /border-(red|amber|yellow|green|blue)-\d+[\s\S]{0,60}?text-\1-\d+/i,
      /bg-(?:red|amber|yellow|green|blue)-\d+\/(?:5|10|15|20)\b/,
    ] },
  { id: "t3", group: "color", name: "default semantic palette rainbow", fix: "one palette: neutrals plus a couple of chosen states",
    patterns: [
      /bg-(?:blue|indigo)-50|bg-amber-50|bg-(?:green|emerald)-50|bg-red-50/,
      /(?:info|success|warning|error)[^\n]{0,30}(?:blue|green|amber|red)-(?:50|100|500|600|700)/i,
    ] },
  { id: "t4", group: "color", name: "icon in a tint of itself", fix: "no tinted tile; inherit text color",
    patterns: [
      /bg-(indigo|blue|green|amber|red|purple|pink|violet)-\d+\/(?:5|10|15|20)[\s\S]{0,60}?text-\1-/i,
      /text-(indigo|blue|green|amber|red|purple|pink|violet)-\d+[\s\S]{0,60}?bg-\1-\d+\/(?:5|10|15|20)/i,
    ] },
  { id: "t5", group: "motion", name: "transition-all", fix: "transition only the properties that change",
    patterns: [/\btransition-all\b/] },
  { id: "t6", group: "motion", name: "springy hover transform", fix: "state change without launch; 120-200ms on what changes",
    patterns: [/hover:(?:scale-1\d\d|-translate-y-)/] },
  { id: "t7", group: "motion", name: "overshoot bounce easing", fix: "standard ease curves; no bounce",
    patterns: [
      /cubic-bezier\([^)]*,\s*1\.[2-9]/,
      /\banimate-bounce\b/,
    ] },
  { id: "t8", group: "component", name: "oversized shadow (60px+ blur)", fix: "tight elevation, never bigger than the element",
    patterns: [
      /box-shadow:[^;{}]*\b(?:[6-9]\d|\d{3,})px/i,
      /shadow-\[[^\]]*\b(?:[6-9]\d|\d{3,})px/i,
      /drop-shadow\([^)]*\b(?:[6-9]\d|\d{3,})px/i,
    ] },
  { id: "t9", group: "component", name: "side-stripe callout (border-l-4)", fix: "full border, tint, or nothing",
    patterns: [
      /border-l-4[\s\S]{0,40}?rounded|rounded[\s\S]{0,40}?border-l-4/i,
      /border-(?:left|right):\s*[3-9]px\s+solid/i,
    ] },
  { id: "t10", group: "component", name: "glassmorphism by default", fix: "solid surfaces; blur only when the brief names it",
    patterns: [
      /backdrop-blur/,
      /backdrop-filter:\s*blur/i,
    ] },
  { id: "t11", group: "component", name: "glowing status dot", fix: "flat dot plus a word; no halo, no pulse",
    patterns: [
      /animate-(?:ping|pulse)\b[\s\S]{0,60}?rounded-full|rounded-full[\s\S]{0,60}?animate-(?:ping|pulse)\b/i,
    ] },
  { id: "t12", group: "component", name: "oversized / full-pill radius on surfaces", fix: "cards cap at 12-16px; full-pill only for tags and buttons",
    patterns: [
      /border-radius:\s*(?:3[2-9]|[4-9]\d|\d{3,})px/i,
      /border-radius:\s*(?:9999px|50%)/i,
      /rounded-\[(?:3[2-9]|[4-9]\d|\d{3,})px\]/,
      /rounded-full[\s\S]{0,50}?(?:shadow-(?:md|lg|xl|2xl)|\bborder\b)/,
    ] },
  { id: "t13", group: "layout", name: "nested cards (lead)", fix: "one surface per region; hairlines inside",
    patterns: [
      /rounded(?:-\w+)?\b[\s\S]{0,120}?\bborder\b[\s\S]{0,120}?rounded(?:-\w+)?\b[\s\S]{0,120}?\bborder\b/,
    ] },
  { id: "t14", group: "component", name: "rounded + overflow-hidden wrapper (border-dies-at-corner lead)", fix: "radius and border on the same box",
    patterns: [
      /rounded-(?:lg|xl|2xl|3xl)[^"'\n]{0,60}overflow-(?:hidden|clip)|overflow-(?:hidden|clip)[^"'\n]{0,60}rounded-(?:lg|xl|2xl|3xl)/i,
    ] },
  { id: "t15", group: "layout", name: "01/02/03 ordinal markers", fix: "numbers only for real ordered sequences",
    patterns: [/['"`>]0[1-9]['"`<]/] },
  { id: "t16", group: "copy", name: "invented stat row", fix: "only measured, sourced numbers",
    copy: true,
    patterns: [
      /\b\d+[km]\+[\s\S]{0,30}?(?:developers|users|teams|customers|downloads|stars)/i,
      /99\.9+%/,
      /\b24\/7\b/,
    ] },
  { id: "t17", group: "copy", name: "decorative emoji in UI chrome", fix: "cut emoji from product UI",
    patterns: [/\p{Extended_Pictographic}/u] },
  { id: "t18", group: "type", name: "crushed letter tracking", fix: "tracking never below -0.05em",
    patterns: [
      /letter-spacing:\s*-0?\.0[5-9]/i,
      /tracking-\[-0?\.0[5-9]/,
    ] },
  { id: "t19", group: "copy", name: "AI copywriting voice", fix: "say the specific thing",
    copy: true,
    patterns: [
      /not just .{1,40}\bit(?:['’])?s\b/i,
      /\b(?:say goodbye to|meet your new|supercharge|unlock the power of|in seconds,? not)\b/i,
      /\b(?:blazing[- ]fast|effortless(?:ly)?|seamless(?:ly)?|game[- ]?changer|next[- ]level)\b/i,
      /\b(?:growth|security|process|privacy|productivity|compliance|feature|innovation) theater\b/i,
    ] },
  { id: "t20", group: "color", name: "repeating-gradient stripes", fix: "decorative stripes only on real canvas/map surfaces",
    patterns: [/repeating-(?:linear|radial)-gradient/i] },
  { id: "t21", group: "component", name: "colored glow box-shadow", fix: "neutral shadow or none; accent never glows",
    patterns: [
      /box-shadow:[^;{}]*(?:#(?:6366f1|8b5cf6|a855f7|7c3aed|22d3ee|06b6d4)|rgba?\(\s*(?:99|124|139|168)\b)/i,
      /shadow-(?:indigo|purple|violet|fuchsia|blue|cyan|emerald|green|pink)-\d+\/\d+/,
    ] },
];

// Extra rule modules (--rules=file.mjs): each exports a default array of
// rules shaped like the entries above. Patterns may be RegExp or plain
// strings (compiled case-insensitive). Lets language- or stack-specific
// rules (e.g. rules.ru.mjs) live outside the core set.
for (const rulesPath of rulesFiles) {
  let extra;
  try {
    const mod = await import(pathToFileURL(resolve(rulesPath)).href);
    extra = mod.default ?? mod.rules;
  } catch (err) {
    console.error(`Could not load rules file ${escapeTerminal(rulesPath)}: ${err.message}`);
    process.exit(1);
  }
  if (!Array.isArray(extra)) {
    console.error(`Rules file ${escapeTerminal(rulesPath)} must export an array of rules`);
    process.exit(1);
  }
  for (const rule of extra) {
    if (!rule || typeof rule.id !== "string" || typeof rule.name !== "string" ||
        !Array.isArray(rule.patterns) || rule.patterns.length === 0) {
      console.error(`Rules file ${escapeTerminal(rulesPath)}: each rule needs a string id, a name, and a non-empty patterns array`);
      process.exit(1);
    }
    RULES.push({
      id: normalizeId(rule.id),
      group: rule.group || "custom",
      name: rule.name,
      fix: rule.fix || "",
      copy: Boolean(rule.copy),
      excludePath: rule.excludePath instanceof RegExp ? rule.excludePath : undefined,
      patterns: rule.patterns.map((p) => (p instanceof RegExp ? p : new RegExp(p, "iu"))),
    });
  }
}

const isExcluded = (path) => {
  if (excludes.length === 0) return false;
  const rel = relative(resolvedRoot, path);
  return excludes.some((token) => rel.includes(token));
};

function walk(dir, files = []) {
  if (resolve(dir) === skillRoot) return files;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (isExcluded(full)) continue;
    if (e.isDirectory()) {
      // Skip build output, dependencies, and the installed skill's own files.
      if (SKIP_DIRS.has(e.name) || resolve(full) === skillRoot) continue;
      walk(full, files);
    } else if (e.isFile()) {
      if (/\.min\.[a-z]+$/.test(e.name)) continue;
      if (/(package-lock|pnpm-lock|yarn\.lock|bun\.lockb?)/.test(e.name)) continue;
      if (EXTS.has(extname(e.name))) files.push(full);
    }
  }
  return files;
}

function scanFile(path) {
  let text;
  try {
    const st = statSync(path);
    if (st.size > 512 * 1024) return []; // skip large/generated files
    text = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  const ext = extname(path);
  const isCode = ext !== ".md" && ext !== ".mdx";
  const relPath = relative(resolvedRoot, path).split("\\").join("/");
  const lines = text.split(/\r?\n/);

  // impulse-ok directives, parsed once per file. Ids are the tokens after the
  // directive that contain a digit ("t3", "14"); none means all rules.
  const parseIds = (tail) => {
    const ids = (tail.match(/[\w-]+/g) || []).filter((t) => /\d/.test(t)).map(normalizeId);
    return ids.length ? new Set(ids) : null; // null = every rule
  };
  const lineOks = new Map(); // lineIndex -> null (all) | Set of ids
  let fileOk; // undefined | null (all) | Set of ids
  const addLineOk = (idx, ids) => {
    if (idx < 0 || idx >= lines.length || lineOks.get(idx) === null) return;
    if (ids === null) return void lineOks.set(idx, null);
    const set = lineOks.get(idx) || new Set();
    for (const id of ids) set.add(id);
    lineOks.set(idx, set);
  };
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/impulse-ok(-file|-next-line)?\b(.*)$/);
    if (!m) continue;
    const ids = parseIds(m[2]);
    if (m[1] === "-file") {
      if (ids === null) fileOk = null;
      else if (fileOk !== null) {
        fileOk = fileOk || new Set();
        for (const id of ids) fileOk.add(id);
      }
    } else if (m[1] === "-next-line") addLineOk(i + 1, ids);
    else addLineOk(i, ids);
  }
  if (fileOk === null) return [];
  const isSuppressed = (id, lineIndex) => {
    if (fileOk && fileOk.has(id)) return true;
    const ok = lineOks.get(lineIndex);
    return ok === null || (ok !== undefined && ok.has(id));
  };

  // Byte offset of each line start, for mapping a whole-text match (possibly
  // multiline) back to its first line via binary search.
  const lineStarts = [0];
  for (let idx = text.indexOf("\n"); idx !== -1; idx = text.indexOf("\n", idx + 1)) {
    lineStarts.push(idx + 1);
  }
  const hits = [];
  const seen = new Set();
  for (const rule of RULES) {
    if (onlyIds.size > 0 && !onlyIds.has(rule.id)) continue;
    if (skipIds.has(rule.id)) continue;
    if (!rule.copy && !isCode) continue; // code-only rule in a prose file
    if (rule.excludePath && rule.excludePath.test(relPath)) continue;
    for (const pattern of rule.patterns) {
      const matcher = new RegExp(pattern.source, `${pattern.flags.replace("g", "")}g`);
      let match;
      while ((match = matcher.exec(text))) {
        let low = 0;
        let high = lineStarts.length - 1;
        while (low < high) {
          const middle = Math.ceil((low + high) / 2);
          if (lineStarts[middle] <= match.index) low = middle;
          else high = middle - 1;
        }
        const lineIndex = low;
        const line = lines[lineIndex];
        if (line.length > 2000) continue; // minified-ish content
        const key = `${rule.id}:${lineIndex}`;
        if (!seen.has(key) && !isSuppressed(rule.id, lineIndex)) {
          seen.add(key);
          hits.push({ rule, line: lineIndex + 1, text: line.trim().slice(0, 100) });
        }
        if (match[0] === "") matcher.lastIndex += 1; // never loop on empty match
      }
    }
  }
  return hits;
}

// ---- run ----
// A missing or non-directory root must fail loudly — never report a clean
// scan over nothing.
try {
  if (!statSync(resolvedRoot).isDirectory()) {
    throw new Error("not a directory");
  }
} catch {
  console.error(`Scan root must be an existing directory: ${escapeTerminal(root)}`);
  process.exit(1);
}

const files = walk(resolvedRoot);
const byRule = new Map(); // id -> { rule, hits: [{file,line,text}] }
for (const f of files) {
  for (const h of scanFile(f)) {
    if (!byRule.has(h.rule.id)) byRule.set(h.rule.id, { rule: h.rule, hits: [] });
    byRule.get(h.rule.id).hits.push({
      file: relative(resolvedRoot, f) || f,
      line: h.line,
      text: h.text,
    });
  }
}

// Numeric ids first in numeric order, then t-ids, then custom rule ids.
const idSortKey = (id) => {
  if (/^\d+$/.test(id)) return [0, Number(id), id];
  if (/^t\d+$/.test(id)) return [1, Number(id.slice(1)), id];
  return [2, 0, id];
};
const groups = [...byRule.values()].sort((a, b) => {
  const ka = idSortKey(a.rule.id);
  const kb = idSortKey(b.rule.id);
  return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2]);
});
const totalHits = groups.reduce((n, g) => n + g.hits.length, 0);
const exitCode = asGate && totalHits > 0 ? 1 : 0;

if (asJson) {
  console.log(
    JSON.stringify(
      {
        root,
        filesScanned: files.length,
        groups: groups.length,
        hits: totalHits,
        findings: groups.map((g) => ({
          id: g.rule.id,
          group: g.rule.group,
          name: g.rule.name,
          fix: g.rule.fix,
          hits: g.hits,
        })),
      },
      null,
      2,
    ),
  );
  process.exit(exitCode);
}

const c = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = (s) => c("31", s);
const dim = (s) => c("2", s);
const bold = (s) => c("1", s);

console.log(`\n${bold("impulse preflight")} — scanned ${files.length} files under ${escapeTerminal(root)}\n`);
if (groups.length === 0) {
  console.log("No mechanical findings. Non-greppable checks in references/preflight.md still apply.\n");
  process.exit(0);
}

for (const g of groups) {
  console.log(`${red("hit")} ${bold(g.rule.id)} ${g.rule.name}  ${dim("-> " + g.rule.fix)}`);
  const shown = g.hits.slice(0, 12);
  for (const h of shown) {
    console.log(`     ${dim(escapeTerminal(h.file + ":" + h.line))}  ${escapeTerminal(h.text)}`);
  }
  if (g.hits.length > shown.length) {
    console.log(dim(`     ... and ${g.hits.length - shown.length} more`));
  }
  console.log("");
}

console.log(
  `${bold("->")} ${groups.length} rules hit, ${totalHits} hits total. ` +
    dim("Confirm each by reading the code; suppress intentional ones with impulse-ok comments.\n"),
);
process.exit(exitCode);
