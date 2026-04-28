#!/usr/bin/env node
// sigma-wikimedia-crawler.mjs — Paradigm 156 — Public Domain / CC0 Asset Crawler
//
// 자현 ultrathink 7번째 결정적: "돈 들면안됌" 안에서 진짜 사진 자산 source.
// Wikimedia Commons API = 무료, key 없음, anonymous OK, PD/CC0 라이센스.
//
// 진짜 path:
//   - 단색 placeholder (game) → Procedural SVG (P154, 50%) → 진짜 사진 (P156, 75%+)
//   - 모두 0원
//   - License 100% PASS (PD/CC0)
//   - Visual 진짜 photographic
//
// Pipeline:
//   1. brand-kit 카테고리별 keyword (hero/photos/icons/logos)
//   2. Wikimedia Commons search (action=query&list=search)
//   3. Each result → imageinfo (URL + size + license metadata)
//   4. License 필터: 정확히 CC0/PDM/Public domain만
//   5. Download (https.get, no external lib)
//   6. brand-kit/images/{category}/ 저장

import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

// ─── Throttle: respect Wikimedia rate limits (anonymous max ~10/s) ─
let lastCall = 0;
async function throttle(ms = 1200) {
  const now = Date.now();
  const wait = ms - (now - lastCall);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();
}

