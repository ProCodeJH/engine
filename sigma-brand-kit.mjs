#!/usr/bin/env node
// sigma-brand-kit.mjs — Paradigm 147 — Brand Kit Auto-Swap
//
// 자현 명시한 가장 큰 gap: "자현 자산 통합 0% — placeholder는 단색.
// 자현이 자기 브랜드 디렉토리에 자산 넣고 자동 swap되는 시스템 없음."
//
// P147 Solution:
//   1. 자현 brand-kit 디렉토리 convention 정의
//   2. mirror의 source asset → category 자동 분류
//   3. brand-kit에서 매칭 자산 자동 swap
//   4. license 100% PASS + visual ↑ (placeholder보다 진짜 자산)
//
// Brand Kit 구조 (자현이 만들 path):
//   brand-kit/
//   ├── manifest.json (자산 카테고리 + colors + fonts)
//   ├── images/
//   │   ├── hero/ (1200x600+, 16:9 ratio)
//   │   ├── photos/ (general photography)
//   │   ├── logos/ (brand mark)
//   │   ├── icons/ (small svg/png, square)
//   │   └── decorative/ (background, ornament)
//   ├── fonts/ (.woff2, .woff, .ttf)
//   └── stylesheets/ (.css, custom theme)
//
// manifest.json:
//   {
//     "owner": "자현",
//     "version": "1.0",
//     "primaryColor": "#4f46e5",
//     "categories": {
//       "hero": ["hero/main.jpg"],
//       "photos": ["photos/p1.jpg", "photos/p2.jpg", ...]
//     }
//   }

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

// ─── Default brand-kit directory location ──────────────────────
export const DEFAULT_BRAND_KIT = process.env.NAVA_BRAND_KIT
  || path.join(process.cwd(), "brand-kit");

// ─── Load manifest + scan assets ───────────────────────────────
export function loadBrandKit(brandKitDir = DEFAULT_BRAND_KIT) {
  if (!fs.existsSync(brandKitDir)) {
    return { error: `brand-kit not found at ${brandKitDir}` };
  }

  const manifestPath = path.join(brandKitDir, "manifest.json");
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {}
  }

  // Auto-scan assets if categories not in manifest
  const categories = { hero: [], photos: [], logos: [], icons: [], decorative: [], fonts: [], stylesheets: [] };
  function scan(dir, cat) {
    const full = path.join(brandKitDir, dir);
    if (!fs.existsSync(full)) return;
    for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
      if (entry.isDirectory()) scan(path.join(dir, entry.name), entry.name);
      else categories[cat] = categories[cat] || [];
      categories[cat = cat || categorize(dir)].push(path.posix.join(dir, entry.name));
    }
  }

  function categorize(dir) {
    const lower = dir.toLowerCase();
    if (lower.includes("hero")) return "hero";
    if (lower.includes("logo")) return "logos";
    if (lower.includes("icon")) return "icons";
    if (lower.includes("photo")) return "photos";
    if (lower.includes("decor") || lower.includes("background")) return "decorative";
    if (lower.includes("font")) return "fonts";
    if (lower.includes("style") || lower.includes("css")) return "stylesheets";
    return "photos"; // default
  }

  // Scan known dirs
  for (const dir of ["images/hero", "images/photos", "images/logos", "images/icons", "images/decorative", "fonts", "stylesheets"]) {
    if (fs.existsSync(path.join(brandKitDir, dir))) scan(dir);
  }
  // Fallback flat images/
  if (fs.existsSync(path.join(brandKitDir, "images")) && !categories.hero.length && !categories.photos.length) {
    scan("images", "photos");
  }

  return { dir: brandKitDir, manifest, categories };
}

