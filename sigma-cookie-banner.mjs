#!/usr/bin/env node
// sigma-cookie-banner.mjs — Paradigm 216 — GDPR Cookie Consent Banner
//
// 자현 client deploy 시 GDPR 자동 compliance.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const COOKIE_BANNER_JS = `
/* sigma-cookie-banner — Paradigm 216 */
(function cookieBanner() {
  if (localStorage.getItem('sigma-cookie-consent')) return;

  const banner = document.createElement('div');
  banner.id = '__sigma_cookie_banner__';
  banner.style.cssText = \`
    position: fixed; bottom: 0; left: 0; right: 0;
    background: rgba(31, 41, 55, 0.97); color: white;
    padding: 16px 24px; z-index: 99998;
    box-shadow: 0 -4px 12px rgba(0,0,0,0.15);
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; flex-wrap: wrap; font-size: 14px;
    animation: sigmaSlideUp 0.4s ease;
  \`;
  banner.innerHTML = \`
    <div style="flex:1;min-width:280px;">
      이 사이트는 사용자 경험 향상을 위해 쿠키를 사용합니다.
      계속 이용하시면 쿠키 사용에 동의하시는 것으로 간주됩니다.
    </div>
    <div style="display:flex;gap:8px;">
      <button id="sigma-cookie-accept" style="background:#4f46e5;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;">동의</button>
      <button id="sigma-cookie-decline" style="background:transparent;color:white;border:1px solid #6b7280;padding:8px 16px;border-radius:6px;cursor:pointer;">거부</button>
    </div>
  \`;
  document.body.appendChild(banner);

  const style = document.createElement('style');
  style.textContent = '@keyframes sigmaSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }';
  document.head.appendChild(style);

  function dismiss(consent) {
    localStorage.setItem('sigma-cookie-consent', consent);
    banner.style.animation = 'sigmaSlideUp 0.3s ease reverse';
    setTimeout(() => banner.remove(), 300);
  }

  document.getElementById('sigma-cookie-accept').addEventListener('click', () => dismiss('accepted'));
  document.getElementById('sigma-cookie-decline').addEventListener('click', () => dismiss('declined'));
})();
`;

export function applyCookieBanner(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = { files: [] };
  function walk(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.name === "index.html") {
        let html = fs.readFileSync(full, "utf-8");
        const original = html;
        html = html.replace(/<script[^>]*id="__sigma_cookie_banner__"[\s\S]*?<\/script>\s*/gi, "");
        const inject = `<script id="__sigma_cookie_banner__">\n${COOKIE_BANNER_JS}\n</script>`;
        if (html.includes("</body>")) html = html.replace("</body>", inject + "\n</body>");
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
  if (!projDir) { console.error("usage: <projDir>"); process.exit(1); }
  const r = applyCookieBanner(projDir);
  console.log(`[cookie] HTML files: ${r.files?.length || 0}`);
}
