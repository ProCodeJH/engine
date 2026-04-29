#!/usr/bin/env node
// sigma-critical-css.mjs — Paradigm 209 — Critical CSS + Resource Hints
//
// 자현 production-grade: Lighthouse 90+, FCP/LCP 빠름.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RESOURCE_HINTS_TEMPLATE = (origins) => {
  const hints = [];
  for (const origin of origins) {
    if (origin === "self") continue;
    hints.push(`<link rel="dns-prefetch" href="${origin}">`);
    hints.push(`<link rel="preconnect" href="${origin}" crossorigin>`);
  }
  return hints.join("\n");
};

function extractExternalOrigins(html) {
  const origins = new Set();
  const matches = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)];
  for (const m of matches) {
    try {
      const u = new URL(m[1]);
      if (u.origin && !u.origin.startsWith("data:")) origins.add(u.origin);
    } catch {}
  }
  return [...origins].slice(0, 8);  // limit to top 8
}

function extractCriticalAssets(html) {
  // First 2 images = LCP candidates → preload
  const imgUrls = [...html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi)]
    .slice(0, 2)
    .map(m => m[1])
    .filter(u => !u.startsWith("data:"));

  // First CSS file → preload
  const cssUrls = [...html.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)]
    .slice(0, 2)
    .map(m => m[1]);

  return { imgs: imgUrls, css: cssUrls };
}

export function applyCriticalOptimizations(html) {
  // Extract external origins for DNS prefetch / preconnect
  const origins = extractExternalOrigins(html);
  const critical = extractCriticalAssets(html);

  // Build hints block
  const hints = [];

  // Preconnect external (top 4)
  for (const origin of origins.slice(0, 4)) {
    hints.push(`<link rel="preconnect" href="${origin}" crossorigin>`);
    hints.push(`<link rel="dns-prefetch" href="${origin}">`);
  }

  // Preload critical assets (LCP)
  for (const img of critical.imgs.slice(0, 1)) {
    hints.push(`<link rel="preload" as="image" href="${img}" fetchpriority="high">`);
  }
  for (const css of critical.css.slice(0, 1)) {
    hints.push(`<link rel="preload" as="style" href="${css}">`);
  }

  // Inject hints at top of <head>
  const hintsBlock = `<!-- sigma-critical-hints (P209) -->\n${hints.join("\n")}\n`;
  let result = html;
  if (result.includes("<head>")) {
    result = result.replace("<head>", `<head>\n${hintsBlock}`);
  }

  return {
    html: result,
    hintsAdded: hints.length,
    originsCount: origins.length,
    criticalImgs: critical.imgs.length,
    criticalCss: critical.css.length,
  };
}

export function applyMirror(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = { files: [], totalHints: 0 };
  function walk(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name === "index.html") {
        const original = fs.readFileSync(full, "utf-8");
        if (original.includes("<!-- sigma-critical-hints")) continue;  // already
        const { html, hintsAdded } = applyCriticalOptimizations(original);
        if (html !== original) {
          fs.writeFileSync(full, html);
          result.files.push({ path: path.relative(projDir, full), hints: hintsAdded });
          result.totalHints += hintsAdded;
        }
      }
    }
  }
  walk(publicDir);
  return result;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-critical-css.mjs <projDir>");
    process.exit(1);
  }
  const r = applyMirror(projDir);
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[critical] HTML files: ${r.files.length}`);
  console.log(`  Total hints: ${r.totalHints} (preconnect/dns-prefetch/preload)`);
}
