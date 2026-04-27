#!/usr/bin/env node
// nava-omega.mjs — Universal Site Mirror Engine (시각 99%+)
//
// 자현 ultrathink "복제화해서 편집해서 팔려고" 진짜 비즈니스 도구.
// Sigma(클린룸 deploy 인증)와 별개 — Omega는 *자현 작업 모드*.
//
// 핵심 통찰: 브라우저는 결정적 렌더링 엔진.
//   동일 HTML + CSS + JS + 에셋 + viewport = 동일 pixel.
// 즉 원본 그대로 미러하면 시각 100%.
//
// 자현 메모리 clone-engine-omega.md 명세 (a8fdab05 세션, teamevople 99.36%):
//
//   Ω.0 RECON        플랫폼 감지 (framer/webflow/nextjs/imweb/generic)
//   Ω.1 DOM CAPTURE  fetch(url)로 pre-hydration HTML 확보
//   Ω.2 MODULE GRAPH ES module import AST/regex 재귀 추적
//   Ω.3 ASSET MIRROR 모든 external URL -> public/_fcdn/에 다운로드
//   Ω.4 URL REWRITE  HTML + JS + CSS 내부 URL rewrite (양방향)
//   Ω.5 SW FALLBACK  Service Worker로 런타임 dynamic fetch 인터셉트
//   Ω.6 STATIC EMIT  index.html + sw.js + package.json (sirv-cli 서빙)
//   Ω.7 VERIFY       screenshot 비교 + pixelmatch
//
// 사용법:
//   node nava-omega.mjs <url> [--output dir] [--viewport WxH] [--skip-verify]
//   cd <outputDir> && npm start   # sirv-cli :3100
//
// 자현 비즈니스 워크플로우:
//   1. nava-omega.mjs <ref-site>          → 시각 1:1 클론 (자현 검증)
//   2. 자현 편집 (콘텐츠 swap, 클라이언트 자산)
//   3. nava-sigma.mjs ... --strict-clean  → 클라이언트 deploy 클린 인증

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const ARGS = process.argv.slice(2);
const URL_ARG = ARGS.find(a => /^https?:\/\//.test(a));
if (!URL_ARG) {
  console.error("usage: node nava-omega.mjs <url> [--output dir] [--viewport WxH] [--skip-verify]");
  process.exit(1);
}

const flagVal = (name) => {
  const i = ARGS.indexOf(name);
  return i >= 0 && i + 1 < ARGS.length ? ARGS[i + 1] : null;
};
const hasFlag = (name) => ARGS.includes(name);

const slug = new URL(URL_ARG).hostname.replace(/\./g, "-");
const OUTPUT = flagVal("--output") || `omega-${slug}`;
const VIEWPORT = (() => {
  const v = flagVal("--viewport");
  if (!v) return { width: 1920, height: 1080 };
  const [w, h] = v.split("x").map(Number);
  return { width: w || 1920, height: h || 1080 };
})();
const SKIP_VERIFY = hasFlag("--skip-verify");
const VERBOSE = hasFlag("--verbose");

const projDir = path.resolve(OUTPUT);
fs.mkdirSync(projDir, { recursive: true });
const fcdnDir = path.join(projDir, "public", "_fcdn");
fs.mkdirSync(fcdnDir, { recursive: true });

const T0 = Date.now();
const el = () => ((Date.now() - T0) / 1000).toFixed(1) + "s";

console.log(`
NAVA Omega — Universal Site Mirror
  URL:      ${URL_ARG}
  Output:   ${projDir}
  Viewport: ${VIEWPORT.width}x${VIEWPORT.height}
`);

// ─── HTML entity decode (자현 메모리 v1→v2 핵심 버그) ─────────────────
function decodeHtmlEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}

// ─── URL hashing for _fcdn/ filenames ────────────────────────────────
function urlToFilename(u) {
  try {
    const parsed = new URL(u);
    const ext = (parsed.pathname.match(/\.[a-z0-9]{2,5}$/i) || [""])[0];
    const hash = crypto.createHash("sha1").update(u).digest("hex").slice(0, 12);
    return hash + ext;
  } catch {
    return crypto.createHash("sha1").update(String(u)).digest("hex").slice(0, 12);
  }
}

// ─── Ω.0 RECON ──────────────────────────────────────────────────────
console.log(`[Ω.0] RECON ${el()}`);
const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-features=site-per-process"],
});
const page = await browser.newPage();
await page.setViewport(VIEWPORT);
const cdp = await page.target().createCDPSession();

const capturedRequests = [];
await cdp.send("Network.enable");
cdp.on("Network.responseReceived", (evt) => {
  capturedRequests.push({
    url: evt.response.url,
    mimeType: evt.response.mimeType,
    status: evt.response.status,
  });
});

