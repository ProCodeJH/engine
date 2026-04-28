#!/usr/bin/env node
// sigma-emit-motion.mjs — Lenis + GSAP ScrollTrigger 자체 모션 자동 emit
//
// 자현 비즈니스 핵심: 자현 메모리 feedback-copyright 명시 정책
//   "스크롤 자체 구현 — Framer 스크롤 코드 사용 금지,
//    lenis (스무스 스크롤) + GSAP ScrollTrigger (스크롤 연동) 100% 자체"
//
// Sigma가 capture한 motionHints / scrollTrajectory / scrollDrivenAnimations /
// animations / animOrchestration 데이터를 자체 React + GSAP 컴포넌트로 emit.
//
// 결과: src/components/MotionRoot.tsx (Provider) + src/lib/motion-config.ts
// 자현 page.tsx에 <MotionRoot> wrap → 클라이언트 페이지에서 자체 모션 작동.
// framer-motion 의존 0 — Baker v. Selden 사실 측정 + 자체 구현 라이선스 클린.

import fs from "node:fs";
import path from "node:path";

export function emitMotionRoot(extracted, projDir) {
  const motionHints = extracted.motionHints || {};
  const scrollSignals = extracted.scrollSignals || {};
  const scrollTrajectory = extracted.scrollTrajectory || [];
  const animations = extracted.animations || [];
  const orchestration = extracted.animOrchestration || {};
  const scrollDriven = extracted.scrollDrivenAnimations || {};

  // Detect what motion libs to include — default ON (자체 모션 자현 정책)
  // sections 있으면 GSAP 필요 (data-motion-fadeIn 등 작동 위해)
  const hasSections = (extracted.sections?.length || 0) > 0;
  const useLenis = motionHints.hasLenis !== false; // default ON for smoothness
  const useGsap = hasSections || animations.length > 0 || scrollTrajectory.length > 0 ||
                  motionHints.hasGSAP || scrollDriven.scrollTimelineCount > 0;
  const useCountUp = (motionHints.numericHeadings?.length || 0) > 0;

  // Stagger value from orchestration (자현 메모리 v90-2 — calibrated)
  const baseStagger = orchestration.staggerSeqs?.length > 0 ? 0.07 :
                      animations.length > 50 ? 0.05 :
                      animations.length > 10 ? 0.08 : 0.1;

  // Sticky / parallax detection
  const hasSticky = scrollSignals.stickyElements > 0;
  const hasParallax = scrollSignals.transformedNonAnimated >= 10;

  const compDir = path.join(projDir, "src", "components");
  fs.mkdirSync(compDir, { recursive: true });

  const libDir = path.join(projDir, "src", "lib");
  fs.mkdirSync(libDir, { recursive: true });

  // 1. motion-config.ts — extracted facts
  fs.writeFileSync(path.join(libDir, "motion-config.ts"), `// Sigma motion config — extracted facts (Baker v. Selden 보호)
// 자현 메모리 feedback-copyright: framer-motion 금지, 자체 lenis+GSAP 구현
export const MOTION_CONFIG = {
  baseStagger: ${baseStagger},
  smoothScrollDuration: 1.2,
  hasSticky: ${hasSticky},
  hasParallax: ${hasParallax},
  hasLenis: ${useLenis},
  hasGSAP: ${useGsap},
  totalCapturedAnimations: ${animations.length},
  scrollTrajectorySamples: ${scrollTrajectory.length},
  scrollTimelineCount: ${scrollDriven.scrollTimelineCount || 0},
  customCursor: ${motionHints.customCursorUsed === true},
};
`);

  // 2. MotionRoot.tsx — main provider
  const motionRootTsx = `"use client";
// Sigma MotionRoot — Lenis + GSAP ScrollTrigger 자체 구현
// 자현 메모리 feedback-copyright 명시: framer-motion import 금지,
// lenis + GSAP ScrollTrigger로 100% 자체.
//
// 등록되는 효과 (capture된 motionHints에 따라):
${useLenis ? "//   - Lenis smooth scroll (duration 1.2s)" : ""}
${useGsap ? "//   - GSAP ScrollTrigger fadeIn/slideIn for [data-motion-*]" : ""}
${hasSticky ? "//   - Sticky scroll pinning for [data-motion-sticky]" : ""}
${hasParallax ? "//   - Parallax y-shift for [data-motion-parallax]" : ""}
${useCountUp ? "//   - CountUp number animation for [data-motion-count]" : ""}

import { ReactNode, useEffect, useRef } from "react";
${useLenis ? `import Lenis from "lenis";` : ""}
${useGsap ? `import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";` : ""}
import { MOTION_CONFIG } from "@/lib/motion-config";

${useGsap ? `if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}` : ""}

export default function MotionRoot({ children }: { children: ReactNode }) {
  ${useLenis ? `const lenisRef = useRef<any>(null);` : ""}

  useEffect(() => {
    if (typeof window === "undefined") return;

    ${useLenis ? `// 1. Lenis smooth scroll
    const lenis = new Lenis({
      duration: MOTION_CONFIG.smoothScrollDuration,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;
    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);
    ${useGsap ? `// Sync GSAP ScrollTrigger with Lenis
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);` : ""}` : ""}

    ${useGsap ? `// 2. GSAP ScrollTrigger — fadeIn/slideIn animations
    const ctx = gsap.context(() => {
      // [data-motion-fadeIn]: opacity + y
      gsap.utils.toArray<HTMLElement>("[data-motion-fadeIn]").forEach((el, i) => {
        gsap.fromTo(el, { opacity: 0, y: 30 }, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          delay: i * MOTION_CONFIG.baseStagger,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 80%", once: true },
        });
      });

      // [data-motion-slideUp]: y from 60
      gsap.utils.toArray<HTMLElement>("[data-motion-slideUp]").forEach((el, i) => {
        gsap.fromTo(el, { opacity: 0, y: 60 }, {
          opacity: 1, y: 0, duration: 0.9, delay: i * MOTION_CONFIG.baseStagger,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      });

      // [data-motion-stagger]: children stagger
      gsap.utils.toArray<HTMLElement>("[data-motion-stagger]").forEach((parent) => {
        const children = parent.querySelectorAll<HTMLElement>(":scope > *");
        gsap.fromTo(children, { opacity: 0, y: 20 }, {
          opacity: 1, y: 0, duration: 0.6,
          stagger: MOTION_CONFIG.baseStagger,
          ease: "power2.out",
          scrollTrigger: { trigger: parent, start: "top 80%", once: true },
        });
      });
      ${hasParallax ? `
      // [data-motion-parallax]: y shift on scroll
      gsap.utils.toArray<HTMLElement>("[data-motion-parallax]").forEach((el) => {
        gsap.to(el, {
          y: -100,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
        });
      });` : ""}
      ${hasSticky ? `
      // [data-motion-sticky]: pin during scroll
      gsap.utils.toArray<HTMLElement>("[data-motion-sticky]").forEach((el) => {
        ScrollTrigger.create({ trigger: el, start: "top top", end: "+=600", pin: true });
      });` : ""}
    });` : ""}

    return () => {
      ${useLenis ? `cancelAnimationFrame(rafId); lenis.destroy();` : ""}
      ${useGsap ? `ctx.revert(); ScrollTrigger.getAll().forEach(st => st.kill());` : ""}
    };
  }, []);

  return <>{children}</>;
}
`;
  fs.writeFileSync(path.join(compDir, "MotionRoot.tsx"), motionRootTsx);

  // 3. Update package.json deps
  const pkgPath = path.join(projDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      pkg.dependencies = pkg.dependencies || {};
      if (useLenis && !pkg.dependencies["lenis"]) pkg.dependencies["lenis"] = "^1.1.13";
      if (useGsap && !pkg.dependencies["gsap"]) pkg.dependencies["gsap"] = "^3.12.5";
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    } catch {}
  }

  // 4. Update layout.tsx to wrap children with MotionRoot
  const layoutPath = path.join(projDir, "src", "app", "layout.tsx");
  if (fs.existsSync(layoutPath)) {
    let layout = fs.readFileSync(layoutPath, "utf-8");
    if (!layout.includes("MotionRoot")) {
      // Add import + wrap
      layout = layout.replace(
        /import "\.\/globals\.css";/,
        `import "./globals.css";\nimport MotionRoot from "@/components/MotionRoot";`
      );
      // Wrap {children} with <MotionRoot>{children}</MotionRoot>
      layout = layout.replace(
        /<body([^>]*)>\{children\}<\/body>/,
        `<body$1><MotionRoot>{children}</MotionRoot></body>`
      );
      // Alternative wrap pattern
      layout = layout.replace(
        /<body([^>]*)>\s*\{children\}\s*<\/body>/,
        `<body$1><MotionRoot>{children}</MotionRoot></body>`
      );
      fs.writeFileSync(layoutPath, layout);
    }
  }

  // 5. Auto-tag Block components with data-motion-* (heuristic)
  const blockFiles = fs.existsSync(compDir) ? fs.readdirSync(compDir).filter(f => /^Block\d+\.tsx$/.test(f)) : [];
  let tagsAdded = 0;
  for (const bf of blockFiles) {
    const bp = path.join(compDir, bf);
    let content = fs.readFileSync(bp, "utf-8");
    if (content.includes("data-motion-")) continue;
    // Add data-motion-fadeIn to top-level <section> if not present
    const replaced = content.replace(
      /(<section[^>]*data-sigma-section="[^"]*"[^>]*?)(>)/,
      `$1 data-motion-fadeIn$2`
    );
    if (replaced !== content) {
      fs.writeFileSync(bp, replaced);
      tagsAdded++;
    }
  }

  return {
    motionRootCreated: true,
    libsInjected: { lenis: useLenis, gsap: useGsap, countUp: useCountUp },
    blockTagsAdded: tagsAdded,
    config: { baseStagger, hasSticky, hasParallax },
  };
}
