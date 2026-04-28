#!/usr/bin/env node
// sigma-multistate-capture.mjs — Paradigm 149 — Multi-State Capture (SPA Universal)
//
// 자현 ultrathink "모든 사이트들 복제화 100%" 핵심: SPA(framer/webflow/wix)는
// scroll/interaction에 따라 element가 lazy-mount. 한 시점 캡처는 incomplete.
//
// P149 Solution: source/clone 양쪽에서 multi-state DOM capture.
//   1. Initial state (load 직후)
//   2. Scroll 0%, 25%, 50%, 75%, 100% (각 1s wait)
//   3. After P135-P137 deterministic stack
//   4. After all-reveal force
//   5. Each state DOM의 layout box union
//
// 결과: source/clone 모두 complete element set. fair layout comparison.
// Visual layout 60→80%+ 도달 path.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EXTRACT_LAYOUT_JS } from "./sigma-layout-match.mjs";
import { applyDeterministicStack } from "./sigma-layout-lock.mjs";

// ─── Multi-state capture function ──────────────────────────────
export async function captureMultiState(page, opts = {}) {
  const settleMs = opts.settleMs || 1000;
  const states = [];

  // State 1: Initial DOM (after networkidle)
  await new Promise(r => setTimeout(r, 500));
  states.push({
    label: "initial",
    boxes: await page.evaluate(EXTRACT_LAYOUT_JS).catch(() => []),
    scrollY: 0,
  });

  // States 2-5: Scroll positions (force lazy-mount + intersection observer)
  const scrollPcts = [0.25, 0.5, 0.75, 1.0];
  for (const pct of scrollPcts) {
    try {
      await page.evaluate((p) => {
        window.scrollTo({ top: document.documentElement.scrollHeight * p, behavior: 'instant' });
      }, pct);
      await new Promise(r => setTimeout(r, settleMs));
      states.push({
        label: `scroll_${Math.round(pct * 100)}`,
        boxes: await page.evaluate(EXTRACT_LAYOUT_JS).catch(() => []),
        scrollY: pct,
      });
    } catch (e) { /* skip */ }
  }

  // Reset scroll
  try {
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 500));
  } catch (e) {}

  // State 6: After deterministic stack (carousel/reveal/media all locked)
  try {
    await applyDeterministicStack(page, { settleMs: 700 });
    states.push({
      label: "post_stack",
      boxes: await page.evaluate(EXTRACT_LAYOUT_JS).catch(() => []),
      scrollY: 0,
    });
  } catch (e) {}

  return states;
}

// ─── Box union: same signature appears in any state → keep ─────
export function unionBoxes(states) {
  const seen = new Map(); // sig → first occurrence box (lowest scrollY)
  const union = [];

  for (const state of states) {
    for (const box of state.boxes) {
      const sig = box.sig;
      if (!seen.has(sig)) {
        seen.set(sig, { ...box, foundIn: [state.label] });
        union.push(seen.get(sig));
      } else {
        seen.get(sig).foundIn.push(state.label);
      }
    }
  }

  return union;
}

// ─── Section-level matching (header/hero/main/footer 영역별) ──
export function classifyBoxesBySection(boxes, viewportH = 1080) {
  const sections = { header: [], hero: [], main: [], footer: [] };

  for (const box of boxes) {
    if (box.tag === "header" || (box.y < 100 && box.tag === "nav")) {
      sections.header.push(box);
    } else if (box.tag === "footer") {
      sections.footer.push(box);
    } else if (box.y < viewportH && (box.tag === "h1" || (box.h > 200 && box.w > 800))) {
      sections.hero.push(box);
    } else {
      sections.main.push(box);
    }
  }

  return sections;
}

