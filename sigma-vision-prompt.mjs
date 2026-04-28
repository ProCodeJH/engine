#!/usr/bin/env node
// sigma-vision-prompt.mjs — AI-Augmented Visual Reconstruction (Paradigm 2)
//
// 자현 비전 진짜 차세대 도구. screenshot + 자동 prompt → 자현이 Claude/GPT
// 등에 paste → AI가 React+Tailwind 코드 출력 → 자현이 sigma-vision-
// integrate로 자동 통합. 시각 95% + 100% 클린 (자체 생성 코드).
//
// 자현 ANTHROPIC_API_KEY 미사용 정책 우회 — manual paste workflow.
// API 비용 0, 시간 ~5분/사이트.
//
// Pipeline:
//   1. 5 viewport screenshot (mobile / tablet / desktop / 4K / above-fold)
//   2. 사이트 메타 추출 (title / palette / fonts / sections)
//   3. vision-prompt.md 자동 생성 (체계적 prompt)
//   4. .vision/ 디렉토리에 screenshots + prompt 보관
//   5. 자현이 prompt 복사 → AI paste → 코드 받아 vision-output.tsx 저장
//   6. sigma-vision-integrate.mjs로 자동 통합

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const ARGS = process.argv.slice(2);
const URL_OR_DIR = ARGS.find(a => /^https?:\/\//.test(a) || a.startsWith(".") || /^[A-Za-z]:[\\/]/.test(a) || /^[\w-]+/.test(a));
const flagVal = (n) => { const i = ARGS.indexOf(n); return i >= 0 && i + 1 < ARGS.length ? ARGS[i + 1] : null; };

if (!URL_OR_DIR) {
  console.error("usage:");
  console.error("  node sigma-vision-prompt.mjs <url>             # screenshot direct URL");
  console.error("  node sigma-vision-prompt.mjs <projectDir>      # use existing mirror");
  process.exit(1);
}

const isUrl = /^https?:\/\//.test(URL_OR_DIR);
const VIEWPORTS = [
  { name: "desktop-fold", width: 1920, height: 1080, fullPage: false },
  { name: "desktop-full", width: 1920, height: 1080, fullPage: true },
  { name: "tablet", width: 768, height: 1024, fullPage: false },
  { name: "mobile", width: 375, height: 812, fullPage: true },
];

let projDir, sourceUrl;
if (isUrl) {
  sourceUrl = URL_OR_DIR;
  const slug = new URL(sourceUrl).hostname.replace(/\./g, "-");
  projDir = path.resolve(`vision-${slug}`);
  fs.mkdirSync(projDir, { recursive: true });
} else {
  projDir = path.resolve(URL_OR_DIR);
  if (!fs.existsSync(projDir)) {
    console.error(`directory not found: ${projDir}`);
    process.exit(1);
  }
  // Try to read source URL from existing OMEGA-REPORT or .sigma/scan.json
  try {
    const omega = path.join(projDir, "OMEGA-REPORT.md");
    if (fs.existsSync(omega)) {
      const text = fs.readFileSync(omega, "utf-8");
      const m = text.match(/Source:\s*(https?:\/\/\S+)/);
      if (m) sourceUrl = m[1];
    }
    if (!sourceUrl) {
      const scan = path.join(projDir, ".sigma", "scan.json");
      if (fs.existsSync(scan)) {
        sourceUrl = JSON.parse(fs.readFileSync(scan, "utf-8")).url;
      }
    }
  } catch {}
  if (!sourceUrl) sourceUrl = flagVal("--source-url") || "(unknown)";
}

const visionDir = path.join(projDir, ".vision");
fs.mkdirSync(visionDir, { recursive: true });

console.log(`
NAVA Vision-Prompt — Paradigm 2 Reconstruction
  Source:    ${sourceUrl}
  Output:    ${visionDir}
  Viewports: ${VIEWPORTS.length}
`);

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const meta = { sourceUrl, viewports: [] };

for (const vp of VIEWPORTS) {
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(sourceUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await page.evaluate(async () => {
      const h = document.body.scrollHeight;
      for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); }
      window.scrollTo(0, 0);
    });
    await new Promise(r => setTimeout(r, 1500));

    const fname = `${vp.name}.jpg`;
    await page.screenshot({
      path: path.join(visionDir, fname),
      type: "jpeg",
      quality: 75,
      fullPage: vp.fullPage,
    });
    const stat = fs.statSync(path.join(visionDir, fname));
    console.log(`  📸 ${vp.name} (${vp.width}x${vp.height}${vp.fullPage ? " full" : ""}): ${(stat.size / 1024).toFixed(0)} KB`);
    meta.viewports.push({ ...vp, file: fname, size: stat.size });

    // Capture meta on first viewport (desktop-fold)
    if (vp.name === "desktop-fold") {
      const siteMeta = await page.evaluate(() => {
        const meta = (n) => document.querySelector(`meta[name="${n}"]`)?.getAttribute("content") || "";
        const og = (n) => document.querySelector(`meta[property="og:${n}"]`)?.getAttribute("content") || "";
        const css = getComputedStyle(document.body);
        return {
          title: document.title || "",
          description: meta("description") || og("description"),
          lang: document.documentElement.lang || "ko",
          bodyBg: css.backgroundColor,
          bodyColor: css.color,
          bodyFont: css.fontFamily,
          headings: [...document.querySelectorAll("h1, h2, h3")]
            .map(h => ({ level: h.tagName, text: (h.textContent || "").trim().slice(0, 100) }))
            .filter(h => h.text.length >= 2)
            .slice(0, 12),
          navLinks: [...document.querySelectorAll("nav a, header a")]
            .map(a => (a.textContent || "").trim())
            .filter(t => t.length >= 1 && t.length < 30)
            .slice(0, 10),
        };
      });
      meta.site = siteMeta;
    }

    await page.close();
  } catch (e) {
    console.log(`  ⚠ ${vp.name}: ${String(e.message || e).slice(0, 60)}`);
  }
}

