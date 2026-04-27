#!/usr/bin/env node
// sigma-emit-routes.mjs — v103-2 Multi-route /app/[slug]/page.tsx emit
//
// extracted.deepCrawl.routes → Next.js App Router pages.
// 사이트 전체(sitemap routes)가 클론에서도 navigable. static-multi-page
// ceiling 100% 진짜 도달의 핵심 wiring.
//
// 각 route의 h1/headings/paragraphs/sections/images를 React 컴포넌트로 emit.
// USE_ORIGINAL_TEXT 가 false면 토큰 placeholder, true면 실제 텍스트.

import fs from "node:fs";
import path from "node:path";

export function emitRoutePages(extracted, projDir, opts = {}) {
  const dc = extracted.deepCrawl;
  if (!dc || !dc.routes || Object.keys(dc.routes).length === 0) return { emitted: 0 };

  const useOriginalText = opts.useOriginalText || false;
  const appDir = path.join(projDir, "src", "app");
  fs.mkdirSync(appDir, { recursive: true });

  let emitted = 0;
  const manifest = [];

  for (const [route, data] of Object.entries(dc.routes)) {
    if (data.error) continue;
    if (route === "/" || route === "") continue; // 메인 페이지는 base emit이 처리

    const routeSlug = route.replace(/^\//, "").replace(/\/+$/, "").replace(/\//g, "-");
    if (!routeSlug || routeSlug.length > 60) continue;

    const routeDir = path.join(appDir, ...route.split("/").filter(Boolean));
    fs.mkdirSync(routeDir, { recursive: true });

    const headings = data.headings || [];
    const paragraphs = data.paragraphs || [];
    const images = data.images || [];

    const headingTokens = useOriginalText
      ? headings.slice(0, 12).map(h => escapeJSX(h))
      : headings.slice(0, 12).map((_, i) => `{{HEADING_${i}}}`);
    const paragraphTokens = useOriginalText
      ? paragraphs.slice(0, 10).map(p => escapeJSX(p))
      : paragraphs.slice(0, 10).map((_, i) => `{{PARAGRAPH_${i}}}`);

    const titleSafe = useOriginalText ? escapeJSX(data.title) : `{{ROUTE_${routeSlug.toUpperCase()}_TITLE}}`;
    const descSafe = useOriginalText ? escapeJSX(data.description || "") : `{{ROUTE_${routeSlug.toUpperCase()}_DESC}}`;

    const tsx = `// v103-2 Auto-emitted page from deep crawl — route: ${route}
// (source URL omitted — CERT-CLEAN compliance, hostname not leaked)
// h1 length: ${(data.h1 || "").length} chars
// Sections: ${data.sectionCount}, Headings: ${headings.length}, Paragraphs: ${paragraphs.length}, Images: ${images.length}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: ${JSON.stringify(titleSafe)},
  description: ${JSON.stringify(descSafe)},
};

export default function Page() {
  return (
    <main className="sigma-route" data-route="${route.replace(/"/g, '\\"')}">
      <article className="max-w-4xl mx-auto px-6 py-16 space-y-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight">
            ${useOriginalText ? escapeJSX(data.h1 || "") : `{{ROUTE_${routeSlug.toUpperCase()}_H1}}`}
          </h1>
        </header>
${headingTokens.slice(1).map((h, i) => `        <h2 className="text-2xl font-semibold mt-12">{${JSON.stringify(h)}}</h2>`).join("\n")}
${paragraphTokens.map((p, i) => `        <p className="leading-relaxed text-base opacity-90">{${JSON.stringify(p)}}</p>`).join("\n")}
${images.slice(0, 6).map((img, i) => `        <figure className="my-8">
          <img
            src="${img.src.startsWith("http") ? "/placeholder.svg" : img.src}"
            alt="${(img.alt || "").replace(/"/g, '&quot;').slice(0, 100)}"
            width={${img.w || 800}}
            height={${img.h || 600}}
            className="w-full h-auto rounded-lg"
          />
          ${img.alt ? `<figcaption className="text-sm opacity-60 mt-2">${escapeJSX(img.alt)}</figcaption>` : ""}
        </figure>`).join("\n")}
      </article>
    </main>
  );
}
`;
    fs.writeFileSync(path.join(routeDir, "page.tsx"), tsx);
    emitted++;
    manifest.push({
      route,
      slug: routeSlug,
      h1: data.h1?.slice(0, 80) || "",
      sections: data.sectionCount || 0,
      headings: headings.length,
      paragraphs: paragraphs.length,
      images: images.length,
    });
  }

  // sitemap.xml emit (자동) — 클론도 sitemap 가짐
  if (manifest.length > 0) {
    const baseUrl = dc.origin || "https://example.com";
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc></url>
${manifest.map(m => `  <url><loc>${baseUrl}${m.route}</loc></url>`).join("\n")}
</urlset>
`;
    const publicDir = path.join(projDir, "public");
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemap);
  }

  return { emitted, manifest };
}

function escapeJSX(s) {
  return String(s || "")
    .replace(/[<>{}]/g, m => ({ "<": "\\u003c", ">": "\\u003e", "{": "\\u007b", "}": "\\u007d" }[m]))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}
