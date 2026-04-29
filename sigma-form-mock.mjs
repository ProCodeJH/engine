#!/usr/bin/env node
// sigma-form-mock.mjs — Paradigm 200 — Form Mock Backend (사이트 살아있음)
//
// 자현 명령 "모든 실력": 사이트가 진짜 작동하는 것처럼.
// 모든 form submit intercept → mock success/error response.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const FORM_MOCK_JS = `
/* sigma-form-mock — Paradigm 200 */
(function formMock() {
  // Detect form type from input names/placeholders
  function detectFormType(form) {
    const text = form.outerHTML.toLowerCase();
    if (/contact|inquiry|문의|상담/.test(text)) return 'contact';
    if (/login|signin|로그인/.test(text)) return 'login';
    if (/signup|register|회원가입/.test(text)) return 'signup';
    if (/search|검색/.test(text)) return 'search';
    if (/subscribe|newsletter|구독/.test(text)) return 'subscribe';
    return 'generic';
  }

  function showNotification(form, type, success = true) {
    const messages = {
      contact: { ok: '문의가 정상 접수되었습니다. 빠른 시간 내에 답변 드리겠습니다.', err: '오류가 발생했습니다.' },
      login: { ok: '로그인 되었습니다.', err: '아이디 또는 비밀번호가 일치하지 않습니다.' },
      signup: { ok: '회원가입이 완료되었습니다.', err: '이미 등록된 이메일입니다.' },
      search: { ok: '검색 결과를 표시합니다.', err: '검색 오류.' },
      subscribe: { ok: '뉴스레터 구독 완료. 감사합니다.', err: '구독 오류.' },
      generic: { ok: '정상 처리되었습니다.', err: '오류가 발생했습니다.' },
    };
    const msg = success ? messages[type].ok : messages[type].err;

    // Toast notification
    const toast = document.createElement('div');
    toast.style.cssText = \`
      position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
      background: \${success ? '#4ade80' : '#f87171'}; color: white;
      padding: 16px 32px; border-radius: 8px; font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 99999;
      animation: sigmaSlideDown 0.3s ease;
    \`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Add slidedown keyframe
  const style = document.createElement('style');
  style.textContent = '@keyframes sigmaSlideDown { from { transform: translate(-50%, -100px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }';
  document.head.appendChild(style);

  // Intercept all forms
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const type = detectFormType(form);
      showNotification(form, type, true);
      // Reset form
      form.reset();
    }, true);
  });

  // Intercept fetch/XHR (some sites use AJAX)
  const origFetch = window.fetch;
  window.fetch = function(url, opts) {
    if (opts && (opts.method === 'POST' || opts.method === 'PUT')) {
      // Mock response
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, message: '정상 처리되었습니다.' }),
        text: () => Promise.resolve('{"success":true}'),
      });
    }
    return origFetch.apply(this, arguments);
  };
})();
`;

export function applyFormMock(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = { files: [] };
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
        html = html.replace(/<script[^>]*id="__sigma_form_mock__"[\s\S]*?<\/script>\s*/gi, "");
        const inject = `<script id="__sigma_form_mock__">\n${FORM_MOCK_JS}\n</script>`;
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
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-form-mock.mjs <projDir>");
    process.exit(1);
  }
  const r = applyFormMock(projDir);
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[form-mock] HTML files: ${r.files.length}`);
  console.log(`  ✅ Forms 살아있음 (mock success/error toast)`);
  console.log(`  ✅ AJAX POST/PUT mocked (success response)`);
}
