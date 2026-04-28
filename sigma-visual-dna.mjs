#!/usr/bin/env node
// sigma-visual-dna.mjs — Paradigm 53 — Visual DNA Extraction
//
// 자현 차세대 진짜 본질. 사이트의 *시각 본질*만 1KB JSON으로 압축.
// 원본 코드 0%, 시각 보존, 자체 React 처음부터 생성 토대.
//
// DNA 구조:
//   palette       (5 hex + role: primary/text/accent/surface/muted)
//   typography    (heading/body fonts + scale display/h1/.../caption)
//   spacing       (rhythm 8/16/24 system)
//   motion        (Lenis/GSAP usage + derived stagger + duration)
//   mood          (medical-care / professional-trust / creative-bold / ecommerce / general)
//   density       (dense/balanced/comfortable)
//   structure     (section count / nav / footer / grid vs flex)
//
// 1KB DNA로 사이트 reconstruct 가능. 자현 client 라이브러리 + SaaS input.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function extractVisualDNA(scan, projDir) {
  const dna = {
    schema: "sigma-visual-dna/1",
    sourceUrl: scan.url || "(unknown)",
    extractedAt: new Date().toISOString(),
  };

  // ─── Palette (5 colors with roles) ─────────────────────────────
  const p = scan.palette || {};
  dna.palette = {
    primary: p.primary || "#111111",
    text: p.text || "#ffffff",
    accent: p.accent || "#4f46e5",
    surface1: p.surface1 || p.primary || "#222222",
    surface2: p.surface2 || "#333333",
    muted: p.muted1 || "#888888",
    contrast: p.contrast || "#ffffff",
  };

  // ─── Typography ─────────────────────────────────────────────────
  const fonts = scan.fonts || [];
  dna.typography = {
    heading: fonts[0]?.[0] || "Inter",
    body: fonts[1]?.[0] || fonts[0]?.[0] || "Inter",
    scale: scan.typeScale || { display: 64, h1: 48, h2: 32, h3: 24, body: 16, caption: 12 },
    fontStack: fonts.slice(0, 3).map(f => f[0]),
  };

  // ─── Spacing rhythm ─────────────────────────────────────────────
  dna.spacing = {
    base: scan.spacingTokens?.baseGap || 8,
    section: scan.spacingTokens?.sectionPadding || 96,
    container: scan.spacingTokens?.containerPadding || 24,
    rhythm: detectSpacingRhythm(scan),
  };

  // ─── Motion character ─────────────────────────────────────────
  const m = scan.motionHints || {};
  const orchestration = scan.animOrchestration || {};
  dna.motion = {
    hasLenis: !!m.hasLenis,
    hasGSAP: !!m.hasGSAP,
    hasSwiper: !!m.hasSwiper,
    hasFramerMotion: !!m.hasFramerMotion,
    hasThree: !!m.hasThreeJS,
    animationCount: (scan.animations || scan.elAnimations || []).length,
    keyframeCount: Object.keys(scan.keyframes || {}).length,
    scrollDriven: scan.scrollDrivenAnimations?.scrollTimelineCount || 0,
    derivedStagger: orchestration.staggerSeqs?.length > 0 ? 0.07 : 0.1,
    character: inferMotionCharacter(scan),
  };

  // ─── Mood inference ─────────────────────────────────────────────
  dna.mood = inferMood(scan);
  dna.density = inferDensity(scan);
  dna.tone = inferTone(scan);

  // ─── Structure ─────────────────────────────────────────────────
  const sections = scan.sections || [];
  const layout = scan.layoutPrimitives || {};
  dna.structure = {
    sectionCount: sections.length,
    sectionRoles: sections.slice(0, 12).map(s => s.role || "block"),
    hasNav: sections[0]?.role === "hero" || /\bnav\b/i.test(sections[0]?.tag || ""),
    hasFooter: sections[sections.length - 1]?.role === "footer",
    layoutPreference: (layout.grid || 0) > (layout.flex || 0) ? "grid" : "flex",
    flexDirection: (layout.flexRows || 0) > (layout.flexCols || 0) ? "row" : "col",
    docHeight: scan.docHeight || 0,
  };

  // ─── Visual signals ────────────────────────────────────────────
  const decoration = scan.decorationHistogram || {};
  dna.visualSignals = {
    hasShadows: (decoration.shadowCount || 0) > 5,
    hasGradients: (scan.gradients?.length || 0) > 0,
    hasGlassmorphism: (decoration.backdropFilterCount || 0) > 0,
    borderRadiusStyle: detectRadiusStyle(scan),
    contrastLevel: scan.contrastAudit?.aaPassRatio > 0.95 ? "high" : "medium",
  };

  // ─── Brand identity (extracted text patterns) ──────────────────
  dna.brand = {
    title: (scan.seo?.title || "").slice(0, 80),
    description: (scan.seo?.description || "").slice(0, 200),
    lang: scan.seo?.lang || "ko",
    domain: scan.url ? new URL(scan.url).hostname.replace(/^www\./, "") : "",
  };

  // ─── Industry classification ───────────────────────────────────
  dna.industry = classifyIndustry(scan);

  // Compress: byte size info
  const json = JSON.stringify(dna);
  const compressed = Buffer.from(json).toString("base64");
  dna._meta = {
    rawBytes: json.length,
    base64Bytes: compressed.length,
    schemaVersion: "1.0",
  };

  fs.writeFileSync(path.join(projDir, "VISUAL-DNA.json"), JSON.stringify(dna, null, 2));

  // Compact 1-line for embedding (< 1KB target)
  const compact = JSON.stringify({
    p: dna.palette,
    t: dna.typography.scale,
    s: dna.spacing.base,
    m: { l: dna.motion.hasLenis, g: dna.motion.hasGSAP, c: dna.motion.character },
    md: dna.mood,
    d: dna.density,
    st: dna.structure.sectionRoles,
    i: dna.industry,
    b: dna.brand.lang,
  });
  fs.writeFileSync(path.join(projDir, "VISUAL-DNA-COMPACT.json"), compact);

  // Markdown report
  const report = [
    "# Visual DNA — Paradigm 53",
    "",
    `Generated: ${dna.extractedAt}`,
    `Source: \`${dna.sourceUrl}\``,
    `Raw size: ${dna._meta.rawBytes} bytes / Compact: ${compact.length} bytes`,
    "",
    "## Palette",
    `- Primary: \`${dna.palette.primary}\` (배경 또는 main)`,
    `- Text: \`${dna.palette.text}\``,
    `- Accent: \`${dna.palette.accent}\``,
    `- Surface: \`${dna.palette.surface1}\` / \`${dna.palette.surface2}\``,
    `- Muted: \`${dna.palette.muted}\``,
    "",
    "## Typography",
    `- Heading: \`${dna.typography.heading}\``,
    `- Body: \`${dna.typography.body}\``,
    `- Scale: display=${dna.typography.scale.display}px / h1=${dna.typography.scale.h1} / body=${dna.typography.scale.body}`,
    "",
    "## Spacing",
    `- Base: ${dna.spacing.base}px`,
    `- Section padding: ${dna.spacing.section}px`,
    `- Rhythm: ${dna.spacing.rhythm}`,
    "",
    "## Motion",
    `- Character: ${dna.motion.character}`,
    `- Animations captured: ${dna.motion.animationCount}`,
    `- Scroll-driven: ${dna.motion.scrollDriven}`,
    `- Stagger: ${dna.motion.derivedStagger}s`,
    `- Libs: Lenis=${dna.motion.hasLenis} / GSAP=${dna.motion.hasGSAP} / Three=${dna.motion.hasThree}`,
    "",
    "## Mood / Density / Tone",
    `- Mood: **${dna.mood}**`,
    `- Density: **${dna.density}**`,
    `- Tone: **${dna.tone}**`,
    `- Industry: **${dna.industry}**`,
    "",
    "## Structure",
    `- Sections: ${dna.structure.sectionCount} (${dna.structure.sectionRoles.join(" · ")})`,
    `- Layout preference: ${dna.structure.layoutPreference}`,
    `- Has nav/footer: ${dna.structure.hasNav}/${dna.structure.hasFooter}`,
    "",
    "## Visual Signals",
    `- Shadows: ${dna.visualSignals.hasShadows} / Gradients: ${dna.visualSignals.hasGradients}`,
    `- Glassmorphism: ${dna.visualSignals.hasGlassmorphism}`,
    `- Border radius style: ${dna.visualSignals.borderRadiusStyle}`,
    `- Contrast: ${dna.visualSignals.contrastLevel}`,
    "",
    "## 자현 비즈니스 활용",
    "",
    "1. **자체 React 처음부터 생성** — 1KB DNA → 컴포넌트 자동",
    "2. **자현 client 라이브러리** — 비슷한 mood + industry 사이트 묶음",
    "3. **SaaS input** — DNA를 client UI에 노출, parameter 변경 → 새 사이트",
    "4. **Pattern matching** — 1000 사이트 DNA 클러스터 → 자체 패턴 라이브러리",
    "5. **A/B variations** — DNA 일부 변형으로 N variations",
    "",
    "이 DNA는 자체 React 코드 생성의 *진짜 input*. 원본 코드 0%, 시각 본질 100%.",
  ];
  fs.writeFileSync(path.join(projDir, "VISUAL-DNA.md"), report.join("\n"));

  return dna;
}

