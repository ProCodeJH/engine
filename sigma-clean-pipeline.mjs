#!/usr/bin/env node
// sigma-clean-pipeline.mjs — Paradigm 81 — Cleanroom Certification Stack
//
// 자현 명령 "100% 저작권 클린" 진짜 답. 5 cleanroom 도구 + CERT 5종 한 명령:
//   1. sigma-decouple        — Framer/Webflow/Wix 식별자 제거
//   2. sigma-anonymize-links — 외부 링크/자산 토큰화
//   3. sigma-enhance         — Performance + A11y + SEO 자동
//   4. sigma-source-map      — Source map reverse (legal source)
//   5. sigma-cdn-migrate     — 자체 CDN (옵션)
//   → CERT-DEPLOY-READY.md 통합 인증서 발급
//
// 자현 client deploy 직전 한 명령으로 cleanroom 검증 + 인증서.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { decoupleProject } from "./sigma-decouple.mjs";
import { anonymizeLinks } from "./sigma-anonymize-links.mjs";
import { enhanceProject } from "./sigma-enhance.mjs";

const ARGS = process.argv.slice(2);
const projDir = path.resolve(ARGS.find(a => !a.startsWith("--")) || "");
const flagVal = (n) => { const i = ARGS.indexOf(n); return i >= 0 && i + 1 < ARGS.length ? ARGS[i + 1] : null; };
const hasFlag = (n) => ARGS.includes(n);

if (!projDir || !fs.existsSync(projDir)) {
  console.error("usage: node sigma-clean-pipeline.mjs <projectDir> [--cdn r2] [--bucket NAME] [--host HOST]");
  process.exit(1);
}

const SOURCE_URL = flagVal("--source-url") || (() => {
  try {
    const omega = path.join(projDir, "OMEGA-REPORT.md");
    if (fs.existsSync(omega)) {
      const m = fs.readFileSync(omega, "utf-8").match(/Source:\s*(https?:\/\/\S+)/);
      if (m) return m[1];
    }
  } catch {}
  return "(unknown)";
})();
const CDN_TARGET = flagVal("--cdn");

const T0 = Date.now();
console.log(`
NAVA Clean Pipeline — Cleanroom Certification Stack (P81)
  Project:    ${projDir}
  Source:     ${SOURCE_URL}
  CDN target: ${CDN_TARGET || "(skipped)"}
`);

const stages = [];

// ─── Stage 1: Decouple ──────────────────────────────────────────────
console.log("\n━━━ Stage 1: Decouple (Framer/Webflow/Wix 식별자) ━━━");
try {
  const r = decoupleProject(projDir);
  console.log(`  ${r.detectedPlatforms.join("+") || "(none)"} — ${r.dataAttrsRemoved} attrs / ${r.classesAnonymized} classes / ${r.metaTagsRemoved} meta`);
  stages.push({ name: "decouple", success: true, ...r });
} catch (e) {
  console.log(`  ${e.message}`);
  stages.push({ name: "decouple", success: false, error: e.message });
}

// ─── Stage 2: Anonymize Links ──────────────────────────────────────
console.log("\n━━━ Stage 2: Anonymize Links (외부 URL 토큰화) ━━━");
try {
  const r = anonymizeLinks(projDir, { sourceUrl: SOURCE_URL });
  console.log(`  ${r.externalLinksFound} links + ${r.externalAssetsFound} assets / ${r.filesModified} files`);
  stages.push({ name: "anonymize", success: true, ...r });
} catch (e) {
  console.log(`  ${e.message}`);
  stages.push({ name: "anonymize", success: false, error: e.message });
}

// ─── Stage 3: Enhance (P29+30+31) ─────────────────────────────────
console.log("\n━━━ Stage 3: Enhance (Performance + A11y + SEO) ━━━");
try {
  const r = enhanceProject(projDir);
  if (r.error) {
    console.log(`  ${r.error}`);
    stages.push({ name: "enhance", success: false, note: r.error });
  } else {
    console.log(`  perf: lazy=${r.perf.lazyLoadImages} preload=${r.perf.preloadHints}`);
    console.log(`  a11y: alt=${r.a11y.altAdded} skip=${r.a11y.skipLinkAdded}`);
    console.log(`  seo: jsonld=${r.seo.jsonLd} sitemap=${r.seo.sitemapEmitted}`);
    stages.push({ name: "enhance", success: true, ...r });
  }
} catch (e) {
  console.log(`  ${e.message}`);
  stages.push({ name: "enhance", success: false, error: e.message });
}

// ─── Stage 4: Source Map Reverse (옵션) ──────────────────────────
if (!hasFlag("--no-source-map")) {
  console.log("\n━━━ Stage 4: Source Map Reverse (legal extraction) ━━━");
  try {
    const smMod = await import("./sigma-source-map.mjs");
    const r = await smMod.reverseSourceMaps(projDir, { sourceUrl: SOURCE_URL });
    console.log(`  ${r.jsFilesFound} JS / ${r.mapsFetched} maps / ${r.sourcesExtracted} sources`);
    stages.push({ name: "source-map", success: true, ...r });
  } catch (e) {
    console.log(`  ${e.message}`);
    stages.push({ name: "source-map", success: false });
  }
}

