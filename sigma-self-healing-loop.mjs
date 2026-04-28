#!/usr/bin/env node
// sigma-self-healing-loop.mjs — Paradigm 101 — Self-Healing Verify Loop
//
// 자현 비전 진짜 last mile. verify fail → 자동 fix → 재verify → stable 도달.
// 한 명령으로 자현 client URL → 90%+ production-ready.
//
// Loop:
//   1. verify-cascade 실행 → score %
//   2. score >= target (default 90%) → DONE
//   3. score < target → fail 분석:
//      - a11y fail → sigma-omega-enhance 자동
//      - identifier fail → sigma-decouple 자동
//      - motion fail → sigma-animation-graph 자동
//      - SEO fail → sigma-omega-enhance 자동 (sitemap/jsonld)
//      - License fail → sigma-omega-fusion 자동
//   4. 3초 wait (sirv 캐시 회피)
//   5. 다시 verify
//   6. max 5 iterations 후 stop
//
// 출력: SELF-HEALING-LOG.md (iteration history + 적용된 fix)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { verifyCascade } from "./sigma-verify-cascade.mjs";
import { enhanceOmegaProject } from "./sigma-omega-enhance.mjs";
import { decoupleProject } from "./sigma-decouple.mjs";
import { fuseOmegaWithSigma } from "./sigma-omega-fusion.mjs";
import { anonymizeLinks } from "./sigma-anonymize-links.mjs";

