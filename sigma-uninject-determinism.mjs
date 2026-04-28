#!/usr/bin/env node
// sigma-uninject-determinism.mjs — Paradigm 181 — Measurement vs Runtime 구분
//
// 자현 진짜 통찰: "분명 애니메이션이나 모션이 있을텐데 왜 다 죽어있어 마치"
//
// Root cause: P135/P136/P137이 mirror에 inject돼서 영원히 lock.
//   - <style id="__sigma_freeze_style__">: animation-play-state:paused !important
//   - <style id="__sigma_reveal_css__">: transition-duration:0s !important
//   - Carousel: 슬라이드 0 영원 고정
//   - Video: autoplay 영원 strip
//
// 측정 시 deterministic 필요 → page.evaluate 시점만 적용 (verify-cascade)
// Mirror runtime은 살아있어야 → inject 제거
//
// P181: Mirror에서 모든 deterministic inject 제거. Motion library는 그대로 (real GSAP/Lenis).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_IDS = [
  "__sigma_carousel_lock__",
  "__sigma_reveal_js__",
  "__sigma_media_determinism__",
  "__sigma_animation_runtime__",
];

const STYLE_IDS = [
  "__sigma_freeze_style__",
  "__sigma_reveal_css__",
  "__sigma_keyframes__",
];

export function uninjectMirror(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = { files: [], scriptsRemoved: 0, stylesRemoved: 0, skipLinkRemoved: 0, sigmaRuntimeFile: false };

  function walk(dir, depth = 0) {
    if (depth > 5) return;
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name === "index.html") {
        let html = fs.readFileSync(full, "utf-8");
        const original = html;

        // Remove sigma scripts/styles
        for (const id of SCRIPT_IDS) {
          const re = new RegExp(`<script[^>]*id="${id}"[\\s\\S]*?<\\/script>\\s*`, "gi");
          const matches = html.match(re);
          if (matches) {
            html = html.replace(re, "");
            result.scriptsRemoved += matches.length;
          }
        }
        for (const id of STYLE_IDS) {
          const re = new RegExp(`<style[^>]*id="${id}"[\\s\\S]*?<\\/style>\\s*`, "gi");
          const matches = html.match(re);
          if (matches) {
            html = html.replace(re, "");
            result.stylesRemoved += matches.length;
          }
        }

        if (html !== original) {
          fs.writeFileSync(full, html);
          result.files.push(path.relative(projDir, full));
        }
      }
    }
  }
  walk(publicDir);

  // Remove sigma-runtime.js + sigma-motion.css standalone files
  const runtimeFile = path.join(publicDir, "sigma-runtime.js");
  if (fs.existsSync(runtimeFile)) { fs.unlinkSync(runtimeFile); result.sigmaRuntimeFile = true; }
  const motionFile = path.join(publicDir, "sigma-motion.css");
  if (fs.existsSync(motionFile)) fs.unlinkSync(motionFile);

  return result;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-uninject-determinism.mjs <projDir>");
    console.error("  Mirror에서 P135/P136/P137 inject 제거 (살아있는 mirror)");
    process.exit(1);
  }
  const r = uninjectMirror(projDir);
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[uninject] HTML files: ${r.files.length}`);
  console.log(`  scripts removed: ${r.scriptsRemoved}`);
  console.log(`  styles removed:  ${r.stylesRemoved}`);
  console.log(`  sigma-runtime.js: ${r.sigmaRuntimeFile ? "removed" : "(not found)"}`);
  console.log(`\n  ✅ Mirror 살아있게 복원. 진짜 motion library 그대로 작동.`);
}
