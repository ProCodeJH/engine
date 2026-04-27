#!/usr/bin/env node
// sigma-pipeline.mjs — End-to-end Sigma 클론 자동화
//
// 자현 ultrathink: 모든 단계를 한 명령으로. URL 입력 → CERT-PASS 까지.
// 인터랙션 없이 production deployment 가능.
//
// Pipeline:
//   1. nava-sigma.mjs — capture + emit + IMPOSSIBLE.md + CERT-* 자동
//   2. sigma-asset-inject.mjs --template — assets.template.json 생성
//   3. (optional) auto-fill mock — picsum + lorem ipsum 자동 채움
//   4. sigma-asset-inject.mjs apply — HANDOFF 슬롯 채움
//   5. (optional) sigma-trade-shift.mjs
//   6. (optional) npm install + build + dev
//   7. (optional) sigma-pixel-loop.mjs — 자동 회귀
//   8. CERT-* 재발급 (자산 끼운 후)
//
// Usage:
//   node sigma-pipeline.mjs <url> [options]
//
// Options:
//   --output <dir>      output directory (default: sigma-{slug})
//   --auto-fill mock    HANDOFF 자동 채움 (picsum + lorem)
//   --trade-shift       v106 trade dress shift 활성화
//   --build             npm install + build 실행
//   --pixel-loop        v107 자동 회귀 검증 (build 필요)
//   --port <n>          dev server port (default 3000)

