#!/usr/bin/env node
// sigma-pseudo-element.mjs — Paradigm 302 — Pseudo-Element Capture (::before/::after)
//
// Frozen DOM이 ::before/::after pseudo 안 잡음 → design 디테일 miss.
// 각 element의 pseudo computed style 추출 → unique class + inline CSS.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PSEUDO_CAPTURE_JS = `
(function pseudoCapture() {
  const VITAL = [
    'content', 'position', 'top', 'right', 'bottom', 'left',
    'width', 'height', 'background', 'background-color', 'background-image',
    'border', 'border-radius', 'box-shadow', 'opacity', 'transform',
    'color', 'font-family', 'font-size', 'font-weight',
    'padding', 'margin', 'display', 'z-index', 'overflow',
  ];
  const seen = new Map();
  let counter = 0;

  function captureFor(el, pseudo) {
    try {
      const cs = getComputedStyle(el, pseudo);
      if (cs.content === 'none' || cs.content === 'normal') {
        // Even if no content, may have visual ::before
        if (cs.background === 'rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box' &&
            !cs.transform.match(/[^matrix\\(].*[^\\)$]/) && !cs.boxShadow.includes('rgb')) {
          return null;
        }
      }
      const props = VITAL.map(p => {
        const v = cs.getPropertyValue(p);
        if (!v || v === 'none' || v === 'auto' || v === 'normal') return null;
        return p + ': ' + v;
      }).filter(Boolean);
      return props.length > 0 ? props.join('; ') : null;
    } catch { return null; }
  }

  document.querySelectorAll('*').forEach(el => {
    if (!(el instanceof HTMLElement)) return;
    const before = captureFor(el, '::before');
    const after = captureFor(el, '::after');
    if (!before && !after) return;

    const id = 'sg-pe-' + (++counter);
    el.setAttribute('data-sg-pe', id);
    if (before) seen.set(id + '-before', { id, side: 'before', style: before });
    if (after) seen.set(id + '-after', { id, side: 'after', style: after });
  });

  return Array.from(seen.values());
})();
`;

export async function capturePseudoStyles(sourceUrl) {
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  await page.goto(sourceUrl, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));
  // Force scroll for lazy-mount
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); }
    window.scrollTo(0, 0);
  }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  const captures = await page.evaluate(PSEUDO_CAPTURE_JS).catch(() => []);
  await browser.close();
  return captures;
}

export function applyPseudoStyles(projDir, captures) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const cssRules = [];
  for (const cap of captures) {
    cssRules.push(`[data-sg-pe="${cap.id}"]::${cap.side} { ${cap.style} }`);
  }
  const cssBlock = `<style id="__sigma_pseudo_css__">\n${cssRules.join("\n")}\n</style>`;

  fs.writeFileSync(path.join(publicDir, "sigma-pseudo.css"), cssRules.join("\n"));

  const result = { files: [], rules: cssRules.length };
  function walk(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name === "index.html") {
        let html = fs.readFileSync(full, "utf-8");
        const original = html;
        html = html.replace(/<style[^>]*id="__sigma_pseudo_css__"[\s\S]*?<\/style>\s*/gi, "");
        if (html.includes("</head>")) html = html.replace("</head>", cssBlock + "\n</head>");
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
  const sourceUrl = process.argv[2];
  const projDir = path.resolve(process.argv[3] || "");
  if (!sourceUrl || !projDir) { console.error("usage: <url> <projDir>"); process.exit(1); }
  capturePseudoStyles(sourceUrl).then(captures => {
    const r = applyPseudoStyles(projDir, captures);
    console.log(`[pseudo] ${captures.length} pseudo styles → ${r.rules} rules`);
    console.log(`  HTML files: ${r.files?.length || 0}`);
  });
}
