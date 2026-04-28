#!/usr/bin/env node
// sigma-reveal-animations.mjs — Paradigm 136 — Force-Reveal Scroll Animations
//
// 자현 명령: "동적데이터나 스크롤 애니메이션, 카드 움직임, 모션, 이런 움직이는
// 데이터들을 100% 캐치 할 수 있어야".
//
// P135 (Carousel Lock)은 자동 회전 슬라이더 fix.
// P136은 IntersectionObserver/AOS/scroll-triggered fade-in 같은 "초기 hidden, 스크롤
// 후 reveal" 패턴 fix. Static mirror가 hidden 상태만 캡처하면 빈 페이지 보임.
//
// Detected patterns:
//   - AOS (data-aos="fade-up", data-aos-delay)
//   - WOW.js (.wow.fadeIn)
//   - Animate.css triggers
//   - Framer Motion (data-framer-component-type)
//   - GSAP ScrollTrigger (gsap.from with autoAlpha:0)
//   - Custom (.appear, .reveal, .animate-on-scroll)
//   - opacity:0 + transform:translateY(...) initial state
//
// Action: 모든 hidden 상태를 final revealed 상태로 force.
//
// 출력: public/index.html에 reveal CSS + JS inject

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── Reveal CSS — applied as last stylesheet (max specificity) ─────
export const REVEAL_CSS = `
/* P136 Force-Reveal — sigma-reveal-animations */
/* AOS */
[data-aos] { opacity: 1 !important; transform: none !important; transition: none !important; }
[data-aos].aos-animate { opacity: 1 !important; transform: none !important; }

/* WOW.js / Animate.css */
.wow, .animated, .fadeIn, .fadeInUp, .fadeInDown, .fadeInLeft, .fadeInRight,
.slideInUp, .slideInDown, .zoomIn {
  opacity: 1 !important;
  transform: none !important;
  visibility: visible !important;
  animation-duration: 0s !important;
  animation-delay: 0s !important;
}

/* Custom common class names */
.reveal, .appear, .animate-on-scroll, .scroll-fade, .fade-up, .fade-down,
.in-view, .scroll-reveal, .lazy-reveal {
  opacity: 1 !important;
  transform: none !important;
  visibility: visible !important;
}

/* Framer Motion */
[data-framer-component-type] { opacity: 1 !important; }
[data-framer-component-type] [style*="opacity: 0"] { opacity: 1 !important; }
[data-framer-name] { opacity: 1 !important; transform: none !important; }

/* Generic transition opacity */
[style*="opacity: 0"][style*="transition"] { opacity: 1 !important; }
[style*="opacity:0"][style*="transition"] { opacity: 1 !important; }

/* Generic translateY pre-animation states */
[style*="translateY(20px)"], [style*="translateY(30px)"], [style*="translateY(40px)"],
[style*="translateY(50px)"], [style*="translateY(60px)"], [style*="translateY(80px)"],
[style*="translateY(100px)"] { transform: none !important; }

/* Imweb specific (dusonnuri base) */
[class*="iw-fade"], [class*="iw-slide"], [class*="iw-zoom"] {
  opacity: 1 !important; transform: none !important;
}
`;

