#!/usr/bin/env node
// sigma-hover-states.mjs — Paradigm 192 — Reactive Hover/Focus States
//
// 자현 명령: 사용자 hover/click 시 source처럼 살아있어야.
//
// P192 — 모든 hoverable element를 source page에서 hover trigger →
// computed style capture → Mirror에 event listener inject.
//
// Source처럼 살아있는 interaction.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const HOVER_RECORDER_JS = `
(async function recordHoverStates() {
  const HOVERABLE = 'a, button, [role="button"], [class*="btn"], [class*="card"], [class*="item"], [class*="link"], [onclick]';
  const els = document.querySelectorAll(HOVERABLE);
  const states = [];

  function selectorFor(el) {
    if (!el || el === document.body) return null;
    const path = [];
    let cur = el;
    let depth = 0;
    while (cur && cur !== document.body && depth < 20) {
      const tag = cur.tagName.toLowerCase();
      const parent = cur.parentElement;
      if (!parent) break;
      const sameTag = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
      if (sameTag.length === 1) path.unshift(tag);
      else { const idx = sameTag.indexOf(cur); path.unshift(tag + ':nth-of-type(' + (idx + 1) + ')'); }
      cur = parent;
      depth++;
    }
    return path.length > 0 ? path.join(' > ') : null;
  }

  function captureStyle(el) {
    const cs = getComputedStyle(el);
    return {
      bg: cs.backgroundColor,
      bgImage: cs.backgroundImage,
      color: cs.color,
      border: cs.border,
      shadow: cs.boxShadow,
      transform: cs.transform,
      opacity: cs.opacity,
    };
  }

  for (let i = 0; i < Math.min(els.length, 100); i++) {
    const el = els[i];
    if (!(el instanceof HTMLElement)) continue;
    const sel = selectorFor(el);
    if (!sel) continue;

    const baseStyle = captureStyle(el);

    // Trigger :hover via mouseenter event + add hover class for testing
    const evt = new MouseEvent('mouseenter', { bubbles: true });
    el.dispatchEvent(evt);
    await new Promise(r => setTimeout(r, 50));

    // Force :hover state via classlist hack (some sites use class-based)
    el.classList.add('sigma-hover-test');
    const hoverStyle = captureStyle(el);
    el.classList.remove('sigma-hover-test');

    el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

    // Only save if styles differ
    const diff = Object.keys(baseStyle).filter(k => baseStyle[k] !== hoverStyle[k]);
    if (diff.length > 0) {
      states.push({ sel, base: baseStyle, hover: hoverStyle, diff });
    }
  }

  return states;
})();
`;

export const HOVER_PLAYER_JS = `
/* sigma-hover-player — Paradigm 192 */
(function hoverPlayer() {
  const HOVER_STATES = window.__SIGMA_HOVER_STATES__ || [];
  if (HOVER_STATES.length === 0) return;

  HOVER_STATES.forEach(state => {
    const el = document.querySelector(state.sel);
    if (!el) return;
    el.addEventListener('mouseenter', () => {
      state.diff.forEach(prop => {
        const cssProp = prop === 'bg' ? 'backgroundColor' :
                        prop === 'bgImage' ? 'backgroundImage' :
                        prop === 'shadow' ? 'boxShadow' : prop;
        el.style[cssProp] = state.hover[prop];
      });
    });
    el.addEventListener('mouseleave', () => {
      state.diff.forEach(prop => {
        const cssProp = prop === 'bg' ? 'backgroundColor' :
                        prop === 'bgImage' ? 'backgroundImage' :
                        prop === 'shadow' ? 'boxShadow' : prop;
        el.style[cssProp] = state.base[prop];
      });
    });
    el.style.transition = 'all 0.2s ease';
  });
})();
`;

export async function recordHoverStates(sourceUrl) {
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log(`[hover] navigating: ${sourceUrl}`);
  await page.goto(sourceUrl, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));

  console.log(`[hover] capturing hoverable elements...`);
  const states = await page.evaluate(HOVER_RECORDER_JS).catch(() => []);

  await browser.close();
  console.log(`  ${states.length} hover states captured`);

  return states;
}

export function applyHoverStates(projDir, states) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  fs.writeFileSync(path.join(publicDir, "sigma-hover-states.json"), JSON.stringify(states));

  const result = { files: [] };
  function walk(dir, depth = 0) {
    if (depth > 5) return;
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name === "index.html") {
        let html = fs.readFileSync(full, "utf-8");
        const original = html;

        html = html.replace(/<script[^>]*id="__sigma_hover_states__"[\s\S]*?<\/script>\s*/gi, "");
        const inject = `<script id="__sigma_hover_states__">
fetch('/sigma-hover-states.json').then(r => r.json()).then(s => {
  window.__SIGMA_HOVER_STATES__ = s;
  ${HOVER_PLAYER_JS}
});
</script>`;
        if (html.includes("</body>")) {
          html = html.replace("</body>", inject + "\n</body>");
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
  const sourceUrl = process.argv[2];
  const projDir = path.resolve(process.argv[3] || "");
  if (!sourceUrl || !projDir) {
    console.error("usage: node sigma-hover-states.mjs <source-url> <projDir>");
    process.exit(1);
  }
  recordHoverStates(sourceUrl).then(states => {
    const r = applyHoverStates(projDir, states);
    console.log(`[hover] HTML files: ${r.files?.length || 0}`);
    console.log(`  → ${states.length} reactive hover states`);
  });
}
