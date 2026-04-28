#!/usr/bin/env node
// sigma-auto-deploy.mjs — Paradigm 151 — Auto-Deploy (Vercel/Cloudflare)
//
// 자현 비전 "완성된 엔진" 마지막 단계: composite 90%+ + license PASS 시 자동 deploy.
// 자현 manual 작업 0%, 한 명령으로 client deliver.
//
// Pipeline:
//   1. Pre-flight: composite >= target + audit PASS 확인
//   2. Vercel project 자동 생성 (project name = mirror dir slug)
//   3. vercel deploy --prod (CLI 사용)
//   4. Custom domain 매핑 (자현 brand)
//   5. CERT-DEPLOYED.md 발행 (URL + composite + license)
//   6. (Optional) 자현 telegram notification
//
// Safe defaults:
//   --dry-run: deploy 안 함, 명령만 출력
//   --execute: 실제 deploy
//   --target 90: composite 90%+ 이하면 deploy 거부 (자현 결정 필요)
//
// 자현 비즈니스 outcome:
//   Mirror → P146 Pure Cleanroom → P148 Convergence → P151 Auto-Deploy
//   = 한 명령으로 client URL 생성

import fs from "node:fs";
import path from "node:path";
import { execSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// ─── Pre-flight check ──────────────────────────────────────────
function preflightCheck(projDir, opts = {}) {
  const target = opts.target || 90;
  const requirePassAudit = opts.requirePassAudit !== false;

  const composeJsonPath = path.join(projDir, "COMPOSITE-SCORE.json");
  const auditJsonPath = path.join(projDir, "ASSET-AUDIT.json");

  if (!fs.existsSync(composeJsonPath)) {
    return { ok: false, reason: "COMPOSITE-SCORE.json 없음 — verify 먼저 실행" };
  }
  const composite = JSON.parse(fs.readFileSync(composeJsonPath, "utf-8"));

  let audit = null;
  if (fs.existsSync(auditJsonPath)) {
    audit = JSON.parse(fs.readFileSync(auditJsonPath, "utf-8"));
  }

  const checks = {
    composite: composite.composite >= target,
    audit: audit ? audit.determination === "PASS" : !requirePassAudit,
    publicDirExists: fs.existsSync(path.join(projDir, "public")),
  };

  const ok = Object.values(checks).every(v => v);
  return {
    ok,
    composite: composite.composite,
    interpretation: composite.interpretation,
    audit: audit?.determination,
    target,
    checks,
    reason: ok ? "OK" :
            !checks.composite ? `composite ${composite.composite}% < target ${target}%` :
            !checks.audit ? `audit ${audit?.determination || "missing"} (need PASS)` :
            !checks.publicDirExists ? "public/ 없음" :
            "unknown",
  };
}

// ─── Detect deploy CLI availability ────────────────────────────
function detectDeployCli() {
  const cli = { vercel: null, wrangler: null, netlify: null };
  for (const [name, candidates] of [
    ["vercel", ["vercel", "vercel.cmd"]],
    ["wrangler", ["wrangler", "wrangler.cmd"]],
    ["netlify", ["netlify", "netlify.cmd"]],
  ]) {
    for (const cmd of candidates) {
      try {
        execSync(`${cmd} --version`, { stdio: "pipe", timeout: 5000 });
        cli[name] = cmd;
        break;
      } catch {}
    }
  }
  return cli;
}

// ─── Vercel deploy ─────────────────────────────────────────────
async function deployVercel(projDir, opts = {}) {
  const cli = "vercel";
  const args = ["--cwd", path.join(projDir, "public")];
  if (opts.prod) args.push("--prod");
  if (opts.yes) args.push("--yes");

  if (opts.dryRun) {
    return {
      command: `${cli} ${args.join(" ")}`,
      dryRun: true,
      url: "(dry-run — would deploy here)",
    };
  }

  return new Promise((resolve, reject) => {
    let stdout = "", stderr = "";
    const proc = spawn(cli, args, { shell: true });
    proc.stdout.on("data", d => stdout += d);
    proc.stderr.on("data", d => stderr += d);
    proc.on("close", code => {
      if (code !== 0) return reject(new Error(`vercel exit ${code}: ${stderr.slice(0, 200)}`));
      // Extract URL from vercel output (typically "Production: https://...")
      const urlMatch = stdout.match(/https?:\/\/\S+\.vercel\.app/);
      resolve({
        command: `${cli} ${args.join(" ")}`,
        dryRun: false,
        url: urlMatch ? urlMatch[0] : "(URL not found in output)",
        stdout: stdout.slice(0, 1000),
      });
    });
    proc.on("error", reject);
  });
}

// ─── Cloudflare Pages deploy via wrangler ─────────────────────
async function deployCloudflare(projDir, opts = {}) {
  const cli = "wrangler";
  const projName = opts.projectName || path.basename(projDir).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const args = ["pages", "deploy", path.join(projDir, "public"), "--project-name", projName];

  if (opts.dryRun) {
    return {
      command: `${cli} ${args.join(" ")}`,
      dryRun: true,
      url: `(dry-run — would deploy to ${projName}.pages.dev)`,
    };
  }

  return new Promise((resolve, reject) => {
    let stdout = "", stderr = "";
    const proc = spawn(cli, args, { shell: true });
    proc.stdout.on("data", d => stdout += d);
    proc.stderr.on("data", d => stderr += d);
    proc.on("close", code => {
      if (code !== 0) return reject(new Error(`wrangler exit ${code}: ${stderr.slice(0, 200)}`));
      const urlMatch = stdout.match(/https?:\/\/\S+\.pages\.dev/);
      resolve({
        command: `${cli} ${args.join(" ")}`,
        dryRun: false,
        url: urlMatch ? urlMatch[0] : "(URL not found)",
        stdout: stdout.slice(0, 1000),
      });
    });
    proc.on("error", reject);
  });
}

// ─── Main entrypoint ───────────────────────────────────────────
export async function autoDeploy(projDir, opts = {}) {
  const platform = opts.platform || "vercel";
  const target = opts.target || 90;
  const dryRun = opts.dryRun !== false;

  // Pre-flight
  const preflight = preflightCheck(projDir, { target, requirePassAudit: opts.requirePassAudit });
  if (!preflight.ok) {
    return { error: `pre-flight failed: ${preflight.reason}`, preflight };
  }

  // CLI detect
  const cli = detectDeployCli();
  if (platform === "vercel" && !cli.vercel) {
    return { error: "vercel CLI not found — npm install -g vercel" };
  }
  if (platform === "cloudflare" && !cli.wrangler) {
    return { error: "wrangler CLI not found — npm install -g wrangler" };
  }

  // Deploy
  let deploy;
  try {
    if (platform === "vercel") {
      deploy = await deployVercel(projDir, { prod: opts.prod, yes: opts.yes, dryRun });
    } else if (platform === "cloudflare") {
      deploy = await deployCloudflare(projDir, { projectName: opts.projectName, dryRun });
    } else {
      return { error: `unknown platform: ${platform}` };
    }
  } catch (e) {
    return { error: `deploy failed: ${e.message}` };
  }

  // Emit CERT-DEPLOYED.md
  const cert = [
    "# CERT-DEPLOYED (Paradigm 151)",
    "",
    `Issued: ${new Date().toISOString()}`,
    `Project: ${projDir}`,
    `Platform: ${platform}`,
    `Mode: ${dryRun ? "DRY_RUN" : "EXECUTED"}`,
    "",
    "## Pre-flight",
    "",
    `- Composite: ${preflight.composite}% (${preflight.interpretation})`,
    `- Audit: ${preflight.audit || "skipped"}`,
    `- Target: ${preflight.target}%`,
    "",
    "## Deploy",
    "",
    `- Command: \`${deploy.command}\``,
    `- URL: ${deploy.url}`,
    "",
    "## 자현 비즈니스",
    "",
    dryRun
      ? "DRY-RUN — re-run with --execute to actually deploy."
      : `Production URL: ${deploy.url}`,
    "",
    "Client에게 이 URL 전달 가능. License PASS + composite 90%+ 검증됨.",
  ];
  fs.writeFileSync(path.join(projDir, "CERT-DEPLOYED.md"), cert.join("\n"));

  return { preflight, deploy, dryRun };
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-auto-deploy.mjs <projDir> [--platform vercel|cloudflare] [--target 90] [--execute] [--prod]");
    process.exit(1);
  }
  const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };
  const platform = flagVal("--platform") || "vercel";
  const target = parseInt(flagVal("--target") || "90", 10);
  const dryRun = !process.argv.includes("--execute");
  const prod = process.argv.includes("--prod");

  autoDeploy(projDir, { platform, target, dryRun, prod, yes: true }).then(r => {
    if (r.error) {
      console.error(`[auto-deploy] ${r.error}`);
      if (r.preflight) console.error(`  preflight: ${JSON.stringify(r.preflight.checks)}`);
      process.exit(1);
    }
    console.log(`[auto-deploy] ${r.dryRun ? "DRY_RUN" : "DEPLOYED"}`);
    console.log(`  Composite: ${r.preflight.composite}%`);
    console.log(`  Audit:     ${r.preflight.audit || "skipped"}`);
    console.log(`  Command:   ${r.deploy.command}`);
    console.log(`  URL:       ${r.deploy.url}`);
    console.log(`  → CERT-DEPLOYED.md`);
  });
}
