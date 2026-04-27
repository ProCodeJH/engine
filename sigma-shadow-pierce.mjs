#!/usr/bin/env node
// sigma-shadow-pierce.mjs — v101-1 Closed Shadow DOM Penetration via CDP
//
// 자현 ultrathink: closed Shadow DOM은 PHYSICAL_IMPOSSIBLE이 아니라
// SOLVABLE_PARTIAL. Chrome DevTools 자체가 closed shadow를 본다 — 즉
// CDP에 우회 경로가 있다. v98은 closedShadowCount만(카운트), v101은
// 진짜 내부 DOM 노출.
//
// Mechanism:
//   - CDP DOM.getDocument {depth: -1, pierce: true} 는 closed shadow root
//     포함한 전체 트리 반환. browser-side JS 에서 element.shadowRoot 는
//     null이지만 protocol은 모든 attached shadow를 보여줌 (DevTools 자체가
//     이걸로 구현됨).
//   - 각 closed shadow의 host element + 내부 children 구조 + computed
//     style 추출 가능.
//
// Output: extracted.closedShadowPierced = {
//   totalNodes: int,
//   openShadowCount: int,
//   closedShadowCount: int,
//   piercedNodeCount: int,
//   detail: [{ host, hostSelector, shadowChildCount, children, ... }]
// }

export async function pierceClosedShadows(page, cdp, extracted, opts = {}) {
  const t0 = Date.now();
  const MAX_DETAIL = opts.maxDetail ?? 30;

  console.log(`[v101-1] CLOSED SHADOW PIERCE`);

  let root;
  try {
    const result = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
    root = result.root;
  } catch (e) {
    console.log(`  v101-1 DOM.getDocument failed: ${e.message.slice(0, 80)}`);
    return null;
  }

  let totalNodes = 0;
  let openShadowCount = 0;
  let closedShadowCount = 0;
  let piercedNodeCount = 0;
  const detail = [];

  function countSubtree(node) {
    let n = 1;
    if (node.children) for (const c of node.children) n += countSubtree(c);
    if (node.shadowRoots) for (const sr of node.shadowRoots) n += countSubtree(sr);
    return n;
  }

  function compactChildren(node, depth = 0, max = 12) {
    if (depth > 4) return [];
    const out = [];
    for (const c of (node.children || [])) {
      if (out.length >= max) break;
      const item = {
        nodeName: c.localName || c.nodeName?.toLowerCase() || "?",
        attrs: arrToObj(c.attributes || []),
      };
      // text
      if (c.nodeName === "#text" || c.nodeType === 3) {
        item.text = (c.nodeValue || "").trim().slice(0, 80);
      }
      // recurse
      const sub = compactChildren(c, depth + 1, Math.max(2, max - 4));
      if (sub.length > 0) item.children = sub;
      out.push(item);
    }
    return out;
  }

  function arrToObj(arr) {
    const o = {};
    for (let i = 0; i < arr.length - 1; i += 2) o[arr[i]] = String(arr[i + 1] || "").slice(0, 100);
    return o;
  }

  function buildSelector(node, ancestors = []) {
    const tag = node.localName || "?";
    const id = (node.attributes || []).reduce((acc, v, i, arr) => {
      if (i % 2 === 0 && v === "id") return arr[i + 1];
      return acc;
    }, null);
    if (id) return `#${id}`;
    return ancestors.length > 0 ? ancestors.concat([tag]).join(" > ").slice(0, 200) : tag;
  }

  function walk(node, ancestors = []) {
    totalNodes++;
    const localName = node.localName || node.nodeName?.toLowerCase();
    if (localName) ancestors = [...ancestors, localName];

    if (node.shadowRoots && node.shadowRoots.length > 0) {
      for (const sr of node.shadowRoots) {
        if (sr.shadowRootType === "closed") {
          closedShadowCount++;
          const subtreeSize = countSubtree(sr);
          piercedNodeCount += subtreeSize;
          if (detail.length < MAX_DETAIL) {
            detail.push({
              host: localName || "?",
              hostSelector: buildSelector(node, ancestors.slice(0, -1)),
              shadowChildCount: (sr.children || []).length,
              piercedSubtreeSize: subtreeSize,
              children: compactChildren(sr, 0, 8),
            });
          }
          // Recurse into closed shadow tree
          walk(sr, ancestors);
        } else {
          openShadowCount++;
          walk(sr, ancestors);
        }
      }
    }
    for (const c of (node.children || [])) walk(c, ancestors);
  }

  walk(root);

  extracted.closedShadowPierced = {
    totalNodes,
    openShadowCount,
    closedShadowCount,
    piercedNodeCount,
    detail,
  };

  if (!extracted.timing) extracted.timing = {};
  extracted.timing.shadowPierce = Date.now() - t0;

  const dur = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  ${closedShadowCount} closed + ${openShadowCount} open shadows / ${piercedNodeCount} pierced nodes / ${detail.length} detail (${dur}s)`);
  return extracted.closedShadowPierced;
}
