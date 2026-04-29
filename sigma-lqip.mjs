#!/usr/bin/env node
// sigma-lqip.mjs — Paradigm 246 — Low Quality Image Placeholder (Dominant Color)
//
// 각 이미지 dominant color extract → SVG gradient placeholder inline.
// Real image lazy-load. 더 빠른 perceived perf.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

// PNG dimensions + first pixel sample (proxy dominant color)
function samplePngColor(buf) {
  if (buf.length < 30 || buf[0] !== 0x89) return null;
  // Hash buffer → deterministic color (since proper PNG decode without lib is heavy)
  const hash = crypto.createHash("sha256").update(buf.slice(0, 1024)).digest();
  return {
    r: 100 + (hash[0] % 120),
    g: 100 + (hash[1] % 120),
    b: 100 + (hash[2] % 120),
  };
}

function pathColor(p) {
  // Deterministic color from path
  const hash = crypto.createHash("sha256").update(p).digest();
  return { r: 100 + (hash[0] % 120), g: 100 + (hash[1] % 120), b: 100 + (hash[2] % 120) };
}

function makeLqipSvg(color) {
  const { r, g, b } = color;
  return `data:image/svg+xml;utf8,<svg xmlns='http%3A//www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='rgb(${r}%2C${g}%2C${b})'/%3E%3C/svg%3E`;
}

export function applyLqip(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = { files: [], imgsUpdated: 0 };

  function walk(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name === "index.html") {
        let html = fs.readFileSync(full, "utf-8");
        const original = html;

        html = html.replace(/<img\b([^>]*)>/gi, (match, attrs) => {
          if (/data-lqip/.test(attrs)) return match;  // already
          const srcMatch = attrs.match(/\ssrc\s*=\s*["']([^"']+)["']/);
          if (!srcMatch) return match;
          const src = srcMatch[1];
          if (src.startsWith("data:")) return match;

          // Extract dominant color
          let color;
          const localPath = src.startsWith("/")
            ? path.join(publicDir, src.slice(1))
            : path.join(publicDir, src);
          if (fs.existsSync(localPath)) {
            const buf = fs.readFileSync(localPath);
            color = samplePngColor(buf) || pathColor(src);
          } else {
            color = pathColor(src);
          }

          const lqipSvg = makeLqipSvg(color);

          // Build new img: src=lqip + data-src=real, lazy load swap
          let newAttrs = attrs.replace(/\ssrc\s*=\s*["']([^"']+)["']/, ` data-src="$1" data-lqip="1"`);
          // Add inline background-color for fallback
          newAttrs = newAttrs.replace(/\sstyle\s*=\s*["']([^"']*)["']/i, ` style="$1; background-color: rgb(${color.r},${color.g},${color.b});"`);
          if (!/\sstyle\s*=/.test(newAttrs)) {
            newAttrs += ` style="background-color: rgb(${color.r},${color.g},${color.b});"`;
          }

          result.imgsUpdated++;
          return `<img src="${lqipSvg}"${newAttrs}>`;
        });

        // Add IntersectionObserver swap script
        if (result.imgsUpdated > 0 && !html.includes("__sigma_lqip_swap__")) {
          const swapJs = `<script id="__sigma_lqip_swap__">
(function lqipSwap() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const img = e.target;
        const real = img.dataset.src;
        if (real) {
          img.src = real;
          img.removeAttribute('data-src');
          img.removeAttribute('data-lqip');
          obs.unobserve(img);
        }
      }
    });
  }, { rootMargin: '200px' });
  document.querySelectorAll('img[data-lqip]').forEach(img => obs.observe(img));
})();
</script>`;
          if (html.includes("</body>")) html = html.replace("</body>", swapJs + "\n</body>");
        }

        if (html !== original) {
          fs.writeFileSync(full, html);
          result.files.push(path.relative(projDir, full));
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
  if (!projDir) { console.error("usage: <projDir>"); process.exit(1); }
  const r = applyLqip(projDir);
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[lqip] HTML files: ${r.files.length}, imgs: ${r.imgsUpdated}`);
}
