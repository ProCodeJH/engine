#!/usr/bin/env node
// sigma-bg-inline.mjs — Paradigm 304 — Background Image Base64 Inline
//
// 모든 background-image url() → data:image/...base64. CSS 외부 의존 0%.
// 작은 이미지만 (< 50KB) inline. 큰 이미지는 그대로.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIME_TYPES = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".woff": "font/woff", ".woff2": "font/woff2",
};

function fileToDataUri(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  if (buf.length > 50 * 1024) return null;  // skip > 50KB
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext];
  if (!mime) return null;
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export function applyBackgroundInline(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = { files: [], inlined: 0, skipped: 0 };
  function walk(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name === "index.html") {
        let html = fs.readFileSync(full, "utf-8");
        const original = html;
        let inlined = 0, skipped = 0;

        // background-image: url(...)  in inline style + data-fs
        html = html.replace(/url\(\s*['"]?(\/[^'")\s]+\.(png|jpg|jpeg|gif|webp|svg))['"]?\s*\)/gi, (match, urlPath) => {
          const localPath = path.join(publicDir, urlPath.slice(1));
          const data = fileToDataUri(localPath);
          if (data) {
            inlined++;
            return `url('${data}')`;
          }
          skipped++;
          return match;
        });

        if (html !== original) {
          fs.writeFileSync(full, html);
          result.files.push({ path: path.relative(projDir, full), inlined, skipped });
          result.inlined += inlined;
          result.skipped += skipped;
        }
      }
    }
  }
  walk(publicDir);

  // Also do it for all CSS files in public/
  function walkCss(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkCss(full, depth + 1);
      else if (entry.name.endsWith(".css")) {
        let css = fs.readFileSync(full, "utf-8");
        const original = css;
        css = css.replace(/url\(\s*['"]?([^'")\s]+\.(png|jpg|jpeg|gif|webp|svg))['"]?\s*\)/gi, (match, urlPath) => {
          // Resolve relative to current file's dir or public
          let localPath;
          if (urlPath.startsWith("/")) {
            localPath = path.join(publicDir, urlPath.slice(1));
          } else if (urlPath.startsWith("http")) {
            return match;  // external
          } else {
            localPath = path.resolve(path.dirname(full), urlPath);
          }
          const data = fileToDataUri(localPath);
          if (data) { result.inlined++; return `url('${data}')`; }
          result.skipped++;
          return match;
        });
        if (css !== original) fs.writeFileSync(full, css);
      }
    }
  }
  walkCss(publicDir);

  return result;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir) { console.error("usage: <projDir>"); process.exit(1); }
  const r = applyBackgroundInline(projDir);
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[bg-inline] inlined: ${r.inlined}, skipped: ${r.skipped}`);
}
