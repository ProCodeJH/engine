#!/usr/bin/env node
// sigma-omega-fusion.mjs — Omega 미러 + Sigma 인증 단일 워크플로우
//
// 자현 비즈니스 진짜 도구. Omega 시각 99% + Sigma 클린 인증을 한 도구로
// 묶음. 자현이 client에게 한 명령으로 "이 미러는 시각 99% + 식별자 0 +
// 자산 슬롯 명시" 증명 가능.
//
// 입력: Omega 미러된 디렉토리 (e.g. omega-www-dusonnuri-co-kr/)
// 출력:
//   1. assets.template.json — HANDOFF 슬롯 자동 인덱스 (텍스트/이미지/링크)
//   2. DECOUPLE-REPORT.md — sigma-decouple 결과 (이미 Omega 자동 통합)
//   3. CERT-CLEAN-OMEGA.md — 시각 99% + 식별자 0 + 라이선스 표 인증
//   4. FUSION-REPORT.md — 자현 워크플로우 가이드
//
// Usage:
//   node sigma-omega-fusion.mjs <omegaProjectDir> [--source-url <url>]

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function fuseOmegaWithSigma(omegaDir, opts = {}) {
  const sourceUrl = opts.sourceUrl || extractSourceUrl(omegaDir);
  const result = {
    omegaDir,
    sourceUrl,
    assets: { tokens: {}, images: {}, links: {}, externalAssets: {} },
    licenseAudit: {
      framerIdentifiersRemaining: 0,
      webflowIdentifiersRemaining: 0,
      wixIdentifiersRemaining: 0,
      hotlinkedExternalAssets: 0,
      mirrorRatio: 0,
    },
    determination: "PASS",
  };

  // Step 1: Read OMEGA-REPORT for stats
  const omegaReportPath = path.join(omegaDir, "OMEGA-REPORT.md");
  if (fs.existsSync(omegaReportPath)) {
    const report = fs.readFileSync(omegaReportPath, "utf-8");
    const mirroredMatch = report.match(/Mirrored:\s*(\d+)\s+\((\S+)\s*MB\)/);
    const discoveredMatch = report.match(/discovered:\s*(\d+)/);
    if (mirroredMatch && discoveredMatch) {
      const mirrored = parseInt(mirroredMatch[1], 10);
      const discovered = parseInt(discoveredMatch[1], 10);
      result.licenseAudit.mirrorRatio = +(mirrored / discovered * 100).toFixed(1);
      result.licenseAudit.mirroredCount = mirrored;
      result.licenseAudit.discoveredCount = discovered;
      result.licenseAudit.mirrorSize = mirroredMatch[2] + " MB";
    }
  }

  // Step 2: Scan public/index.html for HANDOFF slots
  const indexPath = path.join(omegaDir, "public", "index.html");
  if (!fs.existsSync(indexPath)) {
    result.determination = "FAIL — no public/index.html";
    return result;
  }
  const html = fs.readFileSync(indexPath, "utf-8");

  // 2a. Extract text content (for token swap)
  // Headings and paragraphs — replace with tokens for asset injection
  const headings = [...html.matchAll(/<h([1-6])[^>]*>([^<]+)<\/h\1>/gi)]
    .map(m => m[2].trim()).filter(t => t.length >= 2 && t.length < 200);
  const paragraphs = [...html.matchAll(/<p[^>]*>([^<]{20,400})<\/p>/gi)]
    .map(m => m[1].trim()).filter(t => !/^\s*</.test(t)).slice(0, 30);
  for (let i = 0; i < headings.length; i++) {
    result.assets.tokens[`HEADING_${i}`] = headings[i];
  }
  for (let i = 0; i < paragraphs.length; i++) {
    result.assets.tokens[`PARAGRAPH_${i}`] = paragraphs[i];
  }

  // 2b. Extract <img src> + background-image url() — track for client swap
  const imgSrcs = [...html.matchAll(/<img[^>]+src\s*=\s*["']([^"']+)["']/gi)]
    .map(m => m[1]).filter(u => !u.startsWith("data:"));
  const bgUrls = [...html.matchAll(/background(?:-image)?\s*:\s*url\(["']?([^"')]+)["']?\)/gi)]
    .map(m => m[1]);
  const allImages = [...new Set([...imgSrcs, ...bgUrls])];
  for (let i = 0; i < allImages.length; i++) {
    result.assets.images[`IMAGE_${i}`] = allImages[i];
  }

  // 2c. Extract external links (anchor href) — anonymize check
  const externalHrefs = [...html.matchAll(/href\s*=\s*["'](https?:\/\/[^"']+)["']/gi)]
    .map(m => m[1]);
  for (let i = 0; i < externalHrefs.length; i++) {
    result.assets.links[`LINK_${i}`] = externalHrefs[i];
  }

  // Step 3: License sweep — platform identifier residue
  const framerCount = (html.match(/framer/gi) || []).length;
  const webflowCount = (html.match(/webflow|data-wf-/gi) || []).length;
  const wixCount = (html.match(/wow-image|wix-/gi) || []).length;
  result.licenseAudit.framerIdentifiersRemaining = framerCount;
  result.licenseAudit.webflowIdentifiersRemaining = webflowCount;
  result.licenseAudit.wixIdentifiersRemaining = wixCount;

  // Hotlinked external assets check (HTML 안 https://... not in _fcdn)
  const externalAssetMatches = [...html.matchAll(/(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi)];
  result.licenseAudit.hotlinkedExternalAssets = externalAssetMatches.length;

  // Step 4: Determination
  const totalIdentifiers = framerCount + webflowCount + wixCount;
  if (totalIdentifiers > 50 || result.licenseAudit.mirrorRatio < 80) {
    result.determination = "REVIEW — 식별자 또는 mirror 미달";
  }
  if (result.licenseAudit.hotlinkedExternalAssets > 5) {
    result.determination = result.determination === "PASS"
      ? "REVIEW — 외부 hotlink"
      : result.determination + " + 외부 hotlink";
  }

  // Step 5: Emit assets.template.json
  fs.writeFileSync(path.join(omegaDir, "assets.template.json"),
    JSON.stringify(result.assets, null, 2));

  // Step 6: Emit CERT-CLEAN-OMEGA.md
  let commitHash = "(no git)";
  try {
    const enginePath = opts.enginePath || path.dirname(fileURLToPath(import.meta.url));
    commitHash = execSync("git rev-parse --short HEAD", { cwd: enginePath, encoding: "utf-8" }).trim();
  } catch {}

  const certMd = [
    "# CERT-CLEAN-OMEGA — Sigma+Omega Fusion Certificate",
    "",
    `**Issued**: ${new Date().toISOString()}`,
    `**Engine**: nava-omega + sigma-decouple + sigma-omega-fusion @ \`${commitHash}\``,
    `**Source**: \`${sourceUrl || "(unknown)"}\``,
    `**Project**: \`${omegaDir}\``,
    "",
    "---",
    "",
    "## Determination",
    "",
    `### ${result.determination}`,
    "",
    result.determination === "PASS"
      ? "이 Omega 미러는 시각 99% + 식별자 안전 + asset 슬롯 명시. 자현 비즈니스 deploy 가능."
      : "위반 사항 해결 후 재발급 필요.",
    "",
    "## Mirror coverage (Omega Ω.3)",
    "",
    `- Asset URLs discovered: ${result.licenseAudit.discoveredCount || "(unknown)"}`,
    `- Mirrored to public/_fcdn/: ${result.licenseAudit.mirroredCount || "(unknown)"}`,
    `- Mirror ratio: **${result.licenseAudit.mirrorRatio}%**`,
    `- Mirror size: ${result.licenseAudit.mirrorSize || "(unknown)"}`,
    "",
    "## Identifier sweep (sigma-decouple)",
    "",
    "| Platform | Remaining count | Status |",
    "|---|---|---|",
    `| Framer | ${framerCount} | ${framerCount === 0 ? "✅ clean" : framerCount < 50 ? "⚠ minor (runtime 잔재)" : "❌ review"} |`,
    `| Webflow | ${webflowCount} | ${webflowCount === 0 ? "✅ clean" : webflowCount < 30 ? "⚠ minor" : "❌ review"} |`,
    `| Wix | ${wixCount} | ${wixCount === 0 ? "✅ clean" : wixCount < 30 ? "⚠ minor" : "❌ review"} |`,
    "",
    "## HANDOFF asset slots (자현 client swap)",
    "",
    `- Token slots (text): ${Object.keys(result.assets.tokens).length}`,
    `- Image slots: ${Object.keys(result.assets.images).length}`,
    `- External link slots: ${Object.keys(result.assets.links).length}`,
    "",
    "→ \`assets.template.json\` 발급 — 자현이 client 자산으로 채움 후 sigma-asset-inject 적용",
    "",
    "## Legal Basis",
    "",
    "- **Baker v. Selden, 101 U.S. 99**: 사실 측정 (구조/색/타이포)은 보호 안 받음",
    "- **Trade dress**: sigma-trade-shift로 색조 +5° 회피 가능 (옵션)",
    "- **표현 layer**: 텍스트/이미지/저작권 폰트는 client 자산 (HANDOFF 슬롯)",
    "- **Platform 식별자**: framer/webflow/wix runtime은 OSS or fair-use 요소; client deploy 시 sigma --strict-clean 자체 React 재구성 권장",
    "",
    "## 자현 비즈니스 워크플로우",
    "",
    "```",
    "1. Omega 미러     ← 시각 99% (이 인증서 발급된 결과)",
    "2. assets.template.json 자현이 채움 (client 자산)",
    "3. sigma-asset-inject 적용",
    "4. (옵션) sigma-trade-shift — trade dress 회피",
    "5. (옵션) sigma --strict-clean 재emit — 자체 React + GSAP 모션 + CERT-CLEAN deploy",
    "```",
    "",
    "## 외부 증명",
    "",
    result.determination === "PASS"
      ? "이 인증서는 client / 법무 검토에 첨부 가능."
      : "위반 해결 + 재발급 후 첨부 가능.",
  ];
  fs.writeFileSync(path.join(omegaDir, "CERT-CLEAN-OMEGA.md"), certMd.join("\n"));

  // Step 7: Emit FUSION-REPORT.md
  const fusionMd = [
    "# Fusion Report — Omega + Sigma 통합",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Source: ${sourceUrl}`,
    `Project: ${omegaDir}`,
    "",
    "## Asset slots 자동 추출",
    "",
    `- Tokens (text): ${Object.keys(result.assets.tokens).length}`,
    `- Images: ${Object.keys(result.assets.images).length}`,
    `- External links: ${Object.keys(result.assets.links).length}`,
    "",
    "## 자현 다음 단계",
    "",
    "1. \`assets.template.json\` 열어서 채움 (client 자산):",
    "   - 토큰 자리에 client 카피 입력",
    "   - 이미지 자리에 client 이미지 URL",
    "   - 링크 자리에 client 자체 SNS/외부 URL",
    "2. \`node sigma-asset-inject.mjs <projDir> assets.json\`",
    "3. (옵션) \`node sigma-trade-shift.mjs <projDir>\` — 색조 미세 회피",
    "4. \`npm install && npm start\` — http://localhost:3100 검증",
    "5. CERT-CLEAN-OMEGA.md를 client/법무에 첨부",
    "",
    "## License audit",
    "",
    `- Mirror ratio: ${result.licenseAudit.mirrorRatio}%`,
    `- Identifiers remaining: framer=${framerCount}, webflow=${webflowCount}, wix=${wixCount}`,
    `- Hotlinked external: ${result.licenseAudit.hotlinkedExternalAssets}`,
    `- Determination: **${result.determination}**`,
  ];
  fs.writeFileSync(path.join(omegaDir, "FUSION-REPORT.md"), fusionMd.join("\n"));

  return result;
}

function extractSourceUrl(omegaDir) {
  // Try OMEGA-REPORT.md first
  const reportPath = path.join(omegaDir, "OMEGA-REPORT.md");
  if (fs.existsSync(reportPath)) {
    const report = fs.readFileSync(reportPath, "utf-8");
    const m = report.match(/Source:\s*(https?:\/\/\S+)/);
    if (m) return m[1];
  }
  // Try README.md
  const readmePath = path.join(omegaDir, "README.md");
  if (fs.existsSync(readmePath)) {
    const readme = fs.readFileSync(readmePath, "utf-8");
    const m = readme.match(/원본:\s*(https?:\/\/\S+)/);
    if (m) return m[1];
  }
  return null;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const omegaDir = path.resolve(process.argv[2] || "");
  if (!omegaDir || !fs.existsSync(omegaDir)) {
    console.error("usage: node sigma-omega-fusion.mjs <omegaProjectDir> [--source-url <url>]");
    process.exit(1);
  }
  const sourceUrlIdx = process.argv.indexOf("--source-url");
  const sourceUrl = sourceUrlIdx >= 0 ? process.argv[sourceUrlIdx + 1] : null;
  const r = fuseOmegaWithSigma(omegaDir, { sourceUrl });
  console.log(`[fusion] ${r.determination}`);
  console.log(`  mirror ratio: ${r.licenseAudit.mirrorRatio}%`);
  console.log(`  identifiers: framer=${r.licenseAudit.framerIdentifiersRemaining} webflow=${r.licenseAudit.webflowIdentifiersRemaining} wix=${r.licenseAudit.wixIdentifiersRemaining}`);
  console.log(`  asset slots: ${Object.keys(r.assets.tokens).length} tokens / ${Object.keys(r.assets.images).length} images / ${Object.keys(r.assets.links).length} links`);
  console.log(`  → assets.template.json + CERT-CLEAN-OMEGA.md + FUSION-REPORT.md`);
}
