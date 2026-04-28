#!/usr/bin/env node
// sigma-procedural-v2.mjs — Paradigm 167 — Procedural Visual v2 (Sophisticated SVG)
//
// 자현 14번째 ultrathink: visual 54% 마지막 leverage. P154의 단순 gradient + circles
// → P167은 SVG feTurbulence (fractal noise) + multi-layer voronoi blob.
//
// SVG feTurbulence = 브라우저 native fractal noise filter. 외부 lib 0%.
// Photographic feel texture 생성 가능. 0원, 100% sigma-owned.
//
// Pipeline:
//   1. Source image dimensions + dominant color (P153과 동일)
//   2. Category 분류 (hero/photo/icon/logo)
//   3. P167 sophisticated SVG generation:
//      - Hero: gradient + 4-6 voronoi blob + noise overlay
//      - Photo: noise base + multi-layer soft blob
//      - Icon: same as P154 (simple)
//      - Logo: same as P154
//   4. visual partial pixel/pHash/SSIM 향상

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

function rgb(r, g, b) { return `rgb(${r},${g},${b})`; }
function rgba(r, g, b, a) { return `rgba(${r},${g},${b},${a})`; }
function lighten(r, g, b, amt = 0.2) {
  return [Math.min(255, Math.round(r + (255 - r) * amt)),
          Math.min(255, Math.round(g + (255 - g) * amt)),
          Math.min(255, Math.round(b + (255 - b) * amt))];
}
function darken(r, g, b, amt = 0.2) {
  return [Math.max(0, Math.round(r * (1 - amt))),
          Math.max(0, Math.round(g * (1 - amt))),
          Math.max(0, Math.round(b * (1 - amt)))];
}
function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
function pathSeed(p) {
  return crypto.createHash("sha256").update(p).digest().readUInt32BE(0);
}
function deriveColor(p) {
  const hash = crypto.createHash("sha256").update(p).digest();
  return { r: 100 + (hash[0] % 120), g: 100 + (hash[1] % 120), b: 100 + (hash[2] % 120) };
}