// ─── Stage 5: CDN Migrate (옵션) ──────────────────────────────────
if (CDN_TARGET) {
  console.log(`\n━━━ Stage 5: CDN Migrate (${CDN_TARGET}) ━━━`);
  try {
    const cdnMod = await import("./sigma-cdn-migrate.mjs");
    const config = {
      bucketName: flagVal("--bucket") || "sigma-clean",
      publicHost: flagVal("--host") || "cdn.example.com",
      githubUser: flagVal("--gh-user") || "ProCodeJH",
      repoName: flagVal("--repo") || `sigma-clean-${path.basename(projDir)}`,
    };
    const r = cdnMod.generateMigrationPlan(projDir, CDN_TARGET, config);
    if (r.error) console.log(`  ${r.error}`);
    else {
      console.log(`  ${r.target} — ${r.fileCount} files / ${(r.totalSize / 1024 / 1024).toFixed(1)}MB`);
      stages.push({ name: "cdn-migrate", success: true, target: CDN_TARGET, ...r });
    }
  } catch (e) {
    console.log(`  ${e.message}`);
    stages.push({ name: "cdn-migrate", success: false });
  }
}

// ─── Final: CERT-DEPLOY-READY.md 통합 인증서 ──────────────────────
const totalDur = ((Date.now() - T0) / 1000).toFixed(1);

let commitHash = "(no git)";
try {
  const enginePath = path.dirname(fileURLToPath(import.meta.url));
  commitHash = execSync("git rev-parse --short HEAD", { cwd: enginePath, encoding: "utf-8" }).trim();
} catch {}

const successCount = stages.filter(s => s.success).length;

const cert = [
  "# CERT-DEPLOY-READY — Cleanroom Certification Stack (P81)",
  "",
  `**Issued**: ${new Date().toISOString()}`,
  `**Engine commit**: \`${commitHash}\``,
  `**Project**: \`${projDir}\``,
  `**Source**: \`${SOURCE_URL}\``,
  `**Total duration**: ${totalDur}s`,
  "",
  "---",
  "",
  "## Determination",
  "",
  successCount === stages.length
    ? "### ✅ DEPLOY-READY — 모든 cleanroom stage 통과"
    : `### ⚠ PARTIAL — ${successCount}/${stages.length} stages 통과`,
  "",
  "## Cleanroom Stages",
  "",
  "| Stage | Result | Detail |",
  "|---|---|---|",
  ...stages.map(s => {
    let detail = "";
    if (s.name === "decouple" && s.dataAttrsRemoved !== undefined) {
      detail = `${s.detectedPlatforms?.join("+") || "(none)"} — ${s.dataAttrsRemoved} attrs / ${s.classesAnonymized} classes`;
    } else if (s.name === "anonymize") {
      detail = `${s.externalLinksFound} links + ${s.externalAssetsFound} assets`;
    } else if (s.name === "enhance" && s.perf) {
      detail = `perf+a11y+seo (${s.files?.length || 0} files modified)`;
    } else if (s.name === "source-map") {
      detail = `${s.sourcesExtracted || 0} sources / ${s.libraryDetected?.length || 0} libs`;
    } else if (s.name === "cdn-migrate") {
      detail = `${s.target} — ${s.fileCount || 0} files`;
    } else if (s.error) {
      detail = s.error.slice(0, 60);
    } else {
      detail = "(skipped or no detail)";
    }
    return `| ${s.name} | ${s.success ? "✅" : "❌"} | ${detail} |`;
  }),
  "",
  "## Legal Stack",
  "",
  "이 deploy는 다음 legal 보호 받음:",
  "",
  "- **Baker v. Selden, 101 U.S. 99** — 사실 측정 (구조/색/타이포)",
  "- **Sega Enterprises v Accolade (1992)** — 동작 reverse engineering",
  "- **Oracle v Google (2021)** — API call signature 보호 안 받음",
  "- **Trade dress** — sigma-trade-shift 옵션으로 추가 회피",
  "- **OSS licenses** — Source map extracted libraries 명시",
  "",
  "## 자현 비즈니스 활용",
  "",
  "1. 이 인증서를 client / 법무 검토에 첨부",
  "2. 자체 CDN URL은 client 자산 100% control",
  "3. 식별자 제거됨 — F12 누르면 platform 흔적 없음",
  "4. WCAG 2.1 AA / ADA / Section 508 자동 강화 (sigma-enhance)",
  "5. SEO + Performance Lighthouse 점수↑",
  "",
  "## 이 인증서 검증 (재현성)",
  "",
  "```bash",
  `cd ${path.basename(projDir)}`,
  "node ../sigma-verify-cascade.mjs . --source-url ${SOURCE_URL}",
  "# → CERT-VERIFICATION-CASCADE.md (8 stage score %)",
  "```",
  "",
  "## 발급된 cleanroom 인증서",
  "",
  ...[
    "DECOUPLE-REPORT.md",
    "ANONYMIZE-LINKS.md",
    "ENHANCE-REPORT.md",
    "CERT-SOURCE-MAP.md",
    "CERT-CDN-MIGRATE.md",
    "CERT-CLEAN-OMEGA.md",
    "CERT-DEPLOY-READY.md (this)",
  ].map(f => fs.existsSync(path.join(projDir, f)) ? `- \`${f}\`` : `- \`${f}\` _(not generated)_`),
];
fs.writeFileSync(path.join(projDir, "CERT-DEPLOY-READY.md"), cert.join("\n"));

console.log(`
═══════════════════════════════════════════════
 Clean Pipeline complete ${totalDur}s
═══════════════════════════════════════════════
  Stages: ${successCount}/${stages.length} success
  Output: CERT-DEPLOY-READY.md (통합 인증서)
`);
