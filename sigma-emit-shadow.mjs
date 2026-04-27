#!/usr/bin/env node
// sigma-emit-shadow.mjs — v101-2 Closed Shadow content inline emit
//
// extracted.closedShadowPierced → ShadowInline.tsx + ShadowMeta.json.
// Shadow는 인캡슐레이션 도구 — 클론 시 의미 없음. 그래서 일반 React로
// inline 변환. 측정된 shadow 내용을 sections로 emit.
//
// 가장 단순한 emit wiring — pierced 데이터만 React node tree로 변환.

import fs from "node:fs";
import path from "node:path";

export function emitShadowContent(extracted, projDir) {
  const sp = extracted.closedShadowPierced;
  if (!sp || !sp.detail || sp.detail.length === 0) return { emitted: 0 };

  const compDir = path.join(projDir, "src", "components", "shadow");
  fs.mkdirSync(compDir, { recursive: true });

  let emitted = 0;
  for (let i = 0; i < sp.detail.length; i++) {
    const d = sp.detail[i];
    const tsx = `// v101-2 Pierced shadow content — host: <${d.host}> selector: ${d.hostSelector.slice(0, 80)}
// Originally inside closed Shadow DOM — emitted as inline (shadow encapsulation
// is a runtime concern, not a clone concern). ${d.shadowChildCount} direct children,
// ${d.piercedSubtreeSize} total pierced nodes.

export default function ShadowContent${i}() {
  return (
    <div className="sigma-shadow-inlined" data-shadow-host="${d.host}" data-shadow-idx="${i}">
${(d.children || []).map(c => renderNode(c, "      ")).join("\n")}
    </div>
  );
}
`;
    fs.writeFileSync(path.join(compDir, `ShadowContent${i}.tsx`), tsx);
    emitted++;
  }

  const indexLines = Array.from({ length: emitted }, (_, i) =>
    `export { default as ShadowContent${i} } from "./ShadowContent${i}";`
  );
  fs.writeFileSync(path.join(compDir, "index.ts"), indexLines.join("\n") + "\n");

  return { emitted, dir: compDir };
}

function renderNode(node, indent = "  ", depth = 0) {
  if (depth > 5) return `${indent}{/* ... */}`;
  const tag = (node.nodeName || "div").toLowerCase();
  const safeTag = /^[a-z][a-z0-9-]*$/.test(tag) ? tag : "div";

  const attrs = [];
  for (const [k, v] of Object.entries(node.attrs || {})) {
    if (k === "class") attrs.push(`className="${escapeAttr(v)}"`);
    else if (k.startsWith("on")) continue;  // skip event handlers
    else if (/^[a-z][a-z0-9-]*$/.test(k)) attrs.push(`${camelCase(k)}="${escapeAttr(v)}"`);
  }
  const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";

  if (node.text && (!node.children || node.children.length === 0)) {
    return `${indent}<${safeTag}${attrStr}>${escapeText(node.text)}</${safeTag}>`;
  }
  if (!node.children || node.children.length === 0) {
    return `${indent}<${safeTag}${attrStr} />`;
  }
  const inner = node.children.map(c => renderNode(c, indent + "  ", depth + 1)).join("\n");
  return `${indent}<${safeTag}${attrStr}>\n${inner}\n${indent}</${safeTag}>`;
}

function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;").replace(/\n/g, " ").slice(0, 200);
}
function escapeText(s) {
  return String(s)
    .replace(/[<>{}]/g, m => ({ "<": "&lt;", ">": "&gt;", "{": "&#123;", "}": "&#125;" }[m]))
    .slice(0, 300);
}
function camelCase(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
