#!/usr/bin/env node
// sigma-deploy.mjs — Paradigm 226 — Auto-Deploy (Vercel/Cloudflare/Netlify)
//
// 자현 명령 끝까지: 한 명령에 deploy URL 까지.

import fs from "node:fs";
import path from "node:path";
import { execSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

function detectCli() {
  const cli = { vercel: null, wrangler: null, netlify: null };
  for (const [name, cmds] of [
    ["vercel", ["vercel", "vercel.cmd"]],
    ["wrangler", ["wrangler", "wrangler.cmd"]],
    ["netlify", ["netlify", "netlify.cmd"]],
  ]) {
    for (const cmd of cmds) {
      try {
        execSync(`${cmd} --version`, { stdio: "pipe", timeout: 5000 });
        cli[name] = cmd;
        break;
      } catch {}
    }
  }
  return cli;
}

async function runCli(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    let stdout = "", stderr = "";
    const proc = spawn(cmd, args, { shell: true, ...opts });
    proc.stdout?.on("data", d => { stdout += d; if (opts.verbose) process.stdout.write(d); });
    proc.stderr?.on("data", d => { stderr += d; if (opts.verbose) process.stderr.write(d); });
    proc.on("close", code => resolve({ code, stdout, stderr }));
    proc.on("error", reject);
  });
}

export async function deployVercel(projDir, opts = {}) {
  const cli = detectCli().vercel;
  if (!cli) return { error: "vercel CLI not found — npm install -g vercel" };

  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const args = ["deploy", "--cwd", projDir];
  if (opts.prod) args.push("--prod");
  if (opts.yes) args.push("--yes");

  console.log(`[deploy:vercel] ${cli} ${args.join(" ")}`);
  const r = await runCli(cli, args, { verbose: opts.verbose });
  if (r.code !== 0) return { error: `vercel exit ${r.code}: ${r.stderr.slice(0, 200)}` };

  const urlMatch = r.stdout.match(/https?:\/\/\S+\.vercel\.app/);
  return {
    platform: "vercel",
    url: urlMatch ? urlMatch[0] : "(URL not found in output)",
    stdout: r.stdout.slice(0, 500),
  };
}

export async function deployCloudflare(projDir, opts = {}) {
  const cli = detectCli().wrangler;
  if (!cli) return { error: "wrangler CLI not found — npm install -g wrangler" };

  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const projName = (opts.projectName || path.basename(projDir))
    .replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const args = ["pages", "deploy", publicDir, "--project-name", projName];

  console.log(`[deploy:cloudflare] ${cli} ${args.join(" ")}`);
  const r = await runCli(cli, args, { verbose: opts.verbose });
  if (r.code !== 0) return { error: `wrangler exit ${r.code}: ${r.stderr.slice(0, 200)}` };

  const urlMatch = r.stdout.match(/https?:\/\/\S+\.pages\.dev/);
  return {
    platform: "cloudflare",
    url: urlMatch ? urlMatch[0] : "(URL not found)",
  };
}

export async function autoDeploy(projDir, opts = {}) {
  const platform = opts.platform || "vercel";

  let result;
  if (platform === "vercel") {
    result = await deployVercel(projDir, opts);
  } else if (platform === "cloudflare") {
    result = await deployCloudflare(projDir, opts);
  } else {
    return { error: `unknown platform: ${platform}` };
  }

  if (result.error) return result;

  // Emit CERT-DEPLOYED.md
  fs.writeFileSync(path.join(projDir, "CERT-DEPLOYED.md"),
`# CERT-DEPLOYED (Paradigm 226)

Issued: ${new Date().toISOString()}
Platform: ${result.platform}
URL: ${result.url}

자현 client deploy URL. 진짜 production-ready.
`);

  return result;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-deploy.mjs <projDir> [--platform vercel|cloudflare] [--prod]");
    process.exit(1);
  }
  const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };
  const platform = flagVal("--platform") || "vercel";
  const prod = process.argv.includes("--prod");

  autoDeploy(projDir, { platform, prod, yes: true, verbose: true }).then(r => {
    if (r.error) { console.error(r.error); process.exit(1); }
    console.log(`\n[deploy] ${r.platform}`);
    console.log(`  URL: ${r.url}`);
    console.log(`  → CERT-DEPLOYED.md`);
  });
}
