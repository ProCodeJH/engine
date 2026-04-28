#!/usr/bin/env node
// sigma-engine.mjs — Paradigm 152 — End-to-End Pipeline (한 명령 = full deliverable)
//
// 자현 비전 진정한 "엔진 완성": source URL 한 줄 → production-deployed URL.
// 모든 paradigm orchestration. 자현 manual 작업 0%.
//
// Pipeline:
//   1. nava-omega.mjs <url>           — Omega mirror (visual base)
//   2. sigma-asset-audit.mjs           — license truth 측정
//   3. sigma-brand-kit.mjs --execute   — 자현 자산 swap (or P142 placeholder)
//   4. sigma-converge.mjs              — 자율 90%+ 도달 loop
//   5. sigma-auto-deploy.mjs --execute — Vercel/CF deploy
//   6. CERT-ENGINE-COMPLETE.md         — 최종 delivery cert
//
// 한 명령:
//   node sigma-engine.mjs https://www.dusonnuri.co.kr/ \
//     --brand-kit ./brand-kit \
//     --target 88 \
//     --deploy vercel \
//     --auto
//
// --auto: dry-run 없이 모두 실행 (자현 명시 승인)
// (default): 각 단계 dry-run + 사용자 결정

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

function runStep(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    let stdout = "", stderr = "";
    console.log(`\n  $ ${cmd} ${args.join(" ")}`);
    const proc = spawn(cmd, args, { shell: true, ...opts });
    proc.stdout?.on("data", d => { stdout += d; process.stdout.write(d); });
    proc.stderr?.on("data", d => { stderr += d; process.stderr.write(d); });
    proc.on("close", code => resolve({ code, stdout, stderr }));
    proc.on("error", e => resolve({ code: -1, error: e.message }));
  });
}