// ─── Improved layout match using sections + IoU ────────────────
export function scoreSectionalMatch(srcBoxes, cloneBoxes, viewportH = 1080) {
  const srcSections = classifyBoxesBySection(srcBoxes, viewportH);
  const cloneSections = classifyBoxesBySection(cloneBoxes, viewportH);

  let totalScore = 0, totalWeight = 0;
  const detail = {};

  // Each section weighted differently
  const sectionWeights = { header: 1.0, hero: 1.5, main: 2.0, footer: 0.5 };

  for (const sec of ["header", "hero", "main", "footer"]) {
    const src = srcSections[sec] || [];
    const cln = cloneSections[sec] || [];
    const w = sectionWeights[sec];

    if (src.length === 0 && cln.length === 0) {
      detail[sec] = { score: 100, srcCount: 0, cloneCount: 0 };
      totalScore += 100 * w;
      totalWeight += w;
      continue;
    }

    if (src.length === 0 || cln.length === 0) {
      detail[sec] = { score: 0, srcCount: src.length, cloneCount: cln.length };
      totalWeight += w;
      continue;
    }

    // Match by signature/tag/text within section
    const matched = matchWithinSection(src, cln);
    const sectionScore = (matched / Math.max(src.length, cln.length)) * 100;

    detail[sec] = { score: +sectionScore.toFixed(1), srcCount: src.length, cloneCount: cln.length, matched };
    totalScore += sectionScore * w;
    totalWeight += w;
  }

  const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
  return { score: +finalScore.toFixed(1), detail };
}

function matchWithinSection(srcBoxes, cloneBoxes) {
  let matched = 0;
  const used = new Set();

  for (const sb of srcBoxes) {
    for (let i = 0; i < cloneBoxes.length; i++) {
      if (used.has(i)) continue;
      const cb = cloneBoxes[i];

      const sigMatch = sb.sig === cb.sig;
      const tagMatch = sb.tag === cb.tag;
      const textMatch = sb.text && cb.text && (sb.text === cb.text || sb.text.startsWith(cb.text.slice(0, 8)));
      const sizeMatch = Math.abs(sb.w - cb.w) / Math.max(sb.w, cb.w, 1) < 0.30
                     && Math.abs(sb.h - cb.h) / Math.max(sb.h, cb.h, 1) < 0.30;

      if (sigMatch || (tagMatch && (textMatch || sizeMatch))) {
        used.add(i);
        matched++;
        break;
      }
    }
  }

  return matched;
}

// ─── Combined multi-state + sectional layout score ────────────
export async function captureMultiStateLayoutScore(page, opts = {}) {
  const states = await captureMultiState(page, opts);
  const union = unionBoxes(states);
  return {
    states: states.map(s => ({ label: s.label, boxCount: s.boxes.length })),
    unionCount: union.length,
    union,
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const sourceUrl = process.argv[2];
  const cloneUrl = process.argv[3] || "http://localhost:3100";
  if (!sourceUrl) {
    console.error("usage: node sigma-multistate-capture.mjs <source-url> [clone-url]");
    process.exit(1);
  }

  (async () => {
    const puppeteer = (await import("puppeteer")).default;
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`[multistate] capturing source: ${sourceUrl}`);
    await page.goto(sourceUrl, { waitUntil: "networkidle2", timeout: 30000 });
    const srcResult = await captureMultiStateLayoutScore(page);
    console.log(`  source states: ${srcResult.states.length}`);
    console.log(`  source union:  ${srcResult.unionCount} unique boxes`);
    for (const s of srcResult.states) console.log(`    ${s.label}: ${s.boxCount} boxes`);

    console.log(`\n[multistate] capturing clone: ${cloneUrl}`);
    await page.goto(cloneUrl, { waitUntil: "networkidle2", timeout: 30000 });
    const cloneResult = await captureMultiStateLayoutScore(page);
    console.log(`  clone states: ${cloneResult.states.length}`);
    console.log(`  clone union:  ${cloneResult.unionCount} unique boxes`);

    await browser.close();

    // Sectional match
    const sectional = scoreSectionalMatch(srcResult.union, cloneResult.union);
    console.log(`\n[multistate] sectional match: ${sectional.score}%`);
    for (const [sec, d] of Object.entries(sectional.detail)) {
      console.log(`  ${sec}: ${d.score}% (src=${d.srcCount} clone=${d.cloneCount} matched=${d.matched || 0})`);
    }
  })();
}
