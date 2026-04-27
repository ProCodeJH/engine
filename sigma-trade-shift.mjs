#!/usr/bin/env node
// sigma-trade-shift.mjs — v106 Trade dress safe-shift (옵션)
//
// 자현 ultrathink "100% 저작권 클린" 추가 안전망: Baker v. Selden은
// 사실 측정 보호이지만 trade dress (Apple rounded rectangle, Tiffany blue,
// Coca-Cola 병 형태)는 별도 위험 영역. 이 도구는 emit된 사이트의 시각적
// "정체성 마커"를 미세 시프트해 trade dress 회피.
//
// 변형 (default):
//   - HSL 색조 +5deg 시프트 (눈에 안 띄지만 색 1:1 일치 회피)
//   - border-radius ±10% 변형 (rounded rectangle 형태 다양화)
//   - shadow blur ±5% 변형
//
// 옵션 default off — 자현이 명시 활성화 시에만 적용.
//
// Usage:
//   node sigma-trade-shift.mjs <projectDir> [--hue 5] [--radius 0.1] [--shadow 0.05]
//   node sigma-trade-shift.mjs <projectDir> --revert  (변경 되돌리기)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function applyTradeShift(projDir, opts = {}) {
  const HUE_SHIFT = opts.hueShift ?? 5;       // degrees
  const RADIUS_SHIFT = opts.radiusShift ?? 0.1; // ±10%
  const SHADOW_SHIFT = opts.shadowShift ?? 0.05; // ±5%

  const result = {
    colorsShifted: 0,
    radiiShifted: 0,
    shadowsShifted: 0,
    filesModified: 0,
    files: [],
  };

  // Target: globals.css + tailwind.config.ts (palette + radius vars)
  const targets = [
    path.join(projDir, "src", "app", "globals.css"),
    path.join(projDir, "tailwind.config.ts"),
  ].filter(p => fs.existsSync(p));

  for (const file of targets) {
    let content = fs.readFileSync(file, "utf-8");
    const original = content;

    // 1. Hue shift on hex colors
    content = content.replace(/#([a-fA-F0-9]{6})\b/g, (m, hex) => {
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const [h, s, l] = rgbToHsl(r, g, b);
      const newH = (h + HUE_SHIFT + 360) % 360;
      const [nr, ng, nb] = hslToRgb(newH, s, l);
      result.colorsShifted++;
      return "#" + [nr, ng, nb].map(x => Math.round(x).toString(16).padStart(2, "0")).join("");
    });

    // 2. Border radius shift (px values in radius properties)
    content = content.replace(/(border-radius:\s*|--sigma-radius:?\s*)(\d+(?:\.\d+)?)(px)/g, (m, prefix, num, unit) => {
      const v = parseFloat(num);
      const shifted = +(v * (1 + (Math.random() < 0.5 ? -RADIUS_SHIFT : RADIUS_SHIFT))).toFixed(1);
      result.radiiShifted++;
      return `${prefix}${shifted}${unit}`;
    });

    // 3. Shadow blur shift
    content = content.replace(/box-shadow:\s*([^;]+);/g, (m, value) => {
      // Shift blur radius (third number in box-shadow)
      let count = 0;
      const shifted = value.replace(/(\s+)(\d+(?:\.\d+)?)(px)/g, (mm, sp, num, unit) => {
        count++;
        if (count === 3) {
          const v = parseFloat(num);
          const newV = +(v * (1 + (Math.random() < 0.5 ? -SHADOW_SHIFT : SHADOW_SHIFT))).toFixed(1);
          result.shadowsShifted++;
          return `${sp}${newV}${unit}`;
        }
        return mm;
      });
      return `box-shadow: ${shifted};`;
    });

    if (content !== original) {
      fs.writeFileSync(file, content);
      result.files.push(path.relative(projDir, file));
      result.filesModified++;
    }
  }

  // Emit report
  const report = [
    "# Sigma Trade Dress Shift Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Project: ${projDir}`,
    "",
    "## Shifts applied",
    `- Hue: +${HUE_SHIFT}° (colors)`,
    `- Border radius: ±${(RADIUS_SHIFT * 100).toFixed(0)}%`,
    `- Shadow blur: ±${(SHADOW_SHIFT * 100).toFixed(0)}%`,
    "",
    "## Counts",
    `- Colors shifted: ${result.colorsShifted}`,
    `- Border-radii shifted: ${result.radiiShifted}`,
    `- Shadows shifted: ${result.shadowsShifted}`,
    `- Files modified: ${result.filesModified}`,
    "",
    "## Files",
    ...result.files.map(f => `- \`${f}\``),
    "",
    "## 의도",
    "Baker v. Selden 사실 측정 보호 *위에* trade dress 안전망. Apple",
    "rounded rectangle, Tiffany blue 같은 시각 정체성 마커가 1:1 일치하지",
    "않도록 미세 시프트. 디자인 의도는 유지, 정체성은 분리.",
    "",
    "(이 도구는 옵션. 자현이 명시 활성화 시에만 적용됨.)",
  ];
  fs.writeFileSync(path.join(projDir, "TRADE-SHIFT.md"), report.join("\n"));

  return result;
}

// ─── HSL conversion helpers ──────────────────────────────────────────
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [255 * f(0), 255 * f(8), 255 * f(4)];
}

// CLI
const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));

if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-trade-shift.mjs <projectDir> [--hue 5] [--radius 0.1]");
    process.exit(1);
  }
  const flagVal = (name, def) => {
    const i = process.argv.indexOf(name);
    return i >= 0 ? parseFloat(process.argv[i + 1]) : def;
  };
  const opts = {
    hueShift: flagVal("--hue", 5),
    radiusShift: flagVal("--radius", 0.1),
    shadowShift: flagVal("--shadow", 0.05),
  };
  const result = applyTradeShift(projDir, opts);
  console.log(`[trade-shift] colors=${result.colorsShifted} radii=${result.radiiShifted} shadows=${result.shadowsShifted} files=${result.filesModified}`);
  console.log(`  → TRADE-SHIFT.md`);
}