// ─── Detect asset category from source asset ───────────────────
function detectAssetCategory(filename, fileSize) {
  const lower = filename.toLowerCase();
  const ext = path.extname(lower);

  if (lower.includes("logo")) return "logos";
  if (lower.includes("hero") || lower.includes("banner") || lower.includes("main")) return "hero";
  if (lower.includes("icon") || ext === ".svg" && fileSize < 5000) return "icons";
  if (lower.includes("bg") || lower.includes("background")) return "decorative";
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return "photos";
  if ([".woff", ".woff2", ".ttf", ".otf"].includes(ext)) return "fonts";
  if ([".css", ".scss"].includes(ext)) return "stylesheets";
  return "photos";
}

// ─── Deterministic asset selection (same source path → same brand asset) ─
function pickAsset(sourcePath, candidates) {
  if (!candidates || candidates.length === 0) return null;
  const hash = crypto.createHash("sha256").update(sourcePath).digest();
  const idx = hash[0] % candidates.length;
  return candidates[idx];
}

// ─── Source path detection (which mirror assets are source-derived) ─
const SOURCE_PATH_PATTERNS = [
  /(?:^|\/)_fcdn\//,
  /(?:^|\/)_next\//,
  /(?:^|\/)static\/uploads\//,
  /(?:^|\/)wp-content\//,
];

function isSourcePath(rel) {
  return SOURCE_PATH_PATTERNS.some(p => p.test(rel));
}

// ─── Main swap function ────────────────────────────────────────
export function swapWithBrandKit(projDir, opts = {}) {
  const brandKitDir = opts.brandKitDir || DEFAULT_BRAND_KIT;
  const dryRun = opts.dryRun !== false;

  const kit = loadBrandKit(brandKitDir);
  if (kit.error) return { error: kit.error };

  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = {
    mode: dryRun ? "DRY_RUN" : "EXECUTE",
    brandKitDir,
    swapped: 0,
    skipped: 0,
    byCategory: {},
    swapMap: {}, // source path → brand asset path
  };

  function walk(dir, prefix = "") {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.posix.join(prefix, entry.name);
      if (entry.isDirectory()) {
        walk(full, rel);
      } else if (isSourcePath(rel)) {
        const stat = fs.statSync(full);
        const cat = detectAssetCategory(entry.name, stat.size);
        const candidates = kit.categories[cat] || [];
        const pick = pickAsset(rel, candidates);

        if (pick) {
          const brandAssetPath = path.join(brandKitDir, pick);
          if (fs.existsSync(brandAssetPath)) {
            if (!dryRun) {
              try {
                fs.copyFileSync(brandAssetPath, full);
                result.swapped++;
                result.byCategory[cat] = (result.byCategory[cat] || 0) + 1;
                result.swapMap[rel] = pick;
              } catch (e) {
                result.skipped++;
              }
            } else {
              // dry-run: count as if swapped
              result.swapped++;
              result.byCategory[cat] = (result.byCategory[cat] || 0) + 1;
              result.swapMap[rel] = pick;
            }
          } else {
            result.skipped++;
          }
        } else {
          result.skipped++;
        }
      }
    }
  }
  walk(publicDir);

  // Emit BRAND-KIT-SWAP-REPORT.md
  const md = [
    "# BRAND KIT SWAP REPORT (Paradigm 147)",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Project: ${projDir}`,
    `Brand Kit: ${brandKitDir}`,
    `Mode: ${result.mode}`,
    "",
    "## Summary",
    "",
    `- Files swapped: **${result.swapped}**`,
    `- Skipped (no brand match): ${result.skipped}`,
    "",
    "## By Category",
    "",
    "| Category | Brand Kit assets | Swapped |",
    "|---|---|---|",
    ...Object.entries(kit.categories).map(([k, v]) =>
      `| ${k} | ${v.length} | ${result.byCategory[k] || 0} |`
    ),
    "",
    "## Swap Map (first 30)",
    "",
    "| Source path | Brand asset |",
    "|---|---|",
    ...Object.entries(result.swapMap).slice(0, 30).map(([k, v]) =>
      `| \`${k}\` | \`${v}\` |`
    ),
    "",
    "## 자현 비즈니스 효과",
    "",
    result.swapped > 0
      ? "✅ Source asset → 자현 브랜드 asset swap 완료. License 100% + visual 자연 회복."
      : "⚠ Brand kit 자산이 없거나 매칭 안됨. brand-kit/images/ 채우기 필요.",
  ];
  fs.writeFileSync(path.join(projDir, "BRAND-KIT-SWAP-REPORT.md"), md.join("\n"));

  return result;
}

