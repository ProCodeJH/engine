#!/usr/bin/env node
// sigma-a11y-enrich.mjs — Paradigm 138 — Smart A11y Enrichment v2
//
// 자현 비전 production-ready 90%+ 도달 fix. a11y 40% 정체 root cause:
//   - omega-enhance "본문 바로가기" 추가했는데 verify regex가 영문만 인정
//   - <header>, <nav>, <main>, <footer>에 aria-label 자동 미추가
//   - landmark roles 부족
//
// P138 추가:
//   1. 영문+한글 skip-link 동시 (둘 다 매칭 보장)
//   2. <header> aria-label="사이트 헤더"
//   3. <nav> aria-label="주 내비게이션" (multiple nav 시 색인)
//   4. <main> aria-label="본문" + role="main"
//   5. <footer> aria-label="사이트 푸터"
//   6. 빈 <a> 태그 → aria-label from filename
//   7. 외부 링크 → aria-label="외부 사이트 (새 창)"
//
// 출력: public/index.html 모든 route 수정

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function enrichA11y(html) {
  const result = {
    skipLinkAdded: false,
    headerLabeled: false,
    navLabeled: 0,
    mainLabeled: false,
    footerLabeled: false,
    asideLabeled: 0,
    altFilled: 0,
  };

  // ─── 1. Bilingual skip-link (영문+한글) ────────────────────────
  if (!html.includes("Skip to content")) {
    const skipLink = `<a href="#main" class="sigma-skip-link" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;text-decoration:none;" onfocus="this.style.cssText='position:fixed;top:0;left:0;width:auto;height:auto;padding:8px 16px;background:white;color:black;z-index:99999;border:2px solid #4f46e5;text-decoration:none;'" onblur="this.style.cssText='position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;text-decoration:none;'">Skip to content / 본문 바로가기</a>`;
    html = html.replace(/<body([^>]*)>/i, `<body$1>\n${skipLink}`);
    result.skipLinkAdded = true;
  }

  // ─── 2. <header> aria-label ────────────────────────────────────
  if (!/<header[^>]*aria-label=/i.test(html) && /<header/i.test(html)) {
    html = html.replace(/<header(\s[^>]*)?>/i, (m, attrs = "") => {
      const cleanAttrs = attrs ? ` ${attrs.trim()}` : "";
      return `<header role="banner" aria-label="사이트 헤더"${cleanAttrs}>`;
    });
    result.headerLabeled = true;
  }

  // ─── 3. <nav> aria-label (color-coded for multiple) ────────────
  let navIdx = 0;
  html = html.replace(/<nav(\s[^>]*)?>/gi, (m, attrs = "") => {
    if (attrs && /aria-label=/.test(attrs)) return m;
    navIdx++;
    const label = navIdx === 1 ? "주 내비게이션" : `보조 내비게이션 ${navIdx}`;
    const cleanAttrs = attrs ? ` ${attrs.trim()}` : "";
    result.navLabeled++;
    return `<nav role="navigation" aria-label="${label}"${cleanAttrs}>`;
  });

  // ─── 4. <main> aria-label + role="main" + id="main" ────────────
  if (!/<main[^>]*aria-label=/i.test(html) && /<main/i.test(html)) {
    html = html.replace(/<main(\s[^>]*)?>/i, (m, attrs = "") => {
      const cleanAttrs = attrs ? ` ${attrs.trim()}` : "";
      const hasId = attrs && /\bid=/.test(attrs);
      const idAttr = hasId ? "" : ' id="main"';
      return `<main role="main" aria-label="본문 영역"${idAttr}${cleanAttrs}>`;
    });
    result.mainLabeled = true;
  }

  // ─── 5. <footer> aria-label ────────────────────────────────────
  if (!/<footer[^>]*aria-label=/i.test(html) && /<footer/i.test(html)) {
    html = html.replace(/<footer(\s[^>]*)?>/i, (m, attrs = "") => {
      const cleanAttrs = attrs ? ` ${attrs.trim()}` : "";
      return `<footer role="contentinfo" aria-label="사이트 푸터"${cleanAttrs}>`;
    });
    result.footerLabeled = true;
  }

  // ─── 6. <aside> aria-label ────────────────────────────────────
  let asideIdx = 0;
  html = html.replace(/<aside(\s[^>]*)?>/gi, (m, attrs = "") => {
    if (attrs && /aria-label=/.test(attrs)) return m;
    asideIdx++;
    const cleanAttrs = attrs ? ` ${attrs.trim()}` : "";
    result.asideLabeled++;
    return `<aside role="complementary" aria-label="보조 영역 ${asideIdx}"${cleanAttrs}>`;
  });

  // ─── 7. Empty <a> with href but no text → aria-label from href ──
  // Only matches <a href="..."></a> empty patterns
  html = html.replace(/<a([^>]*?)href=["']([^"']+)["']([^>]*)>(\s*)<\/a>/gi, (m, pre, href, post, ws) => {
    if (m.includes('aria-label=')) return m;
    // Try to derive label from href
    let label = href;
    if (href.startsWith("mailto:")) label = `이메일: ${href.replace("mailto:", "")}`;
    else if (href.startsWith("tel:")) label = `전화: ${href.replace("tel:", "")}`;
    else if (href.includes("youtube.com") || href.includes("youtu.be")) label = "YouTube 동영상";
    else if (href.includes("instagram.com")) label = "Instagram";
    else if (href.includes("facebook.com")) label = "Facebook";
    else if (href.includes("blog.naver.com")) label = "네이버 블로그";
    else if (href.startsWith("http")) label = "외부 링크 (새 창에서 열림)";
    else if (href.startsWith("#")) label = `섹션: ${href.replace("#", "")}`;
    else label = `페이지: ${href}`;
    return `<a${pre}href="${href}"${post} aria-label="${label}">${ws}</a>`;
  });

  // ─── 8. <img> with alt="" but visible context → infer from filename ─
  // 빈 alt 이미지에 filename-based 추정 alt (선택적)
  // 너무 invasive하지 않게: alt="" 그대로 두되 role="presentation" 보장
  html = html.replace(/<img([^>]*?)alt=""([^>]*)>/gi, (m, pre, post) => {
    if (m.includes('role=')) return m;
    return `<img${pre}alt=""${post} role="presentation">`;
  });

  return { html, result };
}

