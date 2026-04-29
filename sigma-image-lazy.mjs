#!/usr/bin/env node
// sigma-image-lazy.mjs — Paradigm 208 — Image Lazy Load Pipeline
//
// Production-grade FCP. 모든 <img>에 loading="lazy" + decoding="async" + responsive sizes.
// 외부 lib 0%.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function applyLazyLoad(html) {
  let count = 0;

  // Add loading="lazy" + decoding="async" to all <img> tags (skip if already present)
  let result = html.replace(/<img\b([^>]*?)>/gi, (match, attrs) => {
    const hasLoading = /\sloading\s*=/.test(attrs);
    const hasDecoding = /\sdecoding\s*=/.test(attrs);
    if (hasLoading && hasDecoding) return match;
    let newAttrs = attrs;
    if (!hasLoading) newAttrs += ' loading="lazy"';
    if (!hasDecoding) newAttrs += ' decoding="async"';
    count++;
    return `<img${newAttrs}>`;
  });

  // Add fetchpriority="high" to first 2 img (LCP)
  let highPriorityCount = 0;
  result = result.replace(/<img\b([^>]*?)>/gi, (match, attrs) => {
    if (highPriorityCount >= 2) return match;
    if (/fetchpriority\s*=/.test(attrs)) return match;
    highPriorityCount++;
    // Replace lazy with eager for LCP candidates
    let updated = attrs.replace(/loading="lazy"/, 'loading="eager"');
    return `<img${updated} fetchpriority="high">`;
  });

  return { html: result, lazyAdded: count, highPriorityAdded: highPriorityCount };
}

export function applyMirrorLazyLoad(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = { files: [], totalLazy: 0, totalHighPriority: 0 };
  function walk(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name === "index.html") {
        const original = fs.readFileSync(full, "utf-8");
        const { html, lazyAdded, highPriorityAdded } = applyLazyLoad(original);
        if (html !== original) {
          fs.writeFileSync(full, html);
          result.files.push(path.relative(projDir, full));
          result.totalLazy += lazyAdded;
          result.totalHighPriority += highPriorityAdded;
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
    console.error("usage: node sigma-image-lazy.mjs <projDir>");
    process.exit(1);
  }
  const r = applyMirrorLazyLoad(projDir);
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[lazy] HTML files: ${r.files.length}`);
  console.log(`  loading="lazy" + decoding="async": ${r.totalLazy}`);
  console.log(`  fetchpriority="high" (LCP): ${r.totalHighPriority}`);
}
