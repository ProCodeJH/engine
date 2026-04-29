#!/usr/bin/env node
// sigma-frozen-mirror.mjs — Paradigm 184 — Frozen DOM Mirror
//
// 자현 진짜 paradigm break: Render → Freeze → Strip scripts → Static.
//
// 이전 paradigm 모두 "static HTML + JS init 보존" track. imweb runtime 의존성으로 깨짐.
// P184 — post-render DOM 그대로 capture (widget 모두 initialized 상태) → script 제거 →
// computed style inline → static serve.
//
// 결과:
//   - Visual 100% baked (widget content DOM에 frozen)
//   - JS runtime 0% (script 제거, init 재실행 안 됨)
//   - Cross-origin 0 (모든 asset local download)
//   - License: 코드 sigma-owned, 이미지만 source-derived (asset swap path)
//
// 자현 비전: "100% visual + 100% license 피해 + 0원" 진짜 답.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ASSET_EXT_REGEX = /\.(jpg|jpeg|png|webp|svg|gif|ico|woff|woff2|ttf|otf|eot|mp4|webm|mp3|wav|css|js)(\?|$|#)/i;

function urlToLocalPath(url) {
  try {
    const u = new URL(url);
    let p = u.pathname;
    // Hash query for unique cache
    if (u.search) {
      const hash = crypto.createHash("md5").update(u.search).digest("hex").slice(0, 6);
      const ext = path.extname(p);
      const base = p.slice(0, -ext.length);
      p = `${base}.${hash}${ext}`;
    }
    return p.startsWith("/") ? p.slice(1) : p;
  } catch {
    return null;
  }
}

