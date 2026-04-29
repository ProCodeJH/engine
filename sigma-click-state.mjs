#!/usr/bin/env node
// sigma-click-state.mjs — Paradigm 199 — Click State Inference
//
// 자현 명령 "모든 실력": 사용자 click 시 source처럼 살아있어야.
//
// P199 — 모든 clickable element를 source page에서 click trigger →
// before/after DOM diff capture → Mirror에 click handler inject.
//
// 모달 열림, 드롭다운 expand, 아코디언 토글 등 자동 record.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CLICK_RECORDER_JS = `
(async function recordClicks() {
  const CLICKABLE = '[role="button"], [class*="toggle"], [class*="accordion"], [class*="menu-button"], [class*="dropdown"], [class*="modal-trigger"], [class*="hamburger"], [aria-expanded], [data-toggle]';
  const els = document.querySelectorAll(CLICKABLE);
  const states = [];

  function selectorFor(el) {
    if (!el || el === document.body) return null;
    const path = [];
    let cur = el; let depth = 0;
    while (cur && cur !== document.body && depth < 20) {
      const tag = cur.tagName.toLowerCase();
      const parent = cur.parentElement;
      if (!parent) break;
      const sameTag = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
      if (sameTag.length === 1) path.unshift(tag);
      else { const idx = sameTag.indexOf(cur); path.unshift(tag + ':nth-of-type(' + (idx + 1) + ')'); }
      cur = parent; depth++;
    }
    return path.length > 0 ? path.join(' > ') : null;
  }

  function snapshotDom() {
    const sigs = [];
    document.querySelectorAll('*').forEach(el => {
      if (!(el instanceof HTMLElement)) return;
      const cs = getComputedStyle(el);
      sigs.push({
        sel: selectorFor(el),
        display: cs.display,
        opacity: cs.opacity,
        classes: el.className,
        ariaExpanded: el.getAttribute('aria-expanded'),
        ariaHidden: el.getAttribute('aria-hidden'),
      });
    });
    return sigs;
  }

  for (let i = 0; i < Math.min(els.length, 30); i++) {
    const el = els[i];
    if (!(el instanceof HTMLElement)) continue;
    const sel = selectorFor(el);
    if (!sel) continue;

    const before = snapshotDom();
    el.click();
    await new Promise(r => setTimeout(r, 200));
    const after = snapshotDom();

    // Diff before/after
    const changes = [];
    for (let j = 0; j < before.length; j++) {
      const b = before[j], a = after[j];
      if (!b || !a) continue;
      if (b.display !== a.display || b.opacity !== a.opacity ||
          b.classes !== a.classes || b.ariaExpanded !== a.ariaExpanded) {
        changes.push({
          sel: a.sel,
          before: { display: b.display, opacity: b.opacity, classes: b.classes },
          after:  { display: a.display, opacity: a.opacity, classes: a.classes },
        });
      }
    }

    if (changes.length > 0 && changes.length < 50) {
      states.push({ trigger: sel, changes });
    }

    // Reset (click again to close)
    el.click();
    await new Promise(r => setTimeout(r, 200));
  }

  return states;
})();
`;

export const CLICK_PLAYER_JS = `
/* sigma-click-player — Paradigm 199 */
(function clickPlayer() {
  const STATES = window.__SIGMA_CLICK_STATES__ || [];
  const triggerStates = new Map();
  STATES.forEach(s => triggerStates.set(s.trigger, { state: 'closed', changes: s.changes }));

  STATES.forEach(s => {
    const trigger = document.querySelector(s.trigger);
    if (!trigger) return;
    trigger.addEventListener('click', (e) => {
      const tState = triggerStates.get(s.trigger);
      const target = tState.state === 'closed' ? 'after' : 'before';
      tState.state = tState.state === 'closed' ? 'open' : 'closed';
      s.changes.forEach(c => {
        const el = document.querySelector(c.sel);
        if (!el) return;
        const next = c[target];
        if (next.display) el.style.display = next.display;
        if (next.opacity) el.style.opacity = next.opacity;
        if (next.classes !== undefined) el.className = next.classes;
      });
    });
    trigger.style.cursor = 'pointer';
  });
})();
`;

export async function recordClickStates(sourceUrl) {
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log(`[click] navigating: ${sourceUrl}`);
  await page.goto(sourceUrl, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));

  console.log(`[click] recording click states (max 30 triggers)...`);
  const states = await page.evaluate(CLICK_RECORDER_JS).catch(() => []);

  await browser.close();
  console.log(`  ${states.length} click triggers captured`);
  return states;
}

export function applyClickStates(projDir, states) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  fs.writeFileSync(path.join(publicDir, "sigma-click-states.json"), JSON.stringify(states));

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
        html = html.replace(/<script[^>]*id="__sigma_click_states__"[\s\S]*?<\/script>\s*/gi, "");
        const inject = `<script id="__sigma_click_states__">
fetch('/sigma-click-states.json').then(r => r.json()).then(s => {
  window.__SIGMA_CLICK_STATES__ = s;
  ${CLICK_PLAYER_JS}
});
</script>`;
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
  const sourceUrl = process.argv[2];
  const projDir = path.resolve(process.argv[3] || "");
  if (!sourceUrl || !projDir) { console.error("usage: <url> <projDir>"); process.exit(1); }
  recordClickStates(sourceUrl).then(states => {
    const r = applyClickStates(projDir, states);
    console.log(`[click] HTML files: ${r.files?.length || 0}, states: ${states.length}`);
  });
}
