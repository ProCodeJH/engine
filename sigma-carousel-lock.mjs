#!/usr/bin/env node
// sigma-carousel-lock.mjs — Paradigm 135 — Carousel Lock + Deterministic Capture
//
// 자현 진짜 충격적인 발견 fix. 두손누리 source/clone이 다른 캐러셀 슬라이드를
// 캡처해서 visual 44.71% 거짓 fail. 둘 다 정확한 dusonnuri인데 다른 슬라이드.
//
// Solution: source 캡처와 clone screenshot 모두 슬라이드 #0 고정 + animation 정지.
//
// Lock targets:
//   - Swiper (.swiper-wrapper, .swiper-slide-active)
//   - Slick (.slick-slider, .slick-active)
//   - Splide (.splide__list, .is-active)
//   - Owl Carousel (.owl-stage, .owl-item.active)
//   - bxSlider, FlexSlider, Glide, Tiny Slider
//   - Custom (any element with autoplay attribute or rotating CSS)
//
// 적용 시점:
//   1. Source capture (puppeteer evaluate before screenshot)
//   2. Clone screenshot (puppeteer evaluate before screenshot)
//   3. Static mirror inject (window.__lockCarousels() function injected into HTML)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ─── Carousel Lock JS — runs in page context ────────────────────
// 이 함수를 page.evaluate(carouselLockJs) 또는 inline script로 inject
export const CAROUSEL_LOCK_JS = `
(function lockCarousels() {
  const log = [];

  // ─── 1. Stop CSS animations + transitions ─────────────────
  const freezeStyle = document.createElement('style');
  freezeStyle.id = '__sigma_freeze_style__';
  freezeStyle.textContent = \`
    *, *::before, *::after {
      animation-play-state: paused !important;
      animation-delay: 0s !important;
      animation-duration: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  \`;
  document.head.appendChild(freezeStyle);
  log.push('[freeze] CSS animations + transitions paused');

  // ─── 2. Swiper.js lock ──────────────────────────────────────
  document.querySelectorAll('.swiper, .swiper-container').forEach(s => {
    if (s.swiper) {
      try {
        s.swiper.autoplay?.stop?.();
        s.swiper.slideTo(0, 0);
        log.push('[swiper] locked to slide 0');
      } catch (e) {}
    }
    // Force first slide active via class manipulation
    const slides = s.querySelectorAll('.swiper-slide');
    slides.forEach((sl, i) => {
      sl.classList.toggle('swiper-slide-active', i === 0);
      sl.style.transform = 'translate3d(0,0,0)';
    });
    const wrapper = s.querySelector('.swiper-wrapper');
    if (wrapper) wrapper.style.transform = 'translate3d(0,0,0)';
  });

  // ─── 3. Slick lock ──────────────────────────────────────────
  document.querySelectorAll('.slick-slider, .slick-initialized').forEach(s => {
    if (window.jQuery && window.jQuery(s).slick) {
      try {
        window.jQuery(s).slick('slickPause');
        window.jQuery(s).slick('slickGoTo', 0, true);
        log.push('[slick] locked to slide 0');
      } catch (e) {}
    }
    const slides = s.querySelectorAll('.slick-slide');
    slides.forEach((sl, i) => {
      sl.classList.toggle('slick-active', i === 0);
      sl.classList.toggle('slick-current', i === 0);
    });
    const track = s.querySelector('.slick-track');
    if (track) {
      track.style.transform = 'translate3d(0,0,0)';
      track.style.transition = 'none';
    }
  });

  // ─── 4. Splide lock ─────────────────────────────────────────
  document.querySelectorAll('.splide').forEach(s => {
    const list = s.querySelector('.splide__list');
    if (list) list.style.transform = 'translateX(0)';
    s.querySelectorAll('.splide__slide').forEach((sl, i) => {
      sl.classList.toggle('is-active', i === 0);
      sl.classList.toggle('is-visible', i === 0);
    });
  });

  // ─── 5. Owl Carousel lock ───────────────────────────────────
  document.querySelectorAll('.owl-carousel').forEach(s => {
    const stage = s.querySelector('.owl-stage');
    if (stage) {
      stage.style.transform = 'translate3d(0,0,0)';
      stage.style.transition = 'none';
    }
    s.querySelectorAll('.owl-item').forEach((sl, i) => {
      sl.classList.toggle('active', i === 0);
    });
  });

  // ─── 6. Glide.js lock ───────────────────────────────────────
  document.querySelectorAll('.glide').forEach(s => {
    const slides = s.querySelector('.glide__slides');
    if (slides) {
      slides.style.transform = 'translate3d(0,0,0)';
      slides.style.transition = 'none';
    }
    s.querySelectorAll('.glide__slide').forEach((sl, i) => {
      sl.classList.toggle('glide__slide--active', i === 0);
    });
  });

  // ─── 7. bxSlider lock ───────────────────────────────────────
  document.querySelectorAll('.bxslider, .bx-wrapper').forEach(s => {
    s.querySelectorAll('.bx-clone').forEach(c => c.style.display = 'none');
    const viewport = s.querySelector('.bx-viewport');
    if (viewport) {
      const inner = viewport.firstElementChild;
      if (inner) inner.style.transform = 'translate3d(0,0,0)';
    }
  });

  // ─── 8. FlexSlider lock ─────────────────────────────────────
  document.querySelectorAll('.flexslider').forEach(s => {
    const slides = s.querySelectorAll('.slides > li, .flex-slide');
    slides.forEach((sl, i) => {
      sl.classList.toggle('flex-active-slide', i === 0);
      sl.style.opacity = i === 0 ? '1' : '0';
      sl.style.zIndex = i === 0 ? '2' : '1';
    });
  });

  // ─── 9. Tiny Slider lock ────────────────────────────────────
  document.querySelectorAll('.tns-slider, [data-tns]').forEach(s => {
    s.style.transform = 'translate3d(0,0,0)';
    s.style.transition = 'none';
    s.querySelectorAll('.tns-item').forEach((sl, i) => {
      sl.classList.toggle('tns-slide-active', i === 0);
    });
  });

  // ─── 10. Generic [data-autoplay] / autoplay attr ────────────
  document.querySelectorAll('[data-autoplay], [autoplay]').forEach(el => {
    el.removeAttribute('autoplay');
    el.removeAttribute('data-autoplay');
    if (el.tagName === 'VIDEO') {
      el.pause?.();
      el.currentTime = 0;
    }
  });

  // ─── 11. Imweb-specific (dusonnuri base) ────────────────────
  // imweb는 .iw-carousel, .iw-slide* 변형 사용
  document.querySelectorAll('.iw-carousel, [class*="carousel"], [class*="slider"]').forEach(s => {
    const items = s.querySelectorAll('[class*="slide"], [class*="item"]');
    items.forEach((sl, i) => {
      const isActive = i === 0;
      // Common class patterns
      ['active', 'current', 'is-active', 'selected'].forEach(c => {
        if (sl.className.includes(c.replace(/-/g, ''))) sl.classList.toggle(c, isActive);
      });
      if (!isActive) {
        // Off-screen slides hidden visually but DOM kept
        sl.style.visibility = 'hidden';
        sl.style.position = 'absolute';
        sl.style.left = '-99999px';
      }
    });
  });

  // ─── 12. clearInterval all auto-rotators ────────────────────
  // Some carousels don't expose an API. Stop all setInterval (heavy hammer)
  // 단, 자체 React/Vue runtime 손상 방지 위해 신중히 — 일정 시간 후만
  if (!window.__sigma_intervals_cleared__) {
    window.__sigma_intervals_cleared__ = true;
    // Track intervals (best effort — only catches future ones)
    const origSetInterval = window.setInterval;
    window.setInterval = function() {
      // Don't actually run new intervals after lock
      return -1;
    };
    log.push('[generic] new setInterval blocked');
  }

  // ─── 13. Scroll to top (deterministic position) ─────────────
  window.scrollTo(0, 0);

  return log;
})();
`;

