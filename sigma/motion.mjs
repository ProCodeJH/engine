// Σ.3 MOTION & PLATFORM DATA
// Captures scroll trajectory (elements × scroll positions), animations
// registered via Element.animate, canvas text, WebGL shader metadata,
// Three.js scene adds, motion-library signals (GSAP/Lenis/Swiper/Splide),
// Framer appear-id / Webflow IX2 / Wix image metadata, Lottie/Rive schema
// matching on captured network JSON.

import fs from "node:fs";
import path from "node:path";

const ctx = globalThis.__sigma;
const { page, extracted, projDir, dataDir, url } = ctx;

const t0 = Date.now();
console.log(`[Σ.3] MOTION 0.0s`);

// ─── Scroll trajectory — 200 elements × 6 scroll positions ────────────
// For each scroll position, record each tracked element's rect. This lets
// us infer scroll-driven transforms (parallax, pinned sticky, progressive
// scale/opacity) that pure static scan misses.
try {
  const trajectory = await page.evaluate(async () => {
    const docH = document.body.scrollHeight;
    const samplePoints = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    const targets = [...document.querySelectorAll("section, header, footer, main > *, [class*='section'], [class*='hero'], [class*='card'], [class*='container']")]
      .filter(el => el.getBoundingClientRect().height >= 40)
      .slice(0, 200);
    const out = targets.map((el, i) => ({
      idx: i,
      tag: el.tagName.toLowerCase(),
      cls: (el.className || "").toString().slice(0, 60),
      frames: [],
    }));
    for (const p of samplePoints) {
      const scrollY = (docH - window.innerHeight) * p;
      window.scrollTo(0, scrollY);
      await new Promise(r => setTimeout(r, 200));
      for (let i = 0; i < targets.length; i++) {
        const r = targets[i].getBoundingClientRect();
        const cs = getComputedStyle(targets[i]);
        out[i].frames.push({
          scrollY: Math.round(scrollY),
          top: Math.round(r.top),
          y: Math.round(r.top + scrollY),
          opacity: parseFloat(cs.opacity) || 1,
          transform: cs.transform === "none" ? null : cs.transform,
        });
      }
    }
    window.scrollTo(0, 0);
    return out;
  });
  extracted.scrollTrajectory = trajectory;
  console.log(`  scroll trajectory: ${trajectory.length} elements × 6 positions`);

  // Derive scroll signals: how many elements change transform/opacity
  // across scroll positions. High count = scroll-driven animation heavy.
  let transformedNonAnimated = 0;
  let stickyElements = 0;
  for (const el of trajectory) {
    const tforms = new Set(el.frames.map(f => f.transform));
    const opacities = new Set(el.frames.map(f => Math.round(f.opacity * 10)));
    if (tforms.size > 1) transformedNonAnimated++;
    // sticky detection: same `top` across multiple scroll positions
    const tops = el.frames.map(f => f.top);
    const uniqueTops = new Set(tops);
    if (uniqueTops.size === 1 && tops[0] >= 0 && tops[0] < 200) stickyElements++;
  }
  extracted.scrollSignals = { transformedNonAnimated, stickyElements };
  console.log(`  scroll signals: ${stickyElements} sticky, ${transformedNonAnimated} transformed`);
} catch (e) { console.log(`  scroll trajectory: ${e.message.slice(0, 60)}`); }