export async function selfHealingLoop(projDir, opts = {}) {
  const sourceUrl = opts.sourceUrl;
  const maxIterations = opts.maxIterations || 5;
  const targetScore = opts.targetScore || 90;
  const portBase = opts.portBase || 3130;

  console.log(`
NAVA Self-Healing Loop — Paradigm 101
  Project:        ${projDir}
  Source URL:     ${sourceUrl || "(none)"}
  Target score:   ${targetScore}%
  Max iterations: ${maxIterations}
`);

  const history = [];
  let lastScore = 0;
  let stableCount = 0;

  for (let i = 1; i <= maxIterations; i++) {
    console.log(`\n━━━ Iteration ${i}/${maxIterations} ━━━`);

    // Run verify-cascade
    let verifyResult;
    try {
      verifyResult = await verifyCascade(projDir, {
        sourceUrl,
        port: portBase + i,
      });
    } catch (e) {
      console.log(`  verify error: ${e.message}`);
      history.push({ iteration: i, error: e.message });
      break;
    }

    const score = verifyResult.overallScore;
    const stages = verifyResult.stages;
    history.push({ iteration: i, score, stages: Object.fromEntries(Object.entries(stages).map(([k, v]) => [k, v.passed])) });

    console.log(`  Score: ${score}% (${Object.values(stages).filter(s => s.passed).length}/${Object.keys(stages).length} stages)`);

    // Target reached?
    if (score >= targetScore) {
      console.log(`  ✅ Target ${targetScore}% reached — stable!`);
      break;
    }

    // No improvement?
    if (Math.abs(score - lastScore) < 1) {
      stableCount++;
      if (stableCount >= 2) {
        console.log(`  ⚠ Score stable at ${score}% — no further improvement`);
        break;
      }
    } else {
      stableCount = 0;
    }
    lastScore = score;

    // Auto-fix based on failures
    const fixesApplied = [];

    if (!stages.a11y?.passed) {
      console.log(`  🔧 Fix: omega-enhance (a11y)`);
      try {
        const r = enhanceOmegaProject(projDir);
        fixesApplied.push({ name: "omega-enhance", result: { altAdded: r.altAdded, skipLinkAdded: r.skipLinkAdded } });
      } catch (e) { console.log(`    fail: ${e.message}`); }
    }

    if (!stages.identifier?.passed) {
      console.log(`  🔧 Fix: decouple`);
      try {
        const r = decoupleProject(projDir);
        fixesApplied.push({ name: "decouple", result: { dataAttrsRemoved: r.dataAttrsRemoved, classesAnonymized: r.classesAnonymized } });
      } catch (e) { console.log(`    fail: ${e.message}`); }
    }

    if (!stages.seo?.passed) {
      console.log(`  🔧 Fix: omega-enhance (seo)`);
      try {
        const r = enhanceOmegaProject(projDir);
        fixesApplied.push({ name: "omega-enhance-seo", result: { sitemap: r.sitemapEmitted, jsonLd: r.jsonLdAdded } });
      } catch (e) { console.log(`    fail: ${e.message}`); }
    }

    if (!stages.license?.passed) {
      console.log(`  🔧 Fix: omega-fusion (CERT-CLEAN-OMEGA)`);
      try {
        const r = fuseOmegaWithSigma(projDir, { sourceUrl });
        fixesApplied.push({ name: "omega-fusion", result: { determination: r.determination } });
      } catch (e) { console.log(`    fail: ${e.message}`); }
    }

    if (!stages.korean?.passed && stages.korean?.workAboutFound) {
      console.log(`  🔧 Fix: anonymize-links (Work/About 잔재)`);
      try {
        const r = anonymizeLinks(projDir, { sourceUrl });
        fixesApplied.push({ name: "anonymize-links", result: { links: r.externalLinksFound } });
      } catch (e) { console.log(`    fail: ${e.message}`); }
    }

    // Visual diff fail은 sirv timing — restart 시도 (다음 iteration의 새 port가 자동)
    if (!stages.visual?.passed && stages.visual) {
      console.log(`  🔧 Fix: visual diff measurement (next iteration new port)`);
      fixesApplied.push({ name: "visual-retry", result: "next iteration" });
    }

    if (fixesApplied.length === 0) {
      console.log(`  ⚠ No auto-fixes available for remaining failures — stop`);
      history[history.length - 1].fixes = "none-available";
      break;
    }

    history[history.length - 1].fixes = fixesApplied;
    console.log(`  Applied ${fixesApplied.length} fixes — wait 3s for sirv restart`);
    await new Promise(r => setTimeout(r, 3000));
  }

  const finalScore = history[history.length - 1]?.score || 0;
  const initialScore = history[0]?.score || 0;
  const improvement = +(finalScore - initialScore).toFixed(1);

  // Emit SELF-HEALING-LOG.md
  const lines = [
    "# Self-Healing Loop Log (Paradigm 101)",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Project: ${projDir}`,
    `Source: ${sourceUrl || "(unknown)"}`,
    `Iterations: ${history.length}/${maxIterations}`,
    `Target: ${targetScore}%`,
    "",
    "## Score progression",
    "",
    `- Initial: **${initialScore}%**`,
    `- Final: **${finalScore}%**`,
    `- Improvement: **+${improvement}%p**`,
    "",
    "## Iteration history",
    "",
    "| # | Score | Stages passed | Fixes applied |",
    "|---|---|---|---|",
    ...history.map(h => {
      const passedCount = h.stages ? Object.values(h.stages).filter(p => p).length : 0;
      const stagesTotal = h.stages ? Object.keys(h.stages).length : 8;
      const fixes = h.fixes === "none-available" ? "(none)" :
                    Array.isArray(h.fixes) ? h.fixes.map(f => f.name).join(", ") : "—";
      return `| ${h.iteration} | ${h.score || "ERR"}% | ${passedCount}/${stagesTotal} | ${fixes} |`;
    }),
    "",
    "## Determination",
    "",
    finalScore >= targetScore ? `✅ **TARGET REACHED** (${targetScore}%) — production-ready` :
    finalScore >= 75 ? "⚠ **Production caution** — manual review 후 deploy 가능" :
                       "❌ **Not production ready** — manual fix 또는 다른 paradigm 적용",
    "",
    "## 자현 비즈니스 다음 단계",
    "",
    finalScore >= targetScore ?
      "이 사이트는 **production-ready**. CERT-DEPLOY-READY.md 첨부 → client deploy." :
    finalScore >= 75 ?
      "**production caution** — 자현 client 안내 후 deploy 가능. 남은 fail은 manual 검토." :
      "Not ready. Manual paradigm 적용 권장 — 청사진 NAVA-OBSIDIAN.md 참조.",
  ];
  fs.writeFileSync(path.join(projDir, "SELF-HEALING-LOG.md"), lines.join("\n"));

  return {
    initialScore,
    finalScore,
    improvement,
    iterations: history.length,
    history,
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-self-healing-loop.mjs <projectDir> [--source-url <url>] [--target 90] [--max-iter 5]");
    process.exit(1);
  }
  const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };
  const sourceUrl = flagVal("--source-url");
  const targetScore = parseInt(flagVal("--target") || "90", 10);
  const maxIterations = parseInt(flagVal("--max-iter") || "5", 10);
  selfHealingLoop(projDir, { sourceUrl, targetScore, maxIterations }).then(r => {
    console.log(`\n[self-healing] ${r.initialScore}% → ${r.finalScore}% (+${r.improvement}%p) in ${r.iterations} iterations`);
    console.log(`  → SELF-HEALING-LOG.md`);
  }).catch(e => { console.error(e); process.exit(1); });
}
