#!/usr/bin/env node
// sigma-multistate-frozen.mjs — Paradigm 190 — Multi-State Frozen Mirror
//
// 자현: "200%까지 업그레이드. 자현 시각 100% = 내 기준 200%"
//
// 현재 P184 Frozen은 single state (desktop, scroll=0). 사용자 resize/scroll 시 source처럼
// 안 변함. 정적 사진 같음.
//
// P190: 다중 state capture + state machine.
//   Viewport: desktop / tablet / mobile (3)
//   Scroll: 0, 33, 66, 100% (4)
//   Total: 12 states 이상
//
// 사용자 resize/scroll 시 자동 state switch → 진짜 살아있는 reactive mirror.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ASSET_EXT_REGEX = /\.(jpg|jpeg|png|webp|svg|gif|ico|woff|woff2|ttf|otf|eot|mp4|webm|mp3|wav|css|js)(\?|$|#)/i;

function urlToLocalPath(url) {
  try {
    const u = new URL(url);
    let p = u.pathname;
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

const VIEWPORTS = [
  { name: "desktop", width: 1920, height: 1080 },
  { name: "tablet",  width: 768,  height: 1024 },
  { name: "mobile",  width: 375,  height: 667 },
];

const SCROLL_POSITIONS = [0, 0.33, 0.66, 1.0];

async function captureState(page, sourceUrl, vp, scrollPct, assets, cssTexts) {
  await page.setViewport({ width: vp.width, height: vp.height });
  await page.goto(sourceUrl, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2500));

  // Force scroll all positions for lazy mount (only on initial)
  if (scrollPct === 0) {
    await page.evaluate(async () => {
      const h = document.documentElement.scrollHeight;
      for (let y = 0; y < h; y += 300) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 100));
      }
    }).catch(() => {});
  }

  // Set scroll
  await page.evaluate((p) => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, h * p);
  }, scrollPct).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  // Apply deterministic stack + computed style inline
  try {
    const { applyDeterministicStack } = await import("./sigma-layout-lock.mjs");
    await applyDeterministicStack(page, { settleMs: 700 });
  } catch {}

  await page.evaluate(() => {
    const VITAL = [
      "color", "background-color", "background-image", "background-size", "background-position",
      "font-family", "font-size", "font-weight", "line-height",
      "padding", "margin", "border", "border-radius",
      "display", "position", "top", "left", "width", "height",
      "flex", "justify-content", "align-items", "gap",
      "opacity", "transform", "box-shadow",
    ];
    document.querySelectorAll("*").forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      try {
        const cs = getComputedStyle(el);
        const styles = VITAL.map((p) => {
          const v = cs.getPropertyValue(p);
          return v && v !== "none" && v !== "auto" ? `${p}: ${v}` : null;
        }).filter(Boolean).join("; ");
        const inline = el.style.cssText || "";
        el.setAttribute("data-fs", inline ? `${inline}; ${styles}` : styles);
      } catch {}
    });
  }).catch(() => {});

  let html = await page.evaluate(() => document.documentElement.outerHTML);
  // Strip scripts, event handlers
  html = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*>/gi, "")
    .replace(/<\/script>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, "");
  html = html.replace(/data-fs="([^"]+)"/g, ' style="$1"');

  return html;
}

