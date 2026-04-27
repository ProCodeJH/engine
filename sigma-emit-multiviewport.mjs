#!/usr/bin/env node
// sigma-emit-multiviewport.mjs — v100-2 Viewport-keyed component emit
//
// extracted.multiViewportReal → ViewportBranch.tsx + responsive utilities.
// 모바일/태블릿/데스크톱 nav 구조가 진짜 다르면 (hamburger vs inline,
// drawer vs panel) Tailwind hidden md:block 패턴으로 분기 emit.
// Hydration mismatch 회피 — 두 nav 다 렌더하고 CSS @media로 보이는 거만.

import fs from "node:fs";
import path from "node:path";

export function emitMultiViewport(extracted, projDir) {
  const mvr = extracted.multiViewportReal;
  if (!mvr || !mvr.diffSummary) return { emitted: 0 };

  const compDir = path.join(projDir, "src", "components", "viewport");
  fs.mkdirSync(compDir, { recursive: true });

  // Detect actual differences worth emitting
  const significantDiff = Object.values(mvr.diffSummary).some(d =>
    d?.navStructureChanged || d?.layoutSignatureChanged
  );
  if (!significantDiff) {
    // No meaningful difference — single component sufficient
    return { emitted: 0, note: "viewports converged — no separate emit needed" };
  }

  const desktop = mvr.desktopReference;
  const mobile = mvr.mobile;
  const tablet = mvr.tablet;

  // Build nav metadata
  const navMeta = {
    desktopInlineCount: desktop?.navStructure?.navInlineCount || 0,
    mobileInlineCount: mobile?.navStructure?.navInlineCount || 0,
    mobileHamburger: !!mobile?.navStructure?.hamburgerVisible,
    mobileDrawer: !!mobile?.navStructure?.drawerVisible,
    tabletInlineCount: tablet?.navStructure?.navInlineCount || 0,
  };

  const tsx = `"use client";
// v100-2 Viewport-keyed nav component — captured from real reload per viewport
// Desktop nav inline count: ${navMeta.desktopInlineCount}
// Mobile: hamburger=${navMeta.mobileHamburger}, drawer=${navMeta.mobileDrawer}, inline=${navMeta.mobileInlineCount}
// Tablet inline count: ${navMeta.tabletInlineCount}

import { useState } from "react";

export default function ViewportNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <>
      {/* Desktop / tablet inline nav (md and up) */}
      <nav className="hidden md:flex sigma-nav-desktop" aria-label="primary">
        <span className="text-sm opacity-60">desktop nav (${navMeta.desktopInlineCount} items)</span>
        {/* TODO: 자현이 inline links 채움 */}
      </nav>

      {/* Mobile hamburger + drawer (below md) */}
      <div className="md:hidden sigma-nav-mobile">
        ${navMeta.mobileHamburger ? `
        <button
          type="button"
          aria-label="open navigation drawer"
          aria-expanded={drawerOpen}
          aria-controls="sigma-mobile-drawer"
          onClick={() => setDrawerOpen((o) => !o)}
          className="sigma-hamburger"
        >
          <span className="sigma-hamburger-icon" aria-hidden="true">☰</span>
        </button>
        {drawerOpen && (
          <aside
            id="sigma-mobile-drawer"
            role="navigation"
            aria-label="mobile primary"
            className="sigma-mobile-drawer fixed inset-y-0 right-0 w-3/4 max-w-xs bg-white shadow-xl z-50"
          >
            <button
              type="button"
              aria-label="close drawer"
              onClick={() => setDrawerOpen(false)}
              className="absolute top-4 right-4"
            >
              ×
            </button>
            <nav className="p-6 space-y-3">
              {/* TODO: 자현이 mobile nav links 채움 */}
            </nav>
          </aside>
        )}` : `
        <nav className="sigma-mobile-inline">
          <span className="text-sm opacity-60">mobile inline (${navMeta.mobileInlineCount})</span>
        </nav>`}
      </div>
    </>
  );
}
`;
  fs.writeFileSync(path.join(compDir, "ViewportNav.tsx"), tsx);

  // Layout signature meta for debugging / dev inspection
  const meta = {
    desktopReference: desktop,
    mobile: mobile,
    tablet: tablet,
    diffSummary: mvr.diffSummary,
  };
  fs.writeFileSync(path.join(compDir, "viewport-meta.json"), JSON.stringify(meta, null, 2));

  return { emitted: 1, dir: compDir, navMeta };
}
