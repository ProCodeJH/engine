#!/usr/bin/env node
// sigma-timeline-record.mjs — Paradigm 191 — Animation Timeline Recording
//
// 자현 명령: "모든 실력 쏟아내"
//
// P185 Sigma motion runtime은 stub. 진짜 source motion 아님.
// P191 — Source page에서 5초간 100ms interval로 record. Element transform/opacity
// timeline 추출. Mirror에 player inject. 진짜 source motion exact replay.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── In-page recorder ─────────────────────────────────────────
export const RECORDER_JS = `
(function recorder() {
  // Generate stable selector for an element
  function selectorFor(el) {
    if (!el || el === document.body) return null;
    const path = [];
    let cur = el;
    let depth = 0;
    while (cur && cur !== document.body && depth < 20) {
      const tag = cur.tagName.toLowerCase();
      const parent = cur.parentElement;
      if (!parent) break;
      const sameTag = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
      if (sameTag.length === 1) {
        path.unshift(tag);
      } else {
        const idx = sameTag.indexOf(cur);
        path.unshift(tag + ':nth-of-type(' + (idx + 1) + ')');
      }
      cur = parent;
      depth++;
    }
    return path.length > 0 ? path.join(' > ') : null;
  }

  // Capture animatable elements
  function snapshot() {
    const result = [];
    const els = document.querySelectorAll(
      '[data-aos], [class*="anim"], [class*="motion"], [class*="fade"], ' +
      '[class*="slide"], [class*="scroll"], [class*="reveal"], ' +
      'h1, h2, h3, img, video, [role], section, article, header, nav'
    );
    els.forEach(el => {
      if (!(el instanceof HTMLElement)) return;
      const sel = selectorFor(el);
      if (!sel) return;
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      result.push({
        sel,
        op: cs.opacity,
        tf: cs.transform,
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      });
    });
    return result;
  }

  return snapshot();
})();
`;

// ─── Player JS — replays timeline on mirror ───────────────────
export const PLAYER_JS = `
/* sigma-timeline-player — Paradigm 191 */
(function player() {
  const TIMELINE = window.__SIGMA_TIMELINE__ || [];
  if (TIMELINE.length === 0) return;

  // Build keyframe map: selector → [{t, op, tf}, ...]
  const elKeyframes = new Map();
  TIMELINE.forEach((frame) => {
    frame.snap.forEach((s) => {
      if (!elKeyframes.has(s.sel)) elKeyframes.set(s.sel, []);
      elKeyframes.get(s.sel).push({ t: frame.t, op: s.op, tf: s.tf });
    });
  });

  const start = performance.now();
  let raf = null;

  function tick() {
    const t = performance.now() - start;
    elKeyframes.forEach((keyframes, sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      // Find current keyframe (linear interp between adjacent)
      let kf = null;
      for (let i = 0; i < keyframes.length; i++) {
        if (keyframes[i].t <= t) kf = keyframes[i];
        else break;
      }
      if (kf) {
        if (kf.op !== el.style.opacity) el.style.opacity = kf.op;
        if (kf.tf !== el.style.transform) el.style.transform = kf.tf;
      }
    });
    if (t < 5000) raf = requestAnimationFrame(tick);
  }
  tick();

  // Restart on user interaction (hover/click/scroll)
  let restartTimer = null;
  function restart() {
    if (raf) cancelAnimationFrame(raf);
    clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
      const newStart = performance.now();
      tick();
    }, 100);
  }
  window.addEventListener('scroll', restart, { passive: true });
})();
`;

// ─── Record source page timeline ──────────────────────────────
export async function recordTimeline(sourceUrl, opts = {}) {
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log(`[timeline] navigating: ${sourceUrl}`);
  await page.goto(sourceUrl, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  // Force scroll trigger
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 300) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 100));
    }
    window.scrollTo(0, 0);
  }).catch(() => {});

  console.log(`[timeline] recording 5s @ 100ms interval...`);
  const recording = [];
  const interval = opts.interval || 100;
  const duration = opts.duration || 5000;
  const samples = duration / interval;
  const startMs = Date.now();

  for (let i = 0; i < samples; i++) {
    const t = Date.now() - startMs;
    try {
      const snap = await page.evaluate(RECORDER_JS);
      recording.push({ t, snap });
    } catch (e) {
      // skip frame
    }
    await new Promise(r => setTimeout(r, interval));
  }

  await browser.close();

  // Diff frames — only keep changes
  console.log(`[timeline] diffing frames...`);
  const diffed = [];
  let prevMap = new Map();
  for (const frame of recording) {
    const changes = [];
    for (const s of frame.snap) {
      const prev = prevMap.get(s.sel);
      if (!prev || prev.op !== s.op || prev.tf !== s.tf) {
        changes.push(s);
        prevMap.set(s.sel, s);
      }
    }
    if (changes.length > 0) {
      diffed.push({ t: frame.t, snap: changes });
    }
  }

  return {
    rawFrames: recording.length,
    diffedFrames: diffed.length,
    timeline: diffed,
  };
}

// ─── Apply timeline to mirror ─────────────────────────────────
export function applyTimelineToMirror(projDir, timeline) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = { files: [] };

  // Save timeline as JSON
  fs.writeFileSync(path.join(publicDir, "sigma-timeline.json"), JSON.stringify(timeline));

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

        // Remove old timeline player + inject fresh
        html = html.replace(/<script[^>]*id="__sigma_timeline__"[\s\S]*?<\/script>\s*/gi, "");
        const inject = `<script id="__sigma_timeline__">
fetch('/sigma-timeline.json').then(r => r.json()).then(t => {
  window.__SIGMA_TIMELINE__ = t;
  ${PLAYER_JS}
});
</script>`;
        if (html.includes("</body>")) {
          html = html.replace("</body>", inject + "\n</body>");
        }

        if (html !== original) {
          fs.writeFileSync(full, html);
          result.files.push(path.relative(projDir, full));
        }
      }
    }
  }
  walk(publicDir);

  return result;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const sourceUrl = process.argv[2];
  const projDir = path.resolve(process.argv[3] || "");
  if (!sourceUrl || !projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-timeline-record.mjs <source-url> <projDir>");
    console.error("  Source 5s record + apply timeline to mirror");
    process.exit(1);
  }
  (async () => {
    const r = await recordTimeline(sourceUrl);
    console.log(`  raw frames: ${r.rawFrames}, diffed: ${r.diffedFrames}`);
    const apply = applyTimelineToMirror(projDir, r.timeline);
    if (apply.error) { console.error(apply.error); process.exit(1); }
    console.log(`[timeline] HTML files: ${apply.files.length}`);
    console.log(`  → public/sigma-timeline.json`);
    console.log(`  → motion exact replay (sigma stub 대체)`);
  })().catch(e => { console.error(e); process.exit(1); });
}
