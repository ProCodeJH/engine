#!/usr/bin/env node
// sigma-fleet-dashboard.mjs — Paradigm 143 — Multi-Site Composite Dashboard
//
// 자현 비전 "모든 사이트들 복제화 100%" universality 검증.
//
// 명령: node sigma-fleet-dashboard.mjs <engine-dir>
//   → 모든 omega-* 디렉토리 스캔
//   → 각 사이트의 ASSET-AUDIT.md + COMPOSITE-SCORE.md 읽음
//   → 단일 FLEET-DASHBOARD.md 생성
//
// 보고서 내용:
//   1. 전체 fleet 요약 (8 사이트 평균)
//   2. 사이트별 점수 비교 (composite/visual/license/audit)
//   3. universality patterns (어떤 paradigm이 어디서 효과)
//   4. 자현 우선순위 (가장 production-ready 가까운 사이트 vs 가장 멀리 있는 사이트)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function buildFleetDashboard(engineDir) {
  const sites = [];
  for (const entry of fs.readdirSync(engineDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith("omega-")) continue;
    const dir = path.join(engineDir, entry.name);
    const composePath = path.join(dir, "COMPOSITE-SCORE.json");
    const auditPath = path.join(dir, "ASSET-AUDIT.json");

    const site = { name: entry.name, dir };
    if (fs.existsSync(composePath)) {
      try {
        site.composite = JSON.parse(fs.readFileSync(composePath, "utf-8"));
      } catch {}
    }
    if (fs.existsSync(auditPath)) {
      try {
        site.audit = JSON.parse(fs.readFileSync(auditPath, "utf-8"));
      } catch {}
    }
    sites.push(site);
  }

  // Fleet stats
  const composedSites = sites.filter(s => s.composite);
  const auditedSites = sites.filter(s => s.audit);
  const avgComposite = composedSites.length > 0
    ? composedSites.reduce((s, x) => s + x.composite.composite, 0) / composedSites.length
    : 0;
  const avgVisual = composedSites.length > 0
    ? composedSites.reduce((s, x) => s + (x.composite.partial?.visual || 0), 0) / composedSites.length
    : 0;
  const avgSourcePct = auditedSites.length > 0
    ? auditedSites.reduce((s, x) => s + x.audit.stats.sourcePct, 0) / auditedSites.length
    : 0;

  // Sort sites by composite (best first)
  const ranked = [...composedSites].sort((a, b) => b.composite.composite - a.composite.composite);

  return {
    siteCount: sites.length,
    composedCount: composedSites.length,
    auditedCount: auditedSites.length,
    avgComposite: +avgComposite.toFixed(1),
    avgVisual: +avgVisual.toFixed(1),
    avgSourcePct: +avgSourcePct.toFixed(1),
    sites,
    ranked,
  };
}

export function emitFleetDashboard(engineDir, fleet) {
  const lines = [
    "# FLEET DASHBOARD — Multi-Site Composite (Paradigm 143)",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Engine dir: ${engineDir}`,
    `Sites scanned: ${fleet.siteCount}`,
    `Composite scored: ${fleet.composedCount}`,
    `Asset audited: ${fleet.auditedCount}`,
    "",
    "## Fleet Summary",
    "",
    `- Avg composite score: **${fleet.avgComposite}%**`,
    `- Avg visual partial: ${fleet.avgVisual}%`,
    `- Avg source-derived: **${fleet.avgSourcePct}%** (license risk)`,
    "",
    "## Site Ranking (composite score)",
    "",
    "| Rank | Site | Composite | Visual | License | A11y | Audit | Source% |",
    "|---|---|---|---|---|---|---|---|",
    ...fleet.ranked.map((s, i) => {
      const c = s.composite;
      const a = s.audit;
      return `| ${i + 1} | ${s.name} | ${c.composite}% (${c.interpretation}) | ${c.partial?.visual || "?"}% | ${c.partial?.license || "?"}% | ${c.partial?.a11y || "?"}% | ${a?.determination || "?"} | ${a?.stats?.sourcePct || "?"}% |`;
    }),
    "",
    "## Sites without composite score",
    "",
    ...sites_without_composite(fleet),
    "",
    "## 자현 비즈니스 우선순위",
    "",
    "### 가장 production-ready 가까운 사이트 (deploy 후보)",
    "",
    fleet.ranked.slice(0, 3).map(s =>
      `- **${s.name}**: ${s.composite.composite}% ${s.composite.interpretation} — ${s.audit ? `audit ${s.audit.determination}` : "audit 안 됨"}`
    ).join("\n"),
    "",
    "### 가장 멀리 있는 사이트 (paradigm 추가 적용 권장)",
    "",
    fleet.ranked.slice(-3).reverse().map(s =>
      `- **${s.name}**: ${s.composite.composite}% ${s.composite.interpretation}`
    ).join("\n"),
    "",
    "## Universality 결론",
    "",
    fleet.avgSourcePct > 80
      ? "🔍 **모든 사이트가 평균 80%+ source-derived** — Omega 미러 본질. License 100% PASS 도달하려면 P142 asset-swap 또는 자현 자산 manual swap 필요."
      : fleet.avgSourcePct > 50
      ? "⚠ **사이트별 source-derived 편차 있음** — 일부 cleanroom regen 가능, 일부는 swap 필요."
      : "✅ **fleet 평균 cleanroom 양호** — license 안정.",
    "",
    "## 다음 paradigm 후보",
    "",
    "- P143 Generative Asset Replacement (Stable Diffusion + CC0): visual 보존 + license 100%",
    "- P144 Visual Ceiling Break (LPIPS perceptual metric): pixelmatch 한계 돌파",
    "- P145 Cross-Browser Render Lock: Chrome+Firefox 평균",
    "- P146 Live Data Mock Backend: form/auth/WebSocket 결정성",
    "",
  ];
  fs.writeFileSync(path.join(engineDir, "FLEET-DASHBOARD.md"), lines.join("\n"));
  fs.writeFileSync(path.join(engineDir, "FLEET-DASHBOARD.json"), JSON.stringify(fleet, null, 2));
}

function sites_without_composite(fleet) {
  const without = fleet.sites.filter(s => !s.composite);
  if (without.length === 0) return ["(none — 모든 사이트 composite 측정 완료)"];
  return without.map(s => `- ${s.name} — \`node sigma-composite-score.mjs ${s.name} --source-url <url>\``);
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const engineDir = path.resolve(process.argv[2] || ".");
  if (!fs.existsSync(engineDir)) {
    console.error("usage: node sigma-fleet-dashboard.mjs <engine-dir>");
    process.exit(1);
  }
  const fleet = buildFleetDashboard(engineDir);
  emitFleetDashboard(engineDir, fleet);
  console.log(`[fleet-dashboard] ${fleet.siteCount} sites scanned`);
  console.log(`  Composite measured: ${fleet.composedCount}`);
  console.log(`  Asset audited: ${fleet.auditedCount}`);
  console.log(`  Avg composite: ${fleet.avgComposite}%`);
  console.log(`  Avg source-derived: ${fleet.avgSourcePct}%`);
  console.log(`\n  Top 3:`);
  for (const s of fleet.ranked.slice(0, 3)) {
    console.log(`    ${s.name}: ${s.composite.composite}% ${s.composite.interpretation}`);
  }
  console.log(`  → FLEET-DASHBOARD.md + .json`);
}