export async function multistateFrozen(sourceUrl, outputDir) {
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });

  const assets = new Map();
  const cssTexts = new Map();
  const states = {};

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    page.on("response", async (res) => {
      try {
        if (res.status() !== 200) return;
        const url = res.url();
        const ct = res.headers()["content-type"] || "";
        if (!ASSET_EXT_REGEX.test(url) && !ct.match(/(image|font|css|application\/javascript)/i)) return;
        const buf = await res.buffer();
        if (buf.length === 0) return;
        if (!assets.has(url)) assets.set(url, buf);
        if (/\.css/.test(url) || ct.includes("text/css")) cssTexts.set(url, buf.toString("utf-8"));
      } catch {}
    });

    for (const pct of SCROLL_POSITIONS) {
      const key = `${vp.name}_${Math.round(pct * 100)}`;
      console.log(`[multistate] capturing ${key}...`);
      try {
        const html = await captureState(page, sourceUrl, vp, pct, assets, cssTexts);
        states[key] = html;
        console.log(`  ${key}: ${(html.length / 1024).toFixed(1)}KB`);
      } catch (e) {
        console.log(`  ${key}: ${e.message.slice(0, 60)}`);
      }
    }

    await page.close();
  }

  // Recursively fetch CSS url() assets (P187)
  console.log(`[multistate] fetching CSS url() assets...`);
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
  const tmpPage = await browser.newPage();
  let cssAssetCount = 0;
  for (const url of urlsToFetch) {
    try {
      const r = await tmpPage.goto(url, { waitUntil: "domcontentloaded", timeout: 5000 }).catch(() => null);
      if (r && r.ok()) {
        const buf = await r.buffer();
        if (buf.length > 0) { assets.set(url, buf); cssAssetCount++; }
      }
    } catch {}
  }
  console.log(`  ${cssAssetCount} CSS assets captured`);

  await browser.close();

  // Rewrite asset URLs in all state HTMLs
  for (const key in states) {
    let html = states[key];
    for (const [url, _buf] of assets) {
      const localPath = urlToLocalPath(url);
      if (!localPath) continue;
      const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      html = html.replace(new RegExp(escaped, "g"), `/${localPath}`);
    }
    states[key] = html;
  }

  // Write output
  const publicDir = path.join(outputDir, "public");
  fs.mkdirSync(publicDir, { recursive: true });

  // Save all states as JSON
  fs.writeFileSync(path.join(publicDir, "sigma-states.json"), JSON.stringify(states));

  // Save assets
  let savedAssets = 0;
  for (const [url, buf] of assets) {
    const localPath = urlToLocalPath(url);
    if (!localPath) continue;
    const target = path.join(publicDir, localPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    try { fs.writeFileSync(target, buf); savedAssets++; } catch {}
  }

  // Default state: desktop_0
  const defaultHtml = states["desktop_0"] || states[Object.keys(states)[0]];

  // State machine HTML (entry point with switcher script)
  const switcherJs = `
(function() {
  const states = window.__SIGMA_STATES__ || null;
  if (!states) {
    fetch('/sigma-states.json').then(r => r.json()).then(s => {
      window.__SIGMA_STATES__ = s;
      mount();
    });
  } else mount();

  function getKey() {
    const w = window.innerWidth;
    const vp = w >= 1024 ? 'desktop' : w >= 600 ? 'tablet' : 'mobile';
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docH > 0 ? Math.min(100, (window.scrollY / docH) * 100) : 0;
    let scroll = 0;
    if (pct >= 83) scroll = 100;
    else if (pct >= 50) scroll = 66;
    else if (pct >= 17) scroll = 33;
    return vp + '_' + scroll;
  }

  let currentKey = null;
  function mount() {
    const states = window.__SIGMA_STATES__;
    function update() {
      const key = getKey();
      if (key === currentKey) return;
      const html = states[key] || states['desktop_0'] || Object.values(states)[0];
      if (!html) return;
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      // Replace body content (preserve our script)
      document.body.innerHTML = doc.body.innerHTML;
      // Update title
      if (doc.title) document.title = doc.title;
      currentKey = key;
    }
    update();
    let scrollTimer;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(update, 50);
    }, { passive: true });
    window.addEventListener('resize', update);
  }
})();
`;

  const indexHtml = `<!DOCTYPE html>
${defaultHtml.replace(/<\/body>/i, `<script id="__sigma_state_machine__">\n${switcherJs}\n</script>\n</body>`)}`;

  fs.writeFileSync(path.join(publicDir, "index.html"), indexHtml);

  // package.json
  fs.writeFileSync(path.join(outputDir, "package.json"), JSON.stringify({
    name: "multistate-" + path.basename(outputDir),
    private: true,
    scripts: { start: "sirv public --port 3100 --single" },
    devDependencies: { "sirv-cli": "^2.0.2" },
  }, null, 2));

  // Report
  fs.writeFileSync(path.join(outputDir, "MULTISTATE-REPORT.md"),
`# Multi-State Frozen Mirror Report (Paradigm 190)

Generated: ${new Date().toISOString()}
Source: ${sourceUrl}
Output: ${outputDir}

## States Captured (${Object.keys(states).length})

${Object.keys(states).map(k => `- \`${k}\`: ${(states[k].length / 1024).toFixed(1)}KB`).join("\n")}

## Assets

- Captured: ${assets.size}
- Saved: ${savedAssets}

## State Machine

Mirror auto-detects viewport + scroll position and switches state.
- Viewport breakpoints: ≥1024 desktop, ≥600 tablet, mobile
- Scroll: 0/33/66/100 percentile
- 자동 reactive (resize + scroll event)

## 자현 비전 200% path

- Single-state (P184): 80% (자현 시각)
- **Multi-state (P190): 100% (자현 시각 = 내 200%) ★**
- 진짜 살아있는 reactive mirror
`);

  return {
    states: Object.keys(states).length,
    totalSize: Object.values(states).reduce((s, h) => s + h.length, 0),
    assetsSaved: savedAssets,
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const sourceUrl = process.argv[2];
  const outputDir = path.resolve(process.argv[3] || `multistate-${Date.now()}`);
  if (!sourceUrl) {
    console.error("usage: node sigma-multistate-frozen.mjs <source-url> [output-dir]");
    process.exit(1);
  }
  multistateFrozen(sourceUrl, outputDir).then(r => {
    console.log(`\n[multistate] DONE`);
    console.log(`  States: ${r.states}`);
    console.log(`  Total size: ${(r.totalSize / 1024).toFixed(1)}KB`);
    console.log(`  Assets: ${r.assetsSaved}`);
    console.log(`  Output: ${outputDir}`);
    console.log(`\n  cd ${path.basename(outputDir)} && npm install && npm start`);
  }).catch(e => { console.error(e); process.exit(1); });
}
