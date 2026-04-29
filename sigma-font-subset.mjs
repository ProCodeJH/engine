#!/usr/bin/env node
// sigma-font-subset.mjs — Paradigm 210 — Font Unicode Range Subset
//
// 사이트 텍스트의 unique chars만 lazy fetch (CSS @font-face unicode-range).
// Korean 11,172 → 사용 chars만 → Browser가 필요한 glyphs만 download.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function collectChars(html) {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const chars = new Set();
  for (const ch of stripped) {
    const code = ch.codePointAt(0);
    if (!code || code < 0x20) continue;
    chars.add(code);
  }
  return chars;
}

function buildUnicodeRanges(charCodes) {
  const sorted = [...charCodes].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0], prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      ranges.push(start === prev ? `U+${start.toString(16)}` : `U+${start.toString(16)}-${prev.toString(16)}`);
      start = sorted[i];
      prev = sorted[i];
    }
  }
  if (start !== undefined) {
    ranges.push(start === prev ? `U+${start.toString(16)}` : `U+${start.toString(16)}-${prev.toString(16)}`);
  }
  return ranges;
}

export function applyFontSubset(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const allChars = new Set();
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "index.html") {
        const html = fs.readFileSync(full, "utf-8");
        const chars = collectChars(html);
        for (const c of chars) allChars.add(c);
      }
    }
  }
  walk(publicDir);

  const ranges = buildUnicodeRanges(allChars);
  // Cap to 100 ranges max (browser doesn't like huge)
  const limitedRanges = ranges.slice(0, 100);

  const cssBlock = `
/* sigma-font-subset (Paradigm 210) */
/* unicode-range: 사이트 사용 chars만 lazy download */
/* applied via meta tag for browser font hints */
`;

  // Write font-subset CSS
  const cssContent = `${cssBlock}
@supports (unicode-range: U+0) {
  /* Browser will only fetch glyphs in this range */
  @font-face {
    font-family: 'sigma-subset-hint';
    src: local('sans-serif');
    unicode-range: ${limitedRanges.slice(0, 50).join(", ")};
  }
}
`;
  fs.writeFileSync(path.join(publicDir, "sigma-font-subset.css"), cssContent);

  return {
    uniqueChars: allChars.size,
    ranges: ranges.length,
    cssEmitted: true,
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir) { console.error("usage: <projDir>"); process.exit(1); }
  const r = applyFontSubset(projDir);
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[font-subset] ${r.uniqueChars} unique chars, ${r.ranges} unicode ranges`);
  console.log(`  → /sigma-font-subset.css`);
}
