#!/usr/bin/env node
// sigma-decouple.mjs — Framer/Webflow/Wix 식별자 제거 후처리
//
// 자현 비즈니스 ("복제화해서 편집해서 팔려고") 핵심: Omega 미러된 사이트
// F12 누르면 "framer", "data-wf-page", "wix-*" 같은 식별자 그대로 노출.
// 자현이 클라이언트에게 팔려면 이 흔적 0이어야 함.
//
// 자현 메모리 clone-framer-decouple.md + feedback-copyright.md 명세 따라:
//   - data-framer-* attribute 제거
//   - framer-* class names 익명화 (sigma-fr-{hash})
//   - framerusercontent.com CDN URL 자기 _fcdn/ 경로로 (이미 Omega 처리)
//   - Webflow data-wf-* / Wix wow-image / Squarespace [data-squarespace] 동일
//
// Omega 미러된 디렉토리에 적용 — public/index.html + public/_fcdn/*.js,*.css
//
// Usage:
//   node sigma-decouple.mjs <omegaProjectDir>

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

// 플랫폼별 decouple 룰
const PLATFORM_RULES = {
  framer: {
    name: "Framer",
    // data attributes 제거
    dataAttrs: [/\sdata-framer-[\w-]+(?:="[^"]*")?/g, /\sdata-framer-[\w-]+(?:='[^']*')?/g],
    // class name prefix 익명화
    classPrefixes: [/\bframer-[\w-]+/g, /\bfreamer-[\w-]+/g],
    // CDN hostname 추가 회피
    cdnHosts: ["framerusercontent.com", "framer.com", "framer.app"],
    // meta generator
    metaPatterns: [/<meta[^>]*name="generator"[^>]*content="[^"]*[Ff]ramer[^"]*"[^>]*>/g],
    // 명시 식별자 텍스트
    textIdentifiers: [/Made in Framer/gi, /Powered by Framer/gi],
  },
  webflow: {
    name: "Webflow",
    dataAttrs: [/\sdata-wf-[\w-]+(?:="[^"]*")?/g, /\sdata-wf-[\w-]+(?:='[^']*')?/g],
    classPrefixes: [/\bw-[\w-]+/g],
    cdnHosts: ["webflow.com", "website-files.com", "uploads-ssl.webflow.com"],
    metaPatterns: [/<meta[^>]*name="generator"[^>]*content="[^"]*[Ww]ebflow[^"]*"[^>]*>/g],
    textIdentifiers: [/Made in Webflow/gi, /Powered by Webflow/gi],
  },
  wix: {
    name: "Wix",
    dataAttrs: [/\sdata-wix-[\w-]+(?:="[^"]*")?/g, /\sdata-mesh-id(?:="[^"]*")?/g],
    classPrefixes: [/\bwix-[\w-]+/g, /\bwow-[\w-]+/g],
    customElements: [/<wow-image[^>]*>/g, /<wix-image[^>]*>/g, /<\/wow-image>/g, /<\/wix-image>/g],
    cdnHosts: ["wixstatic.com", "parastorage.com", "wix.com"],
    metaPatterns: [/<meta[^>]*name="generator"[^>]*content="[^"]*[Ww]ix[^"]*"[^>]*>/g],
    textIdentifiers: [/This site was created with Wix/gi, /Made on Wix/gi],
  },
  squarespace: {
    name: "Squarespace",
    dataAttrs: [/\sdata-squarespace[\w-]*(?:="[^"]*")?/g],
    classPrefixes: [/\bsqs-[\w-]+/g],
    cdnHosts: ["squarespace.com", "squarespace-cdn.com"],
    metaPatterns: [/<meta[^>]*name="generator"[^>]*content="[^"]*[Ss]quarespace[^"]*"[^>]*>/g],
    textIdentifiers: [],
  },
};

// 클래스 익명화 — 같은 원본 → 같은 anonymized name (consistency)
function classAnonymizer() {
  const map = new Map();
  return (origClass) => {
    if (!map.has(origClass)) {
      const hash = crypto.createHash("sha1").update(origClass).digest("hex").slice(0, 6);
      map.set(origClass, `s-${hash}`);
    }
    return map.get(origClass);
  };
}

export function decoupleProject(projDir, opts = {}) {
  const platforms = opts.platforms || Object.keys(PLATFORM_RULES);
  const targetExts = /\.(html?|css|js|mjs|tsx?)$/i;

  // Walk public/ + src/
  const targets = [];
  for (const sub of ["public", "src"]) {
    const subDir = path.join(projDir, sub);
    if (fs.existsSync(subDir)) walkFiles(subDir, targets, targetExts);
  }

  const result = {
    platforms,
    filesScanned: targets.length,
    filesModified: 0,
    dataAttrsRemoved: 0,
    classesAnonymized: 0,
    metaTagsRemoved: 0,
    customElementsRemoved: 0,
    identifiersRemoved: 0,
    detectedPlatforms: [],
    files: [],
  };

  const anonymize = classAnonymizer();

  for (const file of targets) {
    let content = fs.readFileSync(file, "utf-8");
    const original = content;

    for (const platform of platforms) {
      const rule = PLATFORM_RULES[platform];
      if (!rule) continue;

      // 1. Remove data attributes
      for (const re of rule.dataAttrs || []) {
        const matches = (content.match(re) || []).length;
        if (matches > 0) {
          content = content.replace(re, "");
          result.dataAttrsRemoved += matches;
          if (!result.detectedPlatforms.includes(platform)) result.detectedPlatforms.push(platform);
        }
      }

      // 2. Anonymize class prefixes
      for (const re of rule.classPrefixes || []) {
        const matches = [...content.matchAll(re)];
        for (const m of matches) {
          const orig = m[0];
          const anon = anonymize(orig);
          content = content.split(orig).join(anon);
          result.classesAnonymized++;
        }
      }

      // 3. Remove meta generator
      for (const re of rule.metaPatterns || []) {
        const matches = (content.match(re) || []).length;
        if (matches > 0) {
          content = content.replace(re, "");
          result.metaTagsRemoved += matches;
        }
      }

      // 4. Remove custom elements (Wix wow-image etc) — replace tag with div
      for (const re of rule.customElements || []) {
        const matches = (content.match(re) || []).length;
        if (matches > 0) {
          content = content.replace(re, (m) => {
            // Replace <wow-image foo="bar"> with <div foo="bar">
            // Replace </wow-image> with </div>
            if (m.startsWith("</")) return "</div>";
            return m.replace(/<\w[\w-]*/, "<div");
          });
          result.customElementsRemoved += matches;
        }
      }

      // 5. Remove text identifiers
      for (const re of rule.textIdentifiers || []) {
        const matches = (content.match(re) || []).length;
        if (matches > 0) {
          content = content.replace(re, "");
          result.identifiersRemoved += matches;
        }
      }
    }

    if (content !== original) {
      fs.writeFileSync(file, content);
      result.filesModified++;
      result.files.push(path.relative(projDir, file));
    }
  }

  // Emit report
  const lines = [
    "# Sigma Decouple Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Project: ${projDir}`,
    `Platforms targeted: ${platforms.join(", ")}`,
    "",
    "## Detection",
    "",
    result.detectedPlatforms.length === 0 ? "- (no platform fingerprints detected)" :
      result.detectedPlatforms.map(p => `- **${PLATFORM_RULES[p].name}** (${p})`).join("\n"),
    "",
    "## Stats",
    "",
    `- Files scanned: ${result.filesScanned}`,
    `- Files modified: ${result.filesModified}`,
    `- Data attrs removed: ${result.dataAttrsRemoved}`,
    `- Classes anonymized: ${result.classesAnonymized}`,
    `- Meta tags removed: ${result.metaTagsRemoved}`,
    `- Custom elements replaced: ${result.customElementsRemoved}`,
    `- Identifier text removed: ${result.identifiersRemoved}`,
    "",
    "## 의도",
    "",
    "Omega 미러된 사이트는 원본 그대로 → F12 열면 \"framer\", \"data-wf-*\",",
    "\"wow-image\" 같은 platform 식별자 노출. 자현 비즈니스 \"복제→편집→판매\"",
    "위해 식별자 0이어야 함. 이 도구가 자동 제거.",
    "",
    "Decouple 후 framer-motion 런타임은 그대로 작동 (식별자만 제거).",
    "스크롤 애니메이션은 별도 영역 — clone-engine-v21-findings 메모리 참조.",
  ];
  fs.writeFileSync(path.join(projDir, "DECOUPLE-REPORT.md"), lines.join("\n"));

  return result;
}

function walkFiles(dir, out, pattern) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
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
    console.error("usage: node sigma-decouple.mjs <projectDir>");
    process.exit(1);
  }
  const r = decoupleProject(projDir);
  console.log(`[decouple] ${r.detectedPlatforms.join("+") || "(none)"} — ${r.filesModified} files / ${r.dataAttrsRemoved} attrs / ${r.classesAnonymized} classes / ${r.metaTagsRemoved} meta`);
  console.log(`  → DECOUPLE-REPORT.md`);
}
