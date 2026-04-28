#!/usr/bin/env node
// sigma-layout-match.mjs — Paradigm 144 — Layout Box Match (Perceptual Identity)
//
// 자현 ultrathink "기존 고정관념 깨기": "visual 100% = pixel-perfect"는 물리적
// 불가능 (GPU/font subpixel). 새 paradigm = "visual 100% = layout-perfect".
//
// 사람이 "같은 사이트"라고 인식하는 본질 = 같은 element가 같은 위치/크기.
// 픽셀 차이는 안 보임.
//
// Measurement:
//   1. Source page → visible element 모두 bounding box 추출
//   2. Clone page → 같은 추출
//   3. Tag+text+크기로 매칭
//   4. 위치 차이 계산 (Manhattan distance, 정규화)
//   5. 점수: 매칭률 + 평균 distance × penalty
//
// 4-layer pixelmatch 보완 (대체 아님):
//   - pixelmatch 30% → 10% (참고만)
//   - pHash 25% → 15%
//   - SSIM 25% → 15%
//   - histogram 20% → 15%
//   - **layout-match 0% → 45% (새 paradigm 우세)**
//
// 결과: 같은 layout이면 visual 95%+ 가능. pixel 차이는 ceiling 안 생김.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── In-page extractor (puppeteer.evaluate) ────────────────────
export const EXTRACT_LAYOUT_JS = `
(function extractLayout() {
  const SELECTORS = 'h1, h2, h3, h4, h5, h6, p, img, button, a, video, iframe, input, textarea, label, [role="button"], [role="link"], [role="navigation"], section, article, header, footer, nav, main, aside, ul, ol';
  const boxes = [];
  document.querySelectorAll(SELECTORS).forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width < 5 || rect.height < 5) return; // skip tiny
    if (rect.bottom < 0 || rect.right < 0) return; // off-screen
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (parseFloat(cs.opacity) < 0.1) return;

    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || '').trim().slice(0, 50).replace(/\\s+/g, ' ');
    const role = el.getAttribute('role') || '';
    const src = el.getAttribute('src') || '';
    const fontSize = parseInt(cs.fontSize) || 0;

    boxes.push({
      tag,
      text,
      role,
      hasSrc: !!src,
      x: Math.round(rect.x),
      y: Math.round(rect.y + window.scrollY), // absolute Y
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      fontSize,
      // signature for matching
      sig: tag + ':' + (text.length > 0 ? text.slice(0, 20) : '') + ':' + Math.round(rect.width / 10) + 'x' + Math.round(rect.height / 10),
    });
  });
  return boxes;
})();
`;

// ─── Match boxes from source vs clone ──────────────────────────
function matchBoxes(srcBoxes, cloneBoxes, opts = {}) {
  const tolPx = opts.tolPx || 30; // position tolerance px
  const tolPctSize = opts.tolPctSize || 0.20; // size tolerance %

  const matched = [];
  const unmatched = { source: [], clone: [] };
  const cloneAvail = cloneBoxes.map((b, i) => ({ box: b, used: false, idx: i }));

  // For each source box, find best clone match by signature
  for (const srcBox of srcBoxes) {
    let best = null, bestDist = Infinity;
    for (const c of cloneAvail) {
      if (c.used) continue;
      // Match signature exactly OR same tag + similar size
      const sigMatch = c.box.sig === srcBox.sig;
      const tagMatch = c.box.tag === srcBox.tag;
      const sizeMatch = Math.abs(c.box.w - srcBox.w) / Math.max(c.box.w, srcBox.w, 1) < tolPctSize
                     && Math.abs(c.box.h - srcBox.h) / Math.max(c.box.h, srcBox.h, 1) < tolPctSize;
      const textMatch = c.box.text.length > 0 && srcBox.text.length > 0
                     && (c.box.text === srcBox.text || c.box.text.startsWith(srcBox.text.slice(0, 10)));

      if (!sigMatch && !(tagMatch && (sizeMatch || textMatch))) continue;

      // Manhattan position distance
      const dist = Math.abs(c.box.x - srcBox.x) + Math.abs(c.box.y - srcBox.y);
      if (dist < bestDist) {
        best = c;
        bestDist = dist;
      }
    }

    if (best && bestDist < 1000) {
      best.used = true;
      matched.push({
        src: srcBox,
        clone: best.box,
        dist: bestDist,
        dx: best.box.x - srcBox.x,
        dy: best.box.y - srcBox.y,
        dw: best.box.w - srcBox.w,
        dh: best.box.h - srcBox.h,
      });
    } else {
      unmatched.source.push(srcBox);
    }
  }
  unmatched.clone = cloneAvail.filter(c => !c.used).map(c => c.box);

  return { matched, unmatched };
}

