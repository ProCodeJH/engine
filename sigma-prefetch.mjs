#!/usr/bin/env node
// sigma-prefetch.mjs — Paradigm 285 — Predictive Prefetch
//
// Internal link hover/focus → background prefetch. Faster navigation.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PREFETCH_JS = `
/* sigma-predictive-prefetch — Paradigm 285 */
(function prefetch() {
  const prefetched = new Set();
  const origin = location.origin;

  function doPrefetch(href) {
    if (prefetched.has(href)) return;
    prefetched.add(href);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    link.as = 'document';
    document.head.appendChild(link);
  }

  function shouldPrefetch(a) {
    const href = a.href;
    if (!href.startsWith(origin)) return false;
    if (a.target === '_blank') return false;
    if (href === location.href) return false;
    if (href.match(/\\.(jpg|png|pdf|zip|mp4)/i)) return false;
    return true;
  }

  // Hover/focus prefetch (with debounce)
  let timer = null;
  function maybePrefetch(e) {
    const a = e.target.closest('a[href]');
    if (!a || !shouldPrefetch(a)) return;
    clearTimeout(timer);
    timer = setTimeout(() => doPrefetch(a.href), 100);
  }
  document.addEventListener('mouseover', maybePrefetch, { passive: true });
  document.addEventListener('focusin', maybePrefetch);

  // IntersectionObserver: prefetch when link is in viewport
  const ioObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const a = entry.target;
        if (shouldPrefetch(a)) doPrefetch(a.href);
      }
    });
  }, { rootMargin: '200px' });
  document.querySelectorAll('a[href]').forEach(a => ioObserver.observe(a));
})();
`;

export function applyPrefetch(projDir) {
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
        html = html.replace(/<script[^>]*id="__sigma_prefetch__"[\s\S]*?<\/script>\s*/gi, "");
        const inject = `<script id="__sigma_prefetch__" defer>\n${PREFETCH_JS}\n</script>`;
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
  const r = applyPrefetch(projDir);
  console.log(`[prefetch] HTML: ${r.files?.length || 0}`);
}
