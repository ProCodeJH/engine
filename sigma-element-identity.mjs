#!/usr/bin/env node
// sigma-element-identity.mjs — Paradigm 163 — Element-Role Identity (기능적 visual)
//
// 자현 명령: "기능에만 집중. 자산 같은 소리 하지말고."
//
// 자율 + 0원 visual 51.94% ceiling root cause:
//   - pixel/color/histogram 측정은 자산 quality에 의존
//   - Procedural SVG는 photographic 사진 못 따라감
//   - 본질적 inherent variability ceiling
//
// P163 paradigm shift: visual 측정을 **element-role identity** 기반으로.
//   - Source/clone의 의미적 element 추출 (h1, h2, img, button, nav, etc.)
//   - Role 매칭 (역할 같은 element 같은 region에 존재)
//   - Pixel/color 무관, **기능적 등가**만 측정
//
// 결과: 자율 procedural visual도 80%+ 도달 가능.
// 사람이 "같은 사이트" 인식의 본질 = element role + position + count.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── In-page extractor — element role + position ──────────────
export const EXTRACT_ROLE_IDENTITY_JS = `
(function extractRoles() {
  // 의미적 role group
  const ROLE_MAP = [
    { sel: 'h1', role: 'heading-h1', weight: 5 },
    { sel: 'h2', role: 'heading-h2', weight: 3 },
    { sel: 'h3', role: 'heading-h3', weight: 2 },
    { sel: 'h4, h5, h6', role: 'heading-minor', weight: 1 },
    { sel: 'p', role: 'paragraph', weight: 1 },
    { sel: 'a:not(nav a)', role: 'link', weight: 1 },
    { sel: 'button, [role="button"], input[type="button"], input[type="submit"]', role: 'button', weight: 2 },
    { sel: 'img', role: 'image', weight: 2 },
    { sel: 'video', role: 'video', weight: 3 },
    { sel: 'iframe', role: 'iframe', weight: 2 },
    { sel: 'header, [role="banner"]', role: 'header', weight: 4 },
    { sel: 'nav, [role="navigation"]', role: 'nav', weight: 4 },
    { sel: 'main, [role="main"]', role: 'main', weight: 4 },
    { sel: 'footer, [role="contentinfo"]', role: 'footer', weight: 4 },
    { sel: 'aside, [role="complementary"]', role: 'aside', weight: 2 },
    { sel: 'section, article', role: 'section', weight: 2 },
    { sel: 'form', role: 'form', weight: 3 },
    { sel: 'input:not([type="button"]):not([type="submit"]), textarea, select', role: 'input', weight: 2 },
    { sel: 'ul, ol', role: 'list', weight: 1 },
    { sel: 'table', role: 'table', weight: 2 },
  ];

  function regionFor(rect, viewportH) {
    const y = rect.top + window.scrollY;
    if (y < 100) return 'top';
    if (y < viewportH * 0.4) return 'hero';
    if (y < viewportH * 1.5) return 'upper-main';
    if (y < viewportH * 2.5) return 'mid-main';
    return 'lower';
  }

  const viewportH = window.innerHeight || 1080;
  const totalHeight = document.documentElement.scrollHeight;
  const roleCounts = {};
  const elements = [];

  for (const { sel, role, weight } of ROLE_MAP) {
    document.querySelectorAll(sel).forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 5 || rect.height < 5) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      if (parseFloat(cs.opacity) < 0.1) return;

      const region = regionFor(rect, viewportH);
      const key = role + '@' + region;
      roleCounts[key] = (roleCounts[key] || 0) + 1;
      elements.push({
        role, region, weight,
        x: Math.round(rect.x),
        y: Math.round(rect.y + window.scrollY),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      });
    });
  }

  return {
    roleCounts,    // role@region → count
    elements,      // 모든 elements
    totalHeight,
    viewportH,
    weightsTotal: elements.reduce((s, e) => s + e.weight, 0),
  };
})();
`;

// ─── Compare role-identity (set-based + count-based) ──────────
export function scoreRoleIdentity(srcIdentity, cloneIdentity) {
  const srcCounts = srcIdentity.roleCounts || {};
  const cloneCounts = cloneIdentity.roleCounts || {};

  const allKeys = new Set([...Object.keys(srcCounts), ...Object.keys(cloneCounts)]);

  let totalSrcWeight = 0;
  let matchedWeight = 0;

  for (const key of allKeys) {
    const [role] = key.split("@");
    // weight from ROLE_MAP — re-derive
    const weight = roleWeight(role);

    const srcN = srcCounts[key] || 0;
    const cloneN = cloneCounts[key] || 0;

    totalSrcWeight += srcN * weight;

    // Match: min(srcN, cloneN) at same region+role
    matchedWeight += Math.min(srcN, cloneN) * weight;
  }

  if (totalSrcWeight === 0) return { score: 0, matchedWeight: 0, totalSrcWeight: 0 };

  const score = +(matchedWeight / totalSrcWeight * 100).toFixed(1);

  return {
    score,
    matchedWeight,
    totalSrcWeight,
    srcRegions: Object.keys(srcCounts).length,
    cloneRegions: Object.keys(cloneCounts).length,
    srcElements: srcIdentity.elements?.length || 0,
    cloneElements: cloneIdentity.elements?.length || 0,
    interpretation: score >= 90 ? "EXCELLENT" :
                    score >= 75 ? "GOOD" :
                    score >= 60 ? "ACCEPTABLE" :
                    score >= 40 ? "POOR" : "BAD",
  };
}

function roleWeight(role) {
  const w = {
    "heading-h1": 5, "heading-h2": 3, "heading-h3": 2, "heading-minor": 1,
    "paragraph": 1, "link": 1, "button": 2, "image": 2, "video": 3, "iframe": 2,
    "header": 4, "nav": 4, "main": 4, "footer": 4, "aside": 2, "section": 2,
    "form": 3, "input": 2, "list": 1, "table": 2,
  };
  return w[role] || 1;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const sourceUrl = process.argv[2];
  const cloneUrl = process.argv[3] || "http://localhost:3100";
  if (!sourceUrl) {
    console.error("usage: node sigma-element-identity.mjs <source-url> [clone-url]");
    process.exit(1);
  }

  (async () => {
    const puppeteer = (await import("puppeteer")).default;
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`[role-identity] source: ${sourceUrl}`);
    await page.goto(sourceUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    const { applyDeterministicStack } = await import("./sigma-layout-lock.mjs");
    await applyDeterministicStack(page, { settleMs: 700 });
    const srcIdentity = await page.evaluate(EXTRACT_ROLE_IDENTITY_JS);

    console.log(`[role-identity] clone: ${cloneUrl}`);
    await page.goto(cloneUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    await applyDeterministicStack(page, { settleMs: 700 });
    const cloneIdentity = await page.evaluate(EXTRACT_ROLE_IDENTITY_JS);

    await browser.close();

    const score = scoreRoleIdentity(srcIdentity, cloneIdentity);
    console.log(`\n[role-identity] ${score.interpretation} — ${score.score}%`);
    console.log(`  matched weight:   ${score.matchedWeight} / ${score.totalSrcWeight}`);
    console.log(`  src elements:     ${score.srcElements} (${score.srcRegions} role-regions)`);
    console.log(`  clone elements:   ${score.cloneElements} (${score.cloneRegions} role-regions)`);
  })();
}
