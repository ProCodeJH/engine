#!/usr/bin/env node
// sigma-layout-lock.mjs — Paradigm 140 — Capture Stack Symmetry
//
// 자현 ultrathink 진단: visual 81.78% ceiling root cause = source/clone에
// inject되는 deterministic stack이 비대칭.
//
// 비대칭 증거:
//   - Clone HTML: <style id="__sigma_reveal__">[data-aos]{opacity:1!important}</style>
//                 + <script id="__sigma_reveal__">REVEAL_JS</script>
//     → CSS rules + JS DOM 조작 둘 다 적용
//   - Source page: page.evaluate(REVEAL_JS) 만 실행
//     → JS DOM 조작만, CSS rules 적용 안 됨
//
// 결과: clone에선 [data-aos] 요소 모두 opacity:1, source에선 일부 여전히 fade-in.
// → diff PNG에 hero 텍스트 vertical offset.
//
// P140 Solution: applyDeterministicStack(page) — 양쪽에 CSS+JS 동일 inject.
//   1. addStyleTag으로 REVEAL_CSS inject
//   2. evaluate으로 모든 LOCK JS 실행
//   3. requestAnimationFrame x2 wait — 모든 reflow 끝낸 후 capture
//   4. 결과: source/clone 동일 deterministic state → fair pixel comparison

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── Apply full deterministic stack to a puppeteer Page ─────────
export async function applyDeterministicStack(page, opts = {}) {
  const stack = { css: false, carousel: false, reveal: false, media: false, raf: false };

  try {
    // 1. CSS first (cascade order matters — REVEAL CSS overrides scroll-fade hidden states)
    const { REVEAL_CSS } = await import("./sigma-reveal-animations.mjs");
    await page.addStyleTag({ content: REVEAL_CSS });
    stack.css = true;
  } catch (e) { stack.cssError = String(e.message).slice(0, 60); }

  try {
    const { CAROUSEL_LOCK_JS } = await import("./sigma-carousel-lock.mjs");
    await page.evaluate(CAROUSEL_LOCK_JS);
    stack.carousel = true;
  } catch (e) { stack.carouselError = String(e.message).slice(0, 60); }

  try {
    const { REVEAL_JS } = await import("./sigma-reveal-animations.mjs");
    await page.evaluate(REVEAL_JS);
    stack.reveal = true;
  } catch (e) { stack.revealError = String(e.message).slice(0, 60); }

  try {
    const { MEDIA_DETERMINISM_JS } = await import("./sigma-media-determinism.mjs");
    await page.evaluate(MEDIA_DETERMINISM_JS);
    stack.media = true;
  } catch (e) { stack.mediaError = String(e.message).slice(0, 60); }

  // Wait for 2 paint frames — guarantees all reflow + repaint settled
  try {
    await page.evaluate(() => new Promise(r => {
      requestAnimationFrame(() => requestAnimationFrame(r));
    }));
    stack.raf = true;
  } catch (e) { stack.rafError = String(e.message).slice(0, 60); }

  // Optional: extra settle time for slow pages (JS-heavy SPA)
  if (opts.settleMs) {
    await new Promise(r => setTimeout(r, opts.settleMs));
  }

  return stack;
}

// ─── Diagnostic: log which layers applied ───────────────────────
export function summarizeStack(stack) {
  const applied = Object.entries(stack).filter(([k, v]) => v === true).map(([k]) => k);
  const failed = Object.entries(stack).filter(([k, v]) => k.endsWith("Error")).map(([k, v]) => `${k.replace("Error", "")}:${v}`);
  return { applied, failed };
}

// ─── For testing: standalone runner ─────────────────────────────
const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const url = process.argv[2];
  if (!url) {
    console.error("usage: node sigma-layout-lock.mjs <url>");
    process.exit(1);
  }
  (async () => {
    const puppeteer = (await import("puppeteer")).default;
    const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    const stack = await applyDeterministicStack(page, { settleMs: 500 });
    const summary = summarizeStack(stack);
    console.log(`[layout-lock] applied: ${summary.applied.join(", ")}`);
    if (summary.failed.length) console.log(`  failed: ${summary.failed.join(" | ")}`);
    await browser.close();
  })();
}