// ─── Apply to all index.html in mirror ─────────────────────────────
export function enrichMirrorA11y(projDir) {
  const summary = {
    files: [],
    totalSize: 0,
    skipLinks: 0, headers: 0, navs: 0, mains: 0, footers: 0, asides: 0,
  };
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
        const { html: enriched, result } = enrichA11y(html);
        if (enriched !== original) {
          fs.writeFileSync(full, enriched);
          summary.files.push(path.relative(projDir, full));
          summary.totalSize += enriched.length - original.length;
          if (result.skipLinkAdded) summary.skipLinks++;
          if (result.headerLabeled) summary.headers++;
          summary.navs += result.navLabeled;
          if (result.mainLabeled) summary.mains++;
          if (result.footerLabeled) summary.footers++;
          summary.asides += result.asideLabeled;
        }
      }
    }
  }
  walk(path.join(projDir, "public"));
  return summary;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-a11y-enrich.mjs <projectDir>");
    process.exit(1);
  }
  const r = enrichMirrorA11y(projDir);
  console.log(`[a11y-enrich] ${r.files.length} HTML files (+${(r.totalSize / 1024).toFixed(1)}KB)`);
  console.log(`  Skip-links:  ${r.skipLinks}`);
  console.log(`  <header>:    ${r.headers}`);
  console.log(`  <nav>:       ${r.navs}`);
  console.log(`  <main>:      ${r.mains}`);
  console.log(`  <footer>:    ${r.footers}`);
  console.log(`  <aside>:     ${r.asides}`);
  console.log(`  WCAG 2.1 landmark roles + bilingual skip-link 적용 완료`);
}
