#!/usr/bin/env node
// sigma-emit-mutation-replay.mjs — Mutation Timeline 자체 React 재생
//
// 자현 비전: capture된 mutation timeline을 자체 React에서 같은 timing으로
// 재생. 시간 흐름 모션 (CSS class toggle, attribute 변화, 동적 텍스트 변화)
// 정확 재현. CSS animation/transition은 시간 매핑되어 자동 작동.
//
// 입력: extracted.mutationTimeline = [{ t, type, target, attr, newValue, ... }]
// 출력: src/components/MutationReplay.tsx + src/lib/mutation-timeline.json
//
// React 컴포넌트가 mount 후 timeline 재생 — setTimeout RAF 기반 정확 timing.

import fs from "node:fs";
import path from "node:path";

export function emitMutationReplay(extracted, projDir) {
  const timeline = extracted.mutationTimeline || [];
  if (timeline.length === 0) return { emitted: 0 };

  // Filter: keep meaningful mutations only
  const filtered = timeline.filter(m => {
    if (m.type === "attributes" && (m.attr === "style" || m.attr === "class" ||
        m.attr === "aria-expanded" || m.attr === "data-state" || m.attr?.startsWith("data-"))) {
      return true;
    }
    if (m.type === "characterData") return true;
    if (m.type === "childList" && (m.added?.length > 0 || m.removed?.length > 0)) return true;
    return false;
  }).slice(0, 1500);

  if (filtered.length === 0) return { emitted: 0 };

  const libDir = path.join(projDir, "src", "lib");
  fs.mkdirSync(libDir, { recursive: true });
  fs.writeFileSync(path.join(libDir, "mutation-timeline.json"), JSON.stringify(filtered));

  const compDir = path.join(projDir, "src", "components");
  fs.mkdirSync(compDir, { recursive: true });

  const tsx = `"use client";
// Sigma Mutation Replay — 시간 흐름 DOM 변화 자동 재생
// 자현 메모리 feedback-copyright + clone-engine-v21-findings:
// 정적 mirror 한계 → mutation timeline 재생으로 모션 80~90% 근접.

import { useEffect } from "react";
import timeline from "@/lib/mutation-timeline.json";

type MutationEntry = {
  t: number;
  type: string;
  target: string;
  attr?: string;
  newValue?: string;
  oldValue?: string;
  added?: string[];
  removed?: string[];
};

export default function MutationReplay() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timers: number[] = [];

    for (const m of timeline as MutationEntry[]) {
      const tid = window.setTimeout(() => {
        try {
          const els = document.querySelectorAll(m.target);
          if (els.length === 0) return;
          for (const el of els) {
            if (m.type === "attributes" && m.attr && m.newValue !== undefined) {
              if (m.newValue) el.setAttribute(m.attr, m.newValue);
              else el.removeAttribute(m.attr);
            } else if (m.type === "characterData" && m.newValue !== undefined) {
              if (el.firstChild && el.firstChild.nodeType === 3) {
                el.firstChild.nodeValue = m.newValue;
              } else {
                el.textContent = m.newValue;
              }
            }
            // childList replay 생략 — 새 element 생성 위험
          }
        } catch {}
      }, m.t);
      timers.push(tid);
    }

    return () => { for (const tid of timers) window.clearTimeout(tid); };
  }, []);

  return null;
}
`;
  fs.writeFileSync(path.join(compDir, "MutationReplay.tsx"), tsx);

  // layout.tsx에 자동 wrap 시도
  const layoutPath = path.join(projDir, "src", "app", "layout.tsx");
  if (fs.existsSync(layoutPath)) {
    let layout = fs.readFileSync(layoutPath, "utf-8");
    if (!layout.includes("MutationReplay")) {
      layout = layout.replace(
        /import MotionRoot from "@\/components\/MotionRoot";/,
        `import MotionRoot from "@/components/MotionRoot";\nimport MutationReplay from "@/components/MutationReplay";`
      );
      // Wrap children with MutationReplay (after MotionRoot)
      layout = layout.replace(
        /<MotionRoot>\{children\}<\/MotionRoot>/,
        `<MotionRoot><MutationReplay />{children}</MotionRoot>`
      );
      fs.writeFileSync(layoutPath, layout);
    }
  }

  return { emitted: 1, mutationsKept: filtered.length, mutationsTotal: timeline.length };
}
