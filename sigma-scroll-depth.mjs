#!/usr/bin/env node
// sigma-scroll-depth.mjs — Paradigm 282 — Scroll Depth Tracking
//
// 25/50/75/100% scroll milestone. P242 telemetry 통합.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SCROLL_DEPTH_JS = `
/* sigma-scroll-depth — Paradigm 282 */
(function scrollDepth() {
  const milestones = [25, 50, 75, 100];
  const reached = new Set();
  const KEY = '__sigma_telemetry__';

  function pct() {
    const scrollY = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    if (docH <= 0) return 100;
    return Math.round((scrollY / docH) * 100);
  }

  function track() {
    const p = pct();
    for (const m of milestones) {
      if (p >= m && !reached.has(m)) {
        reached.add(m);
        try {
          const data = JSON.parse(localStorage.getItem(KEY) || '{}');
          data.scrollDepth = data.scrollDepth || {};
          const path = location.pathname;
          if (!data.scrollDepth[path]) data.scrollDepth[path] = {};
          data.scrollDepth[path][m + '%'] = (data.scrollDepth[path][m + '%'] || 0) + 1;
          localStorage.setItem(KEY, JSON.stringify(data));
        } catch {}
      }
    }
  }

  let throttle = null;
  window.addEventListener('scroll', () => {
    if (throttle) return;
    throttle = setTimeout(() => { track(); throttle = null; }, 200);
  }, { passive: true });

  // Track time on page
  window.addEventListener('beforeunload', () => {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || '{}');
      data.timeOnPage = data.timeOnPage || {};
      const path = location.pathname;
      const time = Math.round((performance.now() / 1000));
      data.timeOnPage[path] = (data.timeOnPage[path] || 0) + time;
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {}
  });
})();
`;

export function applyScrollDepth(projDir) {
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
        html = html.replace(/<script[^>]*id="__sigma_scroll_depth__"[\s\S]*?<\/script>\s*/gi, "");
        const inject = `<script id="__sigma_scroll_depth__">\n${SCROLL_DEPTH_JS}\n</script>`;
        if (html.includes("</body>")) html = html.replace("</body>", inject + "\n</body>");
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
  const r = applyScrollDepth(projDir);
  console.log(`[scroll-depth] HTML: ${r.files?.length || 0}`);
}
