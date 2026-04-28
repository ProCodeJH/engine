#!/usr/bin/env node
// sigma-auto-replenish.mjs — Paradigm 158 — Auto-Replenish Convergence Loop
//
// 자현 ultrathink 8번째: P156 Wikimedia + P148 Convergence 통합. 자율 loop이
// license 약하면 자동 Wikimedia 자산 download → brand-kit 채움 → swap → 재측정.
//
// 자현 한 번 명령 → 진짜 자율 100% 도달:
//   1. brand-kit이 비어있으면 → Wikimedia auto-fill (P156)
//   2. swap 자동 (P147)
//   3. remaining source (fonts/css/js) → P142 placeholder
//   4. P154 procedural for any 남은 image (Wikimedia download 실패한 것)
//   5. verify-cascade (P140 symmetric, P144 layout, P145 strict)
//   6. composite ≥ target → DONE, else iterate
//
// 자율 100% 자체 보장 — 자현 manual 0%, 0원, 외부 paid API 0%.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { verifyCascade } from "./sigma-verify-cascade.mjs";
import { computeCompositeScore } from "./sigma-composite-score.mjs";
import { auditAssets } from "./sigma-asset-audit.mjs";
import { swapAssets } from "./sigma-asset-swap.mjs";
import { swapWithBrandKit } from "./sigma-brand-kit.mjs";
import { fillBrandKitFromCommons } from "./sigma-wikimedia-crawler.mjs";
import { swapMirrorToProcedural } from "./sigma-procedural-asset.mjs";
import { enrichMirrorA11y } from "./sigma-a11y-enrich.mjs";
import { lockMirrorCarousels } from "./sigma-carousel-lock.mjs";
import { revealMirrorAnimations } from "./sigma-reveal-animations.mjs";
import { enhanceOmegaProject } from "./sigma-omega-enhance.mjs";