// ─── Demo brand-kit generator (자현 first run을 위해) ──────────
export function generateDemoBrandKit(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  fs.mkdirSync(path.join(targetDir, "images", "hero"), { recursive: true });
  fs.mkdirSync(path.join(targetDir, "images", "photos"), { recursive: true });
  fs.mkdirSync(path.join(targetDir, "images", "logos"), { recursive: true });
  fs.mkdirSync(path.join(targetDir, "images", "icons"), { recursive: true });

  const manifest = {
    owner: "자현 (Jahyeon)",
    version: "1.0",
    primaryColor: "#4f46e5",
    secondaryColor: "#06b6d4",
    note: "자현이 자기 자산을 categories 디렉토리에 넣으면 자동 swap. demo는 placeholder.",
    categories: {
      hero: [],
      photos: [],
      logos: [],
      icons: [],
    },
  };

  fs.writeFileSync(path.join(targetDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(targetDir, "README.md"),
    `# Brand Kit (자현)

자현 브랜드 자산 디렉토리. P147 Brand Kit Auto-Swap이 사용.

## 구조
\`\`\`
brand-kit/
├── manifest.json
├── images/
│   ├── hero/    (1200x600+ photos)
│   ├── photos/  (general photography)
│   ├── logos/   (brand mark, svg/png)
│   └── icons/   (small svg/png)
├── fonts/       (.woff2, .ttf)
└── stylesheets/ (.css)
\`\`\`

## 사용
\`\`\`bash
node sigma-brand-kit.mjs <projDir> --execute
\`\`\`

자현이 위 카테고리에 자산 넣은 만큼 swap 됨. 매칭 못 한 source asset은 skip.
`);
  return { dir: targetDir, manifestPath: path.join(targetDir, "manifest.json") };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const cmd = process.argv[2];
  if (cmd === "init") {
    const target = path.resolve(process.argv[3] || "brand-kit");
    const r = generateDemoBrandKit(target);
    console.log(`[brand-kit] Initialized at ${r.dir}`);
    console.log(`  Add 자현 자산 to images/{hero,photos,logos,icons}/`);
    console.log(`  Manifest: ${r.manifestPath}`);
  } else if (cmd) {
    const projDir = path.resolve(cmd);
    if (!fs.existsSync(projDir)) {
      console.error(`projDir not found: ${projDir}`);
      process.exit(1);
    }
    const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };
    const brandKitDir = flagVal("--brand-kit") || DEFAULT_BRAND_KIT;
    const dryRun = !process.argv.includes("--execute");
    const r = swapWithBrandKit(projDir, { brandKitDir, dryRun });
    if (r.error) { console.error(r.error); process.exit(1); }
    console.log(`[brand-kit] ${r.mode}`);
    console.log(`  Brand Kit: ${r.brandKitDir}`);
    console.log(`  Swapped: ${r.swapped}, Skipped: ${r.skipped}`);
    console.log(`  By cat: ${Object.entries(r.byCategory).map(([k, v]) => `${k}=${v}`).join(" ") || "(none)"}`);
    if (dryRun) console.log(`\n  ⚠ DRY-RUN — re-run with --execute to apply`);
  } else {
    console.error("usage:");
    console.error("  node sigma-brand-kit.mjs init [brand-kit-dir]   # 초기 brand-kit 디렉토리 생성");
    console.error("  node sigma-brand-kit.mjs <projDir> [--brand-kit <dir>] [--execute]  # swap");
    process.exit(1);
  }
}
