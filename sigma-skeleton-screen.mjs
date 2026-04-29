#!/usr/bin/env node
// sigma-skeleton-screen.mjs — Paradigm 244 — Skeleton Screen Loading
//
// 페이지 로드 중 skeleton placeholder UX. Perceived performance 향상.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SKELETON_CSS = `
/* sigma-skeleton (Paradigm 244) */
@keyframes sigmaShimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.sigma-skeleton-loader {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: white; z-index: 9999; pointer-events: none;
  display: flex; flex-direction: column; padding: 24px; gap: 16px;
  animation: sigmaSkeletonFade 0.3s 0.5s forwards;
}
.sigma-skeleton-bar {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: sigmaShimmer 1.5s infinite;
  border-radius: 4px;
}
.sigma-skeleton-bar.tall { height: 200px; }
.sigma-skeleton-bar.medium { height: 40px; width: 60%; }
.sigma-skeleton-bar.short { height: 16px; width: 40%; }
@keyframes sigmaSkeletonFade {
  to { opacity: 0; visibility: hidden; }
}
`;

export const SKELETON_HTML = `
<div class="sigma-skeleton-loader" id="__sigma_skeleton__">
  <div class="sigma-skeleton-bar medium" style="margin-bottom: 12px;"></div>
  <div class="sigma-skeleton-bar tall"></div>
  <div class="sigma-skeleton-bar medium"></div>
  <div class="sigma-skeleton-bar short"></div>
  <div class="sigma-skeleton-bar short"></div>
</div>
`;

export const SKELETON_REMOVE_JS = `
/* sigma-skeleton-remove (Paradigm 244) */
window.addEventListener('load', () => {
  setTimeout(() => {
    const sk = document.getElementById('__sigma_skeleton__');
    if (sk) sk.remove();
  }, 800);
});
`;

export function applySkeleton(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = { files: [] };
  function walk(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name === "index.html") {
        let html = fs.readFileSync(full, "utf-8");
        const original = html;
        html = html.replace(/<style[^>]*id="__sigma_skeleton_css__"[\s\S]*?<\/style>\s*/gi, "");
        html = html.replace(/<div[^>]*id="__sigma_skeleton__"[\s\S]*?<\/div>\s*/gi, "");
        html = html.replace(/<script[^>]*id="__sigma_skeleton_remove__"[\s\S]*?<\/script>\s*/gi, "");

        const cssInject = `<style id="__sigma_skeleton_css__">\n${SKELETON_CSS}\n</style>`;
        if (html.includes("</head>")) html = html.replace("</head>", cssInject + "\n</head>");
        if (html.includes("<body")) {
          html = html.replace(/<body([^>]*)>/i, `<body$1>\n${SKELETON_HTML}`);
        }
        const removeJs = `<script id="__sigma_skeleton_remove__">\n${SKELETON_REMOVE_JS}\n</script>`;
        if (html.includes("</body>")) html = html.replace("</body>", removeJs + "\n</body>");

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
  const r = applySkeleton(projDir);
  console.log(`[skeleton] HTML files: ${r.files?.length || 0}`);
}
