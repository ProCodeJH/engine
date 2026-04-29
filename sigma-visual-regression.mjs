#!/usr/bin/env node
// sigma-visual-regression.mjs — Paradigm 236 — Visual Regression Test
//
// 이전 mirror vs 새 mirror screenshot pixel diff. Deploy 전 quality gate.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function captureScreenshot(url, outputPath, viewport = { width: 1920, height: 1080 }) {
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(url, { waitUntil: "load", timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: outputPath, fullPage: false });
  await browser.close();
  return outputPath;
}

export async function compareScreenshots(oldPath, newPath, diffPath) {
  // Use existing P102 visual-validator
  try {
    const { visualValidate } = await import("./sigma-visual-validator.mjs");
    return await visualValidate(oldPath, newPath, { diffPath });
  } catch (e) {
    return { error: e.message };
  }
}

export async function visualRegressionTest(oldUrl, newUrl, opts = {}) {
  const tmpDir = opts.tmpDir || path.resolve(".visual-regression");
  fs.mkdirSync(tmpDir, { recursive: true });

  const oldShot = path.join(tmpDir, "old.png");
  const newShot = path.join(tmpDir, "new.png");
  const diffShot = path.join(tmpDir, "diff.png");

  console.log(`[regression] capturing old: ${oldUrl}`);
  await captureScreenshot(oldUrl, oldShot);
  console.log(`[regression] capturing new: ${newUrl}`);
  await captureScreenshot(newUrl, newShot);

  console.log(`[regression] computing diff...`);
  const result = await compareScreenshots(oldShot, newShot, diffShot);

  // Threshold-based pass/fail
  const threshold = opts.threshold || 75;  // 75% similarity = pass
  const passed = (result.confidence || 0) >= threshold;

  // Report
  const report = [
    `# Visual Regression Report (Paradigm 236)`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    `Old: ${oldUrl}`,
    `New: ${newUrl}`,
    ``,
    `## Result: ${passed ? "✅ PASS" : "🔴 FAIL"} (threshold ${threshold}%)`,
    ``,
    `Composite confidence: **${result.confidence || 0}%** (${result.interpretation || "unknown"})`,
    ``,
    `## Layer breakdown`,
    ``,
    `- Pixelmatch:  ${result.pixelMatchPct || 0}%`,
    `- pHash:       ${result.pHashSimilarity || 0}%`,
    `- SSIM:        ${(result.ssim || 0) * 100}%`,
    `- Histogram:   ${result.histSimilarity || 0}%`,
    ``,
    `## Files`,
    ``,
    `- Old screenshot: ${oldShot}`,
    `- New screenshot: ${newShot}`,
    `- Diff PNG:       ${diffShot}`,
  ];

  const reportPath = path.join(tmpDir, "REGRESSION-REPORT.md");
  fs.writeFileSync(reportPath, report.join("\n"));

  return { passed, confidence: result.confidence, threshold, reportPath };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const oldUrl = process.argv[2];
  const newUrl = process.argv[3];
  if (!oldUrl || !newUrl) {
    console.error("usage: node sigma-visual-regression.mjs <old-url> <new-url> [--threshold 75]");
    process.exit(1);
  }
  const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };
  const threshold = parseInt(flagVal("--threshold") || "75", 10);
  visualRegressionTest(oldUrl, newUrl, { threshold }).then(r => {
    console.log(`\n[regression] ${r.passed ? "✅ PASS" : "🔴 FAIL"} (${r.confidence}% vs ${r.threshold}%)`);
    console.log(`  → ${r.reportPath}`);
    if (!r.passed) process.exit(1);
  });
}
