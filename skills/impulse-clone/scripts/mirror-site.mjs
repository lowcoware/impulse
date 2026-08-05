#!/usr/bin/env node
// From nexu-io/open-design web-clone (Apache-2.0), re-expressed for the impulse suite.
// mirror-site.mjs — mirror the full deployed asset set of a STATIC-BUILD site (Astro / Vite SSG / Hugo ...)
// for a byte-faithful 1:1 clone.
// Principle: these sites' "real source" is not on GitHub, but the deployed static
//   assets (HTML + bundles + CSS + runtime-fetched .sog/.buf/.wasm/.riv/fonts/images)
//   ARE the truth. Drive a real browser through a full scroll, record every real
//   request, then mirror same-origin assets by path.
// Usage:
//   node scripts/mirror-site.mjs --url <URL> --out <dir> [--scroll-step 700] [--settle 2500] [--max-ms 90000]
// Output:
//   <dir>/site/...                mirrored same-origin assets (paths preserved; directory URLs saved as index.html)
//   <dir>/mirror-manifest.json    every request (same-origin + third-party) + per-item status
//   <dir>/own-asset-urls.txt      same-origin asset path list
//   <dir>/third-party.json        third-party hosts + webfont CSS (typekit/google) that needs self-hosting
// Discipline: mirror only assets that were ACTUALLY requested; never invent paths.
//   Third-party CDNs (fonts/wasm/video) are not rewritten automatically — handle
//   them by hand per third-party.json. Follow-up manual steps: self-host
//   domain-locked fonts (typically a Typekit @import) -> rewrite CSS @import to
//   local -> strip trackers -> serve with site/ as the web root.
//   Full recipe: references/static-mirror.md.

import { loadPlaywright, launchChromium } from "./lib/playwright-loader.mjs";
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const o = { url: "", out: "", scrollStep: 700, settle: 2500, maxMs: 90000, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") o.help = true;
    else if (a === "--url") o.url = argv[++i] || "";
    else if (a === "--out") o.out = argv[++i] || "";
    else if (a === "--scroll-step") o.scrollStep = parseInt(argv[++i] || "700", 10);
    else if (a === "--settle") o.settle = parseInt(argv[++i] || "2500", 10);
    else if (a === "--max-ms") o.maxMs = parseInt(argv[++i] || "90000", 10);
  }
  return o;
}

function usage() {
  console.log(`mirror-site.mjs — 静态构建站全量资产镜像(1:1 忠实复刻)

  node scripts/mirror-site.mjs --url <URL> --out <dir> [--scroll-step 700] [--settle 2500] [--max-ms 90000]

适用: Astro / Vite SSG / Hugo / 任何把客户端运行时输出成可下载静态资产的站(含 WebGL/Canvas 重前端)。
不适用: 真·服务端渲染/数据驱动 SPA(需 network-capture.mjs 做 API 替身)。
配方与后续改写步骤(自托管字体/删追踪/服务) → references/static-mirror.md`);
}

// 同源资产 URL → 本地相对路径(去 query；目录结尾存 index.html)
function urlToLocalPath(u, origin) {
  let p = u.slice(origin.length);
  const q = p.indexOf("?");
  if (q >= 0) p = p.slice(0, q);
  if (p === "" || p.endsWith("/")) p += "index.html";
  return p.replace(/^\/+/, "");
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.url || !args.out) {
  usage();
  process.exit(args.help ? 0 : 1);
}

const origin = new URL(args.url).origin;
const siteDir = path.join(path.resolve(args.out), "site");
fs.mkdirSync(siteDir, { recursive: true });

const responses = new Map(); // url -> {status, type, ct}
const pw = loadPlaywright();
const browser = await launchChromium(pw.chromium);
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on("response", (resp) => {
  try {
    const h = resp.headers();
    responses.set(resp.url(), { status: resp.status(), type: resp.request().resourceType(), ct: h["content-type"] || "" });
  } catch {}
});

console.log(`▸ 加载 + 全程滚动捕获: ${args.url}`);
await page.goto(args.url, { waitUntil: "networkidle", timeout: args.maxMs }).catch((e) => console.warn("  goto:", e.message));
const total = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y <= total; y += args.scrollStep) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(180);
}
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(args.settle);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(1200);

const all = [...responses.entries()].map(([url, m]) => ({ url, ...m }));
const ownUrls = all.filter((r) => r.url.startsWith(origin + "/") || r.url === origin || r.url === origin + "/");

console.log(`▸ 捕获请求 ${all.length} 个；同源 ${ownUrls.length} 个，开始下载…`);
let ok = 0, fail = 0;
const failed = [];
for (const r of ownUrls) {
  const rel = urlToLocalPath(r.url, origin);
  const dest = path.join(siteDir, rel);
  try {
    const resp = await ctx.request.get(r.url); // 复用浏览器网络栈(cookie/TUN/代理一致)
    if (!resp.ok()) { fail++; failed.push(`HTTP${resp.status()} ${rel}`); continue; }
    const buf = await resp.body();
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    ok++;
  } catch (e) {
    fail++; failed.push(`${e.message} ${rel}`);
  }
}

// 第三方 + webfont 提示
const thirdHosts = [...new Set(all.filter((r) => !r.url.startsWith(origin)).map((r) => { try { return new URL(r.url).host; } catch { return r.url; } }))];
const webfontCss = all.map((r) => r.url).filter((u) => /use\.typekit\.net\/[a-z0-9]+\.css|fonts\.googleapis\.com\/css/i.test(u));
const outRoot = path.resolve(args.out);
fs.writeFileSync(path.join(outRoot, "mirror-manifest.json"), JSON.stringify(all, null, 2));
fs.writeFileSync(path.join(outRoot, "own-asset-urls.txt"), ownUrls.map((r) => urlToLocalPath(r.url, origin)).sort().join("\n") + "\n");
fs.writeFileSync(path.join(outRoot, "third-party.json"), JSON.stringify({ hosts: thirdHosts, webfont_css_to_selfhost: webfontCss }, null, 2));

console.log(`Mirror done: ${ok} ok / ${fail} failed -> ${siteDir}`);
if (failed.length) console.log("  WARN failed:\n   " + failed.slice(0, 20).join("\n   "));
console.log(`▸ 第三方 host: ${thirdHosts.join(", ") || "(无)"}`);
if (webfontCss.length) console.log(`▸ 需自托管的 webfont CSS(锁域名,见 static-mirror.md): \n   ${webfontCss.join("\n   ")}`);
console.log(`▸ 下一步: 自托管字体 + 改写 CSS @import + 删追踪 → cd ${siteDir} && python3 -m http.server 8124`);
await browser.close();
