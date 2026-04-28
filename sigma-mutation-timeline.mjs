#!/usr/bin/env node
// sigma-mutation-timeline.mjs — 시간 흐름 DOM 변화 record (모션 100% capture)
//
// 자현 ultrathink 진짜 답: 정적 snapshot은 initial paint만 잡음. runtime
// 모션 (스크롤 애니메이션, 카드 hover, dynamic class 변화)은 *시간 흐름*에
// 발생. MutationObserver로 5-10초간 모든 DOM 변화 record → 자체 React에서
// 같은 timeline 재생.
//
// 자현 메모리 v21-findings 박힌 한계: "100% 복제는 framer-motion runtime
// 재구성 필요". 이 도구는 그 한계를 *근접*하는 방법 — runtime 자체를
// reconstruct하지는 않지만, runtime의 *결과*인 mutation timeline을 record.
//
// Capture pipeline:
//   1. evaluateOnNewDocument로 MutationObserver 설치
//   2. 페이지 load + 5-10초 wait (animations 진행)
//   3. + scroll trigger (각 viewport 위치)
//   4. + 첫 번째 button hover (interaction)
//   5. timeline.json 추출 (max 3000 entries)

export async function captureMutationTimeline(page, cdp, extracted, opts = {}) {
  const RECORD_MS = opts.recordMs || 8000;
  const MAX_ENTRIES = opts.maxEntries || 3000;
  const t0 = Date.now();

  console.log(`[v110.9] MUTATION TIMELINE 0.0s`);

  // Step 1: Install MutationObserver if not already (page should be loaded)
  const installed = await page.evaluate((maxEntries) => {
    if (window.__sigma_mutationObserver) return false;
    window.__sigma_mutations = [];
    window.__sigma_recordStart = Date.now();
    window.__sigma_maxEntries = maxEntries;

    function getStableSelector(el) {
      if (!el || !el.getAttribute) return null;
      // Prefer id > data-* > class+nth-of-type
      if (el.id && /^[\w-]+$/.test(el.id)) return `#${el.id}`;
      const dataAttr = [...(el.attributes || [])].find(a => a.name.startsWith("data-") && /^[\w-]+$/.test(a.value));
      if (dataAttr) return `[${dataAttr.name}="${dataAttr.value}"]`;
      // Fallback: tag + nth-of-type chain (max 4 levels)
      const path = [];
      let cur = el;
      while (cur && cur.parentElement && path.length < 4) {
        const tag = cur.tagName.toLowerCase();
        const parent = cur.parentElement;
        const same = [...parent.children].filter(c => c.tagName === cur.tagName);
        const idx = same.indexOf(cur) + 1;
        path.unshift(`${tag}:nth-of-type(${idx})`);
        cur = parent;
      }
      return path.join(" > ");
    }

    const observer = new MutationObserver((muts) => {
      const t = Date.now() - window.__sigma_recordStart;
      for (const m of muts) {
        if (window.__sigma_mutations.length >= window.__sigma_maxEntries) return;
        if (!m.target) continue;
        try {
          const target = getStableSelector(m.target);
          if (!target) continue;
          const entry = { t, type: m.type, target };
          if (m.type === "attributes" && m.attributeName) {
            entry.attr = m.attributeName;
            entry.oldValue = (m.oldValue || "").slice(0, 200);
            const newVal = m.target.getAttribute?.(m.attributeName);
            entry.newValue = (newVal || "").slice(0, 200);
            // Skip if no real change
            if (entry.oldValue === entry.newValue) continue;
          } else if (m.type === "characterData") {
            entry.oldValue = (m.oldValue || "").slice(0, 100);
            entry.newValue = (m.target.textContent || "").slice(0, 100);
            if (entry.oldValue === entry.newValue) continue;
          } else if (m.type === "childList") {
            entry.added = [...(m.addedNodes || [])].slice(0, 3).map(n => n.nodeName?.toLowerCase() || "?");
            entry.removed = [...(m.removedNodes || [])].slice(0, 3).map(n => n.nodeName?.toLowerCase() || "?");
            if (entry.added.length === 0 && entry.removed.length === 0) continue;
          }
          window.__sigma_mutations.push(entry);
        } catch {}
      }
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true, subtree: true, attributes: true,
        attributeOldValue: true, characterData: true, characterDataOldValue: true,
      });
      window.__sigma_mutationObserver = observer;
      return true;
    }
    return false;
  }, MAX_ENTRIES);

  if (!installed) {
    console.log(`  observer install failed`);
    return null;
  }

  // Step 2: Wait + scroll trigger animations
  const halfMs = Math.floor(RECORD_MS / 2);
  await new Promise(r => setTimeout(r, halfMs / 2));

  // Trigger scroll-driven animations
  await page.evaluate(async () => {
    if (!document.body) return;
    const h = document.body.scrollHeight || 0;
    for (let y = 0; y < h; y += 400) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 100));
    }
    window.scrollTo(0, 0);
  }).catch(() => {});

  // Step 3: Try hover on first button (carousel/card animations)
  try {
    const targets = await page.$$("button, [role='button'], a[href]");
    if (targets[0]) {
      await targets[0].hover();
      await new Promise(r => setTimeout(r, 300));
    }
  } catch {}

  // Wait remaining time
  await new Promise(r => setTimeout(r, halfMs));

  // Step 4: Collect timeline
  const timeline = await page.evaluate(() => {
    if (window.__sigma_mutationObserver) {
      try { window.__sigma_mutationObserver.disconnect(); } catch {}
    }
    return window.__sigma_mutations || [];
  });

  extracted.mutationTimeline = timeline;
  if (!extracted.timing) extracted.timing = {};
  extracted.timing.mutationTimeline = Date.now() - t0;

  const dur = ((Date.now() - t0) / 1000).toFixed(1);
  // Stats by type
  const byType = {};
  for (const m of timeline) byType[m.type] = (byType[m.type] || 0) + 1;
  console.log(`  ${timeline.length} mutations recorded over ${RECORD_MS}ms — ${Object.entries(byType).map(([k, v]) => `${k}=${v}`).join(", ")} (${dur}s)`);
  return timeline;
}
