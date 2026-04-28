#!/usr/bin/env node
// sigma-site-type.mjs — Paradigm 175 — Site Type Detection + Per-Type Paradigm
//
// 자현 16번째 ultrathink: cross-category universal 진짜 path.
// dusonnuri 81.8% (imweb) vs designkits 55.4% (SPA) gap = 카테고리별 paradigm 다름.
//
// P175 — Site type 자동 detect + per-type tuned config:
//   1. HTML signature patterns (meta generator, class names, framework markers)
//   2. Site type 분류: imweb / wordpress / webflow / wix / framer / shopify / vanilla
//   3. Per-type cleanroom config (어떤 paradigm 적용)
//   4. Per-type measurement weights (visual에서 무엇 우선)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── Site type detection patterns ─────────────────────────────
export const SITE_TYPE_PATTERNS = {
  imweb: [
    /<meta\s+name="generator"\s+content="Imweb/i,
    /(?:^|\/)_fcdn\//,
    /window\.IMWEB_VAR/i,
    /imweb_/i,
  ],
  wordpress: [
    /<meta\s+name="generator"\s+content="WordPress/i,
    /\/wp-content\//,
    /\/wp-includes\//,
    /<link[^>]+wp-content/i,
  ],
  webflow: [
    /data-wf-domain/i,
    /webflow\.css/i,
    /<meta[^>]+wf-/i,
    /\.w-[\w-]+\s*\{/, // Webflow class prefix
  ],
  wix: [
    /wixapps/i,
    /\.wixstatic\.com/i,
    /window\.wixBiSession/i,
    /data-mesh-id/i,
  ],
  framer: [
    /data-framer-component-type/i,
    /\.framer\.com/i,
    /__framer__/i,
  ],
  shopify: [
    /<meta\s+name="generator"\s+content="Shopify/i,
    /shopify\.com/i,
    /window\.Shopify/i,
    /\.shopify\.com/i,
  ],
  squarespace: [
    /<meta\s+name="generator"\s+content="Squarespace/i,
    /squarespace-cdn/i,
    /Static\.squarespace/i,
  ],
  cafe24: [
    /\.cafe24\.com/i,
    /cafe24skin/i,
  ],
  ghost: [
    /<meta\s+name="generator"\s+content="Ghost/i,
    /ghost-content/i,
  ],
};

// ─── Per-type configuration ───────────────────────────────────
export const SITE_TYPE_CONFIG = {
  imweb: {
    name: "Imweb (한국 호스팅)",
    sourcePathPatterns: ["_fcdn"],
    visualWeights: {
      pixel: 0.02, pHash: 0.03, ssim: 0.03, hist: 0.07,
      layout: 0.15, sectional: 0.25, roleIdentity: 0.45,
    },
    paradigms: ["P135", "P136", "P137", "P138", "P140", "P142", "P147",
                "P153", "P154", "P156", "P159", "P160", "P162", "P163",
                "P165", "P166"],
  },
  wordpress: {
    name: "WordPress",
    sourcePathPatterns: ["wp-content", "wp-includes"],
    visualWeights: {
      pixel: 0.05, pHash: 0.10, ssim: 0.05, hist: 0.10,
      layout: 0.20, sectional: 0.20, roleIdentity: 0.30,
    },
    paradigms: ["P135", "P136", "P138", "P140", "P142", "P159", "P162", "P163"],
    notes: "WP shortcodes 처리 추가 paradigm 필요 (미완)",
  },
  webflow: {
    name: "Webflow",
    sourcePathPatterns: ["assets-global.website-files.com"],
    visualWeights: {
      pixel: 0.03, pHash: 0.05, ssim: 0.05, hist: 0.10,
      layout: 0.20, sectional: 0.27, roleIdentity: 0.30,
    },
    paradigms: ["P135", "P136", "P140", "P149", "P159", "P162"],
    notes: "Webflow CMS dynamic content 보존 어려움",
  },
  wix: {
    name: "Wix",
    sourcePathPatterns: ["wixstatic.com"],
    visualWeights: {
      pixel: 0.05, pHash: 0.05, ssim: 0.05, hist: 0.10,
      layout: 0.20, sectional: 0.25, roleIdentity: 0.30,
    },
    paradigms: ["P135", "P136", "P140", "P159", "P162"],
    notes: "Wix wow-image 변환 + dynamic content",
  },
  framer: {
    name: "Framer",
    sourcePathPatterns: ["framerusercontent.com"],
    visualWeights: {
      pixel: 0.02, pHash: 0.03, ssim: 0.05, hist: 0.10,
      layout: 0.15, sectional: 0.25, roleIdentity: 0.40,
    },
    paradigms: ["P135", "P136", "P140", "P149", "P162"],
    notes: "Framer Motion API stub via P160",
  },
  vanilla: {
    name: "Vanilla / Custom",
    sourcePathPatterns: [],
    visualWeights: {
      pixel: 0.05, pHash: 0.05, ssim: 0.05, hist: 0.10,
      layout: 0.20, sectional: 0.25, roleIdentity: 0.30,
    },
    paradigms: ["P135", "P136", "P140", "P159", "P162"],
    notes: "Generic — case-by-case tuning",
  },
};

// ─── Detect site type from HTML ──────────────────────────────
export function detectSiteType(html, opts = {}) {
  const matches = {};
  let topType = "vanilla";
  let topScore = 0;

  for (const [type, patterns] of Object.entries(SITE_TYPE_PATTERNS)) {
    const score = patterns.reduce((s, p) => s + (p.test(html) ? 1 : 0), 0);
    if (score > 0) matches[type] = score;
    if (score > topScore) {
      topScore = score;
      topType = type;
    }
  }

  return {
    detected: topType,
    confidence: topScore,
    matches,
    config: SITE_TYPE_CONFIG[topType] || SITE_TYPE_CONFIG.vanilla,
  };
}

// ─── Detect from project's index.html ────────────────────────
export function detectProjectSiteType(projDir) {
  const indexPath = path.join(projDir, "public", "index.html");
  if (!fs.existsSync(indexPath)) return { error: "index.html not found" };

  const html = fs.readFileSync(indexPath, "utf-8");
  return detectSiteType(html);
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-site-type.mjs <projDir>");
    console.error("  Detect site type (imweb/WordPress/Webflow/Wix/Framer/etc.)");
    console.error("  Returns recommended cleanroom paradigms + measurement weights");
    process.exit(1);
  }
  const r = detectProjectSiteType(projDir);
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[site-type] detected: **${r.detected}**`);
  console.log(`  confidence:  ${r.confidence}/${SITE_TYPE_PATTERNS[r.detected]?.length || "?"} patterns matched`);
  console.log(`  all matches: ${Object.entries(r.matches).map(([t, n]) => `${t}=${n}`).join(", ") || "(none)"}`);
  console.log(`  config name: ${r.config.name}`);
  console.log(`  paradigms:   ${r.config.paradigms.join(" ")}`);
  console.log(`  visual weights: ${JSON.stringify(r.config.visualWeights)}`);
  if (r.config.notes) console.log(`  notes: ${r.config.notes}`);
}
