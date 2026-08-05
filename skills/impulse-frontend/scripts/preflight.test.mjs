// Tests for preflight.mjs — run with: node --test
// Test approach from yetone/kill-ai-slop scan.test.mjs (MIT), re-expressed.
// Each case seeds a temp project, runs the scanner as a child process, and
// asserts on the JSON report or exit behavior. RED/GREEN discipline: every
// rule assertion first proves the rule fires on bad input, not only that
// clean input passes.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(scriptDir, "preflight.mjs");
const ruRulesPath = join(scriptDir, "rules.ru.mjs");

function withTempProject(run) {
  const project = mkdtempSync(join(tmpdir(), "impulse-preflight-"));
  try {
    return run(project);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
}

function scan(root, ...args) {
  return spawnSync(process.execPath, [scriptPath, root, ...args], {
    encoding: "utf8",
  });
}

function reportFor(root, ...args) {
  const result = scan(root, "--json", ...args);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function finding(report, id) {
  return report.findings.find((entry) => entry.id === id);
}

test("rejects a missing root and sanitizes escape sequences in the error", () => {
  withTempProject((project) => {
    const control = "\u001b]52;c;not-a-clipboard\u0007";
    const result = scan(join(project, `missing-${control}`), "--json");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Scan root must be an existing directory/);
    assert.equal(result.stderr.includes(control), false);
    assert.ok(result.stderr.includes("\\x1b]52;c;not-a-clipboard\\x07"));
    assert.equal(result.stdout, "");

    // A file (not a directory) as root must also be rejected.
    const file = join(project, "app.vue");
    writeFileSync(file, "");
    const fileResult = scan(file, "--json");
    assert.notEqual(fileResult.status, 0);
    assert.match(fileResult.stderr, /Scan root must be an existing directory/);
  });
});

test("seeded slop file produces the expected preflight rule hits", () => {
  withTempProject((project) => {
    writeFileSync(
      join(project, "Hero.vue"),
      `<template>\n` +
        `  <section class="h-screen bg-clip-text text-transparent z-[999]">\n` +
        `    <h1 class="rounded-[13px] w-[calc(50%-1rem)]">Fast — reliable</h1>\n` +
        `    <svg><path d="M4 4 L20 20" /></svg>\n` +
        `  </section>\n` +
        `</template>\n` +
        `<script setup>\n` +
        `import { Menu } from "lucide-vue-next";\n` +
        `console.log("debug");\n` +
        `window.addEventListener('scroll', () => {});\n` +
        `</script>\n`,
    );
    writeFileSync(
      join(project, "styles.css"),
      `.hero { will-change: transform; outline: none; }\n` +
        `.blurred { transition: filter 2s; filter: blur(24px); }\n`,
    );
    writeFileSync(join(project, "Form.vue"), `<input @paste.prevent />\n`);

    const report = reportFor(project);
    for (const id of ["1", "2", "4", "7", "8", "10", "14", "15", "16", "17", "22", "23", "24", "25"]) {
      assert.ok(finding(report, id), `expected preflight rule ${id} to fire`);
    }
  });
});

test("seeded ai-tells combos fire, including multiline class attributes", () => {
  withTempProject((project) => {
    // Multiline class attribute: gradient combo spans an attribute line break.
    writeFileSync(
      join(project, "Card.vue"),
      `<div class="from-indigo-500\n  to-violet-600 transition-all hover:scale-105" />\n` +
        `<div class="border-red-500 bg-red-500/10 text-red-500">error</div>\n` +
        `<span class="bg-blue-50">info</span>\n` +
        `<div class="rounded-xl overflow-hidden border-l-4 backdrop-blur" />\n` +
        `<i class="animate-ping rounded-full" />\n` +
        `<b>01</b>\n`,
    );
    writeFileSync(
      join(project, "glow.css"),
      `.pop { transition: transform .3s cubic-bezier(.2, .8, .4, 1.4); }\n` +
        `.glow { box-shadow: 0 0 80px #8b5cf6; }\n` +
        `.pill { border-radius: 9999px; }\n` +
        `.tight { letter-spacing: -0.06em; }\n` +
        `.stripes { background: repeating-linear-gradient(45deg, #eee, #eee 2px); }\n`,
    );
    writeFileSync(
      join(project, "landing.md"),
      `Trusted by 10k+ developers, 99.9% uptime, 24/7 support.\n` +
        `Not just a tool — it's a seamless game-changer.\n`,
    );

    const expected = ["t1", "t2", "t3", "t5", "t6", "t7", "t8", "t9", "t10", "t11", "t12", "t14", "t15", "t16", "t18", "t19", "t20", "t21"];
    const report = reportFor(project);
    for (const id of expected) {
      assert.ok(finding(report, id), `expected ai-tells rule ${id} to fire`);
    }
    // Multiline gradient hit maps back to the line where the match starts.
    assert.equal(finding(report, "t1").hits[0].line, 1);
  });
});

test("copy rules read prose files; code-only rules do not", () => {
  withTempProject((project) => {
    // console.log in a .md file is prose, not shipped code — must not fire.
    writeFileSync(join(project, "notes.md"), "Use console.log( sparingly. Uptime 99.9% guaranteed.\n");
    const report = reportFor(project);
    assert.equal(finding(report, "16"), undefined);
    assert.ok(finding(report, "t16"), "copy rule t16 should scan .md files");
  });
});

test("impulse-ok directives suppress hits, id-scoped and blanket", () => {
  withTempProject((project) => {
    writeFileSync(
      join(project, "app.css"),
      `.a { outline: none; } /* impulse-ok */\n` +
        `/* impulse-ok-next-line 7 */\n` +
        `.b { outline: none; }\n` +
        `/* impulse-ok-next-line t3 14 */\n` +
        `.c { outline: none; }\n`,
    );
    writeFileSync(
      join(project, "vendorish.css"),
      `/* impulse-ok-file */\n.x { backdrop-filter: blur(10px); outline: none; }\n`,
    );

    const report = reportFor(project);
    const outline = finding(report, "7");
    // Only .c survives: its directive names other rule ids (t3, 14), so
    // rule 7 on the next line is NOT suppressed there.
    assert.equal(outline?.hits.length, 1);
    assert.equal(outline.hits[0].line, 5);
    assert.equal(finding(report, "t10"), undefined, "impulse-ok-file should silence the whole file");
  });
});

test("impulse-ok-file with ids suppresses only those ids", () => {
  withTempProject((project) => {
    writeFileSync(
      join(project, "partial.css"),
      `/* impulse-ok-file 22 */\n.x { will-change: transform; outline: none; }\n`,
    );
    const report = reportFor(project);
    assert.equal(finding(report, "22"), undefined);
    assert.ok(finding(report, "7"), "rule 7 must still fire when impulse-ok-file names only 22");
  });
});

test("--only, --skip and --exclude narrow the scan", () => {
  withTempProject((project) => {
    writeFileSync(join(project, "a.css"), `.x { will-change: opacity; outline: none; }\n`);
    mkdirSync(join(project, "legacy"));
    writeFileSync(join(project, "legacy", "b.css"), `.y { outline: none; }\n`);

    const only = reportFor(project, "--only=22");
    assert.deepEqual(only.findings.map((f) => f.id), ["22"]);

    const skip = reportFor(project, "--skip=22");
    assert.equal(skip.findings.some((f) => f.id === "22"), false);
    assert.ok(skip.findings.some((f) => f.id === "7"));

    const excluded = reportFor(project, "--exclude=legacy");
    assert.equal(excluded.filesScanned, 1);
  });
});

test("--rules loads rules.ru.mjs and finds seeded Russian AI copy", () => {
  withTempProject((project) => {
    writeFileSync(
      join(project, "copy.md"),
      `Это не просто сканер — это ваш новый помощник.\n` +
        `Молниеносная скорость, бесшовная интеграция в считанные секунды.\n`,
    );

    const report = reportFor(project, `--rules=${ruRulesPath}`);
    for (const id of ["ru1", "ru3", "ru6"]) {
      assert.ok(finding(report, id), `expected Russian rule ${id} to fire`);
    }

    // Malformed rules module must fail loudly, not scan without it.
    const badRules = join(project, "bad-rules.mjs");
    writeFileSync(badRules, `export default {};\n`);
    const bad = scan(project, "--json", `--rules=${badRules}`);
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /must export an array/);
  });
});

