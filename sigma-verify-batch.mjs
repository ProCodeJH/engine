#!/usr/bin/env node
// sigma-verify-batch.mjs — Multi-site batch verifier for Sigma engine.
//
// Runs sigma-verify on a list of project directories and emits an
// aggregate FLEET-REPORT.md. Detects engine consistency across diverse
// sources. Does NOT run the engine itself — assumes outputs already
// exist (from prior nava-sigma.mjs runs).
//
// Usage: node engine/sigma-verify-batch.mjs <projDir1> <projDir2> ...
//        node engine/sigma-verify-batch.mjs --from-glob "sigma-output-*"
//
// For each project:
//   1. Spawn sigma-verify.mjs with sequential ports (3001, 3002, ...)
//   2. Read VERIFY-REPORT.md after completion
//   3. Aggregate runtime fidelity tiers + baseline deltas
// Final emit: FLEET-REPORT.md in current working directory.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
let projects = [];
const globIdx = args.indexOf("--from-glob");
if (globIdx >= 0 && args[globIdx + 1]) {
  const pattern = args[globIdx + 1];
  // Simple glob: prefix match in cwd
  const prefix = pattern.replace(/\*$/, "");
  const cwd = process.cwd();
  for (const entry of fs.readdirSync(cwd, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(prefix) && fs.existsSync(path.join(cwd, entry.name, ".data", "scan.json"))) {
      projects.push(path.join(cwd, entry.name));
    }
  }
} else {
  projects = args.filter(a => !a.startsWith("--")).map(a => path.resolve(a));
}

if (projects.length === 0) {
  console.error("usage: sigma-verify-batch.mjs <projDir1> <projDir2> ...");
  console.error("       sigma-verify-batch.mjs --from-glob 'sigma-output-*'");
  process.exit(1);
}

console.log(`[sigma-verify-batch] ${projects.length} projects`);
const T0 = Date.now();
const el = () => ((Date.now() - T0) / 1000).toFixed(1) + "s";

const results = [];
let nextPort = 3001;
for (const proj of projects) {
  const projName = path.basename(proj);
  console.log(`\n[${results.length + 1}/${projects.length}] ${projName} on :${nextPort}`);
  if (!fs.existsSync(path.join(proj, ".data", "scan.json"))) {
    console.log(`  skip: no scan.json (not a sigma output)`);
    results.push({ proj: projName, skipped: true });
    continue;
  }
  const verifyScript = path.join(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "sigma-verify.mjs");
  const t0 = Date.now();
  const r = spawnSync("node", [verifyScript, proj, "--port", String(nextPort), "--no-build"], {
    stdio: "inherit", shell: false, timeout: 120000,
  });
  const duration = ((Date.now() - t0) / 1000).toFixed(1);
  nextPort++;
  if (r.status !== 0) {
    console.log(`  ✗ verify failed (${duration}s, exit ${r.status})`);
    results.push({ proj: projName, failed: true, duration });
    continue;
  }
  // Read VERIFY-REPORT.md and parse summary
  const reportPath = path.join(proj, "VERIFY-REPORT.md");
  if (!fs.existsSync(reportPath)) {
    results.push({ proj: projName, noReport: true, duration });
    continue;
  }
  const txt = fs.readFileSync(reportPath, "utf-8");
  const high = parseInt(txt.match(/^- High: (\d+)/m)?.[1] || "0", 10);
  const medium = parseInt(txt.match(/^- Medium: (\d+)/m)?.[1] || "0", 10);
  const low = parseInt(txt.match(/^- Low: (\d+)/m)?.[1] || "0", 10);
  const total = high + medium + low;
  const pmMatch = txt.match(/^- ([\d.]+)% \(clone vs source/m);
  const pixelMatch = pmMatch ? parseFloat(pmMatch[1]) : null;
  results.push({
    proj: projName,
    high, medium, low, total,
    pixelMatch,
    fidelityScore: total > 0 ? +((high * 1.0 + medium * 0.5 + low * 0.0) / total).toFixed(2) : 0,
    duration,
  });
}

// Aggregate
const completed = results.filter(r => !r.skipped && !r.failed && !r.noReport);
const totalSections = completed.reduce((s, r) => s + (r.total || 0), 0);
const totalHigh = completed.reduce((s, r) => s + (r.high || 0), 0);
const totalMed = completed.reduce((s, r) => s + (r.medium || 0), 0);
const totalLow = completed.reduce((s, r) => s + (r.low || 0), 0);
const avgFidelity = completed.length > 0 ?
  +(completed.reduce((s, r) => s + r.fidelityScore, 0) / completed.length).toFixed(2) : 0;

const reportLines = [
  "# Sigma Fleet Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  `Total duration: ${el()}`,
  `Projects scanned: ${projects.length} (${completed.length} completed, ${results.filter(r => r.failed).length} failed, ${results.filter(r => r.skipped).length} skipped)`,
  "",
  "## Fleet aggregate",
  `- **Total sections**: ${totalSections}`,
  `- **High fidelity**: ${totalHigh} (${totalSections > 0 ? ((totalHigh / totalSections) * 100).toFixed(1) : 0}%)`,
  `- **Medium fidelity**: ${totalMed} (${totalSections > 0 ? ((totalMed / totalSections) * 100).toFixed(1) : 0}%)`,
  `- **Low fidelity**: ${totalLow} (${totalSections > 0 ? ((totalLow / totalSections) * 100).toFixed(1) : 0}%)`,
  `- **Average fidelity score** (high=1.0 / med=0.5 / low=0.0): **${avgFidelity}**`,
  "",
  "## Per-project results",
  "",
  "| project | sections | high | med | low | score | px-match | duration |",
  "|---|---|---|---|---|---|---|---|",
  ...results.map(r => {
    if (r.skipped) return `| ${r.proj} | — | — | — | — | — | — | (skipped) |`;
    if (r.failed) return `| ${r.proj} | — | — | — | — | — | — | (failed ${r.duration}s) |`;
    if (r.noReport) return `| ${r.proj} | — | — | — | — | — | — | (no report ${r.duration}s) |`;
    return `| ${r.proj} | ${r.total} | ${r.high} | ${r.medium} | ${r.low} | **${r.fidelityScore}** | ${r.pixelMatch ? r.pixelMatch + "%" : "—"} | ${r.duration}s |`;
  }),
  "",
  "## Notes",
  "- Fleet score = average of per-project (high * 1.0 + med * 0.5) / total",
  "- Per-project score is engine fidelity tier ratio (NOT pixel-match)",
  "- Pixel-match column populated only when sigma-verify ran with --pixelmatch",
  "- For deeper per-project analysis, see VERIFY-REPORT.md in each project dir",
];

fs.writeFileSync("FLEET-REPORT.md", reportLines.filter(Boolean).join("\n"));
console.log(`\n[done] ${el()} → FLEET-REPORT.md`);
console.log(`  Fleet score: ${avgFidelity} (${completed.length}/${projects.length} projects, ${totalSections} sections total)`);
