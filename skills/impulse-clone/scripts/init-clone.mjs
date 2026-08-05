#!/usr/bin/env node
// From nexu-io/open-design web-clone (Apache-2.0), re-expressed for the impulse suite.
import fs from "node:fs";
import path from "node:path";

function usage() {
  console.log(`Usage:
  node scripts/init-clone.mjs <slug> [--url <url>] [--mode <mode>] [--level <L1-L6>] [--root <dir>] [--in-place]

Creates:
  <root>/<slug>-clone/
  <root>/<slug>-clone/NOTES.md
  <root>/<slug>-clone/RECON/screenshots/

With --in-place, creates NOTES.md and RECON/screenshots/ in <root> itself.
`);
}

function parseArgs(argv) {
  const out = { slug: null, url: "", mode: "", level: "", root: process.cwd(), inPlace: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--url") out.url = argv[++i] || "";
    else if (arg === "--mode") out.mode = argv[++i] || "";
    else if (arg === "--level") out.level = argv[++i] || "";
    else if (arg === "--root") out.root = argv[++i] || process.cwd();
    else if (arg === "--in-place") out.inPlace = true;
    else if (!out.slug) out.slug = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  return out;
}

function cleanSlug(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function notesTemplate({ name, url, mode, level }) {
  return `# ${name} - clone notes

## Source info
- Original URL: ${url}
- Source repo:
- Original author:
- License:
- Attribution requirements:

## Stack
- Framework / key libs / Node version:

## Pre-clone assessment
- Complexity level: ${level}
- Recommended mode: ${mode}
- High-fidelity parts:
- Approximated or substituted parts:
- Not cloned:
- Main risks:

## Run it
\`\`\`bash
python3 -m http.server 8123
\`\`\`

## Changes vs original
-

## Original vs clone
| Section | Original | Clone | Difference / tradeoff | Evidence |
|---|---|---|---|---|
| Hero |  |  |  |  |
| Nav |  |  |  |  |
| Core motion |  |  |  |  |
| Content blocks |  |  |  |  |
| Mobile |  |  |  |  |

## Scores
- Source evidence: /5
- Structure: /5
- Visual: /5
- Motion/interaction: /5
- Responsive: /5
- Functional: /5
- Content swap: /5
- Legal/deploy risk: /5
- Overall:

## Replacement map (what to change, where)
- Copy -> file, line
- Images/media -> directory
- Colors -> CSS variables / theme
- 3D models / fonts ->

## Verification
- [ ] Runs locally, console 0 errors
- [ ] Screenshots compared against original (RECON/screenshots/)
- Points that could NOT be verified (record honestly, never fake):
`;
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.slug) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const slug = cleanSlug(args.slug);
  if (!slug) throw new Error("Slug is empty after normalization.");
  const name = slug.endsWith("-clone") ? slug : `${slug}-clone`;
  const root = path.resolve(args.root || process.cwd());
  const project = args.inPlace ? root : path.join(root, name);

  if (!args.inPlace && fs.existsSync(project)) {
    throw new Error(`Project already exists: ${project}`);
  }

  fs.mkdirSync(path.join(project, "RECON", "screenshots"), { recursive: true });
  fs.writeFileSync(
    path.join(project, "NOTES.md"),
    notesTemplate({
      name,
      url: args.url,
      mode: args.mode,
      level: args.level,
    })
  );
  fs.writeFileSync(path.join(project, ".gitignore"), "node_modules/\n.DS_Store\n");

  console.log(project);
} catch (error) {
  console.error(`init-clone failed: ${error.message}`);
  process.exit(1);
}
