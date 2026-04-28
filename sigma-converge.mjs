#!/usr/bin/env node
// sigma-converge.mjs — Paradigm 148 — Convergence Loop v2 (Honest)
//
// 자현 ultrathink "스스로 생각해서 창조": 한 명령에 엔진이 100% 도달까지 자율.
// P101 Self-Healing Loop은 8 binary stage 기반. P148은 P144+P145 honest 5-layer
// + audit 기반 convergence.
//
// Loop:
//   1. verify-cascade (P140 symmetric stack)
//   2. computeCompositeScore with --strict-license (audit-based)
//   3. if composite >= target (90%): DONE
//   4. find weakest stage (lowest partial)
//   5. apply paradigm based on weakest:
//      - visual<75: deeper P135-P138 inject + multi-state capture trigger
//      - license<100: P142 swap OR P147 brand-kit (자현 결정 또는 default)
//      - a11y<80: P138 enrich
//      - motion<70: P136 reveal deeper
//      - identifier<100: sigma-decouple
//      - korean<100: sigma-anonymize-links
//   6. re-verify
//   7. if no improvement after 2 iter: STOP (architectural ceiling)
//   8. max 10 iter
//
// 자현 비전: 엔진이 honest 90% 도달까지 자율 ↔ 자현 결정 필요 시 prompt.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { verifyCascade } from "./sigma-verify-cascade.mjs";
import { computeCompositeScore } from "./sigma-composite-score.mjs";
import { auditAssets } from "./sigma-asset-audit.mjs";
import { swapAssets } from "./sigma-asset-swap.mjs";
import { swapWithBrandKit } from "./sigma-brand-kit.mjs";
import { enrichMirrorA11y } from "./sigma-a11y-enrich.mjs";
import { lockMirrorCarousels } from "./sigma-carousel-lock.mjs";
import { revealMirrorAnimations } from "./sigma-reveal-animations.mjs";
import { deterministicMirrorMedia } from "./sigma-media-determinism.mjs";

