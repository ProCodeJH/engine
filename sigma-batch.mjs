#!/usr/bin/env node
// sigma-batch.mjs — Paradigm 217 — Multi-Site Batch Mirror
//
// 자현 비전: 여러 client 동시 deliver. sites.txt 입력 → 각 site full pipeline.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { go } from "./sigma-go.mjs";

export async function batchMirror(sitesFile, opts = {}) {
  if (!fs.existsSync(sitesFile)) {
    return { error: `sites file not found: ${sitesFile}` };
  }

  const sites = fs.readFileSync(sitesFile, "utf-8")
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#") && /^https?:\/\//.test(l));

  console.log(`[batch] ${sites.length} sites to mirror`);

  const results = [];
  for (let i = 0; i < sites.length; i++) {
    const url = sites[i];
    console.log(`\n=========================================`);
    console.log(`[batch] ${i + 1}/${sites.length}: ${url}`);
    console.log(`=========================================\n`);

    const startTime = Date.now();
    try {
      const r = await go(url, {
        ...opts,
        // Disable SPA routes in batch (each is huge)
        spa: opts.spa === true,
      });
      results.push({
        url,
        ok: !r.error,
        outputDir: r.outputDir,
        duration: Math.round((Date.now() - startTime) / 1000),
        error: r.error,
      });
    } catch (e) {
      results.push({ url, ok: false, error: e.message });
    }
  }

  // Summary
  const ok = results.filter(r => r.ok).length;
  const fail = results.length - ok;

  console.log(`\n${'='.repeat(50)}`);
  console.log(`[batch] DONE: ${ok}/${sites.length} successful, ${fail} failed`);
  console.log(`${'='.repeat(50)}`);
  for (const r of results) {
    console.log(`  ${r.ok ? '✅' : '❌'} ${r.url} — ${r.outputDir || r.error || ''} (${r.duration || '?'}s)`);
  }

  // Write batch report
  const reportPath = `BATCH-REPORT-${Date.now()}.md`;
  fs.writeFileSync(reportPath, [
    "# Batch Mirror Report (Paradigm 217)",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Sites: ${sites.length}, Success: ${ok}, Fail: ${fail}`,
    "",
    "## Results",
    "",
    "| URL | Status | Output | Duration |",
    "|---|---|---|---|",
    ...results.map(r => `| ${r.url} | ${r.ok ? "✅" : "❌"} | ${r.outputDir || "-"} | ${r.duration || "?"}s |`),
  ].join("\n"));

  return { sites: sites.length, success: ok, fail, results, report: reportPath };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const sitesFile = path.resolve(process.argv[2] || "sites.txt");
  if (!sitesFile || !fs.existsSync(sitesFile)) {
    console.error("usage: node sigma-batch.mjs <sites.txt> [--all] [--brand-kit ./brand-kit]");
    console.error("");
    console.error("sites.txt format (one URL per line):");
    console.error("  https://www.dusonnuri.co.kr/");
    console.error("  https://example.com/");
    console.error("  # comments OK");
    process.exit(1);
  }
  const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };
  const all = process.argv.includes("--all");
  const opts = {
    brandKit: flagVal("--brand-kit"),
    timeline: process.argv.includes("--timeline") || all,
    hover: process.argv.includes("--hover") || all,
    clickStates: process.argv.includes("--click") || all,
    formMock: process.argv.includes("--form") || all,
    spa: process.argv.includes("--spa"),  // explicit only (heavy)
    compress: process.argv.includes("--compress") || all,
    sw: process.argv.includes("--sw") || all,
    lazy: process.argv.includes("--lazy") || all,
    cookieBanner: process.argv.includes("--cookie-banner") || all,
  };

  batchMirror(sitesFile, opts).then(r => {
    if (r.error) { console.error(r.error); process.exit(1); }
    console.log(`\n  → ${r.report}`);
  });
}
