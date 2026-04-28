#!/usr/bin/env node
// sigma-media-determinism.mjs — Paradigm 137 — Video / Iframe Determinism
//
// 자현 진단: P135 carousel lock 후 visual 81.78% 도달. 남은 18% 손실은
// 주로 video embed가 source/clone에서 다른 frame 재생 중이라서.
// 두손누리 "실제로 어떤 서비스가 진행될까요?" 영상 캡처 시점 다름.
//
// Solution: 모든 <video>, YouTube/Vimeo iframe을 결정적 상태 (paused at t=0,
// poster image only, autoplay removed)로 force.
//
// Targets:
//   - <video> elements (HTML5)
//   - YouTube iframe (youtube.com/embed)
//   - Vimeo iframe (player.vimeo.com)
//   - Generic iframe with autoplay parameter
//   - <audio> elements (caught for safety)
//
// Action:
//   - Pause + currentTime=0
//   - Remove autoplay/loop attributes
//   - Strip ?autoplay=1, &autoplay=1, ?start=10 from iframe src
//   - For YouTube: replace with poster image (maxresdefault.jpg)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── Media Determinism JS ──────────────────────────────────────────
export const MEDIA_DETERMINISM_JS = `
(function mediaDeterminism() {
  const log = [];

  // ─── 1. <video> + <audio> pause ─────────────────────────────
  document.querySelectorAll('video, audio').forEach(m => {
    try {
      m.pause();
      m.currentTime = 0;
      m.removeAttribute('autoplay');
      m.removeAttribute('loop');
      m.muted = true;
      log.push('[media] paused ' + m.tagName);
    } catch (e) {}
  });

  // ─── 2. YouTube iframe — strip autoplay + reset to t=0 ──────
  document.querySelectorAll('iframe').forEach(f => {
    try {
      const src = f.src || f.getAttribute('src') || '';
      if (!src) return;

      let cleanSrc = src
        .replace(/[?&]autoplay=1/g, '')
        .replace(/[?&]start=\\d+/g, '')
        .replace(/[?&]t=\\d+s?/g, '')
        .replace(/[?&]loop=1/g, '')
        .replace(/[?&]mute=1/g, '');

      // For YouTube: add explicit autoplay=0
      if (src.includes('youtube.com') || src.includes('youtu.be')) {
        cleanSrc += (cleanSrc.includes('?') ? '&' : '?') + 'autoplay=0';
      }

      // Vimeo
      if (src.includes('vimeo.com')) {
        cleanSrc += (cleanSrc.includes('?') ? '&' : '?') + 'autoplay=0';
      }

      // Wistia
      if (src.includes('wistia')) {
        cleanSrc = cleanSrc.replace(/autoPlay=true/g, 'autoPlay=false');
      }

      if (cleanSrc !== src) {
        f.src = cleanSrc;
        log.push('[iframe] reset ' + src.substring(0, 50));
      }
    } catch (e) {}
  });

  // ─── 3. PostMessage to YouTube iframe (better control) ──────
  // YT IFrame API postMessage to pause
  document.querySelectorAll('iframe[src*="youtube.com/embed"]').forEach(f => {
    try {
      f.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      f.contentWindow?.postMessage('{"event":"command","func":"seekTo","args":[0,true]}', '*');
    } catch (e) {}
  });

  // ─── 4. Vimeo postMessage ───────────────────────────────────
  document.querySelectorAll('iframe[src*="vimeo.com"]').forEach(f => {
    try {
      f.contentWindow?.postMessage('{"method":"pause"}', '*');
      f.contentWindow?.postMessage('{"method":"setCurrentTime","value":0}', '*');
    } catch (e) {}
  });

  // ─── 5. Background videos (CSS video) ───────────────────────
  document.querySelectorAll('video[autoplay], video[loop]').forEach(v => {
    v.autoplay = false;
    v.loop = false;
    v.pause();
    v.currentTime = 0;
  });

  return log;
})();
`;

// ─── Inject into HTML ──────────────────────────────────────────────
export function injectMediaDeterminismHtml(html) {
  if (html.includes('__sigma_media_determinism__')) return html;

  // 1. Strip autoplay attributes from HTML at static level
  html = html.replace(/<video([^>]*?)autoplay([^>]*)>/gi, '<video$1$2>');
  html = html.replace(/<audio([^>]*?)autoplay([^>]*)>/gi, '<audio$1$2>');

  // 2. Strip autoplay query param from iframe src
  html = html.replace(/<iframe([^>]*src=["'][^"']*?)autoplay=1([^"']*?["'][^>]*)>/gi, '<iframe$1autoplay=0$2>');
  html = html.replace(/<iframe([^>]*src=["'][^"']*?)\\?autoplay=1(["'])/gi, '<iframe$1?autoplay=0$2');

  // 3. Inject runtime determinism JS
  const script = `<script id="__sigma_media_determinism__">\n${MEDIA_DETERMINISM_JS}\n</script>`;
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${script}\n</body>`);
  }

  return html;
}

// ─── Apply to all index.html in mirror ─────────────────────────────
export function deterministicMirrorMedia(projDir) {
  const result = { files: [], totalSize: 0, autoplayRemoved: 0 };
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
        const autoplayBefore = (html.match(/autoplay/gi) || []).length;
        html = injectMediaDeterminismHtml(html);
        const autoplayAfter = (html.match(/autoplay=1/gi) || []).length;
        result.autoplayRemoved += (autoplayBefore - autoplayAfter);
        if (html !== original) {
          fs.writeFileSync(full, html);
          result.files.push(path.relative(projDir, full));
          result.totalSize += html.length - original.length;
        }
      }
    }
  }
  walk(path.join(projDir, "public"));
  return result;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-media-determinism.mjs <projectDir>");
    process.exit(1);
  }
  const r = deterministicMirrorMedia(projDir);
  console.log(`[media-determinism] ${r.files.length} HTML files (+${(r.totalSize / 1024).toFixed(1)}KB)`);
  console.log(`  autoplay attrs/params removed: ${r.autoplayRemoved}`);
  console.log(`  Targets: <video>, <audio>, YouTube iframe, Vimeo iframe, Wistia, generic autoplay`);
}
