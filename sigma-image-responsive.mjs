#!/usr/bin/env node
// sigma-image-responsive.mjs — Paradigm 230 — Image Responsive Pipeline
//
// 모든 <img>에 width/height attributes (CLS 방지) + sizes hint + srcset stub.
// 외부 lib 0% (no sharp/imagemagick).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// PNG/JPG/WebP dimensions parser (from previous paradigms)
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

function parseWebpDims(buf) {
  if (buf.length < 30 || buf.toString("ascii", 0, 4) !== "RIFF") return null;
  // Simplified: VP8X chunk has dimensions
  if (buf.toString("ascii", 12, 16) === "VP8X") {
    const w = (buf.readUIntLE(24, 3) + 1);
    const h = (buf.readUIntLE(27, 3) + 1);
    return { w, h };
  }
  return null;
}

function getImageDims(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const buf = fs.readFileSync(filePath, { encoding: null });
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".png") return parsePngDims(buf);
    if (ext === ".jpg" || ext === ".jpeg") return parseJpgDims(buf);
    if (ext === ".webp") return parseWebpDims(buf);
  } catch {}
  return null;
}

export function applyResponsiveImages(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = { files: [], imgsUpdated: 0, withDims: 0 };

  function walk(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name === "index.html") {
        let html = fs.readFileSync(full, "utf-8");
        const original = html;
        let imgCount = 0;
        let withDimsCount = 0;

        html = html.replace(/<img\b([^>]*)>/gi, (match, attrs) => {
          imgCount++;

          // Already has width AND height?
          const hasWidth = /\swidth\s*=/.test(attrs);
          const hasHeight = /\sheight\s*=/.test(attrs);
          const hasSizes = /\ssizes\s*=/.test(attrs);

          // Extract src
          const srcMatch = attrs.match(/\ssrc\s*=\s*["']([^"']+)["']/);
          if (!srcMatch) return match;
          const src = srcMatch[1];
          if (src.startsWith("data:")) return match;

          // Try to get dimensions if missing
          let newAttrs = attrs;
          if (!hasWidth || !hasHeight) {
            const localPath = src.startsWith("/")
              ? path.join(publicDir, src.slice(1))
              : path.join(publicDir, src);
            const dims = getImageDims(localPath);
            if (dims) {
              if (!hasWidth) newAttrs += ` width="${dims.w}"`;
              if (!hasHeight) newAttrs += ` height="${dims.h}"`;
              withDimsCount++;
            }
          }

          // Add sizes hint if missing
          if (!hasSizes) {
            newAttrs += ` sizes="(max-width: 768px) 100vw, (max-width: 1280px) 80vw, 1280px"`;
          }

          return `<img${newAttrs}>`;
        });

        if (html !== original) {
          fs.writeFileSync(full, html);
          result.files.push(path.relative(projDir, full));
          result.imgsUpdated += imgCount;
          result.withDims += withDimsCount;
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
    console.error("usage: <projDir>");
    process.exit(1);
  }
  const r = applyResponsiveImages(projDir);
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[responsive] HTML files: ${r.files.length}`);
  console.log(`  imgs updated: ${r.imgsUpdated} (${r.withDims} with detected dims)`);
}