// ─── Ω.1 DOM CAPTURE — fetch first, puppeteer second ─────────────────
console.log(`[Ω.1] DOM CAPTURE ${el()}`);

let rawHtml = "";
try {
  const resp = await fetch(URL_ARG, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 NavaOmega/1.0",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    },
  });
  rawHtml = await resp.text();
  console.log(`  fetch raw HTML: ${rawHtml.length} bytes`);
} catch (e) {
  console.error(`  fetch failed: ${e.message}`);
  await browser.close();
  process.exit(1);
}

// Puppeteer load for asset graph + post-hydration HTML
try {
  await page.goto(URL_ARG, { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); }
    window.scrollTo(0, 0);
  });
  await new Promise(r => setTimeout(r, 1500));
} catch (e) {
  console.warn(`  goto warning: ${e.message.slice(0, 80)}`);
}

const hydratedHtml = await page.content();
console.log(`  hydrated HTML: ${hydratedHtml.length} bytes`);

// ─── Ω.2 MODULE GRAPH — collect all asset URLs ───────────────────────
console.log(`[Ω.2] MODULE GRAPH ${el()}`);

const origin = new URL(URL_ARG).origin;
const assetUrls = new Set();

// From CDP captured network requests
for (const req of capturedRequests) {
  if (req.status >= 200 && req.status < 400) assetUrls.add(req.url);
}

// From hydrated HTML — extract URLs in src/href/url()
const urlRegexes = [
  /(?:src|href|poster|data-src)\s*=\s*["']([^"']+)["']/gi,
  /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
  /"(https?:\/\/[^"\s]+\.(?:js|mjs|css|png|jpg|jpeg|webp|svg|woff2?|ttf|otf|json|gif|mp4|webm))"/gi,
];
for (const re of urlRegexes) {
  for (const m of hydratedHtml.matchAll(re)) {
    const u = decodeHtmlEntities(m[1]);
    if (!u || u.startsWith("data:") || u.startsWith("javascript:") || u.startsWith("#")) continue;
    try {
      const abs = new URL(u, URL_ARG).toString();
      assetUrls.add(abs);
    } catch {}
  }
}

console.log(`  asset URLs discovered: ${assetUrls.size} (${capturedRequests.length} CDP + HTML scan)`);

// ─── Ω.3 ASSET MIRROR — download all to public/_fcdn/ ───────────────
console.log(`[Ω.3] ASSET MIRROR ${el()}`);

const urlMap = new Map();  // absUrl -> /_fcdn/<hash>.<ext>
let mirrored = 0;
let totalBytes = 0;
let failed = 0;

const downloadAsset = async (absUrl) => {
  try {
    const fname = urlToFilename(absUrl);
    const dest = path.join(fcdnDir, fname);
    const localPath = `/_fcdn/${fname}`;
    if (fs.existsSync(dest)) {
      urlMap.set(absUrl, localPath);
      mirrored++;
      totalBytes += fs.statSync(dest).size;
      return;
    }
    const resp = await fetch(absUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 NavaOmega/1.0",
        "Referer": URL_ARG,
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) { failed++; return; }
    const buf = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(dest, buf);
    urlMap.set(absUrl, localPath);
    mirrored++;
    totalBytes += buf.length;
  } catch {
    failed++;
  }
};

// Concurrent download (8 at a time)
const allUrls = [...assetUrls];
const CONCURRENCY = 8;
for (let i = 0; i < allUrls.length; i += CONCURRENCY) {
  const batch = allUrls.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(downloadAsset));
  if (VERBOSE && i % 40 === 0) {
    console.log(`    progress: ${mirrored}/${allUrls.length} (${(totalBytes / 1024 / 1024).toFixed(1)}MB)`);
  }
}
console.log(`  mirrored: ${mirrored}/${allUrls.size} assets, ${(totalBytes / 1024 / 1024).toFixed(1)}MB (failed ${failed})`);

// ─── Ω.4 URL REWRITE — HTML + downloaded JS/CSS ──────────────────────
console.log(`[Ω.4] URL REWRITE ${el()}`);