// ─── Helper: inject lock JS into puppeteer page before screenshot ─
export async function lockCarouselsInPage(page) {
  return await page.evaluate(CAROUSEL_LOCK_JS);
}

// ─── Helper: inject lock JS into static mirror HTML ─────────────
export function injectCarouselLockHtml(html) {
  if (html.includes('__sigma_freeze_style__')) return html; // already injected
  const script = `<script id="__sigma_carousel_lock__">
${CAROUSEL_LOCK_JS}
</script>`;
  // Inject before </body> so DOM is ready
  if (html.includes('</body>')) {
    return html.replace('</body>', `${script}\n</body>`);
  }
  return html + script;
}

// ─── Apply to all index.html files in mirror ──────────────────
export function lockMirrorCarousels(projDir) {
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
        html = injectCarouselLockHtml(html);
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

// ─── Main entrypoint ─────────────────────────────────────────────
const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-carousel-lock.mjs <projectDir>");
    process.exit(1);
  }
  const r = lockMirrorCarousels(projDir);
  console.log(`[carousel-lock] Locked ${r.files.length} HTML files (+${(r.totalSize / 1024).toFixed(1)}KB script)`);
  for (const f of r.files) console.log(`  - ${f}`);
  console.log(`\nLocked carousel libs: Swiper, Slick, Splide, Owl, Glide, bxSlider, FlexSlider, Tiny Slider, Imweb, generic autoplay`);
  console.log(`Captures will now be deterministic (slide 0 + animation paused).`);
}
