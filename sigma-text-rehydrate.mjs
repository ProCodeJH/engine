#!/usr/bin/env node
// sigma-text-rehydrate.mjs — 진짜 text 추출 + emit swap 후처리
//
// 자현 비즈니스 ("복제화해서 편집해서 팔려고") 위해: dev mode emit이
// 이미지/폰트는 잡지만 base Nav links + section 본문 텍스트는 hardcoded
// 또는 빈 div. 이 도구가 원본 URL 재방문해서 진짜 텍스트 추출 후 emit
// 디렉토리의 .tsx 파일들에 자동 swap.
//
// 추출:
//   - Nav links (header/nav 안의 <a> 텍스트)
//   - Hero h1 + intro paragraph
//   - 각 section h2/h3 + paragraphs
//   - Footer copyright + 회사정보
//
// Swap 대상:
//   - Nav.tsx의 "Work/About/Contact" 자리 → 진짜 nav links
//   - Block{N}.tsx의 빈 div 자리에 hero text inject
//
// Note: 이건 dev mode 후처리 — 클린룸 위반. 자현이 클라이언트 자산으로
// swap 후 strict-clean 모드로 재emit해야 production 가능.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function rehydrateText(projDir, sourceUrl, opts = {}) {
  const puppeteer = (await import("puppeteer")).default;

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  await page.goto(sourceUrl, { waitUntil: "networkidle2", timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  // Scroll to load lazy content
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); }
    window.scrollTo(0, 0);
  });

  // Extract text content
  const real = await page.evaluate(() => {
    // Nav links
    const navLinks = [...document.querySelectorAll("header a, nav a, [class*='nav'] a, [class*='menu'] a, [class*='gnb'] a")]
      .filter(a => {
        const r = a.getBoundingClientRect();
        const t = (a.textContent || "").trim();
        return r.width > 0 && r.height > 0 && t.length >= 1 && t.length < 30 && r.top < 200;
      })
      .map(a => ({
        text: (a.textContent || "").trim(),
        href: a.getAttribute("href") || "/",
      }))
      .slice(0, 12);

    // Dedupe by text
    const seen = new Set();
    const navLinksUnique = navLinks.filter(l => !seen.has(l.text) && seen.add(l.text));

    // Hero h1 + intro
    const h1 = (document.querySelector("h1")?.textContent || "").trim();
    const heroParagraphs = [...document.querySelectorAll("section:first-of-type p, header p, [class*='hero'] p, [class*='main-visual'] p, [class*='visual'] p")]
      .map(p => (p.textContent || "").trim())
      .filter(t => t.length >= 5 && t.length < 300)
      .slice(0, 4);

    // All major headings (h1/h2/h3) + their nearest paragraph
    const headings = [...document.querySelectorAll("h1, h2, h3")]
      .map(h => ({
        level: parseInt(h.tagName.slice(1), 10),
        text: (h.textContent || "").trim(),
        y: Math.round(h.getBoundingClientRect().top + window.scrollY),
      }))
      .filter(h => h.text.length >= 2 && h.text.length < 200);

    // Section paragraphs + Y position (for matching to emitted Block{N})
    const paragraphs = [...document.querySelectorAll("p")]
      .map(p => ({
        text: (p.textContent || "").trim(),
        y: Math.round(p.getBoundingClientRect().top + window.scrollY),
      }))
      .filter(p => p.text.length >= 10 && p.text.length < 600);

    // Brand / logo text
    const brand = (document.querySelector("header [class*='logo'], header [class*='brand'], [class*='gnb'] [class*='logo']")?.textContent || "").trim() ||
                  (document.title || "").split(/[-|–:]/)[0].trim();

    // Footer copyright
    const footerText = [...document.querySelectorAll("footer p, footer [class*='copyright'], [class*='footer'] p, [class*='footer'] address")]
      .map(el => (el.textContent || "").trim())
      .filter(t => t.length > 5 && t.length < 300)
      .slice(0, 8);

    // Body background-color (for palette correction)
    const cs = getComputedStyle(document.body);
    const bgColor = cs.backgroundColor;
    const textColor = cs.color;

    return {
      brand,
      navLinks: navLinksUnique,
      h1,
      heroParagraphs,
      headings,
      paragraphs,
      footerText,
      bodyBg: bgColor,
      bodyText: textColor,
      docHeight: document.body.scrollHeight,
    };
  });

  await browser.close();

  // Swap into emit
  const result = { textExtracted: real, swaps: 0, files: [] };

  // 1. Swap Nav.tsx nav links
  const navPath = path.join(projDir, "src", "components", "Nav.tsx");
  if (fs.existsSync(navPath) && real.navLinks.length > 0) {
    let nav = fs.readFileSync(navPath, "utf-8");
    // Replace generic Work/About/Contact line block with real nav
    const newLinksBlock = real.navLinks.slice(0, 8).map(l => {
      const safeText = l.text.replace(/"/g, '&quot;').slice(0, 40);
      const safeHref = l.href.startsWith("/") || l.href.startsWith("#") ? l.href : "/";
      return `          <a href="${safeHref}" className="hover:opacity-70 transition-opacity">${safeText}</a>`;
    }).join("\n");

    // Find generic block: <a href="/" style={{ color: "#61b05a" }}>Work</a>...Contact
    const replaced = nav.replace(
      /<div className="flex gap-6 text-sm">[\s\S]*?<\/div>/,
      `<div className="flex gap-6 text-sm">\n${newLinksBlock}\n        </div>`
    );
    if (replaced !== nav) {
      fs.writeFileSync(navPath, replaced);
      result.swaps++;
      result.files.push("src/components/Nav.tsx");
    }
  }

  // 2. Inject content into ALL Block{N}.tsx files (not just hero)
  // Y-coordinate matching: assign paragraphs/headings to nearest section
  const compDir = path.join(projDir, "src", "components");
  if (fs.existsSync(compDir)) {
    const blockFiles = fs.readdirSync(compDir).filter(f => /^Block\d+\.tsx$/.test(f)).sort();

    // Read .sigma/scan.json for section Y-positions (if available)
    const scanPath = path.join(projDir, ".sigma", "scan.json");
    let sections = [];
    try {
      const scan = JSON.parse(fs.readFileSync(scanPath, "utf-8"));
      sections = scan.sections || [];
    } catch {}

    for (let i = 0; i < blockFiles.length; i++) {
      const blockFile = path.join(compDir, blockFiles[i]);
      let block = fs.readFileSync(blockFile, "utf-8");
      if (block.includes("rehydrated-content")) continue; // 중복 방지

      const section = sections[i] || {};
      const sectionTop = section.top || 0;
      const sectionH = section.h || 600;

      // Find content closest to this section's Y range
      const heading = real.headings.find(h => h.y >= sectionTop && h.y < sectionTop + sectionH) ||
                     (i === 0 && real.h1 ? { text: real.h1, level: 1 } : null);
      const sectionParagraphs = real.paragraphs
        .filter(p => p.y >= sectionTop && p.y < sectionTop + sectionH)
        .slice(0, 3);

      if (!heading && sectionParagraphs.length === 0 && i > 0) continue;

      const safeHeading = (heading?.text || (i === 0 ? real.brand : `섹션 ${i}`)).replace(/"/g, '\\"').slice(0, 100);
      const headingLevel = heading?.level || (i === 0 ? 1 : 2);
      const isHero = i === 0;

      const paragraphsJsx = sectionParagraphs.map(p =>
        `<p className="opacity-90 mb-3" style={{ fontSize: "16px", lineHeight: "1.7", color: "${isHero ? "#fff" : "#222"}", ${isHero ? 'textShadow: "0 1px 4px rgba(0,0,0,0.4)"' : ""} }}>{"${p.text.replace(/"/g, '\\"').slice(0, 400)}"}</p>`
      ).join("\n          ");

      const headingTag = `h${headingLevel}`;
      const headingStyle = isHero
        ? `fontSize: "48px", lineHeight: "1.2", color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.5)"`
        : `fontSize: "${headingLevel === 2 ? "32px" : "24px"}", lineHeight: "1.3", color: "#222"`;

      const injection = `
        <div data-rehydrated-content className="text-center px-6 max-w-4xl mx-auto" style={{ position: "relative", zIndex: 10 }}>
          <${headingTag} className="font-heading mb-6" style={{ ${headingStyle} }}>{"${safeHeading}"}</${headingTag}>
          ${paragraphsJsx}
        </div>`;

      if (block.includes('className="w-full mx-auto relative z-10"')) {
        block = block.replace(
          /(className="w-full mx-auto relative z-10"\s*>)/,
          `$1\n${injection}\n`
        );
      } else {
        // Fallback: insert inside the outermost <section ...>
        block = block.replace(
          /(<section[^>]+>)/,
          `$1\n      ${injection}\n`
        );
      }
      fs.writeFileSync(blockFile, block);
      result.swaps++;
      result.files.push(`src/components/${blockFiles[i]}`);
    }
  }

  // 3. Auto-correct palette from real bodyBg/bodyText
  // 두손누리 같은 흰 배경 사이트가 다크 추출되는 버그 자동 정정
  const globalsCss = path.join(projDir, "src", "app", "globals.css");
  if (fs.existsSync(globalsCss) && real.bodyBg && real.bodyText) {
    let css = fs.readFileSync(globalsCss, "utf-8");
    const before = css;

    // Parse rgb()
    const bgMatch = real.bodyBg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    const txtMatch = real.bodyText.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (bgMatch && txtMatch) {
      const bgHex = "#" + [bgMatch[1], bgMatch[2], bgMatch[3]].map(n => Number(n).toString(16).padStart(2, "0")).join("");
      const txtHex = "#" + [txtMatch[1], txtMatch[2], txtMatch[3]].map(n => Number(n).toString(16).padStart(2, "0")).join("");

      // Real var names: --brand-primary / --brand-text (some versions use --color-*)
      css = css.replace(/--brand-primary:\s*#[a-fA-F0-9]+/, `--brand-primary: ${bgHex}`);
      css = css.replace(/--brand-text:\s*#[a-fA-F0-9]+/, `--brand-text: ${txtHex}`);
      css = css.replace(/--color-primary:\s*#[a-fA-F0-9]+/, `--color-primary: ${bgHex}`);
      css = css.replace(/--color-text:\s*#[a-fA-F0-9]+/, `--color-text: ${txtHex}`);

      if (css !== before) {
        fs.writeFileSync(globalsCss, css);
        result.paletteFixed = { bgHex, txtHex };
        result.files.push("src/app/globals.css");
        result.swaps++;
      }
    }
  }

  // 4. Force Nav background to real bodyBg
  const navPathBg = path.join(projDir, "src", "components", "Nav.tsx");
  if (fs.existsSync(navPathBg) && real.bodyBg) {
    let nav = fs.readFileSync(navPathBg, "utf-8");
    const bgMatch = real.bodyBg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (bgMatch) {
      const bgHex = "#" + [bgMatch[1], bgMatch[2], bgMatch[3]].map(n => Number(n).toString(16).padStart(2, "0")).join("");
      const txtHex = real.bodyText?.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
        ? "#" + real.bodyText.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/).slice(1, 4).map(n => Number(n).toString(16).padStart(2, "0")).join("")
        : "#222222";
      const before = nav;
      nav = nav.replace(/background:\s*"#[a-fA-F0-9]+"/, `background: "${bgHex}"`);
      nav = nav.replace(/color:\s*"#[a-fA-F0-9]+",\s*minHeight/, `color: "${txtHex}", minHeight`);
      if (nav !== before) {
        fs.writeFileSync(navPathBg, nav);
        if (!result.files.includes("src/components/Nav.tsx")) result.files.push("src/components/Nav.tsx");
      }
    }
  }

  // 3. Generate REHYDRATE-REPORT.md
  const lines = [
    "# Sigma Text Rehydrate Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Source: ${sourceUrl}`,
    `Project: ${projDir}`,
    "",
    "## Extracted real text",
    "",
    `- **Brand**: ${real.brand}`,
    `- **H1**: ${real.h1}`,
    `- **Nav links**: ${real.navLinks.length} (${real.navLinks.map(l => l.text).join(" · ")})`,
    `- **Hero paragraphs**: ${real.heroParagraphs.length}`,
    `- **Headings (h1/h2/h3)**: ${real.headings.length}`,
    `- **Body paragraphs**: ${real.paragraphs.length}`,
    `- **Footer text**: ${real.footerText.length}`,
    `- **Body bg / text color**: ${real.bodyBg} / ${real.bodyText}`,
    "",
    "## Swaps applied",
    "",
    `- Files modified: ${result.swaps}`,
    ...result.files.map(f => `  - \`${f}\``),
    "",
    "## Note",
    "",
    "이 도구는 **dev mode 후처리** — 진짜 사이트 콘텐츠를 emit에 inject.",
    "클린룸 위반이므로 production 배포 전에 자현이 클라이언트 자산으로 swap 후",
    "strict-clean 모드로 재emit해야 CERT-CLEAN PASS 보장.",
    "",
    "자현 워크플로우:",
    "  1. dev mode emit (지금 단계)",
    "  2. text rehydrate (이 도구) — 시각 1:1 검증",
    "  3. 클라이언트 자산 swap (sigma-asset-inject + 자현 수동)",
    "  4. strict-clean 재emit + CERT-CLEAN 발급",
  ];
  fs.writeFileSync(path.join(projDir, "REHYDRATE-REPORT.md"), lines.join("\n"));

  return result;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));

if (isMain) {
  const projDir = path.resolve(process.argv[2] || "");
  if (!projDir || !fs.existsSync(projDir)) {
    console.error("usage: node sigma-text-rehydrate.mjs <projectDir>");
    process.exit(1);
  }
  let sourceUrl = "";
  try {
    const scan = JSON.parse(fs.readFileSync(path.join(projDir, ".sigma", "scan.json"), "utf-8"));
    sourceUrl = scan.url || "";
  } catch {}
  if (!sourceUrl) {
    console.error("source URL not found in .sigma/scan.json");
    process.exit(1);
  }

  rehydrateText(projDir, sourceUrl).then(r => {
    console.log(`[rehydrate] ${r.swaps} files swapped, brand="${r.textExtracted.brand}" h1="${r.textExtracted.h1?.slice(0, 40)}" nav=${r.textExtracted.navLinks.length}`);
    console.log(`  → REHYDRATE-REPORT.md`);
  }).catch(e => {
    console.error("rehydrate failed:", e.message);
    process.exit(1);
  });
}