// ─── Helpers ─────────────────────────────────────────────────────

function detectSpacingRhythm(scan) {
  const tokens = scan.spacingTokens || {};
  const base = tokens.baseGap || 8;
  if (base === 4) return "fine-4px";
  if (base === 8) return "standard-8px";
  if (base === 12) return "comfortable-12px";
  if (base >= 16) return "spacious";
  return "custom";
}

function inferMotionCharacter(scan) {
  const m = scan.motionHints || {};
  const animCount = (scan.animations || scan.elAnimations || []).length;
  if (m.hasLenis && m.hasGSAP) return "smooth-cinematic";
  if (animCount > 100) return "rich-motion";
  if (animCount > 30) return "moderate-motion";
  if (animCount > 0) return "subtle-motion";
  return "minimal";
}

function inferMood(scan) {
  const text = (scan.seo?.title || "") + " " + (scan.seo?.description || "");
  const primary = (scan.palette?.primary || "").toLowerCase();
  const lum = colorLum(primary);

  if (/care|hospital|medical|nursing|요양|병원|복지|의료|간호|돌봄/i.test(text)) return "medical-care";
  if (/finance|bank|invest|fund|금융|은행|투자|보험/i.test(text)) return "professional-trust";
  if (/agency|design|creative|studio|디자인|스튜디오|크리에이티브/i.test(text)) return "creative-bold";
  if (/shop|store|product|sale|cart|매장|쇼핑|구매|상품/i.test(text)) return "ecommerce";
  if (/restaurant|cafe|food|menu|레스토랑|카페|음식|메뉴/i.test(text)) return "hospitality-warm";
  if (/portfolio|developer|engineer|개발자|포트폴리오/i.test(text)) return "tech-portfolio";
  if (/news|blog|article|magazine|뉴스|블로그|매거진/i.test(text)) return "editorial";

  if (lum < 0.25) return "dark-luxury";
  if (lum > 0.9) return "bright-minimal";
  return "general";
}