export async function convergeEngine(projDir, opts = {}) {
  const sourceUrl = opts.sourceUrl;
  const target = opts.target || 90;
  const maxIter = opts.maxIter || 10;
  const swapMode = opts.swapMode || "placeholder"; // "placeholder" | "brand-kit" | "skip"
  const brandKitDir = opts.brandKitDir;
  const portBase = opts.portBase || 3300;

  console.log(`
NAVA Convergence Loop v2 — Paradigm 148
  Project:    ${projDir}
  Source:     ${sourceUrl || "(none)"}
  Target:     ${target}%
  Max iter:   ${maxIter}
  Swap mode:  ${swapMode}
`);

  const history = [];
  let lastComposite = 0;
  let stableCount = 0;

  for (let i = 1; i <= maxIter; i++) {
    console.log(`\n━━━ Iteration ${i}/${maxIter} ━━━`);

    let result, c, audit;
    try {
      result = await verifyCascade(projDir, { sourceUrl, port: portBase + i });
      audit = auditAssets(projDir);
      result._auditOverride = audit;
      c = computeCompositeScore(result);
    } catch (e) {
      console.log(`  verify error: ${e.message}`);
      history.push({ iter: i, error: e.message });
      break;
    }

    history.push({
      iter: i,
      composite: c.composite,
      partial: c.partial,
      audit: audit.determination,
      sourcePct: audit.stats?.sourcePct,
    });

    console.log(`  Composite: ${c.composite}% (${c.interpretation})`);
    console.log(`  Audit:     ${audit.determination} (${audit.stats?.sourcePct}% source)`);
    console.log(`  Partial:   ${Object.entries(c.partial).map(([k, v]) => `${k}=${v}`).join(" ")}`);

    if (c.composite >= target) {
      console.log(`\n  ✅ Target ${target}% reached at iter ${i}`);
      break;
    }

    // Find weakest stage (with leverage potential — high weight × low score)
    const weights = c.weights;
    const leverages = Object.entries(c.partial).map(([k, v]) => ({
      stage: k,
      score: v,
      gap: 100 - v,
      leverage: (100 - v) * (weights[k] || 0),
    }));
    leverages.sort((a, b) => b.leverage - a.leverage);
    const weakest = leverages[0];
    console.log(`  Weakest leverage: ${weakest.stage} (${weakest.score}% × ${(weights[weakest.stage] * 100).toFixed(0)}% = +${weakest.leverage.toFixed(1)} potential)`);

    // No improvement check
    if (Math.abs(c.composite - lastComposite) < 0.5) {
      stableCount++;
      if (stableCount >= 2) {
        console.log(`  ⚠ Stable at ${c.composite}% (no improvement) — architectural ceiling`);
        history[history.length - 1].stop = "no-improvement";
        break;
      }
    } else {
      stableCount = 0;
    }
    lastComposite = c.composite;

    // Apply paradigm based on weakest leverage
    const fixes = [];
    try {
      if (weakest.stage === "visual" && weakest.score < 80) {
        console.log(`  🔧 Fix: deeper reveal + carousel + media inject`);
        fixes.push({ name: "carousel", r: lockMirrorCarousels(projDir) });
        fixes.push({ name: "reveal", r: revealMirrorAnimations(projDir) });
        fixes.push({ name: "media", r: deterministicMirrorMedia(projDir) });
      } else if (weakest.stage === "license" && weakest.score < 100) {
        if (swapMode === "brand-kit" && brandKitDir) {
          console.log(`  🔧 Fix: P147 brand-kit swap (${brandKitDir})`);
          const r = swapWithBrandKit(projDir, { brandKitDir, dryRun: false });
          fixes.push({ name: "brand-kit", r });
        } else if (swapMode === "placeholder") {
          console.log(`  🔧 Fix: P142 placeholder swap`);
          const r = swapAssets(projDir, { dryRun: false });
          fixes.push({ name: "swap", r });
        } else {
          console.log(`  ⏭ License fix skipped (swapMode=skip)`);
        }
      } else if (weakest.stage === "a11y" && weakest.score < 100) {
        console.log(`  🔧 Fix: P138 a11y enrich`);
        fixes.push({ name: "a11y", r: enrichMirrorA11y(projDir) });
      } else if (weakest.stage === "motion" && weakest.score < 90) {
        console.log(`  🔧 Fix: P136 reveal deeper`);
        fixes.push({ name: "motion-reveal", r: revealMirrorAnimations(projDir) });
      } else {
        console.log(`  ⏭ No automatic paradigm for ${weakest.stage} (manual review)`);
        history[history.length - 1].stop = "no-paradigm";
        break;
      }
    } catch (e) {
      console.log(`  fix error: ${e.message}`);
      fixes.push({ name: "error", error: e.message });
    }

    history[history.length - 1].fixes = fixes.map(f => f.name);

    // Wait for sirv cache + filesystem flush
    await new Promise(r => setTimeout(r, 2000));
  }

  const final = history[history.length - 1];
  const initial = history[0];
  const improvement = +((final.composite || 0) - (initial.composite || 0)).toFixed(1);

  // Emit CONVERGENCE-LOG.md
  const lines = [
    "# CONVERGENCE LOG (Paradigm 148)",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Project: ${projDir}`,
    `Source: ${sourceUrl || "(unknown)"}`,
    `Target: ${target}%`,
    `Iterations: ${history.length}/${maxIter}`,
    "",
    "## Score Progression",
    "",
    `- Initial: **${initial.composite || "ERR"}%**`,
    `- Final:   **${final.composite || "ERR"}%**`,
    `- Improvement: **${improvement >= 0 ? "+" : ""}${improvement}%p**`,
    `- Audit:   ${initial.audit} → ${final.audit}`,
    "",
    "## Iteration Detail",
    "",
    "| Iter | Composite | Visual | License | A11y | Motion | Audit | Fixes |",
    "|---|---|---|---|---|---|---|---|",
    ...history.map(h => {
      const p = h.partial || {};
      return `| ${h.iter} | ${h.composite || "ERR"}% | ${p.visual || "?"} | ${p.license || "?"} | ${p.a11y || "?"} | ${p.motion || "?"} | ${h.audit || "?"} | ${h.fixes?.join(", ") || h.stop || "—"} |`;
    }),
    "",
    "## Determination",
    "",
    final.composite >= target ? `✅ **TARGET REACHED** (${target}%)` :
    final.composite >= 75 ? `⚠ **PRODUCTION_CAUTION** — manual review` :
    `❌ **Below threshold** — paradigm 추가 또는 자현 자산 필요`,
    "",
    "## 자현 비즈니스 다음 단계",
    "",
    final.composite >= target
      ? "Production-ready. CERT-DEPLOY-READY 발행 가능."
      : final.audit === "PASS"
      ? "License clean. Visual ceiling은 자현 자산 swap 후 회복 가능."
      : "License REVIEW/FAIL. P142 swap 또는 P147 brand-kit 권장.",
  ];
  fs.writeFileSync(path.join(projDir, "CONVERGENCE-LOG.md"), lines.join("\n"));

  return {
    initial: initial.composite,
    final: final.composite,
    improvement,
    iterations: history.length,
    history,
    target,
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-converge.mjs <projDir> [--source-url <url>] [--target 90] [--max-iter 10] [--swap placeholder|brand-kit|skip] [--brand-kit <dir>]");
    process.exit(1);
  }
  const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };
  const sourceUrl = flagVal("--source-url");
  const target = parseInt(flagVal("--target") || "90", 10);
  const maxIter = parseInt(flagVal("--max-iter") || "10", 10);
  const swapMode = flagVal("--swap") || "placeholder";
  const brandKitDir = flagVal("--brand-kit");

  convergeEngine(projDir, { sourceUrl, target, maxIter, swapMode, brandKitDir }).then(r => {
    console.log(`\n[converge] DONE — ${r.initial}% → ${r.final}% (+${r.improvement}%p) in ${r.iterations} iterations`);
    console.log(`  → CONVERGENCE-LOG.md`);
  }).catch(e => { console.error(e); process.exit(1); });
}
