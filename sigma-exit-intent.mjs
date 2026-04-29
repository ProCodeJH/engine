#!/usr/bin/env node
// sigma-exit-intent.mjs — Paradigm 281 — Exit Intent Popup
//
// Mouse leave top edge → 마지막 chance modal. 자현 client conversion.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const EXIT_INTENT_JS = `
/* sigma-exit-intent — Paradigm 281 */
(function exitIntent() {
  if (localStorage.getItem('sigma-exit-shown')) return;
  if (sessionStorage.getItem('sigma-exit-this-session')) return;

  const minTime = 8000;  // min 8s on page before triggering
  const startTime = Date.now();

  function show() {
    const onPage = Date.now() - startTime;
    if (onPage < minTime) return;

    const modal = document.createElement('div');
    modal.id = '__sigma_exit_modal__';
    modal.innerHTML = \`
<div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;animation:sigmaFadeIn 0.3s;">
  <div style="background:white;padding:32px 40px;border-radius:12px;max-width:440px;text-align:center;animation:sigmaScaleUp 0.3s;">
    <h2 style="margin:0 0 16px;color:#1f2937;font-size:24px;">잠시만요!</h2>
    <p style="color:#6b7280;line-height:1.6;margin:0 0 24px;">
      떠나시기 전에<br>
      이 사이트의 특별한 정보를 받아보세요.
    </p>
    <button id="__sigma_exit_accept" style="background:#4f46e5;color:white;border:none;padding:12px 32px;border-radius:8px;cursor:pointer;font-size:14px;margin-right:8px;">관심있어요</button>
    <button id="__sigma_exit_close" style="background:transparent;color:#6b7280;border:1px solid #e5e7eb;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:14px;">아니요 괜찮습니다</button>
  </div>
</div>
\`;
    const style = document.createElement('style');
    style.textContent = '@keyframes sigmaFadeIn{from{opacity:0}to{opacity:1}}@keyframes sigmaScaleUp{from{transform:scale(0.9);opacity:0}to{transform:scale(1);opacity:1}}';
    document.head.appendChild(style);
    document.body.appendChild(modal);

    function dismiss(accepted) {
      localStorage.setItem('sigma-exit-shown', accepted ? 'accepted' : 'dismissed');
      sessionStorage.setItem('sigma-exit-this-session', '1');
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 300);
    }

    document.getElementById('__sigma_exit_accept').addEventListener('click', () => {
      dismiss(true);
      // Scroll to first form (자현이 contact form 만든 곳)
      const form = document.querySelector('form');
      if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    document.getElementById('__sigma_exit_close').addEventListener('click', () => dismiss(false));
  }

  // Detect mouse leave at top
  document.addEventListener('mouseout', (e) => {
    if (e.clientY <= 0 && !e.relatedTarget) {
      show();
    }
  });
})();
`;

export function applyExitIntent(projDir) {
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
        html = html.replace(/<script[^>]*id="__sigma_exit_intent__"[\s\S]*?<\/script>\s*/gi, "");
        const inject = `<script id="__sigma_exit_intent__">\n${EXIT_INTENT_JS}\n</script>`;
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
  const r = applyExitIntent(projDir);
  console.log(`[exit-intent] HTML: ${r.files?.length || 0}`);
}