// ─── Captured data from monkey-patches ───────────────────────────────
// These pull arrays that were populated during page execution by the
// evaluateOnNewDocument patches in nava-sigma.mjs.
try {
  const captured = await page.evaluate(() => ({
    canvasText: (window.__CAPTURED_CANVAS_TEXT__ || []).slice(0, 300),
    shaders: (window.__CAPTURED_SHADERS__ || []),
    animations: (window.__CAPTURED_ANIMATIONS__ || []),
    customElements: [...(window.__navaCustomElementsDefined || [])],
    closedShadowCount: window.__navaClosedShadowCount || 0,
    trustedTypesPolicies: [...(window.__navaTrustedTypesPolicies || [])],
    apiCaptures: (window.__API_CAPTURES__ || []).slice(0, 30),
    threeSceneAdds: window.__THREE_SCENE_ADDS__ || [],
  }));
  extracted.canvasText = captured.canvasText;
  extracted.webglShaders = captured.shaders;
  extracted.animations = captured.animations;
  extracted.customElements = captured.customElements;
  extracted.closedShadowCount = captured.closedShadowCount;
  extracted.trustedTypesPolicies = captured.trustedTypesPolicies;
  extracted.apiCaptures = captured.apiCaptures;
  extracted.threeScene = captured.threeSceneAdds;

  const vert = captured.shaders.filter(s => s.type === "vertex").length;
  const frag = captured.shaders.filter(s => s.type === "fragment").length;
  console.log(`  canvas text: ${captured.canvasText.length} calls captured`);
  console.log(`  webgl shaders: ${captured.shaders.length} captured (${vert} vertex / ${frag} fragment)`);
  console.log(`  animations: ${captured.animations.length} Element.animate calls`);
  console.log(`  custom elements: ${captured.customElements.length} registered`);
  console.log(`  trusted types policies: ${captured.trustedTypesPolicies.length}`);
} catch (e) { console.log(`  captured: ${e.message.slice(0, 60)}`); }

// ─── Lottie detection via JSON schema matching ────────────────────────
// Lottie animations have signature fields: v (version), fr (framerate),
// ip (in-point), op (out-point), layers (array). Scan all API captures
// for this shape.
const lottieAnimations = [];
for (const cap of (extracted.apiCaptures || [])) {
  try {
    const parsed = JSON.parse(cap.body);
    if (parsed && typeof parsed === "object"
        && parsed.v !== undefined
        && parsed.fr !== undefined
        && Array.isArray(parsed.layers)) {
      lottieAnimations.push({
        url: cap.url,
        pathname: cap.pathname,
        version: parsed.v,
        frameRate: parsed.fr,
        width: parsed.w || 400,
        height: parsed.h || 400,
        duration: (parsed.op - parsed.ip) / parsed.fr,
        layerCount: parsed.layers.length,
      });
    }
  } catch {}
}
extracted.lottieAnimations = lottieAnimations;
console.log(`  lottie animations: ${lottieAnimations.length} detected (${(extracted.apiCaptures || []).length} total network JSON)`);