import fs from "node:fs";
import path from "node:path";
import { execSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { generateAssetTemplate, injectAssets } from "./sigma-asset-inject.mjs";
import { applyTradeShift } from "./sigma-trade-shift.mjs";
import { generateCeilingCertificate } from "./sigma-cert-ceiling.mjs";
import { generateCleanCertificate } from "./sigma-cert-clean.mjs";

const ENGINE_DIR = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const args = process.argv.slice(2);
  const url = args.find(a => /^https?:\/\//.test(a));
  if (!url) {
    console.error("usage: node sigma-pipeline.mjs <url> [--output dir] [--auto-fill mock] [--trade-shift] [--build] [--pixel-loop]");
    process.exit(1);
  }

  const flagVal = (name) => {
    const i = args.indexOf(name);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
  };
  const hasFlag = (name) => args.includes(name);

  const slug = new URL(url).hostname.replace(/\./g, "-");
  const outputDir = flagVal("--output") || `sigma-${slug}`;
  const projDir = path.resolve(outputDir);
  const autoFill = flagVal("--auto-fill") || (hasFlag("--auto-fill") ? "mock" : null);
  const tradeShift = hasFlag("--trade-shift");
  const doBuild = hasFlag("--build");
  const doPixelLoop = hasFlag("--pixel-loop");
  const port = parseInt(flagVal("--port") || "3000", 10);

  const T0 = Date.now();
  const log = [];
  const stage = (n, msg) => {
    const t = ((Date.now() - T0) / 1000).toFixed(1);
    const line = `[${t}s] [stage ${n}] ${msg}`;
    console.log(line);
    log.push(line);
  };

  // Stage 1: nava-sigma capture + emit + auto certs
  stage(1, `nava-sigma --strict-clean → ${projDir}`);
  const navaArgs = ["nava-sigma.mjs", url, "--output", projDir, "--strict-clean", "--skip-build"];
  const navaResult = spawnSync("node", navaArgs, { cwd: ENGINE_DIR, stdio: "inherit" });
  if (navaResult.status !== 0) {
    log.push(`stage 1 failed (status ${navaResult.status})`);
    fs.writeFileSync(path.join(projDir, "PIPELINE-LOG.md"), formatLog(log, url, projDir));
    process.exit(1);
  }

  // Stage 2: assets.template.json
  stage(2, `asset template generation`);
  const template = generateAssetTemplate(projDir);
  fs.writeFileSync(path.join(projDir, "assets.template.json"), JSON.stringify(template, null, 2));
  log.push(`  tokens: ${Object.keys(template.tokens).length}, images: ${Object.keys(template.images).length}`);

  // Stage 3: auto-fill (optional)
  let assetsToApply = null;
  if (autoFill === "mock") {
    stage(3, `auto-fill HANDOFF with mock content`);
    assetsToApply = autoFillMock(template);
    fs.writeFileSync(path.join(projDir, "assets.json"), JSON.stringify(assetsToApply, null, 2));
  } else {
    stage(3, `auto-fill skipped — fill assets.template.json and run sigma-asset-inject.mjs manually`);
  }

  // Stage 4: asset inject
  if (assetsToApply) {
    stage(4, `asset injection`);
    const r = injectAssets(projDir, assetsToApply);
    log.push(`  ${r.tokensReplaced} tokens / ${r.imagesSwapped} images / ${r.fontsSwapped} fonts replaced`);
  }

  // Stage 5: trade shift (optional)
  if (tradeShift) {
    stage(5, `trade dress safe-shift`);
    const r = applyTradeShift(projDir);
    log.push(`  colors=${r.colorsShifted} radii=${r.radiiShifted} shadows=${r.shadowsShifted}`);
  }

  // Stage 6: build (optional)
  if (doBuild) {
    stage(6, `npm install + build`);
    try {
      execSync("npm install --silent --no-audit --no-fund", { cwd: projDir, stdio: "inherit" });
      execSync("npm run build", { cwd: projDir, stdio: "inherit" });
      log.push(`  build OK`);
    } catch (e) {
      log.push(`  build failed: ${e.message.slice(0, 80)}`);
    }
  }

  // Stage 7: pixel loop (optional, requires build)
  if (doPixelLoop && doBuild) {
    stage(7, `pixel-loop verification`);
    try {
      const { runPixelLoop } = await import("./sigma-pixel-loop.mjs");
      const r = await runPixelLoop(projDir, { port, skipBuild: true });
      if (r.error) log.push(`  pixel-loop: ${r.error}`);
      else log.push(`  pixel-loop: see PIXEL-LOOP-REPORT.md`);
    } catch (e) {
      log.push(`  pixel-loop failed: ${e.message.slice(0, 80)}`);
    }
  }

  // Stage 8: re-issue certs (post-asset-inject)
  stage(8, `re-issue CERT-CEILING + CERT-CLEAN (post-injection)`);
  try {
    const scanPath = path.join(projDir, ".sigma", "scan.json");
    if (fs.existsSync(scanPath)) {
      const scan = JSON.parse(fs.readFileSync(scanPath, "utf-8"));
      const ceiling = generateCeilingCertificate(scan, projDir, { enginePath: ENGINE_DIR });
      log.push(`  CERT-CEILING: ${ceiling.determination}`);
    }
    const clean = generateCleanCertificate(projDir, { enginePath: ENGINE_DIR });
    log.push(`  CERT-CLEAN: ${clean.determination}${clean.audit.violations.length > 0 ? ` (${clean.audit.violations.length} violations)` : ""}`);
  } catch (e) {
    log.push(`  re-issue cert failed: ${e.message.slice(0, 80)}`);
  }

  fs.writeFileSync(path.join(projDir, "PIPELINE-LOG.md"), formatLog(log, url, projDir));
  console.log(`\n[done] ${((Date.now() - T0) / 1000).toFixed(1)}s → ${projDir}`);
  console.log(`  PIPELINE-LOG.md / IMPOSSIBLE.md / CERT-CEILING.md / CERT-CLEAN.md`);
}

function autoFillMock(template) {
  const out = { tokens: {}, images: {}, fonts: { ...template.fonts } };

  // Token fill — semantic by token name
  const samples = {
    HEADING: ["Brand vision", "Strategic clarity", "Modern design", "Built to scale"],
    PARAGRAPH: ["Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."],
    TITLE: ["Welcome", "About us", "Our work", "Contact"],
    DESC: ["A modern, clean-room rebuild powered by Sigma."],
  };
  let i = 0;
  for (const token of Object.keys(template.tokens)) {
    let pool = samples.PARAGRAPH;
    for (const [k, p] of Object.entries(samples)) {
      if (token.toUpperCase().includes(k)) { pool = p; break; }
    }
    out.tokens[token] = pool[i++ % pool.length];
  }

  // Image fill — picsum deterministic
  let imgIdx = 100;
  for (const img of Object.keys(template.images)) {
    out.images[img] = `https://picsum.photos/seed/${imgIdx++}/1200/800`;
  }

  return out;
}

function formatLog(log, url, projDir) {
  return [
    "# PIPELINE-LOG",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Source: ${url}`,
    `Project: ${projDir}`,
    "",
    "## Stages",
    "",
    "```",
    ...log,
    "```",
    "",
    "## Artifacts",
    "",
    "- `IMPOSSIBLE.md` — 5-Register 정직 100%",
    "- `CERT-CEILING.md` / `CERT-CEILING.json` — 사이트 클론 도달률 인증",
    "- `CERT-CLEAN.md` / `CERT-CLEAN.json` — 라이선스 클린 인증",
    "- `assets.template.json` — HANDOFF 슬롯 인덱스",
    "- `ASSET-INJECTION.md` — 자산 주입 보고 (적용된 경우)",
    "- `TRADE-SHIFT.md` — trade dress 시프트 (활성화된 경우)",
    "- `PIXEL-LOOP-REPORT.md` — 자동 회귀 보고 (--pixel-loop 시)",
    "",
    "## 다음 단계",
    "",
    "- `node sigma-asset-inject.mjs <projDir> assets.json` — 자현 자기 자산 적용",
    "- `cd <projDir> && npm install && npm run dev` — 로컬 검증",
    "- `node sigma-verify.mjs <projDir> --pixelmatch` — 픽셀 매치 측정",
  ].join("\n");
}

main().catch(e => { console.error(e); process.exit(1); });