await browser.close();

fs.writeFileSync(path.join(visionDir, "meta.json"), JSON.stringify(meta, null, 2));

// Generate vision-prompt.md (auto prompt template for AI)
const prompt = `# Vision Reconstruction Prompt — ${meta.site?.title || sourceUrl}

너는 시각을 React+Tailwind 코드로 변환하는 전문가다. 다음 사이트 screenshots를 보고
**자체 구현 React 컴포넌트**를 작성해라. 클린룸 — 원본 코드 0% 복사, 100% 자체 생성.

## Source
- URL: \`${sourceUrl}\`
- Title: \`${meta.site?.title || ""}\`
- Description: \`${meta.site?.description || ""}\`
- Lang: \`${meta.site?.lang || "ko"}\`

## Visual context (자동 추출)

- Body background: \`${meta.site?.bodyBg || "(unknown)"}\`
- Body text color: \`${meta.site?.bodyColor || "(unknown)"}\`
- Body font: \`${meta.site?.bodyFont?.slice(0, 80) || "(unknown)"}\`

## Headings
${(meta.site?.headings || []).map(h => `- ${h.level}: ${h.text}`).join("\n") || "(none)"}

## Nav links
${(meta.site?.navLinks || []).map(l => `- ${l}`).join("\n") || "(none)"}

## Screenshots (첨부)
${meta.viewports.map(v => `- \`${v.file}\` (${v.width}×${v.height}${v.fullPage ? " full-page" : " above-fold"})`).join("\n")}

---

## Task

위 screenshots와 메타를 보고 다음 React 컴포넌트를 작성해라:

1. **\`Vision.tsx\`** — 전체 페이지 컴포넌트 (Next.js 15 App Router 호환)
   - "use client" 선언 (motion 위해)
   - Tailwind CSS class만 사용 (custom CSS 0)
   - lenis + framer-motion (또는 GSAP) 자체 모션
   - 실제 텍스트는 *위 메타 데이터 그대로* 사용
   - 이미지는 \`{IMAGE_N}\` 토큰 (자현이 swap)

2. **section 분리** — \`VisionHero.tsx\`, \`VisionFeatures.tsx\` 등
   - 각 viewport에서 자연 break 보고 분리
   - 모든 section "use client" + 자체 모션

3. **클린룸 보장**:
   - 원본 class names 추출 금지 (e.g. "framer-*", "w-*" 등 platform-specific)
   - Tailwind utility만
   - 색상은 hex로 직접 (CSS var 가능)

4. **모션** (가능한 영역만):
   - fade-in on scroll
   - hover scale
   - stagger children
   - parallax (있어 보이는 곳만)

5. **반응형**:
   - mobile (375) / tablet (768) / desktop (1920) 다 작동
   - Tailwind responsive prefix (sm:, md:, lg:, xl:)

## Output 형식

출력은 markdown 코드블록 \`\`\`tsx 안에. 파일별 분리:

\`\`\`tsx
// FILE: Vision.tsx
"use client";
... (전체 코드)
\`\`\`

\`\`\`tsx
// FILE: VisionHero.tsx
"use client";
... (hero section)
\`\`\`

각 컴포넌트마다 별도 파일. 자현이 \`sigma-vision-integrate.mjs\`로 자동 통합.

---

## 자현 비즈니스 워크플로우

1. 자현이 위 prompt + screenshots를 Claude / ChatGPT 등에 paste
2. AI 응답을 \`vision-output.md\`로 저장 (이 디렉토리 안)
3. \`node sigma-vision-integrate.mjs ${path.basename(projDir)}\` 실행
4. \`src/components/Vision*.tsx\` 자동 emit
5. CERT-VISION.md 자동 발급 (자체 생성 코드 인증)

자현 비전: 시각 95% + 100% 클린 동시 도달.
`;

fs.writeFileSync(path.join(visionDir, "vision-prompt.md"), prompt);

console.log(`
✓ Vision prompt 준비 완료

  📁 ${visionDir}
     ├── desktop-fold.jpg, desktop-full.jpg, tablet.jpg, mobile.jpg
     ├── meta.json
     └── vision-prompt.md   ← 자현이 AI에 paste

자현 다음 단계:
  1. ${path.join(visionDir, "vision-prompt.md")} 열어서 내용 + screenshots 첨부
  2. Claude.ai / ChatGPT 등에 paste
  3. AI 응답을 ${path.join(visionDir, "vision-output.md")} 로 저장
  4. node sigma-vision-integrate.mjs ${path.basename(projDir)}
`);
