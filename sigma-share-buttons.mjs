#!/usr/bin/env node
// sigma-share-buttons.mjs — Paradigm 249 — Social Share Buttons Auto
//
// Twitter/Facebook/LinkedIn/KakaoTalk + Native Web Share API.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SHARE_CSS = `
#__sigma_share__ {
  position: fixed; right: 20px; bottom: 80px; z-index: 9999;
  display: flex; flex-direction: column; gap: 8px;
}
#__sigma_share__ button {
  width: 48px; height: 48px; border-radius: 50%;
  border: none; cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; color: white;
  transition: transform 0.2s;
}
#__sigma_share__ button:hover { transform: scale(1.1); }
#__sigma_share_main { background: #4f46e5; }
#__sigma_share_twitter { background: #1da1f2; }
#__sigma_share_facebook { background: #1877f2; }
#__sigma_share_linkedin { background: #0a66c2; }
#__sigma_share_kakao { background: #fee500; color: #000; }
#__sigma_share_copy { background: #6b7280; }
#__sigma_share__.collapsed > button:not(#__sigma_share_main) {
  opacity: 0; transform: scale(0); pointer-events: none;
  transition: opacity 0.2s, transform 0.2s;
}
@media (max-width: 600px) {
  #__sigma_share__ { right: 12px; bottom: 60px; }
  #__sigma_share__ button { width: 40px; height: 40px; }
}
`;

export const SHARE_HTML = `
<div id="__sigma_share__" class="collapsed">
  <button id="__sigma_share_twitter" title="Twitter">𝕏</button>
  <button id="__sigma_share_facebook" title="Facebook">f</button>
  <button id="__sigma_share_linkedin" title="LinkedIn">in</button>
  <button id="__sigma_share_kakao" title="KakaoTalk">K</button>
  <button id="__sigma_share_copy" title="Copy URL">⧉</button>
  <button id="__sigma_share_main" title="공유">↗</button>
</div>
`;

export const SHARE_JS = `
/* sigma-share — Paradigm 249 */
(function share() {
  const container = document.getElementById('__sigma_share__');
  const main = document.getElementById('__sigma_share_main');
  if (!container || !main) return;

  // Native Web Share API on mobile
  if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
    main.addEventListener('click', () => {
      navigator.share({
        title: document.title,
        url: location.href,
      }).catch(() => container.classList.toggle('collapsed'));
    });
    return;
  }

  main.addEventListener('click', () => container.classList.toggle('collapsed'));

  function shareUrl(net) {
    const url = encodeURIComponent(location.href);
    const title = encodeURIComponent(document.title);
    const urls = {
      twitter: 'https://twitter.com/intent/tweet?text=' + title + '&url=' + url,
      facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + url,
      linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + url,
      kakao: 'https://story.kakao.com/share?url=' + url,
    };
    window.open(urls[net], '_blank', 'noopener,noreferrer,width=600,height=500');
  }

  document.getElementById('__sigma_share_twitter').addEventListener('click', () => shareUrl('twitter'));
  document.getElementById('__sigma_share_facebook').addEventListener('click', () => shareUrl('facebook'));
  document.getElementById('__sigma_share_linkedin').addEventListener('click', () => shareUrl('linkedin'));
  document.getElementById('__sigma_share_kakao').addEventListener('click', () => shareUrl('kakao'));
  document.getElementById('__sigma_share_copy').addEventListener('click', () => {
    navigator.clipboard.writeText(location.href).then(() => {
      const btn = document.getElementById('__sigma_share_copy');
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = '⧉'; }, 1500);
    });
  });
})();
`;

export function applyShareButtons(projDir) {
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

        html = html.replace(/<style[^>]*id="__sigma_share_css__"[\s\S]*?<\/style>\s*/gi, "");
        html = html.replace(/<div[^>]*id="__sigma_share__"[\s\S]*?<\/div>\s*/gi, "");
        html = html.replace(/<script[^>]*id="__sigma_share_js__"[\s\S]*?<\/script>\s*/gi, "");

        const cssInject = `<style id="__sigma_share_css__">\n${SHARE_CSS}\n</style>`;
        if (html.includes("</head>")) html = html.replace("</head>", cssInject + "\n</head>");
        if (html.includes("</body>")) {
          html = html.replace("</body>", `${SHARE_HTML}\n<script id="__sigma_share_js__">\n${SHARE_JS}\n</script>\n</body>`);
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
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir) { console.error("usage: <projDir>"); process.exit(1); }
  const r = applyShareButtons(projDir);
  console.log(`[share] HTML files: ${r.files?.length || 0}`);
}