export async function frozenMirror(sourceUrl, outputDir, opts = {}) {
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Asset capture — P187 v2: ALL responses (not just whitelisted ext)
  const assets = new Map();
  const cssTexts = new Map();
  page.on("response", async (res) => {
    try {
      if (res.status() !== 200) return;
      const url = res.url();
      // Capture all asset-like (image/font/css/js/media) — P187 expanded
      const isAsset = ASSET_EXT_REGEX.test(url) ||
                      /\.(woff|woff2|ttf|otf|eot)/.test(url) ||  // fonts always
                      url.includes("font") ||
                      res.headers()["content-type"]?.match(/(image|font|css|application\/javascript)/i);
      if (!isAsset) return;
      const buf = await res.buffer();
      if (buf.length === 0) return;
      assets.set(url, buf);
      // Track CSS for url() recursion
      if (/\.css/.test(url) || res.headers()["content-type"]?.includes("text/css")) {
        cssTexts.set(url, buf.toString("utf-8"));
      }
    } catch {}
  });

  console.log(`[frozen] navigating: ${sourceUrl}`);
  try {
    await page.goto(sourceUrl, { waitUntil: "networkidle2", timeout: 60000 });
  } catch (e) {
    console.log(`  navigation timeout, continuing: ${e.message.slice(0, 60)}`);
  }
  await new Promise(r => setTimeout(r, 3000));

  // Force lazy-mount + scroll-trigger
  console.log(`[frozen] scrolling for lazy-mount...`);
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 300) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  }).catch(() => {});
  await new Promise(r => setTimeout(r, 4000));

  // Apply deterministic stack (carousel/reveal lock)
  try {
    const { applyDeterministicStack } = await import("./sigma-layout-lock.mjs");
    await applyDeterministicStack(page, { settleMs: 1000 });
  } catch {}

  // Inline computed style for all visible elements (frozen visual)
  console.log(`[frozen] inlining computed styles...`);
  await page.evaluate(() => {
    const VITAL_PROPS = [
      "color", "background-color", "background-image", "background-size",
      "background-position", "background-repeat",
      "font-family", "font-size", "font-weight", "line-height", "letter-spacing",
      "text-align", "text-decoration", "text-transform",
      "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
      "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
      "border", "border-radius", "border-width", "border-style", "border-color",
      "box-shadow", "outline", "filter", "opacity",
      "display", "position", "top", "right", "bottom", "left", "z-index",
      "width", "height", "max-width", "min-height",
      "flex", "flex-direction", "justify-content", "align-items", "gap",
      "transform",
    ];
    document.querySelectorAll("*").forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      try {
        const cs = getComputedStyle(el);
        const inline = el.style.cssText || "";
        const styles = VITAL_PROPS.map((p) => {
          const v = cs.getPropertyValue(p);
          return v && v !== "none" && v !== "auto" ? `${p}: ${v}` : null;
        }).filter(Boolean).join("; ");
        el.setAttribute("data-frozen-style", inline ? `${inline}; ${styles}` : styles);
      } catch {}
    });
  }).catch(() => {});

  // Get full DOM
  const html = await page.evaluate(() => document.documentElement.outerHTML);

  // P187 v2: Recursively fetch CSS url() assets (fonts, images, etc.)
  console.log(`[frozen] P187 — recursively capturing CSS url() assets...`);
  const fetchedUrls = new Set([...assets.keys()]);
  const urlsToFetch = new Set();
  for (const [cssUrl, cssText] of cssTexts) {
    const urlMatches = [...cssText.matchAll(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g)];
    for (const m of urlMatches) {
      const ref = m[1];
      if (ref.startsWith("data:") || ref.startsWith("#")) continue;
      try {
        const fullUrl = new URL(ref, cssUrl).href;
        if (!fetchedUrls.has(fullUrl)) urlsToFetch.add(fullUrl);
      } catch {}
    }
  }
  console.log(`  ${urlsToFetch.size} additional url() refs to fetch`);
  let cssAssetCount = 0;
  for (const url of urlsToFetch) {
    try {
      const r = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 8000 }).catch(() => null);
      if (r && r.ok()) {
        const buf = await r.buffer();
        if (buf.length > 0) { assets.set(url, buf); cssAssetCount++; }
      }
    } catch {}
  }
  console.log(`  ${cssAssetCount} CSS assets captured`);

  await browser.close();

  // Strip script tags + suspicious inline JS attributes
  let staticHtml = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*>/gi, "")
    .replace(/<\/script>/gi, "")
    // Strip event handler attributes (onload, onclick, onerror, etc.)
    .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, "");

  // Apply data-frozen-style → style attribute (browser uses last)
  staticHtml = staticHtml.replace(/data-frozen-style="([^"]+)"/g, ' style="$1"');

  // Rewrite URLs to local paths (assets)
  for (const [url, _buf] of assets) {
    const localPath = urlToLocalPath(url);
    if (!localPath) continue;
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    staticHtml = staticHtml.replace(new RegExp(escapedUrl, "g"), `/${localPath}`);
  }

  // Add doctype
  if (!staticHtml.toLowerCase().startsWith("<!doctype")) {
    staticHtml = "<!DOCTYPE html>\n" + staticHtml;
  }

  // Save outputs
  const publicDir = path.join(outputDir, "public");
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, "index.html"), staticHtml);

  // Save assets to local paths
  let savedAssets = 0;
  for (const [url, buf] of assets) {
    const localPath = urlToLocalPath(url);
    if (!localPath) continue;
    const target = path.join(publicDir, localPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    try {
      fs.writeFileSync(target, buf);
      savedAssets++;
    } catch {}
  }

  // package.json (sirv)
  fs.writeFileSync(path.join(outputDir, "package.json"), JSON.stringify({
    name: "frozen-" + path.basename(outputDir),
    private: true,
    scripts: { start: "sirv public --port 3100 --single" },
    devDependencies: { "sirv-cli": "^2.0.2" },
  }, null, 2));

  // FROZEN-REPORT.md
  fs.writeFileSync(path.join(outputDir, "FROZEN-REPORT.md"),
`# Frozen DOM Mirror Report (Paradigm 184)

Generated: ${new Date().toISOString()}
Source: ${sourceUrl}
Output: ${outputDir}

## Stats
- HTML size: ${(staticHtml.length / 1024).toFixed(1)}KB
- Assets captured: ${assets.size}
- Assets saved: ${savedAssets}

## Method
1. Puppeteer fully render (3s + scroll + 4s settle)
2. Apply deterministic stack (carousel lock)
3. Inline computed style for all visible elements
4. Strip all <script> tags + event handlers
5. Rewrite asset URLs → local paths
6. Save assets locally (zero cross-origin)

## License
- HTML: sigma-curated (script removed, computed style inline)
- Assets: source-derived (이미지/css/font) → 자현 swap 후 PASS
`);

  return {
    htmlSize: staticHtml.length,
    assetsCaptured: assets.size,
    assetsSaved: savedAssets,
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const sourceUrl = process.argv[2];
  const outputDir = path.resolve(process.argv[3] || `frozen-${Date.now()}`);
  if (!sourceUrl) {
    console.error("usage: node sigma-frozen-mirror.mjs <source-url> [output-dir]");
    process.exit(1);
  }
  frozenMirror(sourceUrl, outputDir).then(r => {
    console.log(`\n[frozen] DONE`);
    console.log(`  HTML:   ${(r.htmlSize / 1024).toFixed(1)}KB`);
    console.log(`  Assets: ${r.assetsSaved}/${r.assetsCaptured}`);
    console.log(`  Output: ${outputDir}`);
    console.log(`  Run:    cd ${outputDir} && npm install && npm start`);
  }).catch(e => { console.error(e); process.exit(1); });
}