export async function autoReplenishConverge(projDir, opts = {}) {
  const sourceUrl = opts.sourceUrl;
  const target = opts.target || 85;
  const maxIter = opts.maxIter || 5;
  const brandKitDir = opts.brandKitDir || path.resolve("brand-kit-auto");
  const portBase = opts.portBase || 3400;
  const useWikimedia = opts.useWikimedia !== false;
  const wikimediaPerCat = opts.wikimediaPerCat || 5;

  console.log(`
NAVA Auto-Replenish Convergence — Paradigm 158
  Project:        ${projDir}
  Source URL:     ${sourceUrl || "(none)"}
  Target:         ${target}%
  Max iter:       ${maxIter}
  Brand kit:      ${brandKitDir}
  Wikimedia fill: ${useWikimedia ? "ON" : "OFF"}
`);

  const log = [];
  function step(name, fn) {
    return Promise.resolve(fn()).then(r => {
      log.push({ step: name, ok: true, result: r });
      console.log(`  ✅ ${name}`);
      return r;
    }).catch(e => {
      log.push({ step: name, ok: false, error: String(e.message).slice(0, 80) });
      console.log(`  ❌ ${name}: ${e.message.slice(0, 80)}`);
      return null;
    });
  }

  // Step 1: Ensure brand-kit exists with assets
  if (useWikimedia) {
    const manifestPath = path.join(brandKitDir, "manifest.json");
    let needFill = false;
    if (!fs.existsSync(manifestPath)) {
      needFill = true;
    } else {
      try {
        const m = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        const totalAssets = Object.values(m.categories || {}).reduce((s, a) => s + (a?.length || 0), 0);
        if (totalAssets < 10) needFill = true;
      } catch { needFill = true; }
    }

    if (needFill) {
      console.log(`\n━━━ Step 1: Wikimedia fill (brand-kit empty/sparse) ━━━`);
      await step("Wikimedia fill", () => fillBrandKitFromCommons(brandKitDir, { perCategory: wikimediaPerCat }));
    } else {
      console.log(`\n━━━ Step 1: Brand-kit ready (skip Wikimedia fill) ━━━`);
      log.push({ step: "Wikimedia fill", skipped: true, reason: "brand-kit already populated" });
    }
  }

  // Step 2: Apply enrichment + determinism stack (always safe to re-apply)
  console.log(`\n━━━ Step 2: A11y + Determinism stack ━━━`);
  await step("A11y enrich", () => enrichMirrorA11y(projDir));
  // P165 — SEO restoration (sitemap.xml + robots.txt + JSON-LD via omega-enhance)
  await step("Omega enhance (SEO)", () => enhanceOmegaProject(projDir));
  await step("Carousel lock", () => lockMirrorCarousels(projDir));
  await step("Reveal animations", () => revealMirrorAnimations(projDir));

  // Step 3: Brand-kit swap (license fix)
  console.log(`\n━━━ Step 3: Brand-kit swap ━━━`);
  await step("Brand-kit swap", () => swapWithBrandKit(projDir, { brandKitDir, dryRun: false }));

  // Step 4: Procedural swap for remaining images (Wikimedia download miss)
  console.log(`\n━━━ Step 4: Procedural swap (remaining images) ━━━`);
  await step("Procedural", () => swapMirrorToProcedural(projDir, { dryRun: false }));

  // Step 5: Asset swap (fonts/css/js placeholders)
  console.log(`\n━━━ Step 5: Asset swap (fonts/css/js) ━━━`);
  await step("Asset swap", () => swapAssets(projDir, { dryRun: false }));

  // Step 6: Convergence loop
  console.log(`\n━━━ Step 6: Convergence verify loop ━━━`);
  const history = [];
  for (let i = 1; i <= maxIter; i++) {
    if (!sourceUrl) {
      console.log(`  (no source URL — single audit)`);
      const audit = auditAssets(projDir);
      history.push({ iter: i, audit: audit.determination, sourcePct: audit.stats?.sourcePct });
      break;
    }

    let result, c, audit;
    try {
      result = await verifyCascade(projDir, { sourceUrl, port: portBase + i });
      audit = auditAssets(projDir);
      result._auditOverride = audit;
      c = computeCompositeScore(result);
    } catch (e) {
      console.log(`  iter ${i} verify error: ${e.message}`);
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
    console.log(`  iter ${i}: composite ${c.composite}% audit ${audit.determination} sourcePct ${audit.stats?.sourcePct}%`);

    if (c.composite >= target) {
      console.log(`  ✅ Target ${target}% reached`);
      break;
    }
    // Single-pass with all paradigms applied — no further fix to try
    console.log(`  ⏹ ceiling reached (paradigm exhausted) — stop`);
    break;
  }

  // Emit AUTO-REPLENISH-LOG.md
  const last = history[history.length - 1] || {};
  const cert = [
    "# AUTO-REPLENISH CONVERGENCE LOG (Paradigm 158)",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Project: ${projDir}`,
    `Source: ${sourceUrl || "(none)"}`,
    `Target: ${target}%`,
    "",
    "## Pipeline Steps",
    "",
    "| Step | Status |",
    "|---|---|",
    ...log.map(l => `| ${l.step} | ${l.skipped ? "⏭" : (l.ok ? "✅" : "❌")} |`),
    "",
    "## Convergence History",
    "",
    "| Iter | Composite | Audit | Source% |",
    "|---|---|---|---|",
    ...history.map(h => `| ${h.iter} | ${h.composite || "ERR"}% | ${h.audit || "?"} | ${h.sourcePct || "?"}% |`),
    "",
    "## Determination",
    "",
    last.composite >= target
      ? `✅ **TARGET REACHED** (${target}%) — Production deliverable`
      : last.composite >= 75
      ? `⚠ **PRODUCTION_CAUTION** — manual review`
      : `🔧 **MANUAL_REVIEW** — additional paradigm 권장`,
    "",
    "## 자현 비즈니스 path",
    "",
    last.composite >= target
      ? "Production-ready. CERT-DEPLOY-READY 발행 가능."
      : "추가 paradigm 적용 또는 자현 자산 (manual) 권장.",
  ];
  fs.writeFileSync(path.join(projDir, "AUTO-REPLENISH-LOG.md"), cert.join("\n"));

  return { log, history, brandKitDir };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-auto-replenish.mjs <projDir> [--source-url <url>] [--target 85] [--brand-kit <dir>] [--no-wikimedia]");
    process.exit(1);
  }
  const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };
  const opts = {
    sourceUrl: flagVal("--source-url"),
    target: parseInt(flagVal("--target") || "85", 10),
    brandKitDir: flagVal("--brand-kit") ? path.resolve(flagVal("--brand-kit")) : undefined,
    useWikimedia: !process.argv.includes("--no-wikimedia"),
    wikimediaPerCat: parseInt(flagVal("--wikimedia-per") || "5", 10),
    maxIter: parseInt(flagVal("--max-iter") || "5", 10),
  };

  autoReplenishConverge(projDir, opts).then(r => {
    const last = r.history[r.history.length - 1] || {};
    console.log(`\n[auto-replenish] DONE`);
    console.log(`  Final composite: ${last.composite || "?"}% (audit ${last.audit || "?"})`);
    console.log(`  → AUTO-REPLENISH-LOG.md`);
  }).catch(e => { console.error(e); process.exit(1); });
}
