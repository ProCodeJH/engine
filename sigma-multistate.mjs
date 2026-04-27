#!/usr/bin/env node
// sigma-multistate.mjs — v99-1 Multi-state DOM Capture
//
// 자현 ultrathink 결과의 첫 SOLVABLE_PARTIAL → RESOLVED 이동:
// 햄버거 메뉴/모달/드롭다운/탭 같은 인터랙션 *후* DOM 상태를 자동 캡처.
// 현재 v98 엔진은 첫 로드 DOM만 본다 — 그래서 모바일 nav drawer의 펼친
// 상태, 모달의 내용, 탭 패널의 숨은 콘텐츠를 놓침. v99로 이걸 잡는다.
//
// Strategy:
//   1. 토글 가능한 element 식별 (aria-expanded/haspopup, hamburger 휴리스틱,
//      data-toggle/target, role="button" + popup hint)
//   2. 각 element에 MutationObserver 설치 → CDP Input.dispatchMouseEvent로
//      클릭 → 800ms 대기 → DOM diff 측정
//   3. 의미 있는 변화 (≥3 mutations)면 펼친 상태 DOM 스냅샷 저장
//   4. ESC 또는 재클릭으로 닫고 다음 토글로
//
// Output: extracted.multiStateDOMs = [
//   { triggerIdx, selector, triggerText, mutationCount, stateChanged,
//     beforeDomSize, afterDomSize, domDelta, addedTags, afterAriaExpanded }
// ]
//
// Note: emit pipe wiring(v99-2)은 별도. 이 모듈은 *capture*만.
//   v99-2에서 emit 시 multi-state 컴포넌트로 통합 후 RESOLVED_SIGNALS 등록.

