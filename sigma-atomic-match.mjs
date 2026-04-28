#!/usr/bin/env node
// sigma-atomic-match.mjs — Paradigm 176 — Atomic Element Set Match (Jaccard)
//
// 자현 17번째 ultrathink: 한계 넘어서. Layout/sectional/role-identity ceiling
// (50-60% 자산 무관 측정에서도 한계) 깨기.
//
// P176 — Atomic Element Set:
//   - 모든 visible element를 atomic feature signature로 추출
//   - Tag + relative position + relative size + font scale + color bucket
//   - Source/clone atomic set Jaccard similarity
//   - 100% structural, 자산 의존 0%, 진짜 site identity

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── In-page atomic extractor ─────────────────────────────────
export const EXTRACT_ATOMIC_JS = `
(function extractAtomic() {
  const atoms = [];
  const docW = window.innerWidth || 1920;
  const docH = document.documentElement.scrollHeight || 1080;

  function bucketColor(c) {
    if (!c || c === 'rgba(0, 0, 0, 0)') return 'transparent';
    const m = c.match(/\\d+/g);
    if (!m || m.length < 3) return 'unknown';
    const [r, g, b] = m.map(Number);
    // Bucket to 27 colors (3 each channel)
    const buc = (v) => v < 85 ? 0 : v < 170 ? 1 : 2;
    return buc(r) + ',' + buc(g) + ',' + buc(b);
  }

  function bucketSize(s) {
    return Math.round(s / 4) * 4; // bucket 4px
  }

  document.querySelectorAll('*').forEach(el => {
    if (!(el instanceof HTMLElement)) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (parseFloat(cs.opacity) < 0.1) return;

    const xPct = Math.round(rect.x / docW * 50) * 2; // 2% bucket
    const yPct = Math.round((rect.y + window.scrollY) / docH * 50) * 2;
    const wPct = Math.round(rect.width / docW * 25) * 4; // 4% bucket
    const hPctOfW = Math.round(rect.height / docW * 25) * 4;
    const fontSize = bucketSize(parseInt(cs.fontSize) || 16);
    const colorBucket = bucketColor(cs.color);
    const bgBucket = bucketColor(cs.backgroundColor);

    const sig = el.tagName.toLowerCase() + '@' + xPct + ',' + yPct + '|' + wPct + 'x' + hPctOfW + '|f' + fontSize + '|c' + colorBucket + '|b' + bgBucket;
    atoms.push(sig);
  });

  return { atoms, docW, docH, count: atoms.length };
})();
`;

// ─── Jaccard similarity ───────────────────────────────────────
export function scoreAtomicMatch(srcResult, cloneResult) {
  const srcAtoms = srcResult.atoms || [];
  const cloneAtoms = cloneResult.atoms || [];

  if (srcAtoms.length === 0 && cloneAtoms.length === 0) {
    return { score: 0, intersection: 0, union: 0, srcCount: 0, cloneCount: 0 };
  }

  const srcSet = new Set(srcAtoms);
  const cloneSet = new Set(cloneAtoms);

  let intersection = 0;
  for (const s of srcSet) if (cloneSet.has(s)) intersection++;

  const union = new Set([...srcSet, ...cloneSet]).size;
  const score = union > 0 ? +(intersection / union * 100).toFixed(1) : 0;

  return {
    score,
    intersection,
    union,
    srcUnique: srcSet.size,
    cloneUnique: cloneSet.size,
    srcCount: srcAtoms.length,
    cloneCount: cloneAtoms.length,
    interpretation: score >= 75 ? "EXCELLENT" :
                    score >= 60 ? "GOOD" :
                    score >= 45 ? "ACCEPTABLE" :
                    score >= 30 ? "POOR" : "BAD",
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const sourceUrl = process.argv[2];
  const cloneUrl = process.argv[3] || "http://localhost:3100";
  if (!sourceUrl) {
    console.error("usage: node sigma-atomic-match.mjs <source-url> [clone-url]");
    process.exit(1);
  }
  (async () => {
    const puppeteer = (await import("puppeteer")).default;
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    const { applyDeterministicStack } = await import("./sigma-layout-lock.mjs");

    console.log(`[atomic] source: ${sourceUrl}`);
    await page.goto(sourceUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    await applyDeterministicStack(page, { settleMs: 700 });
    const src = await page.evaluate(EXTRACT_ATOMIC_JS);

    console.log(`[atomic] clone: ${cloneUrl}`);
    await page.goto(cloneUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    await applyDeterministicStack(page, { settleMs: 700 });
    const clone = await page.evaluate(EXTRACT_ATOMIC_JS);

    await browser.close();

    const r = scoreAtomicMatch(src, clone);
    console.log(`\n[atomic] ${r.interpretation} — ${r.score}%`);
    console.log(`  src atoms:    ${r.srcCount} (${r.srcUnique} unique)`);
    console.log(`  clone atoms:  ${r.cloneCount} (${r.cloneUnique} unique)`);
    console.log(`  intersection: ${r.intersection}`);
    console.log(`  union:        ${r.union}`);
  })();
}