// ─── Fetch JSON (no external lib) ──────────────────────────────
function fetchJson(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "User-Agent": "NAVA-Sigma-Engine/1.0 (https://github.com/ProCodeJH/engine; sigma-bot)",
        "Accept": "application/json",
      },
      timeout: opts.timeout || 15000,
    }, res => {
      let chunks = [];
      res.on("data", d => chunks.push(d));
      res.on("end", () => {
        try {
          const body = Buffer.concat(chunks).toString("utf-8");
          resolve(JSON.parse(body));
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

// ─── Download binary (image) ───────────────────────────────────
function downloadFile(url, targetPath, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { "User-Agent": "NAVA-Sigma-Engine/1.0 (sigma-bot)" },
      timeout: opts.timeout || 30000,
    }, res => {
      // Follow redirect
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        if (loc) return downloadFile(loc, targetPath, opts).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));

      const chunks = [];
      res.on("data", d => chunks.push(d));
      res.on("end", () => {
        try {
          fs.writeFileSync(targetPath, Buffer.concat(chunks));
          resolve({ size: chunks.reduce((s, c) => s + c.length, 0) });
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

// ─── Search Wikimedia Commons ──────────────────────────────────
export async function searchCommons(keyword, opts = {}) {
  await throttle();
  const limit = Math.min(opts.limit || 10, 50);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(keyword + " filetype:bitmap")}&srnamespace=6&format=json&srlimit=${limit}`;

  try {
    const data = await fetchJson(url);
    return (data.query?.search || []).map(s => ({
      title: s.title,
      pageid: s.pageid,
      snippet: s.snippet?.replace(/<[^>]+>/g, ""),
    }));
  } catch (e) {
    return [];
  }
}

// ─── Get image info (url + license + dimensions) ──────────────
export async function getImageInfo(title) {
  await throttle();
  const url = `https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata|size|mime&format=json&titles=${encodeURIComponent(title)}`;

  try {
    const data = await fetchJson(url);
    const pages = data.query?.pages || {};
    for (const id in pages) {
      const info = pages[id].imageinfo?.[0];
      if (!info) continue;

      const license = info.extmetadata?.LicenseShortName?.value || "";
      const usageTerms = info.extmetadata?.UsageTerms?.value || "";
      const author = info.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, "") || "Unknown";

      // Strict filter: only PD/CC0/PDM
      const isOk = /^CC0|Public domain|PDM|^PD/i.test(license)
                || /Public domain/i.test(usageTerms);

      if (!isOk) return null;

      return {
        title,
        url: info.url,
        width: info.width,
        height: info.height,
        mime: info.mime,
        license,
        usageTerms,
        author,
      };
    }
  } catch (e) {}
  return null;
}

// ─── Match by category (English + Korean keywords) ───────────
const CATEGORY_KEYWORDS = {
  hero: ["landscape", "panorama photography", "city skyline", "Seoul Korea", "Korean countryside", "abstract pattern"],
  photos: ["nature photography", "people portrait", "interior design", "Korean nature", "minimalist photo", "elderly people"],
  logos: ["abstract logo", "geometric shape", "monogram"],
  icons: ["icon", "symbol", "pictogram", "interface icon"],
  decorative: ["pattern texture", "Korean traditional pattern", "ornament", "geometric texture"],
};

// ─── Fill brand-kit with PD/CC0 images ────────────────────────
export async function fillBrandKitFromCommons(brandKitDir, opts = {}) {
  fs.mkdirSync(brandKitDir, { recursive: true });
  const perCategory = opts.perCategory || 5;
  const categories = opts.categories || Object.keys(CATEGORY_KEYWORDS);

  const result = {
    downloaded: 0,
    failed: 0,
    byCategory: {},
    license: "PD/CC0 (Wikimedia Commons)",
  };

  for (const cat of categories) {
    fs.mkdirSync(path.join(brandKitDir, "images", cat), { recursive: true });
    result.byCategory[cat] = 0;

    const keywords = CATEGORY_KEYWORDS[cat] || ["abstract"];
    let found = 0;

    for (const kw of keywords) {
      if (found >= perCategory) break;

      console.log(`[wikimedia] searching "${kw}" for ${cat}...`);
      const results = await searchCommons(kw, { limit: 10 }).catch(() => []);

      for (const r of results) {
        if (found >= perCategory) break;
        const info = await getImageInfo(r.title).catch(() => null);
        if (!info) continue;

        // Skip too small or too large
        if (info.width < 200 || info.height < 200) continue;
        if (info.width * info.height > 10000000) continue; // > 10MP

        const ext = path.extname(info.url) || ".jpg";
        const name = `${cat}-${crypto.createHash("md5").update(info.url).digest("hex").slice(0, 8)}${ext}`;
        const target = path.join(brandKitDir, "images", cat, name);

        try {
          await downloadFile(info.url, target);
          console.log(`  ✅ ${info.title.slice(0, 40)} (${info.width}x${info.height}) → ${name}`);
          result.downloaded++;
          result.byCategory[cat]++;
          found++;
        } catch (e) {
          console.log(`  ❌ ${info.title.slice(0, 40)}: ${e.message.slice(0, 40)}`);
          result.failed++;
        }
      }
    }
  }

  // Update manifest
  const manifestPath = path.join(brandKitDir, "manifest.json");
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    try { manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")); } catch {}
  }
  manifest.owner = manifest.owner || "자현 (Jahyeon)";
  manifest.version = "1.1";
  manifest.assetSource = "Wikimedia Commons (PD/CC0)";
  manifest.lastUpdated = new Date().toISOString();
  manifest.categories = manifest.categories || {};

  // Re-scan brand-kit to update categories list
  for (const cat of Object.keys(CATEGORY_KEYWORDS)) {
    const dir = path.join(brandKitDir, "images", cat);
    if (fs.existsSync(dir)) {
      manifest.categories[cat] = fs.readdirSync(dir)
        .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
        .map(f => `images/${cat}/${f}`);
    }
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return result;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const cmd = process.argv[2];
  if (cmd === "search") {
    const kw = process.argv[3];
    if (!kw) { console.error("usage: search <keyword>"); process.exit(1); }
    searchCommons(kw, { limit: 5 }).then(r => {
      console.log(`[wikimedia] ${r.length} results for "${kw}"`);
      for (const item of r) console.log(`  - ${item.title}`);
    });
  } else if (cmd === "fill") {
    const brandKit = path.resolve(process.argv[3] || "brand-kit");
    const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };
    const perCat = parseInt(flagVal("--per") || "3", 10);
    fillBrandKitFromCommons(brandKit, { perCategory: perCat }).then(r => {
      console.log(`\n[wikimedia] Downloaded ${r.downloaded} files (${r.failed} failed)`);
      console.log(`  By cat: ${Object.entries(r.byCategory).map(([k, v]) => `${k}=${v}`).join(" ")}`);
      console.log(`  License: ${r.license}`);
      console.log(`  → ${brandKit}/`);
    }).catch(e => { console.error(e); process.exit(1); });
  } else {
    console.error("usage:");
    console.error("  node sigma-wikimedia-crawler.mjs search <keyword>           # API 테스트");
    console.error("  node sigma-wikimedia-crawler.mjs fill <brand-kit-dir> [--per 3]  # brand-kit 자동 채움");
    console.error("\n  License: PD/CC0/Public Domain only (자동 필터)");
    console.error("  Cost: 0원 (Wikimedia API 무료, key 없음)");
    process.exit(1);
  }
}
