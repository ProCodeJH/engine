#!/usr/bin/env node
// sigma-composite-score.mjs — Paradigm 134 — Weighted Composite Production Score
//
// 자현 비전 정확 측정. verify-cascade의 8 binary stages → weighted partial.
// 각 stage의 partial score + 가중치 → 진짜 정확 0-100%.
//
// Weights (자현 비즈니스 우선순위):
//   Visual    30%  — 시각 일치 (자현이 본 결과)
//   License   15%  — Cleanroom 인증
//   Motion    15%  — 모션 working
//   Korean    10%  — 콘텐츠 진짜
//   A11y      10%  — WCAG compliance
//   SEO       10%  — Google/Naver
//   HTTP       5%  — 기본 작동
//   Identifier 5%  — Platform 흔적 0
//
// 출력: COMPOSITE-SCORE.md + .json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEIGHTS = {
  visual: 0.30,
  license: 0.15,
  motion: 0.15,
  korean: 0.10,
  a11y: 0.10,
  seo: 0.10,
  http: 0.05,
  identifier: 0.05,
};

export function computeCompositeScore(verifyResult) {
  const stages = verifyResult.stages || {};
  const partial = {};

  // HTTP — routes200 / routesChecked
  if (stages.http) {
    const r = stages.http.routesChecked || 1;
    partial.http = +((stages.http.routes200 / r) * 100).toFixed(1);
  } else partial.http = 0;

  // Korean — 3 sub-checks
  if (stages.korean) {
    const ko = stages.korean;
    partial.korean = +(((ko.koreanFound ? 100 : 0) +
                        (ko.loremFound ? 0 : 100) +
                        (ko.workAboutFound ? 0 : 100)) / 3).toFixed(1);
  } else partial.korean = 0;

  // Visual — composite confidence (P102 4-layer)
  if (stages.visual) {
    partial.visual = stages.visual.composite || 0;
    if (stages.visual.error) partial.visual = 0;
  } else partial.visual = 0;

  // Motion — log scale (css count + gsap + js + transitions)
  if (stages.motion) {
    const m = stages.motion;
    let score = 0;
    if (m.cssKeyframes > 0) score += Math.min(40, Math.log2(m.cssKeyframes + 1) * 8);
    if (m.gsapDetected) score += 25;
    if (m.lenisDetected) score += 15;
    if (m.jsAnimations > 0) score += Math.min(15, m.jsAnimations * 2);
    if (m.transitions > 0) score += Math.min(15, m.transitions / 10);
    partial.motion = +Math.min(score, 100).toFixed(1);
  } else partial.motion = 0;

  // A11y — 3 sub-checks weighted
  if (stages.a11y) {
    const a = stages.a11y;
    partial.a11y = +(((a.missingAlt === 0 ? 100 : Math.max(0, 100 - a.missingAlt * 5)) * 0.4 +
                      (a.hasSkipLink ? 100 : 0) * 0.3 +
                      (a.hasAriaLabel ? 100 : 0) * 0.3)).toFixed(1);
  } else partial.a11y = 0;

  // SEO — 4 sub-checks (title/og/jsonLd/sitemap)
  if (stages.seo) {
    const s = stages.seo;
    partial.seo = +(((s.hasTitle ? 100 : 0) + (s.hasOG ? 100 : 0) +
                     (s.hasJsonLd ? 100 : 0) + (s.hasSitemap ? 100 : 0)) / 4).toFixed(1);
  } else partial.seo = 0;

  // Identifier — penalty per count (max 50 → 0%)
  if (stages.identifier) {
    const id = stages.identifier;
    const total = id.framerCount + id.wixCount + id.webflowCount;
    partial.identifier = +(Math.max(0, 100 - total * 2)).toFixed(1);
  } else partial.identifier = 0;

  // License — P145 True Cleanroom: audit 기반 (정직), fallback omega-fusion (관대)
  if (verifyResult._auditOverride) {
    // P141 audit determination 우선 (정직 측정)
    const det = verifyResult._auditOverride.determination;
    partial.license = det === "PASS" ? 100 : det === "REVIEW" ? 70 : 30;
  } else if (stages.license) {
    const l = stages.license;
    if (l.passed) partial.license = l.anyReview ? 70 : 100;
    else if (l.certClean || l.certCleanOmega || l.certCeiling || l.certOmniclone) partial.license = 50;
    else partial.license = 0;
  } else partial.license = 0;

  // Weighted composite
  let composite = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    composite += (partial[k] || 0) * w;
  }
  composite = +composite.toFixed(1);

  return {
    partial,
    weights: WEIGHTS,
    composite,
    interpretation: composite >= 90 ? "PRODUCTION_READY" :
                    composite >= 75 ? "PRODUCTION_CAUTION" :
                    composite >= 60 ? "MANUAL_REVIEW" :
                    composite >= 40 ? "MAJOR_FIX_NEEDED" :
                                       "NOT_READY",
    binaryScore: verifyResult.overallScore || 0,
    improvement: +(composite - (verifyResult.overallScore || 0)).toFixed(1),
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-composite-score.mjs <projectDir>");
    process.exit(1);
  }
  const certPath = path.join(projDir, "CERT-VERIFICATION-CASCADE.md");
  if (!fs.existsSync(certPath)) {
    console.error("no CERT-VERIFICATION-CASCADE.md — run sigma-verify-cascade first");
    process.exit(1);
  }
  // Re-run verify if needed, or parse last result
  // Easier: import + re-run
  import("./sigma-verify-cascade.mjs").then(async (mod) => {
    const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };
    const sourceUrl = flagVal("--source-url");
    const port = parseInt(flagVal("--port") || "3150", 10);
    const strictLicense = process.argv.includes("--strict-license");

    const r = await mod.verifyCascade(projDir, { sourceUrl, port });

    // P145 True Cleanroom: --strict-license 시 audit 결과로 license 재계산
    if (strictLicense) {
      try {
        const { auditAssets } = await import("./sigma-asset-audit.mjs");
        const audit = auditAssets(projDir);
        if (!audit.error) {
          r._auditOverride = audit;
          console.log(`[strict-license] audit=${audit.determination} sourcePct=${audit.stats.sourcePct}%`);
        }
      } catch (e) { console.log(`[strict-license] failed: ${e.message}`); }
    }

    const c = computeCompositeScore(r);

    const lines = [
      "# COMPOSITE-SCORE — Weighted Production Score (Paradigm 134)",
      "",
      `Generated: ${new Date().toISOString()}`,
      `Project: ${projDir}`,
      `Source: ${sourceUrl || "(none)"}`,
      "",
      "## Composite Score",
      "",
      `### **${c.composite}%** — ${c.interpretation}`,
      "",
      `Binary score (8 stages): ${c.binaryScore}%`,
      `Composite (weighted partial): **${c.composite}%**`,
      `Improvement: ${c.improvement >= 0 ? "+" : ""}${c.improvement}%p`,
      "",
      "## Per-Stage Partial Scores",
      "",
      "| Stage | Partial | Weight | Contribution |",
      "|---|---|---|---|",
      ...Object.entries(WEIGHTS).map(([k, w]) => {
        const p = c.partial[k] || 0;
        return `| ${k} | ${p}% | ${(w * 100).toFixed(0)}% | ${(p * w).toFixed(1)} |`;
      }),
      `| **Total** | — | 100% | **${c.composite}** |`,
      "",
      "## Interpretation",
      "",
      "- **PRODUCTION_READY** (≥90%) — client deploy 즉시",
      "- **PRODUCTION_CAUTION** (75-89%) — manual review 후 deploy",
      "- **MANUAL_REVIEW** (60-74%) — paradigm 추가 적용 권장",
      "- **MAJOR_FIX_NEEDED** (40-59%) — 큰 결손 fix 필요",
      "- **NOT_READY** (<40%) — paradigm 변경 또는 거절",
      "",
      "## 자현 비즈니스 결정",
      "",
      c.composite >= 90 ? "✅ DEPLOY 즉시 — production-ready" :
      c.composite >= 75 ? "⚠ DEPLOY caution — client에 안내" :
      c.composite >= 60 ? "🔧 추가 paradigm 적용 권장:" : "❌ 결손 큼 — 거절 또는 paradigm 변경",
      "",
      ...(c.composite < 75 ? Object.entries(c.partial)
        .filter(([k, v]) => v < 75)
        .map(([k, v]) => `  - ${k} (${v}%) — ${k === "visual" ? "Vision P2 또는 자현 자산 swap" : k === "a11y" ? "sigma-omega-enhance" : k === "motion" ? "sigma-animation-graph" : k === "license" ? "sigma-omega-fusion" : "manual fix"}`) : []),
    ];
    fs.writeFileSync(path.join(projDir, "COMPOSITE-SCORE.md"), lines.join("\n"));
    fs.writeFileSync(path.join(projDir, "COMPOSITE-SCORE.json"), JSON.stringify(c, null, 2));

    console.log(`[composite-score] Binary ${c.binaryScore}% → Composite ${c.composite}% (${c.interpretation})`);
    console.log(`  Partial: ${Object.entries(c.partial).map(([k, v]) => `${k}=${v}`).join(" ")}`);
    console.log(`  → COMPOSITE-SCORE.md + .json`);
  });
}
