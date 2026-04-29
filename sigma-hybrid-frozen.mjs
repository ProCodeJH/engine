#!/usr/bin/env node
// sigma-hybrid-frozen.mjs — Paradigm 185 — Hybrid Frozen Mirror + Motion
//
// 자현: "P184 frozen은 시각만 baked, 모션/스크롤 애니메이션 다 뒤짐"
//
// P184 trade-off: script strip → init 안 깨짐 BUT motion library 모두 죽음.
// P185 — Frozen visual + Sigma motion runtime + Auto scroll-trigger.
//
// Layer:
//   1. Frozen DOM (P184): widget content baked-in, visual 100%
//   2. Sigma motion runtime (P160): GSAP/Lenis/AOS stub (real animations)
//   3. CSS keyframes (P166): 16 sigma keyframes + auto-bind to data-aos
//   4. Reveal CSS (P136): force-reveal scroll-fade-in
//   5. IntersectionObserver auto-fire: scroll-trigger 자동 발동
//   6. Imweb runtime stub (P182): backend variables stub (no init crash)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SIGMA_ANIMATION_RUNTIME_JS } from "./sigma-runtime-animation.mjs";
import { SIGMA_KEYFRAMES_CSS } from "./sigma-motion-keyframes.mjs";
import { REVEAL_CSS } from "./sigma-reveal-animations.mjs";
import { IMWEB_RUNTIME_STUB_JS } from "./sigma-imweb-runtime-stub.mjs";

// ─── Auto scroll-trigger reveal (자체 IO) ──────────────────────
const SIGMA_AUTO_REVEAL_JS = `
/* sigma-auto-reveal — Paradigm 185 */
(function autoReveal() {
  // Find elements that look like they should fade-in on scroll
  const candidates = document.querySelectorAll(
    'section, article, [class*="card"], [class*="item"], [class*="block"], ' +
    '[class*="section"], [class*="row"], [class*="col"], h1, h2, h3, ' +
    '.fade, .reveal, [data-aos], [data-animate], .animate-on-scroll'
  );

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('sigma-revealed');
        e.target.style.opacity = '1';
        e.target.style.transform = 'none';
      }
    });
  }, { threshold: 0.15, rootMargin: '50px' });

  candidates.forEach((el, i) => {
    // Only attach to elements not already visible
    const rect = el.getBoundingClientRect();
    if (rect.top > window.innerHeight) {
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      io.observe(el);
    }
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
`;

const SIGMA_PARALLAX_JS = `
/* sigma-parallax — subtle scroll parallax for hero/banner */
(function parallax() {
  const heroEls = document.querySelectorAll('[class*="hero"], [class*="banner"], [class*="main-visual"], [class*="cover"]');
  if (heroEls.length === 0) return;

  let raf = null;
  function update() {
    const y = window.scrollY;
    heroEls.forEach((el, i) => {
      el.style.transform = 'translateY(' + (y * 0.3) + 'px)';
    });
    raf = null;
  }
  window.addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(update);
  }, { passive: true });
})();
`;

// ─── Apply hybrid frozen + motion to existing frozen mirror ────
export function applyHybridMotion(projDir) {
  const publicDir = path.join(projDir, "public");
  if (!fs.existsSync(publicDir)) return { error: "public/ not found" };

  const result = { files: [], scriptsAdded: 0, stylesAdded: 0 };

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

        // Build full motion bundle
        const motionBundle = `
<style id="__sigma_motion_css__">
${SIGMA_KEYFRAMES_CSS}
${REVEAL_CSS}
</style>
<script id="__sigma_imweb_stub__">
${IMWEB_RUNTIME_STUB_JS}
</script>
<script id="__sigma_animation_runtime__">
${SIGMA_ANIMATION_RUNTIME_JS}
</script>
<script id="__sigma_auto_reveal__" defer>
${SIGMA_AUTO_REVEAL_JS}
</script>
<script id="__sigma_parallax__" defer>
${SIGMA_PARALLAX_JS}
</script>`;

        // Remove any prior sigma motion injects (idempotent)
        html = html.replace(/<style[^>]*id="__sigma_motion_css__"[\s\S]*?<\/style>\s*/gi, "");
        html = html.replace(/<script[^>]*id="__sigma_(imweb_stub|animation_runtime|auto_reveal|parallax)[^"]*"[\s\S]*?<\/script>\s*/gi, "");

        // Inject before </head>
        if (html.includes('</head>')) {
          html = html.replace('</head>', motionBundle + '\n</head>');
        } else if (html.includes('<head>')) {
          html = html.replace('<head>', '<head>\n' + motionBundle);
        }

        if (html !== original) {
          fs.writeFileSync(full, html);
          result.files.push(path.relative(projDir, full));
          result.scriptsAdded += 4;
          result.stylesAdded += 1;
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
    console.error("usage: node sigma-hybrid-frozen.mjs <projDir>");
    console.error("  Frozen mirror에 motion paradigm inject (P160+P166+P136+P182+자체 reveal+parallax)");
    process.exit(1);
  }
  const r = applyHybridMotion(projDir);
  if (r.error) { console.error(r.error); process.exit(1); }
  console.log(`[hybrid-frozen] HTML files: ${r.files.length}`);
  console.log(`  scripts: ${r.scriptsAdded * r.files.length}`);
  console.log(`  styles:  ${r.stylesAdded * r.files.length}`);
  console.log(`\n  Motion stack:`);
  console.log(`  - Sigma keyframes (16): fadeIn/Up/Down/Zoom/Slide/Bounce/Float/Spin/etc.`);
  console.log(`  - Reveal CSS: data-aos auto-bind`);
  console.log(`  - Imweb stub: LOCALIZE/MENU/ALARM 등 (no crash)`);
  console.log(`  - Sigma animation runtime: GSAP/Lenis/AOS API stub (real anim)`);
  console.log(`  - Auto-reveal IO: scroll-trigger fade-in`);
  console.log(`  - Parallax: hero/banner subtle scroll move`);
  console.log(`\n  ✅ Frozen visual + 진짜 motion 살아있음`);
}