export async function captureMultiStateDom(page, cdp, extracted, opts = {}) {
  const t0 = Date.now();
  const MAX_TOGGLES = opts.maxToggles ?? 12;
  const WAIT_MS = opts.waitMs ?? 800;
  const MIN_MUTATIONS = opts.minMutations ?? 3;

  console.log(`[v99-1] MULTI-STATE DOM 0.0s`);

  // Step 1: Identify clickable toggles via heuristic
  // 휴리스틱 우선순위: explicit ARIA → data attrs → class name patterns
  const toggles = await page.evaluate((max) => {
    const candidates = new Set();
    const add = (els) => { for (const el of els) candidates.add(el); };

    add(document.querySelectorAll('[aria-expanded]'));
    add(document.querySelectorAll('[aria-haspopup]'));
    add(document.querySelectorAll('[data-toggle], [data-target], [data-controls], [data-bs-toggle]'));
    add(document.querySelectorAll('button[aria-label*="menu" i]'));
    add(document.querySelectorAll('[class*="hamburger"], [class*="menu-toggle"], [class*="nav-toggle"], [class*="burger"]'));
    add(document.querySelectorAll('[role="tab"]'));
    add(document.querySelectorAll('summary'));  // <details>/<summary> native disclosure

    // Generate stable selectors
    const out = [];
    for (const el of candidates) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      // Only toggles in or near viewport — avoid scrolling all over
      if (r.top < -200 || r.top > window.innerHeight * 3) continue;

      let sel;
      if (el.id) sel = `#${CSS.escape(el.id)}`;
      else {
        const path = [];
        let cur = el;
        while (cur && cur !== document.body && path.length < 6) {
          const tag = cur.tagName.toLowerCase();
          const parent = cur.parentElement;
          if (!parent) break;
          const sameTag = [...parent.children].filter(c => c.tagName === cur.tagName);
          const idx = sameTag.indexOf(cur) + 1;
          path.unshift(`${tag}:nth-of-type(${idx})`);
          cur = parent;
        }
        sel = path.join(" > ");
      }

      out.push({
        selector: sel,
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40),
        ariaLabel: el.getAttribute("aria-label") || "",
        ariaHaspopup: el.getAttribute("aria-haspopup") || "",
        ariaExpanded: el.getAttribute("aria-expanded") || "",
        role: el.getAttribute("role") || "",
        rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      });
      if (out.length >= max) break;
    }
    return out;
  }, MAX_TOGGLES);

  console.log(`  ${toggles.length} toggle candidates identified`);

  // Step 2: For each toggle, click + measure + close
  const states = [];
  for (let i = 0; i < toggles.length; i++) {
    const t = toggles[i];
    try {
      // Install mutation observer + capture before snapshot
      await page.evaluate(() => {
        window.__sigma_v99_mutations = 0;
        window.__sigma_v99_addedNodes = [];
        if (window.__sigma_v99_observer) {
          try { window.__sigma_v99_observer.disconnect(); } catch {}
        }
        window.__sigma_v99_observer = new MutationObserver((muts) => {
          window.__sigma_v99_mutations += muts.length;
          for (const m of muts) {
            for (const n of m.addedNodes || []) {
              if (n.nodeType === 1 && window.__sigma_v99_addedNodes.length < 50) {
                // v99-1+ capture 강화: outerHTML도 보존 (emit 시 정확한 펼침 panel 재현)
                let outerHtml = "";
                try {
                  outerHtml = (n.outerHTML || "").slice(0, 4000);
                } catch {}
                window.__sigma_v99_addedNodes.push({
                  tag: n.tagName?.toLowerCase() || "?",
                  cls: (n.className || "").toString().slice(0, 80),
                  id: n.id || null,
                  text: (n.textContent || "").trim().slice(0, 200),
                  outerHtml,
                  childCount: n.children?.length || 0,
                });
              }
            }
          }
        });
        window.__sigma_v99_observer.observe(document.body, {
          childList: true, subtree: true, attributes: true,
        });
      });

      const beforeSnap = await captureCompactDom(page);

      // Click via CDP for higher reliability than page.click
      const clickX = t.rect.x + Math.floor(t.rect.w / 2);
      const clickY = t.rect.y + Math.floor(t.rect.h / 2);
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mousePressed", x: clickX, y: clickY, button: "left", clickCount: 1,
      });
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseReleased", x: clickX, y: clickY, button: "left", clickCount: 1,
      });

      await new Promise(r => setTimeout(r, WAIT_MS));

      const result = await page.evaluate(() => {
        const c = window.__sigma_v99_mutations || 0;
        const added = (window.__sigma_v99_addedNodes || []).slice();
        if (window.__sigma_v99_observer) {
          window.__sigma_v99_observer.disconnect();
          delete window.__sigma_v99_observer;
        }
        return { mutationCount: c, addedNodes: added };
      });

      if (result.mutationCount < MIN_MUTATIONS) {
        states.push({
          triggerIdx: i,
          selector: t.selector,
          triggerText: t.text || t.ariaLabel,
          role: t.role,
          mutationCount: result.mutationCount,
          stateChanged: false,
          note: "click made no measurable DOM change",
        });
        // No close needed
        continue;
      }

      const afterSnap = await captureCompactDom(page);
      const afterAria = await page.evaluate((sel) => {
        try {
          const el = document.querySelector(sel);
          return {
            ariaExpanded: el?.getAttribute("aria-expanded") || null,
            visibleNew: [...document.querySelectorAll('[aria-modal="true"], dialog[open], [role="dialog"]:not([aria-hidden="true"])')].length,
          };
        } catch { return { ariaExpanded: null, visibleNew: 0 }; }
      }, t.selector);

      states.push({
        triggerIdx: i,
        selector: t.selector,
        triggerText: t.text || t.ariaLabel,
        role: t.role,
        mutationCount: result.mutationCount,
        addedNodesSample: result.addedNodes.slice(0, 10),
        stateChanged: true,
        beforeDomSize: beforeSnap.size,
        afterDomSize: afterSnap.size,
        domDelta: afterSnap.size - beforeSnap.size,
        addedTags: diffTagFreq(beforeSnap.tagFreq, afterSnap.tagFreq),
        afterAriaExpanded: afterAria.ariaExpanded,
        modalLikeOpened: afterAria.visibleNew > 0,
      });

      // Close: ESC first (covers most modals), then click again if still open
      try {
        await page.keyboard.press("Escape");
        await new Promise(r => setTimeout(r, 250));
        const stillOpen = await page.evaluate((sel) => {
          try {
            const el = document.querySelector(sel);
            return el?.getAttribute("aria-expanded") === "true" ||
                   document.querySelectorAll('[aria-modal="true"], dialog[open]').length > 0;
          } catch { return false; }
        }, t.selector);
        if (stillOpen) {
          await cdp.send("Input.dispatchMouseEvent", {
            type: "mousePressed", x: clickX, y: clickY, button: "left", clickCount: 1,
          });
          await cdp.send("Input.dispatchMouseEvent", {
            type: "mouseReleased", x: clickX, y: clickY, button: "left", clickCount: 1,
          });
          await new Promise(r => setTimeout(r, 300));
        }
      } catch {}

    } catch (e) {
      states.push({
        triggerIdx: i,
        selector: t.selector,
        triggerText: t.text || t.ariaLabel,
        error: String(e.message || e).slice(0, 80),
      });
    }
  }

  extracted.multiStateDOMs = states;
  const changed = states.filter(s => s.stateChanged).length;
  const dur = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  ${changed}/${toggles.length} toggles caused DOM state change (${dur}s)`);

  if (!extracted.timing) extracted.timing = {};
  extracted.timing.multiState = Date.now() - t0;

  return states;
}

async function captureCompactDom(page) {
  return page.evaluate(() => {
    const tagFreq = {};
    let count = 0;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const t = walker.currentNode.tagName.toLowerCase();
      tagFreq[t] = (tagFreq[t] || 0) + 1;
      count++;
    }
    return { size: count, tagFreq };
  });
}

function diffTagFreq(before, after) {
  const out = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    const delta = (after[k] || 0) - (before[k] || 0);
    if (delta !== 0) out[k] = delta;
  }
  return out;
}
