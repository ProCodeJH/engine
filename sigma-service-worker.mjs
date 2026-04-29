#!/usr/bin/env node
// sigma-service-worker.mjs — Paradigm 203 — Service Worker (PWA + Network Replay)
//
// 자현 명령 "모든 실력": 사이트가 backend 있는 것처럼 살아있음.
//
// P203 — Service worker + network replay:
//   - 모든 fetch/XHR intercept
//   - GET: cache-first (offline 가능)
//   - POST/PUT/DELETE: mock success response
//   - Static assets cache 영구
//   - PWA install banner 가능

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SW_SCRIPT = `
/* sigma-service-worker — Paradigm 203 */
const CACHE_NAME = 'sigma-v1';
const RUNTIME_CACHE = 'sigma-runtime-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== RUNTIME_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Skip cross-origin (no CORS issues)
  if (url.origin !== location.origin) return;

  // POST/PUT/DELETE → mock success
  if (req.method !== 'GET') {
    e.respondWith(mockApiResponse(req));
    return;
  }

  // GET: cache-first
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        // Background update
        fetch(req).then((res) => {
          if (res && res.status === 200) {
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, res.clone()));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(req).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback for HTML
        if (req.destination === 'document') {
          return caches.match('/index.html');
        }
        return new Response('', { status: 504 });
      });
    })
  );
});

async function mockApiResponse(req) {
  const url = new URL(req.url);
  const path = url.pathname.toLowerCase();

  let body = { success: true };

  if (/contact|inquiry|문의/.test(path)) {
    body = { success: true, message: '문의가 정상 접수되었습니다. 빠른 시간 내에 답변 드리겠습니다.' };
  } else if (/login/.test(path)) {
    body = { success: true, message: '로그인 되었습니다.', user: { id: 1, name: 'Demo User' } };
  } else if (/signup|register/.test(path)) {
    body = { success: true, message: '회원가입이 완료되었습니다.' };
  } else if (/search|검색/.test(path)) {
    body = { success: true, results: [], total: 0 };
  } else if (/subscribe|newsletter/.test(path)) {
    body = { success: true, message: '뉴스레터 구독 완료' };
  } else {
    body = { success: true, message: '정상 처리되었습니다.' };
  }

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
`;

const SW_REGISTER = `
/* sigma-sw-register — Paradigm 203 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('[sigma] service worker registered'))
      .catch((e) => console.warn('[sigma] sw failed:', e.message));
  });
}
`;

const PWA_MANIFEST = (siteName, themeColor) => ({
  name: siteName,
  short_name: siteName,
  start_url: "/",
  display: "standalone",
  theme_color: themeColor,
  background_color: "#ffffff",
  icons: [
    { src: "/favicon.ico", sizes: "64x64 32x32 24x24 16x16", type: "image/x-icon" },
  ],
});

export function applyServiceWorker(projDir, opts = {}) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  // Write sw.js
  fs.writeFileSync(path.join(publicDir, "sw.js"), SW_SCRIPT);

  // Write manifest.json
  const siteName = opts.siteName || "Sigma Mirror";
  const themeColor = opts.themeColor || "#4f46e5";
  fs.writeFileSync(path.join(publicDir, "manifest.json"), JSON.stringify(PWA_MANIFEST(siteName, themeColor), null, 2));

  const result = { files: [], swEmitted: true, manifestEmitted: true };

  function walk(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name === "index.html") {
        let html = fs.readFileSync(full, "utf-8");
        const original = html;
        html = html.replace(/<script[^>]*id="__sigma_sw_register__"[\s\S]*?<\/script>\s*/gi, "");
        html = html.replace(/<link[^>]*rel="manifest"[^>]*>\s*/gi, "");
        const inject = `<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="${themeColor}">
<script id="__sigma_sw_register__">\n${SW_REGISTER}\n</script>`;
        if (html.includes("</head>")) html = html.replace("</head>", inject + "\n</head>");
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
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-service-worker.mjs <projDir>");
    process.exit(1);
  }
  const r = applyServiceWorker(projDir);
  console.log(`[sw] HTML files: ${r.files.length}`);
  console.log(`  ✅ /sw.js, /manifest.json`);
  console.log(`  ✅ PWA install + offline cache + API mock`);
}