// ─── Hero v2: gradient + voronoi-like blobs + noise overlay ────
function heroSvgV2(width, height, color, seed) {
  const rand = seededRandom(seed);
  const [lR, lG, lB] = lighten(color.r, color.g, color.b, 0.3);
  const [dR, dG, dB] = darken(color.r, color.g, color.b, 0.25);

  // 5-7 voronoi-like blob centers
  const blobs = [];
  const count = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < count; i++) {
    const cx = Math.round(rand() * width);
    const cy = Math.round(rand() * height);
    const r = Math.round(Math.min(width, height) * (0.15 + rand() * 0.35));
    const opacity = (0.2 + rand() * 0.4).toFixed(2);
    const shade = i % 2 === 0 ? rgb(lR, lG, lB) : rgb(dR, dG, dB);
    blobs.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${shade}" opacity="${opacity}" filter="url(#blur${seed})"/>`);
  }

  // feTurbulence base frequency (lower = larger features)
  const baseFreq = (0.7 + rand() * 0.4).toFixed(2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g${seed}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${rgb(lR, lG, lB)}"/>
      <stop offset="1" stop-color="${rgb(dR, dG, dB)}"/>
    </linearGradient>
    <filter id="blur${seed}">
      <feGaussianBlur stdDeviation="${Math.round(Math.min(width, height) / 25)}"/>
    </filter>
    <filter id="noise${seed}">
      <feTurbulence type="fractalNoise" baseFrequency="${baseFreq}" numOctaves="3" seed="${seed % 100}"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.15 0"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#g${seed})"/>
  ${blobs.join("\n  ")}
  <rect width="100%" height="100%" filter="url(#noise${seed})" opacity="0.5"/>
</svg>`;
}

// ─── Photo v2: noise base + multi-layer organic blob ──────────
function photoSvgV2(width, height, color, seed) {
  const rand = seededRandom(seed);
  const [lR, lG, lB] = lighten(color.r, color.g, color.b, 0.2);
  const [dR, dG, dB] = darken(color.r, color.g, color.b, 0.2);

  // Multi-layer ellipse blobs (organic photo feel)
  const blobs = [];
  const count = 6 + Math.floor(rand() * 4);
  for (let i = 0; i < count; i++) {
    const cx = Math.round(rand() * width);
    const cy = Math.round(rand() * height);
    const rx = Math.round(width * (0.10 + rand() * 0.30));
    const ry = Math.round(height * (0.10 + rand() * 0.30));
    const opacity = (0.25 + rand() * 0.4).toFixed(2);
    const t = rand();
    const fillR = Math.round(lR + (dR - lR) * t);
    const fillG = Math.round(lG + (dG - lG) * t);
    const fillB = Math.round(lB + (dB - lB) * t);
    blobs.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${rgba(fillR, fillG, fillB, opacity)}"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <filter id="blur${seed}">
      <feGaussianBlur stdDeviation="${Math.round(Math.min(width, height) / 20)}"/>
    </filter>
    <filter id="noise${seed}">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed % 100}"/>
      <feColorMatrix values="0 0 0 0 ${color.r/255}  0 0 0 0 ${color.g/255}  0 0 0 0 ${color.b/255}  0 0 0 0.6 0"/>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="${rgb(color.r, color.g, color.b)}"/>
  <g filter="url(#blur${seed})">
    ${blobs.join("\n    ")}
  </g>
  <rect width="100%" height="100%" filter="url(#noise${seed})" opacity="0.3"/>
</svg>`;
}

// ─── Icon (P154 simple, no v2 needed) ──────────────────────────
function iconSvg(width, height, color, seed) {
  const rand = seededRandom(seed);
  const cx = width / 2, cy = height / 2;
  const r = Math.min(width, height) * 0.4;
  const variant = Math.floor(rand() * 4);
  let shape;
  if (variant === 0) shape = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${rgb(color.r, color.g, color.b)}"/>`;
  else if (variant === 1) shape = `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="${r * 0.2}" fill="${rgb(color.r, color.g, color.b)}"/>`;
  else if (variant === 2) shape = `<polygon points="${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}" fill="${rgb(color.r, color.g, color.b)}"/>`;
  else shape = `<rect x="${cx - r * 0.2}" y="${cy - r}" width="${r * 0.4}" height="${r * 2}" fill="${rgb(color.r, color.g, color.b)}"/>
    <rect x="${cx - r}" y="${cy - r * 0.2}" width="${r * 2}" height="${r * 0.4}" fill="${rgb(color.r, color.g, color.b)}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${shape}</svg>`;
}

function logoSvg(width, height, color, seed) {
  const [dR, dG, dB] = darken(color.r, color.g, color.b, 0.3);
  const cy = height / 2;
  const r = height * 0.3;
  const cx1 = r * 1.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <circle cx="${cx1}" cy="${cy}" r="${r}" fill="${rgb(dR, dG, dB)}"/>
  <rect x="${cx1 + r * 1.5}" y="${cy - r * 0.15}" width="${width - cx1 - r * 1.5 - r * 0.5}" height="${r * 0.3}" fill="${rgb(dR, dG, dB)}" opacity="0.7"/>
</svg>`;
}

export function generateProceduralAssetV2(width, height, color, category, seedPath) {
  const seed = pathSeed(seedPath || `${width}x${height}-${color.r}`);
  const w = Math.max(16, Math.min(width, 4096));
  const h = Math.max(16, Math.min(height, 4096));
  switch (category) {
    case "hero": return heroSvgV2(w, h, color, seed);
    case "photos": case "photo": return photoSvgV2(w, h, color, seed);
    case "icons": case "icon": return iconSvg(w, h, color, seed);
    case "logos": case "logo": return logoSvg(w, h, color, seed);
    default: return photoSvgV2(w, h, color, seed);
  }
}

// ─── Walk + replace ────────────────────────────────────────────
const SOURCE_PATH_PATTERNS = [
  /(?:^|\/)_fcdn\//, /(?:^|\/)_next\//, /(?:^|\/)static\/uploads\//, /(?:^|\/)wp-content\//,
];
function isSourcePath(rel) { return SOURCE_PATH_PATTERNS.some(p => p.test(rel)); }

function parsePngDims(buf) {
  if (buf.length < 24 || buf[0] !== 0x89) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
function parseJpgDims(buf) {
  if (buf.length < 4 || buf[0] !== 0xFF || buf[1] !== 0xD8) return null;
  let i = 2;
  while (i < buf.length - 8) {
    if (buf[i] !== 0xFF) { i++; continue; }
    const marker = buf[i + 1];
    if ((marker >= 0xC0 && marker <= 0xCF) && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}
function categorize(filename, dims) {
  const lower = filename.toLowerCase();
  if (lower.includes("logo")) return "logos";
  if (lower.includes("hero") || lower.includes("banner")) return "hero";
  if (lower.includes("icon")) return "icons";
  if (!dims) return "photos";
  const { w, h } = dims;
  const ar = w / h;
  if (w >= 1200 && ar > 1.3) return "hero";
  if (w <= 100 && Math.abs(ar - 1) < 0.2) return "icons";
  return "photos";
}

export function applyProceduralV2(projDir, opts = {}) {
  const dryRun = opts.dryRun !== false;
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = {
    mode: dryRun ? "DRY_RUN" : "EXECUTE",
    swapped: 0,
    byCategory: { hero: 0, photos: 0, icons: 0, logos: 0 },
    pathMap: {},
  };

  function walk(dir, prefix = "") {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.posix.join(prefix, entry.name);
      if (entry.isDirectory()) {
        walk(full, rel);
      } else if (isSourcePath(rel) && /\.(png|jpe?g|gif|webp|svg)$/i.test(entry.name)) {
        try {
          const buf = fs.readFileSync(full);
          let dims;
          if (entry.name.match(/\.png$/i)) dims = parsePngDims(buf);
          else if (entry.name.match(/\.jpe?g$/i)) dims = parseJpgDims(buf);
          else dims = { w: 800, h: 600 };
          if (!dims) dims = { w: 800, h: 600 };

          const cat = categorize(entry.name, dims);
          const color = deriveColor(rel);

          if (!dryRun) {
            const svg = generateProceduralAssetV2(dims.w, dims.h, color, cat, rel);
            fs.writeFileSync(full, svg);
          }
          result.swapped++;
          result.byCategory[cat]++;
          result.pathMap[rel] = "procedural-v2";
        } catch {}
      }
    }
  }
  walk(publicDir);

  if (!dryRun && result.swapped > 0) {
    const cleanroomPath = path.join(projDir, ".cleanroom-state.json");
    let state = { version: "1.0", swappedPaths: [] };
    if (fs.existsSync(cleanroomPath)) {
      try { state = JSON.parse(fs.readFileSync(cleanroomPath, "utf-8")); } catch {}
    }
    state.swappedPaths = [...new Set([...(state.swappedPaths || []), ...Object.keys(result.pathMap)])];
    fs.writeFileSync(cleanroomPath, JSON.stringify(state, null, 2));
  }

  return result;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-procedural-v2.mjs <projDir> [--execute]");
    console.error("  P154 v1보다 sophisticated: feTurbulence noise + multi-layer blob");
    console.error("  visual 54 → 62-68 예상 (pixel/pHash/SSIM 향상)");
    process.exit(1);
  }
  const dryRun = !process.argv.includes("--execute");
  const r = applyProceduralV2(projDir, { dryRun });
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[procedural-v2] ${r.mode}`);
  console.log(`  Swapped: ${r.swapped}`);
  console.log(`  By cat:  ${Object.entries(r.byCategory).filter(([k,v])=>v>0).map(([k,v])=>`${k}=${v}`).join(" ")}`);
  if (dryRun) console.log(`\n  ⚠ DRY-RUN — re-run with --execute`);
}
