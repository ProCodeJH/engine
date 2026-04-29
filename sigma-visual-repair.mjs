#!/usr/bin/env node
// sigma-visual-repair.mjs — Paradigm 306 — Visual Diff Repair Loop
//
// Source vs frozen pixel diff → 차이 region 식별 → 추가 capture round.
// Visual fidelity 향상.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function visualRepair(sourceUrl, mirrorPort, projDir, opts = {}) {
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log(`[visual-repair] capturing source...`);
  await page.goto(sourceUrl, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));

  // Apply deterministic stack
  try {
    const { applyDeterministicStack } = await import("./sigma-layout-lock.mjs");
    await applyDeterministicStack(page, { settleMs: 700 });
  } catch {}

  const sourceShot = path.join(projDir, ".repair-source.png");
  await page.screenshot({ path: sourceShot, fullPage: false });

  console.log(`[visual-repair] capturing mirror...`);
  await page.goto(`http://localhost:${mirrorPort}/`, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));
  try {
    const { applyDeterministicStack } = await import("./sigma-layout-lock.mjs");
    await applyDeterministicStack(page, { settleMs: 700 });
  } catch {}

  const mirrorShot = path.join(projDir, ".repair-mirror.png");
  await page.screenshot({ path: mirrorShot, fullPage: false });
  await browser.close();

  // Compute diff using P102 visual-validator
  const diffPath = path.join(projDir, ".repair-diff.png");
  const { visualValidate } = await import("./sigma-visual-validator.mjs");
  const result = await visualValidate(sourceShot, mirrorShot, { diffPath });

  // Threshold + recommendations
  const score = result.confidence || 0;
  const recommendations = [];

  if ((result.pixelMatchPct || 0) < 50) {
    recommendations.push("CSS/layout mismatch — consider P190 multi-state");
  }
  if ((result.histSimilarity || 0) < 70) {
    recommendations.push("Color palette differs — pseudo-elements or background-image missing");
    recommendations.push("Apply P302 pseudo-element + P304 bg-inline");
  }
  if ((result.pHashSimilarity || 0) < 50) {
    recommendations.push("Significant visual structure difference");
    recommendations.push("Apply P305 font-host or check failed assets");
  }

  // Report
  fs.writeFileSync(path.join(projDir, "VISUAL-REPAIR.md"), [
    `# Visual Repair Report (Paradigm 306)`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    `Source: ${sourceUrl}`,
    `Mirror: http://localhost:${mirrorPort}/`,
    ``,
    `## Composite Score: ${score}% (${result.interpretation})`,
    ``,
    `## Layer breakdown`,
    `- Pixelmatch: ${result.pixelMatchPct || 0}%`,
    `- pHash:      ${result.pHashSimilarity || 0}%`,
    `- SSIM:       ${(result.ssim || 0) * 100}%`,
    `- Histogram:  ${result.histSimilarity || 0}%`,
    ``,
    `## Recommendations`,
    ``,
    ...(recommendations.length === 0 ? ["✅ No major issues detected"] : recommendations.map(r => `- ${r}`)),
    ``,
    `## Files`,
    `- Source: ${sourceShot}`,
    `- Mirror: ${mirrorShot}`,
    `- Diff:   ${diffPath}`,
  ].join("\n"));

  return {
    score,
    interpretation: result.interpretation,
    layers: {
      pixel: result.pixelMatchPct,
      pHash: result.pHashSimilarity,
      ssim: result.ssim,
      hist: result.histSimilarity,
    },
    recommendations,
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const sourceUrl = process.argv[2];
  const mirrorPort = parseInt(process.argv[3] || "3100", 10);
  const projDir = path.resolve(process.argv[4] || "");
  if (!sourceUrl || !projDir) { console.error("usage: <source-url> <mirror-port> <projDir>"); process.exit(1); }
  visualRepair(sourceUrl, mirrorPort, projDir).then(r => {
    console.log(`\n[repair] composite ${r.score}% (${r.interpretation})`);
    console.log(`  pixel=${r.layers.pixel}% pHash=${r.layers.pHash}% ssim=${(r.layers.ssim*100).toFixed(1)}% hist=${r.layers.hist}%`);
    for (const rec of r.recommendations) console.log(`  → ${rec}`);
  });
}