function rewriteContent(content) {
  // Sort URLs by length desc — longer URLs replaced first to avoid partial matches
  const sortedEntries = [...urlMap.entries()].sort((a, b) => b[0].length - a[0].length);
  let out = content;
  let rewrites = 0;
  for (const [absUrl, localPath] of sortedEntries) {
    // Try both encoded and decoded forms (자현 메모리 v1→v2 양방향 핵심)
    const escaped = absUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const encodedAmp = absUrl.replace(/&/g, "&amp;");
    const escapedAmp = encodedAmp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const re1 = new RegExp(escaped, "g");
    const re2 = new RegExp(escapedAmp, "g");
    const c1 = (out.match(re1) || []).length;
    const c2 = (out.match(re2) || []).length;
    if (c1 > 0) out = out.replace(re1, localPath);
    if (c2 > 0) out = out.replace(re2, localPath);
    rewrites += c1 + c2;
  }
  return { content: out, rewrites };
}

const { content: rewrittenHtml, rewrites: htmlRewrites } = rewriteContent(hydratedHtml);
console.log(`  HTML rewrites: ${htmlRewrites}`);

// Also rewrite mirrored JS/CSS files (for nested url() / import() refs)
let jsRewrites = 0, cssRewrites = 0;
for (const [absUrl, localPath] of urlMap) {
  const dest = path.join(projDir, "public", localPath);
  if (!fs.existsSync(dest)) continue;
  const ext = path.extname(localPath).toLowerCase();
  if (![".js", ".mjs", ".css"].includes(ext)) continue;
  try {
    const orig = fs.readFileSync(dest, "utf-8");
    const { content: rewritten, rewrites } = rewriteContent(orig);
    if (rewrites > 0) {
      fs.writeFileSync(dest, rewritten);
      if (ext === ".css") cssRewrites += rewrites;
      else jsRewrites += rewrites;
    }
  } catch {}
}
console.log(`  JS rewrites: ${jsRewrites}, CSS rewrites: ${cssRewrites}`);

// ─── Ω.5 SW FALLBACK — runtime fetch interceptor ─────────────────────
console.log(`[Ω.5] SW FALLBACK ${el()}`);

// Service Worker that intercepts dynamic fetches and tries _fcdn/<hash>
const swCode = `// nava-omega Service Worker — runtime asset fallback
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const ORIGIN = ${JSON.stringify(origin)};
const FCDN_PREFIX = "/_fcdn/";

async function sha1Hex(s) {
  const enc = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-1", enc);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
}

self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  // Same-origin fetches: serve directly
  if (url.startsWith(self.location.origin)) return;
  // External fetches: try mirrored copy
  event.respondWith((async () => {
    try {
      const ext = (new URL(url).pathname.match(/\\.[a-z0-9]{2,5}$/i) || [""])[0];
      const hash = await sha1Hex(url);
      const local = self.location.origin + FCDN_PREFIX + hash + ext;
      const r = await fetch(local);
      if (r.ok) return r;
    } catch {}
    return fetch(event.request);
  })());
});
`;
fs.writeFileSync(path.join(projDir, "public", "sw.js"), swCode);

// ─── Ω.6 STATIC EMIT — index.html + package.json ────────────────────
console.log(`[Ω.6] STATIC EMIT ${el()}`);

// Inject SW registration into HTML
const swRegistration = `
<script>
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
</script>
</head>`;
let finalHtml = rewrittenHtml.replace(/<\/head>/i, swRegistration);
if (!finalHtml.includes("<base ")) {
  // Add base href to ensure relative paths work
  finalHtml = finalHtml.replace(/<head>/i, `<head>\n<base href="/">`);
}

const publicDir = path.join(projDir, "public");
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, "index.html"), finalHtml);

// package.json — sirv-cli serves static
fs.writeFileSync(path.join(projDir, "package.json"), JSON.stringify({
  name: `omega-${slug}`,
  version: "0.1.0",
  private: true,
  scripts: {
    start: "sirv public --port 3100 --single",
    "start:host": "sirv public --port 3100 --host --single",
  },
  devDependencies: {
    "sirv-cli": "^2.0.2",
  },
}, null, 2));

// README
fs.writeFileSync(path.join(projDir, "README.md"), `# Omega Mirror — ${slug}

원본: ${URL_ARG}
미러된 자산: ${mirrored} 개 (${(totalBytes / 1024 / 1024).toFixed(1)}MB)
HTML rewrites: ${htmlRewrites}
JS/CSS rewrites: ${jsRewrites + cssRewrites}

## 실행
\`\`\`bash
npm install
npm start
# → http://localhost:3100
\`\`\`

## 자현 비즈니스 워크플로우
1. 이 미러로 시각 검증 (원본 1:1)
2. 클라이언트 콘텐츠 swap (수동 편집)
3. \`nava-sigma.mjs ... --strict-clean\` 으로 클린 인증 + deploy
`);

console.log(`  emitted: index.html (${finalHtml.length} bytes), sw.js, package.json, README.md`);

await browser.close();

