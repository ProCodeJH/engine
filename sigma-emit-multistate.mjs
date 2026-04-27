#!/usr/bin/env node
// sigma-emit-multistate.mjs — v99-2 Multi-state DOM emit wiring
//
// extracted.multiStateDOMs (v99-1 capture) → MultiState{i}.tsx 컴포넌트.
// 각 토글마다 펼침/닫힘 상태를 React state로 토글. addedNodes의 outerHTML을
// dangerouslySetInnerHTML로 emit (v99-1 강화 capture 활용).
//
// SOLVABLE_PARTIAL → RESOLVED 첫 진짜 이동.

import fs from "node:fs";
import path from "node:path";

export function emitMultiState(extracted, projDir) {
  const states = (extracted.multiStateDOMs || []).filter(s => s.stateChanged);
  if (states.length === 0) return { emitted: 0 };

  const compDir = path.join(projDir, "src", "components", "multistate");
  fs.mkdirSync(compDir, { recursive: true });

  let emitted = 0;
  for (let i = 0; i < states.length; i++) {
    const s = states[i];
    const safeTrigger = (s.triggerText || `Toggle ${i + 1}`)
      .replace(/[^\w가-힣\s]/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 40);

    // Combine added nodes' outerHTML — 펼침 panel의 진짜 DOM 재현
    const addedHtml = (s.addedNodesSample || [])
      .filter(n => n.outerHtml && n.outerHtml.length > 10)
      .map(n => n.outerHtml)
      .join("\n");

    // Sanitize HTML for React inline (escape script tags + on* handlers)
    const sanitized = (addedHtml || "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/\son\w+="[^"]*"/gi, "")
      .replace(/\son\w+='[^']*'/gi, "")
      .replace(/`/g, "\\`");

    const triggerLabel = (s.triggerText || s.role || "Toggle").slice(0, 30);
    const tsx = `"use client";
// v99-2 Multi-state component — captured from interaction with selector:
//   ${s.selector.slice(0, 80)}
// Mutation count: ${s.mutationCount}, DOM delta: ${s.domDelta}
// ARIA: ${s.afterAriaExpanded ? `aria-expanded → ${s.afterAriaExpanded}` : "(none)"}
// Modal-like: ${s.modalLikeOpened ? "yes (focus trap recommended)" : "no"}

import { useState } from "react";

export default function MultiState${i}() {
  const [open, setOpen] = useState(false);
  return (
    <div className="sigma-multistate" data-multistate-idx="${i}">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="sigma-multistate-panel-${i}"
        onClick={() => setOpen((o) => !o)}
        className="sigma-multistate-trigger"
      >
        ${triggerLabel.replace(/"/g, '\\"')}
      </button>
      {open && (
        <div
          id="sigma-multistate-panel-${i}"
          className="sigma-multistate-panel"
          ${s.modalLikeOpened ? `role="dialog" aria-modal="true"` : ""}
          dangerouslySetInnerHTML={{ __html: \`${sanitized}\` }}
        />
      )}
    </div>
  );
}
`;
    fs.writeFileSync(path.join(compDir, `MultiState${i}.tsx`), tsx);
    emitted++;
  }

  // Index file for easy import
  const indexLines = states.map((_, i) => `export { default as MultiState${i} } from "./MultiState${i}";`);
  fs.writeFileSync(path.join(compDir, "index.ts"), indexLines.join("\n") + "\n");

  return { emitted, dir: compDir };
}