// ─── Reveal JS — runs once on page load ────────────────────────────
export const REVEAL_JS = `
(function forceRevealAnimations() {
  // 1. Trigger AOS init+refresh if loaded
  if (window.AOS) {
    try {
      window.AOS.init({ disable: true });
      document.querySelectorAll('[data-aos]').forEach(el => {
        el.classList.add('aos-animate');
        el.removeAttribute('data-aos-delay');
        el.removeAttribute('data-aos-duration');
      });
    } catch (e) {}
  }

  // 2. Trigger WOW.js
  if (window.WOW) {
    try {
      const wow = new window.WOW({ live: false });
      wow.init();
      document.querySelectorAll('.wow').forEach(el => {
        el.style.visibility = 'visible';
        el.classList.add('animated');
      });
    } catch (e) {}
  }

  // 3. Trigger GSAP ScrollTrigger refresh + force reveal
  if (window.gsap && window.ScrollTrigger) {
    try {
      window.ScrollTrigger.getAll().forEach(t => {
        // Skip animation, jump to final state
        if (t.animation) {
          t.animation.progress(1);
          t.animation.kill();
        }
      });
    } catch (e) {}
  }

  // 4. IntersectionObserver — fire all callbacks immediately
  // 이미 등록된 observer는 못 만지지만, future ones는 instant fire
  const origIO = window.IntersectionObserver;
  if (origIO) {
    window.IntersectionObserver = class extends origIO {
      constructor(callback, options) {
        super((entries, obs) => {
          // Force isIntersecting=true on all entries
          const fakeEntries = entries.map(e => ({ ...e, isIntersecting: true, intersectionRatio: 1 }));
          callback(fakeEntries, obs);
        }, options);
      }
      observe(target) {
        super.observe(target);
        // Manually trigger
        setTimeout(() => {
          const entry = {
            target, isIntersecting: true, intersectionRatio: 1,
            boundingClientRect: target.getBoundingClientRect(),
            intersectionRect: target.getBoundingClientRect(),
            rootBounds: null, time: performance.now(),
          };
          // Get the callback (private — best effort)
        }, 0);
      }
    };
  }

  // 5. Force visible — generic class hunt
  const hiddenSelectors = [
    '.opacity-0', '[style*="opacity: 0"]', '[style*="opacity:0"]',
    '.invisible', '.hidden-on-load', '.before-reveal',
    '.fade-in:not(.appeared)', '.scroll-trigger:not(.triggered)',
  ];
  document.querySelectorAll(hiddenSelectors.join(',')).forEach(el => {
    el.style.opacity = '1';
    el.style.visibility = 'visible';
    el.style.transform = 'none';
    el.classList.add('appeared', 'triggered', 'in-view');
  });

  // 6. Scroll once to bottom + back to top to trigger any remaining
  // (이건 capture 후엔 useless하지만 mirror에선 사용자 경험에 도움)
  const initialScroll = window.scrollY;
  // Don't actually scroll in mirror — user might be reading
  // window.scrollTo(0, document.body.scrollHeight);
  // window.scrollTo(0, initialScroll);

  console.log('[P136] Reveal animations forced');
})();
`;

// ─── Inject into HTML ──────────────────────────────────────────────
export function injectRevealHtml(html) {
  if (html.includes('__sigma_reveal_css__')) return html; // already injected

  // Add CSS before </head>
  const cssTag = `<style id="__sigma_reveal_css__">\n${REVEAL_CSS}\n</style>`;
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${cssTag}\n</head>`);
  }

  // Add JS before </body>
  const jsTag = `<script id="__sigma_reveal_js__">\n${REVEAL_JS}\n</script>`;
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${jsTag}\n</body>`);
  }

  return html;
}

// ─── Apply to all index.html in mirror ─────────────────────────────
export function revealMirrorAnimations(projDir) {
  const result = { files: [], totalSize: 0 };
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
        html = injectRevealHtml(html);
        if (html !== original) {
          fs.writeFileSync(full, html);
          result.files.push(path.relative(projDir, full));
          result.totalSize += html.length - original.length;
        }
      }
    }
  }
  const publicDir = path.join(projDir, "public");
  walk(publicDir);
  return result;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-reveal-animations.mjs <projectDir>");
    process.exit(1);
  }
  const r = revealMirrorAnimations(projDir);
  console.log(`[reveal-animations] Forced reveal on ${r.files.length} HTML files (+${(r.totalSize / 1024).toFixed(1)}KB)`);
  for (const f of r.files) console.log(`  - ${f}`);
  console.log(`\nForced patterns: AOS, WOW, Animate.css, GSAP ScrollTrigger, IntersectionObserver,`);
  console.log(`Framer Motion, Imweb fade/slide/zoom, generic .reveal/.appear/.fade-*`);
}
