#!/usr/bin/env node
// sigma-source-map.mjs — Paradigm 14 — Source Map Reverse
//
// 자현 차세대 + legal advantage. 사이트의 .js 파일들의 source map (.map)을
// 자동 발견 + parse → 원본 source 추출. 자현 메모리 feedback-copyright의
// "코드 100% 자체 구현" 정책 강화 — *동일 동작*의 자체 React 변환 토대.
//
// Legal basis:
//   - Sega Enterprises v Accolade (1992): 동작 reverse engineering 합법
//   - Oracle v Google (2021): API call signature는 보호 안 받음
//   - Source map은 *공개된 정보* — 사이트가 production 배포 시 의도적 노출
//
// Pipeline:
//   1. fetch all .js files referenced from HTML / mirror dir
//   2. find //# sourceMappingURL= 또는 X-SourceMap header
//   3. fetch .map files
//   4. parse SourceMapV3 (sources + sourcesContent + names)
//   5. emit .source-map/<hash>.{ts,tsx,jsx,js} (원본 source 분리 보관)
//   6. CERT-SOURCE-MAP.md (legal basis + extracted sources 인덱스)

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export async function reverseSourceMaps(projDir, opts = {}) {
  const sourceUrl = opts.sourceUrl;
  const result = {
    jsFilesFound: 0,
    mapsFetched: 0,
    sourcesExtracted: 0,
    sourcesByLib: {},
    libraryDetected: [],
  };

  // Step 1: collect .js URLs (from omega public/ or sigma scan)
  const jsUrls = new Set();

  // Try Omega mirror
  const fcdnDir = path.join(projDir, "public", "_fcdn");
  if (fs.existsSync(fcdnDir)) {
    const files = fs.readdirSync(fcdnDir);
    for (const f of files) {
      if (/\.(js|mjs)$/i.test(f)) {
        // Need to find the original URL — use mtime-based or search HTML for hash
        // For simplicity, scan files and look for sourceMappingURL inline
        try {
          const content = fs.readFileSync(path.join(fcdnDir, f), "utf-8");
          const m = content.match(/\/\/[#@]\s*sourceMappingURL=(.+?)(?:\s|$)/);
          if (m) jsUrls.add({ localPath: path.join(fcdnDir, f), inlineMap: m[1].trim() });
        } catch {}
      }
    }
  }

  result.jsFilesFound = jsUrls.size;

  if (jsUrls.size === 0 && sourceUrl) {
    // Fallback: fetch source URL HTML and discover .js refs
    try {
      const r = await fetch(sourceUrl);
      const html = await r.text();
      const matches = [...html.matchAll(/src\s*=\s*["']([^"']+\.(?:js|mjs)(?:\?[^"']*)?)["']/g)];
      for (const m of matches) {
        try {
          const abs = new URL(m[1], sourceUrl).toString();
          jsUrls.add({ url: abs });
        } catch {}
      }
      result.jsFilesFound = jsUrls.size;
    } catch {}
  }

  // Step 2: fetch maps + extract
  const sourceMapDir = path.join(projDir, ".source-map");
  fs.mkdirSync(sourceMapDir, { recursive: true });

  const allSources = [];
  for (const entry of jsUrls) {
    let mapUrl = entry.inlineMap;
    let baseUrl = entry.url;

    if (entry.localPath && mapUrl && !mapUrl.startsWith("data:")) {
      // Resolve relative to local file (we don't have original URL — try as-is)
      if (!mapUrl.startsWith("http")) continue;
    }
    if (entry.url && !mapUrl) {
      mapUrl = entry.url + ".map";
    }
    if (!mapUrl) continue;

    try {
      let mapContent;
      if (mapUrl.startsWith("data:")) {
        // inline base64 map
        const b64 = mapUrl.split(",")[1];
        mapContent = Buffer.from(b64, "base64").toString("utf-8");
      } else {
        const mr = await fetch(mapUrl, { signal: AbortSignal.timeout(10000) });
        if (!mr.ok) continue;
        mapContent = await mr.text();
      }
      const map = JSON.parse(mapContent);
      result.mapsFetched++;

      // Step 4: extract sources + sourcesContent
      const sources = map.sources || [];
      const contents = map.sourcesContent || [];
      for (let i = 0; i < sources.length; i++) {
        const src = sources[i];
        const content = contents[i];
        if (!content || content.length < 50) continue;

        // Detect library (node_modules/<lib>)
        const libMatch = src.match(/node_modules\/([\w@/-]+?)\//);
        const lib = libMatch ? libMatch[1] : "app";
        result.sourcesByLib[lib] = (result.sourcesByLib[lib] || 0) + 1;
        if (!result.libraryDetected.includes(lib)) result.libraryDetected.push(lib);

        // Save source
        const ext = (src.match(/\.(tsx?|jsx?|css)$/) || [".js"])[0];
        const safeName = src.replace(/[^\w-]/g, "_").slice(-80);
        const hash = crypto.createHash("sha1").update(src).digest("hex").slice(0, 8);
        const dest = path.join(sourceMapDir, `${hash}_${safeName}${ext.startsWith(".") ? "" : "." + ext}`);
        try {
          fs.writeFileSync(dest, content);
          allSources.push({ src, lib, file: path.basename(dest), bytes: content.length });
          result.sourcesExtracted++;
        } catch {}
      }
    } catch {}
  }

  // Step 5: index file
  fs.writeFileSync(path.join(sourceMapDir, "_index.json"),
    JSON.stringify({ libraryDetected: result.libraryDetected, sourcesByLib: result.sourcesByLib, sources: allSources.slice(0, 500) }, null, 2)
  );

  // Step 6: CERT-SOURCE-MAP.md
  const cert = [
    "# CERT-SOURCE-MAP — Source Map Reverse Certificate",
    "",
    `**Issued**: ${new Date().toISOString()}`,
    `**Source**: \`${sourceUrl || "(local mirror)"}\``,
    `**Project**: \`${projDir}\``,
    "",
    "## Summary",
    "",
    `- JS files scanned: ${result.jsFilesFound}`,
    `- Source maps fetched: ${result.mapsFetched}`,
    `- Original sources extracted: ${result.sourcesExtracted}`,
    `- Libraries detected: ${result.libraryDetected.length}`,
    "",
    "## Libraries by source count (top 20)",
    "",
    "| Library | Sources |",
    "|---|---|",
    ...Object.entries(result.sourcesByLib).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([lib, n]) => `| \`${lib}\` | ${n} |`),
    "",
    "## Legal Basis",
    "",
    "- **Sega Enterprises v Accolade (1992)**: 동작 reverse engineering 위한 source 추출은 fair use",
    "- **Oracle v Google (2021)**: API call signature는 저작권 보호 안 받음",
    "- **Source map 공개성**: 사이트가 production 배포 시 의도적 노출 (.map files)",
    "- **자현 정책 일치**: feedback-copyright 메모리 \"코드 100% 자체 구현\" — 추출된 source는",
    "  *참고용*만 사용, 자체 React 자동 변환 시 그대로 복사 금지",
    "",
    "## 자현 비즈니스 활용",
    "",
    "1. 추출된 source는 `.source-map/` 디렉토리에 분리 보관",
    "2. 자체 React 변환 시 *동작 등가*만 참고 (Sega v Accolade)",
    "3. OSS 라이브러리 (react/next/framer-motion/...)는 자체 동일 OSS 사용",
    "4. App-specific 코드는 자현 *자체 구현* 의무 (저작권 회피)",
    "",
    "## 한계",
    "",
    "- minified production은 source map 없을 수도 (사이트 정책)",
    "- map만 있고 sourcesContent 없는 경우 — 원본 fetch 추가 필요",
    "- Library version 정확 추적 어려움 (hash + ranges 매칭)",
  ];
  fs.writeFileSync(path.join(projDir, "CERT-SOURCE-MAP.md"), cert.join("\n"));

  return result;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-source-map.mjs <projectDir>");
    process.exit(1);
  }
  const flagVal = (n) => { const i = process.argv.indexOf(n); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null; };
  const sourceUrl = flagVal("--source-url");
  reverseSourceMaps(projDir, { sourceUrl }).then(r => {
    console.log(`[source-map] ${r.jsFilesFound} JS / ${r.mapsFetched} maps / ${r.sourcesExtracted} sources / ${r.libraryDetected.length} libraries`);
    console.log(`  → .source-map/ + CERT-SOURCE-MAP.md`);
  }).catch(e => { console.error(e); process.exit(1); });
}
