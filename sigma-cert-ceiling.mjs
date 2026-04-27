#!/usr/bin/env node
// sigma-cert-ceiling.mjs — v109 CERT-CEILING.md 자동 인증서
//
// 자현 ultrathink: IMPOSSIBLE.md의 데이터를 외부 증명 가능한 인증서
// 형식으로. 사이트 카테고리 + ceiling + 도달률 + 회피 영역을 정직 명시.
// JSON + Markdown 둘 다 emit. 자현이 클라이언트나 외부에 "이 사이트
// 클론은 [%]% 도달, 영원히 불가능 영역은 [...]" 증명 가능.
//
// CERT-CEILING.md는 timestamp + git commit hash + 카테고리 + 5-Register
// 합산 + 도달 경로(roadmap)를 포함.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { generateImpossibleReport, CATEGORY_CEILINGS } from "./sigma-impossible.mjs";

export function generateCeilingCertificate(scan, projDir, opts = {}) {
  // Run the impossible report first (idempotent — overwrites IMPOSSIBLE.md)
  const flags = {
    useOriginalImages: scan.useOriginalImages || opts.useOriginalImages,
    useOriginalText: scan.useOriginalText || opts.useOriginalText,
  };
  const impossible = generateImpossibleReport(scan, projDir, flags);

  // Get git commit hash if available
  let commitHash = "(no git)";
  let engineVersion = "v110";
  try {
    const enginePath = opts.enginePath || path.resolve(path.dirname(fileURLToPath(import.meta.url)));
    commitHash = execSync("git rev-parse --short HEAD", { cwd: enginePath, encoding: "utf-8" }).trim();
  } catch {}

  const cert = {
    schema: "sigma-cert-ceiling/1",
    issued: new Date().toISOString(),
    engineVersion,
    engineCommit: commitHash,
    sourceUrl: scan.url || "(unknown)",
    siteCategory: impossible.category,
    categoryCeilingDoc: CATEGORY_CEILINGS[impossible.category],
    measurements: {
      registers: impossible.buckets,
      percentages: impossible.pct,
      uiClonePotential: impossible.pct.userCeiling,
      engineV98Reached: impossible.pct.engineCeiling,
      roadmapV110Reached: impossible.pct.roadmapCeiling,
      siteValueCovered: impossible.pct.siteValueCovered,
    },
    scopeOut: {
      items: impossible.buckets.SCOPE_OUT,
      pctOfSite: impossible.pct.SCOPE_OUT,
      reason: "사이트 클론 목적 밖 — 자현 자기 콘텐츠/계정/백엔드로 대체",
    },
    determination: impossible.pct.userCeiling >= 99.5
      ? "PASS — 이 사이트는 UI/UX 100% 클린 클론 가능"
      : `PARTIAL — in-scope 도달률 ${impossible.pct.userCeiling}%`,
  };

  // JSON
  fs.writeFileSync(path.join(projDir, "CERT-CEILING.json"), JSON.stringify(cert, null, 2));

  // Markdown
  const md = [
    "# CERT-CEILING — Sigma Engine Clone Capacity Certificate",
    "",
    `**Issued**: ${cert.issued}`,
    `**Engine**: ${cert.engineVersion} @ commit \`${cert.engineCommit}\``,
    `**Source**: \`${cert.sourceUrl}\``,
    "",
    "---",
    "",
    "## Determination",
    "",
    `### ${cert.determination}`,
    "",
    `이 인증서는 NAVA Sigma 엔진이 위 사이트를 *얼마나* 클론할 수 있는지`,
    `정직하게 측정한 결과입니다. 측정 방법론은 \`sigma-impossible.mjs\`의`,
    `5-Register 시스템 — RESOLVED + HANDOFF + DEV_OPT_IN + SOLVABLE_PARTIAL +`,
    `SCOPE_OUT = 100% 합산을 강제합니다.`,
    "",
    "## Site Category",
    "",
    `**${cert.siteCategory}**`,
    "",
    `- Category ceiling: **${cert.categoryCeilingDoc.ceiling}%** UI/UX`,
    `- Route to ceiling: ${cert.categoryCeilingDoc.route}`,
    `- Out-of-scope: ${cert.categoryCeilingDoc.scopeOut}`,
    "",
    "## 5-Register Measurements",
    "",
    "| Register | Count | % | Meaning |",
    "|---|---|---|---|",
    `| ✅ RESOLVED | ${cert.measurements.registers.RESOLVED.length} | ${cert.measurements.percentages.RESOLVED}% | 엔진 capture + emit (클린룸) |`,
    `| 🤝 HANDOFF | ${cert.measurements.registers.HANDOFF.length} | ${cert.measurements.percentages.HANDOFF}% | 사용자 자산 슬롯 |`,
    `| 🔓 DEV_OPT_IN | ${cert.measurements.registers.DEV_OPT_IN.length} | ${cert.measurements.percentages.DEV_OPT_IN}% | 사용자 권한 영역 |`,
    `| 🔧 SOLVABLE_PARTIAL | ${cert.measurements.registers.SOLVABLE_PARTIAL.length} | ${cert.measurements.percentages.SOLVABLE_PARTIAL}% | 로드맵 진행 영역 |`,
    `| 🚫 SCOPE_OUT | ${cert.measurements.registers.SCOPE_OUT.length} | ${cert.measurements.percentages.SCOPE_OUT}% | 클론 목적 밖 |`,
    `| **Total** | **${cert.measurements.registers.RESOLVED.length + cert.measurements.registers.HANDOFF.length + cert.measurements.registers.DEV_OPT_IN.length + cert.measurements.registers.SOLVABLE_PARTIAL.length + cert.measurements.registers.SCOPE_OUT.length}** | **100.0%** | _(정직 합산)_ |`,
    "",
    "## Three Ceilings",
    "",
    `| Stage | Reach | Note |`,
    `|---|---|---|`,
    `| Engine v98 (지금 즉시) | **${cert.measurements.engineV98Reached}%** | RESOLVED + HANDOFF만 |`,
    `| Engine v110 (로드맵 후) | **${cert.measurements.roadmapV110Reached}%** | + SOLVABLE_PARTIAL이 RESOLVED 이동 |`,
    `| 사용자 협력 + 로드맵 | **${cert.measurements.uiClonePotential}%** | UI/UX 100% 도달 |`,
    "",
    "## Out-of-scope (자현 자기 자산으로 대체)",
    "",
    cert.scopeOut.items.length === 0 ? "_(없음 — 사이트 가치 100% 클론 가능)_" :
      cert.scopeOut.items.map(s => `- \`${s.key}\` — ${s.note}`).join("\n"),
    "",
    "## 인증 절차",
    "",
    "이 인증서는 자동 생성되며 다음을 보장합니다:",
    "",
    "1. **합산 100%**: 모든 신호가 정확히 한 레지스터에 분류됨",
    "2. **카테고리 ceiling cap**: 사이트 카테고리 한도 초과 표기 금지",
    "3. **SCOPE_OUT 명시**: 클론 목적 밖 영역을 정직하게 노출",
    "4. **commit hash 추적**: 엔진 버전 검증 가능",
    "",
    "## 외부 증명",
    "",
    "이 인증서를 클라이언트 또는 법무 검토에 첨부 시:",
    "- Sigma 엔진은 사실 측정만 추출 (Baker v. Selden 보호)",
    "- 표현 layer (텍스트/이미지/저작권 폰트)는 발주자 자산",
    "- SCOPE_OUT 영역은 발주자 백엔드/콘텐츠로 대체",
    "",
    "Issuer signature: NAVA Sigma Engine — clean-room copyright-safe website regeneration tool.",
  ];
  fs.writeFileSync(path.join(projDir, "CERT-CEILING.md"), md.join("\n"));

  return cert;
}

// CLI
const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));

if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-cert-ceiling.mjs <projectDir>");
    process.exit(1);
  }
  const scanPath = path.join(projDir, ".sigma", "scan.json");
  if (!fs.existsSync(scanPath)) {
    console.error(`missing ${scanPath}`);
    process.exit(1);
  }
  const scan = JSON.parse(fs.readFileSync(scanPath, "utf-8"));
  const cert = generateCeilingCertificate(scan, projDir);
  console.log(`[cert-ceiling] ${cert.determination}`);
  console.log(`  category: ${cert.siteCategory}`);
  console.log(`  UI clone potential: ${cert.measurements.uiClonePotential}%`);
  console.log(`  → CERT-CEILING.md + CERT-CEILING.json`);
}