// ─── Ω.7 VERIFY (optional) ──────────────────────────────────────────
let verifyResult = null;
if (!SKIP_VERIFY) {
  console.log(`[Ω.7] VERIFY ${el()} — start sirv → screenshot → pixelmatch`);
  // Auto-launch sirv via npx and compare
  const { spawn, spawnSync } = await import("node:child_process");
  // Install sirv-cli silently if missing
  if (!fs.existsSync(path.join(projDir, "node_modules", "sirv-cli"))) {
    spawnSync("npm", ["install", "--silent", "--no-audit", "--no-fund"], {
      cwd: projDir, shell: true, stdio: "inherit",
    });
  }
  const port = 3100;
  const sirv = spawn("npx", ["sirv", "public", "--port", String(port), "--single"], {
    cwd: projDir, shell: true, detached: false,
  });
  let sirvReady = false;
  sirv.stdout?.on("data", (d) => { if (/localhost|ready/i.test(d.toString())) sirvReady = true; });
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const res = await fetch(`http://localhost:${port}/`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) { sirvReady = true; break; }
    } catch {}
  }
  if (sirvReady) {
    const verifyBrowser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const vp = await verifyBrowser.newPage();
    await vp.setViewport(VIEWPORT);
    try {
      await vp.goto(URL_ARG, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 1500));
      const srcShot = await vp.screenshot({ fullPage: false });
      fs.mkdirSync(path.join(projDir, ".verify"), { recursive: true });
      fs.writeFileSync(path.join(projDir, ".verify", "source.png"), srcShot);

      await vp.goto(`http://localhost:${port}/`, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 1500));
      const cloneShot = await vp.screenshot({ fullPage: false });
      fs.writeFileSync(path.join(projDir, ".verify", "clone.png"), cloneShot);

      const { default: pixelmatch } = await import("pixelmatch");
      const { PNG } = await import("pngjs");
      const a = PNG.sync.read(srcShot);
      const b = PNG.sync.read(cloneShot);
      if (a.width === b.width && a.height === b.height) {
        const diff = new PNG({ width: a.width, height: a.height });
        const mis = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1, alpha: 0.3 });
        fs.writeFileSync(path.join(projDir, ".verify", "diff.png"), PNG.sync.write(diff));
        const matchPct = ((1 - mis / (a.width * a.height)) * 100).toFixed(2);
        verifyResult = { matchPct, mismatched: mis, total: a.width * a.height };
        console.log(`  pixelmatch: ${matchPct}% (${mis.toLocaleString()}/${(a.width*a.height).toLocaleString()} px differ)`);
      }
    } catch (e) { console.log(`  verify failed: ${e.message.slice(0, 80)}`); }
    await verifyBrowser.close();
  }
  try { sirv.kill(); } catch {}
}

// ─── Final report ────────────────────────────────────────────────────
const report = `# Omega Mirror Report

Generated: ${new Date().toISOString()}
Source: ${URL_ARG}
Output: ${projDir}
Duration: ${el()}

## Stats
- Asset URLs discovered: ${assetUrls.size}
- Mirrored: ${mirrored} (${(totalBytes / 1024 / 1024).toFixed(2)} MB)
- Failed: ${failed}
- HTML rewrites: ${htmlRewrites}
- JS rewrites: ${jsRewrites}
- CSS rewrites: ${cssRewrites}

${verifyResult ? `## Pixelmatch
- Match: **${verifyResult.matchPct}%** (${verifyResult.mismatched.toLocaleString()}/${verifyResult.total.toLocaleString()} px differ)
- Artifacts: \`.verify/source.png\`, \`.verify/clone.png\`, \`.verify/diff.png\`
` : "## Verify\n- skipped (--skip-verify or sirv didn't start)"}

## 다음 단계
\`\`\`bash
cd ${path.basename(projDir)}
npm install
npm start
# → http://localhost:3100
\`\`\`

자현 워크플로우:
1. 시각 1:1 검증 (이 미러)
2. 클라이언트 콘텐츠 수동 swap
3. \`nava-sigma.mjs --strict-clean\` 으로 클린 인증 + production deploy
`;
fs.writeFileSync(path.join(projDir, "OMEGA-REPORT.md"), report);

console.log(`
═══════════════════════════════════════════════
 Omega complete ${el()}
═══════════════════════════════════════════════
  Mirrored:  ${mirrored} assets (${(totalBytes / 1024 / 1024).toFixed(1)}MB)
  Rewrites:  ${htmlRewrites + jsRewrites + cssRewrites} URLs
  ${verifyResult ? `Pixelmatch: ${verifyResult.matchPct}%` : "Verify:    skipped"}

  cd ${path.basename(projDir)} && npm install && npm start
  → http://localhost:3100
`);
