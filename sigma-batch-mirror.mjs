#!/usr/bin/env node
// sigma-batch-mirror.mjs — Paradigm 6 — Batch Multi-Mirror
//
// 자현 비즈니스 scale 도구. 100 client 사이트를 한 명령으로 미러 + decouple
// + Fusion 인증서. 시간 효율 최대 — concurrent 3 동시 (자원 한도).
//
// Input: urls.txt (한 줄 한 URL) 또는 CLI args
// Output: omega-{slug}-{i}/ 각 디렉토리 + BATCH-FLEET.md 통합 보고
//
// Usage:
//   node sigma-batch-mirror.mjs urls.txt
//   node sigma-batch-mirror.mjs --urls "https://a.com,https://b.com,..."
//   node sigma-batch-mirror.mjs --concurrency 5 --deep urls.txt

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ARGS = process.argv.slice(2);
const flagVal = (n) => { const i = ARGS.indexOf(n); return i >= 0 && i + 1 < ARGS.length ? ARGS[i + 1] : null; };
const hasFlag = (n) => ARGS.includes(n);

const URLS_FILE = ARGS.find(a => !a.startsWith("--") && a.endsWith(".txt"));
const URLS_INLINE = flagVal("--urls");
const CONCURRENCY = parseInt(flagVal("--concurrency") || "3", 10);
const DEEP = hasFlag("--deep");
const VISION = hasFlag("--vision");  // run sigma-vision-prompt for each
const MAX_ROUTES = parseInt(flagVal("--max-routes") || "10", 10);
const OUTPUT_DIR = flagVal("--output-dir") || ".";