// ─── Rive file detection via URL extension ────────────────────────────
const riveFiles = (extracted.apiCaptures || [])
  .filter(c => /\.riv(\?|#|$)/i.test(c.url || ""))
  .map(c => ({ url: c.url, pathname: c.pathname }));
extracted.riveFiles = riveFiles;
console.log(`  rive animations: ${riveFiles.length} detected`);

// ─── Canvas frame sequence — capture up to 25 toDataURL frames of the
// largest canvas. Useful for replaying data-vis / pixel-art typography.
try {
  const canvasCapture = await page.evaluate(async () => {
    const canvases = [...document.querySelectorAll("canvas")]
      .filter(c => {
        const r = c.getBoundingClientRect();
        return r.width >= 200 && r.height >= 200;
      })
      .map(c => ({ el: c, r: c.getBoundingClientRect() }))
      .sort((a, b) => (b.r.width * b.r.height) - (a.r.width * a.r.height))
      .slice(0, 3);
    const captures = [];
    for (const { el, r } of canvases) {
      const frames = [];
      for (let i = 0; i < 8; i++) {
        try {
          const url = el.toDataURL("image/jpeg", 0.65);
          frames.push({ i, dataUrl: url.length < 200000 ? url : null, size: url.length });
        } catch { frames.push({ i, dataUrl: null, size: 0, tainted: true }); }
        await new Promise(r => setTimeout(r, 80));
      }
      captures.push({
        w: Math.round(r.width), h: Math.round(r.height),
        x: Math.round(r.left), y: Math.round(r.top + window.scrollY),
        frames,
      });
    }
    return captures;
  });
  extracted.canvases = canvasCapture;
  console.log(`  canvases: ${canvasCapture.length} large canvases sampled`);
} catch (e) { console.log(`  canvas capture: ${e.message.slice(0, 60)}`); }

// ─── Motion library signals ──────────────────────────────────────────
try {
  const hints = await page.evaluate(() => ({
    customCursorUsed: getComputedStyle(document.documentElement).cursor === "none" ||
                      getComputedStyle(document.body).cursor === "none",
    hasGSAP: !!(window.gsap || window.ScrollTrigger) ||
             [...document.scripts].some(s => /gsap|scrolltrigger/i.test(s.src || "")),
    hasBarba: [...document.scripts].some(s => /barba/i.test(s.src || "")),
    hasLenis: !!window.Lenis ||
              [...document.scripts].some(s => /lenis/i.test(s.src || "")),
    hasSwiper: !!window.Swiper ||
               [...document.scripts].some(s => /swiper/i.test(s.src || "")),
    hasSplide: !!window.Splide ||
               [...document.scripts].some(s => /splide/i.test(s.src || "")),
    hasThreeJS: !!window.THREE,
    hasFramerMotion: [...document.scripts].some(s => /framer-motion|motion/i.test(s.src || "")) ||
                     !!document.querySelector("[data-framer-motion]"),
    bodyOverflow: getComputedStyle(document.body).overflow,
    pinnedElements: [...document.querySelectorAll('[style*="position: sticky"], [style*="position:sticky"], [class*="pin"], [class*="sticky"]')].length,
    numericHeadings: [...document.querySelectorAll("h1, h2, h3, span, div")]
      .filter(h => /^\d+[\d,.]*\+?$/.test((h.textContent || "").trim()))
      .slice(0, 10)
      .map(h => (h.textContent || "").trim()),
  }));
  extracted.motionHints = hints;
  console.log(`  motion hints: cursor=${hints.customCursorUsed} gsap=${hints.hasGSAP} lenis=${hints.hasLenis} swiper=${hints.hasSwiper} count-ups=${hints.numericHeadings.length}`);
} catch (e) { console.log(`  motion hints: ${e.message.slice(0, 60)}`); }

// ─── Platform-specific metadata ──────────────────────────────────────
// Framer: data-framer-appear-id maps each scroll-reveal animation.
// Webflow: inline JSON for IX2 timeline.
// Wix: wow-image / wix-image elements with custom data attrs.
try {
  const platformData = await page.evaluate(() => {
    const framerAppears = [...document.querySelectorAll("[data-framer-appear-id]")]
      .slice(0, 100)
      .map(el => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          id: el.getAttribute("data-framer-appear-id"),
          tag: el.tagName.toLowerCase(),
          opacity: parseFloat(cs.opacity) || 1,
          transform: cs.transform === "none" ? null : cs.transform,
          transition: cs.transition === "none 0s ease 0s" ? null : cs.transition,
          absY: Math.round(r.top + window.scrollY),
          absX: Math.round(r.left),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      });

    // Webflow IX2 — inline JSON script with animation timeline
    const ix2Script = document.querySelector('script[type="application/json"][data-ix2]') ||
                      document.getElementById("ix2-data");
    let ix2Data = null;
    if (ix2Script) {
      try { ix2Data = JSON.parse(ix2Script.textContent || ""); } catch {}
    }
    const webflowIX2 = ix2Data ? {
      actionListCount: ix2Data.actionLists ? Object.keys(ix2Data.actionLists).length : 0,
      eventCount: ix2Data.events ? Object.keys(ix2Data.events).length : 0,
      rawSize: JSON.stringify(ix2Data).length,
    } : null;

    const wixImages = [...document.querySelectorAll("wow-image, wix-image")]
      .slice(0, 30)
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          src: el.getAttribute("data-image-info") || el.querySelector("img")?.src || null,
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      });

    return { framerAppears, webflowIX2, wixImages };
  });
  extracted.platformData = platformData;
  console.log(`  platform data: framer-appears=${platformData.framerAppears.length} webflow-ix2=${platformData.webflowIX2 ? "yes" : "no"} wix-images=${platformData.wixImages.length}`);
} catch (e) { console.log(`  platform data: ${e.message.slice(0, 60)}`); }