function inferDensity(scan) {
  const elementCount = scan.domStats?.elementCount || 0;
  const sectionCount = (scan.sections || []).length || 1;
  const ratio = elementCount / sectionCount;
  if (ratio > 200) return "dense";
  if (ratio > 100) return "balanced";
  if (ratio > 50) return "comfortable";
  return "spacious";
}

function inferTone(scan) {
  const text = (scan.seo?.title || "") + (scan.seo?.description || "");
  if (/저희|고객님|드립니다|있습니다/i.test(text)) return "formal-korean";
  if (/우리|좋은|안녕|반가워/i.test(text)) return "casual-korean";
  if (/we are|our team|trusted/i.test(text)) return "formal-english";
  if (/hi |hey |welcome|let's/i.test(text)) return "casual-english";
  return "neutral";
}

function detectRadiusStyle(scan) {
  const borders = scan.borders || [];
  if (borders.length === 0) return "default";
  const radii = borders.map(b => parseFloat(b.radius || "0"));
  const avg = radii.reduce((a, b) => a + b, 0) / radii.length;
  if (avg > 24) return "very-rounded";
  if (avg > 12) return "rounded";
  if (avg > 4) return "subtle-rounded";
  if (avg === 0) return "sharp";
  return "minimal-rounded";
}

function classifyIndustry(scan) {
  const text = (scan.seo?.title || "") + " " + (scan.seo?.description || "");
  if (/의료|병원|nursing|요양|복지|건강|hospital|medical/i.test(text)) return "healthcare";
  if (/금융|은행|finance|bank|investment|보험/i.test(text)) return "finance";
  if (/agency|design|brand|마케팅|광고|advertising/i.test(text)) return "creative-services";
  if (/shop|store|커머스|쇼핑몰|product|cart/i.test(text)) return "ecommerce";
  if (/restaurant|food|cafe|레스토랑|카페|음식점/i.test(text)) return "food-beverage";
  if (/blog|news|magazine|article|뉴스|블로그/i.test(text)) return "media";
  if (/saas|software|app|tech|technology|개발|소프트웨어/i.test(text)) return "tech-saas";
  if (/education|school|university|edu|교육|학원|학교/i.test(text)) return "education";
  if (/real estate|property|부동산|아파트|건축/i.test(text)) return "real-estate";
  if (/portfolio|developer|engineer|designer|개발자|디자이너|포트폴리오/i.test(text)) return "personal-portfolio";
  return "general";
}

function colorLum(hex) {
  const m = hex.match(/^#?([a-f0-9]{6})/i);
  if (!m) return 0.5;
  const v = parseInt(m[1], 16);
  return (((v >> 16) & 0xff) * 0.299 + ((v >> 8) & 0xff) * 0.587 + (v & 0xff) * 0.114) / 255;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-visual-dna.mjs <projectDir>");
    process.exit(1);
  }
  const scanPath = path.join(projDir, ".sigma", "scan.json");
  if (!fs.existsSync(scanPath)) {
    console.error("missing .sigma/scan.json — run nava-sigma.mjs first");
    process.exit(1);
  }
  const scan = JSON.parse(fs.readFileSync(scanPath, "utf-8"));
  const dna = extractVisualDNA(scan, projDir);
  console.log(`[visual-dna] ${dna.industry} / ${dna.mood} / ${dna.density} / ${dna._meta.rawBytes} bytes`);
  console.log(`  palette: ${Object.keys(dna.palette).length} / typography: ${dna.typography.heading}`);
  console.log(`  motion: ${dna.motion.character} (${dna.motion.animationCount} anims)`);
  console.log(`  → VISUAL-DNA.json + VISUAL-DNA-COMPACT.json + VISUAL-DNA.md`);
}
