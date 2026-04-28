#!/usr/bin/env node
// sigma-multiviewport.mjs — v100-1 Multi-viewport REAL Capture
//
// 자현 ultrathink: 현재 v98 엔진은 1920x1080 데스크톱 DOM만 진짜 capture.
// 모바일은 @media query로 "추정". 이게 큰 결손 — 모바일에서 nav drawer가
// 펼쳐지거나 카드가 stack으로 변형되거나 hamburger가 inline nav를 대체할
// 때, viewport 단순 변경만으로는 진짜 mobile DOM 안 보임 (서버 분기/JS
// 분기 사이트 다수). v100-1은 진짜 viewport 변경 + reload + DOM diff.
//
// Strategy:
//   1. Save current desktop DOM compact summary (sections, nav structure)
//   2. For each target viewport (mobile 375, tablet 768):
//      a. setViewport
//      b. reload (waitUntil: networkidle2) — 진짜 새 DOM 받아오기
//      c. full-page scroll for lazy load
//      d. capture compact DOM + nav structure + section layouts
//      e. diff vs desktop — 진짜 다른 layout 신호
//   3. Restore desktop viewport + reload
//
// Output: extracted.multiViewportReal = {
//   mobile: { sections, navStructure, docHeight, layoutSignature, ... },
//   tablet: { ... },
//   desktopReference: { ... },
//   diffSummary: { mobileVsDesktop: {...}, tabletVsDesktop: {...} }
// }

export async function captureMultiViewport(page, cdp, extracted, opts = {}) {
  const t0 = Date.now();
  const VIEWPORTS = opts.viewports || [
    { name: "mobile", width: 375, height: 812 },
    { name: "tablet", width: 768, height: 1024 },
  ];
  const RELOAD_PER_VP = opts.reloadPerViewport ?? true;
  const RELOAD_TIMEOUT = opts.reloadTimeout ?? 30000;

  console.log(`[v100-1] MULTI-VIEWPORT REAL CAPTURE`);

  // Capture desktop reference first (before viewport changes)
  const desktopRef = await captureViewportSignature(page);

  const out = { desktopReference: desktopRef };

  for (const vp of VIEWPORTS) {
    try {
      await page.setViewport({ width: vp.width, height: vp.height });

      if (RELOAD_PER_VP) {
        try {
          await page.reload({ waitUntil: "networkidle2", timeout: RELOAD_TIMEOUT });
        } catch {}
        // v110.5 fix: 더 긴 wait + 강한 guard
        await new Promise(r => setTimeout(r, 1500));
        try {
          await page.evaluate(async () => {
            if (!document || !document.body) return;
            const h = document.body.scrollHeight || 0;
            if (h === 0) return;
            for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); }
            window.scrollTo(0, 0);
          });
        } catch {}
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }

      const sig = await captureViewportSignature(page);
      out[vp.name] = { ...sig, viewport: vp };
      console.log(`  ${vp.name} (${vp.width}x${vp.height}): ${sig.sectionCount} sections, navInline=${sig.navStructure.navInlineCount}, hamburger=${sig.navStructure.hamburgerVisible}, drawer=${sig.navStructure.drawerVisible}, docHeight=${sig.docHeight}`);

    } catch (e) {
      out[vp.name] = { error: String(e.message || e).slice(0, 80), viewport: vp };
      console.log(`  ${vp.name}: ${out[vp.name].error}`);
    }
  }

  // Restore to desktop and reload (so downstream capture sees fresh desktop)
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    if (RELOAD_PER_VP) {
      await page.reload({ waitUntil: "networkidle2", timeout: RELOAD_TIMEOUT });
      await page.evaluate(async () => {
        const h = document.body.scrollHeight;
        for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); }
        window.scrollTo(0, 0);
      });
    } else {
      await new Promise(r => setTimeout(r, 800));
    }
  } catch {}

  // Compute diff summary
  out.diffSummary = {};
  for (const vp of VIEWPORTS) {
    if (out[vp.name]?.error) continue;
    out.diffSummary[`${vp.name}VsDesktop`] = {
      docHeightDelta: out[vp.name].docHeight - desktopRef.docHeight,
      sectionCountDelta: out[vp.name].sectionCount - desktopRef.sectionCount,
      navStructureChanged:
        out[vp.name].navStructure.hamburgerVisible !== desktopRef.navStructure.hamburgerVisible ||
        Math.abs(out[vp.name].navStructure.navInlineCount - desktopRef.navStructure.navInlineCount) >= 2,
      layoutSignatureChanged: out[vp.name].layoutSignature !== desktopRef.layoutSignature,
    };
  }

  extracted.multiViewportReal = out;
  if (!extracted.timing) extracted.timing = {};
  extracted.timing.multiViewport = Date.now() - t0;

  const dur = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  multi-viewport real: ${VIEWPORTS.length} viewports captured (${dur}s)`);
  return out;
}

async function captureViewportSignature(page) {
  return page.evaluate(() => {
    if (!document || !document.body) return { sectionCount: 0, sections: [], navStructure: { navInlineCount: 0, hamburgerVisible: false, drawerVisible: false }, docHeight: 0, bodyDisplay: "block", layoutSignature: "" };
    const sections = [...document.querySelectorAll("section, header, footer, main > div, [class*='section'], [class*='hero']")]
      .filter(el => el.getBoundingClientRect().height >= 80)
      .slice(0, 30)
      .map(el => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          cls: (el.className || "").toString().slice(0, 60),
          top: Math.round(r.top + window.scrollY),
          h: Math.round(r.height),
          w: Math.round(r.width),
          display: cs.display,
          flexDir: cs.flexDirection,
          gridCols: (cs.gridTemplateColumns || "").slice(0, 60),
        };
      });

    // Nav structure
    const navInlineCount = [...document.querySelectorAll("nav a, nav button, header a, header button")]
      .filter(el => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden";
      }).length;
    const hamburgerVisible = !![...document.querySelectorAll('[class*="hamburger"], [class*="menu-toggle"], [class*="burger"], button[aria-label*="menu" i]')]
      .find(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
    const drawerVisible = !![...document.querySelectorAll('[class*="drawer"], [class*="sidebar"][class*="mobile"], aside[role="navigation"]')]
      .find(el => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.position === "fixed";
      });

    // Layout signature: condensed string of top-3 section's display+flex/grid
    const layoutSignature = sections.slice(0, 3).map(s => `${s.display}|${s.flexDir}|${s.gridCols.slice(0, 20)}`).join("::");

    return {
      sectionCount: sections.length,
      sections,
      navStructure: { navInlineCount, hamburgerVisible, drawerVisible },
      docHeight: document.body.scrollHeight,
      bodyDisplay: getComputedStyle(document.body).display,
      layoutSignature,
    };
  });
}