// ─── Interaction DNA — :hover / :focus / :active CSS rules ───────────
// Count how many style rules target interaction pseudo-classes. This
// tells us whether hover/focus interactions are CSS-driven (easy to
// replicate) or JS-driven (needs separate capture).
try {
  const interactionDNA = await page.evaluate(() => {
    let hoverRules = 0, focusRules = 0, activeRules = 0;
    for (const sh of document.styleSheets) {
      try {
        for (const rule of sh.cssRules || []) {
          const sel = rule.selectorText || "";
          if (!sel) continue;
          if (/:hover\b/.test(sel)) hoverRules++;
          if (/:focus\b/.test(sel)) focusRules++;
          if (/:active\b/.test(sel)) activeRules++;
        }
      } catch {}
    }
    return { hoverRules, focusRules, activeRules };
  });
  extracted.interactionDNA = interactionDNA;
  console.log(`  interaction DNA: ${interactionDNA.hoverRules} hover / ${interactionDNA.focusRules} focus / ${interactionDNA.activeRules} active rules`);
} catch (e) { console.log(`  interaction DNA: ${e.message.slice(0, 60)}`); }

// ─── Multi-page route scan ───────────────────────────────────────────
// Visit top internal routes, extract their content, screenshot each.
extracted.pages = {};
const internalHrefs = (extracted.seo?.internalLinks || [])
  .map(h => h.replace(/^\.\//, "/").replace(/^\/+/, "/").split(/[?#]/)[0])
  .filter(h => h && h !== "/" && h.length < 100 && !/\.(png|jpg|jpeg|gif|svg|pdf|ico|css|js|woff2?)$/i.test(h));
const routeSet = [...new Set(internalHrefs)].slice(0, 3);
if (routeSet.length > 0) {
  console.log(`  multi-page scan: ${routeSet.length} routes`);
  for (const route of routeSet) {
    try {
      const fullUrl = new URL(route, url).toString();
      await page.goto(fullUrl, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 1200));
      await page.evaluate(async () => {
        const h = document.body.scrollHeight;
        for (let y = 0; y < h; y += 800) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); }
        window.scrollTo(0, 0);
      });
      const routeData = await page.evaluate(() => ({
        title: document.title || "",
        description: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
        h1: (document.querySelector("h1")?.textContent || "").trim().slice(0, 200),
        headings: [...document.querySelectorAll("h1, h2, h3")]
          .map(h => (h.textContent || "").trim())
          .filter(t => t.length >= 2 && t.length < 200)
          .slice(0, 12),
        paragraphs: [...document.querySelectorAll("p")]
          .map(p => (p.textContent || "").trim())
          .filter(t => t.length >= 10 && t.length < 400)
          .slice(0, 10),
        images: [...document.querySelectorAll("img")].slice(0, 10).map(img => {
          const r = img.getBoundingClientRect();
          return { src: img.currentSrc || img.src, alt: img.alt || "", w: Math.round(r.width), h: Math.round(r.height) };
        }).filter(i => i.src && i.w >= 50),
        docHeight: document.body.scrollHeight,
      }));
      extracted.pages[route] = routeData;
      console.log(`    ${route}: "${routeData.h1.slice(0, 40)}..." (${routeData.headings.length} h, ${routeData.paragraphs.length} p, ${routeData.images.length} img)`);
    } catch (e) {
      console.log(`    ${route}: scan failed (${e.message.slice(0, 60)})`);
    }
  }
  // Return to root so downstream modules see the root page.
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise(r => setTimeout(r, 600));
  } catch {}
}

// ─── Attach motions to nearest section ───────────────────────────────
// For each detected section, find motions (animations) whose y-coordinate
// falls within the section's y-range. Emit later uses section.motions[]
// to inject framer-motion variants per-section.
for (const s of (extracted.sections || [])) {
  s.motions = [];
  for (const m of (extracted.animations || [])) {
    if (m.y >= s.top && m.y < s.top + s.h) s.motions.push(m);
  }
  if (extracted.platformData?.framerAppears) {
    s.framerAppears = extracted.platformData.framerAppears.filter(f => f.absY >= s.top && f.absY < s.top + s.h);
  } else {
    s.framerAppears = [];
  }
  s.hasStickyNearby = (extracted.scrollSignals?.stickyElements || 0) > 0;
  s.hasScrollTransforms = (extracted.scrollSignals?.transformedNonAnimated || 0) >= 10;
}

fs.writeFileSync(path.join(dataDir, "scan.json"), JSON.stringify(extracted, null, 2));
extracted.timing.motion = Date.now() - t0;
