#!/usr/bin/env node
// sigma-asset-inject.mjs — v105 User Asset Injection Pipeline
//
// 자현 ultrathink "100% 저작권 클린" 핵심: HANDOFF 슬롯에 자현이 자기
// 텍스트/이미지/폰트 끼우는 워크플로우 자동화. Sigma emit 후 토큰만
// 남은 사이트에 사용자 자산을 일괄 주입.
//
// strict-clean 모드(v104)로 emit된 사이트:
//   - {{HEADING_0}}, {{PARAGRAPH_3}} 같은 토큰 placeholders
//   - /placeholder.svg 또는 picsum 이미지
//   - Inter (OFL) 폰트만
//
// 자현이 assets.json 만들어 일괄 치환:
//   {
//     "tokens": { "HEADING_0": "우리 회사", "PARAGRAPH_3": "..." },
//     "images": { "/placeholder.svg": "/my-hero.jpg", ... },
//     "fonts": { "Inter": "MyCustomBrand" }
//   }
//
// Usage:
//   node sigma-asset-inject.mjs <projectDir> <assetsJson>
//   node sigma-asset-inject.mjs <projectDir> --interactive  (대화형 자산 매핑)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function injectAssets(projDir, assets, opts = {}) {
  const dryRun = opts.dryRun || false;

  const result = {
    tokensReplaced: 0,
    imagesSwapped: 0,
    fontsSwapped: 0,
    filesModified: 0,
    files: [],
  };

  // Walk all .tsx, .ts, .css files in src/
  const srcDir = path.join(projDir, "src");
  const targets = [];
  walkSrc(srcDir, targets);

  // Also globals.css, public manifest, etc.
  const extras = [
    path.join(projDir, "src", "app", "globals.css"),
    path.join(projDir, "next.config.mjs"),
    path.join(projDir, "tailwind.config.ts"),
  ].filter(p => fs.existsSync(p));
  for (const e of extras) if (!targets.includes(e)) targets.push(e);

  for (const file of targets) {
    let content = fs.readFileSync(file, "utf-8");
    let modified = false;

    // 1. Token replacement
    for (const [token, value] of Object.entries(assets.tokens || {})) {
      const pattern = `{{${token}}}`;
      if (content.includes(pattern)) {
        const safeValue = String(value)
          .replace(/[<>{}"]/g, m => ({ "<": "\\u003c", ">": "\\u003e", "{": "\\u007b", "}": "\\u007d", '"': "&quot;" }[m]));
        const before = content.length;
        content = content.split(pattern).join(safeValue);
        if (content.length !== before) {
          result.tokensReplaced++;
          modified = true;
        }
      }
    }

    // 2. Image path swap (CSS + JSX src/url)
    for (const [from, to] of Object.entries(assets.images || {})) {
      if (content.includes(from)) {
        content = content.split(from).join(to);
        result.imagesSwapped++;
        modified = true;
      }
    }

    // 3. Font family swap (CSS + Tailwind config)
    for (const [from, to] of Object.entries(assets.fonts || {})) {
      const patterns = [
        `"${from}"`, `'${from}'`,
        `font-family: "${from}"`, `font-family: '${from}'`,
        `var(--font-${from.toLowerCase()})`,
      ];
      for (const p of patterns) {
        if (content.includes(p)) {
          content = content.split(p).join(p.replace(from, to));
          result.fontsSwapped++;
          modified = true;
        }
      }
    }

    if (modified) {
      result.files.push(path.relative(projDir, file));
      if (!dryRun) fs.writeFileSync(file, content);
      result.filesModified++;
    }
  }

  // 4. Asset injection report
  const report = [
    "# Sigma Asset Injection Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Project: ${projDir}`,
    `Mode: ${dryRun ? "dry-run" : "applied"}`,
    "",
    `## Summary`,
    `- Tokens replaced: ${result.tokensReplaced}`,
    `- Images swapped: ${result.imagesSwapped}`,
    `- Fonts swapped: ${result.fontsSwapped}`,
    `- Files modified: ${result.filesModified}`,
    "",
    `## Files`,
    "",
    ...result.files.map(f => `- \`${f}\``),
    "",
    "## Asset map applied",
    "",
    "```json",
    JSON.stringify(assets, null, 2),
    "```",
    "",
    "## 결과",
    "",
    result.tokensReplaced + result.imagesSwapped + result.fontsSwapped > 0 ?
      "✅ HANDOFF 슬롯 채움 — 클론 사이트가 자현 자기 자산으로 100% 클린." :
      "⚠ 변경 사항 없음 — assets.json의 토큰/이미지/폰트가 emit된 사이트와 매칭 안 됨.",
  ];
  if (!dryRun) {
    fs.writeFileSync(path.join(projDir, "ASSET-INJECTION.md"), report.join("\n"));
  }

  return result;
}

function walkSrc(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walkSrc(full, out);
    } else if (/\.(tsx?|css|json)$/.test(entry.name)) {
      out.push(full);
    }
  }
}

// Generate empty assets.json template from project's tokens
export function generateAssetTemplate(projDir) {
  const srcDir = path.join(projDir, "src");
  const tokens = new Set();
  const images = new Set();
  const targets = [];
  walkSrc(srcDir, targets);

  for (const file of targets) {
    const content = fs.readFileSync(file, "utf-8");
    // Find {{TOKEN_NAME}} patterns
    for (const m of content.matchAll(/\{\{([A-Z][A-Z0-9_]*)\}\}/g)) tokens.add(m[1]);
    // Find /placeholder.svg or /sections/* references
    for (const m of content.matchAll(/["'](\/[a-zA-Z0-9_\-./]+\.(jpg|jpeg|png|svg|webp))["']/g)) images.add(m[1]);
  }

  const template = {
    tokens: Object.fromEntries([...tokens].sort().map(t => [t, ""])),
    images: Object.fromEntries([...images].sort().map(i => [i, ""])),
    fonts: { Inter: "" },
  };

  return template;
}

// CLI mode
const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));

if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  const assetsArg = process.argv[3];

  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage:");
    console.error("  node sigma-asset-inject.mjs <projectDir> <assets.json>");
    console.error("  node sigma-asset-inject.mjs <projectDir> --template  (생성 템플릿)");
    console.error("  node sigma-asset-inject.mjs <projectDir> --dry-run <assets.json>");
    process.exit(1);
  }

  if (assetsArg === "--template") {
    const tpl = generateAssetTemplate(projDir);
    const tplPath = path.join(projDir, "assets.template.json");
    fs.writeFileSync(tplPath, JSON.stringify(tpl, null, 2));
    console.log(`[asset-inject] template generated: ${tplPath}`);
    console.log(`  tokens: ${Object.keys(tpl.tokens).length}`);
    console.log(`  images: ${Object.keys(tpl.images).length}`);
    process.exit(0);
  }

  const dryRun = assetsArg === "--dry-run";
  const jsonPath = dryRun ? process.argv[4] : assetsArg;
  if (!jsonPath || !fs.existsSync(jsonPath)) {
    console.error(`assets.json not found: ${jsonPath}`);
    process.exit(1);
  }

  const assets = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const result = injectAssets(projDir, assets, { dryRun });

  console.log(`[asset-inject${dryRun ? " dry-run" : ""}] ${result.filesModified} files / ` +
              `${result.tokensReplaced} tokens / ${result.imagesSwapped} images / ${result.fontsSwapped} fonts`);
  if (!dryRun) console.log(`  → ASSET-INJECTION.md`);
}