test("clean project reports zero findings", () => {
  withTempProject((project) => {
    writeFileSync(
      join(project, "Button.vue"),
      `<template>\n  <button class="rounded-lg px-4 py-2 hover:bg-neutral-100 focus-visible:ring-2">Save</button>\n</template>\n`,
    );
    const report = reportFor(project);
    assert.equal(report.hits, 0);
    assert.deepEqual(report.findings, []);
  });
});

test("--gate exits nonzero on findings and zero when clean", () => {
  withTempProject((project) => {
    writeFileSync(join(project, "bad.css"), `.x { outline: none; }\n`);
    const gated = scan(project, "--gate", "--no-color");
    assert.equal(gated.status, 1);

    const gatedJson = scan(project, "--gate", "--json");
    assert.equal(gatedJson.status, 1);
    assert.doesNotThrow(() => JSON.parse(gatedJson.stdout));

    // Without --gate the same findings exit 0 (informational tool).
    const informational = scan(project, "--no-color");
    assert.equal(informational.status, 0, informational.stderr);
  });

  withTempProject((project) => {
    writeFileSync(join(project, "ok.css"), `.x { color: oklch(20% 0 0); }\n`);
    const clean = scan(project, "--gate", "--no-color");
    assert.equal(clean.status, 0, clean.stderr);
  });
});

test("escapes control characters when echoing hit content", () => {
  withTempProject((project) => {
    const control = "\u001b]52;c;not-a-clipboard\u0007";
    writeFileSync(join(project, "unsafe.css"), `.x { outline: none; ${control} }`);

    const result = scan(project, "--no-color");
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.includes(control), false);
    assert.ok(result.stdout.includes("\\x1b]52;c;not-a-clipboard\\x07"));

    const jsonResult = scan(project, "--json");
    assert.equal(jsonResult.status, 0, jsonResult.stderr);
    assert.doesNotThrow(() => JSON.parse(jsonResult.stdout));
  });
});
