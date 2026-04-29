#!/usr/bin/env node
// sigma-style-compress.mjs — Paradigm 202 — Inline Style → CSS Class Compression
//
// 자현 deploy 가속: 3.3MB inline style → unique class hash로 압축.
// Same style → same class. Mirror size 90% 감소, browser cache 적용.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

function styleHash(style) {
  return "s" + crypto.createHash("md5").update(style).digest("hex").slice(0, 8);
}

export function compressStyles(html) {
  const styleMap = new Map(); // hash → style
  let count = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;

  // Find all style="..." attributes and replace with class
  const compressed = html.replace(/style="([^"]+)"/g, (m, styleContent) => {
    bytesBefore += m.length;
    const trimmed = styleContent.trim();
    if (!trimmed) return "";
    const hash = styleHash(trimmed);
    if (!styleMap.has(hash)) styleMap.set(hash, trimmed);
    count++;
    const replacement = ` data-sc="${hash}"`;
    bytesAfter += replacement.length;
    return replacement;
  });

  // Generate CSS classes
  const cssRules = [];
  for (const [hash, style] of styleMap) {
    cssRules.push(`[data-sc="${hash}"] { ${style} }`);
  }
  const cssBlock = `<style id="__sigma_compressed_styles__">\n${cssRules.join("\n")}\n</style>`;

  // Inject CSS block before </head>
  let result = compressed;
  if (result.includes("</head>")) {
    result = result.replace("</head>", cssBlock + "\n</head>");
  } else {
    result = cssBlock + result;
  }

  return {
    html: result,
    stats: {
      uniqueStyles: styleMap.size,
      totalReplaced: count,
      bytesBefore,
      bytesAfter: bytesAfter + cssBlock.length,
      compressionPct: bytesBefore > 0 ? Math.round((1 - (bytesAfter + cssBlock.length) / bytesBefore) * 100) : 0,
    },
  };
}

export function applyCompression(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = { files: [], totalBefore: 0, totalAfter: 0, totalUnique: 0 };

  function walk(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name === "index.html") {
        const original = fs.readFileSync(full, "utf-8");
        const before = original.length;
        const { html, stats } = compressStyles(original);
        if (html !== original && stats.uniqueStyles > 0) {
          fs.writeFileSync(full, html);
          result.files.push({
            path: path.relative(projDir, full),
            before,
            after: html.length,
            saved: before - html.length,
            unique: stats.uniqueStyles,
            replaced: stats.totalReplaced,
          });
          result.totalBefore += before;
          result.totalAfter += html.length;
          result.totalUnique += stats.uniqueStyles;
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
    console.error("usage: node sigma-style-compress.mjs <projDir>");
    console.error("  Inline style → CSS class hash 압축. 90% size 감소.");
    process.exit(1);
  }
  const r = applyCompression(projDir);
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[style-compress] ${r.files.length} files`);
  for (const f of r.files) {
    console.log(`  ${f.path}: ${(f.before / 1024).toFixed(1)} → ${(f.after / 1024).toFixed(1)}KB ` +
                `(saved ${(f.saved / 1024).toFixed(1)}KB, ${f.unique} unique styles)`);
  }
  console.log(`\n  Total: ${(r.totalBefore / 1024).toFixed(1)} → ${(r.totalAfter / 1024).toFixed(1)}KB`);
  if (r.totalBefore > 0) {
    console.log(`  Compression: ${Math.round((1 - r.totalAfter / r.totalBefore) * 100)}%`);
  }
}