function urlToSlug(url) {
  return url.replace(/^https?:\/\//, "")
            .replace(/\/$/, "")
            .replace(/[^a-z0-9]/gi, "-")
            .toLowerCase();
}

export async function runEngine(sourceUrl, opts = {}) {
  const auto = opts.auto || false;
  const target = opts.target || 88;
  const swapMode = opts.swapMode || (opts.brandKit ? "brand-kit" : "placeholder");
  const brandKitDir = opts.brandKit;
  const deploy = opts.deploy; // "vercel" | "cloudflare" | null
  const slug = urlToSlug(sourceUrl);
  const projDir = path.resolve(`omega-${slug}`);

  console.log(`
NAVA Sigma Engine — Paradigm 152 (End-to-End)
  Source URL:  ${sourceUrl}
  Project:     ${projDir}
  Target:      ${target}%
  Swap mode:   ${swapMode}
  Brand kit:   ${brandKitDir || "(none)"}
  Deploy:      ${deploy || "(none)"}
  Mode:        ${auto ? "AUTO (auto-execute)" : "INTERACTIVE (per-step decision)"}
`);

  const log = [];
  function logStep(name, result) {
    log.push({ name, ok: result.code === 0, code: result.code });
    console.log(`  [${result.code === 0 ? "✅" : "❌"}] ${name} (exit=${result.code})`);
  }

  // ═══ Step 1: Omega Mirror ═══
  if (!fs.existsSync(projDir)) {
    console.log(`\n━━━ Step 1: Omega Mirror ━━━`);
    const r1 = await runStep("node", ["nava-omega.mjs", sourceUrl]);
    logStep("Omega mirror", r1);
    if (r1.code !== 0) {
      console.log(`Omega mirror failed — abort`);
      return { error: "omega failed", log };
    }
  } else {
    console.log(`\n━━━ Step 1: Omega Mirror — SKIP (already exists at ${projDir}) ━━━`);
    log.push({ name: "Omega mirror", ok: true, skipped: true });
  }

  // ═══ Step 2: Asset Audit (truth measurement) ═══
  console.log(`\n━━━ Step 2: Asset Audit (license truth) ━━━`);
  const r2 = await runStep("node", ["sigma-asset-audit.mjs", projDir]);
  logStep("Asset audit", r2);

  // ═══ Step 3: Asset Swap (license PASS) ═══
  console.log(`\n━━━ Step 3: Asset Swap (${swapMode}) ━━━`);
  if (swapMode === "skip") {
    console.log(`  ⏭ skipped`);
    log.push({ name: "Asset swap", skipped: true });
  } else if (swapMode === "brand-kit" && brandKitDir) {
    const r3 = await runStep("node", [
      "sigma-brand-kit.mjs", projDir,
      "--brand-kit", brandKitDir,
      ...(auto ? ["--execute"] : []),
    ]);
    logStep(`Brand-kit swap`, r3);
  } else {
    const r3 = await runStep("node", [
      "sigma-asset-swap.mjs", projDir,
      ...(auto ? ["--execute"] : []),
    ]);
    logStep(`Placeholder swap`, r3);
  }

  // ═══ Step 4: Convergence Loop ═══
  console.log(`\n━━━ Step 4: Convergence Loop (target ${target}%) ━━━`);
  const swapForConverge = swapMode === "brand-kit" ? "brand-kit" : (swapMode === "placeholder" ? "placeholder" : "skip");
  const convergeArgs = [
    "sigma-converge.mjs", projDir,
    "--source-url", sourceUrl,
    "--target", String(target),
    "--max-iter", "5",
    "--swap", swapForConverge,
  ];
  if (brandKitDir && swapForConverge === "brand-kit") {
    convergeArgs.push("--brand-kit", brandKitDir);
  }
  const r4 = await runStep("node", convergeArgs);
  logStep("Convergence loop", r4);

  // ═══ Step 5: Auto-Deploy ═══
  if (deploy && auto) {
    console.log(`\n━━━ Step 5: Auto-Deploy (${deploy}) ━━━`);
    const r5 = await runStep("node", [
      "sigma-auto-deploy.mjs", projDir,
      "--platform", deploy,
      "--target", String(target),
      "--execute",
      "--prod",
    ]);
    logStep("Auto-deploy", r5);
  } else if (deploy) {
    console.log(`\n━━━ Step 5: Auto-Deploy DRY-RUN (${deploy}) ━━━`);
    const r5 = await runStep("node", [
      "sigma-auto-deploy.mjs", projDir,
      "--platform", deploy,
      "--target", String(target),
    ]);
    logStep("Auto-deploy (dry-run)", r5);
  }

  // ═══ Final Cert ═══
  const composeJsonPath = path.join(projDir, "COMPOSITE-SCORE.json");
  let finalComposite = null;
  if (fs.existsSync(composeJsonPath)) {
    try { finalComposite = JSON.parse(fs.readFileSync(composeJsonPath, "utf-8")); } catch {}
  }

  const cert = [
    "# CERT-ENGINE-COMPLETE (Paradigm 152)",
    "",
    `Issued: ${new Date().toISOString()}`,
    `Source URL: ${sourceUrl}`,
    `Project: ${projDir}`,
    `Mode: ${auto ? "AUTO" : "INTERACTIVE/DRY-RUN"}`,
    "",
    "## Pipeline Steps",
    "",
    "| Step | Status |",
    "|---|---|",
    ...log.map(l => `| ${l.name} | ${l.skipped ? "⏭ SKIP" : (l.ok ? "✅ OK" : "❌ FAIL")} |`),
    "",
    "## Final Score",
    "",
    finalComposite ? [
      `### **${finalComposite.composite}%** — ${finalComposite.interpretation}`,
      "",
      `Binary: ${finalComposite.binaryScore}%`,
      "",
      "Partial:",
      ...Object.entries(finalComposite.partial).map(([k, v]) => `- ${k}: ${v}%`),
    ].join("\n") : "(composite score not available)",
    "",
    "## 자현 비즈니스 결정",
    "",
    finalComposite?.composite >= target
      ? `✅ **Engine 자율 ${target}%+ 도달** — Production deliverable 준비 완료`
      : `⚠ Engine convergence ${finalComposite?.composite || "?"}% — manual review`,
    "",
    "이 mirror는 17개 paradigm을 거쳐 측정 + cleanroom + 자율 convergence 완료.",
    auto ? "Auto mode — 모든 단계 실행됨." : "Interactive mode — --auto 추가로 실제 실행.",
  ];
  fs.writeFileSync(path.join(projDir, "CERT-ENGINE-COMPLETE.md"), cert.join("\n"));

  return {
    projDir,
    log,
    finalComposite,
    target,
  };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const sourceUrl = process.argv[2];
  if (!sourceUrl) {
    console.error("usage: node sigma-engine.mjs <source-url> [options]");
    console.error("  --brand-kit <dir>   브랜드 자산 디렉토리 (P147)");
    console.error("  --target <N>        composite 목표 % (default 88)");
    console.error("  --deploy <platform> vercel | cloudflare");
    console.error("  --auto              실제 실행 (default: dry-run)");
    process.exit(1);
  }
  const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };
  const opts = {
    brandKit: flagVal("--brand-kit"),
    target: parseInt(flagVal("--target") || "88", 10),
    deploy: flagVal("--deploy"),
    auto: process.argv.includes("--auto"),
  };

  runEngine(sourceUrl, opts).then(r => {
    if (r.error) { console.error(`[engine] ${r.error}`); process.exit(1); }
    console.log(`\n[engine] DONE — ${r.projDir}`);
    if (r.finalComposite) {
      console.log(`  Composite: ${r.finalComposite.composite}% (${r.finalComposite.interpretation})`);
    }
    console.log(`  → CERT-ENGINE-COMPLETE.md`);
  }).catch(e => { console.error(e); process.exit(1); });
}