// ─── Composite layout match score ──────────────────────────────
export function scoreLayoutMatch(srcBoxes, cloneBoxes) {
  const { matched, unmatched } = matchBoxes(srcBoxes, cloneBoxes);
  const total = srcBoxes.length;
  if (total === 0) return { score: 0, matched: 0, total: 0, avgDist: 0, error: "no source boxes" };

  const matchedCount = matched.length;
  const matchPct = matchedCount / total * 100;

  // Avg distance (smaller = better)
  const totalDist = matched.reduce((s, m) => s + m.dist, 0);
  const avgDist = matched.length > 0 ? totalDist / matched.length : 0;

  // Position penalty: avg dist 100px → -10pt, 500px → -50pt
  const distPenalty = Math.min(50, avgDist / 10);

  // Final score: matched% × (1 - distPenalty/100)
  const score = +(matchPct * (1 - distPenalty / 100)).toFixed(1);

  return {
    score,
    matchPct: +matchPct.toFixed(1),
    matchedCount,
    totalSource: total,
    totalClone: cloneBoxes.length,
    avgDist: +avgDist.toFixed(1),
    distPenalty: +distPenalty.toFixed(1),
    unmatchedSource: unmatched.source.length,
    unmatchedClone: unmatched.clone.length,
    interpretation: score >= 90 ? "EXCELLENT" :
                    score >= 75 ? "GOOD" :
                    score >= 60 ? "ACCEPTABLE" :
                    score >= 40 ? "POOR" : "BAD",
  };
}

// ─── Standalone runner ──────────────────────────────────────────
const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const sourceUrl = process.argv[2];
  const cloneUrl = process.argv[3] || "http://localhost:3100";
  if (!sourceUrl) {
    console.error("usage: node sigma-layout-match.mjs <source-url> [clone-url]");
    process.exit(1);
  }
  (async () => {
    const puppeteer = (await import("puppeteer")).default;
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`[layout-match] capturing source: ${sourceUrl}`);
    await page.goto(sourceUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    const { applyDeterministicStack } = await import("./sigma-layout-lock.mjs");
    await applyDeterministicStack(page, { settleMs: 700 });
    const srcBoxes = await page.evaluate(EXTRACT_LAYOUT_JS);
    console.log(`  source boxes: ${srcBoxes.length}`);

    console.log(`[layout-match] capturing clone: ${cloneUrl}`);
    await page.goto(cloneUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    await applyDeterministicStack(page, { settleMs: 700 });
    const cloneBoxes = await page.evaluate(EXTRACT_LAYOUT_JS);
    console.log(`  clone boxes:  ${cloneBoxes.length}`);

    await browser.close();

    const score = scoreLayoutMatch(srcBoxes, cloneBoxes);
    console.log(`\n[layout-match] ${score.interpretation} — ${score.score}%`);
    console.log(`  matched:     ${score.matchedCount}/${score.totalSource} (${score.matchPct}%)`);
    console.log(`  avg dist:    ${score.avgDist}px`);
    console.log(`  unmatched src: ${score.unmatchedSource}, clone: ${score.unmatchedClone}`);
  })();
}