let urls = [];
if (URLS_FILE) {
  if (!fs.existsSync(URLS_FILE)) {
    console.error(`URLs file not found: ${URLS_FILE}`);
    process.exit(1);
  }
  urls = fs.readFileSync(URLS_FILE, "utf-8")
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#") && /^https?:\/\//.test(l));
} else if (URLS_INLINE) {
  urls = URLS_INLINE.split(/[,\s]+/).filter(u => /^https?:\/\//.test(u));
} else {
  console.error("usage:");
  console.error("  node sigma-batch-mirror.mjs urls.txt");
  console.error("  node sigma-batch-mirror.mjs --urls 'https://a.com,https://b.com'");
  console.error("");
  console.error("options:");
  console.error("  --concurrency 3      max parallel mirrors");
  console.error("  --deep               full Omega deep mode");
  console.error("  --vision             run sigma-vision-prompt after each");
  console.error("  --max-routes 10      per site");
  console.error("  --output-dir .       base output directory");
  process.exit(1);
}

if (urls.length === 0) {
  console.error("no valid URLs");
  process.exit(1);
}

const enginePath = path.dirname(fileURLToPath(import.meta.url));
const T0 = Date.now();

console.log(`
NAVA Batch Mirror — Paradigm 6
  URLs:          ${urls.length}
  Concurrency:   ${CONCURRENCY}
  Mode:          ${DEEP ? "deep" : "default"}
  Vision prompt: ${VISION ? "yes" : "no"}
  Max routes:    ${MAX_ROUTES}
`);

const results = [];
let completed = 0;
let active = 0;
const queue = [...urls];

function runOne(url) {
  return new Promise((resolve) => {
    const slug = new URL(url).hostname.replace(/\./g, "-");
    const projDir = path.resolve(OUTPUT_DIR, `omega-${slug}`);
    const args = ["nava-omega.mjs", url, "--output", projDir, "--skip-verify", "--max-routes", String(MAX_ROUTES)];
    if (DEEP) args.push("--deep");

    const t0 = Date.now();
    const p = spawn("node", args, { cwd: enginePath });
    let stdout = "";
    p.stdout.on("data", (d) => { stdout += d.toString(); });
    p.stderr.on("data", () => {});
    p.on("close", async (code) => {
      const dur = ((Date.now() - t0) / 1000).toFixed(1);
      const result = { url, slug, projDir, exitCode: code, duration: dur };

      // Parse stats from stdout
      const m1 = stdout.match(/Mirrored:\s*(\d+)/);
      const m2 = stdout.match(/discovered:\s*(\d+)/);
      const m3 = stdout.match(/multi-route emit:\s*1 root \+ (\d+)/);
      if (m1) result.mirrored = parseInt(m1[1], 10);
      if (m2) result.discovered = parseInt(m2[1], 10);
      if (m3) result.routes = 1 + parseInt(m3[1], 10);

      // Optional vision prompt
      if (VISION && code === 0) {
        try {
          await new Promise((res) => {
            const vp = spawn("node", ["sigma-vision-prompt.mjs", projDir], { cwd: enginePath });
            vp.on("close", res);
          });
          result.visionPromptReady = true;
        } catch {}
      }

      completed++;
      console.log(`  [${completed}/${urls.length}] ${url.slice(0, 60).padEnd(60)} → ${code === 0 ? "✓" : "✗"} ${dur}s ${m1 ? `(${m1[1]} assets, ${m3 ? 1 + parseInt(m3[1], 10) : 1} routes)` : ""}`);
      resolve(result);
    });
  });
}

// Concurrency-limited execution
const workers = [];
async function worker() {
  while (queue.length > 0) {
    const url = queue.shift();
    if (!url) break;
    active++;
    try {
      const r = await runOne(url);
      results.push(r);
    } catch (e) {
      results.push({ url, error: e.message });
    }
    active--;
  }
}

const startTime = Date.now();
for (let i = 0; i < CONCURRENCY; i++) workers.push(worker());
await Promise.all(workers);
const totalDur = ((Date.now() - startTime) / 1000).toFixed(1);

// Aggregate report
const successful = results.filter(r => r.exitCode === 0).length;
const totalAssets = results.reduce((s, r) => s + (r.mirrored || 0), 0);
const totalRoutes = results.reduce((s, r) => s + (r.routes || 1), 0);

const report = [
  "# BATCH-FLEET — Sigma Batch Multi-Mirror Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  `Mode: ${DEEP ? "deep" : "default"}, vision-prompt: ${VISION ? "on" : "off"}`,
  `Total duration: ${totalDur}s (concurrency ${CONCURRENCY})`,
  "",
  "## Summary",
  `- URLs processed: ${urls.length}`,
  `- Successful: ${successful}`,
  `- Failed: ${urls.length - successful}`,
  `- Total assets mirrored: ${totalAssets}`,
  `- Total routes captured: ${totalRoutes}`,
  "",
  "## Per-site",
  "",
  "| URL | Status | Duration | Routes | Assets | Output |",
  "|---|---|---|---|---|---|",
  ...results.map(r => {
    const status = r.exitCode === 0 ? "✅" : "❌";
    return `| \`${r.url.slice(0, 50)}\` | ${status} | ${r.duration}s | ${r.routes || "?"} | ${r.mirrored || "?"} | \`${path.basename(r.projDir || "")}\` |`;
  }),
  "",
  "## 자현 비즈니스 다음 단계",
  "",
  "1. 각 omega-* 디렉토리에 자기 client 자산 swap (assets.json)",
  "2. (옵션) sigma-vision-prompt 또는 sigma-llm-local 자동 React 변환",
  "3. cd omega-* && npm install && npm start (시각 검증)",
  "4. CERT-CLEAN-OMEGA.md client/법무 첨부 → deploy",
];

fs.writeFileSync(path.join(path.resolve(OUTPUT_DIR), "BATCH-FLEET.md"), report.join("\n"));

console.log(`
═══════════════════════════════════════════════
 Batch complete ${totalDur}s
═══════════════════════════════════════════════
  Sites:    ${urls.length} (${successful} success / ${urls.length - successful} fail)
  Routes:   ${totalRoutes} total
  Assets:   ${totalAssets.toLocaleString()} total

  → BATCH-FLEET.md
`);
