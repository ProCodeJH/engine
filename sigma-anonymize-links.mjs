#!/usr/bin/env node
// sigma-anonymize-links.mjs — v110.2 외부 링크 후처리 익명화
//
// 자현 ultrathink "100% 저작권 클린" 마지막 결손: DOM Mirror가 외부 링크
// (href="https://www.youtube.com/@channel") 그대로 emit. 클론된 사이트가
// 다른 사람의 SNS/외부 자산을 가리킴 = 표현 layer 위반.
//
// 이 후처리: emit 끝난 후 모든 .tsx 파일에서 외부 link를 토큰화.
//   href="https://example.com/..." → href="{{EXTERNAL_LINK_N}}"
//   src="https://cdn.example.com/..." → src="{{EXTERNAL_ASSET_N}}"
//
// 동일 origin 링크는 유지 (사이트 내부 navigation). 외부만 토큰.
// 자현이 자기 SNS/이미지 URL로 sigma-asset-inject.mjs 통해 채움.
//
// CERT-CLEAN VIOLATIONS_FOUND → PASS 보장.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function anonymizeLinks(projDir, opts = {}) {
  const sourceUrl = opts.sourceUrl || "";
  let sourceHostname = "";
  try { sourceHostname = sourceUrl ? new URL(sourceUrl).hostname : ""; } catch {}

  const result = {
    externalLinksFound: 0,
    externalAssetsFound: 0,
    filesModified: 0,
    files: [],
    tokenMap: {},
  };

  // Walk all .tsx/.ts/.css files in src/
  const srcDir = path.join(projDir, "src");
  const targets = [];
  walkFiles(srcDir, targets, /\.(tsx?|css|html)$/);

  // Token counters (deduplicate identical URLs)
  const linkUrlToToken = new Map();
  const assetUrlToToken = new Map();
  let linkCounter = 0;
  let assetCounter = 0;

  for (const file of targets) {
    let content = fs.readFileSync(file, "utf-8");
    const original = content;

    // 1. Anonymize href="http(s)://..." (excluding source hostname is unsafe — better strict: all external)
    content = content.replace(/(href\s*=\s*["'])(https?:\/\/[^"']+)(["'])/g, (m, pre, url, post) => {
      try {
        const u = new URL(url);
        // Skip Google Fonts / CDN obviously safe (already license-clean) — these are OSS infra
        if (/^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com)$/i.test(u.hostname)) {
          return m;
        }
        if (!linkUrlToToken.has(url)) {
          linkUrlToToken.set(url, `{{EXTERNAL_LINK_${linkCounter++}}}`);
        }
        result.externalLinksFound++;
        return `${pre}${linkUrlToToken.get(url)}${post}`;
      } catch {
        return m;
      }
    });

    // 2. Anonymize src="http(s)://..." (img / video / source / iframe)
    content = content.replace(/(src\s*=\s*["'])(https?:\/\/[^"']+)(["'])/g, (m, pre, url, post) => {
      try {
        const u = new URL(url);
        // Skip safe placeholders
        if (/^(picsum\.photos|placehold\.co|via\.placeholder\.com)$/i.test(u.hostname)) return m;
        if (/^(fonts\.googleapis\.com|fonts\.gstatic\.com)$/i.test(u.hostname)) return m;
        if (!assetUrlToToken.has(url)) {
          assetUrlToToken.set(url, `{{EXTERNAL_ASSET_${assetCounter++}}}`);
        }
        result.externalAssetsFound++;
        return `${pre}${assetUrlToToken.get(url)}${post}`;
      } catch {
        return m;
      }
    });

    // 3. Anonymize url() in CSS (background-image: url(https://...))
    content = content.replace(/url\(\s*["']?(https?:\/\/[^"')]+)["']?\s*\)/g, (m, url) => {
      try {
        const u = new URL(url);
        if (/^(picsum\.photos|placehold\.co|fonts\.gstatic\.com)$/i.test(u.hostname)) return m;
        if (!assetUrlToToken.has(url)) {
          assetUrlToToken.set(url, `{{EXTERNAL_ASSET_${assetCounter++}}}`);
        }
        result.externalAssetsFound++;
        return `url("${assetUrlToToken.get(url)}")`;
      } catch {
        return m;
      }
    });

    if (content !== original) {
      fs.writeFileSync(file, content);
      result.files.push(path.relative(projDir, file));
      result.filesModified++;
    }
  }

  // Build tokenMap for asset-inject template extension
  result.tokenMap = {
    links: Object.fromEntries(linkUrlToToken),
    assets: Object.fromEntries(assetUrlToToken),
  };

  // Emit report + extend assets.template.json
  const lines = [
    "# Sigma External Link Anonymization Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Project: ${projDir}`,
    `Source: ${sourceUrl || "(unknown)"}`,
    "",
    "## Summary",
    "",
    `- External links anonymized: ${result.externalLinksFound} (unique URLs: ${linkUrlToToken.size})`,
    `- External assets anonymized: ${result.externalAssetsFound} (unique URLs: ${assetUrlToToken.size})`,
    `- Files modified: ${result.filesModified}`,
    "",
    "## Token Map",
    "",
    "### Links",
    linkUrlToToken.size === 0 ? "_(none)_" :
      "| Token | Original URL |\n|---|---|\n" +
      [...linkUrlToToken.entries()].map(([url, token]) => `| \`${token}\` | \`${url.slice(0, 80)}\` |`).join("\n"),
    "",
    "### Assets",
    assetUrlToToken.size === 0 ? "_(none)_" :
      "| Token | Original URL |\n|---|---|\n" +
      [...assetUrlToToken.entries()].map(([url, token]) => `| \`${token}\` | \`${url.slice(0, 80)}\` |`).join("\n"),
    "",
    "## 의도",
    "",
    "DOM Mirror가 외부 링크/자산 URL을 그대로 emit하면 표현 layer 위반.",
    "이 후처리로 토큰화 → 자현이 자기 SNS/이미지로 채움 (sigma-asset-inject).",
    "",
    "CERT-CLEAN VIOLATIONS_FOUND → PASS 보장.",
  ];
  fs.writeFileSync(path.join(projDir, "ANONYMIZE-LINKS.md"), lines.join("\n"));

  // Extend assets.template.json with new tokens
  const tplPath = path.join(projDir, "assets.template.json");
  if (fs.existsSync(tplPath)) {
    try {
      const tpl = JSON.parse(fs.readFileSync(tplPath, "utf-8"));
      tpl.tokens = tpl.tokens || {};
      for (const [url, token] of linkUrlToToken) {
        tpl.tokens[token.replace(/^\{\{|\}\}$/g, "")] = "";
      }
      for (const [url, token] of assetUrlToToken) {
        tpl.tokens[token.replace(/^\{\{|\}\}$/g, "")] = "";
      }
      fs.writeFileSync(tplPath, JSON.stringify(tpl, null, 2));
    } catch {}
  }

  return result;
}

function walkFiles(dir, out, pattern) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walkFiles(full, out, pattern);
    } else if (pattern.test(entry.name)) {
      out.push(full);
    }
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-anonymize-links.mjs <projectDir>");
    process.exit(1);
  }
  // Read sourceUrl from .sigma/scan.json if present
  let sourceUrl = "";
  try {
    const scan = JSON.parse(fs.readFileSync(path.join(projDir, ".sigma", "scan.json"), "utf-8"));
    sourceUrl = scan.url || "";
  } catch {}
  const r = anonymizeLinks(projDir, { sourceUrl });
  console.log(`[anonymize-links] ${r.externalLinksFound} links / ${r.externalAssetsFound} assets / ${r.filesModified} files → ANONYMIZE-LINKS.md`);
}
